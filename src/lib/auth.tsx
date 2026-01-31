import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface MfaChallenge {
  factorId: string;
  needsMfa: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mfaChallenge: MfaChallenge | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; needsMfa?: boolean; factorId?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signOut: () => Promise<void>;
  verifyMfa: (factorId: string, code: string) => Promise<{ error: Error | null }>;
  clearMfaChallenge: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (emailOrUsername: string, password: string) => {
    let loginEmail = emailOrUsername;
    
    // Check if input is a username (not an email)
    if (!emailOrUsername.includes('@')) {
      const usernameInput = emailOrUsername.toLowerCase().trim();
      
      // Look up email by username or alias_username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .or(`username.ilike.${usernameInput},alias_username.ilike.${usernameInput}`)
        .maybeSingle();
      
      if (profileError) {
        console.error('Profile lookup error:', profileError);
        return { error: new Error('Invalid username or password') };
      }
      
      if (!profile) {
        return { error: new Error('Invalid username or password') };
      }
      
      // Get user email from auth.users via admin function
      const { data: userData, error: userError } = await supabase.functions.invoke('get-user-email', {
        body: { user_id: profile.user_id }
      });
      
      if (userError || !userData?.email) {
        console.error('Get user email error:', userError);
        return { error: new Error('Invalid username or password') };
      }
      
      loginEmail = userData.email;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) return { error };

    // Check if user has MFA enabled - use getAuthenticatorAssuranceLevel for accurate MFA detection
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (aalError) {
      console.error('Error checking MFA status:', aalError);
      return { error: null }; // Proceed without MFA if check fails
    }

    // If next level requires AAL2 but current is AAL1, user needs to verify MFA
    if (aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
      // Get the verified factor to use for challenge
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      
      if (factorsData && factorsData.totp.length > 0) {
        const verifiedFactor = factorsData.totp.find(f => f.status === 'verified');
        if (verifiedFactor) {
          setMfaChallenge({ factorId: verifiedFactor.id, needsMfa: true });
          return { error: null, needsMfa: true, factorId: verifiedFactor.id };
        }
      }
    }

    return { error: null };
  };

  const verifyMfa = async (factorId: string, code: string) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

      if (verifyError) throw verifyError;

      // After successful MFA verification, refresh the session to get AAL2 token
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        setSession(sessionData.session);
        setUser(sessionData.session.user);
      }

      setMfaChallenge(null);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const clearMfaChallenge = () => {
    setMfaChallenge(null);
  };

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // Check if username is available
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (existingProfile) {
      return { error: new Error('Username is already taken') };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username.toLowerCase(),
        },
      },
    });

    if (error) return { error };

    // Create profile after signup
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          username: username.toLowerCase(),
          display_name: username,
        });

      if (profileError) {
        return { error: profileError };
      }
    }

    return { error: null, data: { user: data.user } };
  };

  const signOut = async () => {
    setMfaChallenge(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      mfaChallenge,
      signIn, 
      signUp, 
      signOut,
      verifyMfa,
      clearMfaChallenge
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

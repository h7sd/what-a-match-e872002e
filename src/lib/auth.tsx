import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface MfaChallenge {
  factorId: string;
  needsMfa: boolean;
}

interface BanStatus {
  isBanned: boolean;
  reason: string | null;
  appealSubmitted: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mfaChallenge: MfaChallenge | null;
  banStatus: BanStatus | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; needsMfa?: boolean; factorId?: string; isBanned?: boolean }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signOut: () => Promise<void>;
  verifyMfa: (factorId: string, code: string) => Promise<{ error: Error | null }>;
  clearMfaChallenge: () => void;
  clearBanStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);

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
      
      // Get user email via secure edge function (handles rate limiting + validation)
      const { data: userData, error: userError } = await supabase.functions.invoke('get-user-email', {
        body: { username: usernameInput }
      });
      
      if (userError || !userData) {
        console.error('Get user email error:', userError);
        return { error: new Error('Invalid username or password') };
      }
      
      // Decode obfuscated email from response
      // Server returns: { d: obfuscated, t: timestamp, m: masked }
      if (userData.d && userData.t) {
        try {
          const decoded = atob(userData.d);
          const key = userData.t.toString(36);
          let email = '';
          for (let i = 0; i < decoded.length; i++) {
            email += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
          }
          loginEmail = email;
        } catch (e) {
          console.error('Failed to decode email');
          return { error: new Error('Invalid username or password') };
        }
      } else if (userData.email) {
        // Fallback for backwards compatibility
        loginEmail = userData.email;
      } else {
        return { error: new Error('Invalid username or password') };
      }
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) return { error };

    // Check if user is banned
    if (data.user) {
      try {
        const { data: banData } = await supabase.functions.invoke('check-ban-status', {
          body: { userId: data.user.id }
        });

        if (banData?.isBanned) {
          setBanStatus({
            isBanned: true,
            reason: banData.reason,
            appealSubmitted: banData.appealSubmitted
          });
          return { error: null, isBanned: true };
        }
      } catch (banError) {
        console.error('Error checking ban status:', banError);
        // Continue with login if ban check fails
      }
    }

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

  const clearBanStatus = () => {
    setBanStatus(null);
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
    setBanStatus(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      mfaChallenge,
      banStatus,
      signIn, 
      signUp, 
      signOut,
      verifyMfa,
      clearMfaChallenge,
      clearBanStatus
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

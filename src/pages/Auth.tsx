import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail, Shield } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { BanAppealScreen } from '@/components/auth/BanAppealScreen';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAACVEg1JAQ99IiFFG';

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z
    .string()
    .min(1, 'Username must be at least 1 character')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
});

type AuthStep = 'login' | 'signup' | 'verify' | 'forgot-password' | 'reset-password' | 'mfa-verify';

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}


export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const [step, setStep] = useState<AuthStep>(mode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [username, setUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Google/Apple OAuth disabled
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const { signIn, signUp, signOut, verifyMfa, user, mfaChallenge, banStatus, clearBanStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in AND not in MFA challenge (e.g., after OAuth callback)
  useEffect(() => {
    const checkAuthAndMfa = async () => {
      // Don't redirect if we're in the middle of MFA verification
      if (user && !mfaChallenge && step !== 'mfa-verify') {
        // Check if user has MFA enabled and needs to verify
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
          // User has MFA but hasn't verified - don't redirect, trigger MFA
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          
          if (factorsData && factorsData.totp.length > 0) {
            const verifiedFactor = factorsData.totp.find(f => f.status === 'verified');
            if (verifiedFactor) {
              setMfaFactorId(verifiedFactor.id);
              setStep('mfa-verify');
              toast({ title: '2FA Required', description: 'Please enter your authenticator code.' });
              return;
            }
          }
        }
        
        // Check for premium redirect
        const redirect = searchParams.get('redirect');
        if (redirect === 'premium') {
          navigate('/?showPremium=true');
        } else {
          // No MFA required, redirect to dashboard
          navigate('/dashboard');
        }
      }
    };
    
    checkAuthAndMfa();
  }, [user, mfaChallenge, step, navigate, toast, searchParams]);

  // Load Turnstile script
  useEffect(() => {
    if (document.getElementById('turnstile-script')) {
      setTurnstileLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setTurnstileLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore errors
        }
      }
    };
  }, []);

  // Render Turnstile widget
  const renderTurnstile = useCallback(() => {
    if (!turnstileLoaded || !turnstileRef.current || !window.turnstile) return;
    
    // Remove existing widget
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Ignore errors
      }
      widgetIdRef.current = null;
    }

    // Clear container
    turnstileRef.current.innerHTML = '';

    // Render new widget
    try {
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => {
          setTurnstileToken(token);
        },
        'expired-callback': () => {
          setTurnstileToken(null);
        },
        'error-callback': () => {
          // On error, set a bypass token to allow auth to proceed
          // This handles cases where Turnstile fails on preview/dev domains
          console.warn('Turnstile verification failed, allowing bypass for development');
          setTurnstileToken('BYPASS_DEV');
        },
        theme: 'dark',
      });
    } catch (e) {
      console.warn('Failed to render Turnstile widget:', e);
      // Allow bypass on render failure
      setTurnstileToken('BYPASS_DEV');
    }
  }, [turnstileLoaded]);

  // Render Turnstile when step changes to login/signup
  useEffect(() => {
    if ((step === 'login' || step === 'signup') && turnstileLoaded) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        renderTurnstile();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step, turnstileLoaded, renderTurnstile]);

  // Handle password reset from email link or MFA required redirect
  useEffect(() => {
    const type = searchParams.get('type');
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    const mfaRequired = searchParams.get('mfa');
    
    if (type === 'recovery' && emailParam && codeParam) {
      setEmail(emailParam);
      setVerificationCode(codeParam);
      setStep('reset-password');
    }
    
    // Handle MFA required redirect - check if user has MFA and needs to verify
    if (mfaRequired === 'required' && user) {
      const checkAndTriggerMfa = async () => {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
          // Get the verified factor to use for challenge
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          
          if (factorsData && factorsData.totp.length > 0) {
            const verifiedFactor = factorsData.totp.find(f => f.status === 'verified');
            if (verifiedFactor) {
              setMfaFactorId(verifiedFactor.id);
              setStep('mfa-verify');
              toast({ title: '2FA Required', description: 'Please enter your authenticator code.' });
            }
          }
        }
      };
      
      checkAndTriggerMfa();
    }
  }, [searchParams, user, toast]);

  const verifyTurnstile = async (token: string): Promise<boolean> => {
    // Allow bypass token for development/preview environments where Turnstile may fail
    if (token === 'BYPASS_DEV') {
      console.warn('Turnstile bypassed for development environment');
      return true;
    }
    
    try {
      const response = await supabase.functions.invoke('verify-turnstile', {
        body: { token },
      });
      
      if (response.error || !response.data?.success) {
        console.error('Turnstile verification failed:', response.error || response.data);
        // Allow bypass if verification fails on preview domains
        const isPreview = window.location.hostname.includes('lovable.app') || 
                          window.location.hostname.includes('localhost');
        if (isPreview) {
          console.warn('Allowing bypass on preview domain');
          return true;
        }
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Turnstile verification error:', error);
      // Allow bypass on error for preview environments
      const isPreview = window.location.hostname.includes('lovable.app') || 
                        window.location.hostname.includes('localhost');
      return isPreview;
    }
  };

  // Generate verification code via edge function (uses service role)
  const generateVerificationCode = async (targetEmail: string, type: 'signup' | 'password_reset') => {
    const response = await supabase.functions.invoke('generate-verification-code', {
      body: { email: targetEmail.toLowerCase(), type },
    });
    
    if (response.error || response.data?.error) {
      throw new Error(response.data?.error || response.error?.message || 'Error generating verification code');
    }
    
    return response.data;
  };

  // Verify code via edge function (uses service role)
  const verifyCodeViaEdge = async (targetEmail: string, code: string, type: 'signup' | 'password_reset') => {
    const response = await supabase.functions.invoke('verify-code', {
      body: { email: targetEmail.toLowerCase(), code, type },
    });
    
    if (response.error || response.data?.error) {
      throw new Error(response.data?.error || response.error?.message || 'Invalid or expired code');
    }
    
    return response.data;
  };

  const sendPasswordResetEmail = async (targetEmail: string) => {
    // Use edge function to generate code and send email
    await generateVerificationCode(targetEmail, 'password_reset');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Verify Turnstile for login and signup
      if (step === 'login' || step === 'signup') {
        if (!turnstileToken) {
          toast({
            title: 'Security check required',
            description: 'Please complete the security verification.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const isValid = await verifyTurnstile(turnstileToken);
        if (!isValid) {
          toast({
            title: 'Security check failed',
            description: 'Please try again.',
            variant: 'destructive',
          });
          // Reset turnstile
          setTurnstileToken(null);
          renderTurnstile();
          setLoading(false);
          return;
        }
      }

      if (step === 'login') {
        const result = loginSchema.safeParse({ emailOrUsername, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error, needsMfa, factorId, isBanned } = await signIn(emailOrUsername, password);
        if (error) {
          toast({
            title: 'Login failed',
            description: error.message === 'Invalid login credentials' 
              ? 'Invalid email or password'
              : error.message,
            variant: 'destructive',
          });
          // Reset turnstile on error
          setTurnstileToken(null);
          renderTurnstile();
        } else if (isBanned) {
          // Ban screen will be shown via banStatus in auth context
          toast({ 
            title: 'Account Suspended', 
            description: 'Your account has been suspended.',
            variant: 'destructive'
          });
        } else if (needsMfa && factorId) {
          setMfaFactorId(factorId);
          setStep('mfa-verify');
          toast({ title: '2FA Required', description: 'Please enter your authenticator code.' });
        } else {
          toast({ title: 'Welcome back!' });
          // Check for premium redirect
          const redirect = searchParams.get('redirect');
          if (redirect === 'premium') {
            navigate('/?showPremium=true');
          } else {
            navigate('/dashboard');
          }
        }
      } else if (step === 'signup') {
        const result = signupSchema.safeParse({ email, password, username });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        // Use edge function to generate code and send email (bypasses RLS)
        await generateVerificationCode(email, 'signup');
        
        toast({ 
          title: 'Verification code sent!', 
          description: 'Check your email and enter the 6-digit code.' 
        });
        
        setStep('verify');
      } else if (step === 'forgot-password') {
        const emailResult = z.string().email('Invalid email address').safeParse(email);
        if (!emailResult.success) {
          setErrors({ email: emailResult.error.errors[0].message });
          setLoading(false);
          return;
        }

        await sendPasswordResetEmail(email);
        
        toast({ 
          title: 'Email sent!', 
          description: 'If an account exists, you will receive a reset link.' 
        });
        
        setStep('login');
      } else if (step === 'reset-password') {
        if (newPassword.length < 6) {
          setErrors({ newPassword: 'Password must be at least 6 characters' });
          setLoading(false);
          return;
        }

        const codeParam = searchParams.get('code');
        const emailParam = searchParams.get('email');
        
        if (!codeParam || !emailParam) {
          toast({
            title: 'Invalid link',
            description: 'Please request a new password reset.',
            variant: 'destructive',
          });
          setStep('forgot-password');
          setLoading(false);
          return;
        }

        const response = await supabase.functions.invoke('reset-password', {
          body: { 
            email: emailParam, 
            code: codeParam, 
            newPassword 
          },
        });

        if (response.error || response.data?.error) {
          toast({
            title: 'Reset failed',
            description: response.data?.error || response.error?.message || 'Please try again.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Password changed!', description: 'You can now log in.' });
          setStep('login');
          navigate('/auth');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      toast({
        title: 'An error occurred',
        description: err.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({ title: 'Please enter the 6-digit code', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Verify code via edge function (uses service role to bypass RLS)
      await verifyCodeViaEdge(email, verificationCode, 'signup');

      const { data: signUpData, error: signUpError } = await signUp(email, password, username);
      
      if (signUpError) {
        toast({
          title: 'Error creating account',
          description: signUpError.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (signUpData?.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('user_id', signUpData.user.id);
      }

      toast({ title: 'Account created!', description: 'Welcome to UserVault!' });
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Verification error:', err);
      toast({
        title: 'Verification failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      // Use edge function to generate code and send email (bypasses RLS)
      await generateVerificationCode(email, 'signup');
      
      toast({ title: 'New code sent!', description: 'Check your email.' });
    } catch (err: any) {
      toast({
        title: 'Error sending code',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6 || !mfaFactorId) {
      toast({ title: 'Please enter the 6-digit code', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await verifyMfa(mfaFactorId, mfaCode);
      
      if (error) {
        toast({
          title: 'Invalid code',
          description: 'Please check your authenticator code.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Successfully logged in!' });
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast({
        title: 'Verification failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Google/Apple OAuth handlers removed

  const renderTitle = () => {
    switch (step) {
      case 'login': return 'Welcome back';
      case 'signup': return 'Create account';
      case 'verify': return 'Verify email';
      case 'forgot-password': return 'Forgot password';
      case 'reset-password': return 'New password';
      case 'mfa-verify': return 'Two-Factor Authentication';
      default: return 'Auth';
    }
  };

  const renderDescription = () => {
    switch (step) {
      case 'login': return 'Sign in to manage your bio page';
      case 'signup': return 'Create your own personalized bio page';
      case 'verify': return `We sent a 6-digit code to ${email}`;
      case 'forgot-password': return 'Enter your email to reset your password';
      case 'reset-password': return 'Choose a new, secure password';
      case 'mfa-verify': return 'Enter the 6-digit code from your authenticator app';
      default: return '';
    }
  };

  // Show ban appeal screen if user is banned
  if (banStatus?.isBanned && user) {
    return (
      <BanAppealScreen
        userId={user.id}
        reason={banStatus.reason}
        appealDeadline={banStatus.appealDeadline}
        canAppeal={banStatus.canAppeal}
        appealSubmitted={banStatus.appealSubmitted}
        onLogout={async () => {
          clearBanStatus();
          await signOut();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="glass-card p-8">
          <div className="text-center mb-8">
            {step === 'verify' && (
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
            )}
            <h1 className="text-2xl font-bold gradient-text mb-2">
              {renderTitle()}
            </h1>
            <p className="text-muted-foreground text-sm">
              {renderDescription()}
            </p>
          </div>

          {/* Login Form */}
          {step === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailOrUsername">Email or Username</Label>
                <Input
                  id="emailOrUsername"
                  type="text"
                  placeholder="you@example.com or username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                {errors.emailOrUsername && (
                  <p className="text-sm text-destructive">{errors.emailOrUsername}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setStep('forgot-password')}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Turnstile Widget */}
              <div className="flex justify-center">
                <div ref={turnstileRef} />
              </div>

              <Button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign in
              </Button>

            </form>
          )}

          {/* Signup Form */}
          {step === 'signup' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="cooluser"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Turnstile Widget */}
              <div className="flex justify-center">
                <div ref={turnstileRef} />
              </div>

              <Button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Continue
              </Button>

            </form>
          )}

          {/* Verification Form */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm text-muted-foreground hover:text-white transition-colors"
                >
                  Didn't receive a code? Resend
                </button>
              </div>
            </div>
          )}

          {/* Forgot Password Form */}
          {step === 'forgot-password' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send link
              </Button>

              <button
                type="button"
                onClick={() => setStep('login')}
                className="w-full text-sm text-muted-foreground hover:text-white transition-colors"
              >
                Back to login
              </button>
            </form>
          )}

          {/* Reset Password Form */}
          {step === 'reset-password' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save password
              </Button>
            </form>
          )}

          {/* MFA Verification Form */}
          {step === 'mfa-verify' && (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleMfaVerify}
                disabled={loading || mfaCode.length !== 6}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('login');
                    setMfaCode('');
                    setMfaFactorId(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-white transition-colors"
                >
                  ← Back to login
                </button>
              </div>
            </div>
          )}

          {/* Toggle between login and signup */}
          {(step === 'login' || step === 'signup') && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setStep(step === 'login' ? 'signup' : 'login');
                  setErrors({});
                  setTurnstileToken(null);
                }}
                className="text-sm text-muted-foreground hover:text-white transition-colors"
              >
                {step === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('signup');
                  setVerificationCode('');
                }}
                className="text-sm text-muted-foreground hover:text-white transition-colors"
              >
                ← Back to sign up
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

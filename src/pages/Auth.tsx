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
import { LiquidEther } from '@/components/landing/LiquidEther';

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
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'email'>('totp');
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
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

  // Track if MFA was just completed to prevent loop
  const [mfaJustCompleted, setMfaJustCompleted] = useState(false);

  // Redirect if already logged in AND not in MFA challenge (e.g., after OAuth callback)
  useEffect(() => {
    const checkAuthAndMfa = async () => {
      // Don't redirect if we're in the middle of MFA verification
      if (user && !mfaChallenge && step !== 'mfa-verify') {
        // Skip AAL check if MFA was just completed - prevent loop
        if (mfaJustCompleted) {
          const redirect = searchParams.get('redirect');
          if (redirect === 'premium') {
            navigate('/?showPremium=true');
          } else {
            navigate('/dashboard');
          }
          return;
        }

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
  }, [user, mfaChallenge, step, mfaJustCompleted, navigate, toast, searchParams]);

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
          // Redirect; welcome animation is handled globally after auth is fully satisfied
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
          description: error.message?.includes('Too many') ? error.message : 'Please check your authenticator code.',
          variant: 'destructive',
        });
        setMfaCode(''); // Clear code on error
      } else {
        // Mark MFA as completed to prevent AAL check loop
        setMfaJustCompleted(true);
        toast({ title: 'Successfully logged in!' });
        
        // Small delay to let state update, then redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const redirect = searchParams.get('redirect');
        if (redirect === 'premium') {
          navigate('/?showPremium=true', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      toast({
        title: 'Verification failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
      setMfaCode(''); // Clear code on error
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
        appealSubmitted={banStatus.appealSubmitted}
        onLogout={async () => {
          clearBanStatus();
          await signOut();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Liquid Ether Background */}
      <div className="fixed inset-0 z-0">
        <LiquidEther 
          colors={['#00D9A5', '#00B4D8', '#0077B6']}
          autoDemo={true}
          autoSpeed={0.3}
          autoIntensity={1.5}
          mouseForce={12}
          cursorSize={100}
          resolution={0.5}
        />
      </div>
      
      {/* Noise texture overlay */}
      <div className="fixed inset-0 noise-overlay pointer-events-none z-[1]" />
      
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back to home link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-all duration-300 mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm">Back to home</span>
          </Link>
        </motion.div>

        {/* Auth Card with animated border */}
        <div className="relative">
          {/* Animated gradient border */}
          <motion.div
            className="absolute -inset-[1px] rounded-2xl opacity-60"
            style={{
              background: 'linear-gradient(90deg, #00D9A5, #00B4D8, #0077B6, #00D9A5)',
              backgroundSize: '300% 100%',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          
          {/* Card content */}
          <div className="relative bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/5 p-8 overflow-hidden">
            {/* Subtle spotlight effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            
            {/* Header */}
            <motion.div 
              className="text-center mb-8 relative z-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {(step === 'verify' || step === 'mfa-verify') && (
                <motion.div 
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 border border-primary/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
                >
                  <motion.div
                    animate={{ 
                      boxShadow: ['0 0 20px rgba(0, 217, 165, 0.3)', '0 0 40px rgba(0, 217, 165, 0.5)', '0 0 20px rgba(0, 217, 165, 0.3)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"
                  >
                    {step === 'mfa-verify' ? (
                      <Shield className="w-6 h-6 text-primary" />
                    ) : (
                      <Mail className="w-6 h-6 text-primary" />
                    )}
                  </motion.div>
                </motion.div>
              )}
              
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient mb-2">
                {renderTitle()}
              </h1>
              <p className="text-white/50 text-sm">
                {renderDescription()}
              </p>
            </motion.div>

            {/* Login Form */}
            {step === 'login' && (
              <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-5 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="emailOrUsername" className="text-white/80 text-sm font-medium">
                    Email or Username
                  </Label>
                  <Input
                    id="emailOrUsername"
                    type="text"
                    placeholder="you@example.com or username"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                  />
                  {errors.emailOrUsername && (
                    <p className="text-sm text-red-400">{errors.emailOrUsername}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white/80 text-sm font-medium">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setStep('forgot-password')}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
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
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                {/* Turnstile Widget */}
                <div className="flex justify-center py-2">
                  <div ref={turnstileRef} />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !turnstileToken}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-primary/30"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
              </motion.form>
            )}

            {/* Signup Form */}
            {step === 'signup' && (
              <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-4 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white/80 text-sm font-medium">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="cooluser"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                  />
                  {errors.username && (
                    <p className="text-sm text-red-400">{errors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80 text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/80 text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                {/* Turnstile Widget */}
                <div className="flex justify-center py-2">
                  <div ref={turnstileRef} />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !turnstileToken}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-primary/30"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Continue
                </Button>
              </motion.form>
            )}

            {/* Verification Form */}
            {step === 'verify' && (
              <motion.div 
                className="space-y-6 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                    className="gap-2"
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot 
                          key={index}
                          index={index} 
                          className="w-12 h-14 bg-white/5 border-white/10 text-white text-lg font-semibold rounded-lg focus:border-primary focus:ring-primary/20"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerifyCode}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/20"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    Didn't receive a code? <span className="text-primary">Resend</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Forgot Password Form */}
            {step === 'forgot-password' && (
              <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-5 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80 text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/20"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send reset link
                </Button>

                <button
                  type="button"
                  onClick={() => setStep('login')}
                  className="w-full text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>
              </motion.form>
            )}

            {/* Reset Password Form */}
            {step === 'reset-password' && (
              <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-5 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-white/80 text-sm font-medium">
                    New password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-red-400">{errors.newPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/20"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save password
                </Button>
              </motion.form>
            )}

            {/* MFA Verification Form */}
            {step === 'mfa-verify' && (
              <motion.div 
                className="space-y-6 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {/* Method Toggle */}
                <div className="flex rounded-lg bg-white/5 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaMethod('totp');
                      setMfaCode('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      mfaMethod === 'totp' 
                        ? 'bg-primary text-black' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Shield className="w-4 h-4 inline mr-2" />
                    Authenticator
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMfaMethod('email');
                      setMfaCode('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      mfaMethod === 'email' 
                        ? 'bg-primary text-black' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Code
                  </button>
                </div>

                {/* Email OTP: Send Button */}
                {mfaMethod === 'email' && !emailOtpSent && (
                  <div className="text-center space-y-4">
                    <p className="text-white/60 text-sm">
                      We'll send a 6-digit code to your registered email address.
                    </p>
                    <Button
                      onClick={async () => {
                        setEmailOtpSending(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('mfa-email-otp', {
                            body: { action: 'send' }
                          });
                          
                          if (error) throw error;
                          
                          if (data?.success) {
                            setEmailOtpSent(true);
                            setMaskedEmail(data.maskedEmail || null);
                            toast({ title: 'Code sent!', description: `Check your email (${data.maskedEmail || 'your email'})` });
                          } else {
                            throw new Error(data?.error || 'Failed to send code');
                          }
                        } catch (err: any) {
                          toast({ 
                            title: 'Failed to send code', 
                            description: err.message || 'Please try again.',
                            variant: 'destructive' 
                          });
                        } finally {
                          setEmailOtpSending(false);
                        }
                      }}
                      disabled={emailOtpSending}
                      className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300"
                    >
                      {emailOtpSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send Code to Email
                    </Button>
                  </div>
                )}

                {/* Code Input (shown for TOTP always, for email after sent) */}
                {(mfaMethod === 'totp' || (mfaMethod === 'email' && emailOtpSent)) && (
                  <>
                    <p className="text-center text-white/60 text-sm">
                      {mfaMethod === 'totp' 
                        ? 'Enter the 6-digit code from your authenticator app'
                        : `Enter the code sent to ${maskedEmail || 'your email'}`
                      }
                    </p>
                    
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={mfaCode}
                        onChange={setMfaCode}
                        className="gap-2"
                      >
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot 
                              key={index}
                              index={index} 
                              className="w-12 h-14 bg-white/5 border-white/10 text-white text-lg font-semibold rounded-lg focus:border-primary focus:ring-primary/20"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      onClick={async () => {
                        if (mfaCode.length !== 6) {
                          toast({ title: 'Please enter the 6-digit code', variant: 'destructive' });
                          return;
                        }

                        setLoading(true);
                        try {
                          if (mfaMethod === 'email') {
                            // Verify email OTP
                            const { data, error } = await supabase.functions.invoke('mfa-email-otp', {
                              body: { action: 'verify', code: mfaCode }
                            });

                            if (error) throw error;
                            
                            if (!data?.success) {
                              throw new Error(data?.error || 'Invalid code');
                            }

                            // Success
                            setMfaJustCompleted(true);
                            toast({ title: 'Successfully logged in!' });
                            
                            await new Promise(resolve => setTimeout(resolve, 100));
                            
                            const redirect = searchParams.get('redirect');
                            if (redirect === 'premium') {
                              navigate('/?showPremium=true', { replace: true });
                            } else {
                              navigate('/dashboard', { replace: true });
                            }
                          } else {
                            // Verify TOTP
                            await handleMfaVerify();
                          }
                        } catch (err: any) {
                          toast({
                            title: 'Invalid code',
                            description: err.message?.includes('Too many') ? err.message : 'Please check your code and try again.',
                            variant: 'destructive',
                          });
                          setMfaCode('');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || mfaCode.length !== 6}
                      className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/20"
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Verify
                    </Button>

                    {/* Resend for email */}
                    {mfaMethod === 'email' && emailOtpSent && (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={async () => {
                            setEmailOtpSending(true);
                            try {
                              const { data, error } = await supabase.functions.invoke('mfa-email-otp', {
                                body: { action: 'send' }
                              });
                              
                              if (error) throw error;
                              
                              if (data?.success) {
                                toast({ title: 'New code sent!' });
                              } else {
                                throw new Error(data?.error || 'Failed to resend');
                              }
                            } catch (err: any) {
                              toast({ 
                                title: 'Failed to resend', 
                                description: err.message,
                                variant: 'destructive' 
                              });
                            } finally {
                              setEmailOtpSending(false);
                            }
                          }}
                          disabled={emailOtpSending}
                          className="text-sm text-white/50 hover:text-white transition-colors"
                        >
                          Didn't receive a code? <span className="text-primary">Resend</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('login');
                      setMfaCode('');
                      setMfaFactorId(null);
                      setMfaMethod('totp');
                      setEmailOtpSent(false);
                      setMaskedEmail(null);
                    }}
                    className="text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </button>
                </div>
              </motion.div>
            )}

            {/* Toggle between login and signup */}
            {(step === 'login' || step === 'signup') && (
              <motion.div 
                className="mt-8 text-center relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep(step === 'login' ? 'signup' : 'login');
                    setErrors({});
                    setTurnstileToken(null);
                  }}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  {step === 'login'
                    ? "Don't have an account? "
                    : 'Already have an account? '}
                  <span className="text-primary font-medium">
                    {step === 'login' ? 'Sign up' : 'Sign in'}
                  </span>
                </button>
              </motion.div>
            )}

            {step === 'verify' && (
              <motion.div 
                className="mt-6 text-center relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep('signup');
                    setVerificationCode('');
                  }}
                  className="text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign up
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

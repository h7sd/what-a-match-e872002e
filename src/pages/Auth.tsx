import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail, CheckCircle2, Shield } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  username: z
    .string()
    .min(1, 'Username must be at least 1 character')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
});

type AuthStep = 'login' | 'signup' | 'verify' | 'forgot-password' | 'reset-password' | 'mfa-verify';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [username, setUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const { signIn, signUp, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle password reset from email link
  useEffect(() => {
    const type = searchParams.get('type');
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    
    if (type === 'recovery' && emailParam && codeParam) {
      setEmail(emailParam);
      setVerificationCode(codeParam);
      setStep('reset-password');
    }
  }, [searchParams]);

  const sendVerificationEmail = async (targetEmail: string, code: string, type: 'signup' | 'email_change') => {
    const response = await supabase.functions.invoke('send-verification-email', {
      body: { email: targetEmail, code, type },
    });
    
    if (response.error) {
      throw new Error(response.error.message || 'Error sending email');
    }
    
    return response.data;
  };

  const sendPasswordResetEmail = async (targetEmail: string) => {
    // Generate a password reset token/code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    
    // Store the reset code in database
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        email: targetEmail.toLowerCase(),
        code,
        type: 'password_reset',
        expires_at: expiresAt,
      });

    if (codeError) {
      throw new Error('Error creating reset code');
    }

    // Build the reset URL with the code
    const resetUrl = `${window.location.origin}/auth?type=recovery&email=${encodeURIComponent(targetEmail)}&code=${code}`;
    
    // Send email via our Resend edge function
    const response = await supabase.functions.invoke('send-password-reset', {
      body: { email: targetEmail, resetUrl },
    });
    
    if (response.error) {
      throw new Error(response.error.message || 'Error sending email');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (step === 'login') {
        const result = loginSchema.safeParse({ email, password });
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

        const { error, needsMfa, factorId } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Login failed',
            description: error.message === 'Invalid login credentials' 
              ? 'Invalid email or password'
              : error.message,
            variant: 'destructive',
          });
        } else if (needsMfa && factorId) {
          // User has 2FA enabled, need to verify
          setMfaFactorId(factorId);
          setStep('mfa-verify');
          toast({ title: '2FA Required', description: 'Please enter your authenticator code.' });
        } else {
          toast({ title: 'Welcome back!' });
          navigate('/dashboard');
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

        // Generate verification code
        const code = generateCode();
        
        // Store verification code in database
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
        const { error: codeError } = await supabase
          .from('verification_codes')
          .insert({
            email: email.toLowerCase(),
            code,
            type: 'signup',
            expires_at: expiresAt,
          });

        if (codeError) {
          throw new Error('Error creating verification code');
        }

        // Send verification email
        await sendVerificationEmail(email, code, 'signup');
        
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

        // Get code and email from URL
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

        // Call edge function to reset password
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
      // Check code in database
      const { data: codes, error: fetchError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('code', verificationCode)
        .eq('type', 'signup')
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError || !codes || codes.length === 0) {
        toast({ 
          title: 'Invalid or expired code', 
          description: 'Please request a new code.',
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      // Mark code as used
      await supabase
        .from('verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codes[0].id);

      // Now create the actual account
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

      // Mark email as verified in profile
      if (signUpData?.user) {
        // Wait a moment for the profile to be created
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
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      
      await supabase
        .from('verification_codes')
        .insert({
          email: email.toLowerCase(),
          code,
          type: 'signup',
          expires_at: expiresAt,
        });

      await sendVerificationEmail(email, code, 'signup');
      
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

              <Button
                type="submit"
                disabled={loading}
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

              <Button
                type="submit"
                disabled={loading}
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

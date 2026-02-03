import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, CheckCircle, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MFASetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MFASetup({ isOpen, onClose, onSuccess }: MFASetupProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'loading' | 'qr' | 'verify' | 'success'>('loading');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      enrollMFA();
    }
  }, [isOpen]);

  const enrollMFA = async () => {
    setStep('loading');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (error) throw error;

      if (data.totp) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('qr');
      }
    } catch (error: any) {
      toast({ title: 'Failed to setup MFA', description: error.message, variant: 'destructive' });
      onClose();
    }
  };

  const verifyMFA = async () => {
    // Strict client-side validation
    if (!/^\d{6}$/.test(verifyCode)) {
      toast({ title: 'Please enter a valid 6-digit code', variant: 'destructive' });
      return;
    }

    if (!factorId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(factorId)) {
      toast({ title: 'Invalid setup state', variant: 'destructive' });
      return;
    }

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verifyCode
      });

      if (verifyError) throw verifyError;

      setStep('success');
      setVerifyCode(''); // Clear code immediately
      toast({ title: 'MFA enabled successfully!' });
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      // Don't leak specific error details
      toast({ 
        title: 'Verification failed', 
        description: 'Invalid code. Please try again.',
        variant: 'destructive' 
      });
      setVerifyCode(''); // Clear code on failure
    } finally {
      setIsVerifying(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast({ title: 'Secret copied to clipboard' });
  };

  const handleClose = async () => {
    // If we started enrollment but didn't complete it, unenroll the factor
    if (factorId && step !== 'success') {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setStep('loading');
    setQrCode('');
    setSecret('');
    setFactorId('');
    setVerifyCode('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Setup Two-Factor Authentication
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Setting up authenticator...</p>
            </motion.div>
          )}

          {step === 'qr' && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Or enter this code manually:</p>
                <div className="flex items-center gap-2 p-2 rounded bg-secondary/50 font-mono text-xs">
                  <span className="flex-1 break-all">{secret}</span>
                  <Button variant="ghost" size="icon" onClick={copySecret}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={() => setStep('verify')} className="w-full">
                Next: Verify Code
              </Button>
            </motion.div>
          )}

          {step === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to verify the setup.
              </p>

              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                autoFocus
              />

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('qr')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={verifyMFA} 
                  disabled={isVerifying || verifyCode.length !== 6}
                  className="flex-1"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <CheckCircle className="w-16 h-16 text-green-500" />
              <p className="mt-4 font-medium">Two-Factor Authentication Enabled!</p>
              <p className="text-sm text-muted-foreground">Your account is now more secure.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

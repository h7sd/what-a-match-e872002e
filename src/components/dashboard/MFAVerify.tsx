import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { invokeSecure } from '@/lib/secureEdgeFunctions';
import { supabase } from '@/integrations/supabase/client';

interface MFAVerifyProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  factorId: string;
}

export function MFAVerify({ isOpen, onClose, onSuccess, factorId }: MFAVerifyProps) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const ensureAal2 = async (): Promise<boolean> => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aalData) return true;
      if (aalData.currentLevel === 'aal2' || aalData.nextLevel !== 'aal2') return true;
      if (attempt === 0) await supabase.auth.refreshSession();
      await sleep(150);
    }
    return false;
  };

  const handleVerify = async () => {
    // Client-side validation
    if (!/^\d{6}$/.test(code)) {
      toast({ title: 'Please enter a valid 6-digit code', variant: 'destructive' });
      return;
    }

    setIsVerifying(true);
    try {
      // Use secure edge function for verification (rate-limited + validated)
      const { data, error } = await invokeSecure<{
        success?: boolean;
        lockoutMinutes?: number;
        error?: string;
        access_token?: string;
        refresh_token?: string;
      }>('mfa-verify', {
        body: { action: 'verify', factorId, code }
      });

      if (error) throw error;

      if (data?.lockoutMinutes) {
        toast({
          title: 'Too many attempts',
          description: `Please wait ${data.lockoutMinutes} minutes before trying again.`,
          variant: 'destructive'
        });
        return;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Verification failed');
      }

      // IMPORTANT: Apply returned tokens immediately so this session becomes AAL2.
      if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) {
          await supabase.auth.refreshSession();
        }
      } else {
        await supabase.auth.refreshSession();
      }

      const ok = await ensureAal2();
      if (!ok) {
        throw new Error('2FA session upgrade failed. Please try again.');
      }

      toast({ title: 'Verified successfully!' });
      setCode('');
      onSuccess();
    } catch (error: any) {
      // Don't leak specific error details
      toast({
        title: 'Verification failed',
        description: error.message?.includes('Too many') ? error.message : 'Invalid code. Please try again.',
        variant: 'destructive'
      });
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app.
          </p>

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="text-center text-2xl tracking-widest font-mono"
            maxLength={6}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />

          <Button
            onClick={handleVerify}
            disabled={isVerifying || code.length !== 6}
            className="w-full"
          >
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Verify
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

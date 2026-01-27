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

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({ title: 'Please enter a 6-digit code', variant: 'destructive' });
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
        code: code
      });

      if (verifyError) throw verifyError;

      toast({ title: 'Verified successfully!' });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Invalid code', description: error.message, variant: 'destructive' });
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

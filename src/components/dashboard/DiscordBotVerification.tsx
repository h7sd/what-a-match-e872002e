import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, RefreshCw, Copy, Check, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DiscordBotVerificationProps {
  userId?: string;
  discordUserId?: string | null;
}

export function DiscordBotVerification({ userId, discordUserId }: DiscordBotVerificationProps) {
  const { toast } = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Calculate time left
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        setCode(null);
        setExpiresAt(null);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Fetch current code on mount
  useEffect(() => {
    if (!userId || discordUserId) return;

    const fetchCurrentCode = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) return;

        const response = await supabase.functions.invoke('bot-verify-code', {
          body: { action: 'get_current' },
        });

        if (response.data?.code) {
          setCode(response.data.code);
          setExpiresAt(response.data.expires_at);
        }
      } catch (e) {
        console.error('Failed to fetch current code:', e);
      }
    };

    fetchCurrentCode();
  }, [userId, discordUserId]);

  const generateCode = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('bot-verify-code', {
        body: { action: 'generate' },
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.code) {
        setCode(response.data.code);
        setExpiresAt(response.data.expires_at);
        toast({ title: 'Verification code generated!' });
      }
    } catch (e: any) {
      console.error('Failed to generate code:', e);
      toast({ 
        title: 'Failed to generate code', 
        description: e.message || 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: 'Code copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If already linked, show linked status
  // Only show verified if discordUserId is a non-empty string (not null, undefined, or empty string)
  const isLinked = discordUserId && discordUserId.trim().length > 0;
  
  if (isLinked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-5"
      >
        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-[#5865F2]/30 via-[#00D9A5]/20 to-[#5865F2]/30" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#5865F2]/20 to-[#5865F2]/10 flex items-center justify-center border border-[#5865F2]/20">
              <Bot className="w-5 h-5 text-[#5865F2]" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Discord Bot</h3>
              <p className="text-xs text-[#00D9A5]">✓ Verified</p>
            </div>
          </div>
          <p className="text-sm text-white/50">
            Your Discord is linked. Use bot commands like <code className="px-1.5 py-0.5 bg-white/10 rounded text-[#5865F2]">?daily</code> to earn UC!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-5"
    >
      <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-[#5865F2]/30 via-amber-500/20 to-[#5865F2]/30" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Discord Bot Verification</h3>
            <p className="text-xs text-white/50">Link your Discord account</p>
          </div>
        </div>

        {code && timeLeft !== null && timeLeft > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              Use this code with <code className="px-1.5 py-0.5 bg-white/10 rounded text-[#5865F2]">?link</code> in Discord:
            </p>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gradient-to-r from-[#5865F2]/20 to-[#5865F2]/10 border border-[#5865F2]/30 rounded-lg px-4 py-3">
                <span className="font-mono text-2xl tracking-[0.3em] text-white font-bold">
                  {code}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
                className="h-12 w-12 border-white/10 hover:bg-white/10"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-white/40">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires in {formatTimeLeft(timeLeft)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateCode}
                disabled={loading}
                className="text-xs h-7 text-white/50 hover:text-white"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                New Code
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              Generate a code to link your Discord account with the bot.
            </p>
            <Button
              onClick={generateCode}
              disabled={loading}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bot className="w-4 h-4 mr-2" />
              )}
              Generate Verification Code
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

import { useState } from 'react';
import { Ban, LogOut, Loader2, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BanAppealScreenProps {
  userId: string;
  reason: string | null;
  appealSubmitted: boolean;
  onLogout: () => void;
}

export function BanAppealScreen({ 
  userId, 
  reason, 
  appealSubmitted,
  onLogout 
}: BanAppealScreenProps) {
  const { toast } = useToast();
  const [appealText, setAppealText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(appealSubmitted);

  const handleSubmitAppeal = async () => {
    if (appealText.trim().length < 10) {
      toast({ title: 'Please write at least 10 characters', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-ban-appeal', {
        body: { userId, appealText: appealText.trim() }
      });

      if (error) throw error;

      toast({ title: 'Appeal submitted successfully' });
      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting appeal:', error);
      toast({ 
        title: 'Failed to submit appeal', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <Ban className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-destructive">Account Suspended</h1>
            <p className="text-muted-foreground">
              Your account has been suspended for violating our terms of service.
            </p>
          </div>

          {/* Reason Box */}
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Reason</p>
            <p className="text-sm">{reason || 'No reason provided'}</p>
          </div>

          {/* Appeal Section */}
          {submitted ? (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-primary mx-auto" />
              <p className="font-medium">Appeal Submitted</p>
              <p className="text-sm text-muted-foreground">
                Your appeal is under review. We will notify you of the decision via email.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Explain why you believe this suspension was not justified..."
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {appealText.length}/2000 characters
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={onLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSubmitAppeal}
                  disabled={isSubmitting || appealText.trim().length < 10}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Appeal
                </Button>
              </div>
            </div>
          )}

          {/* Only show separate logout when appeal is submitted */}
          {submitted && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

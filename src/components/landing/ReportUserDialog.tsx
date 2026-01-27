import { useState } from 'react';
import { Flag, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function ReportUserDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim()) {
      toast({ title: 'Please enter a username', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Please enter a reason', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        username: username.trim().slice(0, 64),
        reason: reason.trim().slice(0, 1500),
      };

      const { error } = await supabase.functions.invoke('report-user', {
        body: payload,
      });

      if (error) {
        console.error('Report invoke error:', error);
        throw new Error(error.message || 'Failed to submit report');
      }

      toast({ title: 'Report submitted', description: 'Thank you for your report. Our team will review it.' });
      setIsOpen(false);
      setUsername('');
      setReason('');
    } catch (error: any) {
      console.error('Report error:', error);
      toast({ title: 'Error submitting report', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Flag className="w-4 h-4 mr-1.5" />
          Report User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Report a User
          </DialogTitle>
          <DialogDescription>
            Submit a report about a user violating our community guidelines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Username</label>
            <Input
              placeholder="Enter username to report..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={64}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Reason</label>
            <Textarea
              placeholder="Describe why you're reporting this user..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1500}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !username.trim() || !reason.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

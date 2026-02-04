import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Send, Megaphone } from 'lucide-react';

export function AdminNotificationSender() {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Bitte gib eine Nachricht ein');
      return;
    }

    if (message.length > 200) {
      toast.error('Nachricht zu lang (max. 200 Zeichen)');
      return;
    }

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          message: message.trim(),
          type: 'info',
          created_by: user.id,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Auto-expire after 5 min
        });

      if (error) throw error;

      toast.success('Live-Benachrichtigung gesendet! 🎉');
      setMessage('');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Fehler beim Senden');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-purple-400" />
        Live-Benachrichtigung
      </h3>
      
      <p className="text-sm text-white/60">
        Sende eine Nachricht an alle Benutzer. Die Nachricht erscheint als animierte Bubble überall auf der Seite.
      </p>

      <div>
        <Label className="text-white/70">Nachricht</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Deine Nachricht an alle..."
          className="bg-black/30 border-white/20 text-white min-h-[80px] mt-1"
          maxLength={200}
        />
        <p className="text-xs text-white/40 mt-1">{message.length}/200</p>
      </div>

      <Button
        onClick={handleSend}
        disabled={isSending || !message.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        <Send className="w-4 h-4 mr-2" />
        {isSending ? 'Wird gesendet...' : 'Jetzt senden'}
      </Button>
    </div>
  );
}

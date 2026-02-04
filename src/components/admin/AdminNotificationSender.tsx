import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Send, AlertCircle, Info, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AdminNotification {
  id: string;
  message: string;
  type: string;
  created_at: string;
  is_active: boolean;
  expires_at: string | null;
}

export function AdminNotificationSender() {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [expiresInMinutes, setExpiresInMinutes] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const { data: activeNotifications, refetch } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AdminNotification[];
    }
  });

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Bitte gib eine Nachricht ein');
      return;
    }

    setIsSending(true);
    try {
      const expiresAt = expiresInMinutes 
        ? new Date(Date.now() + parseInt(expiresInMinutes) * 60 * 1000).toISOString()
        : null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          message: message.trim(),
          type,
          created_by: user.id,
          expires_at: expiresAt
        });

      if (error) throw error;

      toast.success('Benachrichtigung gesendet!');
      setMessage('');
      setExpiresInMinutes('');
      refetch();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Fehler beim Senden');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Benachrichtigung deaktiviert');
      refetch();
    } catch (error) {
      console.error('Error deactivating:', error);
      toast.error('Fehler beim Deaktivieren');
    }
  };

  const typeIcons = {
    info: <Info className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    success: <CheckCircle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />
  };

  const typeColors = {
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
    success: 'bg-green-500/20 border-green-500/50 text-green-300',
    error: 'bg-red-500/20 border-red-500/50 text-red-300'
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Live-Benachrichtigung senden
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-white/70">Nachricht</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nachricht für alle Benutzer..."
              className="bg-black/30 border-white/20 text-white min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-white/40 mt-1">{message.length}/500</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Typ</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger className="bg-black/30 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ Info</SelectItem>
                  <SelectItem value="warning">⚠️ Warnung</SelectItem>
                  <SelectItem value="success">✅ Erfolg</SelectItem>
                  <SelectItem value="error">🚨 Wichtig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/70">Läuft ab in (Minuten)</Label>
              <Input
                type="number"
                value={expiresInMinutes}
                onChange={(e) => setExpiresInMinutes(e.target.value)}
                placeholder="Optional"
                min="1"
                className="bg-black/30 border-white/20 text-white"
              />
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isSending ? 'Wird gesendet...' : 'Benachrichtigung senden'}
          </Button>
        </div>
      </div>

      {/* Active Notifications */}
      {activeNotifications && activeNotifications.length > 0 && (
        <div className="bg-black/40 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Aktive Benachrichtigungen</h3>
          <div className="space-y-3">
            {activeNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${typeColors[notif.type as keyof typeof typeColors] || typeColors.info}`}
              >
                <div className="flex items-start gap-2 flex-1">
                  {typeIcons[notif.type as keyof typeof typeIcons] || typeIcons.info}
                  <div className="flex-1">
                    <p className="text-sm">{notif.message}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(notif.created_at).toLocaleString('de-DE')}
                      {notif.expires_at && ` • Läuft ab: ${new Date(notif.expires_at).toLocaleString('de-DE')}`}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeactivate(notif.id)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

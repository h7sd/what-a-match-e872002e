import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock, Loader2, User, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface AliasRequest {
  id: string;
  requester_id: string;
  requested_alias: string;
  status: string;
  created_at: string;
  requester_username?: string;
  requester_display_name?: string;
}

export function AliasRequestsBell() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<AliasRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('alias_requests')
        .select('*')
        .eq('target_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setRequests([]);
        return;
      }

      const requesterIds = data.map(r => r.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name')
        .in('user_id', requesterIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setRequests(
        data.map(r => ({
          ...r,
          requester_username: profileMap.get(r.requester_id)?.username,
          requester_display_name: profileMap.get(r.requester_id)?.display_name,
        }))
      );
    } catch (e) {
      console.error('Error fetching alias requests (bell):', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    pollRef.current = window.setInterval(fetchRequests, 30_000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-popup once per session if there are pending requests
  useEffect(() => {
    if (loading) return;
    if (requests.length === 0) return;
    if (open) return;

    const key = 'aliasRequestsPopupShown';
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    setOpen(true);
  }, [loading, open, requests.length]);

  const handleRespond = async (requestId: string, response: 'approved' | 'denied') => {
    setResponding(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('alias-request', {
        body: { action: 'respond', requestId, response },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to respond');

      toast({ title: response === 'approved' ? 'Anfrage angenommen' : 'Anfrage abgelehnt' });
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (e: any) {
      toast({ title: 'Fehler', description: e?.message || 'Konnte nicht antworten', variant: 'destructive' });
    } finally {
      setResponding(null);
    }
  };

  const count = requests.length;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative"
        aria-label="Alias-Anfragen öffnen"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-[18px] text-center">
            {count}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Alias-Anfragen
              {count > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Du kannst Anfragen hier oder per E-Mail annehmen/ablehnen.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : count === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              Keine offenen Alias-Anfragen.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
              <AnimatePresence>
                {requests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="bg-card/50 border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          <span className="text-primary">@{request.requester_username || 'unknown'}</span>
                          {' möchte '}
                          <span className="text-foreground">@{request.requested_alias}</span>
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRespond(request.id, 'approved')}
                          disabled={responding === request.id}
                        >
                          {responding === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRespond(request.id, 'denied')}
                          disabled={responding === request.id}
                        >
                          {responding === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

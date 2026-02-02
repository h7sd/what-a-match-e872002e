import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AliasRequest {
  id: string;
  requester_id: string;
  requested_alias: string;
  status: string;
  created_at: string;
  requester_username?: string;
  requester_display_name?: string;
}

export function AliasRequestsSection() {
  const [requests, setRequests] = useState<AliasRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch incoming requests using secure RPC function (excludes response_token)
      const { data, error } = await supabase
        .rpc('get_alias_requests_for_me');
      
      // Filter for pending and sort
      const pendingData = data
        ?.filter((r: any) => r.status === 'pending')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (error) throw error;

      // Fetch requester profiles
      if (pendingData && pendingData.length > 0) {
        const requesterIds = pendingData.map((r: any) => r.requester_id);
        
        // Fetch profiles individually to avoid exposing user_id in response
        const profileMap = new Map<string, { username: string; display_name: string | null }>();
        for (const requesterId of requesterIds) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('user_id', requesterId)
            .maybeSingle();
          if (profile) {
            profileMap.set(requesterId, profile);
          }
        }
        
        const enrichedRequests = pendingData.map((r: any) => ({
          ...r,
          requester_username: profileMap.get(r.requester_id)?.username,
          requester_display_name: profileMap.get(r.requester_id)?.display_name,
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching alias requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRespond = async (requestId: string, response: 'approved' | 'denied') => {
    setResponding(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('alias-request', {
        body: {
          action: 'respond',
          requestId,
          response,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(response === 'approved' ? 'Request approved!' : 'Request denied');
        setRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        throw new Error(data?.error || 'Failed to respond');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond to request');
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User className="w-5 h-5 text-primary" />
        Alias Requests
        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </h3>

      <div className="space-y-3">
        <AnimatePresence>
          {requests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    <span className="text-primary">@{request.requester_username}</span>
                    {' wants '}
                    <span className="text-purple-400">@{request.requested_alias}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500/30 text-green-500 hover:bg-green-500/10"
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
                    variant="outline"
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10"
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
    </div>
  );
}

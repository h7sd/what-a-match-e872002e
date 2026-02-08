import { useState, useEffect } from 'react';
import { Award, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase-proxy-client';
import { Progress } from '@/components/ui/progress';

export function AdminEarlyBadgeCounter() {
  const [claimed, setClaimed] = useState(0);
  const [maxClaims, setMaxClaims] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarlyBadge = async () => {
      try {
        const { data, error } = await supabase
          .from('global_badges')
          .select('claims_count, max_claims')
          .ilike('name', 'early')
          .single();

        if (error) {
          console.error('Error fetching EARLY badge:', error);
          return;
        }

        if (data) {
          setClaimed(data.claims_count || 0);
          setMaxClaims(data.max_claims || 100);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarlyBadge();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-early-badge-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'global_badges',
          filter: 'name=ilike.early',
        },
        (payload) => {
          if (payload.new) {
            setClaimed((payload.new as any).claims_count || 0);
            setMaxClaims((payload.new as any).max_claims || 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const remaining = Math.max(0, maxClaims - claimed);
  const progressPercentage = maxClaims > 0 ? (claimed / maxClaims) * 100 : 0;
  const isLimitReached = remaining === 0;

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-white/10 rounded w-32 mb-2" />
        <div className="h-3 bg-white/10 rounded w-24" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Award className="w-5 h-5 text-amber-400" />
            {!isLimitReached && (
              <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
            )}
          </div>
          <span className="font-medium text-white">EARLY Badge Status</span>
        </div>
        <div className="flex items-center gap-2">
          {isLimitReached ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              Sold Out
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Active
            </span>
          )}
        </div>
      </div>

      <Progress 
        value={progressPercentage} 
        className="h-2 bg-white/10"
      />

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-white/60">Claimed: </span>
            <span className="font-semibold text-white">{claimed}</span>
          </div>
          <div>
            <span className="text-white/60">Remaining: </span>
            <span className={`font-semibold ${remaining <= 10 ? 'text-amber-400' : remaining === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {remaining}
            </span>
          </div>
        </div>
        <div className="text-white/40 text-xs">
          Max: {maxClaims}
        </div>
      </div>

      {remaining <= 10 && remaining > 0 && (
        <div className="text-xs text-amber-400/80 flex items-center gap-1 mt-1">
          <Sparkles className="w-3 h-3" />
          Only {remaining} badges left!
        </div>
      )}
    </div>
  );
}

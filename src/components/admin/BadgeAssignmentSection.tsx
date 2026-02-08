import { useState, useEffect } from 'react';
import { Loader2, Plus, Check, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getBadgeIcon } from '@/lib/badges';
import { supabase } from '@/lib/supabase-proxy-client';
import { useQueryClient } from '@tanstack/react-query';

interface GlobalBadge {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  color: string | null;
  rarity: string | null;
  is_limited: boolean | null;
  max_claims: number | null;
  claims_count: number | null;
}

interface BadgeAssignmentSectionProps {
  userId: string;
  userBadgeIds: string[];
  onBadgeAssigned: () => void;
}

export function BadgeAssignmentSection({ userId, userBadgeIds, onBadgeAssigned }: BadgeAssignmentSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [allBadges, setAllBadges] = useState<GlobalBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningBadgeId, setAssigningBadgeId] = useState<string | null>(null);

  useEffect(() => {
    loadAllBadges();
  }, []);

  const loadAllBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('global_badges')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setAllBadges(data || []);
    } catch (error: any) {
      toast({ title: error.message || 'Error loading badges', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const assignBadge = async (badge: GlobalBadge) => {
    if (userBadgeIds.includes(badge.id)) {
      toast({ title: 'User already has this badge', variant: 'destructive' });
      return;
    }

    setAssigningBadgeId(badge.id);
    try {
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badge.id,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['profileBadges'] });
      queryClient.invalidateQueries({ queryKey: ['globalBadges'] });
      
      toast({ title: `Badge "${badge.name}" assigned!` });
      onBadgeAssigned();
    } catch (error: any) {
      toast({ title: error.message || 'Error assigning badge', variant: 'destructive' });
    } finally {
      setAssigningBadgeId(null);
    }
  };

  // Separate badges into assigned and unassigned
  const unassignedBadges = allBadges.filter(b => !userBadgeIds.includes(b.id));
  const assignedBadges = allBadges.filter(b => userBadgeIds.includes(b.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Assign Badges ({unassignedBadges.length} available)
        </h5>
      </div>

      {unassignedBadges.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <Check className="w-6 h-6 mx-auto mb-2 text-green-500" />
          User has all available badges!
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
          {unassignedBadges.map((badge) => {
            const Icon = getBadgeIcon(badge.name);
            const isAssigning = assigningBadgeId === badge.id;
            const isLimited = badge.is_limited && badge.max_claims !== null;
            const claimsRemaining = isLimited ? (badge.max_claims! - (badge.claims_count || 0)) : null;

            return (
              <Button
                key={badge.id}
                variant="outline"
                size="sm"
                onClick={() => assignBadge(badge)}
                disabled={isAssigning}
                className="h-auto py-2 px-3 flex items-center gap-2 justify-start hover:bg-primary/10 hover:border-primary/50"
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${badge.color || '#8B5CF6'}20` }}
                >
                  {isAssigning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: badge.color || '#8B5CF6' }} />
                  ) : badge.icon_url ? (
                    <img src={badge.icon_url} alt={badge.name} className="w-4 h-4" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" style={{ color: badge.color || '#8B5CF6' }} />
                  )}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{badge.name}</p>
                  {isLimited && (
                    <p className="text-[10px] text-muted-foreground">
                      {claimsRemaining} remaining
                    </p>
                  )}
                </div>
                <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </Button>
            );
          })}
        </div>
      )}

      {/* Show summary of assigned badges */}
      {assignedBadges.length > 0 && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <span className="text-green-500 font-medium">{assignedBadges.length}</span> badge{assignedBadges.length !== 1 ? 's' : ''} already assigned
        </div>
      )}
    </div>
  );
}

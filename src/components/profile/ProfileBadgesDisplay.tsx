import { TooltipProvider } from '@/components/ui/tooltip';
import { StealableBadge } from './StealableBadge';
import { useActiveStealEvent } from '@/hooks/useActiveStealEvent';
import { useActiveHuntEvent } from '@/hooks/useActiveHuntEvent';
import { useHasStolenInEvent } from '@/hooks/useHasStolenInEvent';
import { useQueryClient } from '@tanstack/react-query';

interface Badge {
  id: string;
  name: string;
  color: string | null;
  icon_url?: string | null;
}

interface ProfileBadgesDisplayProps {
  badges: Badge[];
  profileUsername: string;
  isOwnProfile: boolean;
  accentColor: string;
  transparentBadges?: boolean;
}

export function ProfileBadgesDisplay({
  badges,
  profileUsername,
  isOwnProfile,
  accentColor,
  transparentBadges = false,
}: ProfileBadgesDisplayProps) {
  const { data: activeStealEvent } = useActiveStealEvent();
  const { data: activeHuntEvent } = useActiveHuntEvent();

  const activeEventId = activeStealEvent?.id ?? activeHuntEvent?.id;
  const activeEventType: 'steal' | 'hunt' | null = activeStealEvent
    ? 'steal'
    : activeHuntEvent
      ? 'hunt'
      : null;

  const huntTargetBadgeId = activeHuntEvent?.target_badge_id ?? null;
  const { data: hasStolenInEvent = false } = useHasStolenInEvent(activeEventId, activeEventType);
  const queryClient = useQueryClient();

  // For steal events: hide UI after stealing once
  // For hunt events: always show UI (no limit)
  const canShowStealUI = !!activeEventId && !hasStolenInEvent;

  const handleStealSuccess = () => {
    // Invalidate all relevant queries so UI updates
    queryClient.invalidateQueries({ queryKey: ['secure-badges', profileUsername] });
    queryClient.invalidateQueries({ queryKey: ['has-stolen-in-event'] });
    queryClient.invalidateQueries({ queryKey: ['hunt-badge-holder'] });
    queryClient.invalidateQueries({ queryKey: ['activeHuntEvent'] });
  };

  if (badges.length === 0) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="inline-flex items-center justify-center -space-x-1 mb-4 px-2.5 py-1 rounded-full border border-white/10 bg-black/20 backdrop-blur-sm mx-auto">
        {badges.map((badge) => (
          <StealableBadge
            key={badge.id}
            badge={badge}
            victimUsername={profileUsername}
            isOwnProfile={isOwnProfile}
            hasActiveStealEvent={
              canShowStealUI &&
              (activeEventType === 'steal' || (activeEventType === 'hunt' && !!huntTargetBadgeId && badge.id === huntTargetBadgeId))
            }
            activeEventId={activeEventId ?? null}
            accentColor={accentColor}
            transparentBadges={transparentBadges}
            onStealSuccess={handleStealSuccess}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

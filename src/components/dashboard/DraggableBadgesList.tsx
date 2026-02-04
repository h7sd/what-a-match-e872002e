import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, Lock, GripVertical, Palette, Target } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GlobalBadge } from '@/hooks/useBadges';
import { getBadgeIcon } from '@/lib/badges';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useActiveHuntEvent } from '@/hooks/useActiveHuntEvent';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface UserBadgeWithEnabled {
  id: string;
  badge_id: string;
  is_enabled: boolean;
  is_locked?: boolean;
  display_order?: number;
  custom_color?: string | null;
  badge: GlobalBadge;
}

interface DraggableBadgesListProps {
  userBadges: UserBadgeWithEnabled[];
  userId: string;
}

// Sortable Badge Item Component
function SortableBadgeItem({ 
  userBadge, 
  onToggle, 
  onColorChange,
  updating,
  isLocked,
  isHuntTarget,
}: { 
  userBadge: UserBadgeWithEnabled;
  onToggle: (id: string, enabled: boolean) => void;
  onColorChange: (id: string, color: string | null) => void;
  updating: string | null;
  isLocked: boolean;
  isHuntTarget: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: userBadge.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const badge = userBadge.badge;
  const Icon = getBadgeIcon(badge.name);
  const isEnabled = userBadge.is_enabled !== false;
  const displayColor = userBadge.custom_color || badge.color || '#8B5CF6';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative p-4 rounded-xl border transition-all duration-300
        ${isEnabled 
          ? 'border-primary/50 bg-primary/5' 
          : 'border-border bg-secondary/10 opacity-60'
        }
        ${isDragging ? 'shadow-lg ring-2 ring-primary/50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        {!isLocked && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded touch-manipulation"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${displayColor}20` }}
        >
          {badge.icon_url ? (
            <img src={badge.icon_url} alt={badge.name} className="w-6 h-6" />
          ) : (
            <Icon className="w-5 h-5" style={{ color: displayColor }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{badge.name}</h4>
          <p className="text-xs text-muted-foreground truncate">
            {isHuntTarget && isEnabled 
              ? 'Hunt target – always visible' 
              : isEnabled 
                ? 'Visible on profile' 
                : 'Hidden'}
          </p>
        </div>

        {/* Color Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <div 
                className="w-4 h-4 rounded-full border border-white/20"
                style={{ backgroundColor: displayColor }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="end">
            <div className="space-y-2">
              <p className="text-xs font-medium">Badge Color</p>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={displayColor}
                  onChange={(e) => onColorChange(userBadge.id, e.target.value)}
                  className="w-10 h-8 p-0.5 cursor-pointer"
                />
                <Input
                  type="text"
                  value={displayColor}
                  onChange={(e) => onColorChange(userBadge.id, e.target.value)}
                  className="w-24 h-8 text-xs"
                  placeholder="#8B5CF6"
                />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => onColorChange(userBadge.id, null)}
              >
                Reset to Default
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          {isHuntTarget && isEnabled && (
            <div className="flex items-center gap-1 text-emerald-400 text-xs">
              <Target className="w-3 h-3" />
              <span>Hunt</span>
            </div>
          )}
          {updating === userBadge.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Switch
              checked={isEnabled}
              onCheckedChange={() => onToggle(userBadge.id, isEnabled)}
              disabled={isLocked || (isHuntTarget && isEnabled)}
            />
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-2 right-2">
        {isEnabled ? (
          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-500" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-3 h-3 text-red-500" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function DraggableBadgesList({ userBadges, userId }: DraggableBadgesListProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [localBadges, setLocalBadges] = useState(userBadges);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: activeHuntEvent } = useActiveHuntEvent();
  
  const huntTargetBadgeId = activeHuntEvent?.target_badge_id ?? null;

  // Update local state when props change
  useState(() => {
    setLocalBadges(userBadges);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleToggle = async (userBadgeId: string, currentEnabled: boolean) => {
    setUpdating(userBadgeId);
    try {
      const { error } = await supabase
        .from('user_badges')
        .update({ is_enabled: !currentEnabled })
        .eq('id', userBadgeId);

      if (error) throw error;

      setLocalBadges(prev => 
        prev.map(b => b.id === userBadgeId ? { ...b, is_enabled: !currentEnabled } : b)
      );
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['profileBadges'] });
      toast({ title: currentEnabled ? 'Badge deactivated' : 'Badge activated' });
    } catch (error: any) {
      toast({ title: error.message || 'Error updating badge', variant: 'destructive' });
    } finally {
      setUpdating(null);
    }
  };

  const handleColorChange = async (userBadgeId: string, color: string | null) => {
    try {
      const { error } = await supabase
        .from('user_badges')
        .update({ custom_color: color })
        .eq('id', userBadgeId);

      if (error) throw error;

      setLocalBadges(prev => 
        prev.map(b => b.id === userBadgeId ? { ...b, custom_color: color } : b)
      );
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['profileBadges'] });
    } catch (error: any) {
      toast({ title: error.message || 'Error updating color', variant: 'destructive' });
    }
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localBadges.findIndex((b) => b.id === active.id);
      const newIndex = localBadges.findIndex((b) => b.id === over.id);

      const newBadges = arrayMove(localBadges, oldIndex, newIndex);
      setLocalBadges(newBadges);

      // Update all display orders
      try {
        const updates = newBadges.map((badge, index) => ({
          id: badge.id,
          display_order: index,
        }));

        for (const update of updates) {
          await supabase
            .from('user_badges')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
        }

        queryClient.invalidateQueries({ queryKey: ['userBadges'] });
        queryClient.invalidateQueries({ queryKey: ['profileBadges'] });
        toast({ title: 'Badge order updated' });
      } catch (error: any) {
        toast({ title: 'Failed to save order', variant: 'destructive' });
      }
    }
  }, [localBadges, queryClient, toast]);

  if (userBadges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>You don't have any badges yet.</p>
      </div>
    );
  }

  // Separate locked badges from others
  const lockedBadges = localBadges.filter(ub => ub.is_locked);
  const unlockedBadges = localBadges
    .filter(ub => !ub.is_locked)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  return (
    <div className="space-y-6">
      {/* Unlocked Badges - Draggable */}
      {unlockedBadges.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            Drag to reorder badges
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={unlockedBadges.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unlockedBadges.map((ub) => (
                  <SortableBadgeItem
                    key={ub.id}
                    userBadge={ub}
                    onToggle={handleToggle}
                    onColorChange={handleColorChange}
                    updating={updating}
                    isLocked={false}
                    isHuntTarget={ub.badge_id === huntTargetBadgeId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Locked Badges Section */}
      {lockedBadges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-destructive flex items-center gap-1 mb-3">
            <Lock className="w-3 h-3" />
            Locked Badges ({lockedBadges.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lockedBadges.map((ub) => {
              const badge = ub.badge;
              const Icon = getBadgeIcon(badge.name);

              return (
                <motion.div
                  key={ub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative p-4 rounded-xl border border-destructive/30 bg-destructive/5 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-destructive/10"
                    >
                      {badge.icon_url ? (
                        <img src={badge.icon_url} alt={badge.name} className="w-6 h-6 grayscale opacity-50" />
                      ) : (
                        <Icon className="w-5 h-5 text-destructive opacity-50" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{badge.name}</h4>
                      <p className="text-xs text-destructive/70 truncate">
                        Locked by administrator
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={false}
                        disabled
                        className="opacity-50 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Lock indicator */}
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
                      <Lock className="w-3 h-3 text-destructive" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sparkles, Target, Play, Pause, Plus, Trash2, Loader2, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useGlobalBadges } from '@/hooks/useBadges';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface BadgeEvent {
  id: string;
  event_type: 'steal' | 'hunt';
  name: string;
  description: string | null;
  target_badge_id: string | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  steal_duration_hours: number;
  created_by: string | null;
  created_at: string;
}

interface BadgeSteal {
  id: string;
  event_id: string;
  badge_id: string;
  thief_user_id: string;
  victim_user_id: string;
  stolen_at: string;
  returns_at: string;
  returned: boolean;
}

export function AdminEventController() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: globalBadges = [] } = useGlobalBadges();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    event_type: 'steal' as 'steal' | 'hunt',
    name: '',
    description: '',
    target_badge_id: '',
    steal_duration_hours: 168,
  });

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['badgeEvents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BadgeEvent[];
    },
  });

  // Fetch active steals
  const { data: activeStealsList = [] } = useQuery({
    queryKey: ['badgeSteals', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_steals')
        .select('*')
        .eq('returned', false)
        .gt('returns_at', new Date().toISOString());
      if (error) throw error;
      return data as BadgeSteal[];
    },
  });

  // Create event
  const createEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('badge_events')
        .insert({
          event_type: newEvent.event_type,
          name: newEvent.name,
          description: newEvent.description || null,
          target_badge_id: newEvent.target_badge_id || null,
          steal_duration_hours: newEvent.steal_duration_hours,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badgeEvents'] });
      toast({ title: 'Event created!' });
      setIsCreateOpen(false);
      setNewEvent({
        event_type: 'steal',
        name: '',
        description: '',
        target_badge_id: '',
        steal_duration_hours: 168,
      });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  // Toggle event active
  const toggleActive = useMutation({
    mutationFn: async ({ eventId, isActive }: { eventId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('badge_events')
        .update({ is_active: isActive })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badgeEvents'] });
      toast({ title: 'Event status updated' });
    },
  });

  // Delete event
  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('badge_events')
        .delete()
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badgeEvents'] });
      toast({ title: 'Event deleted' });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Badge Events
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage badge stealing and hunt events
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Badge Event</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Event Type */}
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select
                  value={newEvent.event_type}
                  onValueChange={(value: 'steal' | 'hunt') => 
                    setNewEvent(prev => ({ ...prev, event_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="steal">
                      <span className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Steal - Users can steal badges from others
                      </span>
                    </SelectItem>
                    <SelectItem value="hunt">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Hunt - Hidden badge, finder keeps it
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Event Name */}
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input
                  value={newEvent.name}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Badge Heist 2026"
                  maxLength={64}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Steal badges for a week!"
                />
              </div>

              {/* Target Badge (for hunt events) */}
              {newEvent.event_type === 'hunt' && (
                <div className="space-y-2">
                  <Label>Target Badge</Label>
                  <Select
                    value={newEvent.target_badge_id}
                    onValueChange={(value) => 
                      setNewEvent(prev => ({ ...prev, target_badge_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a badge to hunt" />
                    </SelectTrigger>
                    <SelectContent>
                      {globalBadges.map((badge) => (
                        <SelectItem key={badge.id} value={badge.id}>
                          {badge.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Duration */}
              <div className="space-y-2">
                <Label>Steal Duration (hours)</Label>
                <Input
                  type="number"
                  value={newEvent.steal_duration_hours}
                  onChange={(e) => setNewEvent(prev => ({ 
                    ...prev, 
                    steal_duration_hours: parseInt(e.target.value) || 168 
                  }))}
                  min={1}
                  max={720}
                />
                <p className="text-xs text-muted-foreground">
                  168 hours = 1 week
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={() => createEvent.mutate()}
                disabled={!newEvent.name.trim() || createEvent.isPending}
              >
                {createEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Steals Count */}
      {activeStealsList.length > 0 && (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-400">
            <Users className="w-4 h-4" />
            <span className="font-medium">{activeStealsList.length} active steals</span>
          </div>
        </div>
      )}

      {/* Events List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No events created yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`p-4 rounded-lg border transition-all ${
                  event.is_active 
                    ? 'border-green-500/50 bg-green-500/10' 
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{event.name}</h4>
                      <Badge variant={event.event_type === 'steal' ? 'destructive' : 'default'}>
                        {event.event_type === 'steal' ? 'Steal' : 'Hunt'}
                      </Badge>
                      {event.is_active && (
                        <Badge variant="outline" className="text-green-400 border-green-500/50">
                          Active
                        </Badge>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.steal_duration_hours}h duration
                      </span>
                      <span>
                        Created {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: de })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={event.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ eventId: event.id, isActive: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteEvent.mutate(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

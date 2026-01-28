import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Loader2, Search, UserPlus, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { GlobalBadge, useAssignBadge, useGlobalBadges, useUserBadges } from '@/hooks/useBadges';
import { getBadgeIcon } from '@/lib/badges';
import { supabase } from '@/integrations/supabase/client';

export function AllBadgeAssigner() {
  const { data: badges = [], isLoading } = useGlobalBadges();
  const assignBadge = useAssignBadge();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [assigningBadgeId, setAssigningBadgeId] = useState<string | null>(null);

  // Fetch user's existing badges when a user is selected
  const { data: userBadges = [], refetch: refetchUserBadges } = useUserBadges(selectedUser?.user_id || '');

  // Live search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, uid_number')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast({ title: error.message || 'Error searching users', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBadgeClick = async (badge: GlobalBadge) => {
    if (!selectedUser) {
      toast({ title: 'Please select a user first', variant: 'destructive' });
      return;
    }

    // Check if user already has this badge
    const hasBadge = userBadges.some((ub: any) => ub.badge_id === badge.id);
    
    if (hasBadge) {
      toast({ title: `${selectedUser.username} already has this badge`, variant: 'destructive' });
      return;
    }

    setAssigningBadgeId(badge.id);
    try {
      await assignBadge.mutateAsync({
        userId: selectedUser.user_id,
        badgeId: badge.id,
      });
      toast({ title: `Badge "${badge.name}" assigned to ${selectedUser.username}!` });
      refetchUserBadges();
    } catch (error: any) {
      toast({ title: error.message || 'Error assigning badge', variant: 'destructive' });
    } finally {
      setAssigningBadgeId(null);
    }
  };

  const handleAssignAll = async () => {
    if (!selectedUser) {
      toast({ title: 'Please select a user first', variant: 'destructive' });
      return;
    }

    const unassignedBadges = badges.filter(
      (badge) => !userBadges.some((ub: any) => ub.badge_id === badge.id)
    );

    if (unassignedBadges.length === 0) {
      toast({ title: `${selectedUser.username} already has all badges!` });
      return;
    }

    for (const badge of unassignedBadges) {
      try {
        await assignBadge.mutateAsync({
          userId: selectedUser.user_id,
          badgeId: badge.id,
        });
      } catch (error) {
        // Continue with next badge
      }
    }

    refetchUserBadges();
    toast({ title: `Assigned ${unassignedBadges.length} badges to ${selectedUser.username}!` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No badges available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Assign Any Badge</h3>
        </div>
        
        <div className="flex-1 relative">
          {selectedUser ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
              {selectedUser.avatar_url ? (
                <img 
                  src={selectedUser.avatar_url} 
                  alt={selectedUser.username}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {selectedUser.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium flex-1">
                {selectedUser.display_name || selectedUser.username} 
                <span className="text-muted-foreground ml-1">@{selectedUser.username}</span>
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearUser}
                className="h-6 px-2 text-xs"
              >
                Change
              </Button>
            </div>
          ) : (
            <>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search user to assign badges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </>
          )}
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !selectedUser && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="p-3 hover:bg-secondary/50 cursor-pointer transition-colors flex items-center gap-3 border-b border-border last:border-0"
                >
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {user.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{user.display_name || user.username}</p>
                    <p className="text-xs text-muted-foreground">@{user.username} · UID: {user.uid_number}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedUser && (
          <Button
            onClick={handleAssignAll}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={assignBadge.isPending}
          >
            <CheckCheck className="w-4 h-4" />
            Assign All
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {selectedUser 
          ? `Click on badges to assign them to ${selectedUser.username}. Green badges are already assigned.`
          : 'Search for a user first, then click on badges to assign them.'
        }
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map((badge) => {
          const Icon = getBadgeIcon(badge.name);
          const hasBadge = userBadges.some((ub: any) => ub.badge_id === badge.id);
          const isAssigning = assigningBadgeId === badge.id;
          
          const rarityColors: Record<string, string> = {
            legendary: 'border-yellow-500/50 bg-yellow-500/10',
            epic: 'border-purple-500/50 bg-purple-500/10',
            rare: 'border-blue-500/50 bg-blue-500/10',
            common: 'border-gray-500/50 bg-gray-500/10',
          };

          return (
            <motion.div
              key={badge.id}
              whileHover={{ scale: selectedUser ? 1.02 : 1 }}
              whileTap={{ scale: selectedUser ? 0.98 : 1 }}
              onClick={() => handleBadgeClick(badge)}
              className={`
                relative p-3 rounded-xl border transition-all duration-300
                ${hasBadge 
                  ? 'border-green-500/50 bg-green-500/10' 
                  : rarityColors[badge.rarity || 'common']
                }
                ${selectedUser ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${badge.color || '#8B5CF6'}20` }}
                >
                  {isAssigning ? (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: badge.color || '#8B5CF6' }} />
                  ) : badge.icon_url ? (
                    <img src={badge.icon_url} alt={badge.name} className="w-5 h-5" />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: badge.color || '#8B5CF6' }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{badge.name}</h4>
                  <p className="text-xs text-muted-foreground capitalize">{badge.rarity || 'common'}</p>
                </div>

                {hasBadge ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <UserPlus className="w-4 h-4 text-primary" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

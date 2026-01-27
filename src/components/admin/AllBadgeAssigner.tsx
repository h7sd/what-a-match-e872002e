import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Loader2, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GlobalBadge, useAssignBadge, useGlobalBadges } from '@/hooks/useBadges';
import { getBadgeIcon } from '@/lib/badges';
import { supabase } from '@/integrations/supabase/client';

export function AllBadgeAssigner() {
  const { data: badges = [], isLoading } = useGlobalBadges();
  const assignBadge = useAssignBadge();
  const { toast } = useToast();

  const [selectedBadge, setSelectedBadge] = useState<GlobalBadge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const handleBadgeClick = (badge: GlobalBadge) => {
    setSelectedBadge(badge);
    setIsDialogOpen(true);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
  };

  // Live search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 1 && isDialogOpen) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isDialogOpen]);

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

  const handleApply = async () => {
    if (!selectedBadge || !selectedUser) return;

    try {
      await assignBadge.mutateAsync({
        userId: selectedUser.user_id,
        badgeId: selectedBadge.id,
      });
      toast({ title: `Badge "${selectedBadge.name}" assigned to ${selectedUser.username}!` });
      setIsDialogOpen(false);
      setSelectedBadge(null);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      toast({ title: error.message || 'Error assigning badge', variant: 'destructive' });
    }
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
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Assign Any Badge</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Click on any badge to assign it to a user.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map((badge) => {
          const Icon = getBadgeIcon(badge.name);
          const rarityColors: Record<string, string> = {
            legendary: 'border-yellow-500/50 bg-yellow-500/10',
            epic: 'border-purple-500/50 bg-purple-500/10',
            rare: 'border-blue-500/50 bg-blue-500/10',
            common: 'border-gray-500/50 bg-gray-500/10',
          };

          return (
            <motion.div
              key={badge.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleBadgeClick(badge)}
              className={`relative p-3 rounded-xl border cursor-pointer transition-all duration-300 ${rarityColors[badge.rarity || 'common']}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${badge.color || '#8B5CF6'}20` }}
                >
                  {badge.icon_url ? (
                    <img src={badge.icon_url} alt={badge.name} className="w-5 h-5" />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: badge.color || '#8B5CF6' }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{badge.name}</h4>
                  <p className="text-xs text-muted-foreground capitalize">{badge.rarity || 'common'}</p>
                </div>

                <UserPlus className="w-4 h-4 text-primary" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Assign "{selectedBadge?.name}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all
                      ${selectedUser?.id === user.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-secondary/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
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
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !isSearching && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found for "{searchQuery}"
              </p>
            )}

            {/* Selected User Display */}
            {selectedUser && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-500">
                  Selected: <strong>{selectedUser.display_name || selectedUser.username}</strong> (@{selectedUser.username})
                </p>
              </div>
            )}

            {/* Apply Button */}
            <Button
              onClick={handleApply}
              disabled={!selectedUser || assignBadge.isPending}
              className="w-full"
            >
              {assignBadge.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Assign Badge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

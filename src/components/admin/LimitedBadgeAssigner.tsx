import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Loader2, Search, UserPlus } from 'lucide-react';
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

export function LimitedBadgeAssigner() {
  const { data: badges = [], isLoading } = useGlobalBadges();
  const assignBadge = useAssignBadge();
  const { toast } = useToast();

  const [selectedBadge, setSelectedBadge] = useState<GlobalBadge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Filter only limited badges (excluding EARLY which has its own claiming mechanism)
  const limitedBadges = badges.filter(b => b.is_limited && b.name.toLowerCase() !== 'early');

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
        .select('id, user_id, username, display_name, avatar_url')
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

  if (limitedBadges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Crown className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No limited badges available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Crown className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Limited Badges</h3>
          <p className="text-xs text-muted-foreground">Assign rare badges</p>
        </div>
      </div>

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {limitedBadges.map((badge) => {
          const Icon = getBadgeIcon(badge.name);

          return (
            <div
              key={badge.id}
              onClick={() => handleBadgeClick(badge)}
              className="flex items-center justify-between p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${badge.color || '#8B5CF6'}20` }}
                >
                  {badge.icon_url ? (
                    <img src={badge.icon_url} alt={badge.name} className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: badge.color || '#8B5CF6' }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs truncate">{badge.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {badge.claims_count || 0}/{badge.max_claims || '∞'}
                  </p>
                </div>
              </div>
              <UserPlus className="w-3 h-3 text-amber-500 flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Assign "{selectedBadge?.name}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Input - Live Search */}
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
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
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
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500"
            >
              {assignBadge.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

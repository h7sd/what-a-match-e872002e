import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Loader2, Search, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRemoveBadge } from '@/hooks/useBadges';
import { supabase } from '@/integrations/supabase/client';

interface UserWithBadges {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  badges: {
    id: string;
    badge_id: string;
    badge: {
      id: string;
      name: string;
      color: string | null;
      icon_url: string | null;
    };
  }[];
}

export function AdminBadgeRemover() {
  const removeBadge = useRemoveBadge();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserWithBadges[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithBadges | null>(null);

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
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (profileError) throw profileError;

      // Get badges for each user
      const usersWithBadges: UserWithBadges[] = [];
      for (const profile of profiles || []) {
        const { data: userBadges, error: badgesError } = await supabase
          .from('user_badges')
          .select(`
            id,
            badge_id,
            badge:global_badges(id, name, color, icon_url)
          `)
          .eq('user_id', profile.user_id);

        if (!badgesError && userBadges) {
          usersWithBadges.push({
            ...profile,
            badges: userBadges as any,
          });
        }
      }

      setSearchResults(usersWithBadges);
    } catch (error: any) {
      toast({ title: error.message || 'Error searching users', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveBadge = async (userId: string, badgeId: string, badgeName: string) => {
    try {
      await removeBadge.mutateAsync({ userId, badgeId });
      toast({ title: `Badge "${badgeName}" removed!` });
      
      // Refresh the selected user's badges
      if (selectedUser) {
        const updatedBadges = selectedUser.badges.filter(b => b.badge_id !== badgeId);
        setSelectedUser({ ...selectedUser, badges: updatedBadges });
      }
    } catch (error: any) {
      toast({ title: error.message || 'Error removing badge', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
          <UserMinus className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Badge Remover</h3>
          <p className="text-xs text-muted-foreground">Remove user badges</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="w-full border-destructive/30 hover:bg-destructive/10 text-xs h-8"
      >
        <Trash2 className="w-3 h-3 mr-1.5 text-destructive" />
        Manage Badges
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-500" />
              Remove User Badges
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
            {searchResults.length > 0 && !selectedUser && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="p-3 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-all"
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
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.display_name || user.username}</p>
                        <p className="text-xs text-muted-foreground">@{user.username} · {user.badges.length} badges</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected User - Badge List */}
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    {selectedUser.avatar_url ? (
                      <img 
                        src={selectedUser.avatar_url} 
                        alt={selectedUser.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {selectedUser.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedUser.display_name || selectedUser.username}</p>
                      <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                  >
                    Change
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">User Badges ({selectedUser.badges.length})</p>
                  
                  {selectedUser.badges.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      This user has no badges
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {selectedUser.badges.map((ub) => (
                        <motion.div
                          key={ub.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center"
                              style={{ backgroundColor: `${ub.badge.color || '#8B5CF6'}20` }}
                            >
                              {ub.badge.icon_url ? (
                                <img src={ub.badge.icon_url} alt={ub.badge.name} className="w-4 h-4" />
                              ) : (
                                <span className="text-xs" style={{ color: ub.badge.color || '#8B5CF6' }}>
                                  ★
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-medium">{ub.badge.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBadge(selectedUser.user_id, ub.badge_id, ub.badge.name)}
                            disabled={removeBadge.isPending}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            {removeBadge.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {searchResults.length === 0 && searchQuery.length >= 1 && !isSearching && !selectedUser && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found for "{searchQuery}"
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Search, Loader2, X, User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  uid_number: number;
  is_premium: boolean | null;
}

export function AdminPremiumManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch premium users
  const { data: premiumUsers = [], isLoading } = useQuery({
    queryKey: ['adminPremiumUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, uid_number, is_premium')
        .eq('is_premium', true)
        .order('premium_purchased_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Live search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Search by username or UID
      const uidNumber = parseInt(searchQuery, 10);
      let query = supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, uid_number, is_premium')
        .limit(8);

      if (!isNaN(uidNumber)) {
        query = query.eq('uid_number', uidNumber);
      } else {
        query = query.ilike('username', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast({ title: 'Search failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const togglePremium = useMutation({
    mutationFn: async ({ userId, isPremium }: { userId: string; isPremium: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_premium: isPremium,
          premium_purchased_at: isPremium ? new Date().toISOString() : null 
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { isPremium }) => {
      queryClient.invalidateQueries({ queryKey: ['adminPremiumUsers'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast({ 
        title: isPremium ? '👑 Premium Activated!' : 'Premium Removed',
        description: isPremium 
          ? 'User now has access to all premium features.' 
          : 'Premium status has been revoked.'
      });
      setSearchQuery('');
      setSearchResults([]);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
          <Crown className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Premium Manager</h3>
          <p className="text-xs text-muted-foreground">Give or remove premium</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Username or UID..."
          className="pl-9 h-9 text-sm"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback className="text-xs">
                    <User className="w-3 h-3" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs truncate">{user.display_name || user.username}</span>
                    {user.is_premium && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">@{user.username}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant={user.is_premium ? "outline" : "default"}
                onClick={() => togglePremium.mutate({ userId: user.user_id, isPremium: !user.is_premium })}
                disabled={togglePremium.isPending}
                className={cn(
                  "h-7 text-xs px-2",
                  !user.is_premium && "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                )}
              >
                {togglePremium.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : user.is_premium ? (
                  <><X className="w-3 h-3 mr-1" />Remove</>
                ) : (
                  <><Crown className="w-3 h-3 mr-1" />Give</>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Current Premium Users */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Active Premium ({premiumUsers.length})
          </span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : premiumUsers.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-xs">
            No premium users yet
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
            {premiumUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="font-medium text-xs truncate block">{user.display_name || user.username}</span>
                    <span className="text-[10px] text-muted-foreground">UID #{user.uid_number}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => togglePremium.mutate({ userId: user.user_id, isPremium: false })}
                  disabled={togglePremium.isPending}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

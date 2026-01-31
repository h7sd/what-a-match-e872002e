import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Search, Loader2, Check, X, User } from 'lucide-react';
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, uid_number, is_premium')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

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
      toast({ 
        title: isPremium ? '👑 Premium aktiviert!' : 'Premium entfernt',
        description: isPremium 
          ? 'Der Benutzer hat jetzt Premium-Zugang.' 
          : 'Premium-Status wurde entfernt.'
      });
      setSearchQuery('');
      setSearchResults([]);
    },
    onError: (error: any) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const UserCard = ({ user, showToggle = true }: { user: UserProfile; showToggle?: boolean }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || ''} />
          <AvatarFallback>
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{user.display_name || user.username}</span>
            {user.is_premium && (
              <Crown className="w-3.5 h-3.5 text-amber-500" />
            )}
          </div>
          <span className="text-xs text-muted-foreground">@{user.username} • UID #{user.uid_number}</span>
        </div>
      </div>
      {showToggle && (
        <Button
          size="sm"
          variant={user.is_premium ? "destructive" : "default"}
          onClick={() => togglePremium.mutate({ userId: user.user_id, isPremium: !user.is_premium })}
          disabled={togglePremium.isPending}
          className={cn(
            "gap-1.5",
            !user.is_premium && "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          )}
        >
          {togglePremium.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : user.is_premium ? (
            <>
              <X className="w-3.5 h-3.5" />
              Entfernen
            </>
          ) : (
            <>
              <Crown className="w-3.5 h-3.5" />
              Premium geben
            </>
          )}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold">Premium Manager</h3>
          <p className="text-sm text-muted-foreground">
            Premium-Status für Benutzer verwalten
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label>Benutzer suchen</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Username eingeben..."
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Suchergebnisse</Label>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {searchResults.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </div>
      )}

      {/* Current Premium Users */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          Premium Benutzer ({premiumUsers.length})
        </Label>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : premiumUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Noch keine Premium-Benutzer
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {premiumUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

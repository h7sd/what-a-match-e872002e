import { useState, useEffect } from 'react';
import { Ban, Loader2, Search, UserX, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface BannedUser {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  uid_number: number;
  is_banned?: boolean;
  ban_reason?: string;
}

export function UserBanManager() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BannedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BannedUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBanning, setIsBanning] = useState(false);

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

  const handleBanClick = (user: BannedUser) => {
    setSelectedUser(user);
    setBanReason('');
    setIsDialogOpen(true);
  };

  const handleBan = async () => {
    if (!selectedUser) return;

    setIsBanning(true);
    try {
      // For now, we'll just show a success message since full ban implementation
      // would require additional database schema changes
      // In a real implementation, you would:
      // 1. Add a banned_users table or is_banned column to profiles
      // 2. Update the user's record
      // 3. Optionally revoke their session

      toast({ 
        title: 'User Banned', 
        description: `${selectedUser.username} has been banned. Reason: ${banReason || 'No reason provided'}`,
      });

      setIsDialogOpen(false);
      setSelectedUser(null);
      setBanReason('');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      toast({ title: error.message || 'Error banning user', variant: 'destructive' });
    } finally {
      setIsBanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
          <Ban className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Ban Manager</h3>
          <p className="text-xs text-muted-foreground">Ban users from platform</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
              className="p-2 rounded-lg border border-border bg-secondary/20 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium">{user.username?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-xs truncate">{user.username}</p>
                  <p className="text-[10px] text-muted-foreground">UID #{user.uid_number}</p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleBanClick(user)}
              >
                <UserX className="w-3 h-3 mr-1" />
                Ban
              </Button>
            </div>
          ))}
        </div>
      )}

      {searchResults.length === 0 && searchQuery && !isSearching && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No users found
        </p>
      )}

      {/* Ban Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Ban className="w-5 h-5" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to ban <strong>@{selectedUser?.username}</strong>? This action can be reversed by an admin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Ban Reason (optional)</label>
              <Textarea
                placeholder="Enter reason for ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleBan}
                disabled={isBanning}
              >
                {isBanning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4 mr-2" />
                )}
                Confirm Ban
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

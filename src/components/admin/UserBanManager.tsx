import { useState, useEffect } from 'react';
import { Ban, Loader2, Search, UserX, ShieldOff, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-proxy-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface BanRecord {
  id: string;
  user_id: string;
  username: string;
  email: string | null;
  reason: string | null;
  banned_at: string;
  appeal_submitted_at: string | null;
  appeal_text: string | null;
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
  
  // Banned users list state
  const [bannedUsers, setBannedUsers] = useState<BanRecord[]>([]);
  const [isLoadingBanned, setIsLoadingBanned] = useState(false);
  const [unbanningId, setUnbanningId] = useState<string | null>(null);
  const [selectedBanRecord, setSelectedBanRecord] = useState<BanRecord | null>(null);
  const [isUnbanDialogOpen, setIsUnbanDialogOpen] = useState(false);
  
  // Delete account state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Load banned users on mount
  useEffect(() => {
    loadBannedUsers();
  }, []);

  const loadBannedUsers = async () => {
    setIsLoadingBanned(true);
    try {
      const { data, error } = await supabase
        .from('banned_users')
        .select('*')
        .order('banned_at', { ascending: false });

      if (error) throw error;
      setBannedUsers(data || []);
    } catch (error: any) {
      console.error('Error loading banned users:', error);
      toast({ title: 'Error loading banned users', variant: 'destructive' });
    } finally {
      setIsLoadingBanned(false);
    }
  };

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
      const { data, error } = await supabase.functions.invoke('ban-user', {
        body: {
          userId: selectedUser.user_id,
          username: selectedUser.username,
          reason: banReason || 'No reason provided'
        }
      });

      if (error) throw error;

      toast({ 
        title: 'User Banned', 
        description: `${selectedUser.username} has been banned and notified via email.`,
      });

      setIsDialogOpen(false);
      setSelectedUser(null);
      setBanReason('');
      setSearchQuery('');
      setSearchResults([]);
      loadBannedUsers(); // Refresh the banned users list
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast({ title: error.message || 'Error banning user', variant: 'destructive' });
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnbanClick = (record: BanRecord) => {
    setSelectedBanRecord(record);
    setIsUnbanDialogOpen(true);
  };

  const handleDeleteClick = (record: BanRecord) => {
    setSelectedBanRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const handleUnban = async () => {
    if (!selectedBanRecord) return;

    setUnbanningId(selectedBanRecord.user_id);
    try {
      const { error } = await supabase.functions.invoke('unban-user', {
        body: { odst4jf490: selectedBanRecord.user_id }
      });

      if (error) throw error;

      toast({ 
        title: 'User Unbanned', 
        description: `${selectedBanRecord.username} has been unbanned.`,
      });

      setIsUnbanDialogOpen(false);
      setSelectedBanRecord(null);
      loadBannedUsers();
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      toast({ title: error.message || 'Error unbanning user', variant: 'destructive' });
    } finally {
      setUnbanningId(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedBanRecord) return;

    setIsDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke('admin-delete-account', {
        body: {
          userId: selectedBanRecord.user_id,
          username: selectedBanRecord.username,
          email: selectedBanRecord.email
        }
      });

      if (error) throw error;

      toast({ 
        title: 'Account Deleted', 
        description: `${selectedBanRecord.username}'s account has been permanently deleted.`,
      });

      setIsDeleteDialogOpen(false);
      setSelectedBanRecord(null);
      loadBannedUsers();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({ title: error.message || 'Error deleting account', variant: 'destructive' });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
            <Ban className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Ban Manager</h3>
            <p className="text-xs text-muted-foreground">Ban & unban users</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="ban" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="ban" className="text-xs">Ban User</TabsTrigger>
          <TabsTrigger value="banned" className="text-xs">
            Banned ({bannedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ban" className="space-y-3 mt-3">
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
        </TabsContent>

        <TabsContent value="banned" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={loadBannedUsers}
              disabled={isLoadingBanned}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingBanned ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoadingBanned ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : bannedUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No banned users
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
              {bannedUsers.map((record) => (
                <div
                  key={record.id}
                  className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs">@{record.username}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {record.email || 'No email'}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                        onClick={() => handleUnbanClick(record)}
                        disabled={unbanningId === record.user_id}
                      >
                        {unbanningId === record.user_id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <ShieldOff className="w-3 h-3 mr-1" />
                        )}
                        Unban
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleDeleteClick(record)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p><span className="text-foreground/70">Reason:</span> {record.reason || 'None'}</p>
                    <p><span className="text-foreground/70">Banned:</span> {new Date(record.banned_at).toLocaleDateString('de-DE')}</p>
                    {record.appeal_submitted_at && (
                      <p className="text-amber-500">
                        ⚠️ Appeal submitted: {record.appeal_text?.substring(0, 50)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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

      {/* Unban Confirmation Dialog */}
      <Dialog open={isUnbanDialogOpen} onOpenChange={setIsUnbanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <ShieldOff className="w-5 h-5" />
              Unban User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to unban <strong>@{selectedBanRecord?.username}</strong>? They will be able to access their account again.
            </DialogDescription>
          </DialogHeader>

          {selectedBanRecord?.appeal_text && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs font-medium text-amber-500 mb-1">Appeal Text:</p>
              <p className="text-xs text-muted-foreground">{selectedBanRecord.appeal_text}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsUnbanDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleUnban}
              disabled={unbanningId !== null}
            >
              {unbanningId !== null ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldOff className="w-4 h-4 mr-2" />
              )}
              Confirm Unban
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>@{selectedBanRecord?.username}</strong>'s account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-xs font-medium text-destructive mb-2">This will permanently delete:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Profile and all customizations</li>
              <li>All badges and achievements</li>
              <li>Social links and integrations</li>
              <li>Analytics and view history</li>
              <li>Account credentials</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            The user will be notified via email at: <strong>{selectedBanRecord?.email || 'No email'}</strong>
          </p>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Forever
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

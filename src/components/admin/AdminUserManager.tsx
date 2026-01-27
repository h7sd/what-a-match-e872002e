import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Shield, Loader2, UserPlus, Search, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

type AppRole = 'admin' | 'moderator' | 'user';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    uid_number: number;
  };
}

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  uid_number: number;
}

export function AdminUserManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uidSearch, setUidSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('admin');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'username' | 'uid'>('username');

  // Fetch all user roles with profile info
  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['adminUserRoles'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, uid_number')
        .in('user_id', userIds);

      return roles.map(role => ({
        ...role,
        profile: profiles?.find(p => p.user_id === role.user_id),
      })) as UserRole[];
    },
  });

  // Live search with debounce
  useEffect(() => {
    const query = searchMode === 'username' ? searchQuery : uidSearch;
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, uidSearch, searchMode]);

  const handleSearch = async () => {
    const query = searchMode === 'username' ? searchQuery : uidSearch;
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      let queryBuilder = supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, uid_number');

      if (searchMode === 'uid') {
        const uid = parseInt(query);
        if (!isNaN(uid)) {
          queryBuilder = queryBuilder.eq('uid_number', uid);
        }
      } else {
        queryBuilder = queryBuilder.ilike('username', `%${query}%`);
      }

      const { data, error } = await queryBuilder.limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast({ title: 'Search failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  // Add role to user
  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUserRoles'] });
      toast({ title: 'Role added successfully!' });
      setIsDialogOpen(false);
      setSearchQuery('');
      setUidSearch('');
      setSearchResults([]);
    },
    onError: (error: any) => {
      if (error.message.includes('duplicate')) {
        toast({ title: 'User already has this role', variant: 'destructive' });
      } else {
        toast({ title: error.message, variant: 'destructive' });
      }
    },
  });

  // Remove role from user
  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUserRoles'] });
      toast({ title: 'Role removed' });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'moderator':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">User Role Management</h3>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'username' | 'uid')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="username">By Username</TabsTrigger>
                  <TabsTrigger value="uid">By User ID</TabsTrigger>
                </TabsList>
                
                <TabsContent value="username" className="space-y-2">
                  <Label>Search User by Username</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter username..."
                      className="pl-10"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="uid" className="space-y-2">
                  <Label>Search User by UID</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={uidSearch}
                      onChange={(e) => setUidSearch(e.target.value)}
                      placeholder="Enter User ID (e.g. 1)"
                      className="pl-10"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <div className="max-h-48 overflow-auto space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  {user.username[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="absolute -bottom-1 -right-1 text-[9px] bg-primary px-1 rounded text-white">
                              #{user.uid_number}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.display_name || user.username}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addRole.mutate({ userId: user.user_id, role: selectedRole })}
                          disabled={addRole.isPending}
                        >
                          {addRole.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.length === 0 && (searchQuery || uidSearch) && !isSearching && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {userRoles.map((userRole) => (
          <motion.div
            key={userRole.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 flex items-center gap-4"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden">
                {userRole.profile?.avatar_url ? (
                  <img
                    src={userRole.profile.avatar_url}
                    alt={userRole.profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg">
                    {userRole.profile?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              {userRole.profile?.uid_number && (
                <span className="absolute -bottom-1 -right-1 text-[9px] bg-primary px-1 rounded text-white">
                  #{userRole.profile.uid_number}
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">
                  {userRole.profile?.display_name || userRole.profile?.username || 'Unknown User'}
                </h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border capitalize ${getRoleBadgeColor(userRole.role)}`}
                >
                  {userRole.role}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                @{userRole.profile?.username || 'unknown'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Added: {new Date(userRole.created_at).toLocaleDateString()}
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={removeRole.isPending}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Role?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove the {userRole.role} role from{' '}
                    {userRole.profile?.username || 'this user'}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => removeRole.mutate(userRole.id)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        ))}

        {userRoles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No user roles configured yet.</p>
            <p className="text-sm">Add your first admin or moderator!</p>
          </div>
        )}
      </div>
    </div>
  );
}

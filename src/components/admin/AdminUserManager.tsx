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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Role Manager</h3>
            <p className="text-xs text-muted-foreground">Manage staff roles</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <UserPlus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'username' | 'uid')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="username">Username</TabsTrigger>
                  <TabsTrigger value="uid">UID</TabsTrigger>
                </TabsList>
                
                <TabsContent value="username" className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Username..."
                      className="pl-10"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="uid" className="space-y-2">
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={uidSearch}
                      onChange={(e) => setUidSearch(e.target.value)}
                      placeholder="UID..."
                      className="pl-10"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>

              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-auto space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              {user.username[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.username}</p>
                          <p className="text-xs text-muted-foreground">#{user.uid_number}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="h-7"
                        onClick={() => addRole.mutate({ userId: user.user_id, role: selectedRole })}
                        disabled={addRole.isPending}
                      >
                        {addRole.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {userRoles.map((userRole) => (
          <div
            key={userRole.id}
            className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                {userRole.profile?.avatar_url ? (
                  <img src={userRole.profile.avatar_url} alt={userRole.profile.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    {userRole.profile?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-xs truncate">{userRole.profile?.username || 'Unknown'}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border capitalize ${getRoleBadgeColor(userRole.role)}`}>
                  {userRole.role}
                </span>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={removeRole.isPending}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Role?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove {userRole.role} from {userRole.profile?.username}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removeRole.mutate(userRole.id)} className="bg-destructive hover:bg-destructive/90">
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}

        {userRoles.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-xs">
            No staff roles configured
          </div>
        )}
      </div>
    </div>
  );
}

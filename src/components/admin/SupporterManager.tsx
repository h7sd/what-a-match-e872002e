import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-proxy-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { HeadphonesIcon, UserPlus, Trash2, Loader2, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface SupporterUser {
  user_id: string;
  username: string;
  display_name: string | null;
  created_at: string;
}

export function SupporterManager() {
  const [searchUsername, setSearchUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all supporters
  const { data: supporters = [], isLoading } = useQuery({
    queryKey: ['supporters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, created_at')
        .eq('role', 'supporter');

      if (error) throw error;

      // Get profile info for each supporter
      const userIds = data.map(r => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      return data.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          user_id: role.user_id,
          username: profile?.username || 'Unknown',
          display_name: profile?.display_name,
          created_at: role.created_at,
        } as SupporterUser;
      });
    },
  });

  // Add supporter mutation
  const addSupporter = useMutation({
    mutationFn: async (username: string) => {
      // Find user by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username')
        .ilike('username', username)
        .single();

      if (profileError || !profile) {
        throw new Error('User not found');
      }

      // Check if already supporter
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('role', 'supporter')
        .single();

      if (existing) {
        throw new Error('User is already a supporter');
      }

      // Add supporter role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.user_id, role: 'supporter' });

      if (error) throw error;
      return profile;
    },
    onSuccess: (profile) => {
      toast({
        title: 'Supporter added',
        description: `${profile.username} is now a supporter.`,
      });
      setSearchUsername('');
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove supporter mutation
  const removeSupporter = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'supporter');

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Supporter removed',
        description: 'User is no longer a supporter.',
      });
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddSupporter = async () => {
    if (!searchUsername.trim()) return;
    setIsAdding(true);
    await addSupporter.mutateAsync(searchUsername.trim());
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <HeadphonesIcon className="w-5 h-5 text-emerald-400" />
        <h3 className="font-semibold">Supporter Management</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Add or remove supporters who can access the Supporter Panel to handle tickets and live chat.
      </p>

      {/* Add Supporter */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="supporter-username" className="sr-only">
            Username
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="supporter-username"
              placeholder="Enter username..."
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSupporter()}
              className="pl-9"
            />
          </div>
        </div>
        <Button
          onClick={handleAddSupporter}
          disabled={!searchUsername.trim() || isAdding}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </>
          )}
        </Button>
      </div>

      {/* Supporters List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : supporters.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No supporters added yet
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Username</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supporters.map((supporter) => (
                <TableRow key={supporter.user_id}>
                  <TableCell className="font-medium">@{supporter.username}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {supporter.display_name || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(supporter.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Supporter</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove @{supporter.username} as a supporter?
                            They will lose access to the Supporter Panel.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeSupporter.mutate(supporter.user_id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

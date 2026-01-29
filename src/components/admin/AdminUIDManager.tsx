import { useState } from 'react';
import { motion } from 'framer-motion';
import { Hash, Search, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FoundUser {
  id: string;
  username: string;
  uid_number: number;
  display_name: string | null;
}

export function AdminUIDManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [newUID, setNewUID] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter a username or UID');
      return;
    }

    setIsSearching(true);
    setFoundUser(null);

    try {
      // Search by username or UID number
      let query = supabase
        .from('profiles')
        .select('id, username, uid_number, display_name');

      if (/^\d+$/.test(searchQuery)) {
        query = query.eq('uid_number', parseInt(searchQuery));
      } else {
        query = query.ilike('username', searchQuery);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      if (data) {
        setFoundUser(data);
        setNewUID(data.uid_number.toString());
      } else {
        toast.error('User not found');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Failed to search');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateUID = async () => {
    if (!foundUser) return;
    
    const uidNumber = parseInt(newUID);
    if (isNaN(uidNumber) || uidNumber < 1) {
      toast.error('Enter a valid UID number (positive integer)');
      return;
    }

    if (uidNumber === foundUser.uid_number) {
      toast.info('UID is already this value');
      return;
    }

    setIsUpdating(true);

    try {
      // Check if UID is already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('uid_number', uidNumber)
        .neq('id', foundUser.id)
        .maybeSingle();

      if (existing) {
        toast.error(`UID ${uidNumber} is already assigned to @${existing.username}`);
        setIsUpdating(false);
        return;
      }

      // Use edge function to bypass RLS trigger restriction
      const { error } = await supabase.functions.invoke('admin-update-profile', {
        body: {
          profileId: foundUser.id,
          updates: { uid_number: uidNumber },
        },
      });

      if (error) throw error;

      toast.success(`UID updated to ${uidNumber}`);
      setFoundUser({ ...foundUser, uid_number: uidNumber });
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error('Failed to update UID', { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Hash className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">UID Manager</h3>
          <p className="text-sm text-muted-foreground">Assign custom UID numbers to users</p>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-3">
        <Label>Search User</Label>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Username or UID number"
            className="bg-white/5 border-white/10"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Found User */}
      {foundUser && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">@{foundUser.username}</p>
              {foundUser.display_name && (
                <p className="text-sm text-muted-foreground">{foundUser.display_name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current UID</p>
              <p className="text-lg font-mono text-primary">#{foundUser.uid_number}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>New UID Number</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                <Input
                  type="number"
                  value={newUID}
                  onChange={(e) => setNewUID(e.target.value)}
                  className="bg-white/5 border-white/10 pl-7 font-mono"
                  min={1}
                />
              </div>
              <Button onClick={handleUpdateUID} disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Update
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-400">
              Changing a user's UID affects their profile display. Make sure the new UID isn't already in use.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

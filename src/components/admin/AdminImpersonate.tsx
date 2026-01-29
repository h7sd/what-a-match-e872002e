import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCog, Loader2, LogIn, AlertTriangle, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface UserResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function AdminImpersonate() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);

  const handleSearch = async () => {
    if (!username.trim()) return;
    
    setIsSearching(true);
    setSelectedUser(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${username}%,display_name.ilike.%${username}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults((data || []) as UserResult[]);
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleImpersonate = async () => {
    if (!selectedUser) return;
    
    setIsLoggingIn(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-impersonate', {
        body: { username: selectedUser.username }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Verify OTP to complete login
      if (data.token_hash && data.email) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.token_hash,
          type: 'magiclink'
        });

        if (verifyError) {
          console.error('OTP verify error:', verifyError);
          throw new Error('Failed to complete login');
        }

        toast({ 
          title: 'Logged in successfully',
          description: `You are now logged in as @${selectedUser.username}`
        });

        // Reload page to reflect new session
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('Impersonate error:', error);
      toast({ 
        title: 'Impersonation failed', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSelectUser = (user: UserResult) => {
    setSelectedUser(user);
    setSearchResults([]);
    setUsername(user.username);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
          <UserCog className="w-4 h-4" />
          Test Login
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-amber-500" />
            Admin Test Login
          </DialogTitle>
          <DialogDescription>
            Login as any user to test their account. Only for testing purposes.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-500">Security Warning</AlertTitle>
          <AlertDescription className="text-amber-500/80">
            This will log you out and sign you in as the selected user. 
            Make sure you can log back into your admin account.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 mt-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter username..."
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setSelectedUser(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !username.trim()}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.display_name || user.username}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border rounded-lg bg-primary/5 border-primary/30"
            >
              <div className="flex items-center gap-3">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{selectedUser.display_name || selectedUser.username}</p>
                  <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Login Button */}
          <Button
            onClick={handleImpersonate}
            disabled={!selectedUser || isLoggingIn}
            className="w-full gap-2"
            variant="default"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Login as {selectedUser?.username || 'user'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
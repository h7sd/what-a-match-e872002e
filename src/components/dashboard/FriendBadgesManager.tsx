import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, Trash2, User, Loader2, Search, X, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

interface FriendBadge {
  id: string;
  creator_id: string;
  recipient_id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  color: string;
  is_enabled: boolean;
  created_at: string;
  recipient_username?: string;
}

export function FriendBadgesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; username: string; avatar_url?: string | null } | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ user_id: string; username: string; avatar_url: string | null }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newBadge, setNewBadge] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
  });

  // Fetch created badges
  const { data: createdBadges = [], isLoading: creatingLoading } = useQuery({
    queryKey: ['friendBadges', 'created', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('friend_badges')
        .select('*')
        .eq('creator_id', user.id);
      if (error) throw error;
      
      // Get recipient usernames
      const recipientIds = data.map(b => b.recipient_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', recipientIds);
      
      return data.map(badge => ({
        ...badge,
        recipient_username: profiles?.find(p => p.user_id === badge.recipient_id)?.username || 'Unknown',
      })) as FriendBadge[];
    },
    enabled: !!user?.id,
  });

  // Fetch received badges
  const { data: receivedBadges = [], isLoading: receivingLoading } = useQuery({
    queryKey: ['friendBadges', 'received', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('friend_badges')
        .select('*')
        .eq('recipient_id', user.id);
      if (error) throw error;
      return data as FriendBadge[];
    },
    enabled: !!user?.id,
  });

  // Live search for users
  const handleSearch = async (query: string) => {
    setSearchUsername(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Search by username, alias, or UID
      const isNumeric = /^\d+$/.test(query.trim());
      
      let data;
      if (isNumeric) {
        // Search by UID
        const { data: uidData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, uid_number')
          .eq('uid_number', parseInt(query.trim()))
          .limit(10);
        data = uidData;
      } else {
        // Search by username or alias (partial match)
        const { data: usernameData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, alias_username')
          .or(`username.ilike.%${query.trim()}%,alias_username.ilike.%${query.trim()}%`)
          .limit(10);
        data = usernameData;
      }
      
      // Filter out self
      const filtered = (data || []).filter(p => p.user_id !== user?.id);
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectRecipient = (profile: { user_id: string; username: string; avatar_url: string | null }) => {
    setSelectedRecipient({ id: profile.user_id, username: profile.username, avatar_url: profile.avatar_url });
    setSearchUsername('');
    setSearchResults([]);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    
    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: 'Image must be less than 100MB', variant: 'destructive' });
      return;
    }
    
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  // Upload file to storage
  const uploadIcon = async (): Promise<string | null> => {
    if (!iconFile || !user?.id) return null;
    
    const fileExt = iconFile.name.split('.').pop();
    const fileName = `${user.id}/friend-badges/${crypto.randomUUID()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('profile-assets')
      .upload(fileName, iconFile, { contentType: iconFile.type });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('profile-assets')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  // Create badge mutation - creates badge for both recipient AND creator
  const createBadge = useMutation({
    mutationFn: async () => {
      if (!selectedRecipient || !newBadge.name.trim()) {
        throw new Error('Please select a recipient and enter a badge name');
      }
      
      setIsUploading(true);
      
      // Upload icon if selected
      let iconUrl: string | null = null;
      if (iconFile) {
        iconUrl = await uploadIcon();
      }
      
      const badgeData = {
        name: newBadge.name.trim(),
        description: newBadge.description.trim() || null,
        color: newBadge.color,
        icon_url: iconUrl,
      };
      
      // Insert badge for recipient
      const { error: recipientError } = await supabase
        .from('friend_badges')
        .insert({
          creator_id: user!.id,
          recipient_id: selectedRecipient.id,
          ...badgeData,
        });
      
      if (recipientError) throw recipientError;
      
      // Insert badge for creator (themselves)
      const { error: creatorError } = await supabase
        .from('friend_badges')
        .insert({
          creator_id: user!.id,
          recipient_id: user!.id,
          ...badgeData,
        });
      
      if (creatorError) throw creatorError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendBadges'] });
      toast({ title: 'Badge created! Both you and your friend received it.' });
      setIsCreateOpen(false);
      setSelectedRecipient(null);
      setSearchUsername('');
      setNewBadge({ name: '', description: '', color: '#8B5CF6' });
      setIconFile(null);
      setIconPreview(null);
      setIsUploading(false);
    },
    onError: (error: any) => {
      setIsUploading(false);
      toast({ title: error.message || 'Failed to create badge', variant: 'destructive' });
    },
  });

  // Delete badge mutation
  const deleteBadge = useMutation({
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase
        .from('friend_badges')
        .delete()
        .eq('id', badgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendBadges'] });
      toast({ title: 'Badge removed' });
    },
  });

  // Toggle visibility mutation
  const toggleVisibility = useMutation({
    mutationFn: async ({ badgeId, enabled }: { badgeId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('friend_badges')
        .update({ is_enabled: enabled })
        .eq('id', badgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendBadges'] });
    },
  });

  const remainingBadges = 5 - createdBadges.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Friend Badges
          </h3>
          <p className="text-sm text-muted-foreground">
            Create custom badges for your friends ({remainingBadges}/5 remaining)
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={remainingBadges === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Create Badge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Friend Badge</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* User Search */}
              <div className="space-y-2">
                <Label>Recipient (Username, Alias, or UID)</Label>
                
                {selectedRecipient ? (
                  <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/30">
                    {selectedRecipient.avatar_url ? (
                      <img src={selectedRecipient.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-sm font-medium">@{selectedRecipient.username}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 ml-auto"
                      onClick={() => setSelectedRecipient(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Input
                        value={searchUsername}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search by username, alias, or UID..."
                        className="pr-8"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                        {searchResults.map((profile) => (
                          <button
                            key={profile.user_id}
                            type="button"
                            className="w-full flex items-center gap-2 p-2 hover:bg-accent text-left transition-colors"
                            onClick={() => selectRecipient(profile)}
                          >
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-sm">@{profile.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {searchUsername.length >= 2 && !isSearching && searchResults.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 text-center">
                        <p className="text-sm text-muted-foreground">No users found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Badge Name */}
              <div className="space-y-2">
                <Label>Badge Name</Label>
                <Input
                  value={newBadge.name}
                  onChange={(e) => setNewBadge(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Custom Badge"
                  maxLength={32}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={newBadge.description}
                  onChange={(e) => setNewBadge(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A special badge for my friend"
                  maxLength={100}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label>Badge Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={newBadge.color}
                    onChange={(e) => setNewBadge(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={newBadge.color}
                    onChange={(e) => setNewBadge(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Icon Upload */}
              <div className="space-y-2">
                <Label>Badge Icon (optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {iconPreview ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                    <img 
                      src={iconPreview} 
                      alt="Badge preview" 
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <span className="text-sm text-muted-foreground flex-1 truncate">
                      {iconFile?.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setIconFile(null);
                        setIconPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Icon
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">Max 100MB, PNG/JPG/GIF</p>
              </div>

              <Button 
                className="w-full" 
                onClick={() => createBadge.mutate()}
                disabled={!selectedRecipient || !newBadge.name.trim() || createBadge.isPending || isUploading}
              >
                {(createBadge.isPending || isUploading) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Badge
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Created Badges */}
      <div>
        <h4 className="text-sm font-medium mb-3">Badges You've Created</h4>
        {creatingLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : createdBadges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            You haven't created any badges yet
          </p>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {createdBadges.map((badge) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${badge.color}20` }}
                  >
                    {badge.icon_url ? (
                      <img src={badge.icon_url} alt={badge.name} className="w-6 h-6" />
                    ) : (
                      <Gift className="w-5 h-5" style={{ color: badge.color }} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Given to @{badge.recipient_username}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteBadge.mutate(badge.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Received Badges */}
      <div>
        <h4 className="text-sm font-medium mb-3">Badges You've Received</h4>
        {receivingLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : receivedBadges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No badges received from friends yet
          </p>
        ) : (
          <div className="grid gap-3">
            {receivedBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${badge.color}20` }}
                >
                  {badge.icon_url ? (
                    <img src={badge.icon_url} alt={badge.name} className="w-6 h-6" />
                  ) : (
                    <Gift className="w-5 h-5" style={{ color: badge.color }} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {badge.description || 'From a friend'}
                  </p>
                </div>

                <Switch
                  checked={badge.is_enabled}
                  onCheckedChange={(checked) => toggleVisibility.mutate({ badgeId: badge.id, enabled: checked })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  User, 
  Loader2, 
  X, 
  Shield, 
  Award, 
  Eye, 
  EyeOff,
  Music,
  Image,
  Palette,
  Settings,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getBadgeIcon } from '@/lib/badges';
import { Link } from 'react-router-dom';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  uid_number: number;
  bio: string | null;
  background_url: string | null;
  background_video_url: string | null;
  music_url: string | null;
  discord_user_id: string | null;
  effects_config: any;
  show_username: boolean;
  show_display_name: boolean;
  show_badges: boolean;
  show_views: boolean;
  show_avatar: boolean;
  show_links: boolean;
  show_description: boolean;
  start_screen_enabled: boolean;
  email_verified: boolean;
  views_count: number;
  created_at: string;
}

interface UserBadgeWithGlobal {
  id: string;
  badge_id: string;
  is_enabled: boolean;
  claimed_at: string;
  badge: {
    id: string;
    name: string;
    color: string | null;
    icon_url: string | null;
    rarity: string | null;
    is_limited: boolean | null;
  };
}

interface UserRole {
  id: string;
  role: string;
  created_at: string;
}

export function AdminAccountLookup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadgeWithGlobal[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [updatingBadgeId, setUpdatingBadgeId] = useState<string | null>(null);

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
      // Search by username, display_name, or UID number
      let query = supabase
        .from('profiles')
        .select('*')
        .limit(10);

      // Check if it's a UID number search
      const uidNumber = parseInt(searchQuery, 10);
      if (!isNaN(uidNumber)) {
        query = query.eq('uid_number', uidNumber);
      } else {
        query = query.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSearchResults((data || []) as UserProfile[]);
    } catch (error: any) {
      toast({ title: error.message || 'Error searching users', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const loadUserDetails = async (user: UserProfile) => {
    setIsLoadingDetails(true);
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery('');

    try {
      // Load badges
      const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select(`
          id,
          badge_id,
          is_enabled,
          claimed_at,
          badge:global_badges(id, name, color, icon_url, rarity, is_limited)
        `)
        .eq('user_id', user.user_id);

      if (badgesError) throw badgesError;
      setUserBadges((badges || []) as UserBadgeWithGlobal[]);

      // Load roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.user_id);

      if (rolesError) throw rolesError;
      setUserRoles((roles || []) as UserRole[]);

      // Load social links
      const { data: links, error: linksError } = await supabase
        .from('social_links')
        .select('*')
        .eq('profile_id', user.id)
        .order('display_order', { ascending: true });

      if (linksError) throw linksError;
      setSocialLinks(links || []);
    } catch (error: any) {
      toast({ title: error.message || 'Error loading user details', variant: 'destructive' });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const toggleBadgeEnabled = async (userBadgeId: string, currentEnabled: boolean) => {
    if (!selectedUser) return;
    
    setUpdatingBadgeId(userBadgeId);
    try {
      const { error } = await supabase
        .from('user_badges')
        .update({ is_enabled: !currentEnabled })
        .eq('id', userBadgeId);

      if (error) throw error;

      // Update local state
      setUserBadges(prev => 
        prev.map(b => b.id === userBadgeId ? { ...b, is_enabled: !currentEnabled } : b)
      );

      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['profileBadges'] });
      
      toast({ title: currentEnabled ? 'Badge deactivated' : 'Badge activated' });
    } catch (error: any) {
      toast({ title: error.message || 'Error updating badge', variant: 'destructive' });
    } finally {
      setUpdatingBadgeId(null);
    }
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setUserBadges([]);
    setUserRoles([]);
    setSocialLinks([]);
    setSearchQuery('');
  };

  const refreshUserDetails = () => {
    if (selectedUser) {
      loadUserDetails(selectedUser);
    }
  };

  const enabledBadges = userBadges.filter(b => b.is_enabled);
  const disabledBadges = userBadges.filter(b => !b.is_enabled);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Account Lookup</h3>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by username, display name, or UID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && !selectedUser && (
        <div className="border rounded-lg divide-y bg-background/50">
          {searchResults.map((user) => (
            <button
              key={user.id}
              onClick={() => loadUserDetails(user)}
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
                <p className="text-xs text-muted-foreground">@{user.username} • UID #{user.uid_number}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected User Details */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border rounded-lg bg-background/50"
        >
          {/* User Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{selectedUser.display_name || selectedUser.username}</h4>
                  {userRoles.map(role => (
                    <Badge key={role.id} variant="secondary" className="text-xs">
                      {role.role}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">@{selectedUser.username} • UID #{selectedUser.uid_number}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedUser.views_count} views • Joined {new Date(selectedUser.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/${selectedUser.username}`} target="_blank">
                <Button variant="ghost" size="icon">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={refreshUserDetails}>
                <RefreshCw className={`w-4 h-4 ${isLoadingDetails ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoadingDetails ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="badges" className="p-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="badges" className="flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Badges ({userBadges.length})
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="links" className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Links ({socialLinks.length})
                </TabsTrigger>
              </TabsList>

              {/* Badges Tab */}
              <TabsContent value="badges" className="mt-4 space-y-4">
                {userBadges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>This user has no badges assigned.</p>
                  </div>
                ) : (
                  <>
                    {/* Enabled Badges */}
                    {enabledBadges.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-green-500 flex items-center gap-1 mb-2">
                          <Eye className="w-3 h-3" />
                          Active Badges ({enabledBadges.length})
                        </h5>
                        <div className="space-y-2">
                          {enabledBadges.map((ub) => {
                            const Icon = getBadgeIcon(ub.badge.name);
                            return (
                              <div
                                key={ub.id}
                                className="flex items-center justify-between p-2 rounded-lg border border-green-500/30 bg-green-500/5"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${ub.badge.color || '#8B5CF6'}20` }}
                                  >
                                    {ub.badge.icon_url ? (
                                      <img src={ub.badge.icon_url} alt="" className="w-5 h-5" />
                                    ) : (
                                      <Icon className="w-4 h-4" style={{ color: ub.badge.color || '#8B5CF6' }} />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{ub.badge.name}</p>
                                    <p className="text-xs text-muted-foreground">{ub.badge.rarity}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {updatingBadgeId === ub.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Switch
                                      checked={true}
                                      onCheckedChange={() => toggleBadgeEnabled(ub.id, true)}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Disabled Badges */}
                    {disabledBadges.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
                          <EyeOff className="w-3 h-3" />
                          Hidden Badges ({disabledBadges.length})
                        </h5>
                        <div className="space-y-2">
                          {disabledBadges.map((ub) => {
                            const Icon = getBadgeIcon(ub.badge.name);
                            return (
                              <div
                                key={ub.id}
                                className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-secondary/20 opacity-60"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${ub.badge.color || '#8B5CF6'}10` }}
                                  >
                                    {ub.badge.icon_url ? (
                                      <img src={ub.badge.icon_url} alt="" className="w-5 h-5 opacity-50" />
                                    ) : (
                                      <Icon className="w-4 h-4 opacity-50" style={{ color: ub.badge.color || '#8B5CF6' }} />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{ub.badge.name}</p>
                                    <p className="text-xs text-muted-foreground">{ub.badge.rarity}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {updatingBadgeId === ub.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Switch
                                      checked={false}
                                      onCheckedChange={() => toggleBadgeEnabled(ub.id, false)}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Profile Settings</h5>
                    <div className="space-y-2 text-sm">
                      <SettingRow label="Show Username" value={selectedUser.show_username} />
                      <SettingRow label="Show Display Name" value={selectedUser.show_display_name} />
                      <SettingRow label="Show Avatar" value={selectedUser.show_avatar} />
                      <SettingRow label="Show Description" value={selectedUser.show_description} />
                      <SettingRow label="Show Badges" value={selectedUser.show_badges} />
                      <SettingRow label="Show Views" value={selectedUser.show_views} />
                      <SettingRow label="Show Links" value={selectedUser.show_links} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Features</h5>
                    <div className="space-y-2 text-sm">
                      <SettingRow label="Start Screen" value={selectedUser.start_screen_enabled} />
                      <SettingRow label="Email Verified" value={selectedUser.email_verified} />
                      <SettingRow 
                        label="Music" 
                        value={!!selectedUser.music_url} 
                        text={selectedUser.music_url ? 'Configured' : 'Not set'}
                      />
                      <SettingRow 
                        label="Discord ID" 
                        value={!!selectedUser.discord_user_id} 
                        text={selectedUser.discord_user_id || 'Not linked'}
                      />
                      <SettingRow 
                        label="Background" 
                        value={!!(selectedUser.background_url || selectedUser.background_video_url)} 
                        text={selectedUser.background_video_url ? 'Video' : selectedUser.background_url ? 'Image' : 'Default'}
                      />
                    </div>
                  </div>
                </div>

                {/* Effects */}
                {selectedUser.effects_config && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">Effects</h5>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedUser.effects_config).map(([key, value]) => (
                        <Badge 
                          key={key} 
                          variant={value ? 'default' : 'outline'}
                          className={value ? '' : 'opacity-50'}
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Links Tab */}
              <TabsContent value="links" className="mt-4">
                {socialLinks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No social links configured.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {socialLinks.map((link) => (
                      <div
                        key={link.id}
                        className={`flex items-center justify-between p-2 rounded-lg border ${
                          link.is_visible ? 'border-border' : 'border-border/50 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs">
                            {link.platform.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{link.title || link.platform}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{link.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {link.is_visible ? (
                            <Eye className="w-4 h-4 text-green-500" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      )}
    </div>
  );
}

function SettingRow({ label, value, text }: { label: string; value: boolean; text?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {text ? (
          <span className={value ? 'text-green-500' : 'text-muted-foreground'}>{text}</span>
        ) : value ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <X className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

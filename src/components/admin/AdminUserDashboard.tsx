import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  User, 
  Loader2, 
  Save,
  Eye,
  Palette,
  Settings,
  Award,
  ExternalLink,
  RefreshCw,
  Check,
  Link as LinkIcon,
  Smartphone,
  Monitor,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getBadgeIcon } from '@/lib/badges';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { SocialLinks } from '@/components/profile/SocialLinks';
import type { Profile, SocialLink as SocialLinkType } from '@/hooks/useProfile';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_shape: string | null;
  uid_number: number;
  bio: string | null;
  background_url: string | null;
  background_video_url: string | null;
  background_color: string | null;
  accent_color: string | null;
  text_color: string | null;
  icon_color: string | null;
  card_color: string | null;
  music_url: string | null;
  discord_user_id: string | null;
  show_username: boolean;
  show_display_name: boolean;
  show_badges: boolean;
  show_views: boolean;
  show_avatar: boolean;
  show_links: boolean;
  show_description: boolean;
  start_screen_enabled: boolean;
  start_screen_text: string | null;
  start_screen_color: string | null;
  start_screen_bg_color: string | null;
  start_screen_font: string | null;
  start_screen_animation: string | null;
  profile_opacity: number;
  profile_blur: number;
  glow_username: boolean;
  glow_socials: boolean;
  glow_badges: boolean;
  transparent_badges: boolean;
  card_border_enabled: boolean;
  card_border_color: string | null;
  card_border_width: number;
  layout_style: string | null;
  card_style: string | null;
  name_font: string | null;
  text_font: string | null;
  views_count: number;
  created_at: string;
  monochrome_icons: boolean;
  icon_only_links: boolean;
  icon_links_opacity: number;
  occupation: string | null;
  location: string | null;
  background_effect: string | null;
  effects_config: any;
}

interface UserBadgeWithGlobal {
  id: string;
  badge_id: string;
  is_enabled: boolean;
  is_locked: boolean;
  badge: {
    id: string;
    name: string;
    color: string | null;
    icon_url: string | null;
  };
}

interface SocialLinkData {
  id: string;
  platform: string;
  url: string;
  title: string | null;
  icon: string | null;
  is_visible: boolean;
  display_order: number;
}

interface AdminUserDashboardProps {
  user: UserProfile;
  open: boolean;
  onClose: () => void;
}

export function AdminUserDashboard({ user, open, onClose }: AdminUserDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const [isSaving, setIsSaving] = useState(false);
  const [userBadges, setUserBadges] = useState<UserBadgeWithGlobal[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinkData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewExpanded, setPreviewExpanded] = useState(true);
  
  // Complete profile form state
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
    avatar_shape: 'circle',
    background_url: '',
    background_video_url: '',
    background_color: '#0a0a0a',
    background_effect: 'none',
    accent_color: '#8b5cf6',
    text_color: '#ffffff',
    icon_color: '#ffffff',
    card_color: 'rgba(0,0,0,0.5)',
    music_url: '',
    discord_user_id: '',
    occupation: '',
    location: '',
    show_username: true,
    show_display_name: true,
    show_badges: true,
    show_views: true,
    show_avatar: true,
    show_links: true,
    show_description: true,
    start_screen_enabled: false,
    start_screen_text: 'Click anywhere to enter',
    start_screen_color: '#a855f7',
    start_screen_bg_color: '#000000',
    start_screen_font: 'Inter',
    start_screen_animation: 'none',
    profile_opacity: 100,
    profile_blur: 0,
    glow_username: false,
    glow_socials: false,
    glow_badges: false,
    transparent_badges: false,
    monochrome_icons: false,
    icon_only_links: false,
    icon_links_opacity: 100,
    card_border_enabled: true,
    card_border_color: '',
    card_border_width: 1,
    layout_style: 'stacked',
    card_style: 'classic',
    name_font: 'Inter',
    text_font: 'Inter',
  });

  // Load user data when opened
  useEffect(() => {
    if (open && user) {
      setFormData({
        display_name: user.display_name || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        avatar_shape: user.avatar_shape || 'circle',
        background_url: user.background_url || '',
        background_video_url: user.background_video_url || '',
        background_color: user.background_color || '#0a0a0a',
        background_effect: user.background_effect || 'none',
        accent_color: user.accent_color || '#8b5cf6',
        text_color: user.text_color || '#ffffff',
        icon_color: user.icon_color || '#ffffff',
        card_color: user.card_color || 'rgba(0,0,0,0.5)',
        music_url: user.music_url || '',
        discord_user_id: user.discord_user_id || '',
        occupation: user.occupation || '',
        location: user.location || '',
        show_username: user.show_username ?? true,
        show_display_name: user.show_display_name ?? true,
        show_badges: user.show_badges ?? true,
        show_views: user.show_views ?? true,
        show_avatar: user.show_avatar ?? true,
        show_links: user.show_links ?? true,
        show_description: user.show_description ?? true,
        start_screen_enabled: user.start_screen_enabled ?? false,
        start_screen_text: user.start_screen_text || 'Click anywhere to enter',
        start_screen_color: user.start_screen_color || '#a855f7',
        start_screen_bg_color: user.start_screen_bg_color || '#000000',
        start_screen_font: user.start_screen_font || 'Inter',
        start_screen_animation: user.start_screen_animation || 'none',
        profile_opacity: user.profile_opacity ?? 100,
        profile_blur: user.profile_blur ?? 0,
        glow_username: user.glow_username ?? false,
        glow_socials: user.glow_socials ?? false,
        glow_badges: user.glow_badges ?? false,
        transparent_badges: user.transparent_badges ?? false,
        monochrome_icons: user.monochrome_icons ?? false,
        icon_only_links: user.icon_only_links ?? false,
        icon_links_opacity: user.icon_links_opacity ?? 100,
        card_border_enabled: user.card_border_enabled ?? true,
        card_border_color: user.card_border_color || '',
        card_border_width: user.card_border_width ?? 1,
        layout_style: user.layout_style || 'stacked',
        card_style: user.card_style || 'classic',
        name_font: user.name_font || 'Inter',
        text_font: user.text_font || 'Inter',
      });
      loadUserData();
    }
  }, [open, user]);

  const loadUserData = async () => {
    setIsLoadingData(true);
    try {
      // Load badges
      const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select(`
          id,
          badge_id,
          is_enabled,
          is_locked,
          badge:global_badges(id, name, color, icon_url)
        `)
        .eq('user_id', user.user_id);

      if (badgesError) throw badgesError;
      setUserBadges((badges || []) as UserBadgeWithGlobal[]);

      // Load social links
      const { data: links, error: linksError } = await supabase
        .from('social_links')
        .select('*')
        .eq('profile_id', user.id)
        .order('display_order', { ascending: true });

      if (linksError) throw linksError;
      setSocialLinks(links || []);
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('admin-update-profile', {
        body: {
          action: 'update_profile',
          profileId: user.id,
          data: formData
        }
      });

      if (response.error) throw response.error;
      
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Profile saved successfully!' });
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBadge = async (badgeId: string, field: 'is_enabled' | 'is_locked', currentValue: boolean) => {
    try {
      const updateData: any = { [field]: !currentValue };
      if (field === 'is_locked' && !currentValue) {
        updateData.is_enabled = false;
      }

      const response = await supabase.functions.invoke('admin-update-profile', {
        body: {
          action: 'update_badge',
          profileId: user.id,
          data: { badgeId, updates: updateData }
        }
      });

      if (response.error) throw response.error;

      setUserBadges(prev => 
        prev.map(b => b.id === badgeId ? { ...b, ...updateData } : b)
      );

      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      queryClient.invalidateQueries({ queryKey: ['profileBadges'] });
      toast({ title: 'Badge updated' });
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' });
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Build mock profile for preview
  const mockProfile: Profile = {
    id: user.id,
    user_id: user.user_id,
    username: user.username,
    display_name: formData.display_name,
    bio: formData.bio,
    avatar_url: formData.avatar_url,
    avatar_shape: formData.avatar_shape,
    background_url: formData.background_url || null,
    background_color: formData.background_color,
    accent_color: formData.accent_color,
    card_color: formData.card_color,
    text_color: formData.text_color,
    icon_color: formData.icon_color,
    music_url: formData.music_url || null,
    views_count: user.views_count,
    effects_config: user.effects_config || { tilt: true },
    created_at: user.created_at,
    updated_at: new Date().toISOString(),
    uid_number: user.uid_number,
    name_font: formData.name_font,
    text_font: formData.text_font,
    occupation: formData.occupation || null,
    location: formData.location || null,
  } as Profile;

  const previewBadges = userBadges
    .filter(b => b.is_enabled && !b.is_locked)
    .map(b => ({
      id: b.badge.id,
      name: b.badge.name,
      color: b.badge.color,
      icon_url: b.badge.icon_url
    }));

  const previewLinks: SocialLinkType[] = socialLinks
    .filter(l => l.is_visible)
    .map(l => ({
      id: l.id,
      platform: l.platform,
      url: l.url,
      title: l.title,
      icon: l.icon,
      is_visible: l.is_visible,
      display_order: l.display_order,
      profile_id: user.id,
      created_at: '',
      description: null,
      style: 'card',
    }));

  // Start Screen Preview Component
  const StartScreenPreview = () => {
    if (!formData.start_screen_enabled) return null;
    
    return (
      <div className="border-t border-border/50 p-3 bg-muted/20">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Start Screen Preview</span>
        </div>
        <div 
          className="rounded-lg overflow-hidden border border-border/30"
          style={{ 
            backgroundColor: formData.start_screen_bg_color,
            height: '80px'
          }}
        >
          <div className="h-full flex items-center justify-center">
            <p 
              className="text-sm"
              style={{ 
                fontFamily: formData.start_screen_font,
                color: formData.start_screen_color 
              }}
            >
              {formData.start_screen_text || 'Click anywhere to enter'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Stop event propagation for interactive elements
  const stopPropagation = (e: React.MouseEvent | React.FocusEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  // Preview Component
  const PreviewContent = () => (
    <div className="h-full flex flex-col" onClick={stopPropagation} onMouseDown={stopPropagation}>
      {/* Preview Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Live Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={previewMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={(e) => { stopPropagation(e); setPreviewMode('desktop'); }}
            className="h-8 w-8 p-0 min-h-[32px] min-w-[32px]"
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={(e) => { stopPropagation(e); setPreviewMode('mobile'); }}
            className="h-8 w-8 p-0 min-h-[32px] min-w-[32px]"
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-4 bg-muted/10">
        <div className="flex justify-center">
          {previewMode === 'mobile' ? (
            // Mobile Phone Frame
            <div className="relative rounded-[2rem] p-1.5 bg-black/80 shadow-2xl" style={{ width: '280px' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-xl z-20" />
              <div 
                className="relative rounded-[1.5rem] overflow-hidden"
                style={{ backgroundColor: formData.background_color, height: '500px' }}
              >
                {formData.background_video_url ? (
                  <video
                    src={formData.background_video_url}
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                    autoPlay muted loop playsInline
                  />
                ) : formData.background_url ? (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-50"
                    style={{ backgroundImage: `url(${formData.background_url})` }}
                  />
                ) : null}
                <div 
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${formData.accent_color}20 0%, transparent 60%)` }}
                />
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-3 overflow-y-auto" style={{ transform: 'scale(0.7)', transformOrigin: 'center center' }}>
                  <ProfileCard
                    profile={mockProfile}
                    badges={previewBadges}
                    showUsername={formData.show_username}
                    showDisplayName={formData.show_display_name}
                    showBadges={formData.show_badges}
                    showViews={formData.show_views}
                    showAvatar={formData.show_avatar}
                    showDescription={formData.show_description}
                    borderEnabled={formData.card_border_enabled}
                    borderColor={formData.card_border_color}
                    borderWidth={formData.card_border_width}
                  />
                  {formData.show_links && previewLinks.length > 0 && (
                    <div className="mt-4 w-full">
                      <SocialLinks
                        links={previewLinks.slice(0, 3)}
                        accentColor={formData.accent_color}
                        glowingIcons={formData.glow_socials}
                        iconOnly={formData.icon_only_links}
                        iconOpacity={formData.icon_links_opacity}
                      />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full" />
              </div>
            </div>
          ) : (
            // Desktop Browser Frame
            <div className="w-full max-w-lg rounded-xl overflow-hidden border border-border/50 shadow-2xl">
              <div className="bg-card/80 backdrop-blur-sm px-4 py-2 flex items-center gap-3 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/80" />
                  <div className="w-3 h-3 rounded-full bg-warning/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-muted/50 rounded-md px-4 py-1 text-xs text-muted-foreground">
                    /{user.username}
                  </div>
                </div>
              </div>
              <div 
                className="relative overflow-hidden"
                style={{ backgroundColor: formData.background_color, height: '400px' }}
              >
                {formData.background_video_url && (
                  <video
                    autoPlay loop muted playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                  >
                    <source src={formData.background_video_url} type="video/mp4" />
                  </video>
                )}
                {!formData.background_video_url && formData.background_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
                    style={{ backgroundImage: `url(${formData.background_url})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                <div
                  className="absolute inset-0 opacity-40"
                  style={{ background: `radial-gradient(ellipse at 50% 0%, ${formData.accent_color}30, transparent 60%)` }}
                />
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 overflow-y-auto">
                  <div className="w-full max-w-sm mx-auto space-y-4" style={{ transform: 'scale(0.85)', transformOrigin: 'center center' }}>
                    <ProfileCard
                      profile={mockProfile}
                      badges={previewBadges}
                      showUsername={formData.show_username}
                      showDisplayName={formData.show_display_name}
                      showBadges={formData.show_badges}
                      showViews={formData.show_views}
                      showAvatar={formData.show_avatar}
                      showDescription={formData.show_description}
                      borderEnabled={formData.card_border_enabled}
                      borderColor={formData.card_border_color}
                      borderWidth={formData.card_border_width}
                    />
                    {formData.show_links && previewLinks.length > 0 && (
                      <SocialLinks
                        links={previewLinks}
                        accentColor={formData.accent_color}
                        glowingIcons={formData.glow_socials}
                        iconOnly={formData.icon_only_links}
                        iconOpacity={formData.icon_links_opacity}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start Screen Preview below main preview */}
      <StartScreenPreview />
    </div>
  );

  // Editor Content
  const EditorContent = () => (
    <div className="flex flex-col h-full" onClick={stopPropagation} onMouseDown={stopPropagation}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{user.display_name || user.username}</h3>
            <p className="text-xs text-muted-foreground">@{user.username} • UID #{user.uid_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to={`/${user.username}`} target="_blank" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="min-h-[40px] min-w-[40px]">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="min-h-[40px] px-4">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline ml-1">Save</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="profile" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mx-4 mt-4 flex-shrink-0" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="profile" className="text-xs px-1 min-h-[36px]">
              <User className="w-3 h-3 mr-1 hidden sm:inline" />Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs px-1 min-h-[36px]">
              <Palette className="w-3 h-3 mr-1 hidden sm:inline" />Style
            </TabsTrigger>
            <TabsTrigger value="badges" className="text-xs px-1 min-h-[36px]">
              <Award className="w-3 h-3 mr-1 hidden sm:inline" />Badges
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs px-1 min-h-[36px]">
              <LinkIcon className="w-3 h-3 mr-1 hidden sm:inline" />Links
            </TabsTrigger>
            <TabsTrigger value="visibility" className="text-xs px-1 min-h-[36px]">
              <Eye className="w-3 h-3 mr-1 hidden sm:inline" />Show
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4 pb-4">
            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Display Name</Label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => updateField('display_name', e.target.value)}
                    onMouseDown={stopPropagation}
                    onFocus={stopPropagation}
                    onClick={stopPropagation}
                    placeholder="Display name"
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bio</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    onMouseDown={stopPropagation}
                    onFocus={stopPropagation}
                    onClick={stopPropagation}
                    placeholder="Bio..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Occupation</Label>
                    <Input
                      value={formData.occupation}
                      onChange={(e) => updateField('occupation', e.target.value)}
                      onMouseDown={stopPropagation}
                      onFocus={stopPropagation}
                      onClick={stopPropagation}
                      placeholder="Developer, Designer..."
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      onMouseDown={stopPropagation}
                      onFocus={stopPropagation}
                      onClick={stopPropagation}
                      placeholder="Berlin, DE"
                      className="h-10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Discord User ID</Label>
                  <Input
                    value={formData.discord_user_id}
                    onChange={(e) => updateField('discord_user_id', e.target.value)}
                    onMouseDown={stopPropagation}
                    onFocus={stopPropagation}
                    onClick={stopPropagation}
                    placeholder="Discord User ID"
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Avatar URL</Label>
                  <Input
                    value={formData.avatar_url}
                    onChange={(e) => updateField('avatar_url', e.target.value)}
                    onMouseDown={stopPropagation}
                    onFocus={stopPropagation}
                    onClick={stopPropagation}
                    placeholder="https://..."
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Avatar Shape</Label>
                  <Select value={formData.avatar_shape} onValueChange={(v) => updateField('avatar_shape', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="hexagon">Hexagon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Background Image URL</Label>
                  <Input
                    value={formData.background_url}
                    onChange={(e) => updateField('background_url', e.target.value)}
                    onMouseDown={stopPropagation}
                    onFocus={stopPropagation}
                    onClick={stopPropagation}
                    placeholder="https://..."
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Background Video URL</Label>
                  <Input
                    value={formData.background_video_url}
                    onChange={(e) => updateField('background_video_url', e.target.value)}
                    onMouseDown={stopPropagation}
                    onFocus={stopPropagation}
                    onClick={stopPropagation}
                    placeholder="https://..."
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Music URL</Label>
                  <Input
                    value={formData.music_url}
                    onChange={(e) => updateField('music_url', e.target.value)}
                    onMouseDown={stopPropagation}
                    onFocus={stopPropagation}
                    onClick={stopPropagation}
                    placeholder="https://..."
                    className="h-10"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="mt-4 space-y-4">
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Colors</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Background', field: 'background_color' },
                    { label: 'Accent', field: 'accent_color' },
                    { label: 'Text', field: 'text_color' },
                    { label: 'Icon', field: 'icon_color' },
                    { label: 'Border', field: 'card_border_color' },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <Label className="text-xs">{label}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData[field as keyof typeof formData] as string || '#000000'}
                          onChange={(e) => updateField(field, e.target.value)}
                          onMouseDown={stopPropagation}
                          onClick={stopPropagation}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData[field as keyof typeof formData] as string || ''}
                          onChange={(e) => updateField(field, e.target.value)}
                          onMouseDown={stopPropagation}
                          onFocus={stopPropagation}
                          onClick={stopPropagation}
                          className="flex-1 h-10 text-xs"
                          placeholder="#hex"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <h4 className="text-xs font-semibold uppercase text-muted-foreground pt-2">Layout</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Layout Style</Label>
                    <Select value={formData.layout_style} onValueChange={(v) => updateField('layout_style', v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stacked">Stacked</SelectItem>
                        <SelectItem value="side-by-side">Side by Side</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Card Style</Label>
                    <Select value={formData.card_style} onValueChange={(v) => updateField('card_style', v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="glass">Glass</SelectItem>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Name Font</Label>
                    <Select value={formData.name_font} onValueChange={(v) => updateField('name_font', v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Poppins">Poppins</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                        <SelectItem value="Space Mono">Space Mono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Text Font</Label>
                    <Select value={formData.text_font} onValueChange={(v) => updateField('text_font', v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Poppins">Poppins</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Lato">Lato</SelectItem>
                        <SelectItem value="Space Mono">Space Mono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <h4 className="text-xs font-semibold uppercase text-muted-foreground pt-2">Effects</h4>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Opacity ({formData.profile_opacity}%)</Label>
                    <Slider
                      value={[formData.profile_opacity]}
                      onValueChange={([v]) => updateField('profile_opacity', v)}
                      min={0} max={100} step={5}
                      className="py-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Blur ({formData.profile_blur}px)</Label>
                    <Slider
                      value={[formData.profile_blur]}
                      onValueChange={([v]) => updateField('profile_blur', v)}
                      min={0} max={20} step={1}
                      className="py-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Border Width ({formData.card_border_width}px)</Label>
                    <Slider
                      value={[formData.card_border_width]}
                      onValueChange={([v]) => updateField('card_border_width', v)}
                      min={0} max={5} step={1}
                      className="py-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Icon Links Opacity ({formData.icon_links_opacity}%)</Label>
                    <Slider
                      value={[formData.icon_links_opacity]}
                      onValueChange={([v]) => updateField('icon_links_opacity', v)}
                      min={0} max={100} step={5}
                      className="py-2"
                    />
                  </div>
                </div>

                <h4 className="text-xs font-semibold uppercase text-muted-foreground pt-2">Glow Effects</h4>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: 'Glow Username', field: 'glow_username' },
                    { label: 'Glow Socials', field: 'glow_socials' },
                    { label: 'Glow Badges', field: 'glow_badges' },
                    { label: 'Transparent Badges', field: 'transparent_badges' },
                    { label: 'Monochrome Icons', field: 'monochrome_icons' },
                    { label: 'Icon Only Links', field: 'icon_only_links' },
                  ].map(({ label, field }) => (
                    <div key={field} className="flex items-center justify-between min-h-[44px] py-1">
                      <Label className="text-sm">{label}</Label>
                      <Switch
                        checked={formData[field as keyof typeof formData] as boolean}
                        onCheckedChange={(v) => updateField(field, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Badges Tab */}
            <TabsContent value="badges" className="mt-4 space-y-3">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : userBadges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No badges assigned to this user.
                </div>
              ) : (
                <div className="space-y-3">
                  {userBadges.map((ub) => {
                    const Icon = getBadgeIcon(ub.badge.name);
                    return (
                      <div
                        key={ub.id}
                        className={`p-4 rounded-lg border ${
                          ub.is_locked 
                            ? 'border-destructive/30 bg-destructive/5' 
                            : ub.is_enabled 
                              ? 'border-green-500/30 bg-green-500/5'
                              : 'border-border bg-secondary/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${ub.badge.color || '#8B5CF6'}20` }}
                            >
                              {ub.badge.icon_url ? (
                                <img src={ub.badge.icon_url} alt="" className="w-6 h-6" />
                              ) : (
                                <Icon className="w-5 h-5" style={{ color: ub.badge.color || '#8B5CF6' }} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{ub.badge.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {ub.is_locked ? 'Locked' : ub.is_enabled ? 'Active' : 'Hidden'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant={ub.is_enabled && !ub.is_locked ? "default" : "outline"}
                              size="sm"
                              className="h-10 px-4 min-w-[60px]"
                              onClick={() => toggleBadge(ub.id, 'is_enabled', ub.is_enabled)}
                              disabled={ub.is_locked}
                            >
                              {ub.is_enabled ? 'On' : 'Off'}
                            </Button>
                            <Button
                              variant={ub.is_locked ? "destructive" : "outline"}
                              size="sm"
                              className="h-10 px-4 min-w-[70px]"
                              onClick={() => toggleBadge(ub.id, 'is_locked', ub.is_locked)}
                            >
                              {ub.is_locked ? 'Unlock' : 'Lock'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="mt-4 space-y-3">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : socialLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No social links added.
                </div>
              ) : (
                <div className="space-y-3">
                  {socialLinks.map((link) => (
                    <div
                      key={link.id}
                      className={`p-4 rounded-lg border ${link.is_visible ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{link.title || link.platform}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Switch
                            checked={link.is_visible}
                            onCheckedChange={async (visible) => {
                              try {
                                await supabase.functions.invoke('admin-update-profile', {
                                  body: {
                                    action: 'update_social_link',
                                    profileId: user.id,
                                    data: { linkId: link.id, updates: { is_visible: visible } }
                                  }
                                });
                                setSocialLinks(prev => 
                                  prev.map(l => l.id === link.id ? { ...l, is_visible: visible } : l)
                                );
                                toast({ title: 'Link updated' });
                              } catch (error: any) {
                                toast({ title: error.message, variant: 'destructive' });
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Visibility Tab */}
            <TabsContent value="visibility" className="mt-4 space-y-4">
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Profile Elements</h4>
                <div className="grid gap-4">
                  {[
                    { label: 'Show Username', field: 'show_username' },
                    { label: 'Show Display Name', field: 'show_display_name' },
                    { label: 'Show Avatar', field: 'show_avatar' },
                    { label: 'Show Description', field: 'show_description' },
                    { label: 'Show Badges', field: 'show_badges' },
                    { label: 'Show Links', field: 'show_links' },
                    { label: 'Show Views', field: 'show_views' },
                    { label: 'Card Border', field: 'card_border_enabled' },
                  ].map(({ label, field }) => (
                    <div key={field} className="flex items-center justify-between min-h-[44px] py-1">
                      <Label className="text-sm">{label}</Label>
                      <Switch
                        checked={formData[field as keyof typeof formData] as boolean}
                        onCheckedChange={(v) => updateField(field, v)}
                      />
                    </div>
                  ))}
                </div>

                <h4 className="text-xs font-semibold uppercase text-muted-foreground pt-2">Start Screen</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between min-h-[44px] py-1">
                    <Label className="text-sm">Enable Start Screen</Label>
                    <Switch
                      checked={formData.start_screen_enabled}
                      onCheckedChange={(v) => updateField('start_screen_enabled', v)}
                    />
                  </div>
                  {formData.start_screen_enabled && (
                    <>
                      <div>
                        <Label className="text-xs">Start Screen Text</Label>
                        <Input
                          value={formData.start_screen_text}
                          onChange={(e) => updateField('start_screen_text', e.target.value)}
                          onMouseDown={stopPropagation}
                          onFocus={stopPropagation}
                          onClick={stopPropagation}
                          className="h-10"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.start_screen_color}
                              onChange={(e) => updateField('start_screen_color', e.target.value)}
                              onMouseDown={stopPropagation}
                              onClick={stopPropagation}
                              className="w-12 h-10 p-1"
                            />
                            <Input
                              value={formData.start_screen_color}
                              onChange={(e) => updateField('start_screen_color', e.target.value)}
                              onMouseDown={stopPropagation}
                              onFocus={stopPropagation}
                              onClick={stopPropagation}
                              className="flex-1 h-10 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">BG Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.start_screen_bg_color}
                              onChange={(e) => updateField('start_screen_bg_color', e.target.value)}
                              onMouseDown={stopPropagation}
                              onClick={stopPropagation}
                              className="w-12 h-10 p-1"
                            />
                            <Input
                              value={formData.start_screen_bg_color}
                              onChange={(e) => updateField('start_screen_bg_color', e.target.value)}
                              onMouseDown={stopPropagation}
                              onFocus={stopPropagation}
                              onClick={stopPropagation}
                              className="flex-1 h-10 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Font</Label>
                        <Select value={formData.start_screen_font} onValueChange={(v) => updateField('start_screen_font', v)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Inter">Inter</SelectItem>
                            <SelectItem value="Poppins">Poppins</SelectItem>
                            <SelectItem value="Roboto">Roboto</SelectItem>
                            <SelectItem value="Space Mono">Space Mono</SelectItem>
                            <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Animation</Label>
                        <Select value={formData.start_screen_animation} onValueChange={(v) => updateField('start_screen_animation', v)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (Typewriter)</SelectItem>
                            <SelectItem value="shuffle">Shuffle</SelectItem>
                            <SelectItem value="shuffle-gsap">Shuffle GSAP</SelectItem>
                            <SelectItem value="fuzzy">Fuzzy</SelectItem>
                            <SelectItem value="decrypted">Decrypted</SelectItem>
                            <SelectItem value="ascii">ASCII</SelectItem>
                            <SelectItem value="ascii-3d">ASCII 3D</SelectItem>
                            <SelectItem value="decrypted-advanced">Decrypted Advanced</SelectItem>
                            <SelectItem value="fuzzy-canvas">Fuzzy Canvas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent 
          className="h-[95vh] max-h-[95vh]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>Edit User: {user.username}</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col h-full overflow-hidden">
            {/* Collapsible Preview on Mobile */}
            <Collapsible open={previewExpanded} onOpenChange={setPreviewExpanded} className="border-b flex-shrink-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between rounded-none h-12 min-h-[48px]">
                  <span className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4" />
                    Preview
                  </span>
                  {previewExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="h-[350px]">
                  <PreviewContent />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              <EditorContent />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Sheet with side-by-side layout
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full max-w-6xl sm:max-w-6xl p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Edit User: {user.username}</SheetTitle>
        </SheetHeader>
        <div className="flex h-full">
          {/* Left: Editor */}
          <div className="w-1/2 border-r overflow-hidden">
            <EditorContent />
          </div>
          
          {/* Right: Preview */}
          <div className="w-1/2 overflow-hidden">
            <PreviewContent />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { useCurrentUserProfile, useUpdateProfile, useSocialLinks, useCreateSocialLink, useDeleteSocialLink } from '@/hooks/useProfile';
import { useIsAdmin, useUserBadges, useGlobalBadges, useClaimBadge } from '@/hooks/useBadges';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  LogOut,
  Save,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Palette,
  LinkIcon,
  Sparkles,
  User,
  Layout,
  Music,
  MessageSquare,
  LayoutDashboard,
  Puzzle,
  Shield,
  Award,
  Settings,
  Menu,
  X,
  Volume2,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OverviewStats } from '@/components/dashboard/OverviewStats';
import { BadgesCarousel } from '@/components/dashboard/BadgesCarousel';
import { DiscordCard } from '@/components/dashboard/DiscordCard';
import { RegisteredUsersList } from '@/components/dashboard/RegisteredUsersList';
import { EarlyBadgeCountdown } from '@/components/dashboard/EarlyBadgeCountdown';
import { ProfileVisitorsChart } from '@/components/dashboard/ProfileVisitorsChart';
import { TopLinksChart } from '@/components/dashboard/TopLinksChart';
import { StartScreenSettings } from '@/components/dashboard/StartScreenSettings';
import { VolumeControlSettings } from '@/components/dashboard/VolumeControlSettings';
import { ProfileVisibilitySettings } from '@/components/dashboard/ProfileVisibilitySettings';
import { CardBorderSettings } from '@/components/dashboard/CardBorderSettings';
import { AdminBadgeManager } from '@/components/admin/AdminBadgeManager';
import { AdminUserManager } from '@/components/admin/AdminUserManager';
import { BadgesGrid } from '@/components/dashboard/BadgesGrid';
import { UserBadgesList } from '@/components/dashboard/UserBadgesList';
import { LimitedBadgeAssigner } from '@/components/admin/LimitedBadgeAssigner';
import { AdminBadgeRemover } from '@/components/admin/AdminBadgeRemover';
import { AllBadgeAssigner } from '@/components/admin/AllBadgeAssigner';
import { UserBanManager } from '@/components/admin/UserBanManager';
import { SocialLinksGrid } from '@/components/dashboard/SocialLinksGrid';
import { CustomizationPanel } from '@/components/dashboard/CustomizationPanel';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { cn } from '@/lib/utils';

type TabType = 'overview' | 'profile' | 'appearance' | 'links' | 'widgets' | 'effects' | 'badges' | 'admin' | 'settings';

const baseNavItems: { icon: React.ElementType; label: string; tab: TabType }[] = [
  { icon: LayoutDashboard, label: 'Overview', tab: 'overview' },
  { icon: User, label: 'Profile', tab: 'profile' },
  { icon: Palette, label: 'Appearance', tab: 'appearance' },
  { icon: LinkIcon, label: 'Links', tab: 'links' },
  { icon: Award, label: 'Badges', tab: 'badges' },
  { icon: Puzzle, label: 'Widgets', tab: 'widgets' },
  { icon: Sparkles, label: 'Effects', tab: 'effects' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
];

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentUserProfile();
  const { data: socialLinks = [] } = useSocialLinks(profile?.id || '');
  const { data: isAdmin = false } = useIsAdmin();
  const { data: userBadges = [] } = useUserBadges(user?.id || '');
  const { data: globalBadges = [] } = useGlobalBadges();
  const claimBadge = useClaimBadge();
  const updateProfile = useUpdateProfile();
  const createLink = useCreateSocialLink();
  const deleteLink = useDeleteSocialLink();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Build nav items based on admin status
  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? [{ icon: Shield, label: 'Admin', tab: 'admin' as TabType }] : []),
  ];

  // Get active tab from hash
  const getActiveTab = (): TabType => {
    const hash = location.hash.replace('#', '') as TabType;
    return navItems.some(item => item.tab === hash) ? hash : 'overview';
  };
  const [activeTab, setActiveTab] = useState<TabType>(getActiveTab());

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.hash, isAdmin]);

  // Profile state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarShape, setAvatarShape] = useState('circle');
  const [occupation, setOccupation] = useState('');
  const [location_, setLocation_] = useState('');
  
  // Appearance state
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0a');
  const [accentColor, setAccentColor] = useState('#8b5cf6');
  const [textColor, setTextColor] = useState('#ffffff');
  const [iconColor, setIconColor] = useState('#ffffff');
  const [nameFont, setNameFont] = useState('Inter');
  const [textFont, setTextFont] = useState('Inter');
  const [layoutStyle, setLayoutStyle] = useState('stacked');
  const [cardStyle, setCardStyle] = useState('classic');
  const [customCursorUrl, setCustomCursorUrl] = useState('');
  const [profileOpacity, setProfileOpacity] = useState(100);
  const [profileBlur, setProfileBlur] = useState(0);
  
  // Music & Effects state
  const [musicUrl, setMusicUrl] = useState('');
  const [discordUserId, setDiscordUserId] = useState('');
  const [effects, setEffects] = useState({
    sparkles: false,
    tilt: true,
    glow: false,
    typewriter: false,
  });
  const [backgroundEffect, setBackgroundEffect] = useState('particles');
  const [audioVolume, setAudioVolume] = useState(0.5);

  // Other customization
  const [monochromeIcons, setMonochromeIcons] = useState(false);
  const [animatedTitle, setAnimatedTitle] = useState(false);
  const [swapBioColors, setSwapBioColors] = useState(false);
  const [useDiscordAvatar, setUseDiscordAvatar] = useState(false);
  const [discordAvatarDecoration, setDiscordAvatarDecoration] = useState(false);
  const [enableProfileGradient, setEnableProfileGradient] = useState(false);
  const [glowUsername, setGlowUsername] = useState(false);
  const [glowSocials, setGlowSocials] = useState(false);
  const [glowBadges, setGlowBadges] = useState(false);

  // Discord Card customization
  const [discordCardStyle, setDiscordCardStyle] = useState('glass');
  const [discordCardOpacity, setDiscordCardOpacity] = useState(100);
  const [discordShowBadge, setDiscordShowBadge] = useState(true);
  const [discordBadgeColor, setDiscordBadgeColor] = useState('#ec4899');

  // Start Screen settings
  const [startScreenEnabled, setStartScreenEnabled] = useState(true);
  const [startScreenText, setStartScreenText] = useState('Click anywhere to enter');
  const [startScreenFont, setStartScreenFont] = useState('Inter');
  const [startScreenColor, setStartScreenColor] = useState('#a855f7');
  const [startScreenBgColor, setStartScreenBgColor] = useState('#000000');
  const [startScreenAnimation, setStartScreenAnimation] = useState<string>('none');
  const [asciiSize, setAsciiSize] = useState(8);
  const [asciiWaves, setAsciiWaves] = useState(true);

  // Volume control settings
  const [showVolumeControl, setShowVolumeControl] = useState(true);

  // Profile visibility settings
  const [showUsername, setShowUsername] = useState(true);
  const [showDisplayName, setShowDisplayName] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [showViews, setShowViews] = useState(true);
  const [showAvatar, setShowAvatar] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [showDescription, setShowDescription] = useState(true);

  // Card border settings
  const [cardBorderEnabled, setCardBorderEnabled] = useState(true);
  const [cardBorderColor, setCardBorderColor] = useState('');
  const [cardBorderWidth, setCardBorderWidth] = useState(1);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Links state
  const [newLinkPlatform, setNewLinkPlatform] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Populate form with profile data
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setAvatarShape((profile as any).avatar_shape || 'circle');
      setOccupation((profile as any).occupation || '');
      setLocation_((profile as any).location || '');
      setBackgroundUrl(profile.background_url || '');
      setBackgroundVideoUrl((profile as any).background_video_url || '');
      setBackgroundColor(profile.background_color || '#0a0a0a');
      setAccentColor(profile.accent_color || '#8b5cf6');
      setTextColor((profile as any).text_color || '#ffffff');
      setIconColor((profile as any).icon_color || '#ffffff');
      setNameFont((profile as any).name_font || 'Inter');
      setTextFont((profile as any).text_font || 'Inter');
      setLayoutStyle((profile as any).layout_style || 'stacked');
      setCardStyle((profile as any).card_style || 'classic');
      setCustomCursorUrl((profile as any).custom_cursor_url || '');
      setProfileOpacity((profile as any).profile_opacity ?? 100);
      setProfileBlur((profile as any).profile_blur ?? 0);
      setMusicUrl(profile.music_url || '');
      setDiscordUserId((profile as any).discord_user_id || '');
      setMonochromeIcons((profile as any).monochrome_icons ?? false);
      setAnimatedTitle((profile as any).animated_title ?? false);
      setSwapBioColors((profile as any).swap_bio_colors ?? false);
      setUseDiscordAvatar((profile as any).use_discord_avatar ?? false);
      setDiscordAvatarDecoration((profile as any).discord_avatar_decoration ?? false);
      setEnableProfileGradient((profile as any).enable_profile_gradient ?? false);
      setGlowUsername((profile as any).glow_username ?? false);
      setGlowSocials((profile as any).glow_socials ?? false);
      setGlowBadges((profile as any).glow_badges ?? false);
      setDiscordCardStyle((profile as any).discord_card_style || 'glass');
      setDiscordCardOpacity((profile as any).discord_card_opacity ?? 100);
      setDiscordShowBadge((profile as any).discord_show_badge ?? true);
      setDiscordBadgeColor((profile as any).discord_badge_color || '#ec4899');
      setBackgroundEffect((profile as any).background_effect || 'particles');
      setAudioVolume((profile as any).audio_volume ?? 0.5);
      setStartScreenEnabled((profile as any).start_screen_enabled ?? true);
      setStartScreenText((profile as any).start_screen_text || 'Click anywhere to enter');
      setStartScreenFont((profile as any).start_screen_font || 'Inter');
      setStartScreenColor((profile as any).start_screen_color || '#a855f7');
      setStartScreenBgColor((profile as any).start_screen_bg_color || '#000000');
      setStartScreenAnimation((profile as any).start_screen_animation || 'none');
      setAsciiSize((profile as any).ascii_size ?? 8);
      setAsciiWaves((profile as any).ascii_waves ?? true);
      setShowVolumeControl((profile as any).show_volume_control ?? true);
      setShowUsername((profile as any).show_username ?? true);
      setShowDisplayName((profile as any).show_display_name ?? true);
      setShowBadges((profile as any).show_badges ?? true);
      setShowViews((profile as any).show_views ?? true);
      setShowAvatar((profile as any).show_avatar ?? true);
      setShowLinks((profile as any).show_links ?? true);
      setShowDescription((profile as any).show_description ?? true);
      setCardBorderEnabled((profile as any).card_border_enabled ?? true);
      setCardBorderColor((profile as any).card_border_color || '');
      setCardBorderWidth((profile as any).card_border_width ?? 1);
      const config = profile.effects_config || {};
      setEffects({
        sparkles: config.sparkles ?? false,
        tilt: config.tilt ?? true,
        glow: config.glow ?? false,
        typewriter: config.typewriter ?? false,
      });
    }
  }, [profile]);

  const handleUsernameChange = async (newUsername: string) => {
    if (!newUsername || newUsername.length < 1 || newUsername.length > 20) {
      toast({ title: 'Username must be 1-20 characters', variant: 'destructive' });
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      toast({ title: 'Username can only contain letters, numbers, and underscores', variant: 'destructive' });
      return;
    }

    // Check if username is taken
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', newUsername.toLowerCase())
      .neq('user_id', user?.id || '')
      .maybeSingle();

    if (existingProfile) {
      toast({ title: 'Username is already taken', variant: 'destructive' });
      return;
    }

    try {
      await updateProfile.mutateAsync({
        username: newUsername.toLowerCase(),
      } as any);
      setUsername(newUsername.toLowerCase());
      toast({ title: 'Username updated!' });
    } catch (error: any) {
      toast({ title: error.message || 'Error updating username', variant: 'destructive' });
    }
  };

  const handleDisplayNameSave = async (nextDisplayName: string) => {
    try {
      await updateProfile.mutateAsync({
        display_name: nextDisplayName,
      } as any);
      setDisplayName(nextDisplayName);
      toast({ title: 'Display name updated!' });
    } catch (error: any) {
      toast({ title: error.message || 'Error updating display name', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: displayName,
        bio,
        avatar_url: avatarUrl || null,
        background_url: backgroundUrl || null,
        background_video_url: backgroundVideoUrl || null,
        background_color: backgroundColor,
        accent_color: accentColor,
        text_color: textColor,
        icon_color: iconColor,
        avatar_shape: avatarShape,
        occupation: occupation || null,
        location: location_ || null,
        name_font: nameFont,
        text_font: textFont,
        layout_style: layoutStyle,
        card_style: cardStyle,
        custom_cursor_url: customCursorUrl || null,
        profile_opacity: profileOpacity,
        profile_blur: profileBlur,
        music_url: musicUrl || null,
        discord_user_id: discordUserId || null,
        effects_config: effects,
        monochrome_icons: monochromeIcons,
        animated_title: animatedTitle,
        swap_bio_colors: swapBioColors,
        use_discord_avatar: useDiscordAvatar,
        discord_avatar_decoration: discordAvatarDecoration,
        enable_profile_gradient: enableProfileGradient,
        glow_username: glowUsername,
        glow_socials: glowSocials,
        glow_badges: glowBadges,
        discord_card_style: discordCardStyle,
        discord_card_opacity: discordCardOpacity,
        discord_show_badge: discordShowBadge,
        discord_badge_color: discordBadgeColor,
        background_effect: backgroundEffect,
        audio_volume: audioVolume,
        start_screen_enabled: startScreenEnabled,
        start_screen_text: startScreenText,
        start_screen_font: startScreenFont,
        start_screen_color: startScreenColor,
        start_screen_bg_color: startScreenBgColor,
        start_screen_animation: startScreenAnimation,
        ascii_size: asciiSize,
        ascii_waves: asciiWaves,
        show_volume_control: showVolumeControl,
        show_username: showUsername,
        show_display_name: showDisplayName,
        show_badges: showBadges,
        show_views: showViews,
        show_avatar: showAvatar,
        show_links: showLinks,
        show_description: showDescription,
        card_border_enabled: cardBorderEnabled,
        card_border_color: cardBorderColor || null,
        card_border_width: cardBorderWidth,
      } as any);
      toast({ title: 'Profile saved!' });
    } catch (error) {
      toast({ title: 'Error saving profile', variant: 'destructive' });
    }
  };

  const handleAddLink = async () => {
    if (!profile || !newLinkUrl) return;

    try {
      await createLink.mutateAsync({
        profile_id: profile.id,
        platform: newLinkPlatform || 'link',
        url: newLinkUrl,
        title: newLinkTitle || null,
        icon: null,
        description: null,
        style: 'card',
        display_order: socialLinks.length,
        is_visible: true,
      });
      setNewLinkPlatform('');
      setNewLinkUrl('');
      setNewLinkTitle('');
      toast({ title: 'Link added!' });
    } catch (error) {
      toast({ title: 'Error adding link', variant: 'destructive' });
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!profile) return;
    try {
      await deleteLink.mutateAsync({ id: linkId, profileId: profile.id });
      toast({ title: 'Link deleted' });
    } catch (error) {
      toast({ title: 'Error deleting link', variant: 'destructive' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`/dashboard#${tab}`, { replace: true });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const fonts = [
    'Inter', 
    'Poppins', 
    'Roboto', 
    'Montserrat', 
    'Cinzel', 
    'Playfair Display', 
    'Space Grotesk',
    'Satoshi',
    'Outfit',
    'Sora',
    'Manrope',
    'DM Sans',
    'Archivo',
    'Lexend',
    'Plus Jakarta Sans',
    'Red Hat Display',
    'Urbanist',
    'Nunito',
    'Quicksand',
    'Work Sans',
    'Raleway',
    'Oswald',
    'Lato',
    'Open Sans',
    'Ubuntu',
    'Fira Sans',
    'Source Sans Pro',
    'Overpass',
    'Barlow',
    'Comfortaa',
    'Righteous',
    'Orbitron',
    'Audiowide',
    'Press Start 2P',
    'VT323',
  ];
  const cardStyles = ['classic', 'frosted', 'outlined', 'aurora', 'transparent'];
  const layoutStyles = ['stacked', 'floating', 'compact'];

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 sm:p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">UV</span>
          </div>
          <span className="text-xl font-bold gradient-text">UserVault</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 sm:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          
          return (
            <button
              key={item.tab}
              onClick={() => {
                handleTabChange(item.tab);
                setMobileMenuOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm transition-all text-left',
                isActive 
                  ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-2 sm:p-4 border-t border-border space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3" 
          asChild
        >
          <Link to={`/${profile.username}`} target="_blank">
            <Eye className="w-4 h-4" />
            View Profile
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 min-h-screen bg-card border-r border-border flex-col fixed left-0 top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">UV</span>
            </div>
            <span className="text-lg font-bold gradient-text">UserVault</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="bg-primary"
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 mt-14 md:mt-0">
        {/* Desktop Header */}
        <header className="hidden md:block border-b border-border bg-card sticky top-0 z-50">
          <div className="px-4 sm:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {navItems.find(item => item.tab === activeTab)?.icon && (
                <span className="text-primary">
                  {(() => {
                    const Icon = navItems.find(item => item.tab === activeTab)?.icon;
                    return Icon ? <Icon className="w-5 h-5" /> : null;
                  })()}
                </span>
              )}
              <h1 className="text-xl font-semibold capitalize">{activeTab}</h1>
            </div>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="bg-primary"
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <OverviewStats
                  profileViews={profile.views_count || 0}
                  uidNumber={(profile as any).uid_number || 1}
                  username={profile.username}
                />

                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <BadgesCarousel badges={userBadges.map(ub => ({
                      id: ub.badge?.id || ub.id,
                      name: ub.badge?.name || 'Unknown',
                      icon_url: ub.badge?.icon_url,
                      color: ub.badge?.color,
                      description: ub.badge?.description,
                    }))} totalBadges={globalBadges.length || 10} />
                  </div>
                  <div>
                    <DiscordCard isConnected={!!discordUserId} />
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <RegisteredUsersList />
                  <EarlyBadgeCountdown />
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <ProfileVisitorsChart 
                    totalVisitors={profile.views_count || 0} 
                    profileId={profile.id}
                  />
                  <TopLinksChart 
                    links={socialLinks.slice(0, 5).map((link, i) => ({
                      name: link.title || link.platform,
                      clicks: 0,
                      color: ['#3B82F6', '#22C55E', '#EAB308', '#8B5CF6', '#EC4899'][i],
                      url: link.url,
                    }))}
                  />
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6 max-w-4xl">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Avatar Section */}
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Avatar</h3>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-xl bg-secondary overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
                            {displayName.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <Input
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="Avatar URL"
                          className="bg-secondary/50"
                        />
                        <div>
                          <Label className="text-xs text-muted-foreground">Avatar Shape</Label>
                          <div className="flex gap-2 mt-2">
                            {['square', 'soft', 'rounded', 'circle'].map((shape) => (
                              <Button
                                key={shape}
                                variant={avatarShape === shape ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setAvatarShape(shape)}
                                className="capitalize"
                              >
                                {shape}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="glass-card p-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="bg-secondary/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Occupation</Label>
                        <Input
                          value={occupation}
                          onChange={(e) => setOccupation(e.target.value)}
                          placeholder="Developer"
                          className="bg-secondary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          value={location_}
                          onChange={(e) => setLocation_(e.target.value)}
                          placeholder="Germany"
                          className="bg-secondary/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="glass-card p-6 space-y-4">
                  <Label>Bio</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the world about yourself..."
                    className="bg-secondary/50 resize-none min-h-[100px]"
                  />
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <CustomizationPanel
                  backgroundUrl={backgroundUrl}
                  setBackgroundUrl={setBackgroundUrl}
                  backgroundVideoUrl={backgroundVideoUrl}
                  setBackgroundVideoUrl={setBackgroundVideoUrl}
                  musicUrl={musicUrl}
                  setMusicUrl={setMusicUrl}
                  avatarUrl={avatarUrl}
                  setAvatarUrl={setAvatarUrl}
                  customCursorUrl={customCursorUrl}
                  setCustomCursorUrl={setCustomCursorUrl}
                  bio={bio}
                  setBio={setBio}
                  location={location_}
                  setLocation={setLocation_}
                  discordUserId={discordUserId}
                  setDiscordUserId={setDiscordUserId}
                  profileOpacity={profileOpacity}
                  setProfileOpacity={setProfileOpacity}
                  profileBlur={profileBlur}
                  setProfileBlur={setProfileBlur}
                  accentColor={accentColor}
                  setAccentColor={setAccentColor}
                  textColor={textColor}
                  setTextColor={setTextColor}
                  backgroundColor={backgroundColor}
                  setBackgroundColor={setBackgroundColor}
                  iconColor={iconColor}
                  setIconColor={setIconColor}
                  effects={effects}
                  setEffects={setEffects}
                  monochromeIcons={monochromeIcons}
                  setMonochromeIcons={setMonochromeIcons}
                  animatedTitle={animatedTitle}
                  setAnimatedTitle={setAnimatedTitle}
                  swapBioColors={swapBioColors}
                  setSwapBioColors={setSwapBioColors}
                  useDiscordAvatar={useDiscordAvatar}
                  setUseDiscordAvatar={setUseDiscordAvatar}
                  discordAvatarDecoration={discordAvatarDecoration}
                  setDiscordAvatarDecoration={setDiscordAvatarDecoration}
                  enableProfileGradient={enableProfileGradient}
                  setEnableProfileGradient={setEnableProfileGradient}
                  glowUsername={glowUsername}
                  setGlowUsername={setGlowUsername}
                  glowSocials={glowSocials}
                  setGlowSocials={setGlowSocials}
                  glowBadges={glowBadges}
                  setGlowBadges={setGlowBadges}
                  discordCardStyle={discordCardStyle}
                  setDiscordCardStyle={setDiscordCardStyle}
                  discordCardOpacity={discordCardOpacity}
                  setDiscordCardOpacity={setDiscordCardOpacity}
                  discordShowBadge={discordShowBadge}
                  setDiscordShowBadge={setDiscordShowBadge}
                  discordBadgeColor={discordBadgeColor}
                  setDiscordBadgeColor={setDiscordBadgeColor}
                  backgroundEffect={backgroundEffect}
                  setBackgroundEffect={setBackgroundEffect}
                  audioVolume={audioVolume}
                  setAudioVolume={setAudioVolume}
                  nameFont={nameFont}
                  setNameFont={setNameFont}
                  textFont={textFont}
                  setTextFont={setTextFont}
                />

                {/* Start Screen Settings */}
                <div className="glass-card p-6 mt-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Start Screen</h3>
                  </div>
                  <StartScreenSettings
                    enabled={startScreenEnabled}
                    onEnabledChange={setStartScreenEnabled}
                    text={startScreenText}
                    onTextChange={setStartScreenText}
                    font={startScreenFont}
                    onFontChange={setStartScreenFont}
                    textColor={startScreenColor}
                    onTextColorChange={setStartScreenColor}
                    bgColor={startScreenBgColor}
                    onBgColorChange={setStartScreenBgColor}
                    textAnimation={startScreenAnimation}
                    onTextAnimationChange={setStartScreenAnimation}
                    asciiSize={asciiSize}
                    onAsciiSizeChange={setAsciiSize}
                    asciiWaves={asciiWaves}
                    onAsciiWavesChange={setAsciiWaves}
                  />
                </div>

                {/* Volume Control Settings */}
                <div className="glass-card p-6 mt-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Volume2 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Volume Control</h3>
                  </div>
                  <VolumeControlSettings
                    enabled={showVolumeControl}
                    onEnabledChange={setShowVolumeControl}
                  />
                </div>

                {/* Profile Visibility Settings */}
                <div className="glass-card p-6 mt-6">
                  <ProfileVisibilitySettings
                    showUsername={showUsername}
                    showDisplayName={showDisplayName}
                    showBadges={showBadges}
                    showViews={showViews}
                    showAvatar={showAvatar}
                    showLinks={showLinks}
                    showDescription={showDescription}
                    onShowUsernameChange={setShowUsername}
                    onShowDisplayNameChange={setShowDisplayName}
                    onShowBadgesChange={setShowBadges}
                    onShowViewsChange={setShowViews}
                    onShowAvatarChange={setShowAvatar}
                    onShowLinksChange={setShowLinks}
                    onShowDescriptionChange={setShowDescription}
                  />
                </div>

                {/* Card Border Settings */}
                <div className="glass-card p-6 mt-6">
                  <CardBorderSettings
                    borderEnabled={cardBorderEnabled}
                    borderColor={cardBorderColor}
                    borderWidth={cardBorderWidth}
                    accentColor={accentColor}
                    onBorderEnabledChange={setCardBorderEnabled}
                    onBorderColorChange={setCardBorderColor}
                    onBorderWidthChange={setCardBorderWidth}
                  />
                </div>
              </div>
            )}

            {/* Links Tab */}
            {activeTab === 'links' && (
              <div className="space-y-6 max-w-4xl">
                <div className="glass-card p-6">
                  <SocialLinksGrid
                    existingLinks={socialLinks.map(l => ({ platform: l.platform }))}
                    onAddLink={async (platform, url, title) => {
                      if (!profile) return;
                      await createLink.mutateAsync({
                        profile_id: profile.id,
                        platform,
                        url,
                        title: title || null,
                        icon: null,
                        description: null,
                        style: 'card',
                        display_order: socialLinks.length,
                        is_visible: true,
                      });
                    }}
                    isLoading={createLink.isPending}
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Your Links</h3>
                  {socialLinks.map((link) => (
                    <div
                      key={link.id}
                      className="glass-card p-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <LinkIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{link.title || link.platform}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {link.url}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLink(link.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {socialLinks.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No links yet. Click an icon above to add one!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Widgets Tab */}
            {activeTab === 'widgets' && (
              <div className="space-y-6 max-w-4xl">
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Discord RPC</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Show your Discord presence and activity on your profile
                  </p>
                  <div className="space-y-2">
                    <Label>Discord User ID</Label>
                    <Input
                      value={discordUserId}
                      onChange={(e) => setDiscordUserId(e.target.value)}
                      placeholder="Your Discord User ID"
                      className="bg-secondary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can find your Discord User ID in Discord Settings → Advanced → Developer Mode
                    </p>
                  </div>
                </div>

                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Music className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Profile Music</h3>
                  </div>
                  <div className="space-y-2">
                    <Label>Music URL (MP3)</Label>
                    <Input
                      value={musicUrl}
                      onChange={(e) => setMusicUrl(e.target.value)}
                      placeholder="https://example.com/music.mp3"
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Effects Tab */}
            {activeTab === 'effects' && (
              <div className="space-y-6 max-w-4xl">
                <div className="glass-card p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Enhancements</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                      <div>
                        <Label>Animate Views</Label>
                        <p className="text-xs text-muted-foreground">
                          Animate view counter
                        </p>
                      </div>
                      <Switch
                        checked={true}
                        disabled
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                      <div>
                        <Label>Tilting Card</Label>
                        <p className="text-xs text-muted-foreground">
                          3D tilt effect on hover
                        </p>
                      </div>
                      <Switch
                        checked={effects.tilt}
                        onCheckedChange={(checked) =>
                          setEffects({ ...effects, tilt: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                      <div>
                        <Label>Glowing Icons</Label>
                        <p className="text-xs text-muted-foreground">
                          Glow effect on social links
                        </p>
                      </div>
                      <Switch
                        checked={effects.glow}
                        onCheckedChange={(checked) =>
                          setEffects({ ...effects, glow: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                      <div>
                        <Label>Sparkle Effect</Label>
                        <p className="text-xs text-muted-foreground">
                          Sparkles + cursor trail
                        </p>
                      </div>
                      <Switch
                        checked={effects.sparkles}
                        onCheckedChange={(checked) =>
                          setEffects({ ...effects, sparkles: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                      <div>
                        <Label>Typewriter Effect</Label>
                        <p className="text-xs text-muted-foreground">
                          Animated typing for name
                        </p>
                      </div>
                      <Switch
                        checked={effects.typewriter}
                        onCheckedChange={(checked) =>
                          setEffects({ ...effects, typewriter: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Badges Tab */}
            {activeTab === 'badges' && (
              <div className="space-y-6">
                {/* My Badges - Toggle Section */}
                {userBadges.filter((ub: any) => ub.is_enabled !== false).length > 0 && (
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Award className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Active Badges</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      These badges are visible on your profile. Toggle them off to hide.
                    </p>
                    <UserBadgesList 
                      userBadges={(userBadges as any).filter((ub: any) => ub.is_enabled !== false)} 
                      userId={user?.id || ''} 
                    />
                  </div>
                )}

                {/* Available Badges - includes disabled user badges + unclaimed global badges */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Award className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold">Available Badges</h3>
                  </div>
                  
                  {/* Disabled user badges */}
                  {userBadges.filter((ub: any) => ub.is_enabled === false).length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        Hidden badges - toggle them on to show on your profile.
                      </p>
                      <UserBadgesList 
                        userBadges={(userBadges as any).filter((ub: any) => ub.is_enabled === false)} 
                        userId={user?.id || ''} 
                      />
                    </div>
                  )}

                  {/* All badges (display only - no claiming, admin assignment only) */}
                  <BadgesGrid
                    globalBadges={globalBadges}
                    userBadgeIds={userBadges.map(ub => ub.badge_id)}
                  />
                </div>
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6 max-w-4xl">
                {/* Top Row - Badge Assigners */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass-card p-6">
                    <LimitedBadgeAssigner />
                  </div>
                  <div className="glass-card p-6">
                    <AdminBadgeRemover />
                  </div>
                </div>

                {/* All Badge Assigner */}
                <div className="glass-card p-6">
                  <AllBadgeAssigner />
                </div>

                {/* User Management Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass-card p-6">
                    <UserBanManager />
                  </div>
                  <div className="glass-card p-6">
                    <AdminUserManager />
                  </div>
                </div>

                {/* Badge Management - Collapsible */}
                <div className="glass-card p-6">
                  <AdminBadgeManager />
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <AccountSettings
                profile={profile ? { ...profile, username, display_name: displayName } : null}
                onUpdateUsername={handleUsernameChange}
                onSaveDisplayName={handleDisplayNameSave}
              />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { useCurrentUserProfile, useUpdateProfile, useSocialLinks, useCreateSocialLink, useDeleteSocialLink } from '@/hooks/useProfile';
import { useIsAdmin, useIsSupporter, useUserBadges, useGlobalBadges, useClaimBadge } from '@/hooks/useBadges';
import { BanAppealScreen } from '@/components/auth/BanAppealScreen';
import { FileUploader } from '@/components/dashboard/FileUploader';
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
  Send,
  Crown,
  ShoppingBag,
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
import { DiscordEmbedSettings } from '@/components/dashboard/DiscordEmbedSettings';
import { VolumeControlSettings } from '@/components/dashboard/VolumeControlSettings';
import { ProfileVisibilitySettings } from '@/components/dashboard/ProfileVisibilitySettings';
import { CardBorderSettings } from '@/components/dashboard/CardBorderSettings';
import { DisplayNameAnimationSettings } from '@/components/dashboard/DisplayNameAnimationSettings';
import { AdminBadgeManager } from '@/components/admin/AdminBadgeManager';
import { AdminUserManager } from '@/components/admin/AdminUserManager';
import { AdminPremiumManager } from '@/components/admin/AdminPremiumManager';
 import { AdminBotNotificationTester } from '@/components/admin/AdminBotNotificationTester';
import { BadgesGrid } from '@/components/dashboard/BadgesGrid';
import { UserBadgesList } from '@/components/dashboard/UserBadgesList';
import { LimitedBadgeAssigner } from '@/components/admin/LimitedBadgeAssigner';
import { AdminBadgeRemover } from '@/components/admin/AdminBadgeRemover';
import { AllBadgeAssigner } from '@/components/admin/AllBadgeAssigner';
import { UserBanManager } from '@/components/admin/UserBanManager';
import { AdminSupportTickets } from '@/components/admin/AdminSupportTickets';
import { AdminLiveChat } from '@/components/admin/AdminLiveChat';
import { AdminAccountLookup } from '@/components/admin/AdminAccountLookup';
import { AdminUIDManager } from '@/components/admin/AdminUIDManager';
import { AdminPurchaseHistory } from '@/components/admin/AdminPurchaseHistory';
import { AdminPromoCodeManager } from '@/components/admin/AdminPromoCodeManager';
import { AdminEarlyBadgeCounter } from '@/components/admin/AdminEarlyBadgeCounter';
import { SocialLinksGrid } from '@/components/dashboard/SocialLinksGrid';
import { BadgeRequestForm } from '@/components/dashboard/BadgeRequestForm';
import { CustomizationPanel } from '@/components/dashboard/CustomizationPanel';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { LiveProfilePreview } from '@/components/dashboard/LiveProfilePreview';
import { AliasRequestsSection } from '@/components/dashboard/AliasRequestsSection';
import { AliasRequestsBell } from '@/components/dashboard/AliasRequestsBell';
import { DashboardLayout, type TabType } from '@/components/dashboard/DashboardLayout';
import { ProfileCommentsViewer } from '@/components/dashboard/ProfileCommentsViewer';
import { DiscordBotVerification } from '@/components/dashboard/DiscordBotVerification';
import { FriendBadgesManager } from '@/components/dashboard/FriendBadgesManager';
import { AdminEventController } from '@/components/admin/AdminEventController';
import { AdminNotificationSender } from '@/components/admin/AdminNotificationSender';
import { AdminMarketplaceManager } from '@/components/admin/AdminMarketplaceManager';
import { MarketplacePage } from '@/components/marketplace/MarketplacePage';
import { GlobalBadgeColorSettings } from '@/components/dashboard/GlobalBadgeColorSettings';
import { StreakDisplay } from '@/components/dashboard/StreakDisplay';
import { SupporterPanel } from '@/components/supporter/SupporterPanel';
import { SupporterManager } from '@/components/admin/SupporterManager';
import { NotificationsSection } from '@/components/dashboard/NotificationsSection';
import { cn } from '@/lib/utils';

// Removed local TabType - using exported type from DashboardLayout

// Secret DB viewer (super-admin only)
const SECRET_DB_VIEWER_PATH =
  '/x7k9m2p4q8r1s5t3u6v0w2y4z7a9b1c3d5e7f0g2h4i6j8k0l2m4n6o8p0q2r4s6t8u0v2w4x6y8z0a1b3c5d7e9f1g3h5i7j9k1l3m5n7o9p1q3r5s7t9u1v3w5x7y9z';
const SECRET_DB_ALLOWED_UIDS = [1, 2, 999] as const;

const baseNavItems: { icon: React.ElementType; label: string; tab: TabType }[] = [
  { icon: LayoutDashboard, label: 'Overview', tab: 'overview' },
  { icon: User, label: 'Profile', tab: 'profile' },
  { icon: Palette, label: 'Appearance', tab: 'appearance' },
  { icon: LinkIcon, label: 'Links', tab: 'links' },
  { icon: Award, label: 'Badges', tab: 'badges' },
  { icon: ShoppingBag, label: 'Marketplace', tab: 'marketplace' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
];

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentUserProfile();
  const { data: socialLinks = [] } = useSocialLinks(profile?.id || '');
  const { data: isAdmin = false } = useIsAdmin();
  const { data: isSupporter = false } = useIsSupporter();
  const { data: userBadges = [] } = useUserBadges(user?.id || '');
  const { data: globalBadges = [] } = useGlobalBadges();
  const claimBadge = useClaimBadge();
  const updateProfile = useUpdateProfile();
  const createLink = useCreateSocialLink();
  const deleteLink = useDeleteSocialLink();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Build nav items based on admin/supporter status
  const navItems = [
    ...baseNavItems,
    ...((isSupporter || isAdmin) ? [{ icon: Shield, label: 'Supporter', tab: 'supporter' as TabType }] : []),
    ...(isAdmin ? [{ icon: Shield, label: 'Owner Panel', tab: 'owner' as TabType }] : []),
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
    cursorTrail: false,
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
  const [iconOnlyLinks, setIconOnlyLinks] = useState(false);
  const [iconLinksOpacity, setIconLinksOpacity] = useState(100);

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
  
  // Display Name Animation
  const [displayNameAnimation, setDisplayNameAnimation] = useState<string>('none');

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
  const [showLikes, setShowLikes] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [transparentBadges, setTransparentBadges] = useState(false);

  // Card border settings
  const [cardBorderEnabled, setCardBorderEnabled] = useState(true);
  const [cardBorderColor, setCardBorderColor] = useState('');
  const [cardBorderWidth, setCardBorderWidth] = useState(1);

  // Alias username
  const [aliasUsername, setAliasUsername] = useState('');

  // OG/Discord Embed settings
  const [ogEnabled, setOgEnabled] = useState(false);
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [ogIconUrl, setOgIconUrl] = useState('');
  const [ogTitleAnimation, setOgTitleAnimation] = useState('none');
  const [ogEmbedColor, setOgEmbedColor] = useState('#5865F2');
  
  // Global badge color settings
  const [useGlobalBadgeColor, setUseGlobalBadgeColor] = useState(false);
  const [globalBadgeColor, setGlobalBadgeColor] = useState('#8B5CF6');

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ban status state
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [banCheckDone, setBanCheckDone] = useState(false);

  // Links state
  const [newLinkPlatform, setNewLinkPlatform] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');

  // Check ban status (server-side) to ensure suspended users cannot access /dashboard even via manual URL.
  useEffect(() => {
    let cancelled = false;

    const checkBanStatus = async () => {
      // No user => nothing to check
      if (!user) {
        if (!cancelled) {
          setIsBanned(false);
          setBanReason(null);
          setAppealSubmitted(false);
          setBanCheckDone(true);
        }
        return;
      }

      if (!cancelled) setBanCheckDone(false);

      try {
        const { data, error } = await supabase.functions.invoke('check-ban-status', {
          body: { userId: user.id },
        });

        if (error) throw error;

        if (!cancelled) {
          setIsBanned(!!data?.isBanned);
          setBanReason(data?.reason ?? null);
          setAppealSubmitted(!!data?.appealSubmitted);
        }
      } catch (err) {
        console.error('Error checking ban status:', err);
        if (!cancelled) {
          // Fail-safe: if ban check fails, do not lock out the dashboard.
          setIsBanned(false);
          setBanReason(null);
          setAppealSubmitted(false);
        }
      } finally {
        if (!cancelled) setBanCheckDone(true);
      }
    };

    checkBanStatus();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Check MFA status and redirect if not verified
  useEffect(() => {
    const checkMfaStatus = async () => {
      if (authLoading) return;
      if (!banCheckDone) return;
      if (isBanned) return;

      if (!user) {
        navigate('/auth');
        return;
      }

      // If we just completed MFA, we may still be in a short token propagation window.
      // Use BOTH navigation state and a sessionStorage fallback (state can be lost on reloads).
      const cameFromMfaState = (location.state as any)?.mfaJustVerified === true;
      const mfaJustVerifiedAt = Number(sessionStorage.getItem('uv_mfa_just_verified') || 0);
      const isRecentMfa = cameFromMfaState || (mfaJustVerifiedAt > 0 && Date.now() - mfaJustVerifiedAt < 30_000);

      const needsMfa = async () => {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        return !!aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1';
      };

      if (isRecentMfa) {
        // Try harder to settle into the AAL2 session before enforcing a redirect.
        for (let i = 0; i < 6; i++) {
          if (!(await needsMfa())) {
            try {
              sessionStorage.removeItem('uv_mfa_just_verified');
            } catch {
              // ignore
            }
            return;
          }

          if (i === 0) {
            await supabase.auth.refreshSession();
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        // Still not AAL2 after settling attempts → require MFA again.
        navigate('/auth?mfa=required', { replace: true });
        return;
      }

      // First check
      if (!(await needsMfa())) return;

      // Retry once after a refresh (covers transient races)
      await supabase.auth.refreshSession();
      await new Promise((r) => setTimeout(r, 200));

      if (await needsMfa()) {
        navigate('/auth?mfa=required', { replace: true });
      }
    };

    checkMfaStatus();
  }, [user, authLoading, navigate, isBanned, banCheckDone, location.state]);

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
      setIconOnlyLinks((profile as any).icon_only_links ?? false);
      setIconLinksOpacity((profile as any).icon_links_opacity ?? 100);
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
      setDisplayNameAnimation((profile as any).display_name_animation || 'none');
      setShowVolumeControl((profile as any).show_volume_control ?? true);
      setShowUsername((profile as any).show_username ?? true);
      setShowDisplayName((profile as any).show_display_name ?? true);
      setShowBadges((profile as any).show_badges ?? true);
      setShowViews((profile as any).show_views ?? true);
      setShowAvatar((profile as any).show_avatar ?? true);
      setShowLinks((profile as any).show_links ?? true);
      setShowDescription((profile as any).show_description ?? true);
      setShowLikes((profile as any).show_likes ?? true);
      setShowComments((profile as any).show_comments ?? true);
      setTransparentBadges((profile as any).transparent_badges ?? false);
      setCardBorderEnabled((profile as any).card_border_enabled ?? true);
      setCardBorderColor((profile as any).card_border_color || '');
      setCardBorderWidth((profile as any).card_border_width ?? 1);
      setAliasUsername((profile as any).alias_username || '');
      // OG Settings
      setOgEnabled(!!((profile as any).og_title || (profile as any).og_description || (profile as any).og_image_url || (profile as any).og_icon_url));
      setOgTitle((profile as any).og_title || '');
      setOgDescription((profile as any).og_description || '');
      setOgImageUrl((profile as any).og_image_url || '');
      setOgIconUrl((profile as any).og_icon_url || '');
      setOgTitleAnimation((profile as any).og_title_animation || 'none');
      setOgEmbedColor((profile as any).og_embed_color || '#5865F2');
      // Global badge color settings
      setUseGlobalBadgeColor((profile as any).use_global_badge_color ?? false);
      setGlobalBadgeColor((profile as any).global_badge_color || '#8B5CF6');
      const config = profile.effects_config as Record<string, any> || {};
      setEffects({
        sparkles: config.sparkles ?? false,
        tilt: config.tilt ?? true,
        glow: config.glow ?? false,
        typewriter: config.typewriter ?? false,
        cursorTrail: config.cursorTrail ?? false,
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

  const handleAliasChange = async (newAlias: string | null) => {
    if (newAlias && (newAlias.length < 1 || newAlias.length > 20)) {
      toast({ title: 'Alias must be 1-20 characters', variant: 'destructive' });
      return;
    }
    
    if (newAlias && !/^[a-zA-Z0-9_]+$/.test(newAlias)) {
      toast({ title: 'Alias can only contain letters, numbers, and underscores', variant: 'destructive' });
      return;
    }

    // Check 7-day cooldown
    const aliasChangedAt = (profile as any)?.alias_changed_at;
    if (newAlias && aliasChangedAt) {
      const lastChanged = new Date(aliasChangedAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (lastChanged > sevenDaysAgo) {
        const nextAllowedDate = new Date(lastChanged);
        nextAllowedDate.setDate(nextAllowedDate.getDate() + 7);
        const daysRemaining = Math.ceil((nextAllowedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        toast({ 
          title: 'Alias change limit', 
          description: `You can change your alias again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
          variant: 'destructive' 
        });
        return;
      }
    }

    if (newAlias) {
      // Check if alias is taken (as username or alias)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username, alias_username')
        .or(`username.eq.${newAlias.toLowerCase()},alias_username.eq.${newAlias.toLowerCase()}`)
        .neq('user_id', user?.id || '')
        .maybeSingle();

      if (existingProfile) {
        toast({ title: 'This handle is already taken', variant: 'destructive' });
        return;
      }
    }

    try {
      await updateProfile.mutateAsync({
        alias_username: newAlias?.toLowerCase() || null,
        alias_changed_at: newAlias ? new Date().toISOString() : null,
      } as any);
      setAliasUsername(newAlias?.toLowerCase() || '');
      toast({ title: newAlias ? 'Alias updated!' : 'Alias removed!' });
    } catch (error: any) {
      toast({ title: error.message || 'Error updating alias', variant: 'destructive' });
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
        icon_only_links: iconOnlyLinks,
        icon_links_opacity: iconLinksOpacity,
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
        show_likes: showLikes,
        show_comments: showComments,
        transparent_badges: transparentBadges,
        card_border_enabled: cardBorderEnabled,
        card_border_color: cardBorderColor || null,
        card_border_width: cardBorderWidth,
        og_title: ogEnabled ? (ogTitle || null) : null,
        og_description: ogEnabled ? (ogDescription || null) : null,
        og_image_url: ogEnabled ? (ogImageUrl || null) : null,
        og_icon_url: ogEnabled ? (ogIconUrl || null) : null,
        og_title_animation: ogEnabled ? ogTitleAnimation : 'none',
        og_embed_color: ogEnabled ? (ogEmbedColor || null) : null,
        use_global_badge_color: useGlobalBadgeColor,
        global_badge_color: useGlobalBadgeColor ? (globalBadgeColor || null) : null,
        display_name_animation: displayNameAnimation,
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

  // Block rendering until auth/profile AND ban-status have been resolved.
  // This prevents a banned user from seeing the dashboard briefly (URL can be typed manually).
  if (authLoading || profileLoading || !banCheckDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the account is suspended, ALWAYS show the appeal screen (even on /dashboard typed manually).
  if (isBanned && user) {
    return (
      <BanAppealScreen
        userId={user.id}
        reason={banReason}
        appealSubmitted={appealSubmitted}
        onLogout={handleSignOut}
      />
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
    <div className="flex flex-col h-full bg-gradient-to-b from-card via-card to-black/20">
      {/* Logo */}
      <div className="p-4 sm:p-6 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3 group">
          <motion.div 
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <span className="text-white font-bold text-sm">UV</span>
          </motion.div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary via-white to-accent bg-clip-text text-transparent">UserVault</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          
          return (
            <motion.button
              key={item.tab}
              onClick={() => {
                handleTabChange(item.tab);
                setMobileMenuOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left relative overflow-hidden group',
                isActive 
                  ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-white' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 4 }}
            >
              {isActive && (
                <motion.div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-r-full"
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={cn(
                'w-5 h-5 transition-colors',
                isActive ? 'text-primary' : 'text-white/60 group-hover:text-primary'
              )} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div 
                  className="ml-auto w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 sm:p-4 border-t border-white/5 space-y-2">
        {/* Premium Button */}
        {!(profile as any)?.is_premium && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 rounded-xl h-11" 
              asChild
            >
              <Link to="/premium">
                <Crown className="w-4 h-4" />
                <span className="font-medium">Upgrade to Premium</span>
              </Link>
            </Button>
          </motion.div>
        )}
        
        {(profile as any)?.is_premium && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/20">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-amber-400">Premium</span>
              <p className="text-xs text-amber-400/60">All features unlocked</p>
            </div>
          </div>
        )}

        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl h-11" 
          asChild
        >
          <Link to={`/${profile.username}`} target="_blank">
            <Eye className="w-4 h-4" />
            <span>View Profile</span>
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-11"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <DashboardLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isAdmin={isAdmin}
        isSupporter={isSupporter}
        isPremium={(profile as any)?.is_premium ?? false}
        username={profile.username}
        onSignOut={handleSignOut}
        onSave={handleSave}
        isSaving={updateProfile.isPending}
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Alias Requests Section - shows only if there are pending requests */}
            <AliasRequestsSection />

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <OverviewStats
                profileViews={profile.views_count || 0}
                uidNumber={(profile as any).uid_number || 1}
                username={profile.username}
                profileId={profile.id}
              />
            </div>
            <div>
              <StreakDisplay />
            </div>
          </div>

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
            <div className="space-y-4">
              <DiscordBotVerification 
                userId={user?.id} 
                discordUserId={discordUserId} 
              />
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
              links={[...socialLinks]
                .sort((a, b) => ((b as any).click_count || 0) - ((a as any).click_count || 0))
                .slice(0, 5)
                .map((link, i) => ({
                  name: link.title || link.platform,
                  clicks: (link as any).click_count || 0,
                  color: ['#3B82F6', '#22C55E', '#EAB308', '#8B5CF6', '#EC4899'][i],
                  url: link.url,
                }))}
            />
          </div>

          {/* Comments Section */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center border border-amber-500/20">
                <MessageSquare className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Profile Comments</h3>
                <p className="text-xs text-white/40">Comments from visitors on your profile</p>
              </div>
            </div>
            <ProfileCommentsViewer />
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Avatar Section */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Avatar</h3>
                  <p className="text-xs text-white/40">Your profile picture</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <FileUploader
                  type="avatar"
                  currentUrl={avatarUrl}
                  onUpload={setAvatarUrl}
                  onRemove={() => setAvatarUrl('')}
                />
                <div>
                  <Label className="text-xs text-white/50">Avatar Shape</Label>
                  <div className="flex gap-2 mt-2">
                    {['square', 'soft', 'rounded', 'circle'].map((shape) => (
                      <Button
                        key={shape}
                        variant={avatarShape === shape ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAvatarShape(shape)}
                        className={`capitalize ${avatarShape === shape ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'}`}
                      >
                        {shape}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-white/60">Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/60">Occupation</Label>
                  <Input
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Developer"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/60">Location</Label>
                  <Input
                    value={location_}
                    onChange={(e) => setLocation_(e.target.value)}
                    placeholder="Germany"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 space-y-4">
            <Label className="text-white/60">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the world about yourself..."
              className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/30 resize-none min-h-[100px]"
            />
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="sticky top-14 md:top-20 z-40">
            <LiveProfilePreview
              username={username}
              displayName={displayName}
              bio={bio}
              avatarUrl={avatarUrl}
              avatarShape={avatarShape}
              backgroundColor={backgroundColor}
              accentColor={accentColor}
              textColor={textColor}
              backgroundUrl={backgroundUrl}
              backgroundVideoUrl={backgroundVideoUrl}
              backgroundEffect={backgroundEffect as any}
              showUsername={showUsername}
              showDisplayName={showDisplayName}
              showBadges={showBadges}
              showViews={showViews}
              showAvatar={showAvatar}
              showDescription={showDescription}
              showLinks={showLinks}
              viewsCount={profile?.views_count || 0}
              badges={userBadges.filter(ub => ub.is_enabled).map(ub => {
                const badge = globalBadges.find(gb => gb.id === ub.badge_id);
                return badge ? { id: badge.id, name: badge.name, color: badge.color || null, icon_url: badge.icon_url } : null;
              }).filter(Boolean) as any[]}
              socialLinks={socialLinks}
              cardBorderEnabled={cardBorderEnabled}
              cardBorderColor={cardBorderColor}
              cardBorderWidth={cardBorderWidth}
              nameFont={nameFont}
              textFont={textFont}
              iconColor={iconColor}
              monochromeIcons={monochromeIcons}
              cardColor={undefined}
              effects={effects}
              occupation={occupation}
              location={location_}
              uidNumber={(profile as any)?.uid_number || 1}
              glowSocials={glowSocials}
              iconOnlyLinks={iconOnlyLinks}
              iconLinksOpacity={iconLinksOpacity}
              enableRainbow={enableProfileGradient}
              glowUsername={glowUsername}
              customCursorUrl={customCursorUrl}
              displayNameAnimation={displayNameAnimation}
              asciiSize={asciiSize}
              asciiWaves={asciiWaves}
            />
          </div>

          {/* Settings */}
          <div className="space-y-6 min-w-0">
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
                    transparentBadges={transparentBadges}
                    setTransparentBadges={setTransparentBadges}
                    iconOnlyLinks={iconOnlyLinks}
                    setIconOnlyLinks={setIconOnlyLinks}
                    iconLinksOpacity={iconLinksOpacity}
                    setIconLinksOpacity={setIconLinksOpacity}
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
                    isPremium={(profile as any)?.is_premium ?? false}
                  />

                  {/* Additional Settings - Compact Cards */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Start Screen */}
                    <div className="glass-card p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-sm">Start Screen</h3>
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
                        hasAudio={Boolean(musicUrl || backgroundVideoUrl)}
                        isPremium={(profile as any)?.is_premium ?? false}
                      />
                    </div>

                    {/* Display Name Animation */}
                    <div className="glass-card p-4">
                      <DisplayNameAnimationSettings
                        animation={displayNameAnimation}
                        onAnimationChange={setDisplayNameAnimation}
                        asciiSize={asciiSize}
                        onAsciiSizeChange={setAsciiSize}
                        asciiWaves={asciiWaves}
                        onAsciiWavesChange={setAsciiWaves}
                        isPremium={(profile as any)?.is_premium ?? false}
                      />
                    </div>

                    {/* Social Embed */}
                    <div className="glass-card p-4">
                      <DiscordEmbedSettings
                        enabled={ogEnabled}
                        onEnabledChange={setOgEnabled}
                        ogTitle={ogTitle}
                        onOgTitleChange={setOgTitle}
                        ogDescription={ogDescription}
                        onOgDescriptionChange={setOgDescription}
                        ogImageUrl={ogImageUrl}
                        onOgImageUrlChange={setOgImageUrl}
                        ogIconUrl={ogIconUrl}
                        onOgIconUrlChange={setOgIconUrl}
                        ogTitleAnimation={ogTitleAnimation}
                        onOgTitleAnimationChange={setOgTitleAnimation}
                        ogEmbedColor={ogEmbedColor}
                        onOgEmbedColorChange={setOgEmbedColor}
                        username={username}
                      />
                    </div>
                  </div>

                  {/* Visibility & Card Settings Row */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Profile Visibility */}
                    <div className="glass-card p-4">
                      <ProfileVisibilitySettings
                        showUsername={showUsername}
                        showDisplayName={showDisplayName}
                        showBadges={showBadges}
                        showViews={showViews}
                        showAvatar={showAvatar}
                        showLinks={showLinks}
                        showDescription={showDescription}
                        showLikes={showLikes}
                        showComments={showComments}
                        onShowUsernameChange={setShowUsername}
                        onShowDisplayNameChange={setShowDisplayName}
                        onShowBadgesChange={setShowBadges}
                        onShowViewsChange={setShowViews}
                        onShowAvatarChange={setShowAvatar}
                        onShowLinksChange={setShowLinks}
                        onShowDescriptionChange={setShowDescription}
                        onShowLikesChange={setShowLikes}
                        onShowCommentsChange={setShowComments}
                      />
                    </div>

                    {/* Card & Volume Settings */}
                    <div className="glass-card p-4 space-y-4">
                      <CardBorderSettings
                        borderEnabled={cardBorderEnabled}
                        borderColor={cardBorderColor}
                        borderWidth={cardBorderWidth}
                        accentColor={accentColor}
                        onBorderEnabledChange={setCardBorderEnabled}
                        onBorderColorChange={setCardBorderColor}
                        onBorderWidthChange={setCardBorderWidth}
                      />
                      <div className="border-t border-border/30 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Volume2 className="w-4 h-4 text-primary" />
                          <h3 className="font-medium text-sm">Volume Control</h3>
                        </div>
                        <VolumeControlSettings
                          enabled={showVolumeControl}
                          onEnabledChange={setShowVolumeControl}
                        />
                      </div>
                    </div>
                  </div>
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


            {/* Badges Tab */}
            {activeTab === 'badges' && (
              <div className="space-y-6">
                {/* Request Custom Badge */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Send className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Request Custom Badge</h3>
                  </div>
                  <BadgeRequestForm />
                </div>

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

                {/* Hidden Badges - only show if user has hidden badges */}
                {userBadges.filter((ub: any) => ub.is_enabled === false).length > 0 && (
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Award className="w-5 h-5 text-muted-foreground" />
                      <h3 className="font-semibold">Hidden Badges</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      These badges are hidden from your profile. Toggle them on to show.
                    </p>
                    <UserBadgesList 
                      userBadges={(userBadges as any).filter((ub: any) => ub.is_enabled === false)} 
                      userId={user?.id || ''} 
                    />
                  </div>
                )}

                {/* Friend Badges */}
                <div className="glass-card p-6">
                  <FriendBadgesManager />
                </div>

                {/* Global Badge Color Settings */}
                <GlobalBadgeColorSettings
                  useGlobalColor={useGlobalBadgeColor}
                  onUseGlobalColorChange={setUseGlobalBadgeColor}
                  globalColor={globalBadgeColor}
                  onGlobalColorChange={setGlobalBadgeColor}
                />
              </div>
            )}

            {/* Marketplace Tab */}
            {activeTab === 'marketplace' && (
              <MarketplacePage />
            )}

            {/* Supporter Tab */}
            {activeTab === 'supporter' && (isSupporter || isAdmin) && (
              <SupporterPanel />
            )}

            {/* Owner Panel Tab */}
            {activeTab === 'owner' && isAdmin && (
              <div className="space-y-4 max-w-6xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Owner Panel</h1>
                    <p className="text-sm text-muted-foreground">
                      Full administrative control over the platform
                    </p>
                  </div>
                </div>

                {/* Secret DB Viewer shortcut (super-admin by UID) */}
                {SECRET_DB_ALLOWED_UIDS.includes((profile?.uid_number as any) ?? -1) && (
                  <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-semibold">Database Viewer</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Öffnet die geheime Read-Only Datenbank-Ansicht (UID-Whitelist + MFA Pflicht).
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate(SECRET_DB_VIEWER_PATH)}
                    >
                      DB Viewer öffnen
                    </Button>
                  </div>
                )}

                {/* Supporter Manager - Add/Remove Supporters */}
                <div className="glass-card p-6">
                  <SupporterManager />
                </div>

                {/* Live Notification Sender */}
                <div className="glass-card p-6">
                  <AdminNotificationSender />
                </div>

                {/* Badge Events Controller */}
                <div className="glass-card p-6">
                  <AdminEventController />
                </div>

                {/* EARLY Badge Counter */}
                <div className="glass-card p-6">
                  <AdminEarlyBadgeCounter />
                </div>

                {/* Account Lookup - Full Width Top */}
                <div className="glass-card p-6">
                  <AdminAccountLookup />
                </div>

                {/* Admin Tools Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {/* Premium Manager */}
                  <div className="glass-card p-5 lg:col-span-1">
                    <AdminPremiumManager />
                  </div>

                  {/* User Ban Manager */}
                  <div className="glass-card p-5">
                    <UserBanManager />
                  </div>

                  {/* User Role Manager */}
                  <div className="glass-card p-5">
                    <AdminUserManager />
                  </div>

                  {/* Limited Badge Assigner */}
                  <div className="glass-card p-5">
                    <LimitedBadgeAssigner />
                  </div>

                  {/* All Badge Assigner */}
                  <div className="glass-card p-5">
                    <AllBadgeAssigner />
                  </div>

                  {/* Badge Remover */}
                  <div className="glass-card p-5">
                    <AdminBadgeRemover />
                  </div>
                </div>

                {/* Marketplace Approvals */}
                <div className="glass-card p-6">
                  <AdminMarketplaceManager />
                </div>

                {/* Promo Codes Manager - Full Width */}
                <div className="glass-card p-6">
                  <AdminPromoCodeManager />
                </div>

                {/* Purchase History - Full Width */}
                <AdminPurchaseHistory />

                {/* Full Width Bottom Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass-card p-5">
                    <AdminUIDManager />
                  </div>
                  <div className="glass-card p-5">
                    <AdminBadgeManager />
                  </div>
                </div>

                {/* Bot Notification Tester */}
                <div className="glass-card p-5">
                  <AdminBotNotificationTester />
                </div>
              </div>
            )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <AccountSettings
          profile={profile ? { ...profile, username, display_name: displayName, alias_username: aliasUsername, uid_number: profile.uid_number } : null}
          onUpdateUsername={handleUsernameChange}
          onSaveDisplayName={handleDisplayNameSave}
          onUpdateAlias={handleAliasChange}
        />
      )}
      </DashboardLayout>
    </>
  );
}

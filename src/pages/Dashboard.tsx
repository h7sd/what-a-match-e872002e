import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { useCurrentUserProfile, useUpdateProfile, useSocialLinks, useCreateSocialLink, useDeleteSocialLink } from '@/hooks/useProfile';
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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentUserProfile();
  const { data: socialLinks = [] } = useSocialLinks(profile?.id || '');
  const updateProfile = useUpdateProfile();
  const createLink = useCreateSocialLink();
  const deleteLink = useDeleteSocialLink();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarShape, setAvatarShape] = useState('circle');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  
  // Appearance state
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0a');
  const [accentColor, setAccentColor] = useState('#8b5cf6');
  const [nameFont, setNameFont] = useState('Inter');
  const [textFont, setTextFont] = useState('Inter');
  const [layoutStyle, setLayoutStyle] = useState('stacked');
  const [cardStyle, setCardStyle] = useState('classic');
  
  // Music & Effects state
  const [musicUrl, setMusicUrl] = useState('');
  const [discordUserId, setDiscordUserId] = useState('');
  const [effects, setEffects] = useState({
    sparkles: false,
    tilt: true,
    glow: false,
    typewriter: false,
  });

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
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setAvatarShape((profile as any).avatar_shape || 'circle');
      setOccupation((profile as any).occupation || '');
      setLocation((profile as any).location || '');
      setBackgroundUrl(profile.background_url || '');
      setBackgroundVideoUrl((profile as any).background_video_url || '');
      setBackgroundColor(profile.background_color || '#0a0a0a');
      setAccentColor(profile.accent_color || '#8b5cf6');
      setNameFont((profile as any).name_font || 'Inter');
      setTextFont((profile as any).text_font || 'Inter');
      setLayoutStyle((profile as any).layout_style || 'stacked');
      setCardStyle((profile as any).card_style || 'classic');
      setMusicUrl(profile.music_url || '');
      setDiscordUserId((profile as any).discord_user_id || '');
      const config = profile.effects_config || {};
      setEffects({
        sparkles: config.sparkles ?? false,
        tilt: config.tilt ?? true,
        glow: config.glow ?? false,
        typewriter: config.typewriter ?? false,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: displayName,
        bio,
        avatar_url: avatarUrl || null,
        background_url: backgroundUrl || null,
        background_color: backgroundColor,
        accent_color: accentColor,
        music_url: musicUrl || null,
        effects_config: effects,
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

  const fonts = ['Inter', 'Poppins', 'Roboto', 'Montserrat', 'Cinzel', 'Playfair Display', 'Space Grotesk'];
  const cardStyles = ['classic', 'frosted', 'outlined', 'aurora', 'transparent'];
  const layoutStyles = ['stacked', 'floating', 'compact'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold gradient-text">
            UserVault
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to={`/${profile.username}`} target="_blank">
                <Eye className="w-4 h-4 mr-2" />
                View Profile
              </Link>
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-purple-500"
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="h-12 bg-transparent border-0 gap-6">
              <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0">
                Profile
              </TabsTrigger>
              <TabsTrigger value="appearance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0">
                Appearance
              </TabsTrigger>
              <TabsTrigger value="links" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0">
                Links
              </TabsTrigger>
              <TabsTrigger value="widgets" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0">
                Widgets
              </TabsTrigger>
              <TabsTrigger value="effects" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0">
                Effects
              </TabsTrigger>
            </TabsList>

            {/* Main Content */}
            <main className="py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-muted-foreground mb-8">
                  Customize your profile at{' '}
                  <Link
                    to={`/${profile.username}`}
                    className="text-primary hover:underline"
                    target="_blank"
                  >
                    uservault.app/{profile.username}
                  </Link>
                </p>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6 mt-0">
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
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
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
                </TabsContent>

                {/* Appearance Tab */}
                <TabsContent value="appearance" className="space-y-6 mt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Colors */}
                    <div className="glass-card p-6 space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Colors</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Theme Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="w-12 h-10 p-1 bg-transparent cursor-pointer"
                            />
                            <Input
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="bg-secondary/50"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Background</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={backgroundColor}
                              onChange={(e) => setBackgroundColor(e.target.value)}
                              className="w-12 h-10 p-1 bg-transparent cursor-pointer"
                            />
                            <Input
                              value={backgroundColor}
                              onChange={(e) => setBackgroundColor(e.target.value)}
                              className="bg-secondary/50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fonts */}
                    <div className="glass-card p-6 space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-primary font-bold">A</span>
                        <h3 className="font-semibold">Font</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name Font</Label>
                          <Select value={nameFont} onValueChange={setNameFont}>
                            <SelectTrigger className="bg-secondary/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fonts.map((font) => (
                                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                                  {font}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Text Font</Label>
                          <Select value={textFont} onValueChange={setTextFont}>
                            <SelectTrigger className="bg-secondary/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fonts.map((font) => (
                                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                                  {font}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Background Media */}
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Layout className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Background</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input
                          value={backgroundUrl}
                          onChange={(e) => setBackgroundUrl(e.target.value)}
                          placeholder="https://..."
                          className="bg-secondary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Video URL (MP4)</Label>
                        <Input
                          value={backgroundVideoUrl}
                          onChange={(e) => setBackgroundVideoUrl(e.target.value)}
                          placeholder="https://example.com/video.mp4"
                          className="bg-secondary/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Layout & Card Style */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass-card p-6 space-y-4">
                      <h3 className="font-semibold">Layout Style</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {layoutStyles.map((style) => (
                          <button
                            key={style}
                            onClick={() => setLayoutStyle(style)}
                            className={`p-4 rounded-lg border-2 transition-all capitalize ${
                              layoutStyle === style
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card p-6 space-y-4">
                      <h3 className="font-semibold">Card Style</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {cardStyles.map((style) => (
                          <button
                            key={style}
                            onClick={() => setCardStyle(style)}
                            className={`p-4 rounded-lg border-2 transition-all capitalize ${
                              cardStyle === style
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Links Tab */}
                <TabsContent value="links" className="space-y-6 mt-0">
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Add New Link</h3>
                      </div>
                      <Button onClick={handleAddLink} disabled={createLink.isPending || !newLinkUrl}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Link
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                      <Input
                        value={newLinkPlatform}
                        onChange={(e) => setNewLinkPlatform(e.target.value)}
                        placeholder="Platform (Discord, TikTok...)"
                        className="bg-secondary/50"
                      />
                      <Input
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="bg-secondary/50"
                      />
                      <Input
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="URL"
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
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
                        <p>No links yet. Add your first link above!</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Widgets Tab */}
                <TabsContent value="widgets" className="space-y-6 mt-0">
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
                </TabsContent>

                {/* Effects Tab */}
                <TabsContent value="effects" className="space-y-6 mt-0">
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
                </TabsContent>
              </motion.div>
            </main>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

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
  Settings,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentUserProfile();
  const { data: socialLinks = [] } = useSocialLinks(profile?.id || '');
  const updateProfile = useUpdateProfile();
  const createLink = useCreateSocialLink();
  const deleteLink = useDeleteSocialLink();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0a');
  const [accentColor, setAccentColor] = useState('#8b5cf6');
  const [musicUrl, setMusicUrl] = useState('');
  const [effects, setEffects] = useState({
    sparkles: false,
    tilt: true,
    glow: false,
    typewriter: false,
  });

  const [newLinkPlatform, setNewLinkPlatform] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

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
      setBackgroundUrl(profile.background_url || '');
      setBackgroundColor(profile.background_color || '#0a0a0a');
      setAccentColor(profile.accent_color || '#8b5cf6');
      setMusicUrl(profile.music_url || '');
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
      });
      toast({ title: 'Profile saved!' });
    } catch (error) {
      toast({ title: 'Error saving profile', variant: 'destructive' });
    }
  };

  const handleAddLink = async () => {
    if (!profile || !newLinkPlatform || !newLinkUrl) return;

    try {
      await createLink.mutateAsync({
        profile_id: profile.id,
        platform: newLinkPlatform,
        url: newLinkUrl,
        title: null,
        icon: null,
        display_order: socialLinks.length,
        is_visible: true,
      });
      setNewLinkPlatform('');
      setNewLinkUrl('');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold gradient-text">
            feds.lol
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            Customize your profile at{' '}
            <Link
              to={`/${profile.username}`}
              className="text-primary hover:underline"
              target="_blank"
            >
              feds.lol/{profile.username}
            </Link>
          </p>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="glass">
              <TabsTrigger value="profile" className="gap-2">
                <Settings className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="links" className="gap-2">
                <LinkIcon className="w-4 h-4" />
                Links
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="w-4 h-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="effects" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Effects
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
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

                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the world about yourself..."
                    className="bg-secondary/50 resize-none"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Avatar URL</Label>
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-secondary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Profile Music URL (MP3)</Label>
                  <Input
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    placeholder="https://example.com/music.mp3"
                    className="bg-secondary/50"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Add New Link</h3>
                <div className="flex gap-3">
                  <Input
                    value={newLinkPlatform}
                    onChange={(e) => setNewLinkPlatform(e.target.value)}
                    placeholder="Platform (e.g., Discord)"
                    className="bg-secondary/50"
                  />
                  <Input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="URL"
                    className="bg-secondary/50 flex-1"
                  />
                  <Button onClick={handleAddLink} disabled={createLink.isPending}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {socialLinks.map((link) => (
                  <div
                    key={link.id}
                    className="glass-card p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{link.platform}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
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
                  <p className="text-muted-foreground text-center py-8">
                    No links yet. Add your first link above!
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <div className="glass-card p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Background Image URL</Label>
                  <Input
                    value={backgroundUrl}
                    onChange={(e) => setBackgroundUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-secondary/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-12 h-10 p-1 bg-transparent"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-12 h-10 p-1 bg-transparent"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Effects Tab */}
            <TabsContent value="effects" className="space-y-6">
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sparkle Effect</Label>
                    <p className="text-sm text-muted-foreground">
                      Add sparkles around your profile card
                    </p>
                  </div>
                  <Switch
                    checked={effects.sparkles}
                    onCheckedChange={(checked) =>
                      setEffects({ ...effects, sparkles: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tilt Effect</Label>
                    <p className="text-sm text-muted-foreground">
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

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Glow Effect</Label>
                    <p className="text-sm text-muted-foreground">
                      Glowing border around your card
                    </p>
                  </div>
                  <Switch
                    checked={effects.glow}
                    onCheckedChange={(checked) =>
                      setEffects({ ...effects, glow: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Typewriter Effect</Label>
                    <p className="text-sm text-muted-foreground">
                      Animated typing for your name
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
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}

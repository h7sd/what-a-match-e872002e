import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Type, FileText, Upload, X, Globe, Monitor, Copy, Check, ExternalLink } from 'lucide-react';
import { SiDiscord } from 'react-icons/si';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Animation types for OG title
type OGTitleAnimation = 'none' | 'typewriter' | 'shuffle' | 'decrypted';

const OG_TITLE_ANIMATIONS: { value: OGTitleAnimation; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'Static text' },
  { value: 'typewriter', label: 'Typewriter', description: 'Types character by character' },
  { value: 'shuffle', label: 'Shuffle', description: 'Characters shuffle into place' },
  { value: 'decrypted', label: 'Decrypted', description: 'Matrix-style decrypt' },
];

interface DiscordEmbedSettingsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  ogTitle: string;
  onOgTitleChange: (title: string) => void;
  ogDescription: string;
  onOgDescriptionChange: (description: string) => void;
  ogImageUrl: string;
  onOgImageUrlChange: (url: string) => void;
  ogIconUrl: string;
  onOgIconUrlChange: (url: string) => void;
  ogTitleAnimation: string;
  onOgTitleAnimationChange: (animation: string) => void;
  username: string;
}

export function DiscordEmbedSettings({
  enabled,
  onEnabledChange,
  ogTitle,
  onOgTitleChange,
  ogDescription,
  onOgDescriptionChange,
  ogImageUrl,
  onOgImageUrlChange,
  ogIconUrl,
  onOgIconUrlChange,
  ogTitleAnimation,
  onOgTitleAnimationChange,
  username,
}: DiscordEmbedSettingsProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<'image' | 'icon' | null>(null);
  const [animatedTitle, setAnimatedTitle] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [tabAnimatedTitle, setTabAnimatedTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  const displayTitle = ogTitle || `@${username} | uservault.cc`;
  const shareUrl = `https://uservault.cc/${username}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: 'Share link copied!', description: 'Use this link when sharing on Discord for custom embeds.' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  // Typewriter animation effect for Discord preview
  useEffect(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    const titleToAnimate = displayTitle;

    if (ogTitleAnimation === 'typewriter' && titleToAnimate) {
      setAnimatedTitle('');
      let i = 0;
      animationRef.current = setInterval(() => {
        if (i < titleToAnimate.length) {
          setAnimatedTitle(titleToAnimate.slice(0, i + 1));
          i++;
        } else {
          if (animationRef.current) clearInterval(animationRef.current);
        }
      }, 100);
    } else if (ogTitleAnimation === 'shuffle' && titleToAnimate) {
      let iterations = 0;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      animationRef.current = setInterval(() => {
        setAnimatedTitle(
          titleToAnimate
            .split('')
            .map((char, index) => {
              if (index < iterations) return titleToAnimate[index];
              if (char === ' ') return ' ';
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('')
        );
        iterations += 0.5;
        if (iterations >= titleToAnimate.length && animationRef.current) {
          clearInterval(animationRef.current);
        }
      }, 50);
    } else if (ogTitleAnimation === 'decrypted' && titleToAnimate) {
      let revealed = 0;
      animationRef.current = setInterval(() => {
        if (revealed < titleToAnimate.length) {
          setAnimatedTitle(
            titleToAnimate
              .split('')
              .map((char, i) => (i <= revealed ? char : char === ' ' ? ' ' : '█'))
              .join('')
          );
          revealed++;
        } else {
          if (animationRef.current) clearInterval(animationRef.current);
        }
      }, 80);
    } else {
      setAnimatedTitle(titleToAnimate);
    }

    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [displayTitle, ogTitleAnimation]);

  // Browser tab animation effect
  useEffect(() => {
    if (ogTitleAnimation === 'typewriter' && displayTitle) {
      setTabAnimatedTitle('');
      let i = 0;
      const interval = setInterval(() => {
        if (i < displayTitle.length) {
          setTabAnimatedTitle(displayTitle.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          // Loop the animation
          setTimeout(() => {
            setTabAnimatedTitle('');
            i = 0;
          }, 2000);
        }
      }, 150);
      return () => clearInterval(interval);
    } else {
      setTabAnimatedTitle(displayTitle);
    }
  }, [displayTitle, ogTitleAnimation]);

  // Cursor blink effect
  useEffect(() => {
    if (ogTitleAnimation === 'typewriter') {
      const interval = setInterval(() => {
        setCursorVisible((v) => !v);
      }, 530);
      return () => clearInterval(interval);
    } else {
      setCursorVisible(false);
    }
  }, [ogTitleAnimation]);

  const handleFileUpload = async (file: File, type: 'image' | 'icon') => {
    if (!file) return;
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }
    
    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `og-${type}-${Date.now()}.${fileExt}`;
      // Use user ID as folder prefix to satisfy RLS policy
      const filePath = `${user.id}/og/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-assets')
        .getPublicUrl(filePath);

      if (type === 'image') {
        onOgImageUrlChange(publicUrl);
      } else {
        onOgIconUrlChange(publicUrl);
      }
      
      toast({ title: `${type === 'icon' ? 'Icon' : 'Image'} uploaded!` });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: error.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const displayDescription = ogDescription || `Check out ${username}'s profile on UserVault`;
  const previewTitle = ogTitleAnimation !== 'none' 
    ? `${animatedTitle}${ogTitleAnimation === 'typewriter' && cursorVisible ? '|' : ''}`
    : displayTitle;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
            <SiDiscord className="w-5 h-5 text-[#5865F2]" />
          </div>
          <div>
            <Label className="text-foreground font-semibold">Discord & Browser Embed</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize how your profile appears on Discord & browser tabs
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Browser Tab Preview */}
            <div className="rounded-lg bg-[#202124] p-3 space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Monitor className="w-3 h-3" />
                Browser Tab Preview
              </p>
              <div className="flex items-center">
                <div className="bg-[#35363a] rounded-t-lg px-3 py-2 flex items-center gap-2 max-w-[200px] border-b-2 border-primary">
                  {ogIconUrl ? (
                    <img 
                      src={ogIconUrl} 
                      alt="Tab icon" 
                      className="w-4 h-4 rounded-sm object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-sm bg-primary/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-[6px] font-bold text-white">UV</span>
                    </div>
                  )}
                  <span className="text-xs text-white truncate font-medium">
                    {ogTitleAnimation === 'typewriter' 
                      ? `${tabAnimatedTitle}${cursorVisible ? '|' : ''}`
                      : displayTitle}
                  </span>
                  <X className="w-3 h-3 text-gray-500 ml-auto flex-shrink-0" />
                </div>
                <div className="bg-[#292a2d] rounded-t-lg px-3 py-2 ml-1 flex items-center gap-2 opacity-50">
                  <div className="w-4 h-4 rounded-sm bg-gray-600" />
                  <span className="text-xs text-gray-400 truncate">New Tab</span>
                </div>
              </div>
            </div>

            {/* Discord Embed Preview */}
            <div className="rounded-lg bg-[#2b2d31] p-4 space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <SiDiscord className="w-3 h-3" />
                Discord Embed Preview
              </p>
              <div className="flex items-start gap-3">
                <div className="flex-1 border-l-4 border-[#5865F2] bg-[#2f3136] rounded-r-lg p-3 max-w-md">
                  {/* Site name with icon */}
                  <div className="flex items-center gap-2 mb-1">
                    {ogIconUrl ? (
                      <img 
                        src={ogIconUrl} 
                        alt="Site icon" 
                        className="w-4 h-4 rounded-sm object-cover"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-sm bg-primary/50 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">UV</span>
                      </div>
                    )}
                    <span className="text-xs text-[#949ba4]">USERVAULT.CC</span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-[#00a8fc] font-medium text-sm hover:underline cursor-pointer mb-1">
                    {previewTitle}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-[#dcddde] text-xs line-clamp-2">
                    {displayDescription}
                  </p>
                  
                  {/* Image preview */}
                  {ogImageUrl && (
                    <div className="mt-3 rounded overflow-hidden">
                      <img 
                        src={ogImageUrl} 
                        alt="OG Preview" 
                        className="w-full max-h-48 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Share Link - IMPORTANT */}
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Share Link für Discord</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kopiere diesen Link um dein Profil auf Discord mit deinem Custom-Embed zu teilen.
                    Der normale Profil-Link zeigt das Standard-Embed.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-card/50 border-border text-xs font-mono"
                />
                <Button
                  onClick={copyShareLink}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-500" />
                      Kopiert!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Kopieren
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Settings */}
            <div className="grid gap-5">
              {/* Icon Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-primary" />
                  Site Icon (Tab & Embed)
                </Label>
                <div className="flex items-center gap-3">
                  {ogIconUrl ? (
                    <div className="relative">
                      <img 
                        src={ogIconUrl} 
                        alt="Icon" 
                        className="w-16 h-16 rounded-lg object-cover border border-border"
                      />
                      <button
                        onClick={() => onOgIconUrlChange('')}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex-1 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-card/50">
                      <input
                        type="file"
                        accept="image/*,.gif"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'icon')}
                        disabled={uploading === 'icon'}
                      />
                      {uploading === 'icon' ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Click to upload icon</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: 32x32px or 64x64px PNG/ICO/GIF
                </p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Type className="w-4 h-4 text-primary" />
                  Title
                </Label>
                <Input
                  value={ogTitle}
                  onChange={(e) => onOgTitleChange(e.target.value)}
                  placeholder={`@${username} | uservault.cc`}
                  className="bg-card border-border"
                />
              </div>

              {/* Title Animation */}
              <div className="space-y-2">
                <Label className="text-sm">Title Animation</Label>
                <Select value={ogTitleAnimation} onValueChange={onOgTitleAnimationChange}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select animation" />
                  </SelectTrigger>
                  <SelectContent>
                    {OG_TITLE_ANIMATIONS.map((anim) => (
                      <SelectItem key={anim.value} value={anim.value}>
                        <div className="flex flex-col">
                          <span>{anim.label}</span>
                          <span className="text-xs text-muted-foreground">{anim.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Animation shows in preview and on the browser tab when viewing your profile
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  Description
                </Label>
                <Textarea
                  value={ogDescription}
                  onChange={(e) => onOgDescriptionChange(e.target.value)}
                  placeholder={`Check out ${username}'s profile on UserVault`}
                  className="bg-card border-border resize-none"
                  rows={2}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Image className="w-4 h-4 text-primary" />
                  Embed Image (Large Preview)
                </Label>
                <div className="space-y-3">
                  {ogImageUrl && (
                    <div className="relative inline-block">
                      <img 
                        src={ogImageUrl} 
                        alt="OG Image" 
                        className="max-h-32 rounded-lg border border-border"
                      />
                      <button
                        onClick={() => onOgImageUrlChange('')}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                  {!ogImageUrl && (
                    <label className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-card/50">
                      <input
                        type="file"
                        accept="image/*,.gif"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')}
                        disabled={uploading === 'image'}
                      />
                      {uploading === 'image' ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Click to upload embed image</span>
                        </>
                      )}
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Recommended: 1200x630px for best display on Discord & Twitter. GIFs are supported!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

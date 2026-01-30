import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Image, Type, FileText, Upload, X } from 'lucide-react';
import { SiDiscord } from 'react-icons/si';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

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
  const [uploading, setUploading] = useState<'image' | 'icon' | null>(null);
  const [animatedTitle, setAnimatedTitle] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  // Typewriter animation effect for preview
  useEffect(() => {
    if (ogTitleAnimation === 'typewriter' && ogTitle) {
      setAnimatedTitle('');
      let i = 0;
      const interval = setInterval(() => {
        if (i < ogTitle.length) {
          setAnimatedTitle(ogTitle.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    } else if (ogTitleAnimation === 'shuffle' && ogTitle) {
      let iterations = 0;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const interval = setInterval(() => {
        setAnimatedTitle(
          ogTitle
            .split('')
            .map((char, index) => {
              if (index < iterations) return ogTitle[index];
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('')
        );
        iterations += 0.5;
        if (iterations >= ogTitle.length) clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    } else if (ogTitleAnimation === 'decrypted' && ogTitle) {
      let revealed = 0;
      const interval = setInterval(() => {
        if (revealed < ogTitle.length) {
          setAnimatedTitle(
            ogTitle
              .split('')
              .map((char, i) => (i <= revealed ? char : '█'))
              .join('')
          );
          revealed++;
        } else {
          clearInterval(interval);
        }
      }, 80);
      return () => clearInterval(interval);
    } else {
      setAnimatedTitle(ogTitle);
    }
  }, [ogTitle, ogTitleAnimation]);

  // Cursor blink effect
  useEffect(() => {
    if (ogTitleAnimation === 'typewriter') {
      const interval = setInterval(() => {
        setCursorVisible((v) => !v);
      }, 530);
      return () => clearInterval(interval);
    }
  }, [ogTitleAnimation]);

  const handleFileUpload = async (file: File, type: 'image' | 'icon') => {
    if (!file) return;
    
    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `og-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

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
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(null);
    }
  };

  const displayTitle = ogTitle || `@${username} | uservault.cc`;
  const displayDescription = ogDescription || `Check out ${username}'s profile on UserVault`;
  const previewTitle = ogTitleAnimation === 'typewriter' 
    ? `${animatedTitle}${cursorVisible ? '|' : ' '}`
    : animatedTitle || displayTitle;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
            <SiDiscord className="w-5 h-5 text-[#5865F2]" />
          </div>
          <div>
            <Label className="text-foreground font-semibold">Discord Embed</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize how your profile appears when shared on Discord
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
            className="space-y-5"
          >
            {/* Live Preview - Discord Style */}
            <div className="rounded-lg bg-[#2b2d31] p-4 space-y-2">
              <p className="text-xs text-[#949ba4] mb-2">Preview</p>
              <div className="flex items-start gap-3">
                {/* Discord Embed Card */}
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

            {/* Icon Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Site Icon (appears next to site name)
              </Label>
              <div className="flex items-center gap-3">
                {ogIconUrl ? (
                  <div className="relative">
                    <img 
                      src={ogIconUrl} 
                      alt="Icon" 
                      className="w-12 h-12 rounded-lg object-cover border border-border"
                    />
                    <button
                      onClick={() => onOgIconUrlChange('')}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="w-12 h-12 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'icon')}
                      disabled={uploading === 'icon'}
                    />
                    {uploading === 'icon' ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    )}
                  </label>
                )}
                <Input
                  value={ogIconUrl}
                  onChange={(e) => onOgIconUrlChange(e.target.value)}
                  placeholder="https://... or upload"
                  className="flex-1 bg-card border-border"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" />
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
              <Label>Title Animation (Preview Only)</Label>
              <Select value={ogTitleAnimation} onValueChange={onOgTitleAnimationChange}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
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
                Note: Discord doesn't support animated titles, but the animation shows here as a preview effect
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
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
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Embed Image
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
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors bg-card">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')}
                      disabled={uploading === 'image'}
                    />
                    {uploading === 'image' ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">Upload Image</span>
                  </label>
                  <span className="text-xs text-muted-foreground">or</span>
                  <Input
                    value={ogImageUrl}
                    onChange={(e) => onOgImageUrlChange(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-card border-border"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended size: 1200x630px for best display on Discord
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

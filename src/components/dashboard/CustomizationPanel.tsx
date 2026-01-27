import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUploader } from './FileUploader';
import { ColorPicker } from './ColorPicker';

interface CustomizationPanelProps {
  // Assets
  backgroundUrl: string;
  setBackgroundUrl: (url: string) => void;
  backgroundVideoUrl: string;
  setBackgroundVideoUrl: (url: string) => void;
  musicUrl: string;
  setMusicUrl: (url: string) => void;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  customCursorUrl: string;
  setCustomCursorUrl: (url: string) => void;
  
  // General
  bio: string;
  setBio: (bio: string) => void;
  location: string;
  setLocation: (location: string) => void;
  discordUserId: string;
  setDiscordUserId: (id: string) => void;
  profileOpacity: number;
  setProfileOpacity: (opacity: number) => void;
  profileBlur: number;
  setProfileBlur: (blur: number) => void;
  
  // Colors
  accentColor: string;
  setAccentColor: (color: string) => void;
  textColor: string;
  setTextColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  iconColor: string;
  setIconColor: (color: string) => void;
  
  // Effects
  effects: {
    sparkles: boolean;
    tilt: boolean;
    glow: boolean;
    typewriter: boolean;
  };
  setEffects: (effects: any) => void;
  
  // Other customization
  monochromeIcons: boolean;
  setMonochromeIcons: (value: boolean) => void;
  animatedTitle: boolean;
  setAnimatedTitle: (value: boolean) => void;
  swapBioColors: boolean;
  setSwapBioColors: (value: boolean) => void;
  useDiscordAvatar: boolean;
  setUseDiscordAvatar: (value: boolean) => void;
  discordAvatarDecoration: boolean;
  setDiscordAvatarDecoration: (value: boolean) => void;
  enableProfileGradient: boolean;
  setEnableProfileGradient: (value: boolean) => void;
  glowUsername: boolean;
  setGlowUsername: (value: boolean) => void;
  glowSocials: boolean;
  setGlowSocials: (value: boolean) => void;
  glowBadges: boolean;
  setGlowBadges: (value: boolean) => void;
}

export function CustomizationPanel(props: CustomizationPanelProps) {
  return (
    <div className="space-y-8">
      {/* Assets Uploader */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Assets Uploader</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <FileUploader
            type="background"
            currentUrl={props.backgroundUrl || props.backgroundVideoUrl}
            onUpload={(url) => {
              if (url.includes('.mp4')) {
                props.setBackgroundVideoUrl(url);
                props.setBackgroundUrl('');
              } else {
                props.setBackgroundUrl(url);
                props.setBackgroundVideoUrl('');
              }
            }}
            onRemove={() => {
              props.setBackgroundUrl('');
              props.setBackgroundVideoUrl('');
            }}
          />
          <FileUploader
            type="audio"
            currentUrl={props.musicUrl}
            onUpload={props.setMusicUrl}
            onRemove={() => props.setMusicUrl('')}
          />
          <FileUploader
            type="avatar"
            currentUrl={props.avatarUrl}
            onUpload={props.setAvatarUrl}
            onRemove={() => props.setAvatarUrl('')}
          />
          <FileUploader
            type="cursor"
            currentUrl={props.customCursorUrl}
            onUpload={props.setCustomCursorUrl}
            onRemove={() => props.setCustomCursorUrl('')}
          />
        </div>
      </section>

      {/* Premium Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-primary/20 via-pink-500/20 to-primary/20 border border-primary/30 text-center"
      >
        <p className="text-sm">
          Want exclusive features? Unlock more with{' '}
          <span className="text-primary font-semibold">💎 Premium</span>
        </p>
      </motion.div>

      {/* General Customization */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">General Customization</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={props.bio}
                onChange={(e) => props.setBio(e.target.value)}
                placeholder="This is my description"
                className="bg-secondary/30"
              />
            </div>

            <div className="space-y-2">
              <Label>Background Effects</Label>
              <Select defaultValue="particles">
                <SelectTrigger className="bg-secondary/30">
                  <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="particles">Particles</SelectItem>
                  <SelectItem value="matrix">Matrix</SelectItem>
                  <SelectItem value="stars">Stars</SelectItem>
                  <SelectItem value="snow">Snow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Discord Presence</Label>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-400">●</span> Click here to connect your{' '}
                  <span className="text-primary">Discord</span> and unlock this feature.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Username Effects</Label>
              <Button variant="outline" className="w-full justify-start">
                <Sparkles className="w-4 h-4 mr-2" />
                Username Effects
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Opacity</Label>
              <Slider
                value={[props.profileOpacity]}
                onValueChange={([v]) => props.setProfileOpacity(v)}
                min={20}
                max={100}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>20%</span>
                <span>{props.profileOpacity}%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={props.location}
                onChange={(e) => props.setLocation(e.target.value)}
                placeholder="📍 My Location"
                className="bg-secondary/30"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Blur</Label>
              <Slider
                value={[props.profileBlur]}
                onValueChange={([v]) => props.setProfileBlur(v)}
                min={0}
                max={80}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0px</span>
                <span>{props.profileBlur}px</span>
                <span>80px</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Glow Settings</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={props.glowUsername ? "default" : "outline"} 
                  size="sm"
                  onClick={() => props.setGlowUsername(!props.glowUsername)}
                  className="text-xs"
                >
                  ✨ Username
                </Button>
                <Button 
                  variant={props.glowSocials ? "default" : "outline"} 
                  size="sm"
                  onClick={() => props.setGlowSocials(!props.glowSocials)}
                  className="text-xs"
                >
                  🌐 Socials
                </Button>
                <Button 
                  variant={props.glowBadges ? "default" : "outline"} 
                  size="sm"
                  onClick={() => props.setGlowBadges(!props.glowBadges)}
                  className="text-xs"
                >
                  ✨ Badges
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => props.setEnableProfileGradient(!props.enableProfileGradient)}
        >
          {props.enableProfileGradient ? 'Disable' : 'Enable'} Profile Gradient
        </Button>
      </section>

      {/* Color Customization */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">Color Customization</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <ColorPicker
            label="Accent Color"
            value={props.accentColor}
            onChange={props.setAccentColor}
          />
          <ColorPicker
            label="Text Color"
            value={props.textColor}
            onChange={props.setTextColor}
          />
          <ColorPicker
            label="Background Color"
            value={props.backgroundColor}
            onChange={props.setBackgroundColor}
          />
          <ColorPicker
            label="Icon Color"
            value={props.iconColor}
            onChange={props.setIconColor}
          />
        </div>
      </section>

      {/* Other Customization */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">Other Customization</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <div>
              <Label className="text-sm">Monochrome Icons</Label>
            </div>
            <Switch
              checked={props.monochromeIcons}
              onCheckedChange={props.setMonochromeIcons}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <div>
              <Label className="text-sm">Animated Title</Label>
            </div>
            <Switch
              checked={props.animatedTitle}
              onCheckedChange={props.setAnimatedTitle}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <div>
              <Label className="text-sm">Swap Bio Colors</Label>
            </div>
            <Switch
              checked={props.swapBioColors}
              onCheckedChange={props.setSwapBioColors}
            />
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border">
            <Label className="text-sm">Volume Control</Label>
            <Slider
              defaultValue={[50]}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <div>
              <Label className="text-sm">Use Discord Avatar</Label>
            </div>
            <Switch
              checked={props.useDiscordAvatar}
              onCheckedChange={props.setUseDiscordAvatar}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <div>
              <Label className="text-sm">Discord Avatar Decoration</Label>
            </div>
            <Switch
              checked={props.discordAvatarDecoration}
              onCheckedChange={props.setDiscordAvatarDecoration}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

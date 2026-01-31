import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Upload, 
  Palette, 
  Type, 
  Sparkles, 
  MessageSquare, 
  Sliders,
  Eye,
  Zap
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileUploader } from './FileUploader';
import { ColorPicker } from './ColorPicker';
import { cn } from '@/lib/utils';

const FONTS = [
  'Inter',
  'JetBrains Mono',
  'Satoshi',
  'Outfit',
  'Space Grotesk',
  'Sora',
  'Poppins',
  'Manrope',
  'Orbitron',
  'Press Start 2P',
  'VT323',
  'Fira Code',
  'IBM Plex Mono',
  'Source Code Pro',
  'Roboto Mono',
  'Ubuntu Mono',
  'Inconsolata',
  'Playfair Display',
  'Crimson Text',
  'Lora',
  'Merriweather',
  'DM Serif Display',
  'Abril Fatface',
  'Bebas Neue',
  'Oswald',
  'Montserrat',
  'Raleway',
  'Quicksand',
  'Comfortaa',
  'Righteous',
  'Audiowide',
  'Russo One',
  'Bungee',
  'Permanent Marker',
  'Pacifico',
  'Dancing Script',
  'Caveat',
  'Shadows Into Light',
];

interface SectionProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ icon: Icon, title, description, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-sm">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CustomizationPanelProps {
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
  
  accentColor: string;
  setAccentColor: (color: string) => void;
  textColor: string;
  setTextColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  iconColor: string;
  setIconColor: (color: string) => void;
  
  effects: {
    sparkles: boolean;
    tilt: boolean;
    glow: boolean;
    typewriter: boolean;
  };
  setEffects: (effects: any) => void;
  
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
  transparentBadges?: boolean;
  setTransparentBadges?: (value: boolean) => void;
  iconOnlyLinks: boolean;
  setIconOnlyLinks: (value: boolean) => void;
  iconLinksOpacity: number;
  setIconLinksOpacity: (value: number) => void;
  
  // Discord card customization
  discordCardStyle?: string;
  setDiscordCardStyle?: (style: string) => void;
  discordCardOpacity?: number;
  setDiscordCardOpacity?: (opacity: number) => void;
  discordShowBadge?: boolean;
  setDiscordShowBadge?: (show: boolean) => void;
  discordBadgeColor?: string;
  setDiscordBadgeColor?: (color: string) => void;
  
  backgroundEffect?: string;
  setBackgroundEffect?: (effect: string) => void;
  audioVolume?: number;
  setAudioVolume?: (volume: number) => void;
  
  // Font settings
  nameFont?: string;
  setNameFont?: (font: string) => void;
  textFont?: string;
  setTextFont?: (font: string) => void;
}

export function CustomizationPanel(props: CustomizationPanelProps) {
  const [discordDialogOpen, setDiscordDialogOpen] = useState(false);
  const [tempDiscordId, setTempDiscordId] = useState(props.discordUserId);

  const handleDiscordConnect = () => {
    props.setDiscordUserId(tempDiscordId);
    setDiscordDialogOpen(false);
  };

  const handleBackgroundEffectChange = (value: string) => {
    if (props.setBackgroundEffect) {
      props.setBackgroundEffect(value);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (props.setAudioVolume) {
      props.setAudioVolume(value[0] / 100);
    }
  };

  return (
    <div className="space-y-3">
      {/* Assets Upload Section */}
      <CollapsibleSection
        icon={Upload}
        title="Media Assets"
        description="Background, audio & cursor"
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FileUploader
            type="background"
            currentUrl={props.backgroundUrl || props.backgroundVideoUrl}
            onUpload={(url) => {
              if (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm')) {
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
            type="cursor"
            currentUrl={props.customCursorUrl}
            onUpload={props.setCustomCursorUrl}
            onRemove={() => props.setCustomCursorUrl('')}
          />
        </div>
      </CollapsibleSection>

      {/* Typography Section */}
      <CollapsibleSection
        icon={Type}
        title="Typography"
        description="Fonts & text settings"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Name Font</Label>
            <Select 
              value={props.nameFont || 'Inter'} 
              onValueChange={(v) => props.setNameFont?.(v)}
            >
              <SelectTrigger className="bg-secondary/30 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {FONTS.map((f) => (
                  <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Text Font</Label>
            <Select 
              value={props.textFont || 'Inter'} 
              onValueChange={(v) => props.setTextFont?.(v)}
            >
              <SelectTrigger className="bg-secondary/30 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {FONTS.map((f) => (
                  <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>

      {/* Colors Section */}
      <CollapsibleSection
        icon={Palette}
        title="Colors"
        description="Accent, text & background colors"
      >
        <div className="grid sm:grid-cols-2 gap-3">
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
      </CollapsibleSection>

      {/* Background Effects Section */}
      <CollapsibleSection
        icon={Sparkles}
        title="Background Effects"
        description="Animated particle effects"
      >
        <div className="space-y-4">
          <Select 
            value={props.backgroundEffect || 'particles'} 
            onValueChange={handleBackgroundEffectChange}
          >
            <SelectTrigger className="bg-secondary/30">
              <SelectValue placeholder="Choose an effect" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="particles">✨ Particles</SelectItem>
              <SelectItem value="matrix">💻 Matrix</SelectItem>
              <SelectItem value="stars">⭐ Stars</SelectItem>
              <SelectItem value="snow">❄️ Snow</SelectItem>
              <SelectItem value="fireflies">🔥 Fireflies</SelectItem>
              <SelectItem value="rain">🌧️ Rain</SelectItem>
              <SelectItem value="aurora">🌌 Aurora</SelectItem>
              <SelectItem value="bubbles">🫧 Bubbles</SelectItem>
              <SelectItem value="confetti">🎉 Confetti</SelectItem>
              <SelectItem value="geometric">🔷 Geometric</SelectItem>
              <SelectItem value="hearts">❤️ Hearts</SelectItem>
              <SelectItem value="leaves">🍂 Falling Leaves</SelectItem>
              <SelectItem value="smoke">💨 Smoke</SelectItem>
              <SelectItem value="lightning">⚡ Lightning</SelectItem>
              <SelectItem value="ripples">🌊 Ripples</SelectItem>
              <SelectItem value="hexagons">⬡ Hexagons</SelectItem>
              <SelectItem value="dna">🧬 DNA Helix</SelectItem>
              <SelectItem value="binary">01 Binary Rain</SelectItem>
              <SelectItem value="sakura">🌸 Sakura</SelectItem>
              <SelectItem value="music">🎵 Music Notes</SelectItem>
              <SelectItem value="plasma">🔮 Plasma</SelectItem>
              <SelectItem value="cyber">🤖 Cyber Grid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CollapsibleSection>

      {/* Discord Integration Section */}
      <CollapsibleSection
        icon={MessageSquare}
        title="Discord & Spotify"
        description="Show your live status"
      >
        <div className="space-y-4">
          <Dialog open={discordDialogOpen} onOpenChange={setDiscordDialogOpen}>
            <DialogTrigger asChild>
              <button 
                className="w-full p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors cursor-pointer text-left"
                onClick={() => setTempDiscordId(props.discordUserId)}
              >
                {props.discordUserId ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm font-medium">Connected</p>
                      <p className="text-xs text-muted-foreground">ID: {props.discordUserId}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div>
                      <p className="text-sm">Connect Discord</p>
                      <p className="text-xs text-muted-foreground">
                        Show your status & Spotify activity
                      </p>
                    </div>
                  </div>
                )}
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#5865F2]" />
                  Discord & Spotify Integration
                </DialogTitle>
                <DialogDescription>
                  Connect your Discord to show your live status and Spotify activity.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-background" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-green-500">Spotify Integration</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When you're listening to Spotify on Discord, it will automatically show on your profile!
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Discord User ID</Label>
                  <Input
                    value={tempDiscordId}
                    onChange={(e) => setTempDiscordId(e.target.value)}
                    placeholder="123456789012345678"
                    className="bg-secondary/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enable Developer Mode in Discord, then right-click your profile and select "Copy User ID"
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Your Discord must be connected to{' '}
                    <a href="https://lanyard.rest" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Lanyard
                    </a>
                    {' '}for real-time presence.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleDiscordConnect} className="flex-1">
                    {props.discordUserId ? 'Update' : 'Connect'}
                  </Button>
                  {props.discordUserId && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        props.setDiscordUserId('');
                        setDiscordDialogOpen(false);
                      }}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
                
                {/* Discord Card Customization */}
                {props.discordUserId && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium">Card Appearance</h4>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Card Style</Label>
                      <Select 
                        value={props.discordCardStyle || 'glass'} 
                        onValueChange={(v) => props.setDiscordCardStyle?.(v)}
                      >
                        <SelectTrigger className="bg-secondary/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="glass">Glass (Frosted)</SelectItem>
                          <SelectItem value="solid">Solid Dark</SelectItem>
                          <SelectItem value="outlined">Outlined</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Card Opacity ({props.discordCardOpacity || 100}%)</Label>
                      <Slider
                        value={[props.discordCardOpacity || 100]}
                        onValueChange={([v]) => props.setDiscordCardOpacity?.(v)}
                        min={30}
                        max={100}
                        step={5}
                        className="py-2"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs">Show UV Badge</Label>
                        <p className="text-[10px] text-muted-foreground">Display badge next to username</p>
                      </div>
                      <Switch
                        checked={props.discordShowBadge ?? true}
                        onCheckedChange={(checked) => props.setDiscordShowBadge?.(checked)}
                      />
                    </div>
                    
                    {(props.discordShowBadge ?? true) && (
                      <div className="space-y-2">
                        <Label className="text-xs">Badge Color</Label>
                        <div className="flex gap-2">
                          {['#ec4899', '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'].map((color) => (
                            <button
                              key={color}
                              onClick={() => props.setDiscordBadgeColor?.(color)}
                              className={`w-6 h-6 rounded-full border-2 transition-all ${
                                props.discordBadgeColor === color ? 'border-white scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {props.discordUserId && (
            <div className="grid grid-cols-2 gap-2">
              <ToggleItem
                label="Use Discord Avatar"
                checked={props.useDiscordAvatar}
                onChange={props.setUseDiscordAvatar}
              />
              <ToggleItem
                label="Avatar Decoration"
                checked={props.discordAvatarDecoration}
                onChange={props.setDiscordAvatarDecoration}
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Visual Effects Section */}
      <CollapsibleSection
        icon={Zap}
        title="Visual Effects"
        description="Glows, animations & styles"
      >
        <div className="space-y-4">
          {/* Glow Settings */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Glow Effects</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant={props.glowUsername ? "default" : "outline"} 
                size="sm"
                onClick={() => props.setGlowUsername(!props.glowUsername)}
                className="text-xs h-8"
              >
                ✨ Username
              </Button>
              <Button 
                variant={props.glowSocials ? "default" : "outline"} 
                size="sm"
                onClick={() => props.setGlowSocials(!props.glowSocials)}
                className="text-xs h-8"
              >
                🌐 Socials
              </Button>
              <Button 
                variant={props.glowBadges ? "default" : "outline"} 
                size="sm"
                onClick={() => props.setGlowBadges(!props.glowBadges)}
                className="text-xs h-8"
              >
                🏆 Badges
              </Button>
            </div>
          </div>

          {/* Username Effects */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Username Effects</Label>
            <div className="grid grid-cols-2 gap-2">
              <ToggleItem
                label="Glitch Effect"
                checked={props.effects.glow}
                onChange={(checked) => props.setEffects({ ...props.effects, glow: checked })}
              />
              <ToggleItem
                label="Typewriter"
                checked={props.effects.typewriter}
                onChange={(checked) => props.setEffects({ ...props.effects, typewriter: checked })}
              />
              <ToggleItem
                label="Sparkles"
                checked={props.effects.sparkles}
                onChange={(checked) => props.setEffects({ ...props.effects, sparkles: checked })}
              />
              <ToggleItem
                label="3D Tilt"
                checked={props.effects.tilt}
                onChange={(checked) => props.setEffects({ ...props.effects, tilt: checked })}
              />
            </div>
          </div>

          {/* Badge Style */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Badge Style</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant={props.transparentBadges ? "outline" : "default"} 
                size="sm"
                onClick={() => props.setTransparentBadges?.(false)}
                className="text-xs h-8"
              >
                🎨 With Background
              </Button>
              <Button 
                variant={props.transparentBadges ? "default" : "outline"} 
                size="sm"
                onClick={() => props.setTransparentBadges?.(true)}
                className="text-xs h-8"
              >
                ✨ Transparent
              </Button>
            </div>
          </div>

          {/* Rainbow Gradient */}
          <ToggleItem
            label="Rainbow Gradient Username"
            checked={props.enableProfileGradient}
            onChange={props.setEnableProfileGradient}
          />
        </div>
      </CollapsibleSection>

      {/* Advanced Settings Section */}
      <CollapsibleSection
        icon={Sliders}
        title="Advanced Settings"
        description="Opacity, blur & other options"
      >
        <div className="space-y-4">
          {/* Sliders */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Profile Opacity</Label>
                <span className="text-xs text-muted-foreground">{props.profileOpacity}%</span>
              </div>
              <Slider
                value={[props.profileOpacity]}
                onValueChange={([v]) => props.setProfileOpacity(v)}
                min={20}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Profile Blur</Label>
                <span className="text-xs text-muted-foreground">{props.profileBlur}px</span>
              </div>
              <Slider
                value={[props.profileBlur]}
                onValueChange={([v]) => props.setProfileBlur(v)}
                min={0}
                max={80}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Audio Volume</Label>
                <span className="text-xs text-muted-foreground">{Math.round((props.audioVolume ?? 0.5) * 100)}%</span>
              </div>
              <Slider
                value={[Math.round((props.audioVolume ?? 0.5) * 100)]}
                onValueChange={handleVolumeChange}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {props.iconOnlyLinks && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Icon Links Opacity</Label>
                  <span className="text-xs text-muted-foreground">{props.iconLinksOpacity}%</span>
                </div>
                <Slider
                  value={[props.iconLinksOpacity]}
                  onValueChange={(value) => props.setIconLinksOpacity(value[0])}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input
              value={props.location}
              onChange={(e) => props.setLocation(e.target.value)}
              placeholder="📍 Your location"
              className="bg-secondary/30 h-9"
            />
          </div>

          {/* Toggle Options */}
          <div className="grid grid-cols-2 gap-2">
            <ToggleItem
              label="Monochrome Icons"
              checked={props.monochromeIcons}
              onChange={props.setMonochromeIcons}
            />
            <ToggleItem
              label="Animated Title"
              checked={props.animatedTitle}
              onChange={props.setAnimatedTitle}
            />
            <ToggleItem
              label="Swap Bio Colors"
              checked={props.swapBioColors}
              onChange={props.setSwapBioColors}
            />
            <ToggleItem
              label="Icon-Only Links"
              checked={props.iconOnlyLinks}
              onChange={props.setIconOnlyLinks}
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// Compact toggle item component
function ToggleItem({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string; 
  checked: boolean; 
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 border border-border/30">
      <Label className="text-xs cursor-pointer">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="scale-90"
      />
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare, Zap } from 'lucide-react';
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
  const [usernameEffectsOpen, setUsernameEffectsOpen] = useState(false);
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
    <div className="space-y-8">
      {/* Assets Uploader */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Assets Uploader</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Premium Banner - Coming Soon */}

      {/* General Customization */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">General Customization</h2>
        
        {/* Font Settings Row */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name Font</Label>
            <Select 
              value={props.nameFont || 'Inter'} 
              onValueChange={(v) => props.setNameFont?.(v)}
            >
              <SelectTrigger className="bg-secondary/30">
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
            <Label>Text Font</Label>
            <Select 
              value={props.textFont || 'Inter'} 
              onValueChange={(v) => props.setTextFont?.(v)}
            >
              <SelectTrigger className="bg-secondary/30">
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
              <Select 
                value={props.backgroundEffect || 'particles'} 
                onValueChange={handleBackgroundEffectChange}
              >
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
              <Label>Discord & Spotify Presence</Label>
              <Dialog open={discordDialogOpen} onOpenChange={setDiscordDialogOpen}>
                <DialogTrigger asChild>
                  <button 
                    className="w-full p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors cursor-pointer text-left"
                    onClick={() => setTempDiscordId(props.discordUserId)}
                  >
                    {props.discordUserId ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">●</span>
                        <div>
                          <p className="text-sm font-medium">Connected</p>
                          <p className="text-xs text-muted-foreground">ID: {props.discordUserId}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">●</span>
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
                      Connect your Discord to show your live status, current activity, and what you're listening to on Spotify.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="p-3 rounded-lg bg-[#1DB954]/10 border border-[#1DB954]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-[#1DB954]">Spotify Integration</span>
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
                        Enable Developer Mode in Discord (Settings → Advanced), then right-click your profile and select "Copy User ID"
                      </p>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong>Note:</strong> Your Discord must be connected to{' '}
                        <a href="https://lanyard.rest" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Lanyard
                        </a>
                        {' '}for real-time presence. Join their Discord server to set it up.
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
            </div>

            <div className="space-y-2">
              <Label>Username Effects</Label>
              <Dialog open={usernameEffectsOpen} onOpenChange={setUsernameEffectsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Username Effects
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Username Effects
                    </DialogTitle>
                    <DialogDescription>
                      Add special effects to your username display.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div>
                        <Label className="text-sm">Glitch Effect</Label>
                        <p className="text-xs text-muted-foreground">Apply a cyberpunk glitch animation</p>
                      </div>
                      <Switch
                        checked={props.effects.glow}
                        onCheckedChange={(checked) => 
                          props.setEffects({ ...props.effects, glow: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div>
                        <Label className="text-sm">Typewriter Effect</Label>
                        <p className="text-xs text-muted-foreground">Animate text typing character by character</p>
                      </div>
                      <Switch
                        checked={props.effects.typewriter}
                        onCheckedChange={(checked) => 
                          props.setEffects({ ...props.effects, typewriter: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div>
                        <Label className="text-sm">Sparkles</Label>
                        <p className="text-xs text-muted-foreground">Add sparkle particles around username</p>
                      </div>
                      <Switch
                        checked={props.effects.sparkles}
                        onCheckedChange={(checked) => 
                          props.setEffects({ ...props.effects, sparkles: checked })
                        }
                      />
                    </div>
                    <Button onClick={() => setUsernameEffectsOpen(false)} className="w-full">
                      Apply Effects
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
            
            {/* Badge Style Settings */}
            <div className="space-y-2">
              <Label>Badge Style</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={props.transparentBadges ? "outline" : "default"} 
                  size="sm"
                  onClick={() => props.setTransparentBadges?.(false)}
                  className="text-xs"
                >
                  🎨 With Background
                </Button>
                <Button 
                  variant={props.transparentBadges ? "default" : "outline"} 
                  size="sm"
                  onClick={() => props.setTransparentBadges?.(true)}
                  className="text-xs"
                >
                  ✨ Transparent
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
            <Label className="text-sm">Monochrome Icons</Label>
            <Switch
              checked={props.monochromeIcons}
              onCheckedChange={props.setMonochromeIcons}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <Label className="text-sm">Animated Title</Label>
            <Switch
              checked={props.animatedTitle}
              onCheckedChange={props.setAnimatedTitle}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <Label className="text-sm">Swap Bio Colors</Label>
            <Switch
              checked={props.swapBioColors}
              onCheckedChange={props.setSwapBioColors}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <Label className="text-sm">Icon-Only Links</Label>
            <Switch
              checked={props.iconOnlyLinks}
              onCheckedChange={props.setIconOnlyLinks}
            />
          </div>

          {props.iconOnlyLinks && (
            <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <Label className="text-sm">Icon Links Opacity</Label>
              <Slider
                value={[props.iconLinksOpacity]}
                onValueChange={(value) => props.setIconLinksOpacity(value[0])}
                min={0}
                max={100}
                step={5}
              />
              <span className="text-xs text-muted-foreground">{props.iconLinksOpacity}%</span>
            </div>
          )}

          <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border">
            <Label className="text-sm">Volume Control</Label>
            <Slider
              value={[Math.round((props.audioVolume ?? 0.5) * 100)]}
              onValueChange={handleVolumeChange}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <Label className="text-sm">Use Discord Avatar</Label>
            <Switch
              checked={props.useDiscordAvatar}
              onCheckedChange={props.setUseDiscordAvatar}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <Label className="text-sm">Discord Avatar Decoration</Label>
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

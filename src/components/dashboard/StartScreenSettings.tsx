import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StartScreenPreview } from './StartScreenPreview';

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

export type AdvancedTextAnimationType = 'none' | 'shuffle' | 'shuffle-gsap' | 'fuzzy' | 'decrypted' | 'ascii' | 'ascii-3d' | 'decrypted-advanced' | 'fuzzy-canvas';

const TEXT_ANIMATIONS: { value: AdvancedTextAnimationType; label: string; description: string; premium?: boolean }[] = [
  { value: 'none', label: 'None', description: 'Static text with typewriter cursor' },
  { value: 'shuffle', label: 'Shuffle', description: 'Characters shuffle into place' },
  { value: 'shuffle-gsap', label: 'Shuffle Pro', description: 'GSAP-powered shuffle with directions', premium: true },
  { value: 'fuzzy', label: 'Fuzzy', description: 'Glitchy chromatic aberration effect', premium: true },
  { value: 'decrypted', label: 'Decrypted', description: 'Matrix-style decrypt animation', premium: true },
  { value: 'ascii', label: 'ASCII', description: 'ASCII art glitch on hover', premium: true },
  { value: 'ascii-3d', label: 'ASCII 3D', description: '3D rotating ASCII art with waves', premium: true },
  { value: 'decrypted-advanced', label: 'Decrypted Pro', description: 'Advanced decrypt with directions', premium: true },
  { value: 'fuzzy-canvas', label: 'Fuzzy Canvas', description: 'High-performance fuzzy with glitch mode', premium: true },
];

interface StartScreenSettingsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  text: string;
  onTextChange: (text: string) => void;
  font: string;
  onFontChange: (font: string) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
  bgColor: string;
  onBgColorChange: (color: string) => void;
  textAnimation?: string;
  onTextAnimationChange?: (animation: string) => void;
  asciiSize?: number;
  onAsciiSizeChange?: (size: number) => void;
  asciiWaves?: boolean;
  onAsciiWavesChange?: (enabled: boolean) => void;
  /** If true, audio is present and start screen cannot be disabled */
  hasAudio?: boolean;
  /** Premium status for locking features */
  isPremium?: boolean;
}

export function StartScreenSettings({
  enabled,
  onEnabledChange,
  text,
  onTextChange,
  font,
  onFontChange,
  textColor,
  onTextColorChange,
  bgColor,
  onBgColorChange,
  textAnimation = 'none',
  onTextAnimationChange,
  asciiSize = 8,
  onAsciiSizeChange,
  asciiWaves = true,
  onAsciiWavesChange,
  hasAudio = false,
  isPremium = false,
}: StartScreenSettingsProps) {
  // If audio is present, start screen is forced on and cannot be disabled
  const isForced = hasAudio;
  const effectiveEnabled = isForced ? true : enabled;

  const handleToggle = (checked: boolean) => {
    if (!isForced) {
      onEnabledChange(checked);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-foreground">Enable Start Screen</Label>
          <p className="text-xs text-muted-foreground mt-1">
            {isForced 
              ? "Required for audio playback (browser policy)"
              : "Show a \"Click to enter\" screen before your profile"
            }
          </p>
        </div>
        <Switch 
          checked={effectiveEnabled} 
          onCheckedChange={handleToggle} 
          disabled={isForced}
          className={isForced ? "opacity-50 cursor-not-allowed" : ""}
        />
      </div>

      {effectiveEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 pt-2"
        >
          {/* Live Preview */}
          <StartScreenPreview
            text={text}
            animation={textAnimation}
            font={font}
            textColor={textColor}
            bgColor={bgColor}
            asciiSize={asciiSize}
            asciiWaves={asciiWaves}
          />

          {/* Text */}
          <div className="space-y-2">
            <Label>Text</Label>
            <Input
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Click anywhere to enter"
              className="bg-card border-border"
            />
          </div>

          {/* Text Animation */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Text Animation</Label>
              {!isPremium && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-500 border border-amber-500/30">
                  <Crown className="w-2.5 h-2.5" />
                  Premium
                </span>
              )}
            </div>
            <Select 
              value={textAnimation} 
              onValueChange={(v) => {
                const anim = TEXT_ANIMATIONS.find(a => a.value === v);
                if (anim?.premium && !isPremium) {
                  // Don't allow selecting premium animations
                  return;
                }
                onTextAnimationChange?.(v as AdvancedTextAnimationType);
              }}
            >
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_ANIMATIONS.map((anim) => {
                  const isLocked = anim.premium && !isPremium;
                  return (
                    <SelectItem 
                      key={anim.value} 
                      value={anim.value}
                      disabled={isLocked}
                      className={isLocked ? "opacity-50" : ""}
                    >
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                          {anim.label}
                          {isLocked && <Lock className="w-3 h-3 text-amber-500" />}
                        </span>
                        <span className="text-xs text-muted-foreground">{anim.description}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {!isPremium && (
              <Link 
                to="/premium" 
                className="text-xs text-amber-500 hover:underline flex items-center gap-1"
              >
                <Crown className="w-3 h-3" />
                Upgrade for advanced animations
              </Link>
            )}
          </div>

          {/* ASCII 3D Settings */}
          {textAnimation === 'ascii-3d' && (
            <div className="space-y-4 p-4 rounded-lg bg-card/50 border border-border/50">
              <Label className="text-sm font-medium">ASCII 3D Settings</Label>
              
              {/* Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Size</Label>
                  <span className="text-sm text-muted-foreground">{asciiSize}</span>
                </div>
                <Slider
                  value={[asciiSize]}
                  onValueChange={(v) => onAsciiSizeChange?.(v[0])}
                  min={4}
                  max={16}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Waves Toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Waves</Label>
                <Switch 
                  checked={asciiWaves} 
                  onCheckedChange={(checked) => onAsciiWavesChange?.(checked)} 
                />
              </div>
            </div>
          )}

          {/* Font */}
          <div className="space-y-2">
            <Label>Font</Label>
            <Select value={font} onValueChange={onFontChange}>
              <SelectTrigger className="bg-card border-border">
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

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={textColor}
                  onChange={(e) => onTextColorChange(e.target.value)}
                  className="w-12 h-10 p-1 bg-card border-border cursor-pointer"
                />
                <Input
                  value={textColor}
                  onChange={(e) => onTextColorChange(e.target.value)}
                  className="flex-1 bg-card border-border"
                  placeholder="#a855f7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={bgColor}
                  onChange={(e) => onBgColorChange(e.target.value)}
                  className="w-12 h-10 p-1 bg-card border-border cursor-pointer"
                />
                <Input
                  value={bgColor}
                  onChange={(e) => onBgColorChange(e.target.value)}
                  className="flex-1 bg-card border-border"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

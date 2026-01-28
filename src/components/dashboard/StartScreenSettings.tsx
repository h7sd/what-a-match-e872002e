import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { ShuffleText, FuzzyText, DecryptedText, ASCIIText, TextAnimationType } from '@/components/profile/TextAnimations';
import ASCIITextEffect from '@/components/profile/ASCIITextEffect';
import DecryptedTextEffect from '@/components/profile/DecryptedTextEffect';
import FuzzyTextEffect from '@/components/profile/FuzzyTextEffect';
import ShuffleTextEffect from '@/components/profile/ShuffleTextEffect';

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

const TEXT_ANIMATIONS: { value: AdvancedTextAnimationType; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'Static text with typewriter cursor' },
  { value: 'shuffle', label: 'Shuffle', description: 'Characters shuffle into place' },
  { value: 'shuffle-gsap', label: 'Shuffle Pro', description: 'GSAP-powered shuffle with directions' },
  { value: 'fuzzy', label: 'Fuzzy', description: 'Glitchy chromatic aberration effect' },
  { value: 'decrypted', label: 'Decrypted', description: 'Matrix-style decrypt animation' },
  { value: 'ascii', label: 'ASCII', description: 'ASCII art glitch on hover' },
  { value: 'ascii-3d', label: 'ASCII 3D', description: '3D rotating ASCII art with waves' },
  { value: 'decrypted-advanced', label: 'Decrypted Pro', description: 'Advanced decrypt with directions' },
  { value: 'fuzzy-canvas', label: 'Fuzzy Canvas', description: 'High-performance fuzzy with glitch mode' },
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
}

function AnimatedPreviewText({ 
  text, 
  animation, 
  font, 
  color,
  bgColor
}: { 
  text: string; 
  animation: string; 
  font: string; 
  color: string;
  bgColor: string;
}) {
  const style = { fontFamily: font, color };
  const displayText = text || 'Click anywhere to enter';
  
  switch (animation) {
    case 'shuffle':
      return <ShuffleText text={displayText} style={style} className="text-lg" />;
    case 'shuffle-gsap':
      return (
        <ShuffleTextEffect
          text={displayText}
          style={{ ...style, fontSize: '1.25rem' }}
          shuffleDirection="right"
          duration={0.35}
          animationMode="evenodd"
          shuffleTimes={1}
          stagger={0.03}
          triggerOnHover={true}
          autoPlay={true}
          loop={false}
        />
      );
    case 'fuzzy':
      return <FuzzyText text={displayText} style={style} className="text-lg" />;
    case 'decrypted':
      return <DecryptedText text={displayText} style={style} className="text-lg" />;
    case 'ascii':
      return <ASCIIText text={displayText} style={style} className="text-lg" />;
    case 'ascii-3d':
      return (
        <div className="w-full h-32 relative">
          <ASCIITextEffect 
            text={displayText}
            textColor={color}
            enableWaves={true}
            asciiFontSize={6}
            textFontSize={80}
          />
        </div>
      );
    case 'decrypted-advanced':
      return (
        <DecryptedTextEffect 
          text={displayText}
          speed={50}
          sequential={true}
          revealDirection="start"
          animateOn="view"
          className="text-lg"
          style={style}
        />
      );
    case 'fuzzy-canvas':
      return (
        <div className="flex items-center justify-center">
          <FuzzyTextEffect
            fontSize="1.5rem"
            fontWeight={600}
            color={color}
            baseIntensity={0.2}
            hoverIntensity={0.5}
            enableHover={true}
            glitchMode={true}
            glitchInterval={3000}
            glitchDuration={200}
          >
            {displayText}
          </FuzzyTextEffect>
        </div>
      );
    default:
      return (
        <span className="text-lg" style={style}>
          {displayText}
          <span className="animate-pulse">|</span>
        </span>
      );
  }
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
}: StartScreenSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-foreground">Enable Start Screen</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Show a "Click to enter" screen before your profile
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 pt-2"
        >
          {/* Live Preview */}
          <div 
            className="rounded-lg p-8 text-center border border-border/50 min-h-[100px] flex items-center justify-center"
            style={{ backgroundColor: bgColor }}
          >
            <AnimatedPreviewText 
              text={text}
              animation={textAnimation}
              font={font}
              color={textColor}
              bgColor={bgColor}
            />
          </div>

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
            <Label>Text Animation</Label>
            <Select 
              value={textAnimation} 
              onValueChange={(v) => onTextAnimationChange?.(v as TextAnimationType)}
            >
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_ANIMATIONS.map((anim) => (
                  <SelectItem key={anim.value} value={anim.value}>
                    <div className="flex flex-col">
                      <span>{anim.label}</span>
                      <span className="text-xs text-muted-foreground">{anim.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

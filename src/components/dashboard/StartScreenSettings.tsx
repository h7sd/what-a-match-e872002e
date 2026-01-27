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

const FONTS = [
  'Inter',
  'JetBrains Mono',
  'Satoshi',
  'Outfit',
  'Space Grotesk',
  'Sora',
  'Poppins',
  'Manrope',
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
          {/* Preview */}
          <div 
            className="rounded-lg p-6 text-center border border-border/50"
            style={{ backgroundColor: bgColor }}
          >
            <p 
              className="text-lg"
              style={{ fontFamily: font, color: textColor }}
            >
              {text || 'Click anywhere to enter'}
              <span className="animate-pulse">|</span>
            </p>
            <div 
              className="mt-4 w-10 h-10 mx-auto rounded-full border-2 opacity-60"
              style={{ borderColor: textColor }}
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

          {/* Font */}
          <div className="space-y-2">
            <Label>Font</Label>
            <Select value={font} onValueChange={onFontChange}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

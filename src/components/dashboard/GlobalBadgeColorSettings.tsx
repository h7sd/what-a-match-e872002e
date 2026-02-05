import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Palette, Sparkles } from 'lucide-react';

interface GlobalBadgeColorSettingsProps {
  useGlobalColor: boolean;
  onUseGlobalColorChange: (value: boolean) => void;
  globalColor: string;
  onGlobalColorChange: (color: string) => void;
}

const PRESET_COLORS = [
  { name: 'Purple', color: '#8B5CF6' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Green', color: '#22C55E' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Cyan', color: '#06B6D4' },
  { name: 'Gold', color: '#EAB308' },
];

function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(hex);
}

export function GlobalBadgeColorSettings({
  useGlobalColor,
  onUseGlobalColorChange,
  globalColor,
  onGlobalColorChange,
}: GlobalBadgeColorSettingsProps) {
  const [hexInput, setHexInput] = useState(globalColor || '#8B5CF6');
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (globalColor) {
      setHexInput(globalColor);
      setIsValid(isValidHex(globalColor));
    }
  }, [globalColor]);

  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (isValidHex(value)) {
      setIsValid(true);
      onGlobalColorChange(value);
    } else {
      setIsValid(false);
    }
  };

  const handleColorPickerChange = (color: string) => {
    setHexInput(color);
    setIsValid(true);
    onGlobalColorChange(color);
  };

  return (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <Label className="text-foreground font-semibold">Global Badge Color</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Apply one color to all your badges
            </p>
          </div>
        </div>
        <Switch 
          checked={useGlobalColor} 
          onCheckedChange={onUseGlobalColorChange} 
        />
      </div>

      {useGlobalColor && (
        <div className="space-y-4 pt-2 border-t border-border/50 mt-4">
          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Custom Color</Label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={isValid ? hexInput : '#8B5CF6'}
                  onChange={(e) => handleColorPickerChange(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border bg-transparent appearance-none"
                  style={{ 
                    backgroundColor: isValid ? hexInput : '#8B5CF6',
                  }}
                />
              </div>
              <div className="flex-1">
                <Input
                  value={hexInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#8B5CF6"
                  className={`font-mono uppercase ${!isValid ? 'border-destructive' : ''}`}
                  maxLength={7}
                />
                {!isValid && (
                  <p className="text-xs text-destructive mt-1">Invalid HEX color</p>
                )}
              </div>
            </div>
          </div>

          {/* Preset Colors */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleColorPickerChange(preset.color)}
                  className={`
                    w-8 h-8 rounded-lg transition-all hover:scale-110 border-2
                    ${hexInput.toLowerCase() === preset.color.toLowerCase() 
                      ? 'border-white ring-2 ring-primary' 
                      : 'border-transparent'
                    }
                  `}
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Preview
            </Label>
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-black/40 border border-border">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${isValid ? hexInput : '#8B5CF6'}20`,
                    boxShadow: `0 0 12px ${isValid ? hexInput : '#8B5CF6'}40`
                  }}
                >
                  <div 
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: isValid ? hexInput : '#8B5CF6' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

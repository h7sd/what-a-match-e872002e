import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Crown, Lock, Type } from 'lucide-react';
import { Link } from 'react-router-dom';

export type DisplayNameAnimationType = 'none' | 'shuffle' | 'fuzzy' | 'decrypted' | 'ascii' | 'ascii-3d';

const DISPLAY_NAME_ANIMATIONS: { value: DisplayNameAnimationType; label: string; description: string; premium?: boolean }[] = [
  { value: 'none', label: 'None', description: 'Static display name' },
  { value: 'shuffle', label: 'Shuffle', description: 'Characters shuffle on hover' },
  { value: 'fuzzy', label: 'Fuzzy', description: 'Chromatic aberration effect', premium: true },
  { value: 'decrypted', label: 'Decrypted', description: 'Matrix-style decrypt', premium: true },
  { value: 'ascii', label: 'ASCII', description: 'ASCII glitch on hover', premium: true },
  { value: 'ascii-3d', label: 'ASCII 3D', description: '3D rotating ASCII art with waves', premium: true },
];

interface DisplayNameAnimationSettingsProps {
  animation: string;
  onAnimationChange: (animation: string) => void;
  asciiSize?: number;
  onAsciiSizeChange?: (size: number) => void;
  asciiWaves?: boolean;
  onAsciiWavesChange?: (enabled: boolean) => void;
  isPremium?: boolean;
}

export function DisplayNameAnimationSettings({
  animation,
  onAnimationChange,
  asciiSize = 8,
  onAsciiSizeChange,
  asciiWaves = true,
  onAsciiWavesChange,
  isPremium = false,
}: DisplayNameAnimationSettingsProps) {
  return (
    <div className="space-y-4">
      {/* Animation Select */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">Display Name Animation</Label>
          {!isPremium && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-500 border border-amber-500/30">
              <Crown className="w-2.5 h-2.5" />
              Premium
            </span>
          )}
        </div>
        <Select 
          value={animation} 
          onValueChange={(v) => {
            const anim = DISPLAY_NAME_ANIMATIONS.find(a => a.value === v);
            if (anim?.premium && !isPremium) {
              return;
            }
            onAnimationChange(v);
          }}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISPLAY_NAME_ANIMATIONS.map((anim) => {
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
      {animation === 'ascii-3d' && (
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
    </div>
  );
}

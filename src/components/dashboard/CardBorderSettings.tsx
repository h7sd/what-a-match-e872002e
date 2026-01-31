import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Square } from 'lucide-react';
import { forwardRef } from 'react';

interface CardBorderSettingsProps {
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  accentColor: string;
  onBorderEnabledChange: (value: boolean) => void;
  onBorderColorChange: (value: string) => void;
  onBorderWidthChange: (value: number) => void;
}

export const CardBorderSettings = forwardRef<HTMLDivElement, CardBorderSettingsProps>(function CardBorderSettings({
  borderEnabled,
  borderColor,
  borderWidth,
  accentColor,
  onBorderEnabledChange,
  onBorderColorChange,
  onBorderWidthChange,
}, ref) {
  const effectiveBorderColor = borderColor || accentColor;

  return (
    <div ref={ref} className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Square className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-sm">Profile Card</h3>
      </div>

      {/* Card Visibility Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 border border-border/30">
        <div>
          <Label className="text-xs cursor-pointer">Show Card & Discord</Label>
          <p className="text-[10px] text-muted-foreground">Card background visibility</p>
        </div>
        <Switch
          checked={borderEnabled}
          onCheckedChange={onBorderEnabledChange}
          className="scale-90"
        />
      </div>

      {borderEnabled && (
        <div className="space-y-3 pt-2">
          {/* Border Color */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 border border-border/30">
            <Label className="text-xs">Border Color</Label>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded border border-border"
                style={{ backgroundColor: effectiveBorderColor }}
              />
              <Input
                type="color"
                value={effectiveBorderColor}
                onChange={(e) => onBorderColorChange(e.target.value)}
                className="w-8 h-6 p-0 border-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Border Width */}
          <div className="py-2 px-3 rounded-lg bg-secondary/20 border border-border/30 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Border Width</Label>
              <span className="text-xs text-muted-foreground">{borderWidth}px</span>
            </div>
            <Slider
              value={[borderWidth]}
              onValueChange={([v]) => onBorderWidthChange(v)}
              min={1}
              max={4}
              step={1}
            />
          </div>
        </div>
      )}
    </div>
  );
});

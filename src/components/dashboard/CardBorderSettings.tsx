import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
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
  // Use accent color if no custom border color is set
  const effectiveBorderColor = borderColor || accentColor;

  return (
    <div ref={ref} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Profile Card</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Toggle the profile card visibility. When disabled, only your content will show without the card background, and Discord presence will also be hidden.
        </p>
      </div>

      <div className="space-y-4">
        {/* Card Visibility Toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/50 bg-secondary/20">
          <Label htmlFor="border-enabled" className="text-sm font-medium cursor-pointer">
            Show Card & Discord
          </Label>
          <Switch
            id="border-enabled"
            checked={borderEnabled}
            onCheckedChange={onBorderEnabledChange}
          />
        </div>

        {borderEnabled && (
          <>
            {/* Border Color */}
            <div className="py-3 px-4 rounded-lg border border-border/50 bg-secondary/20 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Border Color</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: effectiveBorderColor }}
                  />
                  <Input
                    type="color"
                    value={effectiveBorderColor}
                    onChange={(e) => onBorderColorChange(e.target.value)}
                    className="w-10 h-8 p-0 border-0 cursor-pointer"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to use accent color
              </p>
            </div>

            {/* Border Width */}
            <div className="py-3 px-4 rounded-lg border border-border/50 bg-secondary/20 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Border Width</Label>
                <span className="text-sm text-muted-foreground">{borderWidth}px</span>
              </div>
              <Slider
                value={[borderWidth]}
                onValueChange={([v]) => onBorderWidthChange(v)}
                min={1}
                max={4}
                step={1}
                className="py-2"
              />
            </div>
          </>
        )}
      </div>

      {/* Preview */}
      <div className="mt-4 p-4 rounded-lg bg-black/40">
        <p className="text-xs text-muted-foreground mb-3">Preview</p>
        <div className="flex justify-center">
          {borderEnabled ? (
            <div
              className="w-32 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center"
              style={{
                border: `${borderWidth}px solid ${effectiveBorderColor}30`,
              }}
            >
              <span className="text-xs text-muted-foreground">Card</span>
            </div>
          ) : (
            <div className="w-32 h-20 rounded-2xl flex items-center justify-center border border-dashed border-muted-foreground/30">
              <span className="text-xs text-muted-foreground">Transparent</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

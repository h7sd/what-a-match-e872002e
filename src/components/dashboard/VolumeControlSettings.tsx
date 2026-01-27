import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Volume2 } from 'lucide-react';
import { forwardRef } from 'react';

interface VolumeControlSettingsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export const VolumeControlSettings = forwardRef<HTMLDivElement, VolumeControlSettingsProps>(function VolumeControlSettings({
  enabled,
  onEnabledChange,
}, ref) {
  return (
    <div ref={ref} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <Label className="text-foreground">Show Volume Control</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Display volume control on your profile for visitors
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {/* Preview */}
      {enabled && (
        <div className="rounded-lg p-4 bg-black/30 border border-border/50">
          <p className="text-xs text-muted-foreground mb-3 text-center">Preview</p>
          <div className="flex justify-center">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
              <Volume2 className="w-5 h-5 text-white/70" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

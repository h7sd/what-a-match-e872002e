import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
    <div ref={ref}>
      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 border border-border/30">
        <div>
          <Label className="text-xs cursor-pointer">Show Volume Control</Label>
          <p className="text-[10px] text-muted-foreground">Display on profile for visitors</p>
        </div>
        <Switch 
          checked={enabled} 
          onCheckedChange={onEnabledChange} 
          className="scale-90"
        />
      </div>
    </div>
  );
});

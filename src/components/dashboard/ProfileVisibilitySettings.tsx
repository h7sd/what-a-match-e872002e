import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ProfileVisibilitySettingsProps {
  showUsername: boolean;
  showBadges: boolean;
  showViews: boolean;
  onShowUsernameChange: (value: boolean) => void;
  onShowBadgesChange: (value: boolean) => void;
  onShowViewsChange: (value: boolean) => void;
}

export function ProfileVisibilitySettings({
  showUsername,
  showBadges,
  showViews,
  onShowUsernameChange,
  onShowBadgesChange,
  onShowViewsChange,
}: ProfileVisibilitySettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Profile Visibility</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Control what elements are visible on your public profile.
        </p>
      </div>

      <div className="space-y-3">
        {/* Show Username Toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/50 bg-secondary/20">
          <Label htmlFor="show-username" className="text-sm font-medium cursor-pointer">
            Show Username
          </Label>
          <Switch
            id="show-username"
            checked={showUsername}
            onCheckedChange={onShowUsernameChange}
          />
        </div>

        {/* Show Badges Toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/50 bg-secondary/20">
          <Label htmlFor="show-badges" className="text-sm font-medium cursor-pointer">
            Show Badges
          </Label>
          <Switch
            id="show-badges"
            checked={showBadges}
            onCheckedChange={onShowBadgesChange}
          />
        </div>

        {/* Show Views Toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/50 bg-secondary/20">
          <Label htmlFor="show-views" className="text-sm font-medium cursor-pointer">
            Show Views
          </Label>
          <Switch
            id="show-views"
            checked={showViews}
            onCheckedChange={onShowViewsChange}
          />
        </div>
      </div>
    </div>
  );
}

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AtSign, Award } from 'lucide-react';

interface ProfileVisibilitySettingsProps {
  showUsername: boolean;
  showBadges: boolean;
  onShowUsernameChange: (value: boolean) => void;
  onShowBadgesChange: (value: boolean) => void;
}

export function ProfileVisibilitySettings({
  showUsername,
  showBadges,
  onShowUsernameChange,
  onShowBadgesChange,
}: ProfileVisibilitySettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Profile Visibility</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Control what elements are visible on your public profile.
        </p>
      </div>

      <div className="space-y-4">
        {/* Show Username Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <AtSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="show-username" className="text-base font-medium">
                Show Username
              </Label>
              <p className="text-sm text-muted-foreground">
                Display your @username on your profile
              </p>
            </div>
          </div>
          <Switch
            id="show-username"
            checked={showUsername}
            onCheckedChange={onShowUsernameChange}
          />
        </div>

        {/* Show Badges Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="show-badges" className="text-base font-medium">
                Show Badges
              </Label>
              <p className="text-sm text-muted-foreground">
                Display your earned badges on your profile
              </p>
            </div>
          </div>
          <Switch
            id="show-badges"
            checked={showBadges}
            onCheckedChange={onShowBadgesChange}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="mt-6 p-4 rounded-lg bg-black/40 border border-border/50">
        <p className="text-xs text-muted-foreground mb-3">Preview</p>
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/50 to-primary/20" />
          <span className="font-semibold text-white">Display Name</span>
          {showUsername && (
            <span className="text-sm text-muted-foreground flex items-center gap-0.5">
              <AtSign className="w-3 h-3" />
              username
            </span>
          )}
          {showBadges && (
            <div className="flex gap-1 mt-1">
              <div className="w-5 h-5 rounded-full bg-yellow-500/30 flex items-center justify-center">
                <Award className="w-3 h-3 text-yellow-500" />
              </div>
              <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center">
                <Award className="w-3 h-3 text-blue-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

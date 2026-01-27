import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { forwardRef } from 'react';

interface ProfileVisibilitySettingsProps {
  showUsername: boolean;
  showBadges: boolean;
  showViews: boolean;
  showAvatar: boolean;
  showLinks: boolean;
  showDescription: boolean;
  onShowUsernameChange: (value: boolean) => void;
  onShowBadgesChange: (value: boolean) => void;
  onShowViewsChange: (value: boolean) => void;
  onShowAvatarChange: (value: boolean) => void;
  onShowLinksChange: (value: boolean) => void;
  onShowDescriptionChange: (value: boolean) => void;
}

export const ProfileVisibilitySettings = forwardRef<HTMLDivElement, ProfileVisibilitySettingsProps>(function ProfileVisibilitySettings({
  showUsername,
  showBadges,
  showViews,
  showAvatar,
  showLinks,
  showDescription,
  onShowUsernameChange,
  onShowBadgesChange,
  onShowViewsChange,
  onShowAvatarChange,
  onShowLinksChange,
  onShowDescriptionChange,
}, ref) {
  return (
    <div ref={ref} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Profile Visibility</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Control what elements are visible on your public profile.
        </p>
      </div>

      <div className="space-y-3">
        {/* Show Avatar Toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/50 bg-secondary/20">
          <Label htmlFor="show-avatar" className="text-sm font-medium cursor-pointer">
            Show Profile Picture
          </Label>
          <Switch
            id="show-avatar"
            checked={showAvatar}
            onCheckedChange={onShowAvatarChange}
          />
        </div>

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

        {/* Show Description Toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/50 bg-secondary/20">
          <Label htmlFor="show-description" className="text-sm font-medium cursor-pointer">
            Show Description/Bio
          </Label>
          <Switch
            id="show-description"
            checked={showDescription}
            onCheckedChange={onShowDescriptionChange}
          />
        </div>

        {/* Show Links Toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/50 bg-secondary/20">
          <Label htmlFor="show-links" className="text-sm font-medium cursor-pointer">
            Show Social Links
          </Label>
          <Switch
            id="show-links"
            checked={showLinks}
            onCheckedChange={onShowLinksChange}
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
});

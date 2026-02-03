import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye } from 'lucide-react';
import { forwardRef } from 'react';

interface ProfileVisibilitySettingsProps {
  showUsername: boolean;
  showDisplayName: boolean;
  showBadges: boolean;
  showViews: boolean;
  showAvatar: boolean;
  showLinks: boolean;
  showDescription: boolean;
  showLikes?: boolean;
  onShowUsernameChange: (value: boolean) => void;
  onShowDisplayNameChange: (value: boolean) => void;
  onShowBadgesChange: (value: boolean) => void;
  onShowViewsChange: (value: boolean) => void;
  onShowAvatarChange: (value: boolean) => void;
  onShowLinksChange: (value: boolean) => void;
  onShowDescriptionChange: (value: boolean) => void;
  onShowLikesChange?: (value: boolean) => void;
}

function VisibilityToggle({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string; 
  checked: boolean; 
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 border border-border/30">
      <Label className="text-xs cursor-pointer">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="scale-90"
      />
    </div>
  );
}

export const ProfileVisibilitySettings = forwardRef<HTMLDivElement, ProfileVisibilitySettingsProps>(function ProfileVisibilitySettings({
  showUsername,
  showDisplayName,
  showBadges,
  showViews,
  showAvatar,
  showLinks,
  showDescription,
  showLikes = true,
  onShowUsernameChange,
  onShowDisplayNameChange,
  onShowBadgesChange,
  onShowViewsChange,
  onShowAvatarChange,
  onShowLinksChange,
  onShowDescriptionChange,
  onShowLikesChange,
}, ref) {
  return (
    <div ref={ref} className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-sm">Profile Visibility</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <VisibilityToggle
          label="Profile Picture"
          checked={showAvatar}
          onChange={onShowAvatarChange}
        />
        <VisibilityToggle
          label="Display Name"
          checked={showDisplayName}
          onChange={onShowDisplayNameChange}
        />
        <VisibilityToggle
          label="Username (@)"
          checked={showUsername}
          onChange={onShowUsernameChange}
        />
        <VisibilityToggle
          label="Description"
          checked={showDescription}
          onChange={onShowDescriptionChange}
        />
        <VisibilityToggle
          label="Social Links"
          checked={showLinks}
          onChange={onShowLinksChange}
        />
        <VisibilityToggle
          label="Badges"
          checked={showBadges}
          onChange={onShowBadgesChange}
        />
        <VisibilityToggle
          label="View Count"
          checked={showViews}
          onChange={onShowViewsChange}
        />
        {onShowLikesChange && (
          <VisibilityToggle
            label="Like Buttons"
            checked={showLikes}
            onChange={onShowLikesChange}
          />
        )}
      </div>
    </div>
  );
});

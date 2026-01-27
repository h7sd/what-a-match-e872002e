import type { ComponentType } from 'react';
import { Award, Check, Crown, Shield, Star } from 'lucide-react';
import { FaDiscord, FaBug, FaGift, FaSnowflake, FaEgg, FaDollarSign } from 'react-icons/fa6';

export type BadgeIconComponent = ComponentType<{ className?: string; style?: React.CSSProperties }>;

// Central mapping so dashboard + profile render the same icons.
export const badgeIconByName: Record<string, BadgeIconComponent> = {
  staff: Shield,
  helper: FaDiscord,
  premium: Crown,
  verified: Check,
  donor: FaDollarSign,
  gifter: FaGift,
  'image host': Award,
  'domain legend': Star,
  og: Star,
  'server booster': FaDiscord,
  'hone.gg': Star,
  'bug hunter': FaBug,
  'christmas 2025': FaSnowflake,
  'easter 2025': FaEgg,
  'christmas 2024': FaSnowflake,
  'the million': Crown,
  winner: Crown,
  'second place': Award,
  'third place': Award,
};

export function getBadgeIcon(name: string): BadgeIconComponent {
  return badgeIconByName[name.toLowerCase()] ?? Award;
}

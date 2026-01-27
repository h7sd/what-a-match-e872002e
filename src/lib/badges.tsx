import type { ComponentType } from 'react';
import { Award, Crown, Shield, Star, BadgeCheck, Code, Zap } from 'lucide-react';
import { FaDiscord, FaBug, FaGift, FaSnowflake, FaEgg, FaDollarSign } from 'react-icons/fa6';

// Import custom badge images
import verifiedBadge from '@/assets/badges/verified.png';
import staffBadge from '@/assets/badges/staff.png';
import uservaultBadge from '@/assets/badges/uservault.png';
import boosterBadge from '@/assets/badges/booster.png';
import developerBadge from '@/assets/badges/developer.png';
import earlyBadge from '@/assets/badges/early.png';

export type BadgeIconComponent = ComponentType<{ className?: string; style?: React.CSSProperties }>;

// Badges that use custom images instead of icons
export const badgeImages: Record<string, string> = {
  verified: verifiedBadge,
  staff: staffBadge,
  'uservault.cc': uservaultBadge,
  'server booster': boosterBadge,
  developer: developerBadge,
  early: earlyBadge,
};

// Central mapping so dashboard + profile render the same icons (fallback if no image).
export const badgeIconByName: Record<string, BadgeIconComponent> = {
  staff: Shield,
  helper: FaDiscord,
  premium: Crown,
  verified: BadgeCheck,
  donor: FaDollarSign,
  gifter: FaGift,
  'image host': Award,
  'domain legend': Star,
  og: Star,
  'server booster': FaDiscord,
  'uservault.cc': Star,
  'bug hunter': FaBug,
  'christmas 2025': FaSnowflake,
  'easter 2025': FaEgg,
  'christmas 2024': FaSnowflake,
  'the million': Crown,
  winner: Crown,
  'second place': Award,
  'third place': Award,
  developer: Code,
  early: Zap,
};

export function getBadgeIcon(name: string): BadgeIconComponent {
  return badgeIconByName[name.toLowerCase()] ?? Award;
}

export function getBadgeImage(name: string): string | null {
  return badgeImages[name.toLowerCase()] ?? null;
}

import { motion } from 'framer-motion';
import { ExternalLink, Link2 } from 'lucide-react';
import {
  SiDiscord,
  SiSpotify,
  SiX,
  SiInstagram,
  SiTiktok,
  SiYoutube,
  SiTwitch,
  SiGithub,
  SiSteam,
  SiSoundcloud,
} from 'react-icons/si';
import type { SocialLink } from '@/hooks/useProfile';

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  discord: SiDiscord,
  spotify: SiSpotify,
  twitter: SiX,
  x: SiX,
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  twitch: SiTwitch,
  github: SiGithub,
  steam: SiSteam,
  soundcloud: SiSoundcloud,
};

const platformColors: Record<string, string> = {
  discord: '#5865F2',
  spotify: '#1DB954',
  twitter: '#1DA1F2',
  x: '#000000',
  instagram: '#E4405F',
  tiktok: '#000000',
  youtube: '#FF0000',
  twitch: '#9146FF',
  github: '#ffffff',
  steam: '#00ADEE',
  soundcloud: '#FF5500',
};

interface SocialLinksProps {
  links: SocialLink[];
  accentColor?: string;
}

export function SocialLinks({ links, accentColor = '#8b5cf6' }: SocialLinksProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-sm space-y-3"
    >
      {links.map((link) => {
        const Icon = platformIcons[link.platform.toLowerCase()] || HiLink;
        const color = platformColors[link.platform.toLowerCase()] || accentColor;

        return (
          <motion.a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            variants={item}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="glass-card-hover flex items-center gap-4 p-4 group"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon
                className="w-5 h-5 transition-colors"
                style={{ color }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">
                {link.title || link.platform}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {link.url.replace(/^https?:\/\//, '')}
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.a>
        );
      })}
    </motion.div>
  );
}

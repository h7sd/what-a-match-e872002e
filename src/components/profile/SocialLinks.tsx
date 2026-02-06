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
  SiTelegram,
  SiPaypal,
  SiPatreon,
  SiKofi,
  SiSnapchat,
  SiLinkedin,
  SiReddit,
  SiPinterest,
  SiFacebook,
  SiKick,
} from 'react-icons/si';
import type { SocialLink } from '@/hooks/useProfile';

import { Pickaxe } from 'lucide-react';

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
  telegram: SiTelegram,
  paypal: SiPaypal,
  patreon: SiPatreon,
  kofi: SiKofi,
  snapchat: SiSnapchat,
  linkedin: SiLinkedin,
  reddit: SiReddit,
  pinterest: SiPinterest,
  facebook: SiFacebook,
  kick: SiKick,
  namemc: Pickaxe,
};

const platformColors: Record<string, string> = {
  discord: '#5865F2',
  spotify: '#1DB954',
  twitter: '#ffffff',
  x: '#ffffff',
  instagram: '#E4405F',
  tiktok: '#ffffff',
  youtube: '#FF0000',
  twitch: '#9146FF',
  github: '#ffffff',
  steam: '#00ADEE',
  soundcloud: '#FF5500',
  telegram: '#0088cc',
  paypal: '#00457C',
  patreon: '#FF424D',
  kofi: '#FF5E5B',
  snapchat: '#FFFC00',
  linkedin: '#0A66C2',
  reddit: '#FF4500',
  pinterest: '#BD081C',
  facebook: '#1877F2',
  kick: '#53FC18',
  namemc: '#8BC34A',
};

// Auto-detect platform from URL
function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('discord.gg') || urlLower.includes('discord.com')) return 'discord';
  if (urlLower.includes('spotify.com')) return 'spotify';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'x';
  if (urlLower.includes('instagram.com')) return 'instagram';
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
  if (urlLower.includes('twitch.tv')) return 'twitch';
  if (urlLower.includes('github.com')) return 'github';
  if (urlLower.includes('steamcommunity.com')) return 'steam';
  if (urlLower.includes('soundcloud.com')) return 'soundcloud';
  if (urlLower.includes('t.me') || urlLower.includes('telegram')) return 'telegram';
  if (urlLower.includes('paypal.me') || urlLower.includes('paypal.com')) return 'paypal';
  if (urlLower.includes('patreon.com')) return 'patreon';
  if (urlLower.includes('ko-fi.com')) return 'kofi';
  if (urlLower.includes('snapchat.com')) return 'snapchat';
  if (urlLower.includes('linkedin.com')) return 'linkedin';
  if (urlLower.includes('reddit.com')) return 'reddit';
  if (urlLower.includes('pinterest.com')) return 'pinterest';
  if (urlLower.includes('facebook.com')) return 'facebook';
  if (urlLower.includes('kick.com')) return 'kick';
  if (urlLower.includes('namemc.com')) return 'namemc';
  return 'link';
}

interface SocialLinksProps {
  links: SocialLink[];
  accentColor?: string;
  glowingIcons?: boolean;
  iconOnly?: boolean;
  iconOpacity?: number;
}

export function SocialLinks({ links, accentColor = '#8b5cf6', glowingIcons = true, iconOnly = false, iconOpacity = 100 }: SocialLinksProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1 },
  };

  // Icon-only mode: render as a grid of icons
  if (iconOnly) {
    return (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-wrap justify-center gap-3 mx-auto"
      >
        {links.map((link) => {
          const detectedPlatform = detectPlatform(link.url);
          const platform = link.platform.toLowerCase() || detectedPlatform;
          const Icon = platformIcons[platform] || Link2;
          const color = platformColors[platform] || accentColor;

          const bgOpacity = (iconOpacity / 100) * 0.4; // Scale 0-100 to 0-0.4 for bg
          
          return (
            <motion.a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              variants={item}
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all duration-300 hover:border-white/20"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
                boxShadow: glowingIcons ? `0 0 20px ${color}40, 0 0 40px ${color}20` : undefined,
              }}
              title={link.title || link.platform || detectedPlatform}
            >
              <Icon
                className="w-6 h-6 transition-all duration-300"
                style={{ 
                  color,
                  filter: glowingIcons ? `drop-shadow(0 0 8px ${color})` : undefined,
                }}
              />
            </motion.a>
          );
        })}
      </motion.div>
    );
  }

  // Default card mode
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-sm space-y-3 mx-auto"
    >
      {links.map((link) => {
        const detectedPlatform = detectPlatform(link.url);
        const platform = link.platform.toLowerCase() || detectedPlatform;
        const Icon = platformIcons[platform] || Link2;
        const color = platformColors[platform] || accentColor;

        return (
          <motion.a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            variants={item}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 p-4 rounded-xl backdrop-blur-xl bg-black/40 border border-white/10 transition-all duration-300 hover:bg-black/50 hover:border-white/20 group"
            style={{
              boxShadow: glowingIcons ? `0 0 20px ${color}20` : undefined,
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{
                backgroundColor: `${color}20`,
                boxShadow: glowingIcons ? `0 0 15px ${color}40` : undefined,
              }}
            >
              <Icon
                className="w-6 h-6 transition-all duration-300"
                style={{ 
                  color,
                  filter: glowingIcons ? `drop-shadow(0 0 6px ${color})` : undefined,
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {link.title || link.platform || detectedPlatform}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {link.description || link.url.replace(/^https?:\/\//, '')}
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.a>
        );
      })}
    </motion.div>
  );
}

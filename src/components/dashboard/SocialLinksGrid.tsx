import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Loader2 } from 'lucide-react';
import {
  FaSnapchat, FaYoutube, FaDiscord, FaSpotify, FaInstagram, FaTiktok, 
  FaTelegram, FaSoundcloud, FaPaypal, FaGithub, FaTwitch, FaPatreon,
  FaLinkedin, FaPinterest, FaReddit, FaSteam, FaFacebook, FaThreads,
  FaXTwitter
} from 'react-icons/fa6';
import { SiOnlyfans, SiCashapp, SiVenmo, SiKofi, SiKick } from 'react-icons/si';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface SocialLinksGridProps {
  existingLinks: { platform: string }[];
  onAddLink: (platform: string, url: string, title?: string) => Promise<void>;
  isLoading?: boolean;
}

const socialPlatforms = [
  { id: 'snapchat', icon: FaSnapchat, color: '#FFFC00', name: 'Snapchat' },
  { id: 'youtube', icon: FaYoutube, color: '#FF0000', name: 'YouTube' },
  { id: 'discord', icon: FaDiscord, color: '#5865F2', name: 'Discord' },
  { id: 'spotify', icon: FaSpotify, color: '#1DB954', name: 'Spotify' },
  { id: 'instagram', icon: FaInstagram, color: '#E4405F', name: 'Instagram' },
  { id: 'tiktok', icon: FaTiktok, color: '#000000', name: 'TikTok' },
  { id: 'twitter', icon: FaXTwitter, color: '#000000', name: 'X (Twitter)' },
  { id: 'telegram', icon: FaTelegram, color: '#0088CC', name: 'Telegram' },
  { id: 'soundcloud', icon: FaSoundcloud, color: '#FF5500', name: 'SoundCloud' },
  { id: 'paypal', icon: FaPaypal, color: '#00457C', name: 'PayPal' },
  { id: 'github', icon: FaGithub, color: '#181717', name: 'GitHub' },
  { id: 'twitch', icon: FaTwitch, color: '#9146FF', name: 'Twitch' },
  { id: 'cashapp', icon: SiCashapp, color: '#00D632', name: 'Cash App' },
  { id: 'venmo', icon: SiVenmo, color: '#008CFF', name: 'Venmo' },
  { id: 'onlyfans', icon: SiOnlyfans, color: '#00AFF0', name: 'OnlyFans' },
  { id: 'patreon', icon: FaPatreon, color: '#FF424D', name: 'Patreon' },
  { id: 'kofi', icon: SiKofi, color: '#FF5E5B', name: 'Ko-fi' },
  { id: 'linkedin', icon: FaLinkedin, color: '#0A66C2', name: 'LinkedIn' },
  { id: 'pinterest', icon: FaPinterest, color: '#BD081C', name: 'Pinterest' },
  { id: 'reddit', icon: FaReddit, color: '#FF4500', name: 'Reddit' },
  { id: 'steam', icon: FaSteam, color: '#171A21', name: 'Steam' },
  { id: 'facebook', icon: FaFacebook, color: '#1877F2', name: 'Facebook' },
  { id: 'threads', icon: FaThreads, color: '#000000', name: 'Threads' },
  { id: 'kick', icon: SiKick, color: '#53FC18', name: 'Kick' },
];

export function SocialLinksGrid({ existingLinks, onAddLink, isLoading }: SocialLinksGridProps) {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<typeof socialPlatforms[0] | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingPlatforms = new Set(existingLinks.map(l => l.platform.toLowerCase()));

  const handleSubmit = async () => {
    if (!selectedPlatform || !url) return;
    
    setIsSubmitting(true);
    try {
      await onAddLink(selectedPlatform.id, url, title || undefined);
      toast({ title: `${selectedPlatform.name} added!` });
      setSelectedPlatform(null);
      setUrl('');
      setTitle('');
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Plus className="w-4 h-4" />
        <span>Link your social media profiles</span>
      </div>
      <p className="text-xs text-muted-foreground">Pick a social media to add to your profile.</p>

      <div className="flex flex-wrap gap-2">
        {socialPlatforms.map((platform) => {
          const Icon = platform.icon;
          const isAdded = existingPlatforms.has(platform.id);
          
          return (
            <motion.button
              key={platform.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => !isAdded && setSelectedPlatform(platform)}
              disabled={isAdded || isLoading}
              className={`
                relative w-10 h-10 rounded-lg flex items-center justify-center
                transition-all duration-200
                ${isAdded 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-lg cursor-pointer'
                }
              `}
              style={{ backgroundColor: isAdded ? 'transparent' : `${platform.color}20` }}
              title={platform.name}
            >
              <Icon 
                className="w-5 h-5" 
                style={{ color: platform.color === '#000000' ? '#fff' : platform.color }} 
              />
              {isAdded && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )}
            </motion.button>
          );
        })}

        {/* Custom URL button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedPlatform({ id: 'custom', icon: Plus, color: '#8B5CF6', name: 'Custom URL' } as any)}
          className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-dashed border-border hover:border-primary transition-colors"
          title="Add Custom URL"
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      </div>

      {/* Add Link Dialog */}
      <Dialog open={!!selectedPlatform} onOpenChange={(open) => !open && setSelectedPlatform(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlatform && (
                <>
                  {selectedPlatform.id !== 'custom' && (
                    <selectedPlatform.icon 
                      className="w-5 h-5" 
                      style={{ color: selectedPlatform.color }} 
                    />
                  )}
                  Add {selectedPlatform.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={`https://${selectedPlatform?.id === 'custom' ? 'example.com' : selectedPlatform?.id + '.com/username'}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Display Title (optional)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedPlatform?.name}
              />
            </div>
            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              disabled={!url || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Link'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

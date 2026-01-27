import { SiDiscord } from 'react-icons/si';
import { Button } from '@/components/ui/button';

interface DiscordCardProps {
  isConnected?: boolean;
  discordUrl?: string;
}

export function DiscordCard({ isConnected = false, discordUrl = 'discord.gg/uservault' }: DiscordCardProps) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#5865F2] flex items-center justify-center">
          <SiDiscord className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold">Join our Discord</p>
          <p className="text-xs text-muted-foreground">{discordUrl}</p>
        </div>
      </div>

      <Button 
        className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
        asChild
      >
        <a href={`https://${discordUrl}`} target="_blank" rel="noopener noreferrer">
          <SiDiscord className="w-4 h-4 mr-2" />
          {isConnected ? 'Connected to Discord' : 'Connect Discord'}
        </a>
      </Button>
    </div>
  );
}

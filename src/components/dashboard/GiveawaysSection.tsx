import { useState } from 'react';
import { Gift, Trophy, Flame, Percent, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GiveawaysSectionProps {
  totalRounds?: number;
  currentStreak?: number;
  winRate?: number;
  totalWinnings?: number;
}

export function GiveawaysSection({ 
  totalRounds = 0, 
  currentStreak = 0, 
  winRate = 0, 
  totalWinnings = 0 
}: GiveawaysSectionProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'winners'>('active');

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold">Giveaways</h3>
        </div>
        <div className="flex bg-secondary/50 rounded-lg p-1">
          <Button
            variant={activeTab === 'active' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setActiveTab('active')}
          >
            Active
          </Button>
          <Button
            variant={activeTab === 'winners' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setActiveTab('winners')}
          >
            Winners
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        No active giveaways yet. Please check back later.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="text-lg font-bold">{totalRounds}</p>
            <p className="text-xs text-muted-foreground">Total Rounds</p>
          </div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
          <Flame className="w-5 h-5 text-orange-500" />
          <div>
            <p className="text-lg font-bold">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
          <Percent className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-lg font-bold">{winRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
          <Coins className="w-5 h-5 text-purple-400" />
          <div>
            <p className="text-lg font-bold">{totalWinnings}</p>
            <p className="text-xs text-muted-foreground">Total Winnings</p>
          </div>
        </div>
      </div>
    </div>
  );
}

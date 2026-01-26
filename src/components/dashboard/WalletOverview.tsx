import { Wallet, TrendingUp, TrendingDown, Dices, CircleDot, RotateCcw, Hand, Target } from 'lucide-react';

interface GameStat {
  name: string;
  icon: React.ReactNode;
  percentage: number;
  change: number;
  color: string;
}

interface WalletOverviewProps {
  balance?: number;
  biggestWin?: number;
  biggestLoss?: number;
}

export function WalletOverview({ balance = 0, biggestWin = 0, biggestLoss = 0 }: WalletOverviewProps) {
  const gameStats: GameStat[] = [
    { name: 'Daily Reward', icon: <TrendingUp className="w-3 h-3" />, percentage: 0, change: 0, color: 'text-green-500' },
    { name: 'Dice Roll', icon: <Dices className="w-3 h-3" />, percentage: 0, change: 0, color: 'text-blue-500' },
    { name: 'Spin the Wheel', icon: <RotateCcw className="w-3 h-3" />, percentage: 0, change: 0, color: 'text-yellow-500' },
    { name: 'Slot Machine', icon: <CircleDot className="w-3 h-3" />, percentage: 0, change: 0, color: 'text-orange-500' },
    { name: 'Rock Paper Scissors', icon: <Hand className="w-3 h-3" />, percentage: 0, change: 0, color: 'text-red-500' },
    { name: 'Range Roulette', icon: <Target className="w-3 h-3" />, percentage: 0, change: 0, color: 'text-purple-500' },
  ];

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-sm text-muted-foreground">Wallet Overview</h3>
      </div>

      <div className="space-y-2">
        <p className="text-3xl font-bold">₣{balance.toLocaleString()}</p>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Biggest Win: {biggestWin}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Biggest Loss: -{Math.abs(biggestLoss)}
          </span>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs text-muted-foreground mb-2">No positive profit yet.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {gameStats.map((stat) => (
            <div key={stat.name} className="flex items-center gap-1 text-xs">
              <span className={`w-2 h-2 rounded-full ${stat.color.replace('text-', 'bg-')}`} />
              <span className={stat.color}>{stat.name}</span>
              <span className="text-muted-foreground">{stat.percentage}%</span>
              <span className="text-muted-foreground">+{stat.change}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Gift, Coins, Gamepad2, ShoppingBag } from 'lucide-react';
import { UCTransaction } from '@/hooks/useMarketplace';
import { cn } from '@/lib/utils';
import { formatUC } from '@/lib/uc';

interface TransactionHistoryProps {
  transactions: UCTransaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const getIcon = (type: string, refType: string | null) => {
    if (type === 'initial') return <Gift className="w-4 h-4" />;
    if (refType === 'minigame') return <Gamepad2 className="w-4 h-4" />;
    if (refType?.includes('marketplace')) return <ShoppingBag className="w-4 h-4" />;
    if (type === 'earn') return <ArrowDownLeft className="w-4 h-4" />;
    return <ArrowUpRight className="w-4 h-4" />;
  };

  const getColor = (type: string, amount: bigint) => {
    if (amount > 0n) return 'text-green-500 bg-green-500/10';
    if (amount < 0n) return 'text-red-500 bg-red-500/10';
    return 'text-muted-foreground bg-muted';
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <Coins className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              getColor(tx.transaction_type, tx.amount)
            )}>
              {getIcon(tx.transaction_type, tx.reference_type)}
            </div>
            <div>
              <p className="font-medium text-sm">{tx.description || 'Transaction'}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(tx.created_at), 'MMM d, yyyy · HH:mm')}
              </p>
            </div>
          </div>
          <div className={cn(
            "font-bold",
            tx.amount > 0n ? 'text-green-500' : 'text-red-500'
          )}>
            {tx.amount > 0n ? '+' : ''}{formatUC(tx.amount)} UC
          </div>
        </div>
      ))}
    </div>
  );
}

import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketplaceItem } from '@/hooks/useMarketplace';
import { MarketplaceCard } from './MarketplaceCard';

interface MarketplaceGridProps {
  items: MarketplaceItem[];
  isLoading: boolean;
  userBalance: bigint;
  isOwner?: boolean;
  isPurchased?: boolean;
  emptyMessage: string;
  emptyAction?: () => void;
  emptyActionLabel?: string;
}

export function MarketplaceGrid({
  items,
  isLoading,
  userBalance,
  isOwner,
  isPurchased,
  emptyMessage,
  emptyAction,
  emptyActionLabel,
}: MarketplaceGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] rounded-2xl bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-4">{emptyMessage}</p>
        {emptyAction && emptyActionLabel && (
          <Button variant="outline" onClick={emptyAction}>
            {emptyActionLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <MarketplaceCard
          key={item.id}
          item={item}
          userBalance={userBalance}
          isOwner={isOwner}
          isPurchased={isPurchased}
        />
      ))}
    </div>
  );
}

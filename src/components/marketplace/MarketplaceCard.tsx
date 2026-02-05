import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Coins, 
  ShoppingCart, 
  Check, 
  Clock, 
  X, 
  Sparkles,
  Package,
  User,
  Wand2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MarketplaceItem, usePurchaseItem, useApplyTemplate } from '@/hooks/useMarketplace';
import { cn } from '@/lib/utils';

interface MarketplaceCardProps {
  item: MarketplaceItem;
  userBalance: number;
  isOwner?: boolean;
  isPurchased?: boolean;
}

export function MarketplaceCard({ 
  item, 
  userBalance, 
  isOwner, 
  isPurchased 
}: MarketplaceCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const purchaseMutation = usePurchaseItem();
  const applyTemplateMutation = useApplyTemplate();

  const name = item.item_type === 'badge' ? item.badge_name : item.template_name;
  const description = item.item_type === 'badge' ? item.badge_description : item.template_description;
  const iconUrl = item.item_type === 'badge' ? item.badge_icon_url : item.template_preview_url;
  const color = item.badge_color || '#8B5CF6';

  const canAfford = userBalance >= item.price;
  const isSoldOut = 
    item.status === 'sold_out' ||
    (item.sale_type === 'single' && item.stock_sold > 0) ||
    (item.sale_type === 'limited' && item.stock_sold >= (item.stock_limit || 0));

  const handlePurchase = () => {
    purchaseMutation.mutate(item.id);
    setShowConfirm(false);
  };

  const handleApplyTemplate = () => {
    applyTemplateMutation.mutate(item.id);
    setShowApplyConfirm(false);
  };

  const hasTemplateData = item.item_type === 'template' && item.template_data;

  const saleTypeLabel = () => {
    switch (item.sale_type) {
      case 'single':
        return 'Unique';
      case 'limited':
        return `${item.stock_sold}/${item.stock_limit}`;
      default:
        return '∞';
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
          item.status === 'denied' && "opacity-60",
          isSoldOut && !isPurchased && "opacity-75"
        )}
      >
        {/* Preview Area */}
        <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center overflow-hidden">
          {item.item_type === 'badge' ? (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{
                backgroundColor: `${color}15`,
                border: `2px solid ${color}`,
                boxShadow: `0 0 40px ${color}30`,
              }}
            >
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={name || 'Badge'}
                  className="w-14 h-14 object-contain"
                />
              ) : (
                <Sparkles className="w-10 h-10" style={{ color }} />
              )}
            </div>
          ) : (
            <div className="w-full h-full">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={name || 'Template'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-muted-foreground/50" />
                </div>
              )}
            </div>
          )}

          {/* Type Badge */}
          <div className="absolute top-3 left-3">
            <Badge 
              variant="secondary" 
              className="bg-background/80 backdrop-blur-sm border-0 font-medium"
            >
              {item.item_type === 'badge' ? 'Badge' : 'Template'}
            </Badge>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            {isPurchased && (
              <Badge className="bg-green-500/90 text-white border-0 gap-1">
                <Check className="w-3 h-3" />
                Owned
              </Badge>
            )}
            {item.status === 'pending' && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                Pending
              </Badge>
            )}
            {item.status === 'denied' && (
              <Badge variant="destructive" className="gap-1">
                <X className="w-3 h-3" />
                Denied
              </Badge>
            )}
            {isSoldOut && !isPurchased && (
              <Badge variant="secondary">Sold Out</Badge>
            )}
          </div>

          {/* Stock Badge */}
          <div className="absolute bottom-3 right-3">
            <Badge 
              variant="outline" 
              className="bg-background/80 backdrop-blur-sm text-xs font-mono"
            >
              {saleTypeLabel()}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground truncate">
              {name || 'Unnamed'}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <User className="w-3 h-3" />
              <span className="truncate">
                {item.seller_username || 'Unknown'}
              </span>
            </div>
          </div>

          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}

          {item.status === 'denied' && item.denial_reason && (
            <p className="text-xs text-destructive">
              Reason: {item.denial_reason}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-500">
              <Coins className="w-4 h-4" />
              <span>{item.price.toLocaleString()}</span>
              <span className="text-amber-500/60 text-sm font-normal">UC</span>
            </div>

            {!isOwner && !isPurchased && item.status === 'approved' && !isSoldOut && (
              <Button
                size="sm"
                disabled={!canAfford || purchaseMutation.isPending}
                onClick={() => setShowConfirm(true)}
                className="gap-1.5"
              >
                <ShoppingCart className="w-4 h-4" />
                {canAfford ? 'Buy' : 'Insufficient'}
              </Button>
            )}

            {isPurchased && (
            <div className="flex gap-1.5">
              {hasTemplateData && (
                <Button 
                  size="sm" 
                  variant="default"
                  className="gap-1.5"
                  onClick={() => setShowApplyConfirm(true)}
                  disabled={applyTemplateMutation.isPending}
                >
                  <Wand2 className="w-4 h-4" />
                  Apply
                </Button>
              )}
              <Button size="sm" variant="secondary" disabled className="gap-1">
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
            )}
          </div>
        </div>
      </motion.div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You're about to purchase <strong>{name}</strong> for{' '}
                  <strong>{item.price.toLocaleString()} UC</strong>.
                </p>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p>
                    Balance after purchase:{' '}
                    <strong className="text-foreground">
                      {(userBalance - item.price).toLocaleString()} UC
                    </strong>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurchase}
              disabled={purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? 'Processing...' : 'Confirm Purchase'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Template</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Apply the <strong>{name}</strong> template to your profile?
                </p>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600">
                  <p className="font-medium">⚠️ This will overwrite your current profile style settings.</p>
                  <p className="mt-1 text-xs opacity-80">
                    Your personal data (username, bio, display name) will NOT be changed.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyTemplate} disabled={applyTemplateMutation.isPending}>
              {applyTemplateMutation.isPending ? 'Applying...' : 'Apply Template'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

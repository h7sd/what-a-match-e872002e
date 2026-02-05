import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Coins, Tag, ArrowRight, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMarketplaceItems, useUserBalance } from '@/hooks/useMarketplace';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function MarketplacePopover() {
  const { user } = useAuth();
  const { data: balance } = useUserBalance();
  const { data: items, isLoading } = useMarketplaceItems();
  
  // Get the newest 4 items
  const featuredItems = items?.slice(0, 4) || [];
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Marketplace</span>
        </div>
        {user && balance && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-500">{balance.balance?.toLocaleString() || 0} UC</span>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Buy & sell badges and profile templates with UV currency
      </p>
      
      {/* Featured Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Latest Items</span>
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : featuredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {featuredItems.map((item) => (
              <div
                key={item.id}
                className="group p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/50 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  {item.badge_icon_url ? (
                    <img 
                      src={item.badge_icon_url} 
                      alt={item.badge_name || ''} 
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div 
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ backgroundColor: item.badge_color || '#8B5CF6' }}
                    >
                      <Tag className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">
                      {item.badge_name || item.template_name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Coins className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-bold text-amber-500">{item.price}</span>
                    </div>
                  </div>
                </div>
                {item.sale_type === 'single' && (
                  <Badge variant="outline" className="mt-1.5 text-[10px] px-1.5 py-0 h-4 border-purple-500/50 text-purple-400">
                    <Crown className="w-2.5 h-2.5 mr-0.5" />
                    Unique
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No items available yet
          </div>
        )}
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-border/50">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{items?.length || 0}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Items</div>
        </div>
        <div className="text-center border-x border-border/50">
          <div className="text-lg font-bold text-primary">1,000</div>
          <div className="text-[10px] text-muted-foreground uppercase">Start UC</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-500">∞</div>
          <div className="text-[10px] text-muted-foreground uppercase">Trades</div>
        </div>
      </div>
      
      {/* CTA */}
      {user ? (
        <Link to="/dashboard?tab=marketplace">
          <Button className="w-full gap-2 bg-gradient-to-r from-primary to-[#00D9A5] hover:opacity-90">
            Open Marketplace
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      ) : (
        <Link to="/auth">
          <Button className="w-full gap-2 bg-gradient-to-r from-primary to-[#00D9A5] hover:opacity-90">
            Sign in to Trade
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}
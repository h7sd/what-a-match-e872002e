import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Coins, 
  Search, 
  ShoppingBag, 
  Tag, 
  Plus, 
  History, 
  TrendingUp,
  ExternalLink,
  Package,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  useUserBalance, 
  useMarketplaceItems, 
  useMyMarketplaceItems, 
  useMyPurchases, 
  useUCTransactions,
  MarketplaceItem
} from '@/hooks/useMarketplace';
import { MarketplaceBadgeCard } from './MarketplaceBadgeCard';
import { MarketplaceTemplateCard } from './MarketplaceTemplateCard';
import { CreateListingDialog } from './CreateListingDialog';
import { TransactionHistory } from './TransactionHistory';
import { cn } from '@/lib/utils';
import { formatUC } from '@/lib/uc';
import { useIsMobile } from '@/hooks/use-mobile';
 
 type TabValue = 'browse' | 'my-items' | 'purchases' | 'history';
 
 const tabs: { value: TabValue; label: string; icon: React.ReactNode }[] = [
   { value: 'browse', label: 'Browse', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
   { value: 'my-items', label: 'Listings', icon: <Tag className="w-3.5 h-3.5" /> },
   { value: 'purchases', label: 'Owned', icon: <Package className="w-3.5 h-3.5" /> },
   { value: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
 ];
 
 export function MarketplacePage() {
   const [searchQuery, setSearchQuery] = useState('');
   const [showCreateDialog, setShowCreateDialog] = useState(false);
   const [activeTab, setActiveTab] = useState<TabValue>('browse');
   
   const { data: balance } = useUserBalance();
   const { data: items, isLoading: itemsLoading } = useMarketplaceItems();
   const { data: myItems } = useMyMarketplaceItems();
   const { data: myPurchases } = useMyPurchases();
   const { data: transactions } = useUCTransactions();
 
   // Filter and split items
   const { badges, templates } = useMemo(() => {
     const sourceItems = activeTab === 'browse' 
       ? items 
       : activeTab === 'my-items' 
         ? myItems 
         : activeTab === 'purchases'
           ? myPurchases?.map(p => p.item as MarketplaceItem)
           : [];
 
     const filtered = (sourceItems || []).filter(item => {
       if (!searchQuery) return true;
       const name = item.item_type === 'badge' ? item.badge_name : item.template_name;
       return name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         item.seller_username?.toLowerCase().includes(searchQuery.toLowerCase());
     });
 
     return {
       badges: filtered.filter(i => i.item_type === 'badge'),
       templates: filtered.filter(i => i.item_type === 'template'),
     };
   }, [items, myItems, myPurchases, activeTab, searchQuery]);
 
   const userBalance = balance?.balance ?? 0n;
   const isOwner = activeTab === 'my-items';
   const isPurchased = activeTab === 'purchases';
 
  return (
    <div className="space-y-3 sm:space-y-4 pb-4">
      {/* Compact Header - Mobile optimized */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate">Marketplace</h1>
            <p className="text-[10px] text-muted-foreground hidden xs:block">
              {items?.filter(i => i.item_type === 'badge').length || 0} badges · {items?.filter(i => i.item_type === 'template').length || 0} templates
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-amber-500 text-xs">
              {formatUC(balance?.balance)}
            </span>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Sell</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" asChild>
            <Link to="/marketplace">
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs + Search Row - Mobile optimized */}
      <div className="space-y-2">
        {/* Tab Pills - Horizontally scrollable */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 overflow-x-auto no-scrollbar -mx-1 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[40px] flex-shrink-0",
                activeTab === tab.value
                  ? "text-foreground bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground active:bg-background/50"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search - Full width */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-10 w-full text-sm bg-muted/50"
          />
        </div>
      </div>
 
      {/* Content */}
      <div className="animate-fade-in">
        {activeTab === 'history' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transaction History</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Earned: <span className="text-emerald-500 font-medium">{formatUC(balance?.total_earned)}</span></span>
              </div>
            </div>
            <TransactionHistory transactions={transactions || []} />
          </div>
        ) : (
          <TwoColumnLayout
            badges={badges}
            templates={templates}
            userBalance={userBalance}
            isLoading={itemsLoading && activeTab === 'browse'}
            isOwner={isOwner}
            isPurchased={isPurchased}
            onCreateListing={() => setShowCreateDialog(true)}
          />
        )}
      </div>
 
      <CreateListingDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}
 
 interface TwoColumnLayoutProps {
   badges: MarketplaceItem[];
   templates: MarketplaceItem[];
   userBalance: bigint;
   isLoading: boolean;
   isOwner: boolean;
   isPurchased: boolean;
   onCreateListing: () => void;
 }
 
function TwoColumnLayout({ 
  badges, 
  templates, 
  userBalance, 
  isLoading, 
  isOwner, 
  isPurchased,
  onCreateListing 
}: TwoColumnLayoutProps) {
  const isMobile = useIsMobile();
  const [templatesExpanded, setTemplatesExpanded] = useState(!isMobile);
   if (isLoading) {
     return (
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
           {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
         </div>
         <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
           <div className="grid grid-cols-2 gap-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
           </div>
         </div>
       </div>
     );
   }
 
   const isEmpty = badges.length === 0 && templates.length === 0;
 
    if (isEmpty) {
      return (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center animate-fade-in">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">No items found</p>
          <Button variant="outline" size="sm" onClick={onCreateListing} className="h-8 text-xs">
            List first item
          </Button>
        </div>
      );
    }
 
    return (
      <div className="space-y-5 sm:space-y-6">
        {/* Badges Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 py-2 border-b border-border/30">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold text-sm text-foreground">Badges</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {badges.length}
            </span>
          </div>
          
          {badges.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground/60">
              No badges available
            </div>
          ) : (
            <div className="space-y-2">
              {badges.slice(0, 10).map((item) => (
                <MarketplaceBadgeCard
                  key={item.id}
                  item={item}
                  userBalance={userBalance}
                  isOwner={isOwner}
                  isPurchased={isPurchased}
                />
              ))}
              {badges.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{badges.length - 10} more badges
                </p>
              )}
            </div>
          )}
        </div>

        {/* Templates Section - Collapsible on mobile */}
        <Collapsible open={templatesExpanded} onOpenChange={setTemplatesExpanded}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between gap-2 py-2 border-b border-border/30 hover:bg-muted/30 transition-colors rounded-t-lg px-2 -mx-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span className="font-semibold text-sm text-foreground">Templates</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {templates.length}
                </span>
              </div>
              {isMobile && (
                templatesExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )
              )}
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            {templates.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground/60">
                No templates available
              </div>
            ) : (
              <div className={cn(
                "grid gap-2 pt-2",
                isMobile ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3 gap-3"
              )}>
                {templates.slice(0, isMobile ? 4 : 6).map((item) => (
                  <MarketplaceTemplateCard
                    key={item.id}
                    item={item}
                    userBalance={userBalance}
                    isOwner={isOwner}
                    isPurchased={isPurchased}
                  />
                ))}
                {templates.length > (isMobile ? 4 : 6) && (
                  <div className="col-span-full text-xs text-muted-foreground text-center py-2">
                    +{templates.length - (isMobile ? 4 : 6)} more templates
                  </div>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

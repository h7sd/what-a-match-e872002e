import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Coins, 
  Search, 
  ShoppingBag, 
  Tag, 
  Plus, 
  History, 
  TrendingUp,
  ExternalLink,
  Package
} from 'lucide-react';
import { 
  useUserBalance, 
  useMarketplaceItems, 
  useMyMarketplaceItems, 
  useMyPurchases, 
  useUCTransactions 
} from '@/hooks/useMarketplace';
import { MarketplaceGrid } from './MarketplaceGrid';
import { CreateListingDialog } from './CreateListingDialog';
import { TransactionHistory } from './TransactionHistory';
import { cn } from '@/lib/utils';
import PillNav from '@/components/ui/PillNav';
import { formatUC } from '@/lib/uc';

type ItemFilter = 'all' | 'badge' | 'template';
type TabValue = 'browse' | 'my-items' | 'purchases' | 'history';

export function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [itemFilter, setItemFilter] = useState<ItemFilter>('all');
  const [activeTab, setActiveTab] = useState<TabValue>('browse');
  
  const { data: balance } = useUserBalance();
  const { data: items, isLoading: itemsLoading } = useMarketplaceItems();
  const { data: myItems } = useMyMarketplaceItems();
  const { data: myPurchases } = useMyPurchases();
  const { data: transactions } = useUCTransactions();

  const pillNavItems = [
    { label: 'Browse', value: 'browse', icon: <ShoppingBag className="w-4 h-4" /> },
    { label: 'My Listings', value: 'my-items', icon: <Tag className="w-4 h-4" /> },
    { label: 'Purchases', value: 'purchases', icon: <Package className="w-4 h-4" /> },
    { label: 'History', value: 'history', icon: <History className="w-4 h-4" /> },
  ];
  
  const filteredItems = items?.filter(item => {
    const name = item.item_type === 'badge' ? item.badge_name : item.template_name;
    const matchesSearch = !searchQuery ||
      name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller_username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = itemFilter === 'all' || item.item_type === itemFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Marketplace
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Buy and sell badges & profile templates
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
            <Coins className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-amber-500">
              {formatUC(balance?.balance)} UC
            </span>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Sell Item
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link to="/marketplace">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PillNav
            items={pillNavItems}
            activeValue={activeTab}
            onChange={(value) => setActiveTab(value as TabValue)}
          />

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48 bg-muted/50"
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              {(['all', 'badge', 'template'] as ItemFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant="ghost"
                  size="sm"
                  onClick={() => setItemFilter(filter)}
                  className={cn(
                    "capitalize text-xs px-2",
                    itemFilter === filter && "bg-background shadow-sm"
                  )}
                >
                  {filter === 'all' ? 'All' : filter === 'badge' ? 'Badges' : 'Templates'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'browse' && (
          <MarketplaceGrid 
            items={filteredItems || []} 
            isLoading={itemsLoading}
            userBalance={balance?.balance ?? 0n}
            emptyMessage="No items found"
            emptyAction={() => setShowCreateDialog(true)}
            emptyActionLabel="Be the first to list something!"
          />
        )}

        {activeTab === 'my-items' && (
          <MarketplaceGrid 
            items={myItems || []} 
            isLoading={false}
            userBalance={balance?.balance ?? 0n}
            isOwner
            emptyMessage="You haven't listed anything yet"
            emptyAction={() => setShowCreateDialog(true)}
            emptyActionLabel="Create your first listing"
          />
        )}

        {activeTab === 'purchases' && (
          <MarketplaceGrid 
            items={myPurchases?.map(p => p.item as any) || []} 
            isLoading={false}
            userBalance={balance?.balance ?? 0n}
            isPurchased
            emptyMessage="No purchases yet"
          />
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">UC Transaction History</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Total Earned: {formatUC(balance?.total_earned)} UC</span>
              </div>
            </div>
            <TransactionHistory transactions={transactions || []} />
          </div>
        )}
      </div>

      <CreateListingDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}

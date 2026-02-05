import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Search, 
  Coins, 
  Plus, 
  Tag, 
  Filter,
  Sparkles,
  TrendingUp,
  ArrowLeft,
  Package
} from 'lucide-react';

import { ModernHeader } from '@/components/landing/ModernHeader';
import { ModernFooter } from '@/components/landing/ModernFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { 
  useUserBalance, 
  useMarketplaceItems, 
  useMyMarketplaceItems, 
  useMyPurchases 
} from '@/hooks/useMarketplace';
import { MarketplaceGrid } from '@/components/marketplace/MarketplaceGrid';
import { CreateListingDialog } from '@/components/marketplace/CreateListingDialog';
import { cn } from '@/lib/utils';
import { formatUC } from '@/lib/uc';

type ItemFilter = 'all' | 'badge' | 'template';

export default function Marketplace() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'browse';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [itemFilter, setItemFilter] = useState<ItemFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: balance } = useUserBalance();
  const { data: items, isLoading: itemsLoading } = useMarketplaceItems();
  const { data: myItems } = useMyMarketplaceItems();
  const { data: myPurchases } = useMyPurchases();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Filter items based on search and type
  const filteredItems = items?.filter(item => {
    const name = item.item_type === 'badge' ? item.badge_name : item.template_name;
    const matchesSearch = !searchQuery || 
      name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller_username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = itemFilter === 'all' || item.item_type === itemFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    totalItems: items?.length || 0,
    totalBadges: items?.filter(i => i.item_type === 'badge').length || 0,
    totalTemplates: items?.filter(i => i.item_type === 'template').length || 0,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ModernHeader />
      
      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative py-16 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-30" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <ShoppingBag className="w-4 h-4" />
                Marketplace
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
                Trade Badges & Templates
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Buy and sell unique badges and profile templates using UC. 
                Create your own listings or discover items from other creators.
              </p>
            </motion.div>

            {/* Stats & Balance Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50"
            >
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.totalItems}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Items</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.totalBadges}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Badges</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.totalTemplates}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Templates</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                      <Coins className="w-5 h-5 text-amber-500" />
                      <span className="font-bold text-amber-500 text-lg">
                        {formatUC(balance?.balance)}
                      </span>
                      <span className="text-amber-500/70 text-sm">UC</span>
                    </div>
                    <Button 
                      onClick={() => setShowCreateDialog(true)} 
                      className="gap-2"
                      size="lg"
                    >
                      <Plus className="w-4 h-4" />
                      Sell Item
                    </Button>
                  </>
                ) : (
                  <Button asChild size="lg">
                    <Link to="/auth">Sign in to Trade</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <TabsList className="bg-muted/50 p-1">
                  <TabsTrigger value="browse" className="gap-2 data-[state=active]:bg-background">
                    <ShoppingBag className="w-4 h-4" />
                    Browse
                  </TabsTrigger>
                  {user && (
                    <>
                      <TabsTrigger value="my-listings" className="gap-2 data-[state=active]:bg-background">
                        <Tag className="w-4 h-4" />
                        My Listings
                      </TabsTrigger>
                      <TabsTrigger value="purchases" className="gap-2 data-[state=active]:bg-background">
                        <Package className="w-4 h-4" />
                        Purchases
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                {/* Search & Filters */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64 bg-muted/50"
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
                          "capitalize",
                          itemFilter === filter && "bg-background shadow-sm"
                        )}
                      >
                        {filter === 'all' ? 'All' : filter === 'badge' ? 'Badges' : 'Templates'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <TabsContent value="browse" className="mt-0">
                <MarketplaceGrid 
                  items={filteredItems || []} 
                  isLoading={itemsLoading}
                  userBalance={balance?.balance ?? 0n}
                  emptyMessage="No items found"
                  emptyAction={user ? () => setShowCreateDialog(true) : undefined}
                  emptyActionLabel="Be the first to list something!"
                />
              </TabsContent>

              <TabsContent value="my-listings" className="mt-0">
                <MarketplaceGrid 
                  items={myItems || []} 
                  isLoading={false}
                  userBalance={balance?.balance ?? 0n}
                  isOwner
                  emptyMessage="You haven't listed anything yet"
                  emptyAction={() => setShowCreateDialog(true)}
                  emptyActionLabel="Create your first listing"
                />
              </TabsContent>

              <TabsContent value="purchases" className="mt-0">
                <MarketplaceGrid 
                  items={myPurchases?.map(p => p.item as any) || []} 
                  isLoading={false}
                  userBalance={balance?.balance ?? 0n}
                  isPurchased
                  emptyMessage="No purchases yet"
                  emptyAction={() => setActiveTab('browse')}
                  emptyActionLabel="Browse the marketplace"
                />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <ModernFooter />
      
      <CreateListingDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}

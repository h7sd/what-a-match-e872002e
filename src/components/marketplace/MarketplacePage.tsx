 import { useState } from 'react';
 import { Link } from 'react-router-dom';
 import { motion, AnimatePresence } from 'framer-motion';
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
   Package,
   Sparkles
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
 import { formatUC } from '@/lib/uc';
 
 type ItemFilter = 'all' | 'badge' | 'template';
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
   const [itemFilter, setItemFilter] = useState<ItemFilter>('all');
   const [activeTab, setActiveTab] = useState<TabValue>('browse');
   
   const { data: balance } = useUserBalance();
   const { data: items, isLoading: itemsLoading } = useMarketplaceItems();
   const { data: myItems } = useMyMarketplaceItems();
   const { data: myPurchases } = useMyPurchases();
   const { data: transactions } = useUCTransactions();
 
   const filteredItems = items?.filter(item => {
     const name = item.item_type === 'badge' ? item.badge_name : item.template_name;
     const matchesSearch = !searchQuery ||
       name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       item.seller_username?.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesType = itemFilter === 'all' || item.item_type === itemFilter;
     return matchesSearch && matchesType;
   });
 
   const stats = {
     badges: items?.filter(i => i.item_type === 'badge').length || 0,
     templates: items?.filter(i => i.item_type === 'template').length || 0,
   };
 
   return (
     <div className="space-y-4">
       {/* Compact Header */}
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
             <ShoppingBag className="w-4.5 h-4.5 text-primary" />
           </div>
           <div>
             <h1 className="text-lg font-semibold">Marketplace</h1>
             <p className="text-xs text-muted-foreground">
               {stats.badges} badges · {stats.templates} templates
             </p>
           </div>
         </div>
         
         <div className="flex items-center gap-2">
           <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
             <Coins className="w-4 h-4 text-amber-500" />
             <span className="font-semibold text-amber-500 text-sm">
               {formatUC(balance?.balance)}
             </span>
           </div>
           <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-8 gap-1.5">
             <Plus className="w-3.5 h-3.5" />
             <span className="hidden sm:inline">Sell</span>
           </Button>
           <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
             <Link to="/marketplace">
               <ExternalLink className="w-3.5 h-3.5" />
             </Link>
           </Button>
         </div>
       </div>
 
       {/* Tabs + Search Row */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
         {/* Tab Pills */}
         <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
           {tabs.map((tab) => (
             <button
               key={tab.value}
               onClick={() => setActiveTab(tab.value)}
               className={cn(
                 "relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                 activeTab === tab.value
                   ? "text-foreground"
                   : "text-muted-foreground hover:text-foreground"
               )}
             >
               {activeTab === tab.value && (
                 <motion.div
                   layoutId="activeTab"
                   className="absolute inset-0 bg-background shadow-sm rounded-md"
                   transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                 />
               )}
               <span className="relative z-10 flex items-center gap-1.5">
                 {tab.icon}
                 {tab.label}
               </span>
             </button>
           ))}
         </div>
 
         {/* Search + Filter */}
         <div className="flex items-center gap-2">
           <div className="relative">
             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
             <Input
               placeholder="Search..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-8 h-8 w-40 text-xs bg-muted/50"
             />
           </div>
           <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/50">
             {(['all', 'badge', 'template'] as ItemFilter[]).map((filter) => (
               <button
                 key={filter}
                 onClick={() => setItemFilter(filter)}
                 className={cn(
                   "px-2 py-1 text-[10px] font-medium rounded transition-all",
                   itemFilter === filter
                     ? "bg-background text-foreground shadow-sm"
                     : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 {filter === 'all' ? 'All' : filter === 'badge' ? <Sparkles className="w-3 h-3" /> : <Package className="w-3 h-3" />}
               </button>
             ))}
           </div>
         </div>
       </div>
 
       {/* Content */}
       <AnimatePresence mode="wait">
         <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 8 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -8 }}
           transition={{ duration: 0.15 }}
         >
           {activeTab === 'browse' && (
             <MarketplaceGrid 
               items={filteredItems || []} 
               isLoading={itemsLoading}
               userBalance={balance?.balance ?? 0n}
               emptyMessage="No items found"
               emptyAction={() => setShowCreateDialog(true)}
               emptyActionLabel="List first item"
               showCategories={itemFilter === 'all'}
             />
           )}
 
           {activeTab === 'my-items' && (
             <MarketplaceGrid 
               items={myItems || []} 
               isLoading={false}
               userBalance={balance?.balance ?? 0n}
               isOwner
               emptyMessage="No listings yet"
               emptyAction={() => setShowCreateDialog(true)}
               emptyActionLabel="Create listing"
             />
           )}
 
           {activeTab === 'purchases' && (
             <MarketplaceGrid 
               items={myPurchases?.map(p => p.item as any) || []} 
               isLoading={false}
               userBalance={balance?.balance ?? 0n}
               isPurchased
               emptyMessage="No purchases yet"
               showCategories
             />
           )}
 
           {activeTab === 'history' && (
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
           )}
         </motion.div>
       </AnimatePresence>
 
       <CreateListingDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
     </div>
   );
 }

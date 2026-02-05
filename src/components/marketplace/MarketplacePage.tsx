 import { useState, useMemo } from 'react';
 import { Link } from 'react-router-dom';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Skeleton } from '@/components/ui/skeleton';
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
   useUCTransactions,
   MarketplaceItem
 } from '@/hooks/useMarketplace';
 import { MarketplaceBadgeCard } from './MarketplaceBadgeCard';
 import { MarketplaceTemplateCard } from './MarketplaceTemplateCard';
 import { CreateListingDialog } from './CreateListingDialog';
 import { TransactionHistory } from './TransactionHistory';
 import { cn } from '@/lib/utils';
 import { formatUC } from '@/lib/uc';
 
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
               {items?.filter(i => i.item_type === 'badge').length || 0} badges · {items?.filter(i => i.item_type === 'template').length || 0} templates
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
 
         {/* Search */}
        <div className="relative flex-shrink-0">
           <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
           <Input
             placeholder="Search..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 w-36 text-xs bg-muted/50"
           />
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
         </motion.div>
       </AnimatePresence>
 
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
       <motion.div 
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         className="flex flex-col items-center justify-center py-16 text-center"
       >
         <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
           <ShoppingBag className="w-6 h-6 text-muted-foreground" />
         </div>
         <p className="text-sm text-muted-foreground mb-3">No items found</p>
         <Button variant="outline" size="sm" onClick={onCreateListing}>
           List first item
         </Button>
       </motion.div>
     );
   }
 
   return (
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Badges Column */}
       <div className="space-y-3">
        <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 border-b border-border/30">
           <Sparkles className="w-4 h-4" />
          <span className="font-semibold text-foreground">Badges</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {badges.length}
          </span>
         </div>
         
         {badges.length === 0 ? (
           <div className="py-8 text-center text-xs text-muted-foreground/60">
             No badges available
           </div>
         ) : (
           <ScrollArea className="max-h-[400px] pr-2">
             <motion.div 
               className="space-y-2"
               initial="hidden"
               animate="visible"
               variants={{
                 hidden: {},
                 visible: { transition: { staggerChildren: 0.03 } }
               }}
             >
               {badges.map((item) => (
                 <MarketplaceBadgeCard
                   key={item.id}
                   item={item}
                   userBalance={userBalance}
                   isOwner={isOwner}
                   isPurchased={isPurchased}
                 />
               ))}
             </motion.div>
           </ScrollArea>
         )}
       </div>
 
       {/* Templates Column */}
       <div className="space-y-3">
        <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 border-b border-border/30">
           <Package className="w-4 h-4" />
          <span className="font-semibold text-foreground">Templates</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {templates.length}
          </span>
         </div>
         
         {templates.length === 0 ? (
           <div className="py-8 text-center text-xs text-muted-foreground/60">
             No templates available
           </div>
         ) : (
           <ScrollArea className="max-h-[400px] pr-2">
             <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
               initial="hidden"
               animate="visible"
               variants={{
                 hidden: {},
                 visible: { transition: { staggerChildren: 0.05 } }
               }}
             >
               {templates.map((item) => (
                 <MarketplaceTemplateCard
                   key={item.id}
                   item={item}
                   userBalance={userBalance}
                   isOwner={isOwner}
                   isPurchased={isPurchased}
                 />
               ))}
             </motion.div>
           </ScrollArea>
         )}
       </div>
     </div>
   );
 }

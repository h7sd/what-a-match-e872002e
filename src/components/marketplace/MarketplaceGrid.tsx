 import { motion, AnimatePresence } from 'framer-motion';
 import { ShoppingBag, Sparkles, Package } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { MarketplaceItem } from '@/hooks/useMarketplace';
 import { MarketplaceCard } from './MarketplaceCard';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface MarketplaceGridProps {
   items: MarketplaceItem[];
   isLoading: boolean;
   userBalance: bigint;
   isOwner?: boolean;
   isPurchased?: boolean;
   emptyMessage: string;
   emptyAction?: () => void;
   emptyActionLabel?: string;
   showCategories?: boolean;
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
   showCategories = false,
 }: MarketplaceGridProps) {
   if (isLoading) {
     return (
       <div className="space-y-3">
         {Array.from({ length: 6 }).map((_, i) => (
           <Skeleton key={i} className="h-[72px] rounded-xl" />
         ))}
       </div>
     );
   }
 
   if (!items || items.length === 0) {
     return (
       <motion.div 
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         className="flex flex-col items-center justify-center py-16 text-center"
       >
         <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
           <ShoppingBag className="w-6 h-6 text-muted-foreground" />
         </div>
         <p className="text-sm text-muted-foreground mb-3">{emptyMessage}</p>
         {emptyAction && emptyActionLabel && (
           <Button variant="outline" size="sm" onClick={emptyAction}>
             {emptyActionLabel}
           </Button>
         )}
       </motion.div>
     );
   }
 
   // Kategorisierte Ansicht
   if (showCategories) {
     const badges = items.filter(item => item.item_type === 'badge');
     const templates = items.filter(item => item.item_type === 'template');
 
     return (
       <div className="space-y-6">
         {badges.length > 0 && (
           <CategorySection
             title="Badges"
             icon={<Sparkles className="w-4 h-4" />}
             items={badges}
             userBalance={userBalance}
             isOwner={isOwner}
             isPurchased={isPurchased}
           />
         )}
         {templates.length > 0 && (
           <CategorySection
             title="Templates"
             icon={<Package className="w-4 h-4" />}
             items={templates}
             userBalance={userBalance}
             isOwner={isOwner}
             isPurchased={isPurchased}
           />
         )}
       </div>
     );
   }
 
   // Einfache Liste
   return (
     <motion.div 
       className="space-y-2"
       initial="hidden"
       animate="visible"
       variants={{
         hidden: {},
         visible: { transition: { staggerChildren: 0.03 } }
       }}
     >
       <AnimatePresence mode="popLayout">
         {items.map((item) => (
           <MarketplaceCard
             key={item.id}
             item={item}
             userBalance={userBalance}
             isOwner={isOwner}
             isPurchased={isPurchased}
           />
         ))}
       </AnimatePresence>
     </motion.div>
   );
 }
 
 interface CategorySectionProps {
   title: string;
   icon: React.ReactNode;
   items: MarketplaceItem[];
   userBalance: bigint;
   isOwner?: boolean;
   isPurchased?: boolean;
 }
 
 function CategorySection({ 
   title, 
   icon, 
   items, 
   userBalance, 
   isOwner, 
   isPurchased 
 }: CategorySectionProps) {
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="space-y-3"
     >
       <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
         {icon}
         <span>{title}</span>
         <span className="text-xs text-muted-foreground/60">({items.length})</span>
       </div>
       <div className="space-y-2">
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
     </motion.div>
   );
 }

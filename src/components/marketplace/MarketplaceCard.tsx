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
 import { formatUC } from '@/lib/uc';
 
 interface MarketplaceCardProps {
   item: MarketplaceItem;
   userBalance: bigint;
   isOwner?: boolean;
   isPurchased?: boolean;
   compact?: boolean;
 }
 
 export function MarketplaceCard({ 
   item, 
   userBalance, 
   isOwner, 
   isPurchased,
   compact = false
 }: MarketplaceCardProps) {
   const [showConfirm, setShowConfirm] = useState(false);
   const [showApplyConfirm, setShowApplyConfirm] = useState(false);
   const purchaseMutation = usePurchaseItem();
   const applyTemplateMutation = useApplyTemplate();
 
   const name = item.item_type === 'badge' ? item.badge_name : item.template_name;
   const description = item.item_type === 'badge' ? item.badge_description : item.template_description;
   const iconUrl = item.item_type === 'badge' ? item.badge_icon_url : item.template_preview_url;
   const color = item.badge_color || '#8B5CF6';
 
   const priceBI = BigInt(item.price);
   const canAfford = userBalance >= priceBI;
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
         return '1';
       case 'limited':
         return `${(item.stock_limit || 0) - item.stock_sold}`;
       default:
         return '∞';
     }
   };
 
   return (
     <>
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         whileHover={{ y: -2 }}
         transition={{ duration: 0.2 }}
         className={cn(
           "group relative rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-200",
           "hover:border-primary/40 hover:bg-card/80 hover:shadow-md hover:shadow-primary/5",
           item.status === 'denied' && "opacity-50",
           isSoldOut && !isPurchased && "opacity-60"
         )}
       >
         {/* Compact horizontal layout */}
         <div className="flex items-center gap-3 p-3">
           {/* Icon/Preview */}
           <div className={cn(
             "relative shrink-0 rounded-lg overflow-hidden flex items-center justify-center",
             item.item_type === 'badge' ? "w-12 h-12" : "w-14 h-14",
             "bg-gradient-to-br from-muted/60 to-muted/30"
           )}>
             {item.item_type === 'badge' ? (
               <div
                 className="w-full h-full rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                 style={{
                   backgroundColor: `${color}12`,
                   boxShadow: `inset 0 0 20px ${color}20`,
                 }}
               >
                 {iconUrl ? (
                   <img
                     src={iconUrl}
                     alt={name || 'Badge'}
                     className="w-8 h-8 object-contain"
                   />
                 ) : (
                   <Sparkles className="w-5 h-5" style={{ color }} />
                 )}
               </div>
             ) : (
               iconUrl ? (
                 <img
                   src={iconUrl}
                   alt={name || 'Template'}
                   className="w-full h-full object-cover"
                 />
               ) : (
                 <Package className="w-6 h-6 text-muted-foreground/40" />
               )
             )}
           </div>
 
           {/* Content */}
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2">
               <h3 className="font-medium text-sm text-foreground truncate">
                 {name || 'Unnamed'}
               </h3>
               {/* Status badges inline */}
               {isPurchased && (
                 <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] px-1.5 py-0">
                   <Check className="w-2.5 h-2.5 mr-0.5" />
                   Owned
                 </Badge>
               )}
               {item.status === 'pending' && (
                 <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                   <Clock className="w-2.5 h-2.5 mr-0.5" />
                   Pending
                 </Badge>
               )}
               {item.status === 'denied' && (
                 <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                   <X className="w-2.5 h-2.5 mr-0.5" />
                   Denied
                 </Badge>
               )}
               {isSoldOut && !isPurchased && (
                 <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Sold</Badge>
               )}
             </div>
             <div className="flex items-center gap-2 mt-0.5">
               <span className="text-xs text-muted-foreground truncate">
                 @{item.seller_username || 'unknown'}
               </span>
               <span className="text-muted-foreground/40">·</span>
               <span className="text-[10px] text-muted-foreground/60 font-mono">
                 {saleTypeLabel()} left
               </span>
             </div>
           </div>
 
           {/* Price & Action */}
           <div className="shrink-0 flex items-center gap-2">
             <div className="flex items-center gap-1 text-amber-500 font-semibold text-sm">
               <Coins className="w-3.5 h-3.5" />
               <span>{formatUC(item.price)}</span>
             </div>
 
             {!isOwner && !isPurchased && item.status === 'approved' && !isSoldOut && (
               <Button
                 size="sm"
                 variant={canAfford ? "default" : "secondary"}
                 disabled={!canAfford || purchaseMutation.isPending}
                 onClick={() => setShowConfirm(true)}
                 className="h-7 px-2.5 text-xs"
               >
                 <ShoppingCart className="w-3.5 h-3.5" />
               </Button>
             )}
 
             {isPurchased && hasTemplateData && (
               <Button 
                 size="sm"
                 variant="secondary"
                 className="h-7 px-2.5 text-xs"
                 onClick={() => setShowApplyConfirm(true)}
                 disabled={applyTemplateMutation.isPending}
               >
                 <Wand2 className="w-3.5 h-3.5" />
               </Button>
             )}
           </div>
         </div>
       </motion.div>
 
       <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
         <AlertDialogContent className="max-w-sm">
           <AlertDialogHeader>
             <AlertDialogTitle className="text-base">Confirm Purchase</AlertDialogTitle>
             <AlertDialogDescription asChild>
               <div className="space-y-2">
                 <p className="text-sm">
                   Buy <strong>{name}</strong> for <strong className="text-amber-500">{formatUC(item.price)} UC</strong>?
                 </p>
                 <div className="p-2 rounded-lg bg-muted/50 text-xs">
                   Balance after: <strong className="text-foreground">{formatUC(userBalance - priceBI)} UC</strong>
                 </div>
               </div>
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
             <AlertDialogAction
               onClick={handlePurchase}
               disabled={purchaseMutation.isPending}
               className="h-8 text-xs"
             >
               {purchaseMutation.isPending ? 'Processing...' : 'Confirm'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
 
       <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
         <AlertDialogContent className="max-w-sm">
           <AlertDialogHeader>
             <AlertDialogTitle className="text-base">Apply Template</AlertDialogTitle>
             <AlertDialogDescription asChild>
               <div className="space-y-2">
                 <p className="text-sm">Apply <strong>{name}</strong> to your profile?</p>
                 <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
                   ⚠️ This overwrites your current style settings.
                 </div>
               </div>
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
             <AlertDialogAction 
               onClick={handleApplyTemplate} 
               disabled={applyTemplateMutation.isPending}
               className="h-8 text-xs"
             >
               {applyTemplateMutation.isPending ? 'Applying...' : 'Apply'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 }

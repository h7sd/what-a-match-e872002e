 import { useState } from 'react';
 import { motion } from 'framer-motion';
 import { Coins, ShoppingCart, Check, Clock, Package, Eye, Wand2 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
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
 import { TemplatePreview } from './TemplatePreview';
 
 interface MarketplaceTemplateCardProps {
   item: MarketplaceItem;
   userBalance: bigint;
   isOwner?: boolean;
   isPurchased?: boolean;
 }
 
 export function MarketplaceTemplateCard({ 
   item, 
   userBalance, 
   isOwner, 
   isPurchased 
 }: MarketplaceTemplateCardProps) {
   const [showConfirm, setShowConfirm] = useState(false);
   const [showApplyConfirm, setShowApplyConfirm] = useState(false);
   const [showPreview, setShowPreview] = useState(false);
   const purchaseMutation = usePurchaseItem();
   const applyTemplateMutation = useApplyTemplate();
 
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
 
   const handleApply = () => {
     applyTemplateMutation.mutate(item.id);
     setShowApplyConfirm(false);
   };
 
   const hasTemplateData = !!item.template_data;
   // Static snapshot data - does NOT update when seller changes their profile
   const templateData = item.template_data as Record<string, unknown> | null;
 
   return (
     <>
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         whileHover={{ scale: 1.02 }}
         transition={{ duration: 0.2 }}
         className={cn(
           "group relative rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden",
           "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200",
           item.status === 'denied' && "opacity-50",
           isSoldOut && !isPurchased && "opacity-60"
         )}
       >
         {/* Profile Preview Thumbnail - STATIC snapshot */}
         <div 
           className="relative aspect-[3/4] bg-gradient-to-br from-muted/60 to-muted/30 overflow-hidden cursor-pointer"
           onClick={() => hasTemplateData && setShowPreview(true)}
         >
           {hasTemplateData ? (
             <div className="w-full h-full">
               <TemplatePreview templateData={templateData} mini />
             </div>
           ) : item.template_preview_url ? (
             <img
               src={item.template_preview_url}
               alt={item.template_name || 'Template'}
               className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
             />
           ) : (
             <div className="w-full h-full flex items-center justify-center">
               <Package className="w-10 h-10 text-muted-foreground/30" />
             </div>
           )}
 
           {/* Hover overlay */}
           {hasTemplateData && (
             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
               <div className="flex items-center gap-1.5 text-white text-xs font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                 <Eye className="w-3.5 h-3.5" />
                 View Profile
               </div>
             </div>
           )}
 
           {/* Status badges */}
           <div className="absolute top-2 right-2 flex flex-col gap-1">
             {isPurchased && (
               <Badge className="bg-emerald-500/90 text-white border-0 text-[10px] px-1.5 py-0">
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
             {isSoldOut && !isPurchased && (
               <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Sold</Badge>
             )}
           </div>
 
           {/* Price tag overlay */}
           <div className="absolute bottom-2 left-2 flex items-center gap-1 text-amber-400 font-bold text-xs bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
             <Coins className="w-3 h-3" />
             <span>{formatUC(item.price)}</span>
           </div>
         </div>
 
         {/* Footer */}
         <div className="p-2.5">
           <div className="flex items-center justify-between gap-2">
             <div className="min-w-0">
               <h3 className="font-medium text-xs text-foreground truncate">
                 {item.template_name || 'Unnamed'}
               </h3>
               <p className="text-[10px] text-muted-foreground truncate">
                 @{item.seller_username || 'unknown'}
               </p>
             </div>
 
             <div className="shrink-0 flex items-center gap-1">
               {!isOwner && !isPurchased && item.status === 'approved' && !isSoldOut && (
                 <Button
                   size="sm"
                   variant={canAfford ? "default" : "secondary"}
                   disabled={!canAfford || purchaseMutation.isPending}
                   onClick={() => setShowConfirm(true)}
                   className="h-6 w-6 p-0"
                 >
                   <ShoppingCart className="w-3 h-3" />
                 </Button>
               )}
 
               {isPurchased && hasTemplateData && (
                 <Button
                   size="sm"
                   variant="default"
                   onClick={() => setShowApplyConfirm(true)}
                   disabled={applyTemplateMutation.isPending}
                   className="h-6 px-2 text-[10px]"
                 >
                   <Wand2 className="w-3 h-3 mr-0.5" />
                   Apply
                 </Button>
               )}
             </div>
           </div>
         </div>
       </motion.div>
 
       {/* Full Preview Dialog - shows exact profile appearance */}
       <Dialog open={showPreview} onOpenChange={setShowPreview}>
         <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
           <DialogHeader className="p-4 pb-2 border-b border-border/50">
             <DialogTitle className="text-base flex items-center gap-2">
               {item.template_name || 'Template Preview'}
               <span className="text-xs font-normal text-muted-foreground">
                 by @{item.seller_username}
               </span>
             </DialogTitle>
           </DialogHeader>
           <div className="p-4">
             <div className="rounded-xl overflow-hidden border border-border/50 aspect-[9/16] max-h-[65vh]">
               <TemplatePreview templateData={templateData} />
             </div>
             <div className="flex items-center justify-between mt-4">
               <div className="flex items-center gap-2 text-amber-500 font-bold">
                 <Coins className="w-4 h-4" />
                 <span>{formatUC(item.price)} UC</span>
               </div>
               {!isOwner && !isPurchased && item.status === 'approved' && !isSoldOut && (
                 <Button
                   disabled={!canAfford || purchaseMutation.isPending}
                   onClick={() => { setShowPreview(false); setShowConfirm(true); }}
                   className="gap-1.5"
                 >
                   <ShoppingCart className="w-4 h-4" />
                   {canAfford ? 'Buy Now' : 'Insufficient UC'}
                 </Button>
               )}
             </div>
           </div>
         </DialogContent>
       </Dialog>
 
       {/* Purchase Confirmation */}
       <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
         <AlertDialogContent className="max-w-sm">
           <AlertDialogHeader>
             <AlertDialogTitle className="text-base">Buy Template</AlertDialogTitle>
             <AlertDialogDescription asChild>
               <div className="space-y-2">
                 <p className="text-sm">
                   Buy <strong>{item.template_name}</strong> for <strong className="text-amber-500">{formatUC(item.price)} UC</strong>?
                 </p>
                 <p className="text-xs text-muted-foreground">
                   Balance after: <span className="text-foreground font-medium">{formatUC(userBalance - priceBI)} UC</span>
                 </p>
               </div>
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={handlePurchase} disabled={purchaseMutation.isPending} className="h-8 text-xs">
               {purchaseMutation.isPending ? 'Buying...' : 'Confirm'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
 
       {/* Apply Confirmation */}
       <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
         <AlertDialogContent className="max-w-sm">
           <AlertDialogHeader>
             <AlertDialogTitle className="text-base">Apply Template</AlertDialogTitle>
             <AlertDialogDescription asChild>
               <div className="space-y-2">
                 <p className="text-sm">Apply <strong>{item.template_name}</strong> to your profile?</p>
                 <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
                   ⚠️ This overwrites your current style settings.
                 </div>
               </div>
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={handleApply} disabled={applyTemplateMutation.isPending} className="h-8 text-xs">
               {applyTemplateMutation.isPending ? 'Applying...' : 'Apply'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 }
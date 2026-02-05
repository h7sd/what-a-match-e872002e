 import { useMemo } from 'react';
 import { motion } from 'framer-motion';
 import { User, AtSign, Eye } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface TemplatePreviewProps {
   templateData: Record<string, unknown> | null;
   mini?: boolean;
 }
 
 export function TemplatePreview({ templateData, mini = false }: TemplatePreviewProps) {
   // Extract style properties from template data - this is a STATIC snapshot
   const styles = useMemo(() => {
     if (!templateData) return {};
     
     return {
       backgroundColor: templateData.background_color as string || '#0a0a0a',
       backgroundImage: templateData.background_url ? `url(${templateData.background_url})` : undefined,
       backgroundVideoUrl: templateData.background_video_url as string | undefined,
       cardColor: templateData.card_color as string || 'rgba(0,0,0,0.6)',
       textColor: templateData.text_color as string || '#ffffff',
       accentColor: templateData.accent_color as string || '#8B5CF6',
       avatarShape: templateData.avatar_shape as string || 'circle',
       avatarUrl: templateData.avatar_url as string | undefined,
       cardStyle: templateData.card_style as string || 'glass',
       profileOpacity: (templateData.profile_opacity as number) ?? 100,
       profileBlur: (templateData.profile_blur as number) ?? 0,
       cardBorderEnabled: templateData.card_border_enabled as boolean ?? true,
       cardBorderColor: templateData.card_border_color as string || '#ffffff',
       cardBorderWidth: (templateData.card_border_width as number) ?? 1,
       glowUsername: templateData.glow_username as boolean || false,
       glowBadges: templateData.glow_badges as boolean || false,
       transparentBadges: templateData.transparent_badges as boolean || false,
       nameFont: templateData.name_font as string || 'Inter',
       textFont: templateData.text_font as string || 'Inter',
       enableGradient: templateData.enable_profile_gradient as boolean || false,
       iconColor: templateData.icon_color as string | undefined,
       monochrome: templateData.monochrome_icons as boolean || false,
     };
   }, [templateData]);
 
   const avatarShapeClass = {
     circle: 'rounded-full',
     square: 'rounded-none',
     soft: 'rounded-lg',
     rounded: 'rounded-2xl',
   }[styles.avatarShape || 'circle'] || 'rounded-full';
 
   // Mini thumbnail version
   if (mini) {
     return (
       <div 
         className="w-full h-full relative overflow-hidden"
         style={{
           backgroundColor: styles.backgroundColor || '#0a0a0a',
           backgroundImage: styles.backgroundImage,
           backgroundSize: 'cover',
           backgroundPosition: 'center',
         }}
       >
         {/* Mini card preview */}
         <div className="absolute inset-0 flex items-center justify-center p-1.5">
           <div 
             className="w-[85%] p-1.5 rounded-md backdrop-blur-sm"
             style={{
               backgroundColor: styles.cardColor || 'rgba(0,0,0,0.6)',
               opacity: (styles.profileOpacity || 100) / 100,
               border: styles.cardBorderEnabled 
                 ? `1px solid ${styles.cardBorderColor || styles.accentColor}30` 
                 : undefined,
             }}
           >
             <div className="flex flex-col items-center gap-1">
               {/* Mini avatar */}
               <div 
                 className={cn("w-5 h-5 flex items-center justify-center", avatarShapeClass)}
                 style={{ 
                   backgroundColor: `${styles.accentColor}25`,
                   border: `1px solid ${styles.accentColor}40`
                 }}
               >
                 <User className="w-2.5 h-2.5" style={{ color: styles.accentColor }} />
               </div>
               {/* Mini text placeholders */}
               <div 
                 className="h-1 w-8 rounded-full" 
                 style={{ backgroundColor: `${styles.textColor || '#fff'}60` }} 
               />
               <div 
                 className="h-0.5 w-6 rounded-full" 
                 style={{ backgroundColor: `${styles.textColor || '#fff'}30` }} 
               />
               {/* Mini badges */}
               <div className="flex gap-0.5 mt-0.5">
                 {[1, 2, 3].map(i => (
                   <div 
                     key={i}
                     className="w-2 h-2 rounded-full"
                     style={{ backgroundColor: `${styles.accentColor}40` }}
                   />
                 ))}
               </div>
             </div>
           </div>
         </div>
       </div>
     );
   }
 
   // Full realistic profile preview - exact replica of ProfileCard
   return (
     <div 
       className="w-full h-full relative overflow-hidden"
       style={{
         backgroundColor: styles.backgroundColor || '#0a0a0a',
         backgroundImage: styles.backgroundImage,
         backgroundSize: 'cover',
         backgroundPosition: 'center',
       }}
     >
       {/* Background video if present */}
       {styles.backgroundVideoUrl && (
         <video
           src={styles.backgroundVideoUrl}
           autoPlay
           loop
           muted
           playsInline
           className="absolute inset-0 w-full h-full object-cover"
         />
       )}
 
       <div className="absolute inset-0 flex items-center justify-center p-4">
         {/* Card with glow effect */}
         <div className="relative w-full max-w-[280px]">
           {/* Glow behind card */}
           {styles.cardBorderEnabled && (
             <motion.div
               className="absolute -inset-1 rounded-2xl opacity-40 blur-xl"
               style={{
                 background: `linear-gradient(135deg, ${styles.accentColor}, ${styles.accentColor}80, ${styles.accentColor}40)`,
               }}
               animate={{ opacity: [0.3, 0.5, 0.3] }}
               transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
             />
           )}
 
           {/* Main card */}
           <div
             className="relative rounded-2xl p-5 backdrop-blur-xl overflow-hidden"
             style={{
               backgroundColor: styles.cardColor || 'rgba(0,0,0,0.6)',
               opacity: (styles.profileOpacity || 100) / 100,
               backdropFilter: styles.profileBlur > 0 ? `blur(${styles.profileBlur}px)` : undefined,
               border: styles.cardBorderEnabled 
                 ? `${styles.cardBorderWidth || 1}px solid ${styles.cardBorderColor || styles.accentColor}30` 
                 : undefined,
             }}
           >
             {/* Corner sparkles */}
             <motion.div
               className="absolute top-3 right-3 text-sm"
               animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
               transition={{ duration: 2, repeat: Infinity }}
               style={{ color: styles.accentColor }}
             >
               ✦
             </motion.div>
 
             {/* Gradient overlay */}
             <div
               className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
               style={{
                 background: `linear-gradient(135deg, ${styles.accentColor}30, transparent 50%, ${styles.accentColor}15)`,
               }}
             />
 
             <div className="relative z-10 flex flex-col items-center text-center">
               {/* Avatar with orbit effect simulation */}
               <div className="relative mb-4">
                 <motion.div
                   className="absolute inset-0 rounded-full"
                   style={{
                     background: `conic-gradient(from 0deg, ${styles.accentColor}40, transparent, ${styles.accentColor}40)`,
                   }}
                   animate={{ rotate: 360 }}
                   transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                 />
                 <div 
                   className={cn("w-16 h-16 flex items-center justify-center relative z-10 m-1", avatarShapeClass)}
                   style={{ 
                     backgroundColor: `${styles.accentColor}20`,
                     border: `2px solid ${styles.accentColor}50`,
                     boxShadow: `0 0 30px ${styles.accentColor}30`
                   }}
                 >
                   <User className="w-8 h-8" style={{ color: styles.accentColor }} />
                 </div>
               </div>
 
               {/* Display Name */}
               <h3 
                 className="text-lg font-bold mb-0.5"
                 style={{ 
                   color: styles.textColor || '#ffffff',
                   fontFamily: styles.nameFont || 'Inter',
                   textShadow: styles.glowUsername ? `0 0 20px ${styles.accentColor}` : undefined
                 }}
               >
                 Display Name
               </h3>
 
               {/* Username */}
               <p 
                 className="text-sm mb-2 flex items-center gap-0.5 opacity-60"
                 style={{ color: styles.textColor || '#ffffff' }}
               >
                 <AtSign className="w-3 h-3" />
                 username
               </p>
 
               {/* Badges */}
               <div 
                 className={cn(
                   "flex justify-center gap-1.5 mb-3 px-3 py-1.5 rounded-full",
                   !styles.transparentBadges && "bg-black/20 backdrop-blur-sm"
                 )}
               >
                 {[1, 2, 3].map(i => (
                   <motion.div 
                     key={i}
                     className="w-5 h-5 rounded-full flex items-center justify-center"
                     style={{ 
                       backgroundColor: `${styles.accentColor}25`,
                       border: `1px solid ${styles.accentColor}40`,
                       boxShadow: styles.glowBadges ? `0 0 10px ${styles.accentColor}40` : undefined
                     }}
                     whileHover={{ scale: 1.1 }}
                   >
                     <div 
                       className="w-2.5 h-2.5 rounded-full"
                       style={{ backgroundColor: styles.accentColor }}
                     />
                   </motion.div>
                 ))}
               </div>
 
               {/* Bio */}
               <p 
                 className="text-xs max-w-[200px] leading-relaxed mb-3 opacity-70"
                 style={{ 
                   color: styles.textColor || '#ffffff',
                   fontFamily: styles.textFont || 'Inter'
                 }}
               >
                 This is a sample bio text that shows how the template styling looks.
               </p>
 
               {/* Mock social links */}
               <div className="w-full space-y-1.5 mb-3">
                 {['Discord', 'Twitter'].map((name) => (
                   <div 
                     key={name}
                     className="h-7 rounded-lg flex items-center justify-center text-[10px] font-medium"
                     style={{ 
                       backgroundColor: `${styles.accentColor}12`,
                       border: `1px solid ${styles.accentColor}25`,
                       color: styles.textColor || '#ffffff'
                     }}
                   >
                     {name}
                   </div>
                 ))}
               </div>
 
               {/* Views */}
               <div 
                 className="flex items-center gap-1 text-[10px] opacity-50"
                 style={{ color: styles.textColor || '#ffffff' }}
               >
                 <Eye className="w-3 h-3" />
                 <span>1,234 views</span>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }
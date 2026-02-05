 import { useMemo } from 'react';
 import { motion } from 'framer-motion';
 import { User, AtSign, Eye, MapPin, Briefcase } from 'lucide-react';
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
       bio: templateData.bio as string | undefined,
       location: templateData.location as string | undefined,
       occupation: templateData.occupation as string | undefined,
     };
   }, [templateData]);
 
   const avatarShapeClasses = {
     circle: 'rounded-full',
     square: 'rounded-none',
     soft: 'rounded-lg',
     rounded: 'rounded-2xl',
   };
 
   const avatarShapeClass = avatarShapeClasses[styles.avatarShape as keyof typeof avatarShapeClasses] || 'rounded-full';
   const accentColor = styles.accentColor || '#8b5cf6';
 
   // Mini thumbnail version for card grid
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
         <div className="absolute inset-0 flex items-center justify-center p-2">
           <div className="relative w-[90%]">
             {/* Glow */}
             {styles.cardBorderEnabled && (
               <div
                 className="absolute -inset-0.5 rounded-xl opacity-40 blur-md"
                 style={{
                   background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80, ${accentColor}40)`,
                 }}
               />
             )}
             <div 
               className="relative p-2 rounded-xl backdrop-blur-xl overflow-hidden"
               style={{
                 backgroundColor: styles.cardColor || 'rgba(0,0,0,0.6)',
                 border: styles.cardBorderEnabled 
                   ? `1px solid ${styles.cardBorderColor || accentColor}30` 
                   : undefined,
               }}
             >
               <div className="flex flex-col items-center gap-1">
                 {/* Mini orbiting avatar */}
                 <div className="relative">
                   <motion.div
                     className="absolute inset-[-2px] pointer-events-none"
                     style={{
                       borderRadius: styles.avatarShape === 'circle' ? '50%' : '8px',
                       background: `conic-gradient(from 0deg, ${accentColor}40, transparent, ${accentColor}40)`,
                     }}
                     animate={{ rotate: 360 }}
                     transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                   />
                   <div 
                     className={cn("w-6 h-6 flex items-center justify-center relative z-10", avatarShapeClass)}
                     style={{ 
                       backgroundColor: `${accentColor}20`,
                       border: `1px solid ${accentColor}50`,
                     }}
                   >
                     <User className="w-3 h-3" style={{ color: accentColor }} />
                   </div>
                 </div>
                 {/* Name */}
                 <div 
                   className="h-1.5 w-10 rounded-full" 
                   style={{ backgroundColor: `${styles.textColor || '#fff'}70` }} 
                 />
                 <div 
                   className="h-1 w-7 rounded-full" 
                   style={{ backgroundColor: `${styles.textColor || '#fff'}40` }} 
                 />
                 {/* Badge dots */}
                 <div className="flex gap-0.5 mt-0.5">
                   {[1, 2, 3].map(i => (
                     <div 
                       key={i}
                       className="w-2 h-2 rounded-full"
                       style={{ 
                         backgroundColor: `${accentColor}30`,
                         border: `1px solid ${accentColor}50`,
                       }}
                     />
                   ))}
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     );
   }
 
   // Full realistic profile preview - EXACT replica of ProfileCard
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
 
       <div className="absolute inset-0 flex items-center justify-center p-6">
         {/* Card container - matches ProfileCard max-w-sm */}
         <div className="relative w-full max-w-sm mx-auto">
           {/* Animated glow effect behind card - exact match */}
           {styles.cardBorderEnabled && (
             <motion.div
               className="absolute -inset-1 rounded-2xl opacity-60 blur-xl"
               style={{
                 background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80, ${accentColor}40)`,
               }}
               animate={{ opacity: [0.4, 0.6, 0.4] }}
               transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
             />
           )}
 
           {/* Main card - exact styling from ProfileCard */}
           <div
             className="relative rounded-2xl p-8 backdrop-blur-xl overflow-hidden"
             style={{
               backgroundColor: styles.cardColor || 'rgba(0,0,0,0.6)',
               border: styles.cardBorderEnabled 
                 ? `${styles.cardBorderWidth || 1}px solid ${styles.cardBorderColor || accentColor}30` 
                 : undefined,
             }}
           >
             {/* Corner sparkle decorations - exact match */}
             <motion.div
               className="absolute top-4 right-4 text-lg"
               animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
               transition={{ duration: 2, repeat: Infinity }}
               style={{ color: accentColor }}
             >
               ✦
             </motion.div>
             <motion.div
               className="absolute bottom-4 right-4 text-lg"
               animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1, 0.8] }}
               transition={{ duration: 2, repeat: Infinity, delay: 1 }}
               style={{ color: accentColor }}
             >
               ✦
             </motion.div>
 
             {/* Gradient border glow overlay - exact match */}
             <div
               className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
               style={{
                 background: `linear-gradient(135deg, ${accentColor}30, transparent 50%, ${accentColor}20)`,
               }}
             />
 
             <div className="relative z-10 flex flex-col items-center text-center">
               {/* Avatar with OrbitingAvatar-style effect - size 120 like real */}
               <div className="mb-6 relative" style={{ width: 120, height: 120 }}>
                 {/* Glow ring animation */}
                 <motion.div
                   className="absolute inset-[-4px] pointer-events-none"
                   style={{
                     borderRadius: styles.avatarShape === 'circle' ? '50%' : '24px',
                     background: `conic-gradient(from 0deg, ${accentColor}40, transparent, ${accentColor}40)`,
                   }}
                   animate={{ rotate: 360 }}
                   transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                 />
                 
                 {/* Orbiting particle */}
                 <motion.div
                   className="absolute inset-[-4px] pointer-events-none"
                   style={{ borderRadius: styles.avatarShape === 'circle' ? '50%' : '24px' }}
                 >
                   <motion.div
                     className="absolute w-3 h-3 rounded-full"
                     style={{
                       background: `radial-gradient(circle, ${accentColor}, transparent)`,
                       boxShadow: `0 0 10px ${accentColor}`,
                       filter: 'blur(1px)',
                       top: -6,
                       left: '50%',
                       marginLeft: -6,
                     }}
                     animate={{ rotate: 360 }}
                     transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                   />
                 </motion.div>
 
                 {/* Avatar placeholder */}
                 <motion.div
                   className={cn("relative w-full h-full overflow-hidden flex items-center justify-center", avatarShapeClass)}
                   style={{ 
                     backgroundColor: `${accentColor}20`,
                     border: `2px solid ${accentColor}50`,
                     boxShadow: `inset 0 0 30px ${accentColor}20`,
                   }}
                   whileHover={{ scale: 1.05 }}
                   transition={{ type: 'spring', stiffness: 300 }}
                 >
                   <User className="w-12 h-12" style={{ color: accentColor }} />
                 </motion.div>
               </div>
 
               {/* Display Name - exact styling */}
               <h2 
                 className="text-2xl font-bold mb-1"
                 style={{ 
                   color: styles.textColor || '#ffffff',
                   fontFamily: styles.nameFont || 'Inter',
                   textShadow: styles.glowUsername ? `0 0 20px ${accentColor}` : undefined
                 }}
               >
                 Display Name
               </h2>
 
               {/* Username - exact styling */}
               <p 
                 className="text-muted-foreground text-sm mb-3 flex items-center gap-0.5"
                 style={{ color: `${styles.textColor || '#ffffff'}99` }}
               >
                 <AtSign className="w-3.5 h-3.5" />
                 username
               </p>
 
               {/* Badges container - exact styling */}
               <div 
                 className={cn(
                   "flex flex-wrap justify-center gap-2 mb-4 px-4 py-2 rounded-full",
                   !styles.transparentBadges && "bg-black/20 backdrop-blur-sm"
                 )}
               >
                 {[1, 2, 3].map(i => (
                   <motion.div 
                     key={i}
                     className="w-7 h-7 rounded-full flex items-center justify-center"
                     style={{ 
                       backgroundColor: `${accentColor}20`,
                       border: `1px solid ${accentColor}40`,
                       boxShadow: styles.glowBadges ? `0 0 10px ${accentColor}40` : undefined
                     }}
                     whileHover={{ scale: 1.1 }}
                   >
                     <div 
                       className="w-4 h-4 rounded-full"
                       style={{ backgroundColor: accentColor }}
                     />
                   </motion.div>
                 ))}
               </div>
 
               {/* Bio - exact styling */}
               <p 
                 className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-4"
                 style={{ 
                   color: `${styles.textColor || '#ffffff'}aa`,
                   fontFamily: styles.textFont || 'Inter'
                 }}
               >
                 {styles.bio || 'This is a sample bio text that shows how the template styling looks.'}
               </p>
 
               {/* Location & Occupation - exact styling */}
               <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
                 {styles.occupation && (
                   <div className="flex items-center gap-1" style={{ color: `${styles.textColor || '#ffffff'}80` }}>
                     <Briefcase className="w-3 h-3" />
                     <span>{styles.occupation}</span>
                   </div>
                 )}
                 {styles.location && (
                   <div className="flex items-center gap-1" style={{ color: `${styles.textColor || '#ffffff'}80` }}>
                     <MapPin className="w-3 h-3" />
                     <span>{styles.location}</span>
                   </div>
                 )}
                 {!styles.occupation && !styles.location && (
                   <>
                     <div className="flex items-center gap-1" style={{ color: `${styles.textColor || '#ffffff'}80` }}>
                       <Briefcase className="w-3 h-3" />
                       <span>Developer</span>
                     </div>
                     <div className="flex items-center gap-1" style={{ color: `${styles.textColor || '#ffffff'}80` }}>
                       <MapPin className="w-3 h-3" />
                       <span>Earth</span>
                     </div>
                   </>
                 )}
               </div>
 
               {/* Views - exact styling */}
               <div 
                 className="flex items-center justify-center gap-1 text-xs"
                 style={{ color: `${styles.textColor || '#ffffff'}80` }}
               >
                 <Eye className="w-3.5 h-3.5" />
                 <span>1,234 views</span>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }
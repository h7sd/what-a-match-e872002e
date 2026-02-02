import { SiDiscord } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useRef } from 'react';
import { Check } from 'lucide-react';

interface DiscordCardProps {
  isConnected?: boolean;
  discordUrl?: string;
}

export function DiscordCard({ isConnected = false, discordUrl = 'discord.gg/uservault' }: DiscordCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 500, damping: 100 });
  const springY = useSpring(mouseY, { stiffness: 500, damping: 100 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#5865F2]/20 via-transparent to-[#5865F2]/5 backdrop-blur-xl p-6 space-y-4"
    >
      {/* Spotlight effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${springX}px ${springY}px, rgba(88, 101, 242, 0.15), transparent 40%)`,
        }}
      />
      
      <div className="relative z-10 flex items-center gap-3">
        <motion.div 
          className="w-12 h-12 rounded-xl bg-[#5865F2] flex items-center justify-center shadow-lg shadow-[#5865F2]/30"
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <SiDiscord className="w-6 h-6 text-white" />
        </motion.div>
        <div>
          <p className="font-semibold text-white">Join our Discord</p>
          <p className="text-xs text-white/40">{discordUrl}</p>
        </div>
      </div>

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative z-10">
        <Button 
          className={`w-full rounded-xl h-11 font-medium transition-all ${
            isConnected 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 shadow-lg shadow-green-500/20' 
              : 'bg-gradient-to-r from-[#5865F2] to-[#7289DA] hover:opacity-90 shadow-lg shadow-[#5865F2]/30'
          }`}
          asChild
        >
          <a href={`https://${discordUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
            {isConnected ? (
              <>
                <Check className="w-4 h-4" />
                Connected to Discord
              </>
            ) : (
              <>
                <SiDiscord className="w-4 h-4" />
                Connect Discord
              </>
            )}
          </a>
        </Button>
      </motion.div>
    </motion.div>
  );
}

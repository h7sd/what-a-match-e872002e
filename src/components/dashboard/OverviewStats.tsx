import { Eye, Hash, User, TrendingUp } from 'lucide-react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

interface OverviewStatsProps {
  profileViews: number;
  uidNumber: number;
  username: string;
}

function AnimatedNumber({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + diff * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <>{displayValue.toLocaleString()}</>;
}

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  index: number;
  isNumber?: boolean;
  color?: 'primary' | 'blue' | 'amber' | 'emerald';
}

function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  index,
  isNumber = true,
  color = 'primary'
}: StatCardProps) {
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

  const colorStyles = {
    primary: {
      iconBg: 'from-primary/20 to-primary/5',
      iconBorder: 'border-primary/20 group-hover:border-primary/40',
      iconColor: 'text-primary',
      glow: 'rgba(0, 217, 165, 0.1)',
      gradientBorder: 'from-primary/20 via-transparent to-accent/20'
    },
    blue: {
      iconBg: 'from-blue-500/20 to-blue-500/5',
      iconBorder: 'border-blue-500/20 group-hover:border-blue-500/40',
      iconColor: 'text-blue-400',
      glow: 'rgba(59, 130, 246, 0.1)',
      gradientBorder: 'from-blue-500/20 via-transparent to-blue-400/20'
    },
    amber: {
      iconBg: 'from-amber-500/20 to-amber-500/5',
      iconBorder: 'border-amber-500/20 group-hover:border-amber-500/40',
      iconColor: 'text-amber-400',
      glow: 'rgba(245, 158, 11, 0.1)',
      gradientBorder: 'from-amber-500/20 via-transparent to-amber-400/20'
    },
    emerald: {
      iconBg: 'from-emerald-500/20 to-emerald-500/5',
      iconBorder: 'border-emerald-500/20 group-hover:border-emerald-500/40',
      iconColor: 'text-emerald-400',
      glow: 'rgba(16, 185, 129, 0.1)',
      gradientBorder: 'from-emerald-500/20 via-transparent to-emerald-400/20'
    }
  };

  const styles = colorStyles[color];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
    >
      {/* Spotlight effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${springX}px ${springY}px, ${styles.glow}, transparent 40%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${styles.iconBg} flex items-center justify-center border ${styles.iconBorder} transition-colors mb-4`}>
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-white">
            {isNumber && typeof value === 'number' ? (
              <AnimatedNumber value={value} />
            ) : (
              value
            )}
          </p>
          <p className="text-sm text-white/40">{label}</p>
        </div>
      </div>
      
      {/* Gradient border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${styles.gradientBorder}`} />
      </div>
    </motion.div>
  );
}

export function OverviewStats({ profileViews, uidNumber, username }: OverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        icon={Eye} 
        value={profileViews} 
        label="Profile Views" 
        index={0}
        color="primary"
      />
      <StatCard 
        icon={Hash} 
        value={`#${uidNumber}`} 
        label="User ID" 
        index={1}
        isNumber={false}
        color="blue"
      />
      <StatCard 
        icon={User} 
        value={`@${username}`} 
        label="Username" 
        index={2}
        isNumber={false}
        color="amber"
      />
      <StatCard 
        icon={TrendingUp} 
        value={0} 
        label="Link Clicks" 
        index={3}
        color="emerald"
      />
    </div>
  );
}

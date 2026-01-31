import { Link } from 'react-router-dom';
import { Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumLockProps {
  isPremium: boolean;
  children: React.ReactNode;
  featureName?: string;
  className?: string;
}

/**
 * Wraps content that should be locked for non-premium users.
 * Shows a blurred overlay with upgrade CTA when user is not premium.
 */
export function PremiumLock({ 
  isPremium, 
  children, 
  featureName = "Dieses Feature",
  className 
}: PremiumLockProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Blurred content underneath */}
      <div className="pointer-events-none select-none opacity-50 blur-[2px]">
        {children}
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg border border-amber-500/20">
        <Link 
          to="/premium"
          className="flex flex-col items-center gap-2 p-4 text-center group hover:scale-105 transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              Premium Feature
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Klicke zum Freischalten
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

interface PremiumBadgeProps {
  className?: string;
}

/**
 * Small premium badge indicator
 */
export function PremiumBadge({ className }: PremiumBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
      "bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-500 border border-amber-500/30",
      className
    )}>
      <Crown className="w-2.5 h-2.5" />
      Premium
    </span>
  );
}

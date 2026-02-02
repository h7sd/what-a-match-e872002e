import { useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, ArrowRight } from 'lucide-react';
import { checkUsernameExists, getPublicStats } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

function useStats() {
  return useQuery({
    queryKey: ['claim-section-stats'],
    queryFn: async () => {
      const stats = await getPublicStats();
      return {
        views: stats.totalViews,
        users: stats.totalUsers,
      };
    },
    staleTime: 60000,
  });
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K+';
  }
  return num.toString() + '+';
}

export function ClaimSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const navigate = useNavigate();
  const { data: stats } = useStats();
  
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const checkUsername = async (value: string) => {
    if (value.length < 1) {
      setStatus('idle');
      return;
    }
    
    setStatus('checking');
    try {
      const exists = await checkUsernameExists(value);
      const isAvailable = !exists;
      setStatus(isAvailable ? 'available' : 'taken');
    } catch {
      setStatus('idle');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);
    
    const timeout = setTimeout(() => checkUsername(value), 400);
    return () => clearTimeout(timeout);
  };

  const handleClaim = () => {
    if (username.length >= 1) {
      navigate(`/auth?claim=${username}`);
    }
  };

  return (
    <section ref={ref} className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Claim your username
        </h2>
        <p className="text-muted-foreground mb-8">
          Secure your unique link before someone else does
        </p>

        {/* Input container */}
        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-0 rounded-2xl glass p-2">
            <div className="flex items-center bg-secondary/50 rounded-xl px-4 py-3 flex-1">
              <span className="text-muted-foreground text-sm mr-1">uservault.cc/</span>
              <input
                type="text"
                value={username}
                onChange={handleChange}
                placeholder="yourname"
                maxLength={20}
                className="bg-transparent border-none outline-none text-foreground flex-1 min-w-0"
              />
              
              {/* Status indicator */}
              <div className="ml-2">
                {status === 'checking' && (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                )}
                {status === 'available' && (
                  <Check className="w-5 h-5 text-success" />
                )}
                {status === 'taken' && (
                  <X className="w-5 h-5 text-destructive" />
                )}
              </div>
            </div>

            <button
              onClick={handleClaim}
              disabled={username.length < 1}
              className="ml-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Claim</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Status message */}
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: status !== 'idle' ? 1 : 0, 
              height: status !== 'idle' ? 'auto' : 0 
            }}
            className="mt-3 text-sm"
          >
            {status === 'available' && (
              <span className="text-success">This username is available!</span>
            )}
            {status === 'taken' && (
              <span className="text-destructive">This username is already taken</span>
            )}
          </motion.p>
        </div>

        {/* Live Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center gap-8 md:gap-12 mt-12"
        >
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-muted-foreground/80">
              {formatNumber(stats?.users || 0)}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground/60">Active Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-muted-foreground/80">
              99.9%
            </p>
            <p className="text-xs md:text-sm text-muted-foreground/60">Uptime</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

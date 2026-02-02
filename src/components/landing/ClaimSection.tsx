import { useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, ArrowRight, Eye, Users, Gem } from 'lucide-react';
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
    return num.toLocaleString('en-US') + '+';
  }
  if (num >= 1000) {
    return num.toLocaleString('en-US') + '+';
  }
  return num.toLocaleString('en-US') + '+';
}

interface StatCardProps {
  value: string;
  label: string;
  icon: React.ElementType;
  delay: number;
  isInView: boolean;
}

function StatCard({ value, label, icon: Icon, delay, isInView }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="flex-1 min-w-[140px] bg-card/60 backdrop-blur-sm rounded-xl border border-border/50 p-4 md:p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
            {value}
          </p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">{label}</p>
        </div>
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </motion.div>
  );
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

  const userCount = stats?.users || 0;

  return (
    <section ref={ref} className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto text-center"
      >
        {/* Headline with user count */}
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
          Over <span className="text-primary">{formatNumber(userCount)}</span> people use UserVault — What are you waiting for?
        </h2>
        <p className="text-muted-foreground mb-10 max-w-3xl mx-auto">
          Create feature-rich, customizable and modern link-in-bio pages, along with fast and secure file hosting, all with UserVault.
        </p>

        {/* Stats Cards */}
        <div className="flex flex-wrap justify-center gap-4 mb-12 max-w-4xl mx-auto">
          <StatCard
            value={formatNumber(stats?.views || 0)}
            label="Profile Views"
            icon={Eye}
            delay={0.1}
            isInView={isInView}
          />
          <StatCard
            value={formatNumber(stats?.users || 0)}
            label="Users"
            icon={Users}
            delay={0.2}
            isInView={isInView}
          />
          <StatCard
            value="99.9%"
            label="Uptime"
            icon={Gem}
            delay={0.3}
            isInView={isInView}
          />
        </div>

        {/* Claim Section Title */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-lg md:text-xl font-medium text-foreground mb-6"
        >
          Claim your profile and create an account in minutes!
        </motion.p>

        {/* Input container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative max-w-md mx-auto"
        >
          <div className="flex items-center gap-0 rounded-2xl glass p-2">
            <div className="flex items-center bg-secondary/50 rounded-xl px-4 py-3 flex-1">
              <span className="text-muted-foreground text-sm mr-1">uservault.cc/</span>
              <input
                type="text"
                value={username}
                onChange={handleChange}
                placeholder="username"
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
              <span>Claim Now</span>
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
        </motion.div>
      </motion.div>
    </section>
  );
}

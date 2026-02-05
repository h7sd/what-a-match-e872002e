import { useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, ArrowRight, Eye, Users, Gem, Sparkles } from 'lucide-react';
import { checkUsernameExists, getPublicStats } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { CountUp } from './CountUp';
import { GradientText } from './GradientText';
import { Magnet } from './Magnet';

interface StatCardProps {
  value: number;
  label: string;
  icon: React.ElementType;
  delay: number;
  isInView: boolean;
  suffix?: string;
}

function StatCard({ value, label, icon: Icon, delay, isInView, suffix = '+' }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 min-w-[160px] group"
    >
      <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-6 transition-all duration-500 hover:border-primary/30 hover:bg-card/70">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-3xl md:text-4xl font-bold text-foreground">
              <CountUp to={value} duration={2.5} suffix={suffix} />
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">{label}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ClaimSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const navigate = useNavigate();
  const { data: stats } = useQuery({
    queryKey: ['public-stats'],
    queryFn: getPublicStats,
    staleTime: 5 * 60 * 1000,
  });

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

  const userCount = stats?.totalUsers || 0;
  const viewCount = stats?.totalViews || 0;

  return (
    <section ref={ref} className="py-32 px-6 relative">
      {/* Decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-full blur-[120px] opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        className="max-w-5xl mx-auto text-center relative z-10"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Join the community</span>
        </motion.div>

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
          Over{' '}
          <GradientText colors={['#00D9A5', '#00B4D8', '#0077B6', '#00D9A5']}>
            {userCount.toLocaleString()}+
          </GradientText>
          {' '}people use UserVault
        </h2>
        <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
          Create feature-rich, customizable and modern link-in-bio pages with UserVault.
        </p>

        {/* Stats Cards */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <StatCard
            value={viewCount}
            label="Profile Views"
            icon={Eye}
            delay={0.2}
            isInView={isInView}
          />
          <StatCard
            value={userCount}
            label="Active Users"
            icon={Users}
            delay={0.3}
            isInView={isInView}
          />
          <StatCard
            value={99.9}
            label="Uptime"
            icon={Gem}
            delay={0.4}
            isInView={isInView}
            suffix="%"
          />
        </div>

        {/* Claim Input */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-lg mx-auto"
        >
          <p className="text-lg font-medium text-foreground mb-6">
            Claim your username now
          </p>
          
          <div className="relative">
            <div className="flex items-center gap-0 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 p-2 transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10">
              <div className="flex items-center bg-secondary/50 rounded-xl px-5 py-4 flex-1">
                <span className="text-muted-foreground text-sm font-medium mr-1">uservault.cc/</span>
                <input
                  type="text"
                  value={username}
                  onChange={handleChange}
                  placeholder="yourname"
                  maxLength={20}
                  className="bg-transparent border-none outline-none text-foreground flex-1 min-w-0 font-medium"
                />
                
                {/* Status indicator */}
                <div className="ml-3">
                  {status === 'checking' && (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                  {status === 'available' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-success" />
                    </motion.div>
                  )}
                  {status === 'taken' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </motion.div>
                  )}
                </div>
              </div>

              <Magnet magnetStrength={0.1}>
                <button
                  onClick={handleClaim}
                  disabled={username.length < 1}
                  className="ml-2 px-6 py-4 rounded-xl bg-primary text-primary-foreground font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-40 disabled:hover:shadow-none disabled:cursor-not-allowed flex items-center gap-2 group"
                >
                  <span>Claim</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Magnet>
            </div>

            {/* Status message */}
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ 
                opacity: status !== 'idle' ? 1 : 0, 
                height: status !== 'idle' ? 'auto' : 0 
              }}
              className="mt-4 text-sm font-medium"
            >
              {status === 'available' && (
                <span className="text-success">✓ This username is available!</span>
              )}
              {status === 'taken' && (
                <span className="text-destructive">✗ This username is already taken</span>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

import { motion, useScroll, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getHeroAvatars, getPublicStats } from '@/lib/api';
import { BlurText } from './BlurText';
import { GradientText } from './GradientText';

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['public-stats'],
    queryFn: getPublicStats,
    staleTime: 5 * 60 * 1000,
  });

  const { data: heroAvatars = [] } = useQuery({
    queryKey: ['hero-avatars'],
    queryFn: getHeroAvatars,
    staleTime: 5 * 60 * 1000,
  });

  const userCount = stats?.totalUsers ?? null;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial gradient spotlight */}
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-40"
        style={{
          background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.15) 0%, transparent 60%)',
          y,
        }}
      />

      {/* Content */}
      <motion.div 
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        style={{ opacity, scale }}
      >
        {/* Announcement Badge */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-10 backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-sm font-medium text-primary">Now with Discord Integration</span>
        </motion.div>

        {/* Main Headline with BlurText */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]">
            <BlurText
              text="Your digital"
              className="justify-center text-foreground"
              delay={80}
            />
            <GradientText 
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight"
              colors={['#00D9A5', '#00B4D8', '#0077B6', '#00D9A5']}
              animationSpeed={4}
            >
              identity.
            </GradientText>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Create stunning bio pages with live Discord status, immersive effects, 
          and seamless social connections. All in one link.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            to={user ? '/dashboard' : '/auth'}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-[#00B4D8] via-[#00D9A5] to-[#0077B6] text-white font-semibold text-lg transition-all hover:shadow-2xl hover:shadow-[#00D9A5]/30 overflow-hidden border border-white/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10">{user ? 'Open Dashboard' : 'Start for Free'}</span>
            <ArrowRight className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" />
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
          </Link>
          
          <Link
            to="/uservault"
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-[#00D9A5]/30 hover:border-[#00D9A5]/60 text-foreground font-semibold text-lg transition-all hover:bg-[#00D9A5]/5 backdrop-blur-sm bg-white/[0.02] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-5 h-5 text-[#00D9A5]" />
            <span>View Demo</span>
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 flex flex-col items-center gap-4"
        >
          <div className="flex -space-x-3">
            {(heroAvatars.length > 0 ? heroAvatars.slice(0, 5) : [...Array(5)]).map((avatar, i) => (
              typeof avatar === 'string' ? (
                <img
                  key={i}
                  src={avatar}
                  alt=""
                  className="w-10 h-10 rounded-full border-2 border-background object-cover bg-muted"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  key={i} 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-background flex items-center justify-center text-xs font-bold text-primary"
                >
                  {String.fromCharCode(65 + i)}
                </div>
              )
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">
              {userCount !== null ? userCount.toLocaleString('de-DE') : '–'}
            </span>{' '}
            creators already joined
          </p>
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}

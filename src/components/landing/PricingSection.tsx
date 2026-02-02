import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, Gem, Sparkles, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPublicStats } from '@/lib/api';
import { GradientText } from './GradientText';
import { Magnet } from './Magnet';

function useStats() {
  return useQuery({
    queryKey: ['pricing-section-stats'],
    queryFn: async () => {
      const stats = await getPublicStats();
      return {
        users: stats.totalUsers,
      };
    },
    staleTime: 60000,
  });
}

const freeFeatures = [
  'Basic Customization',
  'Profile Analytics',
  'Basic Effects',
  'Unlimited Social Links',
];

const premiumFeatures = [
  'Exclusive Premium Badge',
  'Custom Profile Layouts',
  'Premium Fonts Library',
  'Typewriter Animation',
  'Special Profile Effects',
  'Advanced Customization',
  'SEO & Metadata Control',
];

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const { data: stats } = useStats();

  return (
    <section ref={ref} className="py-32 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        className="max-w-5xl mx-auto relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
          >
            Pricing
          </motion.span>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join{' '}
            <GradientText colors={['#00D9A5', '#00B4D8', '#0077B6', '#00D9A5']}>
              {(stats?.users || 0).toLocaleString()}+
            </GradientText>
            {' '}users already using UserVault
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative"
          >
            <div className="h-full bg-card/50 backdrop-blur-sm rounded-3xl border border-border/30 p-8 transition-all duration-500 hover:border-border/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Free</h3>
              </div>
              
              <div className="mb-2">
                <span className="text-5xl font-bold text-foreground">0€</span>
              </div>
              <p className="text-muted-foreground mb-8">Forever free, no credit card</p>
              
              <ul className="space-y-4 mb-10">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link
                to="/auth"
                className="block w-full py-4 rounded-xl bg-secondary/70 text-foreground font-semibold text-center transition-all duration-300 hover:bg-secondary"
              >
                Get Started Free
              </Link>
            </div>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="group relative"
          >
            {/* Glow effect */}
            <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-primary via-accent to-primary opacity-20 blur-sm group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="relative h-full bg-card/60 backdrop-blur-sm rounded-3xl border border-primary/30 p-8 transition-all duration-500 hover:border-primary/50">
              {/* Popular badge */}
              <div className="absolute -top-3 right-6 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-bold shadow-lg">
                Most Popular
              </div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Gem className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Premium</h3>
              </div>
              
              <div className="mb-2">
                <span className="text-5xl font-bold text-primary">3,50€</span>
              </div>
              <p className="text-primary font-medium mb-8">Pay once, keep forever</p>
              
              <ul className="space-y-4 mb-10">
                {premiumFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Magnet magnetStrength={0.1}>
                <Link
                  to="/premium"
                  className="block w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-center transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
                >
                  Get Premium
                </Link>
              </Magnet>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

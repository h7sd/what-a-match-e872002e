import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, Gem } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPublicStats } from '@/lib/api';

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

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return num.toLocaleString('en-US') + '+';
  }
  if (num >= 1000) {
    return num.toLocaleString('en-US') + '+';
  }
  return num.toLocaleString('en-US') + '+';
}

const freeFeatures = [
  'Basic Customization',
  'Profile Analytics',
  'Basic Effects',
  'Add Your Socials',
];

const premiumFeatures = [
  'Exclusive Badge',
  'Profile Layouts',
  'Custom Fonts',
  'Typewriter Animation',
  'Special Profile Effects',
  'Advanced Customization',
  'Metadata & SEO Customization',
];

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const { data: stats } = useStats();

  return (
    <section ref={ref} className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto"
      >
        {/* Headline */}
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
          Explore our exclusive plans and join{' '}
          <span className="text-primary">{formatNumber(stats?.users || 0)}</span> subscribers
        </h2>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 p-6 md:p-8"
          >
            <h3 className="text-2xl font-bold text-foreground mb-4">Free</h3>
            
            <div className="mb-4">
              <span className="text-4xl font-bold text-primary">0€</span>
              <span className="text-muted-foreground ml-1">/Lifetime</span>
            </div>
            
            <p className="text-muted-foreground mb-6">
              For beginners, link all your socials in one place.
            </p>
            
            <ul className="space-y-3 mb-8">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Link
              to="/auth"
              className="block w-full py-3 rounded-xl bg-secondary text-foreground font-medium text-center transition-all hover:bg-secondary/80"
            >
              Get Started
            </Link>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative bg-card/60 backdrop-blur-sm rounded-2xl border border-primary/50 p-6 md:p-8"
          >
            {/* Most Popular Badge */}
            <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              Most Popular
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <Gem className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold text-foreground">Premium</h3>
            </div>
            
            <div className="mb-2">
              <span className="text-4xl font-bold text-primary">3,50€</span>
              <span className="text-muted-foreground ml-1">/Lifetime</span>
            </div>
            
            <p className="text-primary text-sm mb-4">Pay once. Keep it forever.</p>
            
            <p className="text-muted-foreground mb-6">
              The perfect plan to discover your creativity & unlock more features.
            </p>
            
            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Link
              to="/premium"
              className="block w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-center transition-all hover:bg-primary/90 hover:scale-[1.02]"
            >
              Learn More
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

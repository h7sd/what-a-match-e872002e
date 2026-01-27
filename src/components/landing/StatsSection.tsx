import { motion } from 'framer-motion';
import { Eye, Users, Upload, Gem } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FadeIn } from './FadeIn';

interface StatItem {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

function useStats() {
  return useQuery({
    queryKey: ['landing-stats'],
    queryFn: async () => {
      // Get total profile views
      const { data: viewsData } = await supabase
        .from('profiles')
        .select('views_count');
      
      const totalViews = viewsData?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total social links
      const { count: linksCount } = await supabase
        .from('social_links')
        .select('*', { count: 'exact', head: true });

      // Get total badges awarded
      const { count: badgesCount } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true });

      return {
        views: totalViews,
        users: usersCount || 0,
        links: linksCount || 0,
        badges: badgesCount || 0,
      };
    },
    staleTime: 60000, // Cache for 1 minute
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

function StatCard({ stat, index }: { stat: StatItem; index: number }) {
  const Icon = stat.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.5 }}
      className="relative group"
    >
      <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/50 p-6 transition-all duration-300 hover:border-primary/30 hover:bg-card/80">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-3xl md:text-4xl font-bold text-foreground mb-1">
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${stat.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: stat.color }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function StatsSection() {
  const { data: stats } = useStats();

  const statItems: StatItem[] = [
    {
      value: formatNumber(stats?.views || 0),
      label: 'Profile Views',
      icon: Eye,
      color: '#a855f7',
    },
    {
      value: formatNumber(stats?.users || 0),
      label: 'Users',
      icon: Users,
      color: '#8b5cf6',
    },
    {
      value: formatNumber(stats?.links || 0),
      label: 'Social Links',
      icon: Upload,
      color: '#6366f1',
    },
    {
      value: formatNumber(stats?.badges || 0),
      label: 'Badges Earned',
      icon: Gem,
      color: '#ec4899',
    },
  ];

  return (
    <section className="py-20">
      <FadeIn className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          Join <span className="text-primary">{formatNumber(stats?.users || 0)}</span> people using UserVault
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Create feature-rich, customizable and modern link-in-bio pages with stunning effects and live integrations.
        </p>
      </FadeIn>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>
    </section>
  );
}

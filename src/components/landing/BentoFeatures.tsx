import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { 
  Sparkles, 
  Music, 
  Globe, 
  Zap, 
  Palette, 
  Shield,
  MessageCircle,
  Activity
} from 'lucide-react';

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  size: 'small' | 'medium' | 'large';
}

const features: FeatureItem[] = [
  {
    icon: Sparkles,
    title: 'Stunning Effects',
    description: 'Sparkles, glows, tilt effects, and custom animations to make your page truly unique.',
    gradient: 'from-violet-500/20 to-purple-500/20',
    size: 'large',
  },
  {
    icon: Music,
    title: 'Profile Music',
    description: 'Add background music for an immersive experience.',
    gradient: 'from-pink-500/20 to-rose-500/20',
    size: 'small',
  },
  {
    icon: Globe,
    title: 'Social Links',
    description: 'Connect all your socials in one beautiful page.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    size: 'small',
  },
  {
    icon: Zap,
    title: 'Live Integrations',
    description: 'Show your Spotify activity, Discord status, and more in real-time.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    size: 'medium',
  },
  {
    icon: Palette,
    title: 'Full Customization',
    description: 'Colors, fonts, layouts, and effects. Make it yours.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    size: 'medium',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Control who sees what with granular visibility settings.',
    gradient: 'from-slate-500/20 to-gray-500/20',
    size: 'small',
  },
  {
    icon: MessageCircle,
    title: 'Discord Presence',
    description: 'Live Discord status directly on your profile.',
    gradient: 'from-indigo-500/20 to-violet-500/20',
    size: 'small',
  },
  {
    icon: Activity,
    title: 'Analytics',
    description: 'Track views, clicks, and engagement.',
    gradient: 'from-fuchsia-500/20 to-pink-500/20',
    size: 'small',
  },
];

function FeatureCard({ feature, index }: { feature: FeatureItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const Icon = feature.icon;

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-1',
    large: 'col-span-1 md:col-span-2',
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`${sizeClasses[feature.size]} group relative`}
    >
      <div className={`relative h-full p-6 md:p-8 rounded-2xl glass-card-hover overflow-hidden`}>
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          
          {/* Text */}
          <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {feature.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </motion.div>
  );
}

export function BentoFeatures() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything you need
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Packed with features to create the perfect bio page
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

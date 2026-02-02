import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedProfiles, FeaturedProfile } from '@/lib/api';
import { ArrowRight } from 'lucide-react';

export function ShowcaseSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const { data: profiles } = useQuery({
    queryKey: ['showcase-profiles'],
    queryFn: () => getFeaturedProfiles(6),
    staleTime: 60000,
  });

  if (!profiles || profiles.length === 0) {
    return null;
  }

  return (
    <section ref={ref} className="py-24 px-6 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 mesh-gradient opacity-40" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Join the community
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Thousands of creators are already using UserVault
          </p>
        </motion.div>

        {/* Profile grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12">
          {profiles.map((profile: FeaturedProfile, index: number) => (
            <motion.div
              key={profile.u}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                to={`/${profile.u}`}
                className="group block p-6 rounded-2xl glass-card-hover text-center"
              >
                {/* Avatar placeholder - FeaturedProfile doesn't have avatar */}
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="w-full h-full rounded-full bg-primary/20 border-2 border-white/10 group-hover:border-primary/50 transition-colors flex items-center justify-center">
                    <span className="text-xl font-semibold text-primary">
                      {(profile.d || profile.u).charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {profile.d || profile.u}
                </h3>
                <p className="text-sm text-muted-foreground">@{profile.u}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <Link
            to="/auth"
            className="group inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <span>Create your profile</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

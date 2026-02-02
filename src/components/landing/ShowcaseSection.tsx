import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedProfiles, FeaturedProfile } from '@/lib/api';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Magnet } from './Magnet';

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
    <section ref={ref} className="py-32 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Community
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Join thousands of creators
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            See what others are building with UserVault
          </p>
        </motion.div>

        {/* Profile grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-16">
          {profiles.map((profile: FeaturedProfile, index: number) => (
            <motion.div
              key={profile.u}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={`/${profile.u}`}
                className="group block relative p-6 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 text-center transition-all duration-500 hover:border-primary/30 hover:bg-card/60 overflow-hidden"
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Avatar */}
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-white/10 group-hover:border-primary/50 transition-all duration-500 flex items-center justify-center group-hover:scale-105">
                    <span className="text-2xl font-bold text-primary">
                      {(profile.d || profile.u).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-background" />
                </div>

                {/* Name */}
                <h3 className="relative font-bold text-foreground group-hover:text-primary transition-colors duration-300 truncate text-lg">
                  {profile.d || profile.u}
                </h3>
                <p className="relative text-sm text-muted-foreground font-medium">@{profile.u}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <Magnet magnetStrength={0.15}>
            <Link
              to="/auth"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30"
            >
              <span>Create your profile</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Magnet>
        </motion.div>
      </div>
    </section>
  );
}

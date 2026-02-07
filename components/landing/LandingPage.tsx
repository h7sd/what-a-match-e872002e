"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ModernHeader } from "@/components/landing/ModernHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { ModernFooter } from "@/components/landing/ModernFooter";

export function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [showBackground, setShowBackground] = useState(false);

  // Delay loading heavy background to prioritize content
  useEffect(() => {
    const timer = setTimeout(() => setShowBackground(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen relative bg-background overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 z-0">
        {showBackground && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        )}
      </div>

      {/* Noise texture overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-[1]" />

      {/* Content */}
      <div className="relative z-10">
        <ModernHeader />

        <main>
          <HeroSection />

          <section id="features" className="py-20 px-4">
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-4xl font-bold gradient-text mb-4">
                Powerful Features
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Everything you need to create your perfect digital presence.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="glass-card p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Full Customization
                  </h3>
                  <p className="text-muted-foreground">
                    Personalize every aspect of your profile with themes, colors,
                    and layouts.
                  </p>
                </div>

                <div className="glass-card p-6">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4 mx-auto">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Badge System</h3>
                  <p className="text-muted-foreground">
                    Collect and display unique badges that showcase your
                    achievements.
                  </p>
                </div>

                <div className="glass-card p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                    <span className="text-2xl">🔗</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Social Links</h3>
                  <p className="text-muted-foreground">
                    Connect all your social profiles in one beautiful location.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="claim" className="py-20 px-4 bg-secondary/20">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold gradient-text mb-4">
                Claim Your Username
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Secure your unique identity before someone else does.
              </p>
              <a
                href="/auth?mode=signup"
                className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started Free
              </a>
            </div>
          </section>
        </main>

        <ModernFooter />
      </div>
    </div>
  );
}

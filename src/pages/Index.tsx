import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Sparkles, Zap, Globe, Music } from "lucide-react";
import { FadeIn } from "@/components/landing/FadeIn";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { AnimatedButton, NavButton } from "@/components/landing/AnimatedButton";
import { NoiseTexture } from "@/components/landing/GradientOrb";
import { FAQSection } from "@/components/landing/FAQSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { Footer } from "@/components/landing/Footer";
import { ReportUserDialog } from "@/components/landing/ReportUserDialog";
import { LiquidEther } from "@/components/landing/LiquidEther";
import { ClaimBanner } from "@/components/landing/ClaimBanner";
import { ProfileSearch } from "@/components/landing/ProfileSearch";
import { FeaturedProfiles } from "@/components/landing/FeaturedProfiles";
import { ClaimedUsernamesSidebar } from "@/components/landing/ClaimedUsernamesSidebar";
import { PremiumDialog } from "@/components/landing/PremiumDialog";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);

  // Check for premium redirect after login
  useEffect(() => {
    const showPremium = searchParams.get("showPremium");
    if (showPremium === "true" && user && !authLoading) {
      setShowPremiumDialog(true);
      // Remove the query param
      searchParams.delete("showPremium");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, user, authLoading, setSearchParams]);

  const features = [
    {
      icon: Sparkles,
      title: "Stunning Effects",
      description: "Sparkles, glows, tilt effects, and more to make your page unique.",
    },
    {
      icon: Music,
      title: "Profile Music",
      description: "Add background music to your page for an immersive experience.",
    },
    {
      icon: Globe,
      title: "Social Links",
      description: "Connect all your socials in one beautiful, shareable page.",
    },
    {
      icon: Zap,
      title: "Live Integrations",
      description: "Show your Spotify activity, Discord status, and more.",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Claimed Usernames Sidebar */}
      <ClaimedUsernamesSidebar />

      {/* Liquid Ether Background - covers entire viewport */}
      <div className="fixed inset-0" style={{ zIndex: -1 }}>
        <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#B19EEF']}
          mouseForce={20}
          cursorSize={100}
          isViscous={true}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-black/40 pointer-events-none" style={{ zIndex: 0 }} />

      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="p-4 md:p-6 flex justify-center"
        >
          <div className="w-full max-w-4xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-4 md:px-6 py-3 flex items-center justify-between">
            {/* Left - Brand + Nav Links */}
            <div className="flex items-center gap-4 md:gap-8">
              <Link to="/" className="text-sm md:text-base font-semibold text-primary hover:text-primary/80 transition-colors">
                UserVault.cc
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <a 
                  href="https://uservault.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Livestreaming Platform
                </a>
                <a 
                  href="#" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Partners
                </a>
                <a 
                  href="https://discord.gg/uservault" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Discord
                </a>
                <Link 
                  to="/status"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Status
                </Link>
              </nav>
            </div>

            {/* Right - Auth Buttons */}
            <div className="flex items-center gap-2 md:gap-3">
              <ReportUserDialog />
              {user ? (
                <NavButton to="/dashboard">Dashboard</NavButton>
              ) : (
                <>
                  <Link 
                    to="/auth" 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/auth" 
                    className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-full transition-colors font-medium"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.header>

        {/* Hero */}
        <main className="max-w-6xl mx-auto px-6">
          <div className="py-24 md:py-32 text-center mb-8">
            {/* Main headline */}
            <motion.h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
            >
              <FadeIn delay={0.1} blur>
                <span className="gradient-text">One link</span>
              </FadeIn>
              <FadeIn delay={0.2} blur>
                <span className="text-foreground block mt-2">for everything</span>
              </FadeIn>
            </motion.h1>

            {/* Subtitle */}
            <FadeIn delay={0.35} duration={0.6}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Create your personalized bio page with stunning effects, social links, 
                music, and live integrations. Share who you are with the world.
              </p>
            </FadeIn>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <AnimatedButton to="/auth" variant="primary" icon delay={0.45}>
                Create Your Page
              </AnimatedButton>
              <AnimatedButton to="/uservault" variant="secondary" delay={0.55}>
                See Demo
              </AnimatedButton>
            </div>
          </div>

          {/* Claim Banner */}
          <ClaimBanner />

          {/* Profile Search with floating URLs */}
          <ProfileSearch />

          {/* Features Grid */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {features.map((feature, i) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                index={i}
              />
            ))}
          </div>

          {/* Featured Profiles */}
          <FeaturedProfiles />

          {/* Stats Section */}
          <StatsSection />

          {/* FAQ Section */}
          <div id="faq">
            <FAQSection />
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

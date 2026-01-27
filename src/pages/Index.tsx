import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Sparkles, Zap, Globe, Music } from "lucide-react";
import { LetterPullup, BlurFadeText } from "@/components/landing/AnimatedText";
import { FadeIn } from "@/components/landing/FadeIn";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { AnimatedButton, NavButton } from "@/components/landing/AnimatedButton";
import { GradientOrb, GridBackground, NoiseTexture } from "@/components/landing/GradientOrb";

export default function Index() {
  const { user } = useAuth();

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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background elements */}
      <GridBackground />
      <NoiseTexture />
      
      {/* Gradient orbs */}
      <GradientOrb 
        className="top-0 left-1/4 -translate-x-1/2 -translate-y-1/4" 
        color="purple" 
        size="lg" 
        delay={0.2}
      />
      <GradientOrb 
        className="bottom-0 right-1/4 translate-x-1/2 translate-y-1/4" 
        color="pink" 
        size="md" 
        delay={0.4}
      />

      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="p-6 flex justify-between items-center max-w-6xl mx-auto"
        >
          <Link to="/" className="text-xl font-bold text-primary">
            UserVault
          </Link>
          <div className="flex gap-3">
            {user ? (
              <NavButton to="/dashboard">Dashboard</NavButton>
            ) : (
              <>
                <NavButton to="/auth" variant="ghost">Sign In</NavButton>
                <NavButton to="/auth">Get Started</NavButton>
              </>
            )}
          </div>
        </motion.header>

        {/* Hero */}
        <main className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center mb-20">
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

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
        </main>

        {/* Footer */}
        <FadeIn delay={1} className="max-w-6xl mx-auto px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()}. All rights reserved.
          </p>
        </FadeIn>
      </div>
    </div>
  );
}

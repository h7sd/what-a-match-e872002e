import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ModernHeader } from "@/components/landing/ModernHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { ClaimSection } from "@/components/landing/ClaimSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { ModernFooter } from "@/components/landing/ModernFooter";
import { PremiumDialog } from "@/components/landing/PremiumDialog";
import { LiveChatWidget } from "@/components/chat/LiveChatWidget";
import { ProfileCardSwapExact } from "@/components/landing/ProfileCardSwapExact";


// Lazy load heavy WebGL background to improve initial load time
const LiquidEther = lazy(() =>
  import("@/components/landing/LiquidEther").then((m) => ({ default: m.LiquidEther }))
);

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const isMobile = useIsMobile();

  // Delay loading heavy background to prioritize content
  useEffect(() => {
    const timer = setTimeout(() => setShowBackground(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Check for premium redirect after login
  useEffect(() => {
    const showPremium = searchParams.get("showPremium");
    if (showPremium === "true" && user && !authLoading) {
      setShowPremiumDialog(true);
      searchParams.delete("showPremium");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, user, authLoading, setSearchParams]);

  return (
    <div className="min-h-screen relative bg-background overflow-hidden">
      {/* Liquid Ether Background - lazy loaded after initial render */}
      <div className="fixed inset-0 z-0">
        {showBackground && (
          <Suspense fallback={<div className="absolute inset-0 bg-gradient-to-br from-[#0077B6]/20 via-background to-[#00D9A5]/10" />}>
            <LiquidEther 
              colors={['#00D9A5', '#00B4D8', '#0077B6']}
              autoDemo={true}
              autoSpeed={0.4}
              autoIntensity={1.8}
              mouseForce={15}
              cursorSize={120}
              resolution={isMobile ? 0.25 : 0.5}
            />
          </Suspense>
        )}
      </div>
      
      {/* Noise texture overlay */}
      <div className="fixed inset-0 noise-overlay pointer-events-none z-[1]" />
      
      {/* Dot pattern */}
      <div className="fixed inset-0 dot-pattern opacity-20 pointer-events-none z-[1]" />

      {/* Content */}
      <div className="relative z-10">
        <ModernHeader />

        <main>
          <HeroSection />

          <div id="features">
            <BentoFeatures />

            {/* Live profile previews (exact same card renderer as profile page) */}
            <ProfileCardSwapExact />
          </div>

          <ClaimSection />

          <PricingSection />

          <ShowcaseSection />

          <div id="faq">
            <FAQSection />
          </div>
        </main>

        <ModernFooter />
        
        <LiveChatWidget />
      </div>

      {/* Premium Dialog */}
      <PremiumDialog 
        open={showPremiumDialog} 
        onOpenChange={setShowPremiumDialog} 
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
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
import { LiquidEther } from "@/components/landing/LiquidEther";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);

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
      {/* Liquid Ether Background with green-blue colors */}
      <div className="fixed inset-0 z-0">
        <LiquidEther 
          colors={['#00D9A5', '#00B4D8', '#0077B6']}
          autoDemo={true}
          autoSpeed={0.4}
          autoIntensity={1.8}
          mouseForce={15}
          cursorSize={120}
          resolution={0.5}
        />
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

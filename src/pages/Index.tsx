import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ModernHeader } from "@/components/landing/ModernHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { ClaimSection } from "@/components/landing/ClaimSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { ModernFooter } from "@/components/landing/ModernFooter";
import { PremiumDialog } from "@/components/landing/PremiumDialog";
import { LiveChatWidget } from "@/components/chat/LiveChatWidget";

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
      {/* Animated background */}
      <div className="fixed inset-0 animated-bg" />
      
      {/* Noise texture overlay */}
      <div className="fixed inset-0 noise-overlay pointer-events-none" />
      
      {/* Dot pattern */}
      <div className="fixed inset-0 dot-pattern opacity-30 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <ModernHeader />

        <main>
          <HeroSection />

          <div id="features">
            <BentoFeatures />
          </div>

          <ClaimSection />

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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PayPalProvider } from "@/components/premium/PayPalProvider";
import { PremiumCheckout } from "@/components/premium/PremiumCheckout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, Check, Loader2 } from "lucide-react";

export default function Premium() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    async function checkPremiumStatus() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("user_id", user.id)
          .single();

        if (!error && data) {
          setIsPremium(data.is_premium || false);
        }
      } catch (error) {
        console.error("Error checking premium status:", error);
      } finally {
        setLoading(false);
      }
    }

    checkPremiumStatus();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Premium</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        {isPremium ? (
          // Already premium
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Crown className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              Du bist Premium!
            </h2>
            <p className="text-muted-foreground">
              Alle Premium-Features sind für dich freigeschaltet.
            </p>
            <div className="flex flex-col gap-2 text-left bg-card/50 rounded-lg p-6 border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Erweiterte Themes & Animationen</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Exklusive Effekte & Fonts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Custom Domain für dein Profil</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Premium Badge</span>
              </div>
            </div>
            <Button onClick={() => navigate("/dashboard")}>
              Zurück zum Dashboard
            </Button>
          </div>
        ) : (
          // Show checkout
          <PayPalProvider>
            <PremiumCheckout 
              onSuccess={() => {
                setIsPremium(true);
              }}
            />
          </PayPalProvider>
        )}
      </main>
    </div>
  );
}

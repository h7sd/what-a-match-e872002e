import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase-proxy-client";
import { PayPalProvider } from "@/components/premium/PayPalProvider";
import { PremiumCheckout } from "@/components/premium/PremiumCheckout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, Loader2 } from "lucide-react";

interface PremiumDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PremiumDialog({ children, open: controlledOpen, onOpenChange }: PremiumDialogProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    async function checkPremiumStatus() {
      if (!user) return;
      setLoading(true);
      
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

    if (open && user) {
      checkPremiumStatus();
    }
  }, [user, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !user) {
      // Redirect to auth with premium redirect flag
      navigate("/auth?redirect=premium");
      return;
    }
    
    if (isControlled) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-primary/20">
        {authLoading || loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isPremium ? (
          <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                Du bist Premium!
              </DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Alle Premium-Features sind für dich freigeschaltet.
            </p>
            <div className="flex flex-col gap-2 text-left bg-card/50 rounded-lg p-4 border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Erweiterte Themes & Animationen</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Exklusive Effekte & Schriftarten</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Eigene Domain für dein Profil</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Premium Badge auf deinem Profil</span>
              </div>
            </div>
            <Button onClick={() => { handleOpenChange(false); navigate("/dashboard"); }}>
              Zum Dashboard
            </Button>
          </div>
        ) : (
          <PayPalProvider>
            <PremiumCheckout 
              onSuccess={() => {
                setIsPremium(true);
              }}
            />
          </PayPalProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}

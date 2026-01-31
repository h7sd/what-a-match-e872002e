import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Crown, Check, Sparkles, Palette, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PremiumCheckoutProps {
  onSuccess?: () => void;
  price?: string;
}

const PREMIUM_PRICE = "3"; // One-time payment in EUR

const PREMIUM_FEATURES = [
  { icon: Palette, text: "Advanced Themes & Animations" },
  { icon: Sparkles, text: "Exclusive Effects & Fonts" },
  { icon: Globe, text: "Custom Domain for your Profile" },
  { icon: Crown, text: "Premium Badge on your Profile" },
];

export function PremiumCheckout({ onSuccess, price = PREMIUM_PRICE }: PremiumCheckoutProps) {
  const [{ isPending, isResolved }] = usePayPalScriptReducer();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleApprove = async (data: { orderID: string }) => {
    setIsProcessing(true);
    
    try {
      console.log("Payment approved, verifying order:", data.orderID);
      
      const { data: result, error } = await supabase.functions.invoke('verify-paypal-payment', {
        body: { orderId: data.orderID }
      });

      if (error) {
        console.error("Verification error:", error);
        throw new Error(error.message || 'Payment verification failed');
      }

      if (result?.success) {
        toast({
          title: "🎉 Premium Activated!",
          description: "Welcome to UserVault Premium! All features are now unlocked.",
        });
        onSuccess?.();
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error("Payment processing error:", error);
      toast({
        title: "Error",
        description: error.message || "Payment could not be processed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = (err: any) => {
    console.error("PayPal error:", err);
    toast({
      title: "PayPal Error",
      description: "There was a problem with PayPal. Please try again.",
      variant: "destructive",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card/50 backdrop-blur-sm border-primary/20">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-4">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          UserVault Premium
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          One-time Payment • Lifetime Access
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Price */}
        <div className="text-center">
          <span className="text-4xl font-bold text-foreground">€{price}</span>
          <span className="text-muted-foreground ml-2">one-time</span>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {PREMIUM_FEATURES.map((feature, index) => (
            <li key={index} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground">{feature.text}</span>
            </li>
          ))}
        </ul>

        {/* PayPal Button */}
        <div className="pt-4">
          {isPending && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading PayPal...</span>
            </div>
          )}
          
          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Processing payment...</span>
            </div>
          )}

          {isResolved && !isProcessing && (
            <PayPalButtons
              style={{
                layout: "vertical",
                color: "gold",
                shape: "rect",
                label: "pay",
                height: 50,
              }}
              createOrder={(data, actions) => {
                return actions.order.create({
                  intent: "CAPTURE",
                  purchase_units: [
                    {
                      amount: {
                        currency_code: "EUR",
                        value: price,
                      },
                      description: "UserVault Premium - Lifetime Access",
                    },
                  ],
                });
              }}
              onApprove={async (data, actions) => {
                // Capture the order first
                if (actions.order) {
                  await actions.order.capture();
                }
                await handleApprove({ orderID: data.orderID });
              }}
              onError={handleError}
              onCancel={() => {
                toast({
                  title: "Cancelled",
                  description: "You cancelled the payment.",
                });
              }}
            />
          )}
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Check className="w-3 h-3 text-green-500" />
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="w-3 h-3 text-green-500" />
            <span>Instant Activation</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

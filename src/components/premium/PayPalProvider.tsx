import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PayPalProviderProps {
  children: ReactNode;
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch PayPal Client ID from edge function
    async function fetchClientId() {
      try {
        const { data, error } = await supabase.functions.invoke('get-paypal-config');
        if (!error && data?.clientId) {
          setClientId(data.clientId);
        } else {
          // Fallback to sandbox for development
          setClientId("sb");
        }
      } catch {
        setClientId("sb");
      }
    }
    fetchClientId();
  }, []);

  if (!clientId) {
    return null; // Loading
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "EUR",
        intent: "capture",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}

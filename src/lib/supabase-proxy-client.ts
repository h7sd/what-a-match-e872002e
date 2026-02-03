import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// IMPORTANT:
// This client is intentionally hard-wired to the public API domain so the
// underlying provider URL never appears in browser devtools for logged-in or
// logged-out users.
const PUBLIC_API_URL = "https://api.uservault.cc";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(
  PUBLIC_API_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

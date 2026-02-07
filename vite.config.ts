import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    // IMPORTANT: Ensure all backend traffic goes through the public API domain
    // so the underlying provider URL is never visible in browser devtools.
    alias: {
      "@/integrations/supabase/client": path.resolve(__dirname, "./src/lib/supabase-proxy-client.ts"),
      "@": path.resolve(__dirname, "./src"),
      "@/": path.resolve(__dirname, "./src/"),
    },
  },
}));

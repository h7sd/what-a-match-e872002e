import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@/integrations/supabase/client",
        replacement: path.resolve(process.cwd(), "src/lib/supabase-proxy-client.ts"),
      },
      {
        find: /^@\//,
        replacement: path.resolve(process.cwd(), "src") + "/",
      },
    ],
  },
});

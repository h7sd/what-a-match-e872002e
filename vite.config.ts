import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Resolve the actual project source directory
// In v0 build env, __dirname may be the build dir, but source lives in v0-project
const projectSrc = fs.existsSync("/vercel/share/v0-project/src")
  ? "/vercel/share/v0-project/src"
  : path.resolve(__dirname, "./src");

// Export a plain object so the v0 wrapper can spread it correctly
export default {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@/integrations/supabase/client": path.join(projectSrc, "lib/supabase-proxy-client.ts"),
      "@": projectSrc,
    },
  },
};

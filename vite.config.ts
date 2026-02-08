import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    watch: {
      ignored: [
        "**/.env", "**/.env.*", "**/node_modules/**",
        "**/discord-bot/**", "**/cloudflare-worker/**",
        "**/supabase/**", "**/backup/**", "**/.git/**",
        "**/public/**", "**/env/**",
      ],
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envPrefix: "VITE_",
}));

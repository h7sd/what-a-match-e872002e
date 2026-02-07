import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

function resolveAtAlias(): Plugin {
  let srcDir = "";
  return {
    name: "at-alias-v2",
    enforce: "pre",
    configResolved(config) {
      srcDir = path.resolve(config.root, "src");
    },
    async resolveId(source, importer) {
      if (!source.startsWith("@/")) return null;

      if (source === "@/integrations/supabase/client") {
        return path.resolve(srcDir, "lib/supabase-proxy-client.ts");
      }

      const relative = source.slice(2);
      const rewritten = path.join(srcDir, relative);
      const resolved = await this.resolve(rewritten, importer, { skipSelf: true });
      if (resolved) return resolved;

      return null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 3000,
    hmr: {
      overlay: false,
    },
    watch: {
      // Ignore non-source files to prevent restart loops
      ignored: [
        "**/.env",
        "**/.env.*",
        "**/env/**",
        "**/node_modules/**",
        "**/discord-bot/**",
        "**/cloudflare-worker/**",
        "**/supabase/**",
        "**/backup/**",
        "**/.git/**",
        "**/public/**",
      ],
    },
  },
  plugins: [resolveAtAlias(), react()],
  // Ensure env vars are always available even when .env watching is disabled
  envPrefix: "VITE_",
});

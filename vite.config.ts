import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

let _srcDir = "";

function srcAlias(): Plugin {
  return {
    name: "src-alias-v4",
    enforce: "pre",
    configResolved(config) {
      _srcDir = path.resolve(config.root, "src");
    },
    async resolveId(source, importer) {
      if (!source.startsWith("@/")) return null;
      if (source === "@/integrations/supabase/client")
        return path.resolve(_srcDir, "lib/supabase-proxy-client.ts");
      return this.resolve(path.join(_srcDir, source.slice(2)), importer, { skipSelf: true });
    },
  };
}

export default defineConfig({
  server: {
    host: "::",
    port: 3000,
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
  plugins: [srcAlias(), react()],
  envPrefix: "VITE_",
});

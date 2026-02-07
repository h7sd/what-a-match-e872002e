/* vite-config-v5 – cache bust */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "node:path";

let resolvedSrc = "";

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
  plugins: [
    {
      name: "alias-v5",
      enforce: "pre" as const,
      configResolved(config: any) {
        resolvedSrc = path.resolve(config.root, "src");
      },
      async resolveId(source: string, importer: string | undefined) {
        if (!source.startsWith("@/")) return null;
        if (source === "@/integrations/supabase/client")
          return path.resolve(resolvedSrc, "lib/supabase-proxy-client.ts");
        return (this as any).resolve(
          path.join(resolvedSrc, source.slice(2)),
          importer,
          { skipSelf: true }
        );
      },
    },
    react(),
  ],
  envPrefix: "VITE_",
});

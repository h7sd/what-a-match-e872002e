import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

/* Silent path-alias plugin – no logging, cache-bust v3 */
function pathAlias(): Plugin {
  let src = "";
  return {
    name: "path-alias-v3",
    enforce: "pre",
    configResolved(c) { src = path.resolve(c.root, "src"); },
    resolveId(id, importer) {
      if (!id.startsWith("@/")) return null;
      if (id === "@/integrations/supabase/client")
        return path.resolve(src, "lib/supabase-proxy-client.ts");
      return (this as any).resolve(path.join(src, id.slice(2)), importer, { skipSelf: true });
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
  plugins: [pathAlias(), react()],
  envPrefix: "VITE_",
});

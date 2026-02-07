import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

/**
 * Custom plugin that resolves @/ aliases using Vite's own resolved root
 * and Vite's own file resolver (no fs.existsSync needed).
 */
function resolveAtAlias(): Plugin {
  let srcDir = "";
  return {
    name: "resolve-at-alias",
    enforce: "pre",
    configResolved(config) {
      srcDir = path.resolve(config.root, "src");
      console.log("[v0] resolve-at-alias plugin: srcDir =", srcDir);
    },
    async resolveId(source, importer) {
      if (!source.startsWith("@/")) return null;

      // Special case: proxy supabase client
      if (source === "@/integrations/supabase/client") {
        const target = path.resolve(srcDir, "lib/supabase-proxy-client.ts");
        console.log("[v0] resolving supabase client ->", target);
        return target;
      }

      // Rewrite @/foo/bar to <srcDir>/foo/bar and let Vite resolve extensions
      const relative = source.slice(2); // strip "@/"
      const rewritten = path.join(srcDir, relative);

      // Use Vite's own resolver to find the actual file (handles .ts, .tsx, /index.ts, etc.)
      const resolved = await this.resolve(rewritten, importer, { skipSelf: true });
      if (resolved) {
        console.log("[v0] resolved", source, "->", resolved.id);
        return resolved;
      }

      console.log("[v0] FAILED to resolve", source, "rewritten as", rewritten);
      return null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [resolveAtAlias(), react()],
});

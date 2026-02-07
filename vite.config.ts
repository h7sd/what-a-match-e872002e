import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import fs from "node:fs";

/**
 * Custom plugin that resolves @/ aliases using Vite's own resolved root
 * instead of __dirname or process.cwd() which can point to wrong directories
 * in the v0 preview environment.
 */
function resolveAtAlias(): Plugin {
  let srcDir = "";
  return {
    name: "resolve-at-alias",
    enforce: "pre",
    configResolved(config) {
      srcDir = path.resolve(config.root, "src");
    },
    async resolveId(source) {
      if (!source.startsWith("@/")) return null;

      // Special case: proxy supabase client
      if (source === "@/integrations/supabase/client") {
        return path.resolve(srcDir, "lib/supabase-proxy-client.ts");
      }

      const relative = source.slice(2); // strip "@/"
      const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".json", ".css"];

      // Try direct file match with extensions
      for (const ext of extensions) {
        const full = path.resolve(srcDir, relative + ext);
        if (fs.existsSync(full)) return full;
      }

      // Try index files in directory
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        const full = path.resolve(srcDir, relative, "index" + ext);
        if (fs.existsSync(full)) return full;
      }

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

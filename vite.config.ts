import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(".");
  const srcDir = path.resolve(rootDir, "src");

  const plugins: any[] = [react()];

  // lovable-tagger is optional – load it only if available
  if (mode === "development") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { componentTagger } = require("lovable-tagger");
      plugins.push(componentTagger());
    } catch {
      // lovable-tagger not installed – skip silently
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins,
    resolve: {
      // IMPORTANT: Ensure all backend traffic goes through the public API domain
      // so the underlying provider URL is never visible in browser devtools.
      alias: [
        {
          find: "@/integrations/supabase/client",
          replacement: path.resolve(srcDir, "lib/supabase-proxy-client.ts"),
        },
        {
          find: /^@\//,
          replacement: srcDir + "/",
        },
      ],
    },
  };
});

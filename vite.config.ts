import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Resolve the actual project source directory
// In v0 build env, __dirname may be the build dir, but source lives in v0-project
const projectSrc = fs.existsSync("/vercel/share/v0-project/src")
  ? "/vercel/share/v0-project/src"
  : path.resolve(__dirname, "./src");

// Custom plugin to handle @ alias resolution
const aliasResolverPlugin = {
  name: "v0-alias-resolver",
  enforce: "pre",
  resolveId(source, importer) {
    if (source.startsWith("@/")) {
      const relativePath = source.slice(2); // Remove "@/"
      const resolved = path.join(projectSrc, relativePath);
      
      // Try with common extensions if no extension specified
      if (!path.extname(resolved)) {
        for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
          const withExt = resolved + ext;
          if (fs.existsSync(withExt)) {
            return withExt;
          }
        }
      }
      
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }
    return null;
  },
};

// Export a plain object so the v0 wrapper can spread it correctly
export default {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [aliasResolverPlugin, react()],
  resolve: {
    alias: {
      "@/integrations/supabase/client": path.join(projectSrc, "lib/supabase-proxy-client.ts"),
      "@": projectSrc,
    },
  },
};

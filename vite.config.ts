import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

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
      name: "src-alias",
      enforce: "pre" as const,
      configResolved(c: any) { (this as any)._src = path.resolve(c.root, "src"); },
      resolveId(id: string, importer: string | undefined) {
        if (!id.startsWith("@/")) return null;
        const src = (this as any)._src;
        if (id === "@/integrations/supabase/client")
          return path.resolve(src, "lib/supabase-proxy-client.ts");
        return (this as any).resolve(path.join(src, id.slice(2)), importer, { skipSelf: true });
      },
    },
    react(),
  ],
  envPrefix: "VITE_",
});

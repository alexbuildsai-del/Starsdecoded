import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Dev server port. Vercel builds never read this — it only matters for
// `pnpm dev` and the Playwright suite, which pass PORT explicitly.
const port = Number(process.env.PORT ?? 5173);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

// The app is served from the domain root. BASE_PATH stays overridable for
// the odd preview deploy that lives under a sub-path.
const basePath = process.env.BASE_PATH ?? "/";

// In dev the API runs separately (default: the local Express server on
// 8080). In production the browser talks to the Railway API directly via
// VITE_API_BASE_URL, so this proxy is dev-only.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    // Emitted to the repository root, not web/dist. Vercel's Vite preset
    // looks for `dist` next to the lockfile it installed from, and that is
    // the root of this workspace — putting the output there means a deploy
    // works on defaults, with no Output Directory override to configure.
    outDir: path.resolve(import.meta.dirname, "..", "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: false,
      },
    },
    headers:
      process.env.NODE_ENV !== "production"
        ? {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          }
        : undefined,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

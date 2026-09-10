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
// 8080). On Vercel the same-origin /api path is rewritten to Railway by
// vercel.json, so this proxy is dev-only.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

// Which deployment this build is for. Vercel exposes VERCEL_ENV when system
// environment variables are on: "production" for the production branch and
// "preview" for every other branch, which includes main once main deploys to
// staging. VITE_APP_ENV overrides it for local checks of the staging ribbon.
const vercelEnv = process.env.VERCEL_ENV;
const appEnv =
  process.env.VITE_APP_ENV ??
  (vercelEnv === "production" ? "production" : vercelEnv ? "staging" : "development");

// Origin of the API. On Vercel the web calls /api on its own origin and
// vercel.json rewrites that to the correct Railway host per environment, so a
// base URL here is always wrong: a value set on Vercel (the production host,
// with no scheme) once resolved to a bogus same-origin path and made every
// POST 405 while GETs silently returned the SPA. So ignore it on Vercel, and
// anywhere else ignore a value without an http(s) scheme rather than let it
// become a relative path. Empty means same-origin, which is the intended
// production and staging setup.
const rawApiBaseUrl = process.env.VITE_API_BASE_URL?.trim() ?? "";
const onVercel = Boolean(process.env.VERCEL);
const apiBaseUrl =
  onVercel || !/^https?:\/\//i.test(rawApiBaseUrl) ? "" : rawApiBaseUrl;

export default defineConfig({
  base: basePath,
  define: {
    "import.meta.env.VITE_APP_ENV": JSON.stringify(appEnv),
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
  },
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

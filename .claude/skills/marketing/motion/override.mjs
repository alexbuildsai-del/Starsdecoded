// One webpack override for the studio and the renderer: the web app's alias, one React, Tailwind v4, the
// engine's .js imports, and the Vite-only import.meta.env values some components read at load.
import path from "node:path";
import { createRequire } from "node:module";
import { enableTailwind } from "@remotion/tailwind-v4";

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, "../../../..");
const webpack = createRequire(import.meta.url)("webpack");

export function override(config) {
  const c = enableTailwind(config);
  return {
    ...c,
    plugins: [
      ...(c.plugins ?? []),
      new webpack.DefinePlugin({
        "import.meta.env.BASE_URL": "(window.remotion_staticBase + '/')",
        "import.meta.env.VITE_APP_ENV": JSON.stringify("development"),
        "import.meta.env.VITE_API_BASE_URL": JSON.stringify(""),
        "import.meta.env.VITE_COMMIT": JSON.stringify(""),
        "import.meta.env.DEV": "false",
        "import.meta.env.PROD": "true",
        "import.meta.env.MODE": JSON.stringify("production"),
      }),
    ],
    resolve: {
      ...c.resolve,
      extensionAlias: { ".js": [".ts", ".tsx", ".js"] },
      alias: { ...(c.resolve?.alias ?? {}), "@": path.join(repo, "web/src"), react: path.join(here, "node_modules/react"), "react-dom": path.join(here, "node_modules/react-dom") },
      modules: [...(c.resolve?.modules ?? ["node_modules"]), path.join(repo, "web/node_modules"), path.join(repo, "node_modules")],
    },
  };
}

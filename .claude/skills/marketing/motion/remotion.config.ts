// The motion harness: Remotion bundles the web app's own components (alias @ → web/src) and Tailwind v4, one React.
import path from "node:path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

const here = process.cwd();
const repo = path.resolve(here, "../../../..");

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(4);
if (process.env.CHROME_PATH) Config.setBrowserExecutable(process.env.CHROME_PATH);
Config.overrideWebpackConfig((config) => {
  const withTw = enableTailwind(config);
  return {
    ...withTw,
    resolve: {
      ...withTw.resolve,
      alias: {
        ...(withTw.resolve?.alias as object),
        "@": path.join(repo, "web/src"),
        react: path.join(here, "node_modules/react"),
        "react-dom": path.join(here, "node_modules/react-dom"),
      },
      extensionAlias: { ".js": [".ts", ".tsx", ".js"] },
      modules: [...(withTw.resolve?.modules ?? ["node_modules"]), path.join(repo, "web/node_modules"), path.join(repo, "node_modules")],
    },
  };
});

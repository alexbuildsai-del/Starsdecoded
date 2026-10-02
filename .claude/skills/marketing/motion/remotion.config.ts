// The studio's settings; render.mjs uses the same override.
import { Config } from "@remotion/cli/config";
import { override } from "./override.mjs";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(1);
if (process.env.CHROME_PATH) Config.setBrowserExecutable(process.env.CHROME_PATH);
Config.overrideWebpackConfig(override);

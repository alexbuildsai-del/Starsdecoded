// Bundle once, then render stills (for checking) or the whole video.
//   node render.mjs stills 1.0 4.5 ...   ·   node render.mjs video out/launch-trailer.mp4 [--date 2026-10-02]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import { override } from "./override.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, "../../../..");
const browserExecutable = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const [mode, ...rest] = process.argv.slice(2);
const dateAt = rest.indexOf("--date");
const date = dateAt >= 0 ? rest.splice(dateAt, 2)[1] : "2026-10-02";

// The gift cover's art is the web app's own public file.
fs.copyFileSync(path.join(repo, "web/public/gift-cover.png"), path.join(here, "public/gift-cover.png"));
const serveUrl = await bundle({
  entryPoint: path.join(here, "src/index.ts"),
  publicDir: path.join(here, "public"),
  webpackOverride: override,
});
const inputProps = { date, music: "temp-score.wav" };
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "launch-trailer", inputProps, browserExecutable });

if (mode === "stills") {
  for (const s of rest) {
    const frame = Math.round(Number(s) * composition.fps);
    const output = path.join(here, `out/still-${s.replace(".", "_")}.jpg`);
    await renderStill({ composition, serveUrl, frame, output, inputProps, browserExecutable, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5 });
    console.log("still", s, output);
  }
} else {
  const output = path.resolve(rest[0] ?? path.join(here, "out/launch-trailer.mp4"));
  await renderMedia({
    composition, serveUrl, codec: "h264", outputLocation: output, inputProps, browserExecutable, concurrency: Number(process.env.CONC ?? 1), crf: 18,
    imageFormat: "jpeg", jpegQuality: 92, audioBitrate: "320k",
    frameRange: process.env.FRAMES ? process.env.FRAMES.split("-").map(Number) : undefined, logLevel: process.env.LOG ?? "info",
    onProgress: ({ progress }) => { if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`\r${Math.round(progress * 100)}%`); },
  });
  console.log("\nvideo", output);
}

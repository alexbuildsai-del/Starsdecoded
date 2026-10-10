// The product's own wheel, never a copy: web/src/components/chart/NatalWheel.tsx rendered to static
// SVG through the web app's Vite config, fed by api/src/lib/chartCalculation.ts. Needs the workspace
// installed (pnpm install --frozen-lockfile at the repo root).
//
//   const w = await openWheels(); const { svg } = await w.wheel({ date: "1999-12-31", time: "09:00",
//     lat: 51.5074, lon: -0.1278, tz: "Europe/London" }); await w.close();
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const KIT = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(KIT, "../../../..");
const WEB = path.join(REPO, "web");

const TOKENS = JSON.parse(fs.readFileSync(path.join(REPO, "packages/design/src/tokens.json"), "utf8")).color;

// NatalWheel reads `hsl(var(--x))` triplets for some colours and bare hex for the indigos; index.css keeps only the
// triplets and only inside the app, so a slide builds both from tokens.json.
function hslTriplet(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return `0 0% ${(l * 100).toFixed(2)}%`;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return `${(h * 60).toFixed(2)} ${(s * 100).toFixed(2)}% ${(l * 100).toFixed(2)}%`;
}

export function webTokens() {
  const t = TOKENS;
  const triplets = { background: t.ground, foreground: t.paper, card: t.surface, popover: t.raised, primary: t.indigo,
    "muted-foreground": t.muted, destructive: t.back, brass: t.brass, "chart-4": t["line-easy"] };
  const plain = { indigo: t.indigo, "indigo-lt": t["indigo-lt"], violet: t.violet };
  return [
    ...Object.entries(triplets).map(([k, v]) => `--${k}: ${hslTriplet(v)};`),
    ...Object.entries(plain).map(([k, v]) => `--${k}: ${v};`),
    ...Object.entries(t).map(([k, v]) => `--color-${k}: ${v};`),
  ].join(" ");
}

// The slide's own short names (slide.css reads var(--void), var(--fire) and the rest) on the same tokens.
export function slideColours() {
  const t = TOKENS;
  const names = { void: t.void, ground: t.ground, surface: t.surface, raised: t.raised, line: t.line, "line-soft": t["line-soft"],
    paper: t.paper, "paper-dim": t["paper-dim"], muted: t.muted, indigo: t.indigo, "indigo-lt": t["indigo-lt"], violet: t.violet,
    brass: t.brass, "brass-dim": t["brass-dim"], fire: t["element-fire"], earth: t["element-earth"], air: t["element-air"], water: t["element-water"] };
  return `:root{${Object.entries(names).map(([k, v]) => `--${k}:${v};`).join("")}}`;
}

export async function openWheels() {
  const requireWeb = createRequire(path.join(WEB, "package.json"));
  const { createServer } = await import(requireWeb.resolve("vite"));
  const vite = await createServer({
    configFile: path.join(WEB, "vite.config.ts"), root: WEB, logLevel: "error", appType: "custom",
    server: { middlewareMode: true, hmr: false, fs: { allow: [REPO] } },
    optimizeDeps: { noDiscovery: true, include: [] },
    // R11-09 inlines every SSR import (noExternal); React stays external so its CommonJS loads through Node.
    ssr: { external: ["react", "react-dom"] },
  });
  // React comes from web/node_modules through Node, the same copy the component's own import resolves to.
  const React = requireWeb("react");
  const { renderToStaticMarkup } = requireWeb("react-dom/server");
  const { NatalWheel } = await vite.ssrLoadModule("/src/components/chart/NatalWheel.tsx");
  const { calculateNatalChart } = await vite.ssrLoadModule(`/@fs${path.join(REPO, "api/src/lib/chartCalculation.ts")}`);

  async function wheel({ date, time, lat, lon, tz, windowMinutes = 0, centreName, tilt = true }) {
    const chart = calculateNatalChart(date, time, lat, lon, tz, windowMinutes);
    // A slide is a picture: no stops, so no skip link either, which a slide would print as text with no sr-only to hide it.
    const props = { chartData: chart, selectedHouse: 0, stops: false, ...(centreName !== undefined ? { centreName } : {}) };
    let svg = renderToStaticMarkup(React.createElement(NatalWheel, props));
    svg = svg.replace(/(href|src)="\/src\//g, `$1="file://${WEB}/src/`);
    // As on the website: the wheel turns so the Ascendant point sits on the horizon (sky-now.ts tiltToAscendant).
    const deg = tilt && chart.angles ? chart.angles.ascendant.absoluteDegree % 30 : 0;
    return { chart, svg: `<div class="wheel" style="transform:rotate(${deg}deg)">${svg}</div>` };
  }
  // The chart itself, for facts a slide states: the horizon sweep gives the rising and Moon signs across a window, as the birth form does.
  const chart = ({ date, time, lat, lon, tz, windowMinutes = 0 }) => calculateNatalChart(date, time, lat, lon, tz, windowMinutes);
  return { wheel, chart, close: () => vite.close() };
}

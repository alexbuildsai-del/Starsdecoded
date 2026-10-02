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

// The colour tokens NatalWheel reads (hsl(var(--brass)) and the rest), taken from the app's :root.
export function webTokens() {
  const css = fs.readFileSync(path.join(WEB, "src/index.css"), "utf8");
  const start = css.indexOf(":root {");
  const block = css.slice(start, css.indexOf("\n}", start));
  return (block.match(/--[\w-]+:\s*[^;]+;/g) ?? []).join(" ");
}

export async function openWheels() {
  const requireWeb = createRequire(path.join(WEB, "package.json"));
  const { createServer } = await import(requireWeb.resolve("vite"));
  const vite = await createServer({
    configFile: path.join(WEB, "vite.config.ts"), root: WEB, logLevel: "error", appType: "custom",
    server: { middlewareMode: true, hmr: false, fs: { allow: [REPO] } },
    optimizeDeps: { noDiscovery: true, include: [] },
    // Vite 7 inlines React's CommonJS files into its ESM runner unless they stay external ("module is not defined").
    ssr: { external: ["react", "react-dom"] },
  });
  // React comes from web/node_modules through Node, the same copy the component's own import resolves to.
  const React = requireWeb("react");
  const { renderToStaticMarkup } = requireWeb("react-dom/server");
  const { NatalWheel } = await vite.ssrLoadModule("/src/components/chart/NatalWheel.tsx");
  const { calculateNatalChart } = await vite.ssrLoadModule(`/@fs${path.join(REPO, "api/src/lib/chartCalculation.ts")}`);

  async function wheel({ date, time, lat, lon, tz, windowMinutes = 0, centreName, tilt = true }) {
    const chart = calculateNatalChart(date, time, lat, lon, tz, windowMinutes);
    const props = { chartData: chart, selectedHouse: 0, ...(centreName !== undefined ? { centreName } : {}) };
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

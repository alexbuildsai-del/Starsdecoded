// Shoots the Chart part's examples at 390 and 880 px (design-system Scope 8, ADR-441). A dev server on the runner, the
// same vite config as the app; the page is not an input of `vite build`, so it is never in the build or deployed.
// Keyless: nothing here reads a secret or a preview. Usage: node scripts/charts-harness.mjs [outDir]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const outDir = path.resolve(process.argv[2] ?? path.join(webRoot, "..", "e2e", "test-results", "charts"));
// Playwright lives with the checks (e2e), not in the web package.
const { chromium } = createRequire(path.join(webRoot, "..", "e2e", "package.json"))("@playwright/test");

const WIDTHS = [390, 880];
const PORT = Number(process.env.CHARTS_HARNESS_PORT ?? 5391);

mkdirSync(outDir, { recursive: true });
const server = await createServer({ configFile: path.join(webRoot, "vite.config.ts"), root: webRoot, server: { port: PORT, strictPort: true, host: "127.0.0.1" } });
await server.listen();
// CHARTS_HARNESS_CHROMIUM names a browser already on the machine; CI has the one Playwright installed.
const browser = await chromium.launch({ executablePath: process.env.CHARTS_HARNESS_CHROMIUM || undefined, args: process.env.CHARTS_HARNESS_CHROMIUM ? ["--no-sandbox"] : [] });
const problems = [];
try {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    page.on("pageerror", (e) => problems.push(`${width}px: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") problems.push(`${width}px console: ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${PORT}/scripts/charts-harness.html`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-example] svg", { timeout: 30_000 }).catch(() => problems.push(`${width}px: no chart drawn`));
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (sideways > 0) problems.push(`${width}px: the page scrolls sideways by ${sideways}px`);
    await page.screenshot({ path: path.join(outDir, `charts-${width}.png`), fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Chart examples shot at ${WIDTHS.join(" and ")} px into ${outDir}`);

// Renders the two raster brand exports from web/public/mark.svg:
// opengraph.jpg (1200x630, the share card) and mark-email.png (56px, the
// invite header). Run `pnpm brand:render` whenever the mark changes; the
// SVG is the source, these files are derived (ADR-31).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Playwright is only installed for the e2e package, so resolve it from there.
const { chromium } = createRequire(path.join(root, "e2e", "package.json"))("@playwright/test");
const pub = path.join(root, "web", "public");
const fonts = path.join(root, "web", "src", "assets", "fonts");
const mark = readFileSync(path.join(pub, "mark.svg"), "utf8");
const markOnDark = mark.replace('stroke="#5C6BC0"', 'stroke="#7C83D4"').replace('stroke="#5C6BC0"', 'stroke="#7C83D4"');

const css = `
  @font-face { font-family: 'Newsreader'; src: url('file://${fonts}/newsreader-roman.woff2') format('woff2'); font-weight: 200 800; }
  @font-face { font-family: 'IBM Plex Mono'; src: url('file://${fonts}/ibm-plex-mono-500.woff2') format('woff2'); font-weight: 500; }
  * { box-sizing: border-box; margin: 0; }
  body { background: transparent; }
`;

const og = `<!doctype html><meta charset="utf-8"><style>${css}
  .og { width: 1200px; height: 630px; position: relative; overflow: hidden; color: #E6E8EE;
    background: radial-gradient(90% 70% at 20% 110%, rgba(92,107,192,.35), transparent 60%), #0D1117; }
  .c { position: absolute; width: 48px; height: 48px; border-color: #D4B06A; opacity: .7; }
  .tl { top: 36px; left: 36px; border-top: 1px solid; border-left: 1px solid; }
  .tr { top: 36px; right: 36px; border-top: 1px solid; border-right: 1px solid; }
  .bl { bottom: 36px; left: 36px; border-bottom: 1px solid; border-left: 1px solid; }
  .br { bottom: 36px; right: 36px; border-bottom: 1px solid; border-right: 1px solid; }
  .in { position: absolute; inset: 84px 96px; display: grid; align-content: space-between; }
  .lock { display: flex; align-items: center; gap: 26px; font-family: 'Newsreader', Georgia, serif; font-size: 60px; }
  .lock svg { width: 84px; height: 84px; }
  .claim { font-family: 'Newsreader', Georgia, serif; font-size: 77px; line-height: 1.08; letter-spacing: -.01em; max-width: 940px; }
  .foot { display: flex; justify-content: space-between; font-family: 'IBM Plex Mono', monospace; font-size: 20px; letter-spacing: .12em; text-transform: uppercase; color: #D4B06A; opacity: .85; }
</style><div class="og"><span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>
<div class="in"><div class="lock">${markOnDark}<span>Stars Decoded</span></div>
<div class="claim">A psychological report built on your computed natal chart.</div>
<div class="foot"><span>Whole sign · astronomy-engine</span><span>One report · one purchase</span></div></div></div>`;

const email = `<!doctype html><meta charset="utf-8"><style>${css} .m { width: 56px; height: 56px; } .m svg { width: 56px; height: 56px; }</style><div class="m">${markOnDark}</div>`;

// A machine whose Playwright browsers live elsewhere can point at one.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(og, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(pub, "opengraph.jpg"), type: "jpeg", quality: 90, clip: { x: 0, y: 0, width: 1200, height: 630 } });

  const small = await browser.newPage({ viewport: { width: 56, height: 56 }, deviceScaleFactor: 1 });
  await small.setContent(email, { waitUntil: "load" });
  await small.screenshot({ path: path.join(pub, "mark-email.png"), omitBackground: true, clip: { x: 0, y: 0, width: 56, height: 56 } });
} finally {
  await browser.close();
}
console.log("rendered web/public/opengraph.jpg and web/public/mark-email.png");

// Renders the raster brand exports: share-cover-v2.jpg (1200x630, the card every link to the site previews with,
// ADR-227, 228), mark-email.png (56px, every email header) and gift-cover.png (the starfield cover a gift email
// leads with, credit-loop.md, ADR-128). The SVG mark and the planet renders are the sources, these files are derived
// (ADR-31): run it when the mark or the wheel's look changes.
//
//   pnpm brand:render [minute]
//
// The cover is the home page's hero as a still: its eyebrow and heading, a line, the wordmark, and the page's own
// HorizonWheel with the engine's sky for one minute over London, the home page's default place. The minute is now
// unless given, as "2026-10-03T08:50" on London's clock or as an ISO time with its offset. What the cover shows goes
// to web/src/site/data/share-cover.ts beside it, where a test holds it to the engine (reading 15). A new cover takes a
// new file name, never the old one's, so no cached preview stands in for it (ADR-228).
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(root, "web");
const pub = path.join(web, "public");
const COVER = "share-cover-v2.jpg";
const COVER_DATA = path.join(web, "src", "site", "data", "share-cover.ts");
// Under 150 KB (share-cover acceptance 1), read in thousands of bytes as the share-preview smoke reads its 600 KB.
const COVER_MAX_BYTES = 150_000;
// Cover A's own quality, which lands near 100 KB.
const COVER_QUALITY = 88;
const W = 1200;
const H = 630;
const minute = process.argv.slice(2).find((arg) => arg !== "--") ?? "";

// Playwright is only installed for the e2e package and Vite for the web's, so each resolves from there.
const { chromium } = createRequire(path.join(root, "e2e", "package.json"))("@playwright/test");
const requireWeb = createRequire(path.join(web, "package.json"));
const { createServer: createVite } = await import(pathToFileURL(requireWeb.resolve("vite")).href);

const mark = readFileSync(path.join(pub, "mark.svg"), "utf8");
const markOnDark = mark.replace('stroke="#5C6BC0"', 'stroke="#7C83D4"').replace('stroke="#5C6BC0"', 'stroke="#7C83D4"');

/** The cover's words beside the registry's: the spec's line, and the heading's last words in italic as Hero.tsx sets them. */
const COVER_LINE = "A report on how you think, work and love, with every claim pointing to your chart.";
const H1_ITALIC = "says about you";

/**
 * Playwright's own Chromium where it is installed; a cloud session has only an older build beside it, driven by its
 * path (ADR-233). PLAYWRIGHT_CHROMIUM_PATH names any other.
 */
function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const own = chromium.executablePath();
  if (existsSync(own)) return undefined;
  const browsers = path.resolve(own, "..", "..", "..");
  const builds = existsSync(browsers) ? readdirSync(browsers).filter((name) => /^chromium-\d+$/.test(name)) : [];
  builds.sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
  for (const build of builds) {
    for (const dir of ["chrome-linux64", "chrome-linux"]) {
      const found = path.join(browsers, build, dir, "chrome");
      if (existsSync(found)) return found;
    }
  }
  throw new Error(`No Chromium at ${own} or beside it; set PLAYWRIGHT_CHROMIUM_PATH.`);
}

const css = `
  * { box-sizing: border-box; margin: 0; }
  body { background: transparent; }
`;

const email = `<!doctype html><meta charset="utf-8"><style>${css} .m { width: 56px; height: 56px; } .m svg { width: 56px; height: 56px; }</style><div class="m">${markOnDark}</div>`;

// A starfield behind the mark, generic so one static export works for every
// gift (the personal lines — from, for, note — are the email's own text).
const stars = Array.from({ length: 90 }, (_, i) => {
  const x = (i * 87.3) % 1120;
  const y = (i * 53.7 + (i % 7) * 31) % 694;
  const d = i % 9 === 0 ? 3.2 : 1.6;
  const o = (0.16 + (i % 5) * 0.12).toFixed(2);
  return `<span style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${d}px;height:${d}px;border-radius:50%;background:#E8EBF2;opacity:${o}"></span>`;
}).join("");

const giftCover = `<!doctype html><meta charset="utf-8"><style>${css}
  .gc { width: 1120px; height: 694px; position: relative; overflow: hidden;
    background: radial-gradient(85% 75% at 74% 32%, #1B2340 0%, #0D1117 55%, #06080C 100%); }
  .gc .ring { position: absolute; right: 130px; top: 50%; transform: translateY(-50%); width: 320px; height: 320px; opacity: .95; }
  .gc .ring svg { width: 100%; height: 100%; }
</style><div class="gc">${stars}<div class="ring">${markOnDark}</div></div>`;

// Where cover A (the share-cover artifact) sets each part: the hero's grid at 1200 wide, its wheel column 553 square.
const coverCss = `
  html, body { margin: 0; background: #0D1117; }
  .cv { width: ${W}px; height: ${H}px; min-height: 0; overflow: hidden; }
  .cv .sd-hero { width: ${W}px; height: ${H}px; min-height: 0; }
  .cv-stars { position: absolute; inset: 0; width: ${W}px; height: ${H}px; pointer-events: none; }
  .cv-text { position: absolute; left: 24px; top: 0; width: 543px; height: ${H}px; }
  .cv-text > * { position: absolute; left: 0; }
  .cv .sd-eyebrow { top: 11px; }
  .cv .sd-h1 { top: 39px; margin: 0; font-size: 80px; max-width: none; }
  .cv .cv-line { top: 350px; font-size: 27px; line-height: 1.32; max-width: 500px; }
  .cv .cv-word { top: 523px; gap: 14px; font-size: 34px; }
  .cv .cv-word .cv-mark { display: block; width: 44px; height: 44px; }
  .cv .cv-word .cv-mark svg { width: 44px; height: 44px; }
  .cv-wheel { position: absolute; left: 623px; top: 35px; width: 553px; height: 553px; }
`;

const coverHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="/src/index.css">
<link rel="stylesheet" href="/src/fonts.css">
<link rel="stylesheet" href="/src/site/site.css">
<style>${coverCss}</style>
</head><body><div id="cover"></div><script type="module" src="/@id/__x00__virtual:share-cover"></script></body></html>`;

/**
 * The cover's page, run in the browser: everything it uses arrives as an argument, the web's own modules as Vite
 * serves them to the site and what this script was given. It answers what it drew, and what it found wrong.
 */
async function drawCover(site, given) {
  const { createElement: h, createRoot, flushSync, HorizonWheel, RING_SHARE, BODIES, skyNow, frameOf } = site;
  const { localParts, offsetAtBirth, latLngLine, sunLine, placeTitle, pageFor, PRODUCT, planGather, landing, GATHER_MAX, wheelRadii } = site;
  const [width, height] = given.size;
  const ZONE = "Europe/London";
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const problems = [];

  // A minute without an offset is London's clock, turned into an instant as the engine turns a birth time into one.
  let at = new Date();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(given.minute)) {
    const [date, time] = given.minute.split(/[T ]/);
    at = new Date(Date.parse(`${date}T${time}:00Z`) - offsetAtBirth(ZONE, date, time) * 3_600_000);
  } else if (given.minute) {
    const zoned = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(given.minute);
    at = new Date(zoned ? given.minute : Number.NaN);
  }
  if (Number.isNaN(at.getTime())) return { problems: [`"${given.minute}" is not a minute: give 2026-10-03T08:50 on London's clock, or an ISO time with its offset.`] };
  at = new Date(Math.floor(at.getTime() / 60_000) * 60_000);

  const sky = skyNow(at, ZONE);
  const { date, time } = localParts(at, ZONE);
  const [year, month, day] = date.split("-").map(Number);
  const corners = {
    tl: `THE SKY · ${day} ${MONTHS[month - 1]} ${year} · ${time}`,
    tr: `OVER ${placeTitle(sky.place).toUpperCase()} · ${latLngLine(sky.place.latitude, sky.place.longitude)}`,
    bl: "WHOLE SIGN · TROPICAL",
    br: sunLine(sky.chart),
  };

  const home = pageFor("/");
  const split = home.h1.lastIndexOf(given.italic);
  const heading = split < 0 ? [home.h1] : [home.h1.slice(0, split), h("em", { key: "em" }, given.italic), home.h1.slice(split + given.italic.length)];

  // Every face before the first layout, so the boxes measured below are the ones the screenshot shows.
  await Promise.all([...document.fonts].map((face) => face.load().catch(() => problems.push(`font ${face.family} did not load`))));

  const host = document.getElementById("cover");
  flushSync(() =>
    createRoot(host).render(
      h("div", { className: "sd cv" },
        h("section", { className: "sd-hero" },
          h("canvas", { className: "cv-stars", width, height }),
          h("div", { className: "cv-text" },
            h("p", { className: "sd-eyebrow" }, home.eyebrow),
            h("h1", { className: "sd-h1" }, ...heading),
            h("p", { className: "sd-lede cv-line" }, given.line),
            h("p", { className: "sd-word cv-word" },
              h("span", { className: "cv-mark", dangerouslySetInnerHTML: { __html: given.mark } }),
              h("span", null, PRODUCT),
            ),
          ),
          h("div", { className: "cv-wheel" },
            h(HorizonWheel, { sky, arrival: "still", hud: false }),
            ...Object.entries(corners).map(([corner, words]) => h("div", { key: corner, className: `sd-hud ${corner}` }, words)),
          ),
        ),
      ),
    ),
  );

  const boxOf = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = el.matches("svg *") ? el.getBoundingClientRect() : range.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width };
  };
  const words = [...host.querySelectorAll(".cv-text > *")].map((el) => [el.textContent.trim() || "the mark", boxOf(el)]);
  const labels = [...host.querySelectorAll(".sd-hud, .sd-hz b, .cv-wheel svg text")]
    .map((el) => [el.textContent.trim(), boxOf(el)])
    .filter(([, box]) => box.width > 0);

  // The hero's own starfield as first light leaves it, about 70% gathered onto the ring, seeded so a minute draws one image.
  const square = host.querySelector(".cv-wheel").getBoundingClientRect();
  const ring = { cx: square.left + square.width / 2, cy: square.top + square.height / 2, r: square.width * RING_SHARE + 12 };
  let seed = 0x5d0c0e;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const field = Array.from({ length: GATHER_MAX }, () => ({
    x: random() * width, y: random() * height, r: 0.45 + random() * 1.05, a: 0.22 + random() * 0.6, cool: random() < 0.3,
  }));
  const moving = new Map(planGather(field, ring, random).moves.map((move) => [move.index, move]));
  // The ring the stars gather on runs through the MC label: a star fixed in its C would read as a G.
  const onWords = (p) => [...words, ...labels].some(([, box]) => p.x > box.left - 3 && p.x < box.right + 3 && p.y > box.top - 3 && p.y < box.bottom + 3);
  const ctx = host.querySelector(".cv-stars").getContext("2d");
  field.forEach((star, i) => {
    const move = moving.get(i);
    const p = move ? landing(move, ring) : star;
    if (onWords(p)) return;
    ctx.globalAlpha = move ? star.a : star.a * 0.7;
    ctx.fillStyle = star.cool ? "#C5CAE9" : "#FFFFFF";
    ctx.beginPath();
    ctx.arc(p.x, p.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });

  await document.fonts.ready;
  await Promise.all([...host.querySelectorAll("image")].map((image) => {
    const img = new Image();
    img.src = image.getAttribute("href");
    return img.decode().catch(() => problems.push(`planet render ${img.src} did not load`));
  }));
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

  // Every body where the engine puts it: read back off the wheel, not taken on trust from the sky handed to it.
  const centre = wheelRadii(600).centre;
  const frame = frameOf(sky.chart);
  const hundredth = (n) => Math.round(n * 100) / 100;
  const degrees = {};
  for (const body of BODIES) {
    const engine = sky.chart.planets[body].absoluteDegree;
    const drawn = host.querySelector(`[data-k="${body}"]`)?.getAttribute("transform")?.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    const angle = drawn ? (Math.atan2(centre - Number(drawn[2]), Number(drawn[1]) - centre) * 180) / Math.PI : NaN;
    const off = Math.abs(((angle - 180 + frame - engine) % 360 + 540) % 360 - 180);
    if (!(off < 0.01)) problems.push(`${body} is drawn ${Number.isNaN(off) ? "nowhere" : `${off.toFixed(3)}° from the engine's degree`}`);
    degrees[body] = hundredth(engine);
  }
  degrees.ascendant = hundredth(sky.chart.angles.ascendant.absoluteDegree);
  degrees.midheaven = hundredth(sky.chart.angles.midheaven.absoluteDegree);

  // Share-cover acceptance 2, measured rather than eyed: only the horizon line, which is no label, runs off the edges.
  for (const [what, box] of [...words, ...labels]) {
    if (box.left < 0 || box.top < 0 || box.right > width || box.bottom > height) problems.push(`"${what}" is cut at the edge`);
  }
  const meets = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const clear = ring.r + 16;
  const intoRing = (box) => {
    const x = Math.max(box.left, Math.min(ring.cx, box.right));
    const y = Math.max(box.top, Math.min(ring.cy, box.bottom));
    return Math.hypot(x - ring.cx, y - ring.cy) < clear;
  };
  for (const [what, box] of words) {
    if (intoRing(box)) problems.push(`"${what}" reaches into the wheel`);
    for (const [other, near] of [...words, ...labels]) if (other !== what && meets(box, near)) problems.push(`"${what}" overlaps "${other}"`);
  }

  return { at: at.toISOString(), place: { city: sky.place.city, zone: sky.place.timezone, lat: sky.place.latitude, lon: sky.place.longitude }, corners, degrees, problems };
}

const coverEntry = `
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { localParts, offsetAtBirth } from "@workspace/engine";
import { wheelRadii } from "@/components/chart/wheel-geometry";
import { GATHER_MAX, landing, planGather } from "@/lib/gather";
import { placeTitle } from "@/lib/places";
import { PRODUCT } from "@/lib/product";
import { latLngLine, sunLine } from "@/lib/sky-now";
import { HorizonWheel, RING_SHARE } from "@/site/components/HorizonWheel";
import { BODIES, frameOf, skyNow } from "@/site/lib/sky";
import { pageFor } from "@/site/site";
const site = { createElement, createRoot, flushSync, localParts, offsetAtBirth, wheelRadii, GATHER_MAX, landing, planGather, placeTitle, PRODUCT, latLngLine, sunLine, HorizonWheel, RING_SHARE, BODIES, frameOf, skyNow, pageFor };
window.__cover = (${drawCover})(site, ${JSON.stringify({ minute, size: [W, H], line: COVER_LINE, italic: H1_ITALIC, mark: markOnDark })})
  .catch((error) => ({ problems: [String(error?.stack ?? error)] }));
`;

/** What the cover shows, for share-cover.test.ts to hold to the engine and to the image every page's head names. */
function coverModule(drawn) {
  const entries = (record) => Object.entries(record).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(", ");
  return `// Written by \`pnpm brand:render\` (scripts/render-brand.mjs) with web/public/${COVER}; redraw the cover rather than edit it.

/**
 * The share cover's minute and place, its corners as printed, and the ecliptic longitude, to the hundredth, of each
 * body its wheel drew and of the two angles the wheel is set by (reading 15). share-cover.test.ts holds them to skyAt.
 */
export const SHARE_COVER = {
  image: "/${COVER}",
  at: ${JSON.stringify(drawn.at)},
  place: { ${entries(drawn.place)} },
  corners: {
${Object.entries(drawn.corners).map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`).join("\n")}
  },
  degrees: {
${Object.entries(drawn.degrees).map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`).join("\n")}
  },
} as const;
`;
}

/**
 * The web's own modules, compiled as the dev server compiles them for the site, so the wheel is the page's component
 * and not a copy. Its own cache, so a dev server or a build running beside it keeps theirs.
 */
async function openSite() {
  const vite = await createVite({
    configFile: path.join(web, "vite.config.ts"),
    root: web,
    logLevel: "error",
    appType: "custom",
    cacheDir: path.join(os.tmpdir(), "starsdecoded-brand-render"),
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: ["react", "react-dom", "react-dom/client", "react/jsx-dev-runtime"] },
    plugins: [
      {
        name: "share-cover",
        resolveId: (id) => (id === "virtual:share-cover" ? "\0virtual:share-cover" : undefined),
        load: (id) => (id === "\0virtual:share-cover" ? coverEntry : undefined),
      },
    ],
  });
  const server = createHttpServer((req, res) => {
    if (req.url === "/cover.html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(coverHtml);
      return;
    }
    vite.middlewares(req, res);
  });
  await new Promise((listening) => server.listen(0, "127.0.0.1", listening));
  return {
    url: `http://127.0.0.1:${server.address().port}/cover.html`,
    close: async () => {
      await new Promise((closed) => server.close(closed));
      await vite.close();
    },
  };
}

const executablePath = chromiumPath();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const site = await openSite();
try {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} for ${response.url()}`);
  });
  await page.goto(site.url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__cover !== undefined, null, { timeout: 60_000 });
  const drawn = await page.evaluate(() => window.__cover);
  const problems = [...errors, ...drawn.problems];
  if (problems.length > 0) throw new Error(`The cover was not drawn:\n  ${problems.join("\n  ")}`);
  const jpeg = await page.screenshot({ type: "jpeg", quality: COVER_QUALITY, clip: { x: 0, y: 0, width: W, height: H }, animations: "disabled" });
  if (jpeg.length >= COVER_MAX_BYTES) throw new Error(`The cover is ${jpeg.length} bytes, over ${COVER_MAX_BYTES}: lower COVER_QUALITY.`);
  writeFileSync(path.join(pub, COVER), jpeg);
  writeFileSync(COVER_DATA, coverModule(drawn));
  console.log(`drew the sky at ${drawn.corners.tl.slice(10)} over London: ${jpeg.length} bytes`);

  const small = await browser.newPage({ viewport: { width: 56, height: 56 }, deviceScaleFactor: 1 });
  await small.setContent(email, { waitUntil: "load" });
  await small.screenshot({ path: path.join(pub, "mark-email.png"), omitBackground: true, clip: { x: 0, y: 0, width: 56, height: 56 } });

  const cover = await browser.newPage({ viewport: { width: 1120, height: 694 }, deviceScaleFactor: 1 });
  await cover.setContent(giftCover, { waitUntil: "load" });
  await cover.evaluate(() => document.fonts.ready);
  await cover.screenshot({ path: path.join(pub, "gift-cover.png"), clip: { x: 0, y: 0, width: 1120, height: 694 } });
} finally {
  await browser.close();
  await site.close();
}
console.log(`rendered web/public/${COVER} (with web/src/site/data/share-cover.ts), web/public/mark-email.png and web/public/gift-cover.png`);

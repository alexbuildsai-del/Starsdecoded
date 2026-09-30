// Renders a post (a JSON file of slides) to PNGs in the product's look.
//   node render.mjs post.json [--out dir] [--formats 3x4,9x16]
// 3x4 is 1080x1440 for Instagram posted from the app, 4x5 (1080x1350) when a scheduler's API needs it,
// 9x16 is 1080x1920 for TikTok photo mode.
// A wheel is always the product's NatalWheel (wheel.mjs), never a drawing of our own; the app's tokens
// are scoped to its box so they never touch the slide's. The day strip is the one from the
// unknown-birth-time ideation, fed by the product's own horizon sweep.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SIGNS, elementOf } from "./sky.mjs";
import { openWheels, webTokens } from "./wheel.mjs";

const KIT = path.dirname(new URL(import.meta.url).pathname);
const SIZES = { "3x4": [1080, 1440], "4x5": [1080, 1350], "9x16": [1080, 1920] };
const HUE = { fire: "#E0845C", earth: "#7FB08B", air: "#8FC5E0", water: "#6B7FD7" };
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function chrome() {
  const found = [process.env.CHROME_PATH,
    ...(fs.existsSync("/opt/pw-browsers") ? fs.readdirSync("/opt/pw-browsers").filter((d) => d.startsWith("chromium-")).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`) : []),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
    .find((p) => p && fs.existsSync(p));
  if (!found) throw new Error("No Chrome or Chromium found. Set CHROME_PATH.");
  return found;
}

// A fixed, seeded starfield: the same sky behind every slide of a post, quiet enough to never compete with type.
function stars(w, h, seed) {
  let a = seed >>> 0;
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let dots = "";
  for (let i = 0, n = Math.round((w * h) / 7200); i < n; i++) {
    const r = rnd() < 0.93 ? 0.5 + rnd() * 0.9 : 1.4 + rnd() * 0.9, o = r > 1.3 ? 0.55 + rnd() * 0.3 : 0.14 + rnd() * 0.36;
    dots += `<circle cx="${(rnd() * w).toFixed(1)}" cy="${(rnd() * h).toFixed(1)}" r="${r.toFixed(2)}" fill="#E8EBF2" opacity="${o.toFixed(2)}"/>`;
  }
  return `<svg class="stars" viewBox="0 0 ${w} ${h}" aria-hidden="true">${dots}</svg>`;
}

const mark = () => `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="none" stroke="#7C83D4" stroke-width="3"/><line x1="10" y1="32" x2="54" y2="32" stroke="#7C83D4" stroke-width="2.6" stroke-linecap="round"/><circle cx="10" cy="32" r="4.6" fill="#D4B06A"/></svg>`;
const sig = () => `<div class="sig">${mark()}Stars Decoded</div>`;
const kicker = (k) => (k ? `<p class="kicker">${esc(k)}</p>` : "");
const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

// The strip from the unknown-birth-time ideation: a local day, a sign per segment, the reader's window dashed in brass.
function strip({ width, segs, from, to, win, height = 56, big = false, marks = [], outline = true }) {
  const x = (m) => ((m - from) / (to - from)) * width, H = height + (big ? 64 : 58) + 8;
  let s = `<svg width="${width}" height="${H}" viewBox="0 -8 ${width} ${H}" aria-hidden="true" style="overflow:visible">`;
  for (const g of segs) {
    const a = Math.max(g.from, from), b = Math.min(g.to, to);
    if (b <= a) continue;
    const inside = win && g.to > win[0] && g.from < win[1], xa = x(a) + 2, xb = x(b) - 2, w = xb - xa;
    s += `<rect x="${xa.toFixed(1)}" y="0" width="${Math.max(1, w).toFixed(1)}" height="${height}" rx="6" fill="${inside ? "#D4B06A" : "#171D29"}" stroke="${inside ? "#D4B06A" : "rgba(255,255,255,.14)"}" stroke-width="1.5"/>`;
    const fs = big ? 30 : 22, fits = (n) => w > n * fs * 0.56 + 18, label = fits(g.sign.length) ? g.sign : fits(3) ? g.sign.slice(0, 3) : "";
    if (label) s += `<text x="${((xa + xb) / 2).toFixed(1)}" y="${height / 2 + fs * 0.36}" text-anchor="middle" fill="${inside ? "#1a1408" : "#AEB6C6"}" font-family="Space Grotesk" font-weight="500" font-size="${fs}">${label}</text>`;
  }
  if (win && outline) s += `<rect x="${(x(win[0]) - 5).toFixed(1)}" y="-6" width="${(x(win[1]) - x(win[0]) + 10).toFixed(1)}" height="${height + 12}" rx="10" fill="none" stroke="#D4B06A" stroke-width="2.5" stroke-dasharray="8 7"/>`;
  const kept = marks.filter((m, i) => i === 0 || (x(m.t) - x(marks[i - 1].t) > 88 && (i < marks.length - 1 || x(m.t) - x(marks[i - 1].t) > 150)));
  kept.forEach((m, i) => {
    const anchor = i === 0 ? "start" : x(m.t) > width - 40 ? "end" : "middle";
    s += `<text x="${x(m.t).toFixed(1)}" y="${height + 44}" text-anchor="${anchor}" fill="#AEB6C6" font-family="IBM Plex Mono" font-size="28">${m.label}</text>`;
  });
  return s + "</svg>";
}

// Segments of a horizon value (rising sign or Moon sign) across the swept day, from the product's flipsAt.
function segments(h) {
  const cuts = [0, ...h.flipsAt.map(mins), 1440];
  return h.values.map((sign, i) => ({ sign, from: cuts[i], to: cuts[i + 1] }));
}

const wheelBox = (svg, size) => `<div class="wheelbox" style="width:${size}px;height:${size}px">${svg}</div>`;

function visualFor(sl, f) {
  const v = sl.visual;
  if (!v) return "";
  if (v.type === "wheel") return `<div class="visual">${wheelBox(sl._wheel, f === "9x16" ? 720 : 660)}</div><p class="meta" style="justify-content:center">${esc(v.caption ?? "")}</p>`;
  if (v.type === "pair") {
    const w = f === "9x16" ? 410 : 430;
    const cell = (svg, p) => `<div style="display:grid;gap:8px;justify-items:center">${wheelBox(svg, w)}<p class="meta" style="margin-top:0">${esc(p.caption)}</p></div>`;
    const rows = (v.rows ?? []).map((r) => `<div class="row" style="grid-template-columns:1fr 1fr 1fr;padding:10px 0"><span>${esc(r[0])}</span><b style="font-size:36px">${esc(r[1])}</b><b style="font-size:36px">${esc(r[2])}</b></div>`).join("");
    return `<div style="margin-top:auto;display:flex;justify-content:space-between">${cell(sl._pair[0], v.a)}${cell(sl._pair[1], v.b)}</div>${rows ? `<div class="rows" style="margin-top:18px">${rows}</div>` : ""}`;
  }
  return "";
}

const TEMPLATES = {
  cover: (s, f) => `${kicker(s.kicker)}<h1 class="hook${s.size === "md" ? " md" : ""}">${esc(s.title)}</h1>${s.cue ? `<p class="cue">${esc(s.cue)}</p>` : ""}${s.visual ? visualFor(s, f) : sig()}`,
  sign(s) {
    const i = SIGNS.findIndex((n) => n.toLowerCase() === s.sign.toLowerCase()), el = elementOf(SIGNS[i]);
    return `${kicker(s.kicker)}<p class="meta" style="margin-top:12px;color:${HUE[el]}">${el} · ${["cardinal", "fixed", "mutable"][i % 3]}</p>`
      + `<p class="line" style="font-size:84px;line-height:1.1;margin-top:auto">${esc(s.line)}</p>`
      + (s.help ? `<div class="help" style="margin-top:auto"><p class="kicker">${esc(s.helpLabel ?? "What helps")}</p><p>${esc(s.help)}</p></div>` : "");
  },
  text: (s, f) => `${kicker(s.kicker)}<h2 class="title">${esc(s.title)}</h2>${s.body ? `<p class="body">${esc(s.body)}</p>` : ""}${visualFor(s, f)}${s.fact ? `<p class="fact"${s.visual ? "" : ' style="margin-top:auto"'}>${s.fact}</p>` : ""}`,
  strip(s, f) {
    const width = f === "9x16" ? 828 : 896, win = s.window ? s.window.map(mins) : null;
    const hours = [0, 6, 12, 18, 24].map((h) => `<span>${String(h).padStart(2, "0")}:00</span>`).join("");
    let html = `${kicker(s.kicker)}<h2 class="title">${esc(s.title)}</h2>`;
    html += `<p class="meta" style="margin-top:34px">${esc(s.label ?? "")}</p><div style="margin-top:14px">${strip({ width, segs: s._segs, from: 0, to: 1440, win })}</div><div class="ticks" style="margin-top:-30px">${hours}</div>`;
    if (win && s.zoom) {
      const inside = s._segs.filter((g) => g.to > win[0] && g.from < win[1]);
      const marks = [{ t: win[0], label: hm(win[0]) }, ...inside.slice(1).map((g) => ({ t: g.from, label: hm(g.from) })), { t: win[1], label: hm(win[1]) }];
      html += `<p class="meta" style="margin-top:40px">${esc(s.zoomLabel ?? "")}</p><div style="margin-top:14px">${strip({ width, segs: inside, from: win[0], to: win[1], win, height: 110, big: true, marks, outline: false })}</div>`;
    }
    if (s.body) html += `<p class="body" style="margin-top:56px">${esc(s.body)}</p>`;
    if (s.fact) html += `<p class="fact">${s.fact}</p>`;
    return html;
  },
  end: (s) => `${kicker(s.kicker)}<h2 class="title">${esc(s.title)}</h2>${s.body ? `<p class="body">${esc(s.body)}</p>` : ""}${s.cta ? `<p class="cta">${esc(s.cta)}</p>` : ""}<p class="url" style="margin-top:28px">${esc(s.url ?? "mystarsdecoded.com")}</p>${sig()}`,
};

// Everything computed happens here, once, before any page is written.
async function prepare(post) {
  if (!post.slides.some((s) => s.visual || s.type === "strip")) return;
  const W = await openWheels();
  try {
    for (const s of post.slides) {
      const v = s.visual;
      if (v?.type === "wheel") s._wheel = (await W.wheel(v)).svg;
      if (v?.type === "pair") s._pair = [(await W.wheel({ ...v, ...v.a })).svg, (await W.wheel({ ...v, ...v.b })).svg];
      if (s.type === "strip") {
        const c = W.chart({ date: s.date, time: "12:00", lat: s.lat, lon: s.lon, tz: s.tz, windowMinutes: 720 });
        s._segs = segments(s.of === "moon" ? c.horizon.moonSign : c.horizon.ascendant);
        // The sweep steps two minutes at a time; move each change back to the first whole minute of the new sign.
        const signAt = (m) => { const x = W.chart({ date: s.date, time: hm(m), lat: s.lat, lon: s.lon, tz: s.tz }); return s.of === "moon" ? x.planets.moon.sign : x.angles.ascendant.sign; };
        for (let i = 1; i < s._segs.length; i++) {
          let m = s._segs[i].from;
          while (m - 1 > s._segs[i - 1].from && signAt(m - 1) === s._segs[i].sign) m -= 1;
          s._segs[i].from = s._segs[i - 1].to = m;
        }
      }
    }
  } finally { await W.close(); }
}

// Alt text per slide, pasted into each app: the words on the slide plus what the picture shows, stated as facts.
function altFor(sl) {
  const words = [sl.kicker, sl.title, sl.line, sl.body, sl.help && `What helps: ${sl.help}`, sl.cta].filter(Boolean).join(". ").replace(/\.\./g, ".");
  const v = sl.visual;
  let pic = "";
  if (v?.type === "wheel") pic = `A birth chart wheel, ${v.caption}.`;
  else if (v?.type === "pair") pic = `Two birth chart wheels side by side, ${v.a.caption} and ${v.b.caption}. ${(v.rows ?? []).map((r) => `${r[0]}: ${r[1]} and ${r[2]}`).join(". ")}.`;
  else if (sl.type === "strip") pic = `${sl.label}: a strip across the day, ${sl._segs.map((g) => `${g.sign} from ${hm(g.from)}`).join(", ")}.`;
  return `${words}${words.endsWith(".") ? "" : "."} ${pic}`.trim();
}

function page(slide, f, seed) {
  const [w, h] = SIZES[f];
  const fill = TEMPLATES[slide.type];
  if (!fill) throw new Error(`Unknown slide type ${slide.type}`);
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${KIT}/slide.css"><style>.wheelbox{${webTokens()}}</style></head>`
    + `<body class="f${f}"><div class="slide">${stars(w, h, seed)}<div class="inner">${fill(slide, f)}</div></div></body></html>`;
}

function shoot(bin, html, png, [w, h]) {
  execFileSync(bin, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
    "--force-device-scale-factor=1", `--window-size=${w},${h}`, "--virtual-time-budget=4000", `--screenshot=${png}`, `file://${html}`], { stdio: "ignore" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) { console.log("usage: node render.mjs post.json [--out dir] [--formats 3x4,9x16]"); process.exit(1); }
  const opt = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const post = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = path.resolve(opt("--out", path.join(KIT, "out")), post.id);
  const formats = opt("--formats", "3x4,9x16").split(",");
  const bin = chrome();
  const seed = [...post.id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  await prepare(post);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "alt.txt"), post.slides.map((sl, i) => `${i + 1}. ${altFor(sl)}`).join("\n") + "\n");
  fs.writeFileSync(path.join(out, "post.json"), JSON.stringify(post, (k, v) => (k.startsWith("_") ? undefined : v), 1) + "\n");
  for (const f of formats) {
    const dir = path.join(out, f);
    fs.mkdirSync(dir, { recursive: true });
    const pngs = post.slides.map((slide, i) => {
      const n = String(i + 1).padStart(2, "0"), html = path.join(dir, `${n}.html`), png = path.join(dir, `${post.id}-${f}-${n}.png`);
      fs.writeFileSync(html, page(slide, f, seed));
      shoot(bin, html, png, SIZES[f]);
      return png;
    });
    const cols = f === "9x16" ? 6 : 5, tw = 216, [w, h] = SIZES[f], th = Math.round((tw * h) / w), rows = Math.ceil(pngs.length / cols);
    const sheet = path.join(out, `sheet-${f}.html`);
    fs.writeFileSync(sheet, `<!doctype html><html><body style="margin:0;background:#06080C;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:8px;padding:8px">${pngs.map((p) => `<img src="file://${p}" width="${tw}" height="${th}">`).join("")}</body></html>`);
    shoot(bin, sheet, path.join(out, `sheet-${f}.png`), [cols * (tw + 8) + 8, rows * (th + 8) + 8]);
    console.log(`${f}: ${pngs.length} slides in ${dir}, contact sheet ${path.join(out, `sheet-${f}.png`)}`);
  }
}

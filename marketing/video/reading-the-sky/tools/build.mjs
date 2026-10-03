// Assembles chapter 1 into one HyperFrames project per format (ch1-16x9, ch1-9x16): the voice placed on
// the timeline, scene windows and key moments from the voice's own word timings, captions in the
// script's words, the product wheel tagged by layer, and every asset copied in so nothing loads at render.
import fs from "node:fs";
import path from "node:path";
import { webTokens } from "../../../../.claude/skills/marketing/kit/wheel.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SH = path.join(ROOT, "shared"), SRC = path.join(ROOT, "src");
const read = (p) => fs.readFileSync(p, "utf8");
const json = (p) => JSON.parse(read(p));
const r2 = (x) => Math.round(x * 100) / 100;

const script = json(path.join(SH, "voice/ch1.json"));
const lineText = Object.fromEntries(script.lines.map((l) => [l.id, l.text]));
const wavSeconds = (id) => {
  const b = fs.readFileSync(path.join(SH, `voice/${id}.wav`));
  return (b.length - 44) / b.readUInt32LE(28);
};

// Script words carry the ASR timings; a word the recogniser heard differently borrows its neighbours'.
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
function align(id) {
  const words = lineText[id].replace(/A S C/g, "ASC").split(/\s+/);
  const asr = json(path.join(SH, `voice/${id}.words.json`));
  const out = words.map((text) => ({ text, start: null, end: null }));
  let j = 0;
  for (let i = 0; i < words.length; i++) {
    const n = norm(words[i]);
    for (let k = j; k < Math.min(asr.length, j + 4); k++) if (norm(asr[k].text) === n || (n === "asc" && /^(a|s|c|asc)$/.test(norm(asr[k].text)))) { out[i].start = asr[k].start; out[i].end = asr[k].end; j = k + 1; break; }
  }
  for (let i = 0; i < out.length; i++) if (out[i].start == null) {
    const p = out.slice(0, i).reverse().find((w) => w.start != null), q = out.slice(i + 1).find((w) => w.start != null);
    out[i].start = p ? p.end : 0; out[i].end = q ? q.start : out[i].start + 0.3;
  }
  return out;
}

const VO = { "c1-hook": 0.5, "c1-disc": 11.4, "c1-signs": 32.4 };
const words = {};
for (const id of Object.keys(VO)) words[id] = align(id);
const signsEnd = VO["c1-signs"] + wavSeconds("c1-signs");
const beatStart = r2(signsEnd + 0.5), beatStep = 0.92;
const horizonStart = r2(beatStart + 12 * beatStep + 0.6);
VO["c1-horizon"] = r2(horizonStart + 0.8);
words["c1-horizon"] = align("c1-horizon");

const at = (id, w, nth = 1, exact = false) => {
  let n = 0;
  for (const x of words[id]) if ((exact ? x.text.replace(/[^\w]/g, "") === w : norm(x.text) === w.toLowerCase()) && ++n === nth) return r2(VO[id] + x.start);
  throw new Error(`no "${w}" in ${id}`);
};
const KEYS = {
  speed: at("c1-disc", "speed"), flat: at("c1-disc", "flat"), soFrom: at("c1-disc", "So", 1, true), zodiac: at("c1-disc", "zodiac"),
  twelve: at("c1-signs", "twelve"), spring: at("c1-signs", "spring"), signs: at("c1-signs", "signs"), named: at("c1-signs", "named"), ruler: at("c1-signs", "ruler"),
  horizon: at("c1-horizon", "horizon"), east: at("c1-horizon", "east"), slow: at("c1-horizon", "slow"), London: at("c1-horizon", "London"), six: at("c1-horizon", "six"),
  Virgo: at("c1-horizon", "Virgo"), date: at("c1-horizon", "date"), time: at("c1-horizon", "time"), East: at("c1-horizon", "East", 1, true), here: at("c1-horizon", "here"),
};
const total = r2(KEYS.here + 7.5);
const SCENES = {
  hook: [0, 11.0], disc: [11.0, 32.0], signs: [32.0, horizonStart], horizon: [horizonStart, total],
  beat: [beatStart, beatStart + 12 * beatStep], beatStep, sweep: [r2(horizonStart + 2.4), KEYS.six], end: [r2(KEYS.here + 1.8), total],
};

// Captions: up to six words, broken after punctuation, in the script's spelling.
const CAPTIONS = [];
for (const id of Object.keys(VO)) {
  let group = [];
  const flush = () => { if (group.length) CAPTIONS.push({ start: group[0].start, end: group.at(-1).end, words: group }); group = []; };
  for (const w of words[id]) {
    group.push({ text: w.text, start: r2(VO[id] + w.start) });
    group.at(-1).end = r2(VO[id] + w.end);
    if (group.length >= 6 || /[.,:;!?]$/.test(w.text) && group.length >= 3) flush();
  }
  flush();
}
CAPTIONS.forEach((c) => (c.end = c.words.at(-1).end));

// The product wheel, its groups tagged so the timeline can move bodies and houses separately.
const kit = read(path.join(SH, "data/wheel.html"));
const tilt = Number(kit.match(/rotate\(([-\d.]+)deg\)/)[1]);
let svg = kit.match(/<svg[\s\S]*<\/svg>/)[0]
  .replace(/ class="w-full h-auto"/, "")
  .replace(/href="file:\/\/[^"]*\/planets\/([\w-]+\.webp)"/g, 'href="assets/planets/$1"')
  .replace(/<g tabindex="0" role="button" aria-label="(House [^"]+)" class="[^"]*"/g, '<g class="wl-house" aria-label="$1"')
  .replace(/<g tabindex="0" role="button" aria-label="([^"]+)" class="[^"]*"/g, '<g class="wl-body" aria-label="$1"');

const data = json(path.join(SH, "data/ch1.json"));
const SIGN_LINES = ["acts first", "is steady", "is curious", "protects", "is warm and wants to be seen", "notices and fixes", "weighs things up", "goes deep", "aims far", "plays the long game", "thinks for the group", "feels everything"];
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const rise = (s) => { const m = data.risingMinutes[s]; return `${Math.floor(m / 60) ? Math.floor(m / 60) + " h " : ""}${m % 60} m`; };

function page(fmt) {
  const audio = Object.entries(VO).map(([id, s], i) => `<audio id="vo-${id}" src="assets/voice/${id}.wav" data-start="${s}" data-duration="${r2(wavSeconds(id))}" data-track-index="${20 + i}"></audio>`).join("\n    ");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${fmt.w}, height=${fmt.h}" />
  <title>Reading the Sky · chapter 1 · ${fmt.name}</title>
  <script src="assets/vendor/gsap.min.js"></script>
  <style>${read(path.join(SRC, "ch1.css"))}
#wheel { ${webTokens()} }</style>
</head>
<body>
  <div id="root" data-composition-id="ch1" data-start="0" data-width="${fmt.w}" data-height="${fmt.h}" data-duration="${total}">
    <canvas id="sky"></canvas>
    <div id="wheel"><div id="wheel-tilt" style="width:100%;height:100%">${svg}</div></div>
    <div class="title" id="title"><p>Reading the Sky · 1</p><h1>How to read a birth chart</h1></div>
    <div id="date">30 AUG 2011</div>
    <div class="chip" id="chip-periods">Mercury 88 days · Earth 1 year · Saturn 29.4 years</div>
    <div class="chip" id="chip-flat">Every orbit within 7° of Earth's plane</div>
    <div class="label" id="note-scale" style="color:#9aa3b5">distances not to scale</div>
    <div class="label" id="lab-zodiac">The zodiac</div>
    <div class="chip" id="chip-eq">0° Aries = the March equinox</div>
    <div class="chip" id="chip-pisces">At the equinox the Sun is in the stars of Pisces</div>
    ${SIGNS.map((s, i) => `<div class="signline"><b>${s}</b><span>${SIGN_LINES[i]}</span></div>`).join("\n    ")}
    <div class="label" id="lab-east">East</div>
    <div class="label" id="lab-west" style="color:#9aa3b5">West</div>
    <div id="clock"><span id="clock-t">00:00</span><small>BST · London · 30 Aug 2012</small></div>
    <div class="chip" id="rising"></div>
    <div class="chip" id="chip-speed">Virgo takes ${rise("Virgo")} to rise · Pisces ${rise("Pisces")}</div>
    <div class="chip" id="chip-time">Born 06:30 BST · London</div>
    <div class="chip" id="chip-sunrise">Sunrise 06:10 · ASC Virgo 9°43′</div>
    <div id="caption"></div>
    <div class="end" id="end"><span class="next">Next · chapter 2</span><span class="t">Who, how, where</span><span class="mark">Stars Decoded</span></div>
    ${audio}
  </div>
  <script>
    window.FORMAT = ${JSON.stringify(fmt)};
    window.SCENES = ${JSON.stringify(SCENES)};
    window.KEYS = ${JSON.stringify(KEYS)};
    window.CAPTIONS = ${JSON.stringify(CAPTIONS)};
    window.WHEEL_TILT = ${tilt};
    window.DATA = ${JSON.stringify({ chart: data.chart, ascEvery2Min: data.ascEvery2Min, risingMinutes: data.risingMinutes, helio: data.helio, geo: data.geo, stars: data.stars, east: data.east })};
  </script>
  <script>${read(path.join(SRC, "ch1.js"))}</script>
  <script>${read(path.join(SRC, "ch1-dom.js"))}</script>
</body>
</html>
`;
}

const copyDir = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from)) if (!f.endsWith(".json")) fs.copyFileSync(path.join(from, f), path.join(to, f)); };
for (const fmt of [{ name: "16x9", w: 1920, h: 1080 }, { name: "9x16", w: 1080, h: 1920 }]) {
  const dir = path.join(ROOT, `ch1-${fmt.name}`);
  fs.mkdirSync(dir, { recursive: true });
  // Fonts and planet renders come straight from the web app, so the film can never drift from the product.
  const WEB = path.resolve(ROOT, "../../../web/src/assets");
  for (const [sub, from] of [["vendor", path.join(SH, "vendor")], ["voice", path.join(SH, "voice")], ["fonts", path.join(WEB, "fonts")], ["planets", path.join(WEB, "planets")]]) copyDir(from, path.join(dir, "assets", sub));
  fs.writeFileSync(path.join(dir, "index.html"), page(fmt));
  fs.writeFileSync(path.join(dir, "hyperframes.json"), read(path.join(SH, "hyperframes.json")));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: `reading-the-sky-ch1-${fmt.name}`, private: true, type: "module", devDependencies: { hyperframes: "0.8.96" } }, null, 2) + "\n");
}
console.log(JSON.stringify({ total, SCENES, KEYS }, null, 1));

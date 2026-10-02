// Turns rendered slides into use_figma scripts: live text layers in the product's fonts, the starfield and the
// mark as vectors, the wheel as a locked vector group (a computed visual is never edited by hand, rule 14).
//   node figma.mjs <out>/<post-id> [--formats 3x4] [--slides 1,2] [--rev 1]
// Writes <post-dir>/figma/NN.js, the use_figma calls in the order they run, each under the 50,000-character limit
// and holding as many slides as fit; a wheel too big to share a call gets one of its own after the frames. Also
// planets.json: each planet picture's placeholder and the file to upload into it with upload_assets.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { chrome } from "./render.mjs";

const KIT = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(KIT, "../../../..");
const SIZES = { "3x4": [1080, 1440], "4x5": [1080, 1350], "9x16": [1080, 1920] };
const LIMIT = 50000;

async function browser() {
  const { chromium } = createRequire(path.join(REPO, "e2e/package.json"))("@playwright/test");
  return chromium.launch({ executablePath: chrome(), args: ["--allow-file-access-from-files"] });
}

// Runs in the slide's page. Everything Figma needs is measured from the browser's own layout, so the frame
// matches the PNG: text boxes, line heights, colours, rules, and every SVG with its styles written inline.
function measure() {
  const slide = document.querySelector(".slide"), S = slide.getBoundingClientRect();
  const rel = (r) => ({ x: r.left - S.left, y: r.top - S.top, w: r.width, h: r.height });
  const inner = slide.querySelector(".inner");
  const inSvg = (n) => !!(n.closest && n.closest("svg"));
  const hasText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const all = [...inner.querySelectorAll("*")].filter((el) => !inSvg(el));
  const blocks = all.filter((el) => hasText(el) && !all.some((a) => a !== el && a.contains(el) && hasText(a)));
  const first = (f) => f.split(",")[0].trim().replace(/^["']|["']$/g, "");
  const texts = blocks.map((el) => {
    const cs = getComputedStyle(el), range = document.createRange();
    range.selectNodeContents(el);
    const lines = [...range.getClientRects()].filter((r) => r.width > 0);
    const left = Math.min(...lines.map((r) => r.left)), right = Math.max(...lines.map((r) => r.right));
    const box = el.getBoundingClientRect();
    const segs = [];
    const walk = (n) => {
      if (n.nodeType === 3) {
        const p = getComputedStyle(n.parentElement);
        segs.push({ t: n.textContent, family: first(p.fontFamily), weight: Number(p.fontWeight), italic: p.fontStyle === "italic", color: p.color });
      } else if (!inSvg(n)) n.childNodes.forEach(walk);
    };
    el.childNodes.forEach(walk);
    // Whitespace collapses as the browser drew it; the block's own leading and trailing space goes.
    const out = segs.map((s) => ({ ...s, t: s.t.replace(/\s+/g, " ") }));
    if (out.length) {
      out[0].t = out[0].t.trimStart();
      out[out.length - 1].t = out[out.length - 1].t.trimEnd();
    }
    const role = (el.className && String(el.className).split(" ")[0]) || el.tagName.toLowerCase();
    return {
      role, x: left - S.left, y: box.top - S.top + parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth),
      w: right - left, size: parseFloat(cs.fontSize), lineHeight: parseFloat(cs.lineHeight),
      letterSpacing: parseFloat(cs.letterSpacing) || 0, upper: cs.textTransform === "uppercase", align: cs.textAlign,
      segs: out.filter((s) => s.t.length),
    };
  });
  const rules = [];
  for (const el of all) {
    const cs = getComputedStyle(el), r = rel(el.getBoundingClientRect());
    for (const side of ["Top", "Bottom"]) {
      const w = parseFloat(cs[`border${side}Width`]);
      if (w > 0 && cs[`border${side}Style`] !== "none") rules.push({ x: r.x, y: side === "Top" ? r.y : r.y + r.h - w, w: r.w, h: w, color: cs[`border${side}Color`] });
    }
  }
  // SVG with every presentation property resolved, so Figma's importer never meets a CSS variable or a class.
  const PROPS = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "opacity", "fill-opacity", "stroke-opacity", "stop-color", "stop-opacity", "font-family", "font-size", "font-weight", "letter-spacing"];
  const INHERITED = new Set(["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "fill-opacity", "stroke-opacity", "font-family", "font-size", "font-weight", "letter-spacing"]);
  const DEFAULTS = { opacity: "1", "stop-color": "rgb(0, 0, 0)", "stop-opacity": "1", fill: "rgb(0, 0, 0)", stroke: "none", "stroke-width": "1px", "stroke-dasharray": "none", "stroke-linecap": "butt", "fill-opacity": "1", "stroke-opacity": "1", "letter-spacing": "normal" };
  const SHAPES = new Set(["path", "line", "circle", "rect", "ellipse", "polyline", "polygon"]);
  const planets = [];
  function flatten(svg, rotate = 0) {
    const copy = svg.cloneNode(true);
    const src = [svg, ...svg.querySelectorAll("*")], dst = [copy, ...copy.querySelectorAll("*")];
    src.forEach((s, i) => {
      const d = dst[i], cs = getComputedStyle(s);
      if (s.tagName === "image") {
        const href = s.getAttribute("href") || "", name = href.split("/").pop().replace(/\.\w+$/, "");
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        for (const a of ["x", "y", "width", "height"]) rect.setAttribute(a, s.getAttribute(a));
        rect.setAttribute("id", `planet-${name}-${planets.length}`);
        rect.setAttribute("fill", "#11161F");
        planets.push({ id: rect.id, href, w: Number(s.getAttribute("width")) });
        d.replaceWith(rect);
        return;
      }
      // Shapes that draw nothing (the arcs labels were set on) go; Figma would import them as empty layers.
      if (SHAPES.has(s.tagName) && cs.fill === "none" && cs.stroke === "none") { d.remove(); return; }
      // Only what differs from the parent (inherited) or from SVG's default, to stay inside one call.
      const parent = s === svg ? null : getComputedStyle(s.parentElement);
      for (const p of PROPS) d.removeAttribute(p);
      for (const p of PROPS) {
        const v = cs.getPropertyValue(p);
        if (!v) continue;
        if (INHERITED.has(p) ? parent && parent.getPropertyValue(p) === v : DEFAULTS[p] === v) continue;
        if (s === svg && DEFAULTS[p] === v) continue;
        d.setAttribute(p, p === "font-family" ? first(v) : v.replace(/px$/, "").replace(/rgb\((\d+), (\d+), (\d+)\)/, (_, r, g, b) => "#" + [r, g, b].map((x) => Number(x).toString(16).padStart(2, "0")).join("")));
      }
      for (const a of ["x", "y", "cx", "cy", "r", "x1", "y1", "x2", "y2", "width", "height"]) {
        const v = d.getAttribute(a);
        if (v && /^-?\d+\.\d{2,}$/.test(v)) d.setAttribute(a, Number(v).toFixed(1));
      }
      if (d.getAttribute("d")) d.setAttribute("d", d.getAttribute("d").replace(/-?\d+\.\d{2,}/g, (x) => Number(x).toFixed(1)));
      d.removeAttribute("class");
      d.removeAttribute("style");
    });
    // Labels set on a path become one positioned glyph each, so Figma's importer never has to follow a textPath.
    copy.querySelectorAll("text").forEach((t) => {
      const orig = src[dst.indexOf(t)];
      if (!orig.querySelector("textPath")) return;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      for (const p of PROPS) if (t.getAttribute(p)) g.setAttribute(p, t.getAttribute(p));
      const n = orig.getNumberOfChars(), str = orig.textContent;
      for (let c = 0; c < n; c++) {
        if (!str[c].trim()) continue;
        const pt = orig.getStartPositionOfChar(c), rot = orig.getRotationOfChar(c);
        const ch = document.createElementNS("http://www.w3.org/2000/svg", "text");
        const x = pt.x.toFixed(1), y = pt.y.toFixed(1);
        ch.setAttribute("x", x);
        ch.setAttribute("y", y);
        ch.setAttribute("transform", `rotate(${rot.toFixed(1)} ${x} ${y})`);
        ch.textContent = str[c];
        g.appendChild(ch);
      }
      t.replaceWith(g);
    });
    copy.removeAttribute("width");
    copy.removeAttribute("height");
    if (rotate) {
      const vb = (copy.getAttribute("viewBox") || "0 0 600 600").split(/\s+/).map(Number);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `rotate(${rotate} ${vb[0] + vb[2] / 2} ${vb[1] + vb[3] / 2})`);
      while (copy.firstChild) g.appendChild(copy.firstChild);
      copy.appendChild(g);
    }
    return copy.outerHTML.replace(/ (data-[\w-]+|role|tabindex|aria-[\w-]+|focusable)="[^"]*"/g, "");
  }
  const svgs = [];
  for (const svg of inner.querySelectorAll("svg")) {
    if (svg.parentElement.closest("svg")) continue;
    const wheel = svg.closest(".wheelbox");
    if (wheel && svgs.some((s) => s.kind === "wheel")) continue;
    const box = rel((wheel ?? svg).getBoundingClientRect());
    const turn = wheel ? Number((wheel.querySelector(".wheel")?.style.transform.match(/rotate\(([-\d.]+)deg\)/) || [])[1] || 0) : 0;
    const host = wheel ? wheel.querySelector("svg") : svg;
    const r = rel(host.getBoundingClientRect());
    svgs.push({ kind: wheel ? "wheel" : svg.closest(".sig") ? "mark" : "visual", ...(wheel ? box : r), markup: flatten(host, turn) });
  }
  return { texts, rules, svgs, planets };
}

const rgb = (s) => {
  const m = s.match(/[\d.]+/g).map(Number);
  const c = (v) => Math.round((v / 255) * 1e4) / 1e4;
  return { color: { r: c(m[0]), g: c(m[1]), b: c(m[2]) }, opacity: m.length > 3 ? m[3] : 1 };
};

// The Figma side, written into each script. Fonts are checked against what Figma has; a missing style falls
// back to the family's Regular and is reported, never silently swapped for another family.
const FIGMA_LIB = String.raw`
const STYLE = { 400: "Regular", 500: "Medium", 600: "Semi Bold", 700: "Bold" };
const avail = await figma.listAvailableFontsAsync();
const have = new Set(avail.map((f) => f.fontName.family + "|" + f.fontName.style));
const fallbacks = [];
async function font(family, weight, italic) {
  let style = STYLE[weight] || "Regular";
  if (italic) style = style === "Regular" ? "Italic" : style + " Italic";
  let fn = { family, style };
  if (!have.has(family + "|" + style) && have.has(family + "|" + style.replace(" ", ""))) style = style.replace(" ", "");
  fn = { family, style };
  if (!have.has(family + "|" + style)) { fallbacks.push(family + " " + style); fn = have.has(family + "|Regular") ? { family, style: "Regular" } : { family: "Inter", style: "Regular" }; }
  await figma.loadFontAsync(fn);
  return fn;
}
async function page(name) {
  let p = figma.root.children.find((x) => x.name === name);
  if (!p) {
    const first = figma.root.children[0];
    if (first.name === "Page 1" && first.children.length === 0) { first.name = name; p = first; }
    else { p = figma.createPage(); p.name = name; }
  }
  await figma.setCurrentPageAsync(p);
  return p;
}
function section(pg, name, y) {
  let s = pg.children.find((n) => n.type === "SECTION" && n.name === name);
  if (!s) { s = figma.createSection(); s.name = name; pg.appendChild(s); s.x = 0; s.y = y; }
  return s;
}
`;

// One frame from one spec. The specs are pure data, so a call carries this once and as many slides as fit.
const FIGMA_SLIDE = String.raw`
async function slide(sp) {
  const pg = await page("Posts");
  const sec = section(pg, sp.label, 0);
  const old = sec.children.find((x) => x.name === sp.name);
  if (old) old.remove();
  const frame = figma.createFrame();
  frame.name = sp.name;
  frame.resize(sp.w, sp.h);
  frame.clipsContent = true;
  // The slide's own background: the void, and the indigo glow at 12% -6% (slide.css).
  frame.fills = [
    { type: "SOLID", color: { r: 6 / 255, g: 8 / 255, b: 12 / 255 } },
    { type: "GRADIENT_RADIAL", gradientTransform: [[sp.w / 2200, 0, 0.5 - 0.12 * sp.w / 2200], [0, sp.h / 1640, 0.5 + 0.06 * sp.h / 1640]],
      gradientStops: [{ position: 0, color: { r: 92 / 255, g: 107 / 255, b: 192 / 255, a: 0.17 } }, { position: 0.62, color: { r: 92 / 255, g: 107 / 255, b: 192 / 255, a: 0 } }] },
  ];
  sec.appendChild(frame);
  frame.x = 80 + sp.col * (sp.w + 80);
  frame.y = 120 + sp.row * 2040;
  // The same seeded starfield as render.mjs, so the frame and the PNG share a sky.
  let a = sp.seed >>> 0;
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let dots = "";
  for (let i = 0, k = Math.round((sp.w * sp.h) / 7200); i < k; i++) {
    const r = rnd() < 0.93 ? 0.5 + rnd() * 0.9 : 1.4 + rnd() * 0.9, o = r > 1.3 ? 0.55 + rnd() * 0.3 : 0.14 + rnd() * 0.36;
    dots += '<circle cx="' + (rnd() * sp.w).toFixed(1) + '" cy="' + (rnd() * sp.h).toFixed(1) + '" r="' + r.toFixed(2) + '" fill="#E8EBF2" opacity="' + o.toFixed(2) + '"/>';
  }
  const stars = figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="' + sp.w + '" height="' + sp.h + '" viewBox="0 0 ' + sp.w + " " + sp.h + '">' + dots + "</svg>");
  stars.name = "Stars";
  frame.appendChild(stars); stars.x = 0; stars.y = 0;
  for (const r of sp.rules) {
    const rect = figma.createRectangle();
    rect.name = "Rule"; rect.resize(r.w, Math.max(1, r.h));
    rect.fills = [{ type: "SOLID", color: r.color, opacity: r.opacity }];
    frame.appendChild(rect); rect.x = r.x; rect.y = r.y;
  }
  for (const v of sp.svgs) visual(frame, v, frame.children.length);
  for (const t of sp.texts) {
    const node = figma.createText();
    const fonts = [];
    for (const s of t.segs) fonts.push(await font(s.family, s.weight, s.italic));
    node.fontName = fonts[0];
    node.characters = t.segs.map((s) => s.t).join("");
    let at = 0;
    t.segs.forEach((s, i) => {
      const end = at + s.t.length;
      node.setRangeFontName(at, end, fonts[i]);
      node.setRangeFills(at, end, [{ type: "SOLID", color: s.color, opacity: s.opacity }]);
      at = end;
    });
    node.fontSize = t.size;
    node.lineHeight = { unit: "PIXELS", value: t.lineHeight };
    node.letterSpacing = { unit: "PIXELS", value: t.letterSpacing };
    if (t.upper) node.textCase = "UPPER";
    if (t.align === "center") node.textAlignHorizontal = "CENTER";
    node.name = t.role;
    frame.appendChild(node);
    node.resize(Math.ceil(t.w) + 8, node.height);
    node.textAutoResize = "HEIGHT";
    node.x = t.x; node.y = t.y;
  }
  // A section does not grow with its frames; fit it around them.
  const right = Math.max(...sec.children.map((c) => c.x + c.width)), bottom = Math.max(...sec.children.map((c) => c.y + c.height));
  sec.resizeWithoutConstraints(Math.max(sec.width, right + 80), Math.max(sec.height, bottom + 80));
  return { name: sp.name, frame: frame.id, section: sec.id };
}
function visual(frame, v, at) {
  const node = figma.createNodeFromSvg(v.markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'));
  node.name = v.kind === "wheel" ? "Wheel · computed, do not edit" : v.kind === "mark" ? "Mark" : "Visual · computed";
  frame.insertChild(Math.min(at, frame.children.length), node);
  node.rescale(v.w / node.width); node.x = v.x; node.y = v.y;
  if (v.kind !== "mark") node.locked = true;
  return node.id;
}
`;

function spec({ post, rev, f, n, slide, m, seed, w, h, label, col, row }) {
  return {
    name: `${post} · ${n} ${slide.type} · ${f} · rev ${rev}`, label, w, h, seed, col, row, svgs: m.svgs,
    texts: m.texts.map((t) => ({ ...t, segs: t.segs.map((s) => ({ ...s, ...rgb(s.color) })) })),
    rules: m.rules.map((r) => ({ ...r, ...rgb(r.color) })),
  };
}

const slidesCall = (specs) => `// ${specs.map((sp) => sp.name).join("\n// ")}
// Generated by kit/figma.mjs from the rendered slides; edit the post JSON, not this file.
${FIGMA_LIB}${FIGMA_SLIDE}
const made = [];
for (const sp of ${JSON.stringify(specs)}) made.push(await slide(sp));
return { made, fallbacks };
`;

// A visual too big to share a call goes in one of its own, slotted under the frame's text like the inline ones.
const visualCall = (name, v, at) => `// ${v.kind} for ${name}. Generated by kit/figma.mjs; runs after the call that made the frame.
${FIGMA_LIB}${FIGMA_SLIDE}
const pg = await page("Posts");
const frame = pg.findOne((x) => x.type === "FRAME" && x.name === ${JSON.stringify(name)});
return { frame: frame.id, node: visual(frame, ${JSON.stringify(v)}, ${at}) };
`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.log("usage: node figma.mjs <out>/<post-id> [--formats 3x4] [--slides 1,2] [--rev 1]"); process.exit(1); }
  const opt = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const post = JSON.parse(fs.readFileSync(path.join(dir, "post.json"), "utf8"));
  const rev = Number(opt("--rev", post.meta?.rev ?? 1));
  const formats = opt("--formats", "3x4,9x16").split(",");
  const pick = opt("--slides", "") ? opt("--slides").split(",").map(Number) : post.slides.map((_, i) => i + 1);
  const seed = [...post.id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const label = `${post.id} · ${post.meta?.hook ?? post.slides[0].title ?? ""}`.slice(0, 120);
  const b = await browser();
  const calls = [], visuals = [], planets = [];
  let batch = [];
  const flush = () => { if (batch.length) calls.push(slidesCall(batch)); batch = []; };
  try {
    formats.forEach((f) => { if (!SIZES[f]) throw new Error(`Unknown format ${f}`); });
    for (const [row, f] of formats.entries()) {
      const [w, h] = SIZES[f];
      const page = await b.newPage({ viewport: { width: w, height: h } });
      for (const i of pick) {
        const n = String(i).padStart(2, "0"), html = path.join(dir, f, `${n}.html`);
        if (!fs.existsSync(html)) throw new Error(`${html} is missing: run render.mjs with --formats ${f} first.`);
        await page.goto(`file://${html}`);
        await page.evaluate(() => document.fonts.ready);
        const m = await page.evaluate(measure);
        const sp = spec({ post: post.id, rev, f, n, slide: post.slides[i - 1], m, seed, w, h, label, col: i - 1, row });
        if (slidesCall([sp]).length > LIMIT) {
          const big = sp.svgs.filter((v) => v.kind !== "mark");
          sp.svgs = sp.svgs.filter((v) => v.kind === "mark");
          big.forEach((v, k) => visuals.push(visualCall(sp.name, v, 1 + sp.rules.length + k)));
        }
        if (batch.length && slidesCall([...batch, sp]).length > LIMIT) flush();
        batch.push(sp);
        // Planet pictures go up as files (upload_assets), never as bytes typed into a script.
        for (const p of m.planets) planets.push({ frame: sp.name, placeholder: p.id, file: decodeURI(p.href.replace("file://", "")) });
      }
      await page.close();
    }
    flush();
  } finally { await b.close(); }
  const out = path.join(dir, "figma");
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const all = [...calls, ...visuals];
  all.forEach((code, k) => {
    if (code.length > LIMIT) throw new Error(`Call ${k + 1} is ${code.length} characters, over use_figma's ${LIMIT}.`);
    fs.writeFileSync(path.join(out, `${String(k + 1).padStart(2, "0")}.js`), code);
  });
  fs.writeFileSync(path.join(out, "planets.json"), JSON.stringify(planets, null, 1) + "\n");
  console.log(`${all.length} use_figma calls in ${out} (${calls.length} for frames, ${visuals.length} for visuals), ${planets.length} planet pictures to upload`);
}

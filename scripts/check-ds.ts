import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { withoutComments } from "./check-shipped.js";

// ADR-429, 435, 440, 442 (design-system Scope 5, 8): a keyless ratchet. Literals that belong to the design system
// are counted per file outside packages/design and web/src/ds against scripts/ds-baseline.json; a count may
// fall, never rise, and reaches zero at R21's close. The same run checks the role pairs' contrast and that
// tokens.ts and tokens.json equal tokens.css, and holds the chart to one set of drawings and six colours.
// Only .ts, .tsx, .css and .mjs are read (R17-08/18); anything inside the design system itself is never flagged.

export const METRICS = ["hex", "rgb", "textArb", "roundedArb", "colorUtil", "rawButton", "chartDraw"] as const;
export type Metric = (typeof METRICS)[number];
export type Counts = Partial<Record<Metric, number>>;
export interface Baseline {
  files: Record<string, Counts>;
}
export interface Drawings {
  files: { file: string; reason: string }[];
}

const READ = /\.(?:ts|tsx|css|mjs)$/;
const SKIPPED_DIRS = new Set(["node_modules", "dist", "dist-ssr", "build", ".git", "generated", "fixtures", "__fixtures__", "walk", "test.critical"]);
const CHART_DIR = "web/src/ds/organisms/chart/";
const CHART_GEOMETRY = "web/src/components/chart/wheel-geometry.ts";
// ADR-442: the only colours a chart may add to the neutral ones.
export const CHART_COLOURS = ["line-easy", "line-tense", "back", "rose", "teal", "brass"] as const;
const NEUTRALS = new Set([
  "void", "ground", "surface", "surface-glass", "raised", "line", "line-soft", "line-strong", "control-edge",
  "paper", "paper-dim", "muted", "label-dim",
]);

const isTest = (name: string): boolean => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(name) || /^test(?:[A-Z._-]|$)/.test(name) || name.endsWith(".d.ts");
const inDesign = (file: string): boolean => file.startsWith("packages/design/") || file.startsWith("web/src/ds/");

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) yield* walk(full);
    } else if (READ.test(entry.name) && !isTest(entry.name)) {
      yield full;
    }
  }
}

export function scannedFiles(root: string): string[] {
  const roots = [join(root, "api", "src"), join(root, "web", "src")];
  const packages = join(root, "packages");
  if (existsSync(packages)) for (const p of readdirSync(packages)) roots.push(join(packages, p, "src"));
  const out = roots.flatMap((r) => [...walk(r)]);
  for (const name of readdirSync(join(root, "scripts"), { withFileTypes: true })) {
    if (name.isFile() && /\.mjs$/.test(name.name)) out.push(join(root, "scripts", name.name));
  }
  const middleware = join(root, "middleware.ts");
  if (existsSync(middleware)) out.push(middleware);
  return out;
}

const rel = (root: string, abs: string): string => relative(root, abs).split(sep).join("/");

function stripComments(text: string, file: string): string {
  if (file.endsWith(".css")) return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  return withoutComments(text, file);
}

const HEX = /(?<![\w&#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g;
const RGB = /\brgba?\(\s*\d/g;
const TEXT_ARB = /(?<![\w-])text-\[[^\]\s]+\]/g;
const ROUNDED_ARB = /(?<![\w-])rounded(?:-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?-\[[^\]\s]+\]/g;
const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOUR_UTIL = new RegExp(
  `(?<![\\w-])(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|decoration|shadow|accent|caret)-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?![\\w-])`,
  "g",
);
const CHART_CALL = /\b(?:wheelRadii|pointAt)\s*\(|\b(?:PLANET|SIGN)_GLYPHS\b/g;

function matches(code: string, re: RegExp, skip?: (code: string, index: number) => boolean): number[] {
  const hits: number[] = [];
  for (const m of code.matchAll(re)) if (!skip?.(code, m.index ?? 0)) hits.push(m.index ?? 0);
  return hits;
}

// href="#id" and url(#id) are anchors, not colours.
const isAnchor = (code: string, i: number): boolean => /(?:url\(|href=\{?["'`])$/.test(code.slice(Math.max(0, i - 8), i));

function rawButtons(code: string, file: string): number {
  if (!file.endsWith(".tsx")) return 0;
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let n = 0;
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === "button") {
      const styled = node.attributes.properties.some((p) => ts.isJsxAttribute(p) && /^(?:className|style)$/.test(p.name.getText(source)));
      if (styled) n++;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return n;
}

function chartDraws(code: string, file: string): number {
  const onImportLine = (c: string, i: number): boolean => /^\s*import\b/.test(c.slice(c.lastIndexOf("\n", i) + 1, i));
  const calls = matches(code, CHART_CALL, onImportLine);
  // A ring is a circle in a file that already builds on the wheel's radii or glyph tables.
  const builds = /wheel-geometry|\b(?:PLANET|SIGN)_GLYPHS\b|\bwheelRadii\b/.test(code);
  const rings = builds && /\.(?:tsx)$/.test(file) ? matches(code, /<circle\b/g).length : 0;
  return calls.length + rings;
}

export function countFile(text: string, file: string): Counts {
  const code = stripComments(text, file);
  const counts: Counts = {
    hex: matches(code, HEX, isAnchor).length,
    rgb: matches(code, RGB).length,
    textArb: matches(code, TEXT_ARB).length,
    roundedArb: matches(code, ROUNDED_ARB).length,
    colorUtil: matches(code, COLOUR_UTIL).length,
    rawButton: rawButtons(code, file),
    chartDraw: file === CHART_GEOMETRY ? 0 : chartDraws(code, file),
  };
  return counts;
}

export function countAll(root: string, drawings: Drawings): Record<string, Counts> {
  const allowed = new Set(drawings.files.map((d) => d.file));
  const out: Record<string, Counts> = {};
  for (const abs of scannedFiles(root)) {
    const file = rel(root, abs);
    if (inDesign(file)) continue;
    const counts = countFile(readFileSync(abs, "utf8"), file);
    if (allowed.has(file)) counts.chartDraw = 0;
    const kept: Counts = {};
    for (const m of METRICS) if (counts[m]) kept[m] = counts[m];
    if (Object.keys(kept).length > 0) out[file] = kept;
  }
  return out;
}

export interface Rise {
  file: string;
  metric: Metric;
  was: number;
  now: number;
}

export function rises(current: Record<string, Counts>, baseline: Baseline): Rise[] {
  const out: Rise[] = [];
  for (const [file, counts] of Object.entries(current)) {
    for (const m of METRICS) {
      const now = counts[m] ?? 0;
      const was = baseline.files[file]?.[m] ?? 0;
      if (now > was) out.push({ file, metric: m, was, now });
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.metric.localeCompare(b.metric));
}

/** Never raises: a file keeps min(was, now) per metric, a new file or metric is not added once a baseline exists. */
export function lowered(current: Record<string, Counts>, baseline: Baseline | null): Baseline {
  const files: Record<string, Counts> = {};
  const source = baseline ? Object.keys(baseline.files) : Object.keys(current);
  for (const file of source.sort()) {
    const next: Counts = {};
    for (const m of METRICS) {
      const now = current[file]?.[m] ?? 0;
      const was = baseline ? (baseline.files[file]?.[m] ?? 0) : now;
      const v = Math.min(now, was);
      if (v > 0) next[m] = v;
    }
    if (Object.keys(next).length > 0) files[file] = next;
  }
  return { files };
}

// ---- colours ----

type Rgb = [number, number, number];

export function parseColour(value: string): Rgb | null {
  const v = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    if (h.length === 8 && parseInt(h.slice(6), 16) !== 255) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function readCssColours(css: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of css.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/gi)) map.set(m[1], m[2].trim());
  return map;
}

/** The token whose every channel is within 6 of the literal (ADR-440), the exact match first. */
export function suggestToken(literal: string, colours: Map<string, string>): string | null {
  const want = parseColour(literal);
  if (!want) return null;
  let best: { name: string; d: number } | null = null;
  for (const [name, value] of colours) {
    const have = parseColour(value);
    if (!have) continue;
    const d = Math.max(...want.map((c, i) => Math.abs(c - have[i])));
    if (d <= 6 && (!best || d < best.d)) best = { name, d };
  }
  return best ? best.name : null;
}

interface RolePair {
  fg: string;
  bg: string;
  kind: "text" | "edge";
}

const normValue = (v: string): string => {
  const c = parseColour(v);
  return c ? `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}` : v.replace(/\s+/g, "").toLowerCase();
};

const kebab = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Every string leaf of a token tree by its last key (or `name` when an entry carries one), so the two mirrors need no one shape. */
export function leaves(tree: unknown, out: Map<string, string[]> = new Map(), key = ""): Map<string, string[]> {
  const put = (k: string, v: string): void => {
    const name = kebab(k);
    out.set(name, [...(out.get(name) ?? []), v]);
  };
  if (typeof tree === "string") {
    if (key) put(key, tree);
  } else if (Array.isArray(tree)) {
    for (const item of tree) {
      if (item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string") {
        leaves((item as { value?: unknown }).value, out, (item as { name: string }).name);
      } else {
        leaves(item, out, key);
      }
    }
  } else if (tree && typeof tree === "object") {
    for (const [k, v] of Object.entries(tree)) {
      if (typeof v === "string" || (v && typeof v === "object")) leaves(v, out, typeof v === "object" && /^(?:dark|value|default)$/.test(k) ? key : k);
    }
  }
  return out;
}

export function mirrorProblems(label: string, mirror: unknown, css: Map<string, string>): string[] {
  const found = leaves(mirror);
  const out: string[] = [];
  for (const [name, value] of css) {
    const have = found.get(name);
    if (!have) out.push(`${label}: no entry for --color-${name} (${value})`);
    else if (!have.some((v) => normValue(v) === normValue(value))) out.push(`${label}: ${name} is ${have.join(" | ")}, tokens.css has ${value}`);
  }
  return out;
}

function resolveColour(ref: string, css: Map<string, string>, seen = 0): Rgb | null {
  const direct = parseColour(ref);
  if (direct) return direct;
  const v = css.get(ref.replace(/^--color-/, ""));
  return v && seen < 4 ? resolveColour(v, css, seen + 1) : null;
}

export function pairProblems(pairs: readonly RolePair[], css: Map<string, string>): string[] {
  const out: string[] = [];
  for (const p of pairs) {
    const fg = resolveColour(p.fg, css);
    const bg = resolveColour(p.bg, css);
    if (!fg || !bg) continue;
    const need = p.kind === "text" ? 4.5 : 3;
    const got = contrast(fg, bg);
    if (got < need) {
      const hex = (c: Rgb): string => `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
      out.push(`contrast: ${p.fg} ${hex(fg)} on ${p.bg} ${hex(bg)} is ${got.toFixed(2)}:1, ${p.kind === "edge" ? "an" : "a"} ${p.kind} pair needs ${need}:1`);
    }
  }
  return out;
}

// ---- the chart rule ----

function chartColourProblems(root: string, css: Map<string, string>): string[] {
  const out: string[] = [];
  const dir = join(root, CHART_DIR);
  const names = [...css.keys()];
  const allowed = new Set<string>([...CHART_COLOURS, ...NEUTRALS]);
  for (const abs of walk(dir)) {
    const file = rel(root, abs);
    const code = stripComments(readFileSync(abs, "utf8"), file);
    for (const re of [HEX, RGB]) {
      for (const i of matches(code, re, isAnchor)) out.push(`${file}:${lineOf(code, i)}: chart: a colour literal; read tokens.ts`);
    }
    if (names.length === 0) continue;
    const refs = /var\(--color-([a-z0-9-]+)\)|\b(?:fill|stroke|bg|text|border)-([a-z][a-z0-9-]*)\b|\btokens\.(?:color\.|colors\.)?([a-zA-Z0-9]+)\b/g;
    for (const m of code.matchAll(refs)) {
      const name = kebab(m[1] ?? m[2] ?? m[3]);
      if (css.has(name) && !allowed.has(name)) out.push(`${file}:${lineOf(code, m.index ?? 0)}: chart: colour ${name} is not one of ${CHART_COLOURS.join(", ")}`);
    }
  }
  return out;
}

const lineOf = (text: string, index: number): number => text.slice(0, index).split("\n").length;

// ---- the run ----

export interface Report {
  counts: Record<string, Counts>;
  rises: Rise[];
  problems: string[];
  notes: string[];
  suggestions: string[];
}

async function loadModule<T>(path: string): Promise<T> {
  return (await import(pathToFileURL(path).href)) as T;
}

export async function checkDs(root: string, baseline: Baseline, drawings: Drawings, suggest = false): Promise<Report> {
  const counts = countAll(root, drawings);
  const problems: string[] = [];
  const notes: string[] = [];
  const suggestions: string[] = [];
  const designDir = join(root, "packages", "design", "src");
  const cssPath = join(designDir, "tokens.css");
  let css = new Map<string, string>();
  if (!existsSync(cssPath)) {
    notes.push("packages/design/src/tokens.css is missing: contrast, mirror and chart-colour checks skipped");
  } else {
    css = readCssColours(readFileSync(cssPath, "utf8"));
    const tsPath = join(designDir, "tokens.ts");
    const jsonPath = join(designDir, "tokens.json");
    if (existsSync(tsPath)) {
      const mod = await loadModule<{ tokens?: unknown; ROLE_PAIRS?: RolePair[] }>(tsPath);
      problems.push(...mirrorProblems("tokens.ts", mod.tokens, css));
      problems.push(...pairProblems(mod.ROLE_PAIRS ?? [], css));
      if (!mod.ROLE_PAIRS) problems.push("tokens.ts exports no ROLE_PAIRS");
    } else {
      notes.push("tokens.ts is missing: mirror and contrast checks skipped");
    }
    if (existsSync(jsonPath)) problems.push(...mirrorProblems("tokens.json", JSON.parse(readFileSync(jsonPath, "utf8")), css));
    else notes.push("tokens.json is missing: mirror check skipped");
    problems.push(...chartColourProblems(root, css));
  }
  if (suggest) {
    for (const abs of scannedFiles(root)) {
      const file = rel(root, abs);
      if (inDesign(file)) continue;
      const code = stripComments(readFileSync(abs, "utf8"), file);
      for (const i of matches(code, HEX, isAnchor)) {
        const literal = /^#[0-9a-fA-F]+/.exec(code.slice(i))?.[0] ?? "";
        const token = suggestToken(literal, css);
        if (token) suggestions.push(`${file}:${lineOf(code, i)}: ${literal} -> ${token}`);
      }
    }
  }
  return { counts, rises: rises(counts, baseline), problems, notes, suggestions };
}

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const positional = args.filter((a) => !a.startsWith("--"));
  const root = positional[0] ? resolve(positional[0]) : resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (!statSync(root).isDirectory()) throw new Error(`${root} is not a directory`);
  const baselinePath = flag("baseline") ?? join(root, "scripts", "ds-baseline.json");
  const hasBaseline = existsSync(baselinePath);
  const baseline = readJson<Baseline>(baselinePath, { files: {} });
  const drawings = readJson<Drawings>(join(root, "scripts", "ds-drawings.json"), { files: [] });
  const report = await checkDs(root, baseline, drawings, args.includes("--suggest"));

  for (const n of report.notes) console.warn(`note: ${n}`);
  for (const s of report.suggestions) console.info(s);
  if (args.includes("--write")) {
    const next = lowered(report.counts, hasBaseline ? baseline : null);
    report.rises = rises(report.counts, next);
    writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
    const total = Object.values(next.files).reduce((n, c) => n + METRICS.reduce((s, m) => s + (c[m] ?? 0), 0), 0);
    console.info(`check-ds: baseline written, ${Object.keys(next.files).length} files, ${total} literals`);
  }

  const failures = [...report.problems, ...report.rises.map((r) => `${r.file}: ${r.metric} rose from ${r.was} to ${r.now}`)];
  if (failures.length === 0) {
    console.info("check-ds: clean");
    return;
  }
  for (const f of failures) console.error(f);
  console.error(`check-ds: ${failures.length} finding${failures.length === 1 ? "" : "s"}`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();

/**
 * Report lab — generate a natal report from a committed fixture and measure it,
 * so a prompt change can be judged before it reaches a paying customer.
 *
 *   pnpm report:lab --chart marie-curie
 *   pnpm report:lab --all --defaults-only --baseline
 *   pnpm report:lab --compare baseline latest
 *   pnpm report:lab --render                  # read the newest run, no API call
 *   pnpm report:lab --render marie-curie.staging
 *   pnpm report:lab --remote https://starsdecoded-staging.vercel.app --all
 *   pnpm report:lab --render --all --label staging     (rewrite .md/.html from stored .json)
 *
 * Requires DATABASE_URL (the meaning library and prompt overrides both live in
 * Postgres) and OPENAI_API_KEY. Each run costs one full report's worth of AI
 * calls per chart.
 *
 * --remote needs neither: it generates each report through a deployed API as
 * an anonymous visitor would and measures what comes back, so the measurement
 * covers the engine, prompts and overrides that deployment actually runs.
 * The Report lab workflow runs it against staging.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CHARTS_DIR = join(ROOT, "fixtures", "charts");
const REPORTS_DIR = join(ROOT, "fixtures", "reports");

interface ChartFixture {
  name: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  note?: string;
}

/** Word targets come from the section registry, so prompt, schema and check cannot disagree. */
import { ALL_SECTIONS, WORD_TARGETS as REGISTRY_TARGETS, SECTION_IDS, hasClaims, sectionById, validateClaims } from "../../api/src/prompts/index.js";
import type { NatalChartData } from "../../api/src/lib/chartCalculation.js";
/** Cost comes from the engine's own table, so the lab cannot disagree with the bill. */
import { costUsd, type ReportUsage, type SectionUsage } from "../../api/src/lib/usage.js";
const WORD_TARGETS: Record<string, [number, number]> = { ...REGISTRY_TARGETS };
/** The product target (Owner, 2026-09-18). The registry's bands sum inside it. */
const REPORT_TOTAL: [number, number] = [3500, 5500];

/**
 * Style-contract rule 1: the report must never explain its own method. These
 * are the phrasings that review rejected, plus the obvious neighbours. Matching
 * is a warning rather than a failure — the lab reports, the human decides.
 */
const METHOD_TALK = [
  "in traditional practice",
  "in traditional astrology",
  "traditionally speaking",
  "by day mars",
  "by night saturn",
  "out of sect",
  "in sect",
  "contrary to sect",
  "is in detriment",
  "is in domicile",
  "in its own sign",
  "about as strong as a planet gets",
  "which means astrologically",
  "astrologers say",
  "this placement means",
  "the first honest thing",
  "what this means astrologically",
  "in your chart, ",
  "this section",
  "as we will see",
  "depending on the tradition",
  "some astrologers",
  "above the horizon",
  "below the horizon",
  "fun fact",
  "did you know",
  "interesting quirk",
];

/**
 * Style-contract rule 12: a why clause says what the action trains, and a
 * sentence that trains something has a verb in it. The list plus the common
 * inflections is deliberately generous, because a why wrongly flagged costs a
 * human a look and a why wrongly passed costs nothing but this check.
 */
const VERBS = new Set([
  "is", "are", "was", "were", "be", "been", "am", "has", "have", "had", "do", "does", "did",
  "can", "will", "would", "should", "must", "let", "go", "get", "keep", "make", "take", "give",
  "know", "see", "say", "tell", "ask", "want", "need", "find", "feel", "come", "put", "hold",
  "build", "run", "name", "notice", "choose", "leave", "move", "try", "turn", "train", "spend",
  "cost", "work", "stay", "stop", "start", "show", "read", "write", "meet", "set", "cut", "think",
]);

function hasVerb(clause: string): boolean {
  const tokens = clause.toLowerCase().match(/[a-z']+/g) ?? [];
  return tokens.some((t) => VERBS.has(t) || (t.length > 3 && /(?:s|ing|ed)$/.test(t)));
}

/** Every `why` a section carries, wherever it sits, with the path that found it. */
function whyClauses(value: unknown, path: string, out: Array<{ path: string; why: string }>): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => whyClauses(v, `${path}.${i}`, out));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === "claims") continue;
    if (k === "why" && typeof v === "string") out.push({ path, why: v });
    else whyClauses(v, path ? `${path}.${k}` : k, out);
  }
}

/** The house readings answer to their own shape: 40 to 70 words, ending on a behaviour check. */
function houseNotes(value: unknown): string[] {
  const readings = (value as { houses?: Array<{ house: number; reading: string }> } | undefined)?.houses;
  if (!Array.isArray(readings)) return [];
  const notes: string[] = [];
  if (readings.length !== 12) notes.push(`${readings.length} readings, not 12`);
  for (const r of readings) {
    const w = words(r.reading ?? "");
    if (w < 40 || w > 70) notes.push(`house ${r.house}: ${w} words`);
    if (!/Behaviour check:/.test(r.reading ?? "")) notes.push(`house ${r.house}: no behaviour check`);
  }
  return notes;
}

/** Style-contract rule 8: banned punctuation and formatting. */
const BANNED_CHARS: Array<[string, RegExp]> = [
  ["em dash", /—/],
  ["semicolon", /;/],
];

function words(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

/** Flatten any section value to the prose a reader actually sees. */
function proseOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(proseOf).join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k]) => k !== "claims")
      .map(([, v]) => proseOf(v))
      .join(" ");
  }
  return "";
}

/**
 * A section is "structured" when the model returned the object the prompt asked
 * for. A raw string means JSON parsing fell back — today that degrades silently
 * into the stored jsonb, which is exactly what PR 3's schemas eliminate.
 */
function isStructured(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

interface SectionRow {
  section: string;
  words: number;
  target: [number, number] | null;
  inRange: boolean | null;
  structured: boolean;
  methodTalk: string[];
  bannedChars: string[];
  /** Validated claims / total; problems when re-validation fails. */
  claims: { count: number; problems: string[] };
  /** A section the run has not written yet. Everything else on the row is empty. */
  missing: boolean;
  whyNotes: string[];
  houseNotes: string[];
}

function measure(interpretation: Record<string, unknown>, chart?: NatalChartData): SectionRow[] {
  return SECTION_IDS.map((section) => {
    const value = interpretation[section];
    const missing = value === undefined || value === null;
    const spec = sectionById(section);
    // A section whose schema has no claims is its own evidence, so an empty
    // claims list there is the contract, not a fault.
    const wantsClaims = spec ? hasClaims(spec) : true;
    const stored = (value as { claims?: Array<{ quote: string; evidence: Array<{ ref: unknown }> }> } | undefined)?.claims ?? [];
    const asModel = stored.map((c) => ({ quote: c.quote, evidence: c.evidence.map((e) => e.ref) }));
    const problems = chart && !missing ? validateClaims(value, asModel as never, chart) : [];
    if (wantsClaims && !missing && stored.length < 3) problems.push(`only ${stored.length} claims`);
    const whys: Array<{ path: string; why: string }> = [];
    whyClauses(value, "", whys);
    const prose = proseOf(value);
    const w = words(prose);
    const target = WORD_TARGETS[section] ?? null;
    const lower = prose.toLowerCase();
    return {
      section,
      words: w,
      target,
      inRange: target ? w >= target[0] && w <= target[1] : null,
      structured: isStructured(value),
      methodTalk: METHOD_TALK.filter((p) => lower.includes(p)),
      bannedChars: BANNED_CHARS.filter(([, re]) => re.test(prose)).map(([n]) => n),
      claims: { count: stored.length, problems },
      missing,
      whyNotes: whys.filter((w) => !hasVerb(w.why)).map((w) => `${w.path || "why"}: "${w.why}"`),
      houseNotes: houseNotes(value),
    };
  });
}

/** Head plus body to an aligned fixed-width table. */
function table(head: string[], body: string[][]): string {
  const widths = head.map((_, i) =>
    Math.max(head[i].length, ...body.map((r) => r[i].length)),
  );
  const line = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
  return [line(head), line(widths.map((w) => "-".repeat(w))), ...body.map(line)].join("\n");
}

const usd = (n: number | null): string => (n === null ? "-" : `$${n.toFixed(4)}`);
const secs = (ms: number): string => (ms / 1000).toFixed(1);

/**
 * Tokens, cost and time per call. `in` excludes cached; `reason` is already
 * inside `out` and is shown because it is the part no reader ever sees.
 */
function renderUsage(usage: ReportUsage): string {
  // Only worth a column when a run actually mixes models, which is what an A/B
  // against a cheaper section model looks like.
  const mixed = usage.model === "mixed";
  // Runs generated before per-section models carry none; they were single-model
  // by construction, so the report's own model is the right answer for them.
  const modelOf = (u: SectionUsage): string => u.model ?? usage.model;
  const row = (u: SectionUsage): string[] => [
    u.section.replace(/^natal:/, ""),
    ...(mixed ? [modelOf(u)] : []),
    String(u.attempts),
    u.inputTokens.toLocaleString("en-US"),
    u.cachedInputTokens.toLocaleString("en-US"),
    u.outputTokens.toLocaleString("en-US"),
    u.reasoningTokens.toLocaleString("en-US"),
    usd(costUsd(modelOf(u), { ...u })),
    secs(u.ms),
  ];
  const t = usage.totals;
  return table(
    ["call", ...(mixed ? ["model"] : []), "tries", "in", "cached", "out", "reason", "$", "s"],
    [
      ...usage.sections.map(row),
      ["TOTAL", ...(mixed ? [""] : []), String(t.attempts), t.inputTokens.toLocaleString("en-US"),
        t.cachedInputTokens.toLocaleString("en-US"), t.outputTokens.toLocaleString("en-US"),
        t.reasoningTokens.toLocaleString("en-US"), usd(usage.costUsd), secs(t.ms)],
    ],
  );
}

function renderTable(rows: SectionRow[]): string {
  const head = ["section", "words", "target", "ok", "struct", "claims", "flags"];
  const body = rows.map((r) => [
    r.section,
    String(r.words),
    r.target ? `${r.target[0]}-${r.target[1]}` : "-",
    r.missing ? "-" : r.inRange === null ? "-" : r.inRange ? "yes" : "NO",
    r.missing ? "-" : r.structured ? "yes" : "RAW",
    r.missing ? "-" : r.claims.problems.length ? `${r.claims.count} INVALID` : String(r.claims.count),
    [
      ...(r.missing ? ["not written"] : []),
      ...r.methodTalk.map((p) => `method:"${p}"`),
      ...r.bannedChars.map((c) => `char:${c}`),
      ...r.claims.problems.slice(0, 2).map((p) => `claim:${p}`),
      ...r.whyNotes.slice(0, 2).map((w) => `why without a verb ${w}`),
      ...r.houseNotes.slice(0, 3).map((h) => `house:${h}`),
    ].join(" ") || "-",
  ]);
  return table(head, body);
}

/** "growingEdge" reads as "Growing edge". */
function humanize(key: string): string {
  const s = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Stored JSON comes back from Postgres with its keys re-sorted, so the prose
 * is walked in the order the section schema declares, the order a reader
 * sees it. Zod objects expose `shape`, arrays `element`; anything else is
 * rendered as found.
 */
function keysInSchemaOrder(schema: unknown, value: Record<string, unknown>): string[] {
  const shape = (schema as { shape?: Record<string, unknown> } | undefined)?.shape;
  const declared = shape ? Object.keys(shape).filter((k) => k in value) : [];
  const rest = Object.keys(value).filter((k) => !declared.includes(k));
  return [...declared, ...rest];
}

function proseMarkdown(value: unknown, schema: unknown, depth: number, out: string[]): void {
  if (typeof value === "string") { out.push(value, ""); return; }
  if (Array.isArray(value)) {
    const el = (schema as { element?: unknown } | undefined)?.element;
    for (const item of value) {
      if (typeof item === "string") out.push(`- ${item}`);
      else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const keys = keysInSchemaOrder(el, o);
        out.push(`- ${keys.map((k, i) => (i === 0 ? `**${String(o[k])}**` : String(o[k]))).join(" ")}`);
      }
    }
    out.push("");
    return;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const shape = (schema as { shape?: Record<string, unknown> } | undefined)?.shape;
    for (const k of keysInSchemaOrder(schema, o)) {
      if (k === "claims") continue;
      const v = o[k];
      // Intro, title and bullet keys are structure, not headings a reader needs.
      if (typeof v === "string" && depth > 0 && ["intro", "text", "body"].includes(k)) { out.push(v, ""); continue; }
      if (typeof v === "string" && depth > 0 && ["title", "label", "name"].includes(k)) { out.push(`**${v}**`, ""); continue; }
      if (Array.isArray(v) && depth > 0 && ["bullets", "items"].includes(k)) { proseMarkdown(v, shape?.[k], depth + 1, out); continue; }
      out.push(`${"#".repeat(Math.min(3 + depth, 6))} ${humanize(k)}`, "");
      proseMarkdown(v, shape?.[k], depth + 1, out);
    }
  }
}

function renderMarkdown(
  fixture: ChartFixture,
  interpretation: Record<string, unknown>,
  rows: SectionRow[],
): string {
  const total = rows.reduce((n, r) => n + r.words, 0);
  const meta = interpretation.meta as { promptVersion?: string; model?: string; sect?: string; generatedAt?: string } | undefined;
  const out: string[] = [
    `# ${fixture.name}`,
    "",
    `Natal report from the report lab, ${meta?.generatedAt ?? new Date().toISOString()}. ` +
      `Prompt ${meta?.promptVersion ?? "?"} on ${meta?.model ?? "?"}, ${meta?.sect ?? "?"} chart, ${total} words.`,
    `Birth data: ${fixture.birthDate} ${fixture.birthTime}, ` +
      `${fixture.latitude}, ${fixture.longitude} (UTC${fixture.timezoneOffset >= 0 ? "+" : ""}${fixture.timezoneOffset}).`,
    "",
    "<details><summary>Measurement</summary>",
    "",
    "```",
    renderTable(rows),
    "```",
    "",
    "</details>",
    "",
  ];
  for (const section of SECTION_IDS) {
    const value = interpretation[section];
    if (value === undefined) continue;
    const spec = ALL_SECTIONS.find((s) => s.key === `natal:${section}`);
    out.push("---", "", `## ${spec?.label ?? humanize(section)}`, "");
    proseMarkdown(value, spec?.schema, 0, out);
    const claims = (value as { claims?: Array<{ quote: string; evidence: Array<{ label: string }> }> } | null)?.claims ?? [];
    if (claims.length) {
      out.push("<details><summary>Claims and evidence</summary>", "");
      for (const c of claims) out.push(`- "${c.quote}"`, ...c.evidence.map((e) => `  - ${e.label}`));
      out.push("", "</details>", "");
    }
  }
  return out.join("\n");
}


/** A standalone page for reading a run the way a customer would. */
function renderHtml(fixture: ChartFixture, interpretation: Record<string, unknown>, rows: SectionRow[]): string {
  const esc = (v: unknown) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const block = (v: unknown, depth = 0): string => {
    if (typeof v === "string") return `<p>${esc(v)}</p>`;
    if (Array.isArray(v)) return `<ul>${v.map((x) => `<li>${block(x, depth + 1)}</li>`).join("")}</ul>`;
    if (v && typeof v === "object") {
      return Object.entries(v as Record<string, unknown>)
        .map(([k, x]) => `<div class="f"><h${Math.min(3 + depth, 5)}>${esc(k)}</h${Math.min(3 + depth, 5)}>${block(x, depth + 1)}</div>`)
        .join("");
    }
    return "";
  };
  const total = rows.reduce((n, r) => n + r.words, 0);
  const sections = SECTION_IDS.map((id) => `<section><h2>${esc(id)}</h2>${block(interpretation[id])}</section>`).join("\n");
  return `<!doctype html><meta charset="utf-8"><title>${esc(fixture.name)} report</title>
<style>body{max-width:44rem;margin:3rem auto;padding:0 1.25rem;font:16px/1.6 Georgia,serif;color:#222}h1{font-weight:300;font-size:2.2rem}h2{margin-top:3rem;font-weight:400;border-bottom:1px solid #ddd;padding-bottom:.3rem}h3,h4,h5{font:600 .72rem/1.2 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#777;margin:1.4rem 0 .4rem}.f{margin-bottom:.6rem}ul{padding-left:1.1rem}pre{font-size:.8rem;background:#f6f6f6;padding:1rem;overflow:auto}</style>
<h1>${esc(fixture.name)}</h1>
<p><small>${esc(fixture.birthDate)} ${esc(fixture.birthTime)} · ${total} words · Whole Sign houses</small></p>
<pre>${esc(renderTable(rows))}</pre>
${sections}`;
}

function loadFixture(name: string): ChartFixture {
  const path = join(CHARTS_DIR, `${name}.json`);
  if (!existsSync(path)) {
    throw new Error(`No fixture at ${path}. Available: ${listFixtures().join(", ")}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as ChartFixture;
}

function listFixtures(): string[] {
  return readdirSync(CHARTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function opt(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function runOne(name: string, label: string): Promise<SectionRow[]> {
  const { calculateNatalChart } = await import("../../api/src/lib/chartCalculation.js");
  const { generateInterpretation } = await import("../../api/src/lib/aiInterpretation.js");

  const fixture = loadFixture(name);
  console.log(`\n=== ${fixture.name} (${name}) ===`);

  const chart = calculateNatalChart(
    fixture.birthDate,
    fixture.birthTime,
    fixture.latitude,
    fixture.longitude,
    fixture.timezoneOffset,
  );

  const started = Date.now();
  const interpretation = (await generateInterpretation(
    chart,
    fixture.name,
  )) as unknown as Record<string, unknown>;
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  return report(name, label, fixture, chart, interpretation, elapsed);
}

/**
 * The same run through a deployed API. The first response sets the anonymous
 * session cookie, which every later call must carry to own the report.
 */
async function runOneRemote(name: string, label: string, base: string): Promise<SectionRow[]> {
  const fixture = loadFixture(name);
  console.log(`\n=== ${fixture.name} (${name}) via ${base} ===`);

  let cookie = "";
  const call = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${base}/api${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(init?.headers ?? {}) },
    });
    const set = res.headers.get("set-cookie");
    if (set && !cookie) cookie = set.split(";")[0];
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(body)}`);
    return body;
  };

  const started = Date.now();
  const created = await call("/reports", {
    method: "POST",
    body: JSON.stringify({
      name: fixture.name,
      birthDate: fixture.birthDate,
      birthTime: fixture.birthTime,
      birthPlace: `lab fixture ${name}`,
      latitude: fixture.latitude,
      longitude: fixture.longitude,
      timezoneOffset: fixture.timezoneOffset,
    }),
  });
  const id = created.id as string;

  // Generation runs on the server, so a failed poll (a Railway 502, a dropped
  // connection) says nothing about the report: keep polling until the deadline.
  const deadline = Date.now() + 15 * 60 * 1000;
  let last = "";
  for (;;) {
    try {
      const status = await call(`/reports/${id}/status`);
      last = String(status.status);
      if (status.status === "complete") break;
      if (status.status === "failed") throw new Error(`report ${id} failed: ${status.errorMessage}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith(`report ${id} failed`)) throw err;
      console.log(`poll error, retrying: ${err instanceof Error ? err.message : err}`);
    }
    if (Date.now() > deadline) throw new Error(`report ${id} still ${last || "unanswered"} after 15 minutes`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const full = await call(`/reports/${id}`);
  const interpretation = full.interpretation as Record<string, unknown>;
  const chart = full.chartData as NatalChartData;
  if (!interpretation || !chart) throw new Error(`report ${id} came back without interpretation or chart`);

  return report(name, label, fixture, chart, interpretation, elapsed);
}

function report(
  name: string,
  label: string,
  fixture: ChartFixture,
  chart: NatalChartData,
  interpretation: Record<string, unknown>,
  elapsed: string,
): SectionRow[] {
  const rows = measure(interpretation, chart);
  const total = rows.reduce((n, r) => n + r.words, 0);

  console.log(renderTable(rows));
  const totalOk = total >= REPORT_TOTAL[0] && total <= REPORT_TOTAL[1];
  console.log(`\ntotal: ${total} words (target ${REPORT_TOTAL[0]}-${REPORT_TOTAL[1]}: ${totalOk ? "ok" : "OUT OF RANGE"})`
    + (elapsed === "n/a" ? "" : ` in ${elapsed}s`));
  const meta = interpretation.meta as {
    promptVersion?: string; model?: string; sect?: string; sunAltitude?: number;
    sectMarginal?: boolean; usage?: ReportUsage;
  } | undefined;
  if (meta) console.log(`prompt ${meta.promptVersion} on ${meta.model}; ${meta.sect} chart (Sun ${meta.sunAltitude}°${meta.sectMarginal ? ", marginal" : ""})`);

  // Absent on any report generated before R02, and on --compare of an old run.
  const usage = meta?.usage;
  if (usage) {
    console.log(`\n${renderUsage(usage)}`);
    const t = usage.totals;
    const prose = Math.round(total * 1.35);
    const invisible = t.outputTokens - prose;
    console.log(
      `\ncost ${usd(usage.costUsd)} in ${secs(usage.wallClockMs)}s wall clock`
      + ` (${secs(t.ms)}s of call time across ${t.attempts} calls).`,
    );
    console.log(
      `output ${t.outputTokens.toLocaleString("en-US")} tokens: ~${prose.toLocaleString("en-US")} of prose,`
      + ` ~${invisible.toLocaleString("en-US")} the reader never sees`
      + ` (${Math.round((invisible / t.outputTokens) * 100)}%).`,
    );
    const cacheRate = t.inputTokens + t.cachedInputTokens > 0
      ? Math.round((t.cachedInputTokens / (t.inputTokens + t.cachedInputTokens)) * 100) : 0;
    const retried = usage.sections.filter((u) => u.attempts > 1);
    console.log(
      `input cache hit ${cacheRate}%.`
      + ` retries: ${retried.length ? retried.map((u) => `${u.section.replace(/^natal:/, "")} x${u.attempts}`).join(", ") : "none"}.`,
    );
  } else {
    console.log("\nno usage recorded (report generated before R02).");
  }
  const foundationSect = (interpretation.foundation as { sect?: string } | undefined)?.sect;
  if (meta && foundationSect && foundationSect !== meta.sect) console.log(`SECT MISMATCH: foundation says ${foundationSect}, chart is ${meta.sect}`);

  if (label === "render") return rows;

  mkdirSync(REPORTS_DIR, { recursive: true });
  const stem = join(REPORTS_DIR, `${name}.${label}`);
  writeFileSync(`${stem}.json`, JSON.stringify({ fixture, chart, interpretation }, null, 2));
  writeFileSync(`${stem}.md`, renderMarkdown(fixture, interpretation, rows));
  if (flag("html")) writeFileSync(`${stem}.html`, renderHtml(fixture, interpretation, rows));
  console.log(`wrote ${stem}.md and ${stem}.json${flag("html") ? ` and ${stem}.html` : ""}`);

  return rows;
}

/** Everything a section is judged on, from one stored run. */
interface Judged {
  model: string;
  words: number;
  inRange: boolean | null;
  costUsd: number | null;
  ms: number;
  /** Style-contract and evidence failures. Empty is clean. */
  faults: string[];
}

function judge(row: SectionRow, usage: ReportUsage | undefined): Judged {
  const u = usage?.sections.find((x) => x.section.replace(/^natal:/, "") === row.section);
  const model = u?.model ?? usage?.model ?? "-";
  return {
    model,
    words: row.words,
    inRange: row.inRange,
    costUsd: u ? costUsd(model, { ...u }) : null,
    ms: u?.ms ?? 0,
    faults: [
      ...(row.structured ? [] : ["unstructured"]),
      ...row.methodTalk.map((m) => `method:"${m}"`),
      ...row.bannedChars.map((c) => `char:${c}`),
      ...row.claims.problems.map((c) => `claim:${c}`),
    ],
  };
}

const shortModel = (m: string): string => m.replace(/^gpt-/, "");

/**
 * Per-section A/B between two stored runs. Words alone cannot say which model
 * wrote a better section, so this reports what the section is actually judged
 * on: the style contract, code-verified claims, the word band, and what each
 * one cost. Quality and cost are kept apart — a section that got cheaper and
 * broke the contract is not an improvement.
 */
function compare(labelA: string, labelB: string): void {
  const names = listFixtures();
  let compared = 0;
  let costA = 0, costB = 0, priced = true;
  const regressed: string[] = [];
  const fixed: string[] = [];

  for (const name of names) {
    const pathA = join(REPORTS_DIR, `${name}.${labelA}.json`);
    const pathB = join(REPORTS_DIR, `${name}.${labelB}.json`);
    if (!existsSync(pathA) || !existsSync(pathB)) continue;
    compared++;

    const fileA = JSON.parse(readFileSync(pathA, "utf8"));
    const fileB = JSON.parse(readFileSync(pathB, "utf8"));
    const a = fileA.interpretation, b = fileB.interpretation;
    const usageA: ReportUsage | undefined = a.meta?.usage;
    const usageB: ReportUsage | undefined = b.meta?.usage;
    const rowsA = measure(a, fileA.chart);
    const rowsB = measure(b, fileB.chart);

    const body: string[][] = [];
    for (let i = 0; i < rowsA.length; i++) {
      const ja = judge(rowsA[i], usageA);
      const jb = judge(rowsB[i], usageB);
      if (ja.costUsd === null || jb.costUsd === null) priced = false;
      costA += ja.costUsd ?? 0;
      costB += jb.costUsd ?? 0;

      const section = rowsA[i].section;
      const newFaults = jb.faults.filter((f) => !ja.faults.includes(f));
      const goneFaults = ja.faults.filter((f) => !jb.faults.includes(f));
      const fellOut = ja.inRange === true && jb.inRange === false;
      const cameIn = ja.inRange === false && jb.inRange === true;
      if (newFaults.length || fellOut) regressed.push(`${name}/${section}`);
      else if (goneFaults.length || cameIn) fixed.push(`${name}/${section}`);

      const verdict = newFaults.length
        ? `WORSE ${newFaults.slice(0, 2).join(" ")}`
        : fellOut ? "WORSE out of word band"
        : goneFaults.length || cameIn ? "better"
        : "same";
      body.push([
        section,
        ja.model === jb.model ? shortModel(ja.model) : `${shortModel(ja.model)}→${shortModel(jb.model)}`,
        `${ja.words}→${jb.words}`,
        `${usd(ja.costUsd)}→${usd(jb.costUsd)}`,
        `${secs(ja.ms)}→${secs(jb.ms)}`,
        verdict,
      ]);
    }
    console.log(`\n=== ${name}: ${labelA} → ${labelB} ===`);
    console.log(table(["section", "model", "words", "$", "s", "verdict"], body));
  }

  if (compared === 0) {
    console.log(`No fixture has both a "${labelA}" and a "${labelB}" run in ${REPORTS_DIR}.`);
    return;
  }

  console.log(`\n${"-".repeat(60)}`);
  if (priced) {
    const pct = costA > 0 ? Math.round(((costB - costA) / costA) * 100) : 0;
    console.log(`cost over ${compared} fixtures: ${usd(costA)} → ${usd(costB)} (${pct > 0 ? "+" : ""}${pct}%)`);
  } else {
    console.log(`cost: not comparable, a run predates per-section usage`);
  }
  console.log(`quality: ${regressed.length} section(s) worse, ${fixed.length} better, out of ${compared * SECTION_IDS.length}`);
  if (regressed.length) console.log(`  worse: ${regressed.join(", ")}`);
  if (fixed.length) console.log(`  better: ${fixed.join(", ")}`);
  console.log(regressed.length
    ? "A section that got cheaper and broke the contract is not an improvement."
    : "No section regressed. Cheaper is cheaper.");
}

/** Where more runs come from. Named in every "nothing on disk" error. */
const RUNS_HINT =
  "Fetch the latest set with: git fetch origin report-lab/staging"
  + " && git checkout origin/report-lab/staging -- fixtures/reports/";

/**
 * The most recently generated run on disk, by the report's own `generatedAt`
 * rather than the file's mtime, which a git checkout rewrites for every file
 * at once and would make "newest" meaningless.
 */
function newestRun(): string {
  const runs = existsSync(REPORTS_DIR)
    ? readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".json"))
    : [];
  if (runs.length === 0) throw new Error(`No run in ${REPORTS_DIR}. ${RUNS_HINT}`);
  const at = (f: string): string => {
    try {
      return JSON.parse(readFileSync(join(REPORTS_DIR, f), "utf8"))?.interpretation?.meta?.generatedAt ?? "";
    } catch {
      return "";
    }
  };
  return runs.sort((a, b) => at(b).localeCompare(at(a)))[0].replace(/\.json$/, "");
}

async function main() {
  if (flag("list")) {
    console.log(listFixtures().join("\n"));
    return;
  }

  const compareArgs = opt("compare");
  if (compareArgs !== undefined) {
    const i = process.argv.indexOf("--compare");
    compare(process.argv[i + 1], process.argv[i + 2]);
    return;
  }

  const label = flag("baseline") ? "baseline" : (opt("label") ?? "latest");
  const names = flag("all") ? listFixtures() : [opt("chart") ?? "marie-curie"];

  // Re-measure runs already on disk. No API call, no key, no spend.
  //
  // Naming fixtures (--all or --chart) rewrites each one's .md and .html from
  // its stored .json, which is how a change to the renderers reaches past runs.
  // Naming none just prints the newest run, so a session can read a real
  // report, or check this file's own output, without generating one.
  if (flag("render")) {
    if (flag("all") || opt("chart") !== undefined) {
      for (const name of names) {
        const path = join(REPORTS_DIR, `${name}.${label}.json`);
        if (!existsSync(path)) { console.log(`no run at ${path}`); continue; }
        const run = JSON.parse(readFileSync(path, "utf8")) as { fixture: ChartFixture; chart: NatalChartData; interpretation: Record<string, unknown> };
        console.log(`\n=== ${run.fixture.name} (${name}) re-rendered from ${label} ===`);
        report(name, label, run.fixture, run.chart, run.interpretation, "n/a");
      }
      return;
    }
    const run = opt("render") ?? newestRun();
    const path = join(REPORTS_DIR, `${run.replace(/\.json$/, "")}.json`);
    if (!existsSync(path)) throw new Error(`no run at ${path}. ${RUNS_HINT}`);
    const file = JSON.parse(readFileSync(path, "utf8"));
    const generated = file.interpretation?.meta?.generatedAt;
    console.log(`reading ${run}${generated ? `, generated ${generated}` : ""} (no API call)`);
    // The "render" label makes report() print without writing, so re-reading a
    // run can never overwrite the run it read.
    report(run, "render", file.fixture, file.chart, file.interpretation, "n/a");
    return;
  }

  const remote = opt("remote");
  if (remote !== undefined) {
    if (!/^https?:\/\//.test(remote)) throw new Error(`--remote needs a web origin, got "${remote}"`);
    const base = remote.replace(/\/+$/, "");
    // Every fixture runs even when one fails: a measurement with four charts
    // and one named failure is worth more than a stop at the first.
    const failed: string[] = [];
    for (const name of names) {
      try {
        await runOneRemote(name, label, base);
      } catch (err) {
        console.log(`FAILED ${name}: ${err instanceof Error ? err.message : err}`);
        failed.push(name);
      }
    }
    if (failed.length) throw new Error(`${failed.length} of ${names.length} fixtures failed: ${failed.join(", ")}`);
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. The meaning library lives in Postgres, so a run " +
        "without it is not representative of a real report.",
    );
  }
  if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY must be set.");
  }

  if (flag("defaults-only")) {
    process.env.PROMPT_DEFAULTS_ONLY = "1";
    console.log("defaults-only: ignoring prompt_templates overrides.");
  }

  for (const name of names) {
    await runOne(name, label);
  }

  const { pool } = await import("@workspace/db");
  await pool.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

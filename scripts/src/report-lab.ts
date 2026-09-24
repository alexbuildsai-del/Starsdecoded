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
 *   pnpm report:lab --pass                                # blind marie-curie-unknown, then the horizon pass
 *   pnpm report:lab --pair curie-winfrey --lens people    # one compatibility report, measured
 *   pnpm report:lab --pair                                # the campaign: three lenses, then one parent-and-child run per band
 *
 * The four lab levels (ADR-76, ADR-77), every run posted to the panel when LAB_API and LAB_TOKEN are set:
 *   pnpm report:lab --publish marie-curie.r06,audrey-hepburn.r06   # stored files into the panel's Runs
 *   pnpm report:lab --dry --base r06                               # level 0: prompts rendered, tokens counted, no call
 *   pnpm report:lab --spot career,money --charts marie-curie,day-angular --base r06   # level 1: replay, Flex
 *   pnpm report:lab --release r07                                  # level 2: the five matrix charts, refused past the budget
 *   pnpm report:lab --gate r07 --against last-release              # exit 1 with the reasons (the Promote gate)
 *   pnpm report:lab --stub r07 --from r06 --seed-fault             # a gate rehearsal with no spend
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
import { fileURLToPath, pathToFileURL } from "node:url";

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
  timezone?: string;
  /** 0 exact, 180 a part of the day, 720 unknown (ADR-33). */
  birthTimeWindowMinutes?: number;
  /** Kept for the pair campaign's band runs; never in the natal campaign. */
  pairOnly?: boolean;
  note?: string;
}

/** A pair fixture names two chart fixtures and holds no birth data (R-3.1); it may name its lens, its parent and its label. */
interface PairFixture {
  name: string;
  a: string;
  b: string;
  lens?: string;
  parent?: "A" | "B";
  label?: string;
  band?: string;
  note?: string;
}
const PAIRS_DIR = join(ROOT, "fixtures", "pairs");

/** Word targets come from the section registry, so prompt, schema and check cannot disagree. */
import { ALL_SECTIONS, PASS_ADDS, SECTION_IDS } from "../../api/src/prompts/index.js";
import { PAIR_WORD_TARGETS, bandProblems, evidenceProblems, pairChapterIds, pairChapterTitle, ratingProblems, sceneProblems } from "../../api/src/prompts/pair/index.js";
import { BAND_DOCTRINE } from "../../api/src/prompts/pair/sections/parent-child/doctrine.js";
import type { NatalChartData } from "../../api/src/lib/chartCalculation.js";
/** The product target for a compatibility report's prose, the cards and the items outside it (ADR-63). */
const PAIR_TOTAL: [number, number] = [1900, 2500];
/** Cost comes from the engine's own table, so the lab cannot disagree with the bill. */
import { costUsd, type ReportUsage, type SectionUsage } from "../../api/src/lib/usage.js";
/** The rules are the engine's, shared with the lab routes, so the panel and this trail cannot disagree on a fault. */
import {
  BANNED_CHARS, MATRIX_CHARTS, METHOD_TALK, REPORT_TOTAL, blindFlags, faultsOf, gateProblems, isOutOfCreditMessage,
  measureReport, proseOf, reportBand, words, type RunNumbers, type SectionMeasure,
} from "../../api/src/lib/labRules.js";
export { blindFlags };

type SectionRow = SectionMeasure;
const measure = measureReport;

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
      ...r.blindFlags.map((b) => b.toUpperCase()),
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

/** The chart a fixture describes: the zone when it names one, the band when it has one. */
function chartOf(calculate: typeof import("../../api/src/lib/chartCalculation.js").calculateNatalChart, f: ChartFixture, windowOverride?: number): NatalChartData {
  return calculate(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, windowOverride ?? f.birthTimeWindowMinutes ?? 0);
}

function loadPair(name: string): PairFixture {
  const path = join(PAIRS_DIR, `${name}.json`);
  if (!existsSync(path)) throw new Error(`No pair fixture at ${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as PairFixture;
}

function loadFixture(name: string): ChartFixture {
  const path = join(CHARTS_DIR, `${name}.json`);
  if (!existsSync(path)) {
    throw new Error(`No fixture at ${path}. Available: ${listFixtures().join(", ")}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as ChartFixture;
}

/** The natal campaign's fixtures: every chart but the pair-only ones. */
function listFixtures(): string[] {
  return readdirSync(CHARTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((name) => !(JSON.parse(readFileSync(join(CHARTS_DIR, `${name}.json`), "utf8")) as ChartFixture).pairOnly)
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

  const chart = chartOf(calculateNatalChart, fixture);

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
      ...(fixture.timezone ? { timezone: fixture.timezone } : {}),
      birthTimeWindowMinutes: fixture.birthTimeWindowMinutes ?? 0,
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

  const rows = report(name, label, fixture, chart, interpretation, elapsed);
  await publishRun(name, label, { fixture, chart, interpretation });
  return rows;
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
  const meta = interpretation.meta as {
    promptVersion?: string; model?: string; sect?: string; sunAltitude?: number;
    sectMarginal?: boolean; usage?: ReportUsage; horizon?: string;
  } | undefined;
  const blind = meta?.horizon === "unknown";
  // A blind report is written to its blind bands, which plus what the pass adds sit inside the product range (MB-60).
  const band = reportBand(blind);

  console.log(renderTable(rows));
  const totalOk = total >= band[0] && total <= band[1];
  console.log(`\ntotal: ${total} words (target ${band[0]}-${band[1]}: ${totalOk ? "ok" : "OUT OF RANGE"})`
    + (blind ? `; with the pass's ${PASS_ADDS[0]}-${PASS_ADDS[1]} the ceiling is ${REPORT_TOTAL[1]}` : "")
    + (elapsed === "n/a" ? "" : ` in ${elapsed}s`));
  if (meta) console.log(blind
    ? `prompt ${meta.promptVersion} on ${meta.model}; horizon unknown, written blind`
    : `prompt ${meta.promptVersion} on ${meta.model}; ${meta.sect} chart (Sun ${meta.sunAltitude}°${meta.sectMarginal ? ", marginal" : ""})`);
  const hits = rows.flatMap((r) => r.blindFlags.map((f) => `${r.section}: ${f}`));
  if (blind) console.log(hits.length ? `BLIND FLAG: ${hits.join("; ")}` : "blind flag: clean, no house, angle, sect or lot word");

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
    faults: faultsOf(row),
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

// ---------------------------------------------------------------------------
// The horizon pass: the blind fixture, then the time added back (ADR-35).
// ---------------------------------------------------------------------------

/** Every string leaf but the claims, with its path. */
function leavesOf(value: unknown, path = "", out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => leavesOf(v, `${path}.${i}`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (k !== "claims") leavesOf(v, `${path}.${k}`, out);
  return out;
}

const sentences = (s: string): string[] => s.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);

/** What the pass changed: words kept verbatim, sentences amended, claims added, and the cost of each stage. */
function reportPass(before: Record<string, unknown>, after: Record<string, unknown>): void {
  const ids = SECTION_IDS.filter((id) => id !== "houses");
  let keptWords = 0, totalWords = 0, changedSentences = 0;
  for (const id of ids) {
    const was = new Map(leavesOf(before[id]));
    for (const [path, text] of leavesOf(after[id])) {
      const previous = was.get(path) ?? "";
      const now = sentences(text);
      const old = new Set(sentences(previous));
      for (const sentence of now) {
        const w = words(sentence);
        totalWords += w;
        if (old.has(sentence)) keptWords += w;
        else changedSentences++;
      }
    }
  }
  const claimsOf = (i: Record<string, unknown>) => SECTION_IDS.reduce((n, id) => n + (((i[id] as { claims?: unknown[] } | undefined)?.claims?.length) ?? 0), 0);
  const meta = after.meta as { horizonPass?: { sentencesRevised: number; paragraphsAdded: number }; usage?: ReportUsage } | undefined;
  const beforeUsage = (before.meta as { usage?: ReportUsage } | undefined)?.usage;
  const afterUsage = meta?.usage;
  const passCost = afterUsage && beforeUsage && afterUsage.costUsd !== null && beforeUsage.costUsd !== null ? afterUsage.costUsd - beforeUsage.costUsd : null;
  console.log(`\n=== the horizon pass ===`);
  console.log(`words kept verbatim: ${keptWords} of ${totalWords} (${totalWords ? Math.round((keptWords / totalWords) * 100) : 0}%)`);
  console.log(`sentences amended: ${meta?.horizonPass?.sentencesRevised ?? "?"} (ledger), ${changedSentences} differ on the page; paragraphs added: ${meta?.horizonPass?.paragraphsAdded ?? "?"}`);
  console.log(`claims: ${claimsOf(before)} before, ${claimsOf(after)} after (${claimsOf(after) - claimsOf(before)} added, rising and houses included)`);
  console.log(`cost: blind report ${usd(beforeUsage?.costUsd ?? null)}, the pass ${usd(passCost)}, together ${usd(afterUsage?.costUsd ?? null)}`);
  const passRows = afterUsage?.sections.filter((s) => !beforeUsage?.sections.some((b) => b.section === s.section)) ?? [];
  if (passRows.length) console.log(renderUsage({ ...afterUsage!, sections: passRows, totals: passRows.reduce((t, s) => ({ attempts: t.attempts + s.attempts, inputTokens: t.inputTokens + s.inputTokens, cachedInputTokens: t.cachedInputTokens + s.cachedInputTokens, outputTokens: t.outputTokens + s.outputTokens, reasoningTokens: t.reasoningTokens + s.reasoningTokens, ms: t.ms + s.ms }), { attempts: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, ms: 0 }), costUsd: passCost }));
}

async function runPassLocal(label: string): Promise<void> {
  const { calculateNatalChart } = await import("../../api/src/lib/chartCalculation.js");
  const { generateInterpretation } = await import("../../api/src/lib/aiInterpretation.js");
  const { runHorizonPass } = await import("../../api/src/lib/horizonPass.js");
  const blindFixture = loadFixture("marie-curie-unknown");
  const blindChart = chartOf(calculateNatalChart, blindFixture);
  console.log(`\n=== ${blindFixture.name} (marie-curie-unknown), blind ===`);
  const started = Date.now();
  const before = (await generateInterpretation(blindChart, blindFixture.name)) as unknown as Record<string, unknown>;
  report("marie-curie-unknown", label, blindFixture, blindChart, before, ((Date.now() - started) / 1000).toFixed(1));

  // The pass against memory: the same code path the route runs, without a database.
  const drawnChart = chartOf(calculateNatalChart, blindFixture, 0);
  const state: { interpretation: Record<string, unknown> } = { interpretation: before };
  const passStarted = Date.now();
  await runHorizonPass({
    reportId: "lab", profileId: "lab", name: blindFixture.name,
    previous: { birthTime: blindFixture.birthTime, birthTimeWindowMinutes: 720, chart: blindChart },
    chart: drawnChart,
  }, {
    async load() { return { interpretation: state.interpretation as never, horizonPasses: 0 }; },
    async saveRevision() { /* the lab keeps the previous run on disk */ },
    async setRevising() { /* nothing to mark */ },
    async writeFrame(_id, i) { state.interpretation = i as unknown as Record<string, unknown>; },
    async finish(_id, i) { state.interpretation = i as unknown as Record<string, unknown>; },
    async fail(_id, _previous, message) { throw new Error(`the pass failed: ${message}`); },
  });
  const after = state.interpretation;
  console.log(`\n=== ${blindFixture.name} (marie-curie-unknown), passed in ${((Date.now() - passStarted) / 1000).toFixed(1)}s ===`);
  report("marie-curie-passed", label, { ...blindFixture, birthTimeWindowMinutes: 0 }, drawnChart, after, "n/a");
  reportPass(before, after);
}

async function runPassRemote(label: string, base: string): Promise<void> {
  const blindFixture = loadFixture("marie-curie-unknown");
  const { call, cookieJar } = remoteClient(base);
  console.log(`\n=== ${blindFixture.name} (marie-curie-unknown) via ${base}, blind ===`);
  const created = await call("/reports", { method: "POST", body: JSON.stringify({
    name: blindFixture.name, birthDate: blindFixture.birthDate, birthTime: blindFixture.birthTime,
    birthPlace: "lab fixture marie-curie-unknown", latitude: blindFixture.latitude, longitude: blindFixture.longitude,
    timezoneOffset: blindFixture.timezoneOffset, birthTimeWindowMinutes: 720,
  }) });
  const id = created.id as string;
  const started = Date.now();
  await pollUntil(call, id, ["complete"]);
  const full = await call(`/reports/${id}`);
  const before = full.interpretation as Record<string, unknown>;
  report("marie-curie-unknown", label, blindFixture, full.chartData as NatalChartData, before, ((Date.now() - started) / 1000).toFixed(1));

  const list = (await call("/reports")) as unknown as Array<{ id: string; profileId: string | null }>;
  const profileId = list.find((r) => r.id === id)?.profileId;
  if (!profileId) throw new Error("the created report is not in the viewer's list");
  const passStarted = Date.now();
  await call(`/profiles/${profileId}/birth-time`, { method: "PATCH", body: JSON.stringify({ birthTime: "12:00", birthTimeWindowMinutes: 0 }) });
  await pollUntil(call, id, ["complete"], "revising");
  const passed = await call(`/reports/${id}`);
  const after = passed.interpretation as Record<string, unknown>;
  if (passed.errorMessage) throw new Error(`the pass failed: ${passed.errorMessage}`);
  console.log(`\n=== ${blindFixture.name} (marie-curie-unknown), passed in ${((Date.now() - passStarted) / 1000).toFixed(1)}s ===`);
  report("marie-curie-passed", label, { ...blindFixture, birthTimeWindowMinutes: 0 }, passed.chartData as NatalChartData, after, "n/a");
  reportPass(before, after);
  void cookieJar;
}

/** A remote session: the first response sets the anonymous cookie every later call carries. */
function remoteClient(base: string) {
  const jar = { cookie: "" };
  const call = async (path: string, init?: RequestInit): Promise<Record<string, unknown>> => {
    const res = await fetch(`${base}/api${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(jar.cookie ? { cookie: jar.cookie } : {}), ...(init?.headers ?? {}) },
    });
    const set = res.headers.get("set-cookie");
    if (set && !jar.cookie) jar.cookie = set.split(";")[0];
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(body)}`);
    return body;
  };
  return { call, cookieJar: jar };
}

/** Poll a report until it reaches one of the given statuses; a failed poll says nothing about the report. */
async function pollUntil(call: (path: string) => Promise<Record<string, unknown>>, id: string, done: string[], mustSee?: string): Promise<void> {
  const deadline = Date.now() + 15 * 60 * 1000;
  let seen = !mustSee;
  let last = "";
  for (;;) {
    try {
      const status = await call(`/reports/${id}/status`);
      last = String(status.status);
      if (mustSee && last === mustSee) seen = true;
      if (seen && done.includes(last)) break;
      if (last === "failed") throw new Error(`report ${id} failed: ${status.errorMessage}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith(`report ${id} failed`)) throw err;
      console.log(`poll error, retrying: ${err instanceof Error ? err.message : err}`);
    }
    if (Date.now() > deadline) throw new Error(`report ${id} still ${last || "unanswered"} after 15 minutes`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// ---------------------------------------------------------------------------
// The compatibility report (ADR-63): one pair fixture under one lens, or the
// campaign: the three lenses on curie-winfrey and the parent-and-child lens
// once per band on the four band pairs. Prose against 1,900 to 2,500, the
// repetition score under its bar, cost against 25 cents, the failure count.
// ---------------------------------------------------------------------------

interface PairRow { section: string; words: number; target: [number, number] | null; inRange: boolean | null; flags: string[] }

/** The fields outside the prose count: the cards and the items (ADR-63). */
const OUTSIDE_PROSE = new Set(["card", "strengths", "nextTime"]);

/** A chapter's prose: every string leaf but the claims, the card lines and the next-time items. */
function pairProseOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(pairProseOf).join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k]) => k !== "claims" && !OUTSIDE_PROSE.has(k))
      .map(([, v]) => pairProseOf(v))
      .join(" ");
  }
  return "";
}

/** Five-word runs, lowercased, so a sentence reused across chapters shows as shared shingles. */
export function shingles(text: string, n = 5): string[] {
  const tokens = text.toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(" "));
  return out;
}

/** The share of five-word runs that appear in more than one chapter; the bar it sits under. */
export const REPETITION_BAR = 0.03;
export function repetitionScore(chapters: string[]): number {
  const seen = new Map<string, Set<number>>();
  let total = 0;
  chapters.forEach((text, i) => {
    for (const s of shingles(text)) {
      total++;
      const set = seen.get(s) ?? new Set<number>();
      set.add(i);
      seen.set(s, set);
    }
  });
  if (!total) return 0;
  let repeated = 0;
  for (const [, set] of seen) if (set.size > 1) repeated += set.size;
  return repeated / total;
}

const twelve = (line: string): boolean => words(line) <= 12;

export function measurePair(interpretation: Record<string, unknown>): { rows: PairRow[]; cards: string[]; repetition: number; prose: number; band: string | null; bandFlags: string[] } {
  const meta = interpretation.meta as { lens?: string; band?: string | null; names?: { a: string; b: string } } | undefined;
  const lens = (meta?.lens ?? "partners") as never;
  const band = meta?.band ?? null;
  const names = meta?.names ?? { a: "A", b: "B" };
  const bandFlags: string[] = [];
  const proses: string[] = [];
  const rows: PairRow[] = pairChapterIds(lens).map((id) => {
    const value = interpretation[id] as Record<string, unknown> | undefined;
    const missing = value === undefined || value === null;
    const prose = pairProseOf(value);
    proses.push(prose);
    const w = words(prose);
    const target = PAIR_WORD_TARGETS[id];
    const flags = [
      ...(missing ? ["not written"] : []),
      ...METHOD_TALK.filter((p) => prose.toLowerCase().includes(p)).map((p) => `method:"${p}"`),
      ...BANNED_CHARS.filter(([, re]) => re.test(prose)).map(([n]) => `char:${n}`),
      ...ratingProblems(prose).map((r) => `RATING: ${r}`),
      ...evidenceProblems(prose).map((r) => `EVIDENCE: ${r}`),
    ];
    if (!missing) {
      const card = value.card as { a?: string[]; b?: string[]; pair?: string } | undefined;
      const lines = [...(card?.a ?? []), ...(card?.b ?? []), ...(card?.pair ? [card.pair] : []), ...((value.strengths as string[] | undefined) ?? [])];
      const over = lines.filter((l) => !twelve(l));
      if (over.length) flags.push(`CARD: ${over.length} line(s) over twelve words`);
      const scene = value.scene as string | undefined;
      if (scene) flags.push(...sceneProblems(scene, names).map((p) => `SCENE: ${p}`));
      if (band) {
        const hits = bandProblems(prose, band as never, BAND_DOCTRINE);
        bandFlags.push(...hits.map((h) => `${id}: ${h}`));
      }
    }
    const title = pairChapterTitle(id);
    return { section: `${id} (${title})`, words: w, target, inRange: missing ? null : w >= target[0] && w <= target[1], flags };
  });
  const cards: string[] = [];
  const links = (interpretation.links as { links?: Array<{ kind: string; reading: string; planetA?: string; planetB?: string; planet?: string; house?: number }> } | undefined)?.links ?? [];
  for (const [i, l] of links.entries()) {
    const w = words(l.reading);
    const problems: string[] = [];
    if (w < 40 || w > 70) problems.push(`${w} words`);
    if (!/Behaviour check:/.test(l.reading)) problems.push("no behaviour check");
    problems.push(...ratingProblems(l.reading).map((r) => `RATING: ${r}`));
    const who = l.kind === "overlay" ? `${l.planet} in the ${l.house}th` : `${l.planetA} ${l.planetB}`;
    cards.push(`card ${i + 1} ${l.kind} ${who}: ${w} words${problems.length ? ` ${problems.join(", ")}` : ""}`);
  }
  return { rows, cards, repetition: repetitionScore(proses), prose: rows.reduce((n, r) => n + r.words, 0), band, bandFlags };
}

/** The pair's markdown: the measurement, then every chapter as a reader would meet it, the cards and the scenes with it. */
function renderPairMarkdown(pair: PairFixture, lens: string, interpretation: Record<string, unknown>, rows: PairRow[]): string {
  const meta = interpretation.meta as { promptVersion?: string; model?: string; generatedAt?: string; band?: string | null; label?: string | null; names?: { a: string; b: string } } | undefined;
  const names = meta?.names ?? { a: "A", b: "B" };
  const out: string[] = [
    `# ${pair.name}`,
    "",
    `Compatibility report from the report lab, ${meta?.generatedAt ?? new Date().toISOString()}. Prompt ${meta?.promptVersion ?? "?"} on ${meta?.model ?? "?"}, lens ${lens}${meta?.band ? `, band ${meta.band}` : ""}${meta?.label ? `, ${meta.label}` : ""}, ${rows.reduce((n, r) => n + r.words, 0)} words of prose.`,
    "",
    "<details><summary>Measurement</summary>",
    "",
    "```",
    table(["chapter", "words", "target", "ok", "flags"], rows.map((r) => [r.section, String(r.words), r.target ? `${r.target[0]}-${r.target[1]}` : "-", r.inRange === null ? "-" : r.inRange ? "yes" : "NO", r.flags.join(" ") || "-"])),
    "```",
    "",
    "</details>",
    "",
  ];
  const claimsBlock = (value: Record<string, unknown>) => {
    const claims = (value.claims as Array<{ quote: string; evidence: Array<{ label: string }> }> | undefined) ?? [];
    if (!claims.length) return;
    out.push("<details><summary>Claims and evidence</summary>", "");
    for (const c of claims) out.push(`- "${c.quote}"`, ...c.evidence.map((e) => `  - ${e.label}`));
    out.push("", "</details>", "");
  };
  const ids = pairChapterIds(lens as never);
  ids.forEach((id, i) => {
    const value = interpretation[id] as Record<string, unknown> | undefined;
    if (!value) return;
    out.push("---", "", `## ${String(i + 1).padStart(2, "0")} ${pairChapterTitle(id)}`, "", `*${value.headline as string}*`, "");
    if (id === "twoCharts") {
      const links = (interpretation.links as { links?: Array<{ kind: string; reading: string }> } | undefined)?.links ?? [];
      if (links.length) { out.push("### Link cards", ""); for (const l of links) out.push(`- **${l.kind}** ${l.reading}`); out.push(""); }
      out.push("### What is naturally strong between you", "", ...(value.strong as string[]).map((l) => `- ${l}`), "");
      out.push("### What will take work", "", ...(value.work as string[]).map((l) => `- ${l}`), "");
      out.push("### The paradox", "", value.paradox as string, "");
      out.push("### Your three strengths as a pair", "", ...(value.strengths as string[]).map((l) => `- ${l}`), "");
      out.push(value.pointer as string, "");
    } else if ("card" in value) {
      const card = value.card as { a: string[]; b: string[]; pair: string };
      out.push(`### ${names.a} · from personal report`, "", ...card.a.map((l) => `- ${l}`), "", `### ${names.b} · from personal report`, "", ...card.b.map((l) => `- ${l}`), "", `*${card.pair}*`, "");
      const scenes = (interpretation.scenes as Record<string, { titles: string[]; written: number; texts: Record<string, string> }> | undefined)?.[id];
      out.push(`### The scene${scenes ? ` · ${scenes.titles[scenes.written]}` : ""}`, "", value.scene as string, "");
      if (scenes) out.push(`Other scenes: ${scenes.titles.filter((_, j) => j !== scenes.written).join(" · ")}`, "");
      const wjh = value.whatJustHappened as { becauseA: string; becauseB: string };
      out.push("### What just happened", "", `**${names.a} · because** ${wjh.becauseA}`, "", `**${names.b} · because** ${wjh.becauseB}`, "");
      out.push("### The pattern under it", "", value.pattern as string, "");
      const items = (value.nextTime as { items: Array<{ for: string; action: string; why: string }> }).items;
      out.push("### Next time", "", ...items.map((it) => `- [ ] ${it.for === "A" ? names.a : it.for === "B" ? names.b : "Both"}: ${it.action} (${it.why})`), "");
    } else {
      out.push(value.opening as string, "");
      for (const [key, who] of [["forA", names.a], ["forB", names.b], ["forBoth", "Both"]] as const) {
        const list = value[key] as { intro: string; items: Array<{ action: string; why: string }> };
        out.push(`### ${who}`, "", list.intro, "", ...list.items.map((it) => `- [ ] ${it.action} (${it.why})`), "");
      }
      out.push(value.closing as string, "");
    }
    claimsBlock(value);
  });
  return out.join("\n");
}

/** The pair's cost bar (p2 spec, Lab). */
const PAIR_COST_BAR = 0.25;

function reportPair(name: string, lens: string, label: string, fixture: PairFixture, interpretation: Record<string, unknown>, elapsed: string): void {
  const { rows, cards, repetition, prose, band, bandFlags } = measurePair(interpretation);
  const linkWords = words(proseOf((interpretation.links as { links?: unknown } | undefined)?.links));
  console.log(table(["chapter", "words", "target", "ok", "flags"], rows.map((r) => [
    r.section, String(r.words), r.target ? `${r.target[0]}-${r.target[1]}` : "-",
    r.inRange === null ? "-" : r.inRange ? "yes" : "NO", r.flags.join(" ") || "-",
  ])));
  console.log(cards.join("\n"));
  const bad = cards.filter((c) => /words [^\n]*(words|check|RATING)|RATING/.test(c));
  console.log(`link cards: ${cards.length}, ${linkWords} words${bad.length ? `, ${bad.length} OUT OF SHAPE` : ", all 40 to 70 with a behaviour check"}`);
  const totalOk = prose >= PAIR_TOTAL[0] && prose <= PAIR_TOTAL[1];
  console.log(`\nprose: ${prose} words (target ${PAIR_TOTAL[0]}-${PAIR_TOTAL[1]}: ${totalOk ? "ok" : "OUT OF RANGE"}), cards and items outside it` + (elapsed === "n/a" ? "" : `; written in ${elapsed}s`));
  console.log(`repetition: ${(repetition * 100).toFixed(1)}% of five-word runs appear in more than one chapter (bar ${REPETITION_BAR * 100}%: ${repetition <= REPETITION_BAR ? "under" : "OVER"})`);
  const meta = interpretation.meta as { promptVersion?: string; model?: string; usage?: ReportUsage; blind?: boolean; label?: string | null } | undefined;
  console.log(`prompt ${meta?.promptVersion} on ${meta?.model}; lens ${lens}${band ? `; band ${band}` : ""}${meta?.label ? `; ${meta.label}` : ""}${meta?.blind ? "; a chart is blind, no overlay" : ""}`);
  if (band) console.log(bandFlags.length ? `BAND FLAG: ${bandFlags.join("; ")}` : `band flag: clean, no line contradicts the ${band} band`);
  const ratings = [...rows.flatMap((r) => r.flags), ...cards].filter((f) => /RATING|EVIDENCE|CARD|SCENE/.test(f));
  console.log(ratings.length ? `SHAPE FLAG: ${ratings.join("; ")}` : "shape flag: clean, no number, no evidence in prose, every card line inside twelve words, every scene names both");
  if (meta?.usage) {
    console.log(`\n${renderUsage(meta.usage)}`);
    const cost = meta.usage.costUsd;
    console.log(`\ncost ${usd(cost)} in ${secs(meta.usage.wallClockMs)}s wall clock (${secs(meta.usage.totals.ms)}s of call time across ${meta.usage.totals.attempts} calls); bar ${usd(PAIR_COST_BAR)}: ${cost !== null && cost <= PAIR_COST_BAR ? "under" : "OVER"}`);
  }
  if (label === "render") return;
  mkdirSync(REPORTS_DIR, { recursive: true });
  const stem = join(REPORTS_DIR, `${name}.${lens}.${label}`);
  writeFileSync(`${stem}.json`, JSON.stringify({ fixture, lens, interpretation }, null, 2));
  writeFileSync(`${stem}.md`, renderPairMarkdown(fixture, lens, interpretation, rows));
  console.log(`wrote ${stem}.md and ${stem}.json`);
}

/** What a pair run sends: the lens the flag or the fixture names, the parent and the label the fixture carries. */
function pairInput(pair: PairFixture, lensFlag: string | undefined): { lens: string; parent: "A" | "B" | null; label: string | null } {
  const lens = lensFlag ?? pair.lens ?? "partners";
  return { lens, parent: lens === "parent_child" ? (pair.parent ?? "A") : null, label: lens === "people" ? (pair.label ?? "friends") : null };
}

async function runPairLocal(name: string, lensFlag: string | undefined, label: string): Promise<void> {
  const { calculateNatalChart } = await import("../../api/src/lib/chartCalculation.js");
  const { generateInterpretation } = await import("../../api/src/lib/aiInterpretation.js");
  const { generatePairInterpretation } = await import("../../api/src/lib/pairInterpretation.js");
  const pair = loadPair(name);
  const { lens, parent, label: how } = pairInput(pair, lensFlag);
  const [fa, fb] = [loadFixture(pair.a), loadFixture(pair.b)];
  console.log(`\n=== ${pair.name} (${name}), ${lens}: two natal reports first ===`);
  const [ca, cb] = [chartOf(calculateNatalChart, fa), chartOf(calculateNatalChart, fb)];
  const [ia, ib] = await Promise.all([generateInterpretation(ca, fa.name), generateInterpretation(cb, fb.name)]);
  const started = Date.now();
  const out = (await generatePairInterpretation({
    lens: lens as never, parent, label: how,
    a: { name: fa.name, birthDate: fa.birthDate, chart: ca, interpretation: ia },
    b: { name: fb.name, birthDate: fb.birthDate, chart: cb, interpretation: ib },
  })) as unknown as Record<string, unknown>;
  console.log(`\n=== ${pair.name} (${name}), ${lens} ===`);
  reportPair(name, lens, label, pair, out, ((Date.now() - started) / 1000).toFixed(1));
}

async function runPairRemote(name: string, lensFlag: string | undefined, label: string, base: string): Promise<void> {
  const pair = loadPair(name);
  const { lens, parent, label: how } = pairInput(pair, lensFlag);
  const { call } = remoteClient(base);
  const natal = async (fixtureName: string): Promise<string> => {
    const f = loadFixture(fixtureName);
    const created = await call("/reports", { method: "POST", body: JSON.stringify({
      name: f.name, birthDate: f.birthDate, birthTime: f.birthTime, birthPlace: `lab fixture ${fixtureName}`,
      latitude: f.latitude, longitude: f.longitude, timezoneOffset: f.timezoneOffset, ...(f.timezone ? { timezone: f.timezone } : {}),
      birthTimeWindowMinutes: f.birthTimeWindowMinutes ?? 0,
    }) });
    return created.id as string;
  };
  console.log(`\n=== ${pair.name} (${name}), ${lens} via ${base}: two natal reports first ===`);
  // Created one after the other: the first response sets the session cookie,
  // and a second report created before it lands belongs to another visitor.
  const a = await natal(pair.a);
  const b = await natal(pair.b);
  await Promise.all([pollUntil(call, a, ["complete"]), pollUntil(call, b, ["complete"])]);
  const started = Date.now();
  const created = await call("/compatibility", { method: "POST", body: JSON.stringify({ reportAId: a, reportBId: b, lens, ...(parent ? { parent } : {}), ...(how ? { label: how } : {}) }) });
  const id = created.id as string;
  await pollUntil(call, id, ["complete"]);
  const full = await call(`/reports/${id}`);
  console.log(`\n=== ${pair.name} (${name}), ${lens} ===`);
  reportPair(name, lens, label, pair, full.interpretation as Record<string, unknown>, ((Date.now() - started) / 1000).toFixed(1));
}

/** The campaign: the three lenses on curie-winfrey, then the parent-and-child lens once per band. Every run runs even when one fails. */
const PAIR_CAMPAIGN: Array<{ pair: string; lens?: string }> = [
  { pair: "curie-winfrey", lens: "partners" }, { pair: "curie-winfrey", lens: "parent_child" }, { pair: "curie-winfrey", lens: "people" },
  { pair: "beatrice-athena" }, { pair: "william-charlotte" }, { pair: "william-george" }, { pair: "charles-william" },
];

async function runPairCampaign(label: string, base: string | undefined): Promise<void> {
  const failed: string[] = [];
  for (const run of PAIR_CAMPAIGN) {
    const tag = `${run.pair}${run.lens ? ` ${run.lens}` : ""}`;
    try {
      if (base) await runPairRemote(run.pair, run.lens, label, base);
      else await runPairLocal(run.pair, run.lens, label);
    } catch (err) {
      console.log(`FAILED ${tag}: ${err instanceof Error ? err.message : err}`);
      failed.push(tag);
    }
  }
  console.log(`\n=== pair campaign: ${PAIR_CAMPAIGN.length - failed.length} of ${PAIR_CAMPAIGN.length} runs complete, ${failed.length} failed${failed.length ? `: ${failed.join(", ")}` : ""} ===`);
  if (failed.length) throw new Error(`${failed.length} of ${PAIR_CAMPAIGN.length} pair runs failed: ${failed.join(", ")}`);
}


// ---------------------------------------------------------------------------
// The panel (annex scope 4, ADR-76, ADR-77): every run this script makes is
// posted to /api/admin/lab on staging, and the four levels drive it from here.
// LAB_API is the web origin (defaults to --remote); LAB_TOKEN is the bearer
// the lab routes accept, placed once by the Owner (MB-69).
// ---------------------------------------------------------------------------

/** A stored run file: the fixture, its chart and the interpretation. */
interface RunFile { fixture: ChartFixture; chart: NatalChartData; interpretation: Record<string, unknown> }

/** One section of a run as the panel stores it: the numbers beside the text, so Runs never loads the text. */
export interface RunSectionRow {
  section: string;
  model: string;
  serviceTier: "flex" | "standard";
  output: unknown;
  usage: SectionUsage | null;
  faults: string[];
  words: number;
  costUsd: number | null;
  seconds: number | null;
}

export interface RunPayload {
  runKey: string;
  fixture: string;
  label: string;
  source: "lab";
  subjectName: string;
  chart: NatalChartData;
  sections: RunSectionRow[];
}

/** The rows a stored run file publishes: the foundation with the chart, then every section with its numbers. */
export function runRows(name: string, label: string, file: RunFile): RunPayload {
  const usage = (file.interpretation.meta as { usage?: ReportUsage } | undefined)?.usage;
  const usageOf = (key: string) => usage?.sections.find((u) => u.section === key) ?? null;
  const rows = measure(file.interpretation, file.chart);
  const rowOf = (section: string, output: unknown, faults: string[], w: number): RunSectionRow => {
    const u = usageOf(`natal:${section}`);
    const model = u?.model ?? usage?.model ?? "-";
    return { section, model, serviceTier: "standard", output, usage: u, faults, words: w, costUsd: u ? costUsd(model, { ...u }) : null, seconds: u ? u.ms / 1000 : null };
  };
  return {
    runKey: `${name}.${label}`, fixture: name, label, source: "lab", subjectName: file.fixture.name, chart: file.chart,
    sections: [
      rowOf("foundation", file.interpretation.foundation, [], 0),
      ...rows.map((r) => rowOf(r.section, file.interpretation[r.section], faultsOf(r), r.words)),
    ],
  };
}

function labClient(): { api: string; call: (path: string, init?: RequestInit) => Promise<Record<string, unknown>> } | null {
  const api = (process.env.LAB_API ?? opt("remote") ?? "").replace(/\/+$/, "");
  const token = process.env.LAB_TOKEN;
  if (!api || !token) return null;
  const call = async (path: string, init?: RequestInit): Promise<Record<string, unknown>> => {
    const res = await fetch(`${api}/api/admin/lab${path}`, {
      ...init,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(body)}`);
    return body;
  };
  return { api, call };
}

function requireLab() {
  const lab = labClient();
  if (!lab) throw new Error("LAB_API (or --remote) and LAB_TOKEN must be set to reach the panel (MB-69).");
  return lab;
}

function loadRun(name: string, label: string): RunFile {
  const path = join(REPORTS_DIR, `${name}.${label}.json`);
  if (!existsSync(path)) throw new Error(`no run at ${path}. ${RUNS_HINT}`);
  return JSON.parse(readFileSync(path, "utf8")) as RunFile;
}

/** Post one stored run to the panel; the server replaces the run_key. Silent when the panel is not configured. */
async function publishRun(name: string, label: string, file: RunFile): Promise<void> {
  const lab = labClient();
  if (!lab) return;
  const payload = runRows(name, label, file);
  await lab.call("/runs", { method: "POST", body: JSON.stringify(payload) });
  const cost = payload.sections.reduce((n, r) => n + (r.costUsd ?? 0), 0);
  console.log(`published ${payload.runKey} to ${lab.api}: ${payload.sections.length} rows, ${usd(cost)}`);
}

/** --publish <fixture>.<label>[,...]: stored files into Runs, which is how the r05 and r06 runs become the baseline (MB-72). */
async function publishMany(keys: string[]): Promise<void> {
  requireLab();
  for (const key of keys) {
    const dot = key.lastIndexOf(".");
    if (dot <= 0) throw new Error(`--publish takes <fixture>.<label>, got "${key}"`);
    const name = key.slice(0, dot), label = key.slice(dot + 1);
    await publishRun(name, label, loadRun(name, label));
  }
}

/** Numbers for a label: from the run files on disk when they are here, else from the panel. */
async function numbersFor(label: string, charts: readonly string[]): Promise<RunNumbers[]> {
  const onDisk = charts.filter((c) => existsSync(join(REPORTS_DIR, `${c}.${label}.json`)));
  if (onDisk.length) {
    return onDisk.flatMap((c) => runRows(c, label, loadRun(c, label)).sections
      .map((r) => ({ fixture: c, label, section: r.section, words: r.words, costUsd: r.costUsd, faults: r.faults, status: "done" })));
  }
  const lab = requireLab();
  const body = await lab.call(`/runs?label=${encodeURIComponent(label)}`);
  return (body.runs as RunNumbers[] | undefined) ?? [];
}

/** The newest release label the panel holds, else r06, the first baseline (ADR-76). */
async function lastReleaseLabel(): Promise<string> {
  const lab = labClient();
  if (!lab) return "r06";
  const body = await lab.call("/runs");
  const labels = ((body.runs as RunNumbers[] | undefined) ?? []).map((r) => r.label).filter((l) => /^release-/.test(l));
  return labels.length ? [...new Set(labels)].sort().at(-1)! : "r06";
}

/** --gate <label> --against <label|last-release>: the release gate; exit 1 with the reasons (ADR-76). */
async function gate(label: string, against: string): Promise<void> {
  const reference = against === "last-release" ? await lastReleaseLabel() : against;
  const [ref, cand] = await Promise.all([numbersFor(reference, MATRIX_CHARTS), numbersFor(label, MATRIX_CHARTS)]);
  const problems = gateProblems(ref, cand);
  const refCost = ref.reduce((n, r) => n + (r.costUsd ?? 0), 0), candCost = cand.reduce((n, r) => n + (r.costUsd ?? 0), 0);
  console.log(`gate: ${label} against ${reference}: ${cand.length} rows against ${ref.length}; cost ${usd(candCost)} against ${usd(refCost)}`);
  if (problems.length) {
    console.log(`GATE RED: ${problems.length} reason(s)`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log("gate green: no new fault, every total inside its band, cost within tolerance.");
}

/** A stored run with one contract fault written into its career section: the gate rehearsal's red case. */
export function seedFault(file: RunFile): RunFile {
  const copy = JSON.parse(JSON.stringify(file)) as RunFile;
  const career = copy.interpretation.career as Record<string, unknown> | undefined;
  if (!career) throw new Error("the run has no career section to seed");
  const key = Object.keys(career).find((k) => typeof career[k] === "string");
  if (!key) throw new Error("the career section has no prose to seed");
  career[key] = `${career[key] as string} You wait — then act.`;
  return copy;
}

/** --stub <label> --from <label> [--seed-fault]: copies of stored runs under a new label, published when the panel is configured. */
async function stub(label: string, from: string, seed: boolean): Promise<void> {
  for (const name of MATRIX_CHARTS) {
    if (!existsSync(join(REPORTS_DIR, `${name}.${from}.json`))) { console.log(`no ${name}.${from} on disk, skipped`); continue; }
    const file = seed ? seedFault(loadRun(name, from)) : loadRun(name, from);
    writeFileSync(join(REPORTS_DIR, `${name}.${label}.json`), JSON.stringify(file, null, 2));
    console.log(`stubbed ${name}.${label} from ${from}${seed ? " with a seeded fault in career" : ""}`);
    await publishRun(name, label, file);
  }
}

/** --dry --base <label>: level 0, every prompt rendered on staging for the base's charts, tokens against the baseline, no call. */
async function dry(base: string): Promise<void> {
  const lab = requireLab();
  const body = await lab.call(`/dry?base=${encodeURIComponent(base)}`);
  const rows = (body.rows as Array<{ fixture: string; section: string; inputTokens: number; baselineInputTokens: number | null; schemaOk: boolean }> | undefined) ?? [];
  console.log(`dry render against ${base}: ${rows.length} prompts, usage recorded ${String(body.usageRecorded ?? 0)}`);
  console.log(table(["fixture", "section", "tokens", "baseline", "delta", "schema"], rows.map((r) => [
    r.fixture, r.section, String(r.inputTokens), r.baselineInputTokens === null ? "-" : String(r.baselineInputTokens),
    r.baselineInputTokens === null ? "-" : `${r.inputTokens - r.baselineInputTokens >= 0 ? "+" : ""}${r.inputTokens - r.baselineInputTokens}`, r.schemaOk ? "ok" : "BROKEN",
  ])));
  const served = body.served as Record<string, boolean> | undefined;
  if (served) console.log(`served: ${Object.entries(served).map(([m, ok]) => `${m} ${ok ? "yes" : "NO"}`).join(", ")}`);
  const broken = rows.filter((r) => !r.schemaOk);
  if (broken.length) { console.log(`SCHEMA BROKEN: ${broken.map((r) => `${r.fixture}/${r.section}`).join(", ")}`); process.exitCode = 1; }
}

/** Poll a replay until every section is done or failed. */
async function pollReplay(lab: ReturnType<typeof requireLab>, runKey: string): Promise<Array<{ section: string; status: string; error: string | null }>> {
  const deadline = Date.now() + 20 * 60 * 1000;
  for (;;) {
    const body = await lab.call(`/replay/${encodeURIComponent(runKey)}`);
    const sections = (body.sections as Array<{ section: string; status: string; error: string | null }> | undefined) ?? [];
    if (sections.length && sections.every((x) => x.status === "done" || x.status === "failed")) return sections;
    if (Date.now() > deadline) throw new Error(`replay ${runKey} still running after 20 minutes`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

/** --spot <sections|pipeline> --charts a,b --base <label>: level 1, the changed sections replayed on Flex with the foundation held. */
async function spot(what: string, charts: string[], base: string): Promise<void> {
  const lab = requireLab();
  const sections = what === "pipeline" ? ["foundation", ...SECTION_IDS] : what.split(",").map((x) => x.trim()).filter(Boolean);
  for (const chart of charts) {
    const baseRunKey = `${chart}.${base}`;
    console.log(`\n=== spot ${sections.join(",")} on ${baseRunKey} ===`);
    const started = await lab.call("/replay", { method: "POST", body: JSON.stringify({ baseRunKey, model: "gpt-5.2", sections, serviceTier: "flex" }) });
    const runKey = started.runKey as string;
    const done = await pollReplay(lab, runKey);
    const failed = done.filter((x) => x.status === "failed");
    for (const f of failed) console.log(`FAILED ${f.section}: ${f.error}`);
    const compared = await lab.call(`/compare?a=${encodeURIComponent(baseRunKey)}&b=${encodeURIComponent(runKey)}`);
    const rows = (compared.rows as Array<{ section: string; words: [number, number]; costUsd: [number | null, number | null]; seconds: [number, number]; verdict: string }> | undefined) ?? [];
    console.log(table(["section", "words", "$", "s", "verdict"], rows.map((r) => [r.section, `${r.words[0]}→${r.words[1]}`, `${usd(r.costUsd[0])}→${usd(r.costUsd[1])}`, `${secs(r.seconds[0] * 1000)}→${secs(r.seconds[1] * 1000)}`, r.verdict])));
    const out = failed.find((f) => isOutOfCreditMessage(f.error ?? ""));
    if (out) throw new Error(`stopped at ${chart}/${out.section}: ${out.error}`);
    if (failed.length) process.exitCode = 1;
  }
}

/** --release <label>: level 2, the five matrix charts through the customer path, refused past the budget, stopped at the first out-of-credit failure. */
async function release(label: string, base: string): Promise<void> {
  const lab = requireLab();
  const spend = await lab.call("/spend");
  const spent = Number(spend.spentUsd ?? 0), budget = Number(spend.budgetUsd ?? 0);
  // A full natal report costs about 30 cents; the release lab is five of them (ADR-77).
  const estimate = MATRIX_CHARTS.length * 0.3;
  console.log(`lab spend this month ${usd(spent)} of ${usd(budget)}; the release lab needs about ${usd(estimate)}`);
  if (spent + estimate > budget) throw new Error(`refused: ${usd(spent)} spent plus ${usd(estimate)} would pass the ${usd(budget)} budget (LAB_BUDGET_USD)`);
  const failed: string[] = [];
  for (const name of MATRIX_CHARTS) {
    try {
      await runOneRemote(name, label, base);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAILED ${name}: ${message}`);
      failed.push(name);
      if (isOutOfCreditMessage(message)) { console.log(`out of credit on ${name}: the release lab stops here (ADR-77).`); break; }
    }
  }
  if (failed.length) throw new Error(`${failed.length} of ${MATRIX_CHARTS.length} charts failed: ${failed.join(", ")}`);
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
  // --all is the five matrix charts (ADR-77); the pair-only and blind fixtures run only when their own brain changed.
  const names = flag("all") ? [...MATRIX_CHARTS] : (opt("chart") ?? "marie-curie").split(",").map((x) => x.trim()).filter(Boolean);

  const publish = opt("publish");
  if (publish !== undefined) { await publishMany(publish.split(",").map((x) => x.trim()).filter(Boolean)); return; }
  const gateLabel = opt("gate");
  if (gateLabel !== undefined) { await gate(gateLabel, opt("against") ?? "last-release"); return; }
  const stubLabel = opt("stub");
  if (stubLabel !== undefined) {
    const from = opt("from");
    if (!from) throw new Error("--stub <label> needs --from <label>");
    await stub(stubLabel, from, flag("seed-fault"));
    return;
  }
  if (flag("dry")) { await dry(opt("base") ?? "r06"); return; }
  const spotWhat = opt("spot");
  if (spotWhat !== undefined) {
    const charts = (opt("charts") ?? "marie-curie,day-angular").split(",").map((x) => x.trim()).filter(Boolean);
    await spot(spotWhat, charts, opt("base") ?? "r06");
    return;
  }
  const releaseLabel = opt("release");
  if (releaseLabel !== undefined) {
    const base = (process.env.LAB_API ?? opt("remote") ?? "").replace(/\/+$/, "");
    if (!/^https?:\/\//.test(base)) throw new Error("--release needs LAB_API or --remote <web origin>");
    await release(releaseLabel, base);
    return;
  }

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
  // --pair alone, or --pair all, is the campaign; --pair <fixture> [--lens <lens>] is one run.
  const pairName = flag("pair") ? (opt("pair") ?? "all") : undefined;
  const pairFixture = pairName !== undefined && pairName !== "all" && !pairName.startsWith("--") ? pairName : null;
  const lensFlag = opt("lens") === "all" ? undefined : opt("lens");
  if (remote !== undefined) {
    if (!/^https?:\/\//.test(remote)) throw new Error(`--remote needs a web origin, got "${remote}"`);
    const base = remote.replace(/\/+$/, "");
    if (flag("pass")) { await runPassRemote(label, base); return; }
    if (pairName !== undefined) {
      if (pairFixture) await runPairRemote(pairFixture, lensFlag, label, base);
      else await runPairCampaign(label, base);
      return;
    }
    // Every fixture runs even when one fails: a measurement with four charts
    // and one named failure is worth more than a stop at the first.
    const failed: string[] = [];
    for (const name of names) {
      try {
        await runOneRemote(name, label, base);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`FAILED ${name}: ${message}`);
        failed.push(name);
        // A key with no credits fails every chart the same way; one named failure says more than five (ADR-77).
        if (isOutOfCreditMessage(message)) { console.log(`out of credit on ${name}: the campaign stops here.`); break; }
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

  if (flag("pass")) {
    await runPassLocal(label);
  } else if (pairName !== undefined) {
    if (pairFixture) await runPairLocal(pairFixture, lensFlag, label);
    else await runPairCampaign(label, undefined);
  } else {
    for (const name of names) {
      await runOne(name, label);
    }
  }

  const { pool } = await import("@workspace/db");
  await pool.end();
}

// Run only as a script: the test imports the measures without a run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

/**
 * Report lab — generate a natal report from a committed fixture and measure it,
 * so a prompt change can be judged before it reaches a paying customer.
 *
 *   pnpm report:lab --chart marie-curie
 *   pnpm report:lab --all --defaults-only --baseline
 *   pnpm report:lab --compare baseline latest
 *   pnpm report:lab --render                  # newest run on disk, no API call
 *   pnpm report:lab --render marie-curie.staging
 *   pnpm report:lab --remote https://starsdecoded-staging.vercel.app --all
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
import { WORD_TARGETS as REGISTRY_TARGETS, SECTION_IDS, validateClaims } from "../../api/src/prompts/index.js";
import type { NatalChartData } from "../../api/src/lib/chartCalculation.js";
/** Cost comes from the engine's own table, so the lab cannot disagree with the bill. */
import { costUsd, type ReportUsage, type SectionUsage } from "../../api/src/lib/usage.js";
const WORD_TARGETS: Record<string, [number, number]> = { ...REGISTRY_TARGETS };
/**
 * The product target (Owner, 2026-09-17). The per-section `wordTarget` bands in
 * the registry still sum to 3,500-4,000 and the prompts still name those
 * numbers, so the engine writes a little under this: 3,844 to 4,087 across the
 * five fixtures on 2026-09-16. A report reading OUT OF RANGE just below 4,000
 * is that known gap, not a regression. Closing it means raising the bands and
 * the prompt text with them, which is USER-FACING and needs its own lab run.
 * Decide with MB-38.
 */
const REPORT_TOTAL: [number, number] = [4000, 4500];

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
}

function measure(interpretation: Record<string, unknown>, chart?: NatalChartData): SectionRow[] {
  return SECTION_IDS.map((section) => {
    const value = interpretation[section];
    const stored = (value as { claims?: Array<{ quote: string; evidence: Array<{ ref: unknown }> }> } | undefined)?.claims ?? [];
    const asModel = stored.map((c) => ({ quote: c.quote, evidence: c.evidence.map((e) => e.ref) }));
    const problems = chart ? validateClaims(value, asModel as never, chart) : [];
    if (stored.length < 3) problems.push(`only ${stored.length} claims`);
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
  const row = (u: SectionUsage): string[] => [
    u.section.replace(/^natal:/, ""),
    String(u.attempts),
    u.inputTokens.toLocaleString("en-US"),
    u.cachedInputTokens.toLocaleString("en-US"),
    u.outputTokens.toLocaleString("en-US"),
    u.reasoningTokens.toLocaleString("en-US"),
    usd(costUsd(usage.model, { ...u })),
    secs(u.ms),
  ];
  const t = usage.totals;
  return table(
    ["call", "tries", "in", "cached", "out", "reason", "$", "s"],
    [
      ...usage.sections.map(row),
      ["TOTAL", String(t.attempts), t.inputTokens.toLocaleString("en-US"),
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
    r.inRange === null ? "-" : r.inRange ? "yes" : "NO",
    r.structured ? "yes" : "RAW",
    r.claims.problems.length ? `${r.claims.count} INVALID` : String(r.claims.count),
    [
      ...r.methodTalk.map((p) => `method:"${p}"`),
      ...r.bannedChars.map((c) => `char:${c}`),
      ...r.claims.problems.slice(0, 2).map((p) => `claim:${p}`),
    ].join(" ") || "-",
  ]);
  return table(head, body);
}

function renderMarkdown(
  fixture: ChartFixture,
  interpretation: Record<string, unknown>,
  rows: SectionRow[],
): string {
  const total = rows.reduce((n, r) => n + r.words, 0);
  const out: string[] = [
    `# ${fixture.name} — natal report`,
    "",
    `Generated ${new Date().toISOString()} by the report lab.`,
    `Birth data: ${fixture.birthDate} ${fixture.birthTime}, ` +
      `${fixture.latitude}, ${fixture.longitude} (UTC${fixture.timezoneOffset >= 0 ? "+" : ""}${fixture.timezoneOffset}).`,
    "",
    `**Total: ${total} words**`,
    "",
    "```",
    renderTable(rows),
    "```",
    "",
    "---",
    "",
  ];
  for (const section of SECTION_IDS) {
    const value = interpretation[section];
    if (value === undefined) continue;
    out.push(`## ${section}`, "");
    out.push(
      typeof value === "string" ? value : "```json\n" + JSON.stringify(value, null, 2) + "\n```",
    );
    out.push("");
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

function compare(labelA: string, labelB: string): void {
  const names = listFixtures();
  let compared = 0;

  for (const name of names) {
    const pathA = join(REPORTS_DIR, `${name}.${labelA}.json`);
    const pathB = join(REPORTS_DIR, `${name}.${labelB}.json`);
    if (!existsSync(pathA) || !existsSync(pathB)) continue;
    compared++;

    const fileA = JSON.parse(readFileSync(pathA, "utf8"));
    const fileB = JSON.parse(readFileSync(pathB, "utf8"));
    const a = fileA.interpretation, b = fileB.interpretation;
    const rowsA = measure(a, fileA.chart);
    const rowsB = measure(b, fileB.chart);

    console.log(`\n=== ${name}: ${labelA} → ${labelB} ===`);
    for (let i = 0; i < rowsA.length; i++) {
      const ra = rowsA[i];
      const rb = rowsB[i];
      const same = proseOf(a[ra.section]) === proseOf(b[rb.section]);
      const delta = rb.words - ra.words;
      const sign = delta > 0 ? `+${delta}` : String(delta);
      console.log(
        `${ra.section.padEnd(16)} ${String(ra.words).padStart(4)} → ${String(rb.words).padStart(4)}` +
          ` (${sign.padStart(5)})  ${same ? "identical" : "CHANGED"}`,
      );
    }
  }

  if (compared === 0) {
    console.log(`No fixture has both a "${labelA}" and a "${labelB}" run in ${REPORTS_DIR}.`);
  }
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

  // Re-measure a run already on disk. No API call, no key, no spend: the way to
  // re-read a measurement, to check a change to this file's own output, or to
  // get a real interpretation in front of the UI without generating one.
  if (flag("render")) {
    const run = opt("render") ?? newestRun();
    const path = join(REPORTS_DIR, `${run.replace(/\.json$/, "")}.json`);
    if (!existsSync(path)) throw new Error(`no run at ${path}. ${RUNS_HINT}`);
    const file = JSON.parse(readFileSync(path, "utf8"));
    const generated = file.interpretation?.meta?.generatedAt;
    console.log(`rendering ${run}${generated ? `, generated ${generated}` : ""} (no API call)`);
    report(run, "render", file.fixture, file.chart, file.interpretation, "n/a");
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

/**
 * Report lab — generate a natal report from a committed fixture and measure it,
 * so a prompt change can be judged before it reaches a paying customer.
 *
 *   pnpm report:lab --chart marie-curie
 *   pnpm report:lab --all --defaults-only --baseline
 *   pnpm report:lab --compare baseline latest
 *
 * Requires DATABASE_URL (the meaning library and prompt overrides both live in
 * Postgres) and OPENAI_API_KEY. Each run costs one full report's worth of AI
 * calls per chart.
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
import { WORD_TARGETS as REGISTRY_TARGETS, SECTION_IDS } from "../../api/src/prompts/index.js";
const WORD_TARGETS: Record<string, [number, number]> = { ...REGISTRY_TARGETS };
const REPORT_TOTAL: [number, number] = [3500, 4000];

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
    return Object.values(value as Record<string, unknown>).map(proseOf).join(" ");
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
}

function measure(interpretation: Record<string, unknown>): SectionRow[] {
  return SECTION_IDS.map((section) => {
    const value = interpretation[section];
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
    };
  });
}

function renderTable(rows: SectionRow[]): string {
  const head = ["section", "words", "target", "ok", "struct", "flags"];
  const body = rows.map((r) => [
    r.section,
    String(r.words),
    r.target ? `${r.target[0]}-${r.target[1]}` : "-",
    r.inRange === null ? "-" : r.inRange ? "yes" : "NO",
    r.structured ? "yes" : "RAW",
    [
      ...r.methodTalk.map((p) => `method:"${p}"`),
      ...r.bannedChars.map((c) => `char:${c}`),
    ].join(" ") || "-",
  ]);
  const widths = head.map((_, i) =>
    Math.max(head[i].length, ...body.map((r) => r[i].length)),
  );
  const line = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
  return [line(head), line(widths.map((w) => "-".repeat(w))), ...body.map(line)].join("\n");
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

  const rows = measure(interpretation);
  const total = rows.reduce((n, r) => n + r.words, 0);

  console.log(renderTable(rows));
  const totalOk = total >= REPORT_TOTAL[0] && total <= REPORT_TOTAL[1];
  console.log(`\ntotal: ${total} words (target ${REPORT_TOTAL[0]}-${REPORT_TOTAL[1]}: ${totalOk ? "ok" : "OUT OF RANGE"}) in ${elapsed}s`);
  const meta = interpretation.meta as { promptVersion?: string; model?: string } | undefined;
  if (meta) console.log(`prompt ${meta.promptVersion} on ${meta.model}`);

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

    const a = JSON.parse(readFileSync(pathA, "utf8")).interpretation;
    const b = JSON.parse(readFileSync(pathB, "utf8")).interpretation;
    const rowsA = measure(a);
    const rowsB = measure(b);

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

  const label = flag("baseline") ? "baseline" : (opt("label") ?? "latest");
  const names = flag("all") ? listFixtures() : [opt("chart") ?? "marie-curie"];

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

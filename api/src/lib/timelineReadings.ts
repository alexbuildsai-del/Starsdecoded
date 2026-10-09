/**
 * Timeline's readings (ADR-210): one per event or life cycle per reader, then kept. A subscriber's setup writes them
 * from the engine's own list, one job each (ADR-302, 362); one no job holds is written the first time it is opened.
 * A reading goes through the report's own call path (ADR-84): strict output, every error carried into the retries and
 * then into one round alone, each call on the day's spend ledger (ADR-199) and each attempt's checks in the failure
 * log (ADR-85). It builds on the reader's own report. A row is claimed before it is written, so an open and a job at
 * once write it once; a failed reading, or a write that died with its process, is written again. A kept reading is
 * kept on a basis, the reader's chart and prompt version with their report's version (reading 10): once a new birth
 * time, prompt version or rewritten report moves it, the reader's own open queues one refresh, which writes it again
 * in place only if what it is written from moved, and the kept text answers until then (ADR-362). An account's opens
 * start at most `NEW_READINGS_A_DAY` new writes a UTC day; setup's writes stand under the spend cap alone (ADR-327).
 */
import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, lt, ne, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
import type { z as zc } from "zod";
import {
  askMessagesTable, db, jobsTable, profilesTable, reportsTable, timelineReadingsTable, timelineSetupsTable,
} from "@workspace/db";
import type { OpenTimelineReadingResponse } from "@workspace/api-zod";
import { hasHorizon, type NatalChartData } from "@workspace/engine";
import { SectionError, callStructured, type Carry, type SectionResult } from "./aiInterpretation.js";
import { recordChecks } from "./failureLog.js";
import { failureCodeOf, type FailureCode } from "./failureReasons.js";
import { logger } from "./logger.js";
import { MODELS } from "./models.js";
import { resolveSection } from "./promptLoader.js";
import { dailyCapUsd, spentTodayUsd, utcDay } from "./spendCap.js";
import {
  dayIn, eventByKey, readingTimes, validZone, type KeyedEvent, type ReaderChart, type ReadingState, type ReadingStatuses, type ReadingTimes,
} from "./timeline.js";
import { buildBrief } from "../prompts/brief.js";
import { EvidenceRefSchema, softenQuote } from "../prompts/evidence.js";
import { ordinal } from "../prompts/vocabulary.js";
import {
  EXCERPTS_MAX, EXCERPT_WORDS, READING_KEY, READING_MAX_TOKENS, ReadingSchema, TIMELINE_PROMPT_VERSION, checkReading, eventFacts,
  isCycle, readingPrompt, type Excerpt, type ReadingEvent, type ReadingInput, type ReadingOutput,
} from "../prompts/timeline/index.js";

type Opened = zc.infer<typeof OpenTimelineReadingResponse>;
export type TimelineReading = NonNullable<Opened["reading"]>;
export type BuildsOn = TimelineReading["buildsOn"];

/**
 * What opening a reading answers: the contract's three (200), unknown for a key nothing on the reader's chart reads
 * (404), or capped once the account has started the day's new readings (429), with the seconds until the next day.
 */
export type OpenedReading =
  | { status: "ready"; reading: TimelineReading; line: null }
  | { status: "writing"; reading: null; line: null }
  | { status: "failed"; reading: null; line: string }
  | { status: "unknown"; reading: null; line: null }
  | { status: "capped"; reading: null; line: string; retryAfterSeconds: number };

/** A row still writing after this long lost its process, so the next open or queue writes it again. */
export const WRITING_STALE_MS = 5 * 60_000;

/**
 * How long an open waits for the write it started before it answers writing and leaves the write running. A reading
 * on its first try lands well inside it, so the sheet rarely asks twice; a write that needs its round alone does not
 * hold the request.
 */
export const OPEN_WAIT_MS = 20_000;

/** The sheet's line when a reading could not be written, as `failureReasons.ts` words a failure; the next open writes it again. */
export const READING_FAILED_LINE = "We couldn't write this reading. Try again in a few minutes.";

/**
 * New readings an account's own opens may start a UTC day (ADR-327): a cap on what a browser can ask for, so setup's
 * writes, which come from the engine's list, never count against it.
 */
export const NEW_READINGS_A_DAY = 40;

/** Timeline's line at the day's cap, through /ux-copy: a kept reading still opens, so it speaks only of new ones. */
export const READINGS_CAP_LINE = "You've opened today's new readings. You can open more tomorrow.";

/** The report's chapters with claims, in the page's order (ADR-46), each by the title the report page prints. */
const CHAPTERS: ReadonlyArray<readonly [id: string, title: string]> = [
  ["overview", "Chart Overview"],
  ["mind", "Mind & Communication"],
  ["career", "Career & Calling"],
  ["money", "Money & Resources"],
  ["relationships", "Relationships & Intimacy"],
  ["family", "Family & Roots"],
  ["superpowers", "Strengths, Habits & Where You Can Grow"],
  ["discoveries", "Key Paradoxes & Discoveries"],
  ["focus", "Closing"],
];

export interface ReportPassages {
  excerpts: Excerpt[];
  buildsOn: BuildsOn;
}

/** The report a reading builds on, as the reader's row holds it: the name it was written for, and its text. */
export interface ReaderReport {
  name: string;
  interpretation: unknown;
}

/** The natal point's whole-sign house, from the chart's own houses, so an angle sits where the wheel draws it. */
function natalHouse(chart: NatalChartData, point: string): number | null {
  if (!hasHorizon(chart)) return null;
  if (point === "ascendant") return 1;
  if (point === "midheaven") {
    const found = Object.entries(chart.houses).find(([, cusp]) => cusp.sign === chart.angles.midheaven.sign);
    return found ? Number(found[0]) : null;
  }
  return chart.planets[point]?.house ?? null;
}

/**
 * What a reading is about in the chart (reading 10): the natal point it touches, and that point's house when the chart
 * has a horizon. A retrograde touches no point, so its house is the first it goes back over, the one it turns in.
 */
function pointOf(event: ReadingEvent, chart: NatalChartData): { target: string | null; house: number | null } {
  if (isCycle(event)) return { target: event.body, house: natalHouse(chart, event.body) };
  switch (event.kind) {
    case "contact":
      return { target: event.target, house: event.house };
    case "retrograde":
      return { target: null, house: event.houses[0] ?? null };
    case "eclipse":
      return event.near ? { target: event.near.target, house: natalHouse(chart, event.near.target) } : { target: null, house: null };
  }
}

const words = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean);

function houseCard(report: Record<string, unknown>, house: number): string | null {
  const cards = (report.houses as { houses?: unknown } | undefined)?.houses;
  if (!Array.isArray(cards)) return null;
  const card = cards.find((c) => (c as { house?: unknown } | null)?.house === house) as { reading?: unknown } | undefined;
  return typeof card?.reading === "string" && card.reading.trim() ? card.reading : null;
}

function cites(raw: unknown, target: string): boolean {
  const parsed = EvidenceRefSchema.safeParse(raw);
  if (!parsed.success) return false;
  const ref = parsed.data;
  switch (ref.kind) {
    case "placement":
    case "sect":
      return ref.body === target;
    case "aspect":
      return ref.body1 === target || ref.body2 === target;
    case "ruler":
      return ref.ruler === target;
    case "angle":
      return ref.angle === target;
    case "lot":
      return false;
  }
}

/** The quotes of a section's stored claims that cite the target, in the order the section keeps them. */
function citingQuotes(section: unknown, target: string): string[] {
  const claims = (section as { claims?: unknown } | null | undefined)?.claims;
  if (!Array.isArray(claims)) return [];
  return claims.flatMap((claim) => {
    const { quote, evidence } = (claim ?? {}) as { quote?: unknown; evidence?: unknown };
    if (typeof quote !== "string" || !quote.trim() || !Array.isArray(evidence)) return [];
    return evidence.some((e) => cites((e as { ref?: unknown } | null)?.ref, target)) ? [quote] : [];
  });
}

/** Every string a section prints, claims aside, one paragraph field at a time. */
function paragraphsOf(section: unknown): string[] {
  const out: string[] = [];
  const walk = (value: unknown, key?: string) => {
    if (key === "claims") return;
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach((v) => walk(v));
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k);
  };
  walk(section);
  return out;
}

/**
 * At most 120 words of a paragraph that hold the sentence the quote opens in, from that sentence on, with whole
 * sentences before it while they fit, so the passage always holds the words the claim cites and opens on a sentence.
 * The softened text keeps the paragraph's words one for one, so its word count finds the place.
 */
function passageAround(paragraph: string, quote: string): string {
  const all = words(paragraph);
  if (all.length <= EXCERPT_WORDS) return all.join(" ");
  const soft = softenQuote(paragraph);
  const opens = words(soft.slice(0, Math.max(soft.indexOf(softenQuote(quote)), 0))).length;
  const starts = all.flatMap((_, i) => (i === 0 || /[.!?]["”’')\]]*$/.test(all[i - 1]) ? [i] : []));
  const first = starts.filter((s) => s <= opens).pop() ?? 0;
  const end = Math.min(all.length, first + EXCERPT_WORDS);
  const start = starts.find((s) => s <= first && end - s <= EXCERPT_WORDS) ?? first;
  return all.slice(start, end).join(" ");
}

/** The chapter whose stored claims cite the target most, the earlier chapter on a tie, with the paragraphs they cite. */
function chapterFor(report: Record<string, unknown>, target: string): ReportPassages | null {
  let best: { id: string; title: string; quotes: string[] } | null = null;
  for (const [id, title] of CHAPTERS) {
    const quotes = citingQuotes(report[id], target);
    if (quotes.length > (best?.quotes.length ?? 0)) best = { id, title, quotes };
  }
  if (!best) return null;
  const { id, title, quotes } = best;
  const paragraphs = paragraphsOf(report[id]);
  const used = new Set<number>();
  const texts: string[] = [];
  for (const quote of quotes) {
    if (texts.length >= EXCERPTS_MAX) break;
    const soft = softenQuote(quote);
    const at = paragraphs.findIndex((p) => softenQuote(p).includes(soft));
    if (at < 0) {
      // A quote the stored text no longer holds word for word is still the claim's own sentence.
      texts.push(words(quote).slice(0, EXCERPT_WORDS).join(" "));
      continue;
    }
    if (used.has(at)) continue;
    used.add(at);
    texts.push(passageAround(paragraphs[at], quote));
  }
  return { excerpts: texts.map((text) => ({ source: `Your ${title} chapter`, text })), buildsOn: { kind: "chapter", chapter: id } };
}

/**
 * What a reading builds on (reading 10), computed in code: the house card of the point it touches when the chart has
 * a horizon and the report holds that card, else the chapter whose claims cite the point most, else nothing. Its
 * passages are at most three of 120 words; the prompt masks the name in them and puts each in a quote block.
 */
export function passagesFor(event: ReadingEvent, chart: NatalChartData, interpretation: unknown): ReportPassages {
  const report = (interpretation && typeof interpretation === "object" ? interpretation : {}) as Record<string, unknown>;
  const { target, house } = pointOf(event, chart);
  if (house !== null && hasHorizon(chart)) {
    const card = houseCard(report, house);
    if (card) {
      return {
        excerpts: [{ source: `Your ${ordinal(house)} house card`, text: words(card).slice(0, EXCERPT_WORDS).join(" ") }],
        buildsOn: { kind: "house", house },
      };
    }
  }
  return (target ? chapterFor(report, target) : null) ?? { excerpts: [], buildsOn: null };
}

const eventOf = (keyed: KeyedEvent): ReadingEvent => (keyed.kind === "sky" ? keyed.event : keyed.cycle);

/**
 * One reading through the report's call path, with no database: the event's facts, its stretches, the reader's age at
 * it and whether a cycle is behind them (`times`, today's unless given), the reader's brief and their report's
 * passages in, the reading out. Three attempts, each told every error so far, then one round alone that starts from
 * them all (ADR-84); a reading that loses that too rejects with its `SectionError`. Every call counts as the reader's
 * on the spend ledger, and every attempt's checks go to the failure log under the reader's report.
 */
export async function writeReading(
  reader: ReaderChart,
  key: string,
  event: ReadingEvent,
  report: ReaderReport,
  times: ReadingTimes = readingTimes(reader, event, new Date()),
): Promise<TimelineReading> {
  const { excerpts, buildsOn } = passagesFor(event, reader.chart, report.interpretation);
  const names = { name: report.name };
  const input: ReadingInput = { event, brief: buildBrief(reader.chart, report.name), excerpts, name: report.name, blind: reader.blind, ...times };
  const prompt = readingPrompt(input, await resolveSection(READING_KEY));
  const model = MODELS.timelineReading;
  const run = (carry?: Carry): Promise<SectionResult<ReadingOutput>> => {
    // Each round is a write of its own in the log, as a report's round alone is.
    const writeId = randomUUID();
    return callStructured<ReadingOutput>({
      usageKey: READING_KEY,
      model,
      system: prompt.system,
      user: prompt.user,
      schema: ReadingSchema,
      maxTokens: READING_MAX_TOKENS,
      validate: (output) => checkReading(output, input),
      carry,
      spend: "timeline",
      names,
      onChecks: (checks, at) => recordChecks({ kind: "timeline", section: READING_KEY, model, writeId, reportId: reader.reportId, attempt: at.attempt, final: at.final, checks }),
    });
  };
  let result: SectionResult<ReadingOutput>;
  try {
    result = await run();
  } catch (err) {
    if (!(err instanceof SectionError)) throw err;
    logger.warn({ section: READING_KEY, errors: err.errors.length }, "a Timeline reading lost its attempts; one round alone");
    result = await run({ errors: err.errors, lastReply: err.lastReply ?? "" });
  }
  return { key, line: result.data.line, body: result.data.body, buildsOn, writtenAt: new Date() };
}

/** The brief's decimals: every degree and orb it prints. */
const DECIMALS = /\d+\.\d+/g;

/**
 * A value with its keys in one order at every depth. A chart read back from its jsonb column has Postgres's key order,
 * not the engine's, and the brief words a tie in key order, so one chart would otherwise digest two ways.
 */
function canonical<T>(value: T): T {
  if (Array.isArray(value)) return value.map(canonical) as T;
  if (value === null || typeof value !== "object" || value instanceof Date) return value;
  const fields = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(fields).sort().map((key) => [key, canonical(fields[key])])) as T;
}

/**
 * What a reading is written from, as one digest (reading 10): the prompt family's version, THE EVENT's facts, the
 * chart brief, the report passages it builds on and its `times`, as `writeReading` hands them over. The brief counts by
 * its words, its degrees and orbs aside: a reading may name no degree THE EVENT does not list (checks.ts), so a birth
 * time that moves the chart a little touches only the readings whose own facts it moves. Its stretches count by the
 * days the facts print them on, in the chart's own zone, for the same reason; a cycle that passes moves it.
 */
function inputsOf(reader: ReaderChart, event: ReadingEvent, report: ReaderReport, times: ReadingTimes): string {
  const chart = canonical(reader.chart);
  const brief = buildBrief(chart, report.name);
  const blind = reader.blind || brief.horizon === "unknown";
  const { excerpts } = passagesFor(event, chart, report.interpretation);
  const zone = validZone(chart.timezone) ?? "UTC";
  const spans = times.spans.map((span) => [dayIn(span.start, zone), dayIn(span.end, zone)]);
  const inputs = [
    TIMELINE_PROMPT_VERSION, blind, eventFacts(event, brief.chart, blind).lines, brief.text.replace(DECIMALS, "#"), excerpts, spans, times.age, times.passed,
  ];
  return createHash("sha256").update(JSON.stringify(inputs)).digest("hex").slice(0, 32);
}

const BuildsOnSchema = z.union([
  z.object({ kind: z.literal("house"), house: z.number().int().min(1).max(12) }),
  z.object({ kind: z.literal("chapter"), chapter: z.string() }),
  z.null(),
]);

/**
 * A reading as its row keeps it; the key is the row's. `of` is what it was written from (`inputsOf`), absent on one
 * kept before readings carried it. `passed` is whether it was written for a cycle already behind the reader, absent
 * before readings carried it and read as not. `tried` is the basis a refresh failed to write it on and the UTC day it
 * failed, so a setup screen read every few seconds does not pay for the same failure again that day.
 */
const KeptSchema = z.object({
  line: z.string(),
  body: z.string(),
  buildsOn: BuildsOnSchema,
  writtenAt: z.string(),
  of: z.string().optional(),
  passed: z.boolean().optional(),
  tried: z.object({ basis: z.string(), on: z.string() }).optional(),
});

function keptOf(reading: TimelineReading, of: string, passed: boolean): z.infer<typeof KeptSchema> {
  return { line: reading.line, body: reading.body, buildsOn: reading.buildsOn, writtenAt: reading.writtenAt.toISOString(), of, passed };
}

/**
 * Whether a cycle has passed since its reading was kept (Review 05/10 §4): the reading of a cycle ahead is written again
 * once, short, when the cycle goes behind the reader, on the basis it stands on. A sky event is never behind.
 */
function passedSince(kept: { passed?: boolean }, passed: boolean): boolean {
  return (kept.passed ?? false) !== passed;
}

const FailedSchema = z.object({ line: z.string() });

interface ReadingRow {
  id: string;
  eventKey: string;
  basis: string;
  status: string;
  reading: unknown;
  updatedAt: Date;
}

const ROW = {
  id: timelineReadingsTable.id,
  eventKey: timelineReadingsTable.eventKey,
  basis: timelineReadingsTable.basis,
  status: timelineReadingsTable.status,
  reading: timelineReadingsTable.reading,
  updatedAt: timelineReadingsTable.updatedAt,
};

async function rowsOf(profileId: string, keys: readonly string[]): Promise<ReadingRow[]> {
  if (!keys.length) return [];
  const t = timelineReadingsTable;
  return db.select(ROW).from(t).where(and(eq(t.profileId, profileId), inArray(t.eventKey, [...keys])));
}

const staleAt = (now: number): number => now - WRITING_STALE_MS;
const isStale = (row: ReadingRow, now: number): boolean => row.status === "writing" && row.updatedAt.getTime() < staleAt(now);

/** A kept reading's basis follows the reader's with `|` and its report's version (`keptBasis`). */
const BASIS_SEP = "|";

/** Whether a row was written on the reader's basis, their chart and prompt version, whatever its report's version. */
const onBasis = (row: ReadingRow, basis: string): boolean => row.basis.split(BASIS_SEP)[0] === basis;

function keptReading(row: ReadingRow): TimelineReading | null {
  const kept = KeptSchema.safeParse(row.reading);
  if (!kept.success) return null;
  const writtenAt = new Date(kept.data.writtenAt);
  return { key: row.eventKey, line: kept.data.line, body: kept.data.body, buildsOn: kept.data.buildsOn, writtenAt: Number.isNaN(writtenAt.getTime()) ? row.updatedAt : writtenAt };
}

function failedLine(row: ReadingRow): string {
  const failed = FailedSchema.safeParse(row.reading);
  return failed.success ? failed.data.line : READING_FAILED_LINE;
}

const writing = (): OpenedReading => ({ status: "writing", reading: null, line: null });
const unknown = (): OpenedReading => ({ status: "unknown", reading: null, line: null });
const failed = (line: string): OpenedReading => ({ status: "failed", reading: null, line });

/**
 * What a row answers an open, or null when the open should write it: a kept reading on any basis, since one gone stale
 * answers until its refresh lands (reading 10), and a write on the reader's basis still going.
 */
function answerOf(row: ReadingRow, basis: string, now: number): OpenedReading | null {
  if (row.status === "ready") {
    const reading = keptReading(row);
    return reading ? { status: "ready", reading, line: null } : null;
  }
  return row.status === "writing" && onBasis(row, basis) && !isStale(row, now) ? writing() : null;
}

interface Claim {
  id: string;
  /** The claim's own mark: the write lands only on the row it claimed, never on one claimed again since. */
  at: Date;
}

/**
 * Takes the row for writing, atomically: a new row, a write that died, a failed or unfinished write on another basis,
 * or, for the reader's own open, one that failed or whose kept reading no longer parses. A kept reading is never taken,
 * since one gone stale is written again by its refresh, in place (reading 10). Postgres rechecks the condition on a row
 * another claim just took, so of two claims at once exactly one wins.
 */
async function claim(reader: ReaderChart, key: string, retryFailed: boolean, unreadable?: ReadingRow): Promise<Claim | null> {
  const t = timelineReadingsTable;
  const at = new Date();
  const model = MODELS.timelineReading;
  const [made] = await db
    .insert(t)
    .values({ id: randomUUID(), userId: reader.userId, profileId: reader.profileId, eventKey: key, basis: reader.basis, status: "writing", reading: null, model, createdAt: at, updatedAt: at })
    .onConflictDoNothing({ target: [t.profileId, t.eventKey] })
    .returning({ id: t.id });
  if (made) return { id: made.id, at };
  const [taken] = await db
    .update(t)
    .set({ userId: reader.userId, basis: reader.basis, status: "writing", reading: null, model, updatedAt: at })
    .where(and(
      eq(t.profileId, reader.profileId),
      eq(t.eventKey, key),
      or(
        and(ne(t.status, "ready"), sql`split_part(${t.basis}, ${BASIS_SEP}, 1) <> ${reader.basis}`),
        and(eq(t.status, "writing"), lt(t.updatedAt, new Date(staleAt(at.getTime())))),
        retryFailed ? eq(t.status, "failed") : undefined,
        // A kept reading that no longer parses is as good as none; the mark on it keeps two opens from both retaking it.
        unreadable ? and(eq(t.status, "ready"), eq(t.updatedAt, unreadable.updatedAt)) : undefined,
      ),
    ))
    .returning({ id: t.id });
  return taken ? { id: taken.id, at } : null;
}

/** Keeps what came of a claimed write, on the basis given, else the one it was claimed on. */
async function keep(claimed: Claim, status: "ready" | "failed", reading: object, basis?: string): Promise<boolean> {
  const t = timelineReadingsTable;
  const done = await db
    .update(t)
    .set({ status, reading, updatedAt: new Date(), ...(basis === undefined ? {} : { basis }) })
    .where(and(eq(t.id, claimed.id), eq(t.status, "writing"), eq(t.updatedAt, claimed.at)))
    .returning({ id: t.id });
  return done.length > 0;
}

/**
 * A Personal report's version (reading 10): a digest of its stored text, which every write of it, a horizon pass's
 * included, moves. A report being amended reads `revising` while its text still moves.
 */
const REPORT_VERSION = sql<string | null>`left(md5(${reportsTable.interpretation}::text), 16)`;

interface VersionedReport {
  version: string;
  status: string;
}

/** The basis a reading is kept on (reading 10): the reader's, their chart and prompt version, with their report's version. */
function keptBasis(reader: ReaderChart, report: VersionedReport): string {
  return `${reader.basis}${BASIS_SEP}${report.version}`;
}

const readerReport = (reader: ReaderChart) => and(eq(reportsTable.id, reader.reportId), eq(reportsTable.profileId, reader.profileId));

async function reportOf(reader: ReaderChart): Promise<(ReaderReport & VersionedReport & { updatedAt: Date }) | null> {
  const [row] = await db
    .select({
      name: profilesTable.name, interpretation: reportsTable.interpretation, status: reportsTable.status, version: REPORT_VERSION,
      updatedAt: reportsTable.updatedAt,
    })
    .from(reportsTable)
    .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
    .where(readerReport(reader))
    .limit(1);
  return row ? { ...row, version: row.version ?? "" } : null;
}

async function reportVersionOf(reader: ReaderChart): Promise<VersionedReport | null> {
  const [row] = await db.select({ status: reportsTable.status, version: REPORT_VERSION }).from(reportsTable).where(readerReport(reader)).limit(1);
  return row ? { status: row.status, version: row.version ?? "" } : null;
}

/**
 * Writes a claimed reading and keeps what came of it. Never rejects, so an open may stop waiting and a queue may leave
 * it running. A reading is kept with what it was written from, on the basis its report gives; a write that fails keeps
 * the sheet's line on its row. Nothing the reader's report or the model wrote reaches the log, only the failure's code
 * (R-3.5).
 */
async function writeClaimed(reader: ReaderChart, key: string, keyed: KeyedEvent, claimed: Claim, now: Date): Promise<OpenedReading> {
  let outcome: OpenedReading;
  let stored: object;
  let basis: string | undefined;
  try {
    const report = await reportOf(reader);
    if (!report) throw new Error("the reader's Personal report is gone");
    const event = eventOf(keyed);
    const times = readingTimes(reader, event, now);
    const reading = await writeReading(reader, key, event, report, times);
    outcome = { status: "ready", reading, line: null };
    stored = keptOf(reading, inputsOf(reader, event, report, times), times.passed);
    basis = keptBasis(reader, report);
  } catch (err) {
    const code: FailureCode = failureCodeOf(err);
    logger.warn({ key, code }, "a Timeline reading failed");
    outcome = failed(READING_FAILED_LINE);
    stored = { code, line: READING_FAILED_LINE };
  }
  try {
    if (!(await keep(claimed, outcome.status === "ready" ? "ready" : "failed", stored, basis))) {
      logger.info({ key }, "a Timeline reading was claimed again or forgotten while it was written; its row is left as it is");
    }
  } catch (err) {
    // The row stays writing and goes stale, so a later open writes it again.
    logger.error({ err, key }, "a Timeline reading was written but could not be kept");
  }
  return outcome;
}

function within(work: Promise<OpenedReading>, ms: number): Promise<OpenedReading | null> {
  if (!(ms > 0)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    timer.unref();
    void work.then((outcome) => {
      clearTimeout(timer);
      resolve(outcome);
    });
  });
}

/**
 * Each account's new readings on the UTC day counted, kept in this process as the limits' counts are (ADR-199). Each
 * is taken as its write is claimed, never read back from the rows: a row is written again in place, so the rows
 * cannot say how many writes a day started.
 */
const started = { day: "", by: new Map<string, number>() };

/** Takes one of the account's new readings for the day, before its claim, so two opens at once cannot pass the cap together. */
function takeStart(userId: string, day: string): boolean {
  if (started.day !== day) {
    started.day = day;
    started.by.clear();
  }
  const count = started.by.get(userId) ?? 0;
  if (count >= NEW_READINGS_A_DAY) return false;
  started.by.set(userId, count + 1);
  return true;
}

function giveStartBack(userId: string, day: string): void {
  const count = started.day === day ? started.by.get(userId) : undefined;
  if (count === undefined) return;
  if (count > 1) started.by.set(userId, count - 1);
  else started.by.delete(userId);
}

function capped(now: Date): OpenedReading {
  const tomorrow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const retryAfterSeconds = Math.max(1, Math.ceil((tomorrow - now.getTime()) / 1000));
  return { status: "capped", reading: null, line: READINGS_CAP_LINE, retryAfterSeconds };
}

/**
 * Opens the reading of an event or a cycle on the reader's own chart. A key `eventByKey` does not find at `now`, or one
 * that gets no reading, is unknown and writes nothing. A kept reading answers at once, on any day and on any basis: one
 * gone stale answers until the refresh the reader's open queued lands (reading 10). So does a write still going on the
 * reader's basis, and one a setup job is on its way to write (reading 11). Anything else is a new write: refused once
 * the account has started the day's (`NEW_READINGS_A_DAY`, on the UTC day of `now`), else claimed and written, the open
 * waiting up to `waitMs` for it before it answers writing and leaves it running. How long a write has run is read on
 * the clock its row was written by, never `now`. The spend gate stands in front of the route, so it is not asked here.
 */
export async function openReading(reader: ReaderChart, key: string, options: { waitMs?: number; now?: Date } = {}): Promise<OpenedReading> {
  const now = options.now ?? new Date();
  const keyed = eventByKey(reader, key, now);
  if (!keyed) return unknown();
  const [row] = await rowsOf(reader.profileId, [key]);
  const answer = row ? answerOf(row, reader.basis, Date.now()) : null;
  if (answer) return answer;
  // A failed reading is written again by the reader's own open, set up or not; the job would leave it as it is.
  const failedHere = row?.status === "failed" && onBasis(row, reader.basis);
  if (!failedHere && (await readingsQueued(reader.profileId, [key])).has(key)) return writing();
  // A kept row that answered nothing above no longer parses.
  const unreadable = row?.status === "ready" ? row : undefined;
  const day = utcDay(now);
  if (!takeStart(reader.userId, day)) return capped(now);
  let claimed: Claim | null = null;
  try {
    claimed = await claim(reader, key, true, unreadable);
  } finally {
    // Only a claim that lands starts a write: one another open took first, or one that threw, gives its count back.
    if (!claimed) giveStartBack(reader.userId, day);
  }
  if (!claimed) {
    // Another open took it between the read and the claim: it is writing, or already written.
    const [taken] = await rowsOf(reader.profileId, [key]);
    const settled = taken ? answerOf(taken, reader.basis, Date.now()) : null;
    if (settled) return settled;
    return taken?.status === "failed" && onBasis(taken, reader.basis) ? failed(failedLine(taken)) : writing();
  }
  const write = writeClaimed(reader, key, keyed, claimed, now);
  return (await within(write, options.waitMs ?? OPEN_WAIT_MS)) ?? writing();
}

/**
 * Each key's reading as the views print it (R16-23's `ReadingStatuses`): ready with its own line, writing, or failed
 * with the sheet's line; a key with no row, or a write that died, is absent. A kept reading shows on any basis, since
 * one gone stale answers until its refresh lands (reading 10). Given the reader's basis, a write or a failure on another
 * is absent: the next open or job writes it again.
 */
export async function readingStatuses(profileId: string, keys: readonly string[], basis?: string): Promise<ReadingStatuses> {
  const statuses = new Map<string, ReadingState>();
  const now = Date.now();
  for (const row of await rowsOf(profileId, [...new Set(keys)])) {
    if (row.status === "ready") {
      const reading = keptReading(row);
      if (reading) statuses.set(row.eventKey, { status: "ready", line: reading.line });
    } else if (basis !== undefined && !onBasis(row, basis)) {
      continue;
    } else if (row.status === "writing") {
      if (!isStale(row, now)) statuses.set(row.eventKey, "writing");
    } else if (row.status === "failed") {
      statuses.set(row.eventKey, { status: "failed", line: failedLine(row) });
    }
  }
  return statuses;
}

/**
 * The spend gate's own rule (ADR-199) for writes no route stands in front of: none at a cap of 0 or once today's
 * spend reaches the cap, and, as the gate does, a sum that cannot be read lets the write go to the database it needs.
 */
export async function spendAllows(): Promise<boolean> {
  const capUsd = dailyCapUsd();
  if (!(capUsd > 0)) return false;
  try {
    return (await spentTodayUsd()) < capUsd;
  } catch (err) {
    logger.warn({ code: codeOf(err) }, "today's spend could not be read; Timeline's setup writes go ahead as the spend gate's requests do");
    return true;
  }
}

/**
 * A failure's code, never its message, which can carry what a row holds: the first `code` down its causes, since
 * Drizzle wraps Postgres' own, else the error's class, else "error".
 */
export function codeOf(err: unknown): string {
  let at: unknown = err;
  for (let depth = 0; at !== null && typeof at === "object" && depth < 4; depth += 1) {
    const code = (at as { code?: unknown }).code;
    if (typeof code === "string" && /^[\w.:-]{1,64}$/.test(code)) return code;
    at = (at as { cause?: unknown }).cause;
  }
  const name = (err as { name?: unknown } | null)?.name;
  return typeof name === "string" && /^\w{1,64}$/.test(name) ? name : "error";
}

/** A setup job's dedupe key: the kind first, since one key space serves every kind (jobs.ts). */
export function readingJobKey(profileId: string, key: string): string {
  return `timeline.reading:${profileId}:${key}`;
}

/** Which of the keys a setup job is still to write for the profile: queued, waiting for its day, or running. */
export async function readingsQueued(profileId: string, keys: readonly string[]): Promise<Set<string>> {
  const wanted = [...new Set(keys)];
  if (!wanted.length) return new Set();
  const prefix = readingJobKey(profileId, "");
  const rows = await db
    .select({ dedupeKey: jobsTable.dedupeKey })
    .from(jobsTable)
    .where(and(
      eq(jobsTable.kind, "timeline.reading"),
      inArray(jobsTable.status, ["queued", "running"]),
      inArray(jobsTable.dedupeKey, wanted.map((key) => readingJobKey(profileId, key))),
    ));
  return new Set(rows.map((row) => (row.dedupeKey ?? "").slice(prefix.length)));
}

/** The instant a key names, its UTC day, at which the event it names is one the app shows (`eventByKey`). */
function keyedAt(key: string): Date {
  const day = /(\d{4})(\d{2})(\d{2})$/.exec(key);
  return day ? new Date(Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]))) : new Date();
}

/**
 * What a setup job's write came to: written, kept as it stands, a key that names no reading, a paused day, or a row
 * another write holds until `until`, when a write that died with its process may be taken over.
 */
export type QueuedWrite =
  | { status: "written" | "kept" | "unknown" | "paused" }
  | { status: "held"; until: Date };

function heldUntil(row: ReadingRow): QueuedWrite {
  return { status: "held", until: new Date(row.updatedAt.getTime() + WRITING_STALE_MS) };
}

/**
 * Writes one reading for a setup job (ADR-302, 362), from a key the engine listed for the reader's chart, so no key a
 * browser sends reaches it. Its event is the one the key names on its own day, so the next six months, which the app
 * shows only once they come, are written a week ahead (reading 9). Missing is no row, an unreadable kept one, a write
 * that died, or a failed or unfinished write on another basis. A failed reading on the reader's basis waits for their
 * own open, and a kept one stays even gone stale: only a refresh the reader's own open queued writes it again, so a
 * start writes nothing again (reading 10). Behind the spend gate's rule, asked only once a write is due, and outside the
 * day's cap on an account's opens.
 */
export async function writeQueuedReading(reader: ReaderChart, key: string): Promise<QueuedWrite> {
  const keyed = eventByKey(reader, key, keyedAt(key));
  if (!keyed) return { status: "unknown" };
  const [row] = await rowsOf(reader.profileId, [key]);
  if (row?.status === "ready" && keptReading(row)) return { status: "kept" };
  if (row && onBasis(row, reader.basis)) {
    if (row.status === "failed") return { status: "kept" };
    if (row.status === "writing" && !isStale(row, Date.now())) return heldUntil(row);
  }
  if (!(await spendAllows())) return { status: "paused" };
  const claimed = await claim(reader, key, false, row?.status === "ready" ? row : undefined);
  if (!claimed) {
    // An open took it between the read and the claim: it is being written, or already is.
    const [taken] = await rowsOf(reader.profileId, [key]);
    return taken && taken.status === "writing" ? heldUntil(taken) : { status: "kept" };
  }
  // Whether a cycle is behind the reader is today's question, never the key's day the event was found on.
  await writeClaimed(reader, key, keyed, claimed, new Date());
  return { status: "written" };
}

/** A refresh job's dedupe key: the kind first, as a setup job's is. */
export function refreshJobKey(profileId: string, key: string): string {
  return `timeline.refresh:${profileId}:${key}`;
}

/** Whether a key names a cycle behind the reader at `now`, as its reading would be written then; a sky event never is. */
function behind(reader: ReaderChart, key: string, now: Date): boolean {
  if (!key.startsWith("cycle.")) return false;
  const keyed = eventByKey(reader, key, now);
  return keyed ? readingTimes(reader, eventOf(keyed), now).passed : false;
}

/**
 * Of the keys, in their order, those whose kept reading has gone stale (reading 10): kept on a basis other than the
 * reader's with their report's version now, or for a cycle that has passed since (`passedSince`), and not one a refresh
 * failed to write on that basis the same UTC day as `now`. None while the report is being amended, its text still
 * moving; the next open after that finds them.
 */
export async function staleReadings(reader: ReaderChart, keys: readonly string[], now: Date = new Date()): Promise<string[]> {
  const report = await reportVersionOf(reader);
  if (!report || report.status !== "complete") return [];
  const basis = keptBasis(reader, report);
  const day = utcDay(now);
  const unique = [...new Set(keys)];
  const stale = new Set<string>();
  for (const row of await rowsOf(reader.profileId, unique)) {
    const kept = row.status === "ready" ? KeptSchema.safeParse(row.reading) : null;
    if (!kept?.success || (kept.data.tried?.basis === basis && kept.data.tried.on === day)) continue;
    if (row.basis !== basis || passedSince(kept.data, behind(reader, row.eventKey, now))) stale.add(row.eventKey);
  }
  return unique.filter((key) => stale.has(key));
}

/** What a refresh came to: written again, moved onto the new basis as it stood, left as it is, or a paused day. */
export type Refreshed = { status: "rewritten" | "rebased" | "left" | "paused" };

/** A kept reading put back on its row on a new basis, only while the row is as the refresh read it. */
async function rekeep(row: ReadingRow, basis: string, reading: object, model?: string): Promise<boolean> {
  const t = timelineReadingsTable;
  const done = await db
    .update(t)
    .set({ basis, reading, updatedAt: new Date(), ...(model === undefined ? {} : { model }) })
    .where(and(eq(t.id, row.id), eq(t.status, "ready"), eq(t.basis, row.basis)))
    .returning({ id: t.id });
  return done.length > 0;
}

/**
 * A refresh job's write (reading 10). A kept reading gone stale is written again in place, its kept text answering
 * until the new one lands, and only if what it is written from moved (`inputsOf`); one whose facts, chart words and
 * passages are as they were moves onto the new basis with no call. One kept before readings carried that digest moves
 * over when its chart and prompt are the reader's and their report has not been written since it was, since then it
 * was written from the report as it stands. A cycle that has passed since its reading was kept is always written
 * again, once, short (`passedSince`), on whatever basis. Anything else is left as it is: a reading on the reader's
 * basis, a row with no kept text, which the reader's own open writes, and one whose report is being amended, which
 * their next open queues again. Behind the spend gate's rule; a write that fails keeps the kept text, marked so no
 * open queues it again before the next UTC day (`staleReadings`).
 */
export async function refreshReading(reader: ReaderChart, key: string): Promise<Refreshed> {
  const left: Refreshed = { status: "left" };
  const keyed = eventByKey(reader, key, keyedAt(key));
  if (!keyed) return left;
  const [row] = await rowsOf(reader.profileId, [key]);
  const kept = row?.status === "ready" ? KeptSchema.safeParse(row.reading) : null;
  if (!row || !kept?.success) return left;
  const report = await reportOf(reader);
  if (!report || report.status !== "complete") return left;
  const basis = keptBasis(reader, report);
  const event = eventOf(keyed);
  // Whether a cycle is behind the reader is today's question, never the key's day the event was found on.
  const times = readingTimes(reader, event, new Date());
  const passed = passedSince(kept.data, times.passed);
  if (row.basis === basis && !passed) return left;
  const of = inputsOf(reader, event, report, times);
  const unmoved = !passed && (kept.data.of === undefined
    ? onBasis(row, reader.basis) && report.updatedAt.getTime() <= Date.parse(kept.data.writtenAt)
    : kept.data.of === of);
  if (unmoved) {
    await rekeep(row, basis, { ...kept.data, of, passed: times.passed, tried: undefined });
    return { status: "rebased" };
  }
  if (!(await spendAllows())) return { status: "paused" };
  let reading: TimelineReading;
  try {
    reading = await writeReading(reader, key, event, report, times);
  } catch (err) {
    logger.warn({ key, code: failureCodeOf(err) }, "a stale Timeline reading could not be written again; its kept text stays");
    await rekeep(row, row.basis, { ...kept.data, tried: { basis, on: utcDay(new Date()) } });
    return left;
  }
  if (!(await rekeep(row, basis, keptOf(reading, of, times.passed), MODELS.timelineReading))) {
    logger.info({ key }, "a stale Timeline reading changed while it was written again; its row is left as it is");
  }
  return { status: "rewritten" };
}

// MB-191 provisional: a reader's readings and their Ask thread are kept with their Personal report, and go with it.
/**
 * Removes a profile's readings and its reader's Ask thread, together, with the reader's setup and the jobs still
 * waiting to write for them, so no queued write lands for a report that is gone. No foreign key does it (`timeline.ts`
 * in the schema), so the route that deletes the reader's own Personal report calls this after its own transaction.
 */
export async function forgetTimeline(userId: string, profileId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(timelineReadingsTable).where(eq(timelineReadingsTable.profileId, profileId));
    await tx.delete(askMessagesTable).where(eq(askMessagesTable.userId, userId));
    await tx.delete(timelineSetupsTable).where(eq(timelineSetupsTable.userId, userId));
    await tx.delete(jobsTable).where(and(
      eq(jobsTable.status, "queued"),
      or(
        and(inArray(jobsTable.kind, ["timeline.reading", "timeline.refresh"]), sql`${jobsTable.payload}->>'profileId' = ${profileId}`),
        and(eq(jobsTable.kind, "timeline.ahead"), sql`${jobsTable.payload}->>'userId' = ${userId}`),
      ),
    ));
  });
}

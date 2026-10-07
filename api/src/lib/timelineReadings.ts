/**
 * Timeline's readings (ADR-210): one per event or life cycle per reader, then kept. A subscriber's setup writes them
 * from the engine's own list, one job each (ADR-302, 362); one no job holds is written the first time it is opened.
 * A reading goes through the report's own call path (ADR-84): strict output, every error carried into the retries and
 * then into one round alone, each call on the day's spend ledger (ADR-199) and each attempt's checks in the failure
 * log (ADR-85). It builds on the reader's own report (reading 10). A row is claimed before it is written, so an open
 * and a job at once write it once; it is written again only when its basis no longer matches (reading 8), when it
 * failed, or when a write died with its process. An account's opens start at most `NEW_READINGS_A_DAY` new writes a
 * UTC day; setup's writes stand under the spend cap alone (ADR-327, 362).
 */
import { randomUUID } from "node:crypto";
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
import { eventByKey, type KeyedEvent, type ReaderChart, type ReadingState, type ReadingStatuses } from "./timeline.js";
import { buildBrief } from "../prompts/brief.js";
import { EvidenceRefSchema, softenQuote } from "../prompts/evidence.js";
import { ordinal } from "../prompts/vocabulary.js";
import {
  EXCERPTS_MAX, EXCERPT_WORDS, READING_KEY, READING_MAX_TOKENS, ReadingSchema, checkReading, isCycle, readingPrompt,
  type Excerpt, type ReadingEvent, type ReadingInput, type ReadingOutput,
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
 * One reading through the report's call path, with no database: the event's facts, the reader's brief and their
 * report's passages in, the reading out. Three attempts, each told every error so far, then one round alone that
 * starts from them all (ADR-84); a reading that loses that too rejects with its `SectionError`. Every call counts as
 * the reader's on the spend ledger, and every attempt's checks go to the failure log under the reader's report.
 */
export async function writeReading(reader: ReaderChart, key: string, event: ReadingEvent, report: ReaderReport): Promise<TimelineReading> {
  const { excerpts, buildsOn } = passagesFor(event, reader.chart, report.interpretation);
  const names = { name: report.name };
  const input: ReadingInput = { event, brief: buildBrief(reader.chart, report.name), excerpts, name: report.name, blind: reader.blind };
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

const BuildsOnSchema = z.union([
  z.object({ kind: z.literal("house"), house: z.number().int().min(1).max(12) }),
  z.object({ kind: z.literal("chapter"), chapter: z.string() }),
  z.null(),
]);

/** A reading as its row keeps it; the key is the row's. */
const KeptSchema = z.object({ line: z.string(), body: z.string(), buildsOn: BuildsOnSchema, writtenAt: z.string() });

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

/** What a row on the reader's basis answers an open, or null when the open should write it again. */
function answerOf(row: ReadingRow, now: number): OpenedReading | null {
  if (row.status === "ready") {
    const reading = keptReading(row);
    return reading ? { status: "ready", reading, line: null } : null;
  }
  if (row.status === "writing") return isStale(row, now) ? null : writing();
  return null;
}

interface Claim {
  id: string;
  /** The claim's own mark: the write lands only on the row it claimed, never on one claimed again since. */
  at: Date;
}

/**
 * Takes the row for writing, atomically: a new row, or one whose basis moved, whose write died, or, for the reader's
 * own open, one that failed or whose kept reading no longer parses. Postgres rechecks the condition on a row another claim just took, so of two claims at
 * once exactly one wins.
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
        ne(t.basis, reader.basis),
        and(eq(t.status, "writing"), lt(t.updatedAt, new Date(staleAt(at.getTime())))),
        retryFailed ? eq(t.status, "failed") : undefined,
        // A kept reading that no longer parses is as good as none; the mark on it keeps two opens from both retaking it.
        unreadable ? and(eq(t.status, "ready"), eq(t.updatedAt, unreadable.updatedAt)) : undefined,
      ),
    ))
    .returning({ id: t.id });
  return taken ? { id: taken.id, at } : null;
}

async function keep(claimed: Claim, status: "ready" | "failed", reading: object): Promise<boolean> {
  const t = timelineReadingsTable;
  const done = await db
    .update(t)
    .set({ status, reading, updatedAt: new Date() })
    .where(and(eq(t.id, claimed.id), eq(t.status, "writing"), eq(t.updatedAt, claimed.at)))
    .returning({ id: t.id });
  return done.length > 0;
}

async function reportOf(reader: ReaderChart): Promise<ReaderReport | null> {
  const [row] = await db
    .select({ name: profilesTable.name, interpretation: reportsTable.interpretation })
    .from(reportsTable)
    .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
    .where(and(eq(reportsTable.id, reader.reportId), eq(reportsTable.profileId, reader.profileId)))
    .limit(1);
  return row ?? null;
}

/**
 * Writes a claimed reading and keeps what came of it. Never rejects, so an open may stop waiting and a queue may leave
 * it running. A write that fails keeps the sheet's line on its row. Nothing the reader's report or the model wrote
 * reaches the log, only the failure's code (R-3.5).
 */
async function writeClaimed(reader: ReaderChart, key: string, keyed: KeyedEvent, claimed: Claim): Promise<OpenedReading> {
  let outcome: OpenedReading;
  let stored: object;
  try {
    const report = await reportOf(reader);
    if (!report) throw new Error("the reader's Personal report is gone");
    const reading = await writeReading(reader, key, eventOf(keyed), report);
    outcome = { status: "ready", reading, line: null };
    stored = { line: reading.line, body: reading.body, buildsOn: reading.buildsOn, writtenAt: reading.writtenAt.toISOString() };
  } catch (err) {
    const code: FailureCode = failureCodeOf(err);
    logger.warn({ key, code }, "a Timeline reading failed");
    outcome = failed(READING_FAILED_LINE);
    stored = { code, line: READING_FAILED_LINE };
  }
  try {
    if (!(await keep(claimed, outcome.status === "ready" ? "ready" : "failed", stored))) {
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
 * that gets no reading, is unknown and writes nothing. A kept reading on the reader's basis answers at once, and so
 * does one still being written, on any day, and one a setup job is on its way to write (reading 11). Anything else is
 * a new write: refused once the account has started the day's (`NEW_READINGS_A_DAY`, on the UTC day of `now`), else
 * claimed and written, the open waiting up to `waitMs` for it before it answers writing and leaves it running. How
 * long a write has run is read on the clock its row was written by, never `now`. The spend gate stands in front of the
 * route, so it is not asked here.
 */
export async function openReading(reader: ReaderChart, key: string, options: { waitMs?: number; now?: Date } = {}): Promise<OpenedReading> {
  const now = options.now ?? new Date();
  const keyed = eventByKey(reader, key, now);
  if (!keyed) return unknown();
  const [row] = await rowsOf(reader.profileId, [key]);
  const answer = row && row.basis === reader.basis ? answerOf(row, Date.now()) : null;
  if (answer) return answer;
  // A failed reading is written again by the reader's own open, set up or not; the job would leave it as it is.
  const failedHere = row !== undefined && row.basis === reader.basis && row.status === "failed";
  if (!failedHere && (await readingsQueued(reader.profileId, [key])).has(key)) return writing();
  const unreadable = row && row.basis === reader.basis && row.status === "ready" ? row : undefined;
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
    if (!taken || taken.basis !== reader.basis) return writing();
    if (taken.status === "failed") return failed(failedLine(taken));
    return answerOf(taken, Date.now()) ?? writing();
  }
  const write = writeClaimed(reader, key, keyed, claimed);
  return (await within(write, options.waitMs ?? OPEN_WAIT_MS)) ?? writing();
}

/**
 * Each key's reading as the views print it (R16-23's `ReadingStatuses`): ready with its own line, writing, or failed
 * with the sheet's line; a key with no row, or a write that died, is absent. Given the reader's basis, a reading kept
 * on another is absent too: its line may no longer be true, and its next open writes it again (reading 8).
 */
export async function readingStatuses(profileId: string, keys: readonly string[], basis?: string): Promise<ReadingStatuses> {
  const statuses = new Map<string, ReadingState>();
  const now = Date.now();
  for (const row of await rowsOf(profileId, [...new Set(keys)])) {
    if (basis !== undefined && row.basis !== basis) continue;
    if (row.status === "ready") {
      const reading = keptReading(row);
      if (reading) statuses.set(row.eventKey, { status: "ready", line: reading.line });
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
 * shows only once they come, are written a week ahead (reading 9). Missing is no row, a row on another basis, an
 * unreadable kept one, or a write that died; a failed reading waits for the reader's own open, and a kept one stays.
 * Behind the spend gate's rule, asked only once a write is due, and outside the day's cap on an account's opens.
 */
export async function writeQueuedReading(reader: ReaderChart, key: string): Promise<QueuedWrite> {
  const keyed = eventByKey(reader, key, keyedAt(key));
  if (!keyed) return { status: "unknown" };
  const [row] = await rowsOf(reader.profileId, [key]);
  if (row && row.basis === reader.basis) {
    if (row.status === "failed" || (row.status === "ready" && keptReading(row))) return { status: "kept" };
    if (row.status === "writing" && !isStale(row, Date.now())) return heldUntil(row);
  }
  if (!(await spendAllows())) return { status: "paused" };
  const unreadable = row && row.basis === reader.basis && row.status === "ready" ? row : undefined;
  const claimed = await claim(reader, key, false, unreadable);
  if (!claimed) {
    // An open took it between the read and the claim: it is being written, or already is.
    const [taken] = await rowsOf(reader.profileId, [key]);
    return taken && taken.status === "writing" ? heldUntil(taken) : { status: "kept" };
  }
  await writeClaimed(reader, key, keyed, claimed);
  return { status: "written" };
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

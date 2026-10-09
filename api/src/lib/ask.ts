/**
 * Ask (ADR-213, reading 12): a message in, two model calls, computed cards out. The plan reads the message and names
 * the tools; the server computes each tool from the reader's own chart and the reports they can read, and from nothing
 * else (reading 14, R-3.6); the answer writes the text and picks the cards it talks about. Fixed lines answer harm, a
 * question Ask does not take, an answer that never passed its checks, and the month's cap (reading 13, ADR-263).
 *
 * The thread keeps 31 days. A person card is kept as who and which day and computed again each time it is shown, and
 * a quote as which report and section, so neither shows once the reader can no longer read it (MB-191). A reply keeps
 * the reports and people it was written from, so its text goes too, from the thread and from what the model is sent
 * again (B-02). Nothing the reader types reaches a log line or a failure row (ADR-201): this file logs only an error's
 * class.
 *
 * An answer about someone the reader has no Compatibility report with keeps one offer of it, once a person in the
 * thread (Review 05/10 §8). It is kept as who, and shown with the reader's credits as the thread is read, only while
 * that person is still someone to pair with.
 */
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  askMessagesTable, db, profilesTable, relationshipParticipantsTable, relationshipsTable, reportsTable, type AskMessageRow,
} from "@workspace/db";
import { GetAskThreadResponse, type SendAskMessageBody } from "@workspace/api-zod";
import { dayTone, hasHorizon, longitudeAt, type CycleId, type NatalChartData, type Tone } from "@workspace/engine";
import { natalReportAccess, pairReadable, viewerRelationshipIds, type PairPerson, type ProfileHolders, type Viewer } from "./access.js";
import { callStructured, type Carry } from "./aiInterpretation.js";
import { getCredits } from "./credits.js";
import { recordChecks } from "./failureLog.js";
import { pairListed } from "./home.js";
import { logger } from "./logger.js";
import { MODELS } from "./models.js";
import { firstWord } from "./names.js";
import { LENSES, type Lens } from "./pairBrief.js";
import { chartForProfile } from "./profiles.js";
import { resolveSection } from "./promptLoader.js";
import { ownChartOf, sharedProfileIds } from "./shares.js";
import {
  RANGE_DAYS, chartIsStale, dayIn, dayStart, lifeView, nowView, readerChart, validZone,
  type LifeCycleView, type ReaderChart, type ReadingStatuses, type TimelineEvent, type TimelineRange,
} from "./timeline.js";
import { SECTION_IDS, buildBrief, sectionById } from "../prompts/index.js";
import { clean, fixed, type Check, type Validated } from "../prompts/checks.js";
import { DATA_CLOSE, DATA_LABELS, DATA_OPEN, QUOTE_MAX } from "../prompts/data.js";
import { pairChapterIds, pairChapterTitle } from "../prompts/pair/index.js";
import {
  ASK_KEYS, FALLBACK_LINE, HARM_REPLY, MESSAGE_MAX, OFF_TOPIC_LINE, askAnswerPrompt, askPlanPrompt, capLine, checkAskAnswer,
  maskedFor, namesIn,
  type AskAnswer, type AskAnswerCard, type AskAnswerInput, type AskContext, type AskCycle, type AskEvent, type AskPerson,
  type AskPlan, type AskPlanChoice, type AskPlanTool, type AskPrompt, type AskReport, type AskTurn,
} from "../prompts/ask/index.js";
import { NOT_PROSE } from "../prompts/evidence.js";

/** Reader messages a UTC calendar month, a tapped choice included (reading 13). The cap moves, never the price. */
export const ASK_MONTHLY_CAP = 50;

const DAY_MS = 86_400_000;
// MB-191 provisional: a thread keeps 31 days. No calendar month is longer, so the month's count never loses a row.
const KEPT_MS = 31 * DAY_MS;
/** One call, then one retry carrying every error so far (ADR-84's carry), then the fallback line. */
const ATTEMPTS = 2;
const HISTORY_SENT = 8;
/** A window is at most six months (reading 4's longest range). */
const WINDOW_MAX_DAYS = RANGE_DAYS["six-months"];
// A tool's day is one the chart lived, as a reading's key is (timeline.ts's KEYED_YEARS).
const LIFE_MS = 120 * 365.25 * DAY_MS;
/** Reading 10's passages: at most 120 words, which fits a quote block's line whole. */
const PASSAGE_WORDS = 120;
const PARAGRAPH_WORDS = 25;
/** A Personal report under a horizon pass keeps its text, so it reads as finished, as timeline.ts counts it. */
const FINISHED = ["complete", "revising"];
const NO_READINGS: ReadingStatuses = new Map();

type Thread = z.infer<typeof GetAskThreadResponse>;
export type AskThread = Thread;
export type AskMessage = Thread["messages"][number];
export type AskCard = AskMessage["cards"][number];
export type AskChoice = AskMessage["choices"][number];
export type AskUsage = Thread["usage"];
export type SendAskBody = z.infer<typeof SendAskMessageBody>;
type DayCard = Extract<AskCard, { kind: "day" }>;
type WindowCard = Extract<AskCard, { kind: "window" }>;
type CycleCard = Extract<AskCard, { kind: "cycle" }>;
type QuoteCard = Extract<AskCard, { kind: "quote" }>;
type PersonCard = Extract<AskCard, { kind: "person" }>;
type AskOffer = NonNullable<AskMessage["offer"]>;

/** The 429 body at the month's cap (ADR-263): its one line, and the day the count starts again. */
export interface AskCap {
  error: "ask_cap";
  message: string;
  resetsOn: string;
}

/** What `POST /ask` answers: the thread (200), the cap (429), a body it cannot take (400), or no reader (409). */
export type SendAskResult =
  | { kind: "thread"; thread: AskThread }
  | { kind: "cap"; cap: AskCap }
  | { kind: "invalid"; error: "validation_error" | "choice_not_offered"; message: string }
  | { kind: "no_personal_report" };

export interface AskOptions {
  now?: Date;
  /** The browser's zone when a route sends one; the birth place's otherwise (reading 4). */
  tz?: string | null;
}

/** Said when a body holds neither text nor a choice, or both. */
export const ASK_EMPTY_LINE = "Type a question, or tap one of the choices.";
/** Said when a tapped choice is not one Ask offered last, or names someone or a report the reader can no longer read. */
export const ASK_CHOICE_GONE_LINE = "That choice isn't open any more. Type your question instead.";
/** Said when the text is longer than the box takes. */
export const ASK_TOO_LONG_LINE = `Keep your question to ${MESSAGE_MAX} characters or fewer.`;
/** Shown in place of a reply written from a report or a person the reader can no longer read (R-3.6, B-02). */
export const ASK_HIDDEN_LINE = "This answer was about someone who stopped sharing, so it's hidden.";

/** The UTC month `now` falls in: its first instant, and the 1st of the next month, when the count starts again. */
export function monthOf(now: Date): { start: Date; resetsOn: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, resetsOn: next.toISOString().slice(0, 10) };
}

export function usageFrom(used: number, now: Date): AskUsage {
  return { used, left: Math.max(0, ASK_MONTHLY_CAP - used), cap: ASK_MONTHLY_CAP, resetsOn: monthOf(now).resetsOn };
}

export function capOf(now: Date): AskCap {
  const { resetsOn } = monthOf(now);
  return { error: "ask_cap", message: capLine(resetsOn), resetsOn };
}

const readerRowsSince = (userId: string, since: Date) =>
  and(eq(askMessagesTable.userId, userId), eq(askMessagesTable.role, "reader"), gte(askMessagesTable.createdAt, since));

/** The pool, or the transaction that holds the account's lock while it counts. */
type Queryable = Pick<typeof db, "select">;

async function usedThisMonth(userId: string, now: Date, on: Queryable = db): Promise<number> {
  const [row] = await on.select({ n: count() }).from(askMessagesTable).where(readerRowsSince(userId, monthOf(now).start));
  return Number(row?.n ?? 0);
}

/** Ask's messages this UTC month for Ask's box and the Account page (ADR-263). */
export async function askUsage(viewer: Viewer, now: Date = new Date()): Promise<AskUsage> {
  return usageFrom(viewer.userId ? await usedThisMonth(viewer.userId, now) : 0, now);
}

/** MB-191 provisional: on each read or send, so a thread never holds a message past its 31 days. */
async function forgetOld(userId: string, now: Date): Promise<void> {
  await db.delete(askMessagesTable).where(and(eq(askMessagesTable.userId, userId), lt(askMessagesTable.createdAt, new Date(now.getTime() - KEPT_MS))));
}

type Holder = ProfileHolders & { id: string; name: string; isSelf: boolean; claimedAsSelf: boolean };

/** One of the reader's natal reports as Ask weighs it: a row of GET /reports' reach. */
export interface NatalRow {
  reportId: string;
  status: string;
  sessionId: string;
  createdAt: Date;
  /** The chart's horizon as stored: a Personal report written without one has no house to quote. */
  horizon: string | null;
  profile: Holder;
}

/** What a person's chart is computed from, as a profile row holds it. */
export interface PersonBirth {
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes: number;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  timezone: string | null;
  chartData: unknown;
}

export type PartRow = PairPerson & { birth: PersonBirth };

export interface PairRow {
  reportId: string;
  status: string;
  createdAt: Date;
  promptVersion: string | null;
  relationship: { id: string; type: string; userId: string | null; sessionId: string };
  /** In position order. */
  parts: PartRow[];
}

export interface LibraryReport {
  /** Short and unique in a call, r1 first, mapped back here (re-pin 16). */
  id: string;
  reportId: string;
  kind: "personal" | "compatibility";
  /** The reader's own Personal report, the one Timeline reads. */
  own: boolean;
  /** As typed: one name for a Personal report, the pair's two in position order. */
  names: string[];
  sections: { id: string; title: string }[];
}

export interface LibraryPerson {
  /** Short and unique in a call, like p1. */
  id: string;
  profileId: string;
  name: string;
  /** The short id of the Compatibility report the reader sees them through. */
  report: string;
  reportId: string;
  relationshipId: string;
  birth: PersonBirth;
}

export interface Library {
  reports: LibraryReport[];
  people: LibraryPerson[];
}

/**
 * Every report the reader may open now, in any state and not only the newest, and everyone in a pair they read: a
 * rewrite or a newer report leaves a reply standing, and a stop takes it away.
 */
interface Reach {
  reports: ReadonlySet<string>;
  profiles: ReadonlySet<string>;
}

/** The library, the reach and the circle from one read of the rows, so the three never disagree about a stop. */
interface Readable {
  library: Library;
  reach: Reach;
  circle: CircleMember[];
}

/** Someone the reader's words may name, for the pair offer (Review 05/10 §8). */
export interface CircleMember {
  profileId: string;
  /** As typed on their profile. */
  name: string;
  /** A report of theirs to pair from, no pair with the reader, and none Ask reads them through. */
  offerable: boolean;
}

/** The reports and people a reply was written from, kept with it so it can hide once the reader can no longer read one. */
interface Sources {
  reports: string[];
  profiles: string[];
}

const NO_SOURCES: Sources = { reports: [], profiles: [] };

/** A natal report Ask may read: finished, and readable by the reader through its profile or a standing grant. */
export function natalReadable(viewer: Viewer, row: NatalRow, shared: ReadonlySet<string>): boolean {
  return FINISHED.includes(row.status) && natalReportAccess(viewer, row.profile, row, shared.has(row.profile.id)) !== null;
}

/**
 * A pair Ask may read: finished, listed as GET /reports lists it, and open to the reader by the pair reading, so a
 * pair closed by Stop sharing reads nothing, its other person included (MB-103, ADR-235).
 */
export function pairOpen(viewer: Viewer, row: PairRow, shared: ReadonlySet<string>): boolean {
  if (!FINISHED.includes(row.status) || row.parts.length !== 2) return false;
  if (!pairListed({ status: row.status, interpretation: { meta: { promptVersion: row.promptVersion } } })) return false;
  return pairReadable(viewer, row.relationship, row.parts, shared).readable;
}

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
// The web's chapter 10 is "Closing" (web/src/lib/chapters.ts); the writer's label for it is the section's own.
const NATAL_TITLES: Readonly<Record<string, string>> = { focus: "Closing" };
const HOUSE_SECTION = /^house-(\d{1,2})$/;

/**
 * A Personal report's sections by the titles the reader sees. The house cards are listed one by one only on the
 * reader's own report with a horizon, since Timeline's events land in the reader's houses; other reports list their
 * chapters.
 */
function natalSections(own: boolean, horizon: string | null): LibraryReport["sections"] {
  const sections: LibraryReport["sections"] = [];
  for (const id of SECTION_IDS) {
    if (id === "houses") {
      if (own && horizon !== null && horizon !== "unknown") ORDINALS.forEach((n, i) => sections.push({ id: `house-${i + 1}`, title: `${n} house` }));
      continue;
    }
    sections.push({ id, title: NATAL_TITLES[id] ?? sectionById(id)?.label ?? id });
  }
  return sections;
}

function pairSections(type: string): LibraryReport["sections"] {
  if (!LENSES.includes(type as Lens)) return [];
  return pairChapterIds(type as Lens).map((id) => ({ id, title: pairChapterTitle(id) }));
}

function newest<T extends { createdAt: Date }>(rows: readonly T[], keyOf: (row: T) => string): T[] {
  const kept = new Map<string, T>();
  for (const row of rows) {
    const held = kept.get(keyOf(row));
    if (!held || row.createdAt.getTime() > held.createdAt.getTime()) kept.set(keyOf(row), row);
  }
  return [...kept.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Everything Ask may read for this reader, from rows already fetched: the newest finished report of each person and
 * each pair they can read, the reader's own first, and everyone in an open pair but the reader as someone to ask
 * about. Pure over its rows, so each access is tested without a database.
 */
export function libraryOf(
  viewer: Viewer,
  natal: readonly NatalRow[],
  pairs: readonly PairRow[],
  shared: ReadonlySet<string>,
  ownProfileId: string | null,
): Library {
  const personal = newest(natal.filter((row) => natalReadable(viewer, row, shared)), (row) => row.profile.id);
  const own = personal.filter((row) => row.profile.id === ownProfileId);
  const open = newest(pairs.filter((row) => pairOpen(viewer, row, shared)), (row) => row.relationship.id);
  const reports: LibraryReport[] = [];
  const people: LibraryPerson[] = [];
  for (const row of [...own, ...personal.filter((r) => r.profile.id !== ownProfileId)]) {
    const isOwn = row.profile.id === ownProfileId;
    reports.push({ id: `r${reports.length + 1}`, reportId: row.reportId, kind: "personal", own: isOwn, names: [row.profile.name], sections: natalSections(isOwn, row.horizon) });
  }
  for (const row of open) {
    const report: LibraryReport = {
      id: `r${reports.length + 1}`,
      reportId: row.reportId,
      kind: "compatibility",
      own: false,
      names: row.parts.map((p) => p.name),
      sections: pairSections(row.relationship.type),
    };
    reports.push(report);
    for (const part of row.parts) {
      if (part.profileId === ownProfileId || people.some((p) => p.profileId === part.profileId)) continue;
      people.push({
        id: `p${people.length + 1}`,
        profileId: part.profileId,
        name: part.name,
        report: report.id,
        reportId: row.reportId,
        relationshipId: row.relationship.id,
        birth: part.birth,
      });
    }
  }
  return { reports, people };
}

/** A pair that failed or was called off is no pair: the reader may ask for one again. */
const NO_PAIR: ReadonlySet<string> = new Set(["failed", "cancelled"]);

/**
 * Everyone but the reader whom the pair offer weighs, from rows already fetched: the people of the Personal reports the
 * reader can read, and the people Ask reads through a pair. A pair with the reader that is written or being written,
 * or one Ask reads them through, means no offer, so Write it never asks for a second pair. Pure over its rows, as
 * `libraryOf` is.
 */
export function circleOf(
  viewer: Viewer,
  natal: readonly NatalRow[],
  pairs: readonly PairRow[],
  shared: ReadonlySet<string>,
  ownProfileId: string | null,
  library: Library,
): CircleMember[] {
  const paired = new Set<string>();
  for (const row of pairs) {
    if (NO_PAIR.has(row.status) || row.parts.length !== 2 || !row.parts.some((p) => p.profileId === ownProfileId)) continue;
    for (const part of row.parts) if (part.profileId !== ownProfileId) paired.add(part.profileId);
  }
  const circle = new Map<string, CircleMember>();
  for (const row of newest(natal.filter((r) => natalReadable(viewer, r, shared)), (r) => r.profile.id)) {
    if (row.profile.id === ownProfileId) continue;
    // A pair is written only from two complete Personal reports (routes/compatibility.ts), so one being revised waits.
    const offerable = row.status === "complete" && !paired.has(row.profile.id);
    circle.set(row.profile.id, { profileId: row.profile.id, name: row.profile.name, offerable });
  }
  for (const person of library.people) circle.set(person.profileId, { profileId: person.profileId, name: person.name, offerable: false });
  return [...circle.values()];
}

// Accents and curly apostrophes fold away, so "Tomas" typed on any keyboard names Tomás.
function folded(text: string): string {
  return text.normalize("NFD").replace(/\p{M}+/gu, "").replace(/[‘’]/g, "'").toLowerCase();
}

/** A name's whole words, folded: its full name and its first name, once each. */
function nameKeys(name: string): string[] {
  const words = folded(name).split(/\s+/).filter(Boolean);
  return [...new Set([words.join(" "), words[0] ?? ""])].filter(Boolean);
}

/** Where a folded name stands in folded text as whole words, else -1: "Oprah's" names Oprah, "Oprahs" does not. */
function nameAt(text: string, key: string): number {
  const words = key.split(" ").map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return text.search(new RegExp(`(?<![\\p{L}\\p{N}])${words.join("\\s+")}(?![\\p{L}\\p{N}])`, "u"));
}

/**
 * Whom an answer offers a pair with (Review 05/10 §8): the first person the reader's words name, newest words first,
 * whom Ask may offer one and has not offered one in this thread. A first name or a full name counts only while it is
 * one person's in the circle, the reader's own name included, so a name that could be two people offers neither.
 */
export function offerTarget(
  asked: readonly string[],
  circle: readonly CircleMember[],
  offered: ReadonlySet<string>,
  reader: string,
): CircleMember | null {
  const carried = new Map<string, number>();
  for (const name of [reader, ...circle.map((m) => m.name)]) {
    for (const key of nameKeys(name)) carried.set(key, (carried.get(key) ?? 0) + 1);
  }
  const open = circle.filter((m) => m.offerable && !offered.has(m.profileId));
  for (const text of asked.map(folded)) {
    let found: { member: CircleMember; at: number } | null = null;
    for (const member of open) {
      for (const key of nameKeys(member.name)) {
        const at = carried.get(key) === 1 ? nameAt(text, key) : -1;
        if (at >= 0 && (!found || at < found.at)) found = { member, at };
      }
    }
    if (found) return found.member;
  }
  return null;
}

/** The reach over the rows the library is drawn from: the same access checks, without its rules on state and version. */
function reachOf(viewer: Viewer, natal: readonly NatalRow[], pairs: readonly PairRow[], shared: ReadonlySet<string>): Reach {
  const reports = new Set<string>();
  const profiles = new Set<string>();
  for (const row of natal) {
    if (natalReportAccess(viewer, row.profile, row, shared.has(row.profile.id)) !== null) reports.add(row.reportId);
  }
  for (const row of pairs) {
    if (row.parts.length !== 2 || !pairReadable(viewer, row.relationship, row.parts, shared).readable) continue;
    reports.add(row.reportId);
    for (const part of row.parts) profiles.add(part.profileId);
  }
  return { reports, profiles };
}

/**
 * The same reach GET /reports and home's `natalRowsOf` have, in every state, without the report's text: the library
 * keeps the finished ones, and the reach all of them, so a report being rewritten hides no reply.
 */
async function natalRowsFor(viewer: Viewer, shared: ReadonlySet<string>): Promise<NatalRow[]> {
  if (!viewer.userId) return [];
  const reach = or(
    eq(profilesTable.userId, viewer.userId),
    eq(profilesTable.claimedByUserId, viewer.userId),
    ...(shared.size ? [inArray(profilesTable.id, [...shared])] : []),
  );
  const rows = await db
    .select({
      reportId: reportsTable.id,
      status: reportsTable.status,
      sessionId: reportsTable.sessionId,
      createdAt: reportsTable.createdAt,
      horizon: sql<string | null>`${profilesTable.chartData}->'horizon'->>'status'`,
      profile: {
        id: profilesTable.id,
        name: profilesTable.name,
        userId: profilesTable.userId,
        sessionId: profilesTable.sessionId,
        claimedByUserId: profilesTable.claimedByUserId,
        isSelf: profilesTable.isSelf,
        claimedAsSelf: profilesTable.claimedAsSelf,
      },
    })
    .from(reportsTable)
    .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
    .where(and(eq(reportsTable.type, "natal"), reach));
  return rows;
}

/** The reader's pairs' reports in every state, for the same reason as `natalRowsFor`. */
async function pairRowsFor(viewer: Viewer): Promise<PairRow[]> {
  const { owned, participant } = await viewerRelationshipIds(viewer);
  const ids = [...new Set([...owned, ...participant])];
  if (!ids.length) return [];
  const [reports, parts] = await Promise.all([
    db
      .select({
        reportId: reportsTable.id,
        status: reportsTable.status,
        createdAt: reportsTable.createdAt,
        promptVersion: sql<string | null>`${reportsTable.interpretation}->'meta'->>'promptVersion'`,
        relationship: {
          id: relationshipsTable.id,
          type: relationshipsTable.type,
          userId: relationshipsTable.userId,
          sessionId: relationshipsTable.sessionId,
        },
      })
      .from(reportsTable)
      .innerJoin(relationshipsTable, eq(reportsTable.relationshipId, relationshipsTable.id))
      .where(and(eq(reportsTable.type, "compatibility"), inArray(reportsTable.relationshipId, ids))),
    db
      .select({
        relationshipId: relationshipParticipantsTable.relationshipId,
        accessRole: relationshipParticipantsTable.accessRole,
        profile: profilesTable,
      })
      .from(relationshipParticipantsTable)
      .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
      .where(inArray(relationshipParticipantsTable.relationshipId, ids))
      .orderBy(asc(relationshipParticipantsTable.position)),
  ]);
  const byPair = new Map<string, PartRow[]>();
  for (const { relationshipId, accessRole, profile } of parts) {
    const part: PartRow = {
      profileId: profile.id,
      name: profile.name,
      userId: profile.userId,
      sessionId: profile.sessionId,
      claimedByUserId: profile.claimedByUserId,
      accessRole,
      birth: {
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthTimeWindowMinutes: profile.birthTimeWindowMinutes,
        latitude: profile.latitude,
        longitude: profile.longitude,
        timezoneOffset: profile.timezoneOffset,
        timezone: profile.timezone,
        chartData: profile.chartData,
      },
    };
    byPair.set(relationshipId, [...(byPair.get(relationshipId) ?? []), part]);
  }
  return reports.map((r) => ({ ...r, parts: byPair.get(r.relationship.id) ?? [] }));
}

/**
 * What the reader can read right now. The charts shared with them are fetched once here and passed to every check,
 * whose defaults deny a shared report (re-pin 9).
 */
async function readableNow(viewer: Viewer, ownProfileId: string | null): Promise<Readable> {
  const shared = await sharedProfileIds(viewer.userId);
  const [natal, pairs] = await Promise.all([natalRowsFor(viewer, shared), pairRowsFor(viewer)]);
  const library = libraryOf(viewer, natal, pairs, shared, ownProfileId);
  return {
    library,
    reach: reachOf(viewer, natal, pairs, shared),
    circle: circleOf(viewer, natal, pairs, shared, ownProfileId, library),
  };
}

/** The library alone, as the plan and the tools are shown it. */
export async function readableLibrary(viewer: Viewer, ownProfileId: string | null): Promise<Library> {
  return (await readableNow(viewer, ownProfileId)).library;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** A calendar day the calendar has, "YYYY-MM-DD". */
export function isDay(ymd: unknown): ymd is string {
  if (typeof ymd !== "string" || !YMD.test(ymd)) return false;
  const at = new Date(`${ymd}T00:00:00Z`);
  return !Number.isNaN(at.getTime()) && at.toISOString().slice(0, 10) === ymd;
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

function parts(ymd: string): { year: number; month: string; day: number; weekday: string } {
  const at = new Date(`${ymd}T00:00:00Z`);
  return { year: at.getUTCFullYear(), month: MONTHS[at.getUTCMonth()], day: at.getUTCDate(), weekday: WEEKDAYS[at.getUTCDay()] };
}

/** "Fri 18 Sep", as the chat's choices read; the year only when it isn't this one. */
export function dateLabel(ymd: string, thisYear: number): string {
  const p = parts(ymd);
  return `${p.weekday} ${p.day} ${p.month}${p.year === thisYear ? "" : ` ${p.year}`}`;
}

/** "5 to 11 Oct", "28 Sep to 4 Oct", "28 Dec 2026 to 3 Jan 2027": the years only when either isn't this one. */
export function windowLabel(from: string, to: string, thisYear: number): string {
  const a = parts(from);
  const b = parts(to);
  const years = a.year !== thisYear || b.year !== thisYear;
  if (a.year !== b.year) return `${a.day} ${a.month} ${a.year} to ${b.day} ${b.month} ${b.year}`;
  const tail = years ? ` ${b.year}` : "";
  return a.month === b.month ? `${a.day} to ${b.day} ${b.month}${tail}` : `${a.day} ${a.month} to ${b.day} ${b.month}${tail}`;
}

function reportLabel(report: LibraryReport): string {
  if (report.kind === "personal") return report.own ? "Your Personal report" : `${firstWord(report.names[0] ?? "")}'s Personal report`;
  return report.names.map(firstWord).join(" and ");
}

/** The report a quote card names, by its people as typed. */
function reportNameOf(report: LibraryReport): string {
  return report.names.join(" and ");
}

const wordsIn = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
const SENTENCE_END = /[.!?]["'”’)\]]*(?=\s|$)/g;

/**
 * The opening of a paragraph as a quote card shows it: whole sentences up to 120 words, as a reading's passages are,
 * cut from the stored text itself so every word and space is the report's.
 */
export function passageFrom(text: string, maxWords = PASSAGE_WORDS, maxChars = QUOTE_MAX): string {
  const whole = text.trim();
  if (wordsIn(whole) <= maxWords && whole.length <= maxChars) return whole;
  let cut = 0;
  for (const m of whole.matchAll(SENTENCE_END)) {
    const end = (m.index ?? 0) + m[0].length;
    if (wordsIn(whole.slice(0, end)) > maxWords || end > maxChars) break;
    cut = end;
  }
  if (cut > 0) return whole.slice(0, cut);
  // One sentence longer than a passage: its first words, ending where a word ends.
  let words = 0;
  for (const m of whole.matchAll(/\S+/g)) {
    const end = (m.index ?? 0) + m[0].length;
    if (end > maxChars) break;
    cut = end;
    if (++words === maxWords) break;
  }
  return whole.slice(0, cut);
}

// A lens chapter's pattern and the practice chapter's opening say what the chapter is about; its scene is a story.
const PREFERRED = ["pattern", "opening"];

function proseStrings(value: unknown, key?: string): string[] {
  if (key !== undefined && NOT_PROSE.has(key)) return [];
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((item) => proseStrings(item));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => proseStrings(v, k));
  return [];
}

/** A section's passage: its own summary where it has one, else its first real paragraph, else its longest line. */
export function passageOf(section: unknown): string | null {
  if (section && typeof section === "object" && !Array.isArray(section)) {
    for (const key of PREFERRED) {
      const value = (section as Record<string, unknown>)[key];
      if (typeof value === "string" && wordsIn(value) >= PARAGRAPH_WORDS) return passageFrom(value);
    }
  }
  const strings = proseStrings(section);
  const paragraph = strings.find((s) => wordsIn(s) >= PARAGRAPH_WORDS) ?? strings.reduce((a, b) => (b.length > a.length ? b : a), "");
  return paragraph.trim() ? passageFrom(paragraph) : null;
}

/** The stored text of one listed section: a natal chapter, one of the reader's own house cards, or a pair chapter. */
export function sectionValue(interpretation: unknown, kind: LibraryReport["kind"], sectionId: string): unknown {
  if (!interpretation || typeof interpretation !== "object") return null;
  const root = interpretation as Record<string, unknown>;
  const house = kind === "personal" ? HOUSE_SECTION.exec(sectionId) : null;
  if (house) {
    const list = (root.houses as { houses?: unknown } | null | undefined)?.houses;
    if (!Array.isArray(list)) return null;
    const card = list.find((h) => (h as { house?: unknown } | null)?.house === Number(house[1])) as { reading?: unknown } | undefined;
    return card?.reading ?? null;
  }
  return root[sectionId] ?? null;
}

async function interpretationOf(reportId: string): Promise<unknown> {
  const [row] = await db.select({ interpretation: reportsTable.interpretation }).from(reportsTable).where(eq(reportsTable.id, reportId)).limit(1);
  return row?.interpretation ?? null;
}

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const norm = (deg: number): number => ((deg % 360) + 360) % 360;
const PRINCIPAL: readonly (readonly [number, string])[] = [[0, "new moon"], [90, "first quarter"], [180, "full moon"], [270, "last quarter"], [360, "new moon"]];

/**
 * The Moon's sign at the middle of the reader's day, and its phase: a principal phase on the day its exact moment
 * falls in, else the crescent or gibbous between them. The one place Ask names the Moon (reading 14).
 */
export function moonOn(date: string, zone: string): { sign: string; phase: string } {
  const start = dayStart(date, zone).getTime();
  const end = dayStart(addDays(date, 1), zone).getTime();
  const elongation = (t: number) => norm(longitudeAt("moon", new Date(t)) - longitudeAt("sun", new Date(t)));
  const sign = SIGNS[Math.floor(norm(longitudeAt("moon", new Date((start + end) / 2))) / 30) % 12];
  const from = elongation(start);
  let to = elongation(end);
  if (to < from) to += 360;
  const principal = PRINCIPAL.find(([deg]) => from <= deg && deg < to);
  if (principal) return { sign, phase: principal[1] };
  const mid = elongation((start + end) / 2);
  const phase = mid < 90 ? "waxing crescent" : mid < 180 ? "waxing gibbous" : mid < 270 ? "waning gibbous" : "waning crescent";
  return { sign, phase };
}

function inLife(chart: NatalChartData, ymd: string): boolean {
  const at = Date.parse(`${ymd}T00:00:00Z`);
  const born = Date.parse(chart.datetimeUtc);
  return Number.isFinite(at) && Number.isFinite(born) && at >= born - DAY_MS && at <= born + LIFE_MS;
}

/** The middle of the reader's day: the instant a day card's orbs are read at, and a range starting that day starts from. */
function middleOf(date: string, zone: string): Date {
  const start = dayStart(date, zone).getTime();
  return new Date((start + dayStart(addDays(date, 1), zone).getTime()) / 2);
}

/** The events on one of the reader's days, by Timeline's own rule for a day (the engine's `inEffect`). */
function onDay(event: TimelineEvent, start: number, end: number): boolean {
  switch (event.kind) {
    case "contact":
      return event.spans.some((s) => s.start.getTime() < end && s.end.getTime() >= start);
    case "retrograde":
      return event.start.getTime() < end && event.end.getTime() >= start;
    case "eclipse":
      return event.start.getTime() >= start && event.start.getTime() < end;
  }
}

function askEventOf(event: TimelineEvent, zone: string): AskEvent {
  return {
    kind: event.kind,
    headline: event.headline,
    sky: event.facts.sky,
    house: event.facts.house,
    tone: event.tone,
    from: dayIn(event.start, zone),
    to: dayIn(event.end, zone),
    exact: event.exact.map((at) => dayIn(at, zone)),
    orb: event.orbNow,
  };
}

/** What touched a chart on one of the reader's days, as Now and ahead computes it. */
function dayOf(chart: ReaderChart, date: string, zone: string): { events: TimelineEvent[]; ask: AskEvent[] } | null {
  if (!isDay(date) || !inLife(chart.chart, date)) return null;
  const start = dayStart(date, zone).getTime();
  const end = dayStart(addDays(date, 1), zone).getTime();
  const view = nowView(chart, "week", zone, NO_READINGS, middleOf(date, zone));
  const events = view.events.filter((event) => onDay(event, start, end));
  return { events, ask: events.map((event) => askEventOf(event, zone)) };
}

function rangeFor(days: number): TimelineRange {
  if (days <= RANGE_DAYS.week) return "week";
  return days <= RANGE_DAYS.month ? "month" : "six-months";
}

/** Each day's tone from the first day to the last, at most six months, by reading 17's rule on its contacts. */
function windowOf(reader: ReaderChart, from: string, to: string, zone: string): WindowCard | null {
  if (!isDay(from) || !isDay(to)) return null;
  const [first, last] = from <= to ? [from, to] : [to, from];
  if (!inLife(reader.chart, first)) return null;
  const length = Math.min(daysBetween(first, last) + 1, WINDOW_MAX_DAYS);
  const view = nowView(reader, rangeFor(length), zone, NO_READINGS, middleOf(first, zone));
  const days = view.days.slice(0, length).map(({ date, tones }) => ({
    date,
    tone: dayTone(tones.map((tone: Tone) => ({ kind: "contact" as const, tone }))),
  }));
  if (!days.length) return null;
  return { kind: "window", from: days[0].date, to: days[days.length - 1].date, days };
}

/** One of the reader's life cycles: the last to start before now, or the next to end after it. */
function cycleOf(reader: ReaderChart, id: CycleId, which: "last" | "next", zone: string, now: Date): LifeCycleView | null {
  const cycles = lifeView(reader, zone, NO_READINGS, now).cycles.filter((c) => c.id === id);
  const at = now.getTime();
  if (which === "last") {
    const started = cycles.filter((c) => c.start.getTime() <= at);
    return started.sort((a, b) => b.start.getTime() - a.start.getTime())[0] ?? null;
  }
  return cycles.filter((c) => c.end.getTime() >= at).sort((a, b) => a.end.getTime() - b.end.getTime())[0] ?? null;
}

function askCycleOf(cycle: LifeCycleView, zone: string): AskCycle {
  return {
    name: cycle.name,
    word: cycle.word,
    age: cycle.age,
    from: dayIn(cycle.start, zone),
    to: dayIn(cycle.end, zone),
    exact: cycle.exact.map((at) => dayIn(at, zone)),
    passes: cycle.passes,
    past: cycle.past,
  };
}

/** A person's chart as stored, or computed afresh when an older engine wrote it; never written back to their profile. */
function personChart(person: LibraryPerson): NatalChartData | null {
  try {
    return chartIsStale(person.birth.chartData) ? chartForProfile(person.birth) : (person.birth.chartData as NatalChartData);
  } catch {
    return null;
  }
}

/** Someone in a pair the reader can read, as a chart the day tool reads on the reader's days. */
function personAsChart(person: LibraryPerson, viewer: Viewer, zone: string): ReaderChart | null {
  const chart = personChart(person);
  if (!chart) return null;
  return {
    userId: viewer.userId ?? "",
    profileId: person.profileId,
    reportId: person.reportId,
    chart,
    blind: !hasHorizon(chart),
    zone,
    birth: new Date(chart.datetimeUtc),
    basis: "",
  };
}

type StoredChoice = { id: string } & (
  | { kind: "date"; date: string }
  | { kind: "window"; from: string; to: string }
  | { kind: "person"; profileId: string }
  | { kind: "report"; reportId: string }
);

/** A day, window or cycle card is the reader's own chart and kept whole; a quote and a person are kept as references. */
type StoredCard =
  | DayCard
  | WindowCard
  | CycleCard
  | { kind: "quote"; reportId: string; section: string }
  | { kind: "person"; profileId: string; date: string; zone: string };

interface Computed {
  prompt: AskAnswerCard;
  stored: StoredCard;
}

/** What the tools read with: the reader, their day, the library the plan was shown, and the one loaded as they run. */
export interface ToolScope {
  viewer: Viewer;
  reader: ReaderChart;
  zone: string;
  now: Date;
  /** What the plan named by short id. */
  library: Library;
  /** Loaded again when the tools run: a report or person missing from it is refused, whatever the plan said. */
  fresh: Library;
}

async function computeTool(tool: AskPlanTool, scope: ToolScope, id: string): Promise<Computed | null> {
  const { reader, zone } = scope;
  switch (tool.tool) {
    case "day": {
      const day = dayOf(reader, tool.date, zone);
      if (!day) return null;
      const moon = moonOn(tool.date, zone);
      return {
        prompt: { id, kind: "day", date: tool.date, moon, events: day.ask },
        stored: { kind: "day", date: tool.date, moon, events: day.events },
      };
    }
    case "window": {
      const card = windowOf(reader, tool.from, tool.to, zone);
      return card ? { prompt: { id, ...card }, stored: card } : null;
    }
    case "cycle": {
      const cycle = cycleOf(reader, tool.cycle, tool.which, zone, scope.now);
      return cycle ? { prompt: { id, kind: "cycle", cycle: askCycleOf(cycle, zone) }, stored: { kind: "cycle", cycle } } : null;
    }
    case "reports":
      // The list is already in both prompts, drawn from what the reader can read; it shows no card of its own.
      return null;
    case "quote": {
      const named = scope.library.reports.find((r) => r.id === tool.report);
      const report = named && scope.fresh.reports.find((r) => r.reportId === named.reportId);
      const section = report?.sections.find((s) => s.id === tool.section);
      if (!named || !report || !section) return null;
      const text = passageOf(sectionValue(await interpretationOf(report.reportId), report.kind, section.id));
      if (!text) return null;
      return {
        prompt: { id, kind: "quote", report: named.id, section: section.title, text },
        stored: { kind: "quote", reportId: report.reportId, section: section.id },
      };
    }
    case "person": {
      const named = scope.library.people.find((p) => p.id === tool.person);
      const person = named && scope.fresh.people.find((p) => p.profileId === named.profileId);
      const chart = person && personAsChart(person, scope.viewer, zone);
      const day = named && chart ? dayOf(chart, tool.date, zone) : null;
      if (!named || !day) return null;
      return {
        prompt: { id, kind: "person", person: named.id, date: tool.date, events: day.ask },
        stored: { kind: "person", profileId: named.profileId, date: tool.date, zone },
      };
    }
  }
}

/**
 * The plan's tools, each computed from what the reader can read when it runs, at most four cards in the plan's order,
 * the same tool asked twice computed once. A tool that names what the reader cannot read gives no card.
 */
export async function runTools(tools: readonly AskPlanTool[], scope: ToolScope): Promise<Computed[]> {
  const seen = new Set<string>();
  const computed: Computed[] = [];
  for (const tool of tools) {
    const key = JSON.stringify(tool);
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const card = await computeTool(tool, scope, `c${computed.length + 1}`);
      if (card) computed.push(card);
    } catch (err) {
      logger.warn({ tool: tool.tool, failure: (err as Error)?.name ?? "Error" }, "ask: a tool failed; its card is left out");
    }
  }
  return computed;
}

/** Thrown from a rejected attempt's log, so each call runs once and the retry is Ask's own, with every name masked. */
class Rejected extends Error {
  constructor() {
    super("rejected");
    this.name = "Rejected";
  }
}

interface CallFrame {
  writeId: string;
  /** The reader's name as typed: the one name `callStructured` masks. */
  name: string;
  /** Every name the prompt holds, so the retry's copy of the last reply carries none of them outside a block (ADR-240). */
  names: readonly string[];
}

/**
 * One of Ask's calls with one retry carrying every error and the last reply, masked against every name in the
 * prompt; null when the retry fails too, or the model cannot be reached. Each reply goes on the day's spend ledger
 * and each attempt's checks on the failure log (ADR-199, ADR-85).
 */
async function askCall<T>(prompt: AskPrompt<T>, frame: CallFrame, validate?: (output: T) => Validated<T>): Promise<T | null> {
  let carry: Carry | undefined;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const seen: { reply: string; errors: string[] } = { reply: "", errors: [] };
    try {
      const result = await callStructured<T>({
        usageKey: prompt.key,
        model: MODELS.ask,
        system: prompt.system,
        user: prompt.user,
        schema: prompt.schema,
        maxTokens: prompt.maxTokens,
        validate,
        spend: "ask",
        names: { name: frame.name },
        carry,
        normalise: (raw) => {
          seen.reply = JSON.stringify(raw);
          return { raw, checks: [] };
        },
        onChecks: async (checks: Check[]) => {
          const blocks = checks.filter((c) => c.cls === "block");
          await recordChecks({
            kind: "ask", section: prompt.key, model: MODELS.ask, writeId: frame.writeId, reportId: null,
            attempt, final: !blocks.length || attempt === ATTEMPTS, checks,
          });
          if (blocks.length) {
            seen.errors.push(...blocks.map((c) => c.message));
            throw new Rejected();
          }
        },
      });
      return result.data;
    } catch (err) {
      if (!(err instanceof Rejected)) {
        logger.warn({ section: prompt.key, failure: (err as Error)?.name ?? "Error" }, "ask: a call failed; the reader gets the fallback line");
        return null;
      }
      const errors = [...(carry?.errors ?? []), ...seen.errors];
      carry = { errors: errors.map((e) => maskedFor(e, frame.names)), lastReply: maskedFor(seen.reply, frame.names) };
    }
  }
  return null;
}

const MARKERS = new RegExp([...DATA_LABELS.map(DATA_OPEN), DATA_CLOSE].map((m) => m.replace(/[<>]/g, "\\$&")).join("|"), "g");

/** The plan's question is the one line of it a reader sees: a marker copied into it is taken out (annex row 48). */
function planChecks(plan: AskPlan): Validated<AskPlan> {
  let markers = 0;
  const question = plan.question.replace(MARKERS, () => {
    markers += 1;
    return "";
  }).replace(/\s+/g, " ").trim();
  if (!markers) return clean({ ...plan, question });
  return { output: { ...plan, question }, checks: [fixed("chk-48", `question: ${markers} data marker(s) copied into the text taken out`)] };
}

function storedChoiceOf(choice: AskPlanChoice, library: Library, reader: ReaderChart): StoredChoice | null {
  const id = randomUUID();
  switch (choice.kind) {
    case "date":
      return isDay(choice.date) && inLife(reader.chart, choice.date) ? { id, kind: "date", date: choice.date } : null;
    case "window": {
      if (!isDay(choice.from) || !isDay(choice.to)) return null;
      const [from, to] = choice.from <= choice.to ? [choice.from, choice.to] : [choice.to, choice.from];
      if (!inLife(reader.chart, from)) return null;
      return { id, kind: "window", from, to: daysBetween(from, to) < WINDOW_MAX_DAYS ? to : addDays(from, WINDOW_MAX_DAYS - 1) };
    }
    case "person": {
      const person = library.people.find((p) => p.id === choice.person);
      return person ? { id, kind: "person", profileId: person.profileId } : null;
    }
    case "report": {
      const report = library.reports.find((r) => r.id === choice.report);
      return report ? { id, kind: "report", reportId: report.reportId } : null;
    }
  }
}

function sameChoice(a: StoredChoice, b: StoredChoice): boolean {
  const { id: _a, ...x } = a;
  const { id: _b, ...y } = b;
  return JSON.stringify(x) === JSON.stringify(y);
}

/** The choice as the plan reads it, by this call's short ids; null once it names what the reader cannot read. */
function planChoiceOf(choice: StoredChoice, library: Library): AskPlanChoice | null {
  switch (choice.kind) {
    case "date":
      return { kind: "date", date: choice.date };
    case "window":
      return { kind: "window", from: choice.from, to: choice.to };
    case "person": {
      const person = library.people.find((p) => p.profileId === choice.profileId);
      return person ? { kind: "person", person: person.id } : null;
    }
    case "report": {
      const report = library.reports.find((r) => r.reportId === choice.reportId);
      return report ? { kind: "report", report: report.id } : null;
    }
  }
}

/** The choice as the chat shows it; null once it names someone or a report the reader can no longer read. */
function choiceOf(choice: StoredChoice, library: Library, thisYear: number): AskChoice | null {
  switch (choice.kind) {
    case "date":
      return { id: choice.id, kind: "date", label: dateLabel(choice.date, thisYear) };
    case "window":
      return { id: choice.id, kind: "window", label: windowLabel(choice.from, choice.to, thisYear) };
    case "person": {
      const person = library.people.find((p) => p.profileId === choice.profileId);
      return person ? { id: choice.id, kind: "person", label: firstWord(person.name) } : null;
    }
    case "report": {
      const report = library.reports.find((r) => r.reportId === choice.reportId);
      return report ? { id: choice.id, kind: "report", label: reportLabel(report) } : null;
    }
  }
}

const Day = z.string().regex(YMD);
const StoredChoiceSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("date"), date: Day }),
  z.object({ id: z.string(), kind: z.literal("window"), from: Day, to: Day }),
  z.object({ id: z.string(), kind: z.literal("person"), profileId: z.string() }),
  z.object({ id: z.string(), kind: z.literal("report"), reportId: z.string() }),
]);
const ReaderBodySchema = z.object({ text: z.string(), choice: StoredChoiceSchema.optional() });
const SAID = ["answer", "ask_back", "harm", "off_topic", "fallback"] as const;
type Said = (typeof SAID)[number];
const SourcesSchema = z.object({ reports: z.array(z.string()), profiles: z.array(z.string()) });
/** The pair offer as a reply keeps it: who, and nothing that changes, since the name and the credits are read when shown. */
const StoredOfferSchema = z.object({ profileId: z.string() });
const AskBodySchema = z.object({
  said: z.enum(SAID), text: z.string(), cards: z.array(z.unknown()), choices: z.array(z.unknown()), sources: SourcesSchema.optional(),
  offer: StoredOfferSchema.optional(),
});
const QuoteRefSchema = z.object({ kind: z.literal("quote"), reportId: z.string(), section: z.string() });
const PersonRefSchema = z.object({ kind: z.literal("person"), profileId: z.string(), date: Day, zone: z.string() });
const CardSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("quote"), reportId: z.string() }),
  z.object({ kind: z.literal("person"), profileId: z.string() }),
]);
/** A kept day, window or cycle card read back through the contract, which turns its dates back into dates. */
const CardSchema = GetAskThreadResponse.shape.messages.element.shape.cards.element;

type ReaderBody = z.infer<typeof ReaderBodySchema>;
type KeptAskBody = z.infer<typeof AskBodySchema>;
type StoredOffer = z.infer<typeof StoredOfferSchema>;
interface AskBody {
  said: Said;
  text: string;
  cards: StoredCard[];
  choices: StoredChoice[];
  sources: Sources;
  offer?: StoredOffer;
}

/** What a kept reply rests on: its own list, or for one kept before replies had a list, the quotes and people it shows. */
function sourcesOf(body: KeptAskBody): Sources {
  if (body.sources) return body.sources;
  const sources: Sources = { reports: [], profiles: [] };
  for (const card of body.cards) {
    const ref = CardSourceSchema.safeParse(card);
    if (ref.success && ref.data.kind === "quote") sources.reports.push(ref.data.reportId);
    if (ref.success && ref.data.kind === "person") sources.profiles.push(ref.data.profileId);
  }
  return sources;
}

/** A reply stands only while the reader can still read every report and person it was written from (R-3.6). */
function readsAll(sources: Sources, reach: Reach): boolean {
  return sources.reports.every((id) => reach.reports.has(id)) && sources.profiles.every((id) => reach.profiles.has(id));
}

/** What a read shares, so a thread of many cards loads the library once and each quoted report's text once. */
interface ReadScope {
  viewer: Viewer;
  library: Library;
  reach: Reach;
  circle: ReadonlyMap<string, CircleMember>;
  thisYear: number;
  interpretation: (reportId: string) => Promise<unknown>;
  /** Read once a thread, and only when an offer shows. */
  credits: () => Promise<number | null>;
}

/** The reader's credits for an offer's line; a balance that cannot be read shows no offer rather than a wrong count. */
async function creditsOf(userId: string | null): Promise<number | null> {
  if (!userId) return null;
  try {
    return (await getCredits(userId)).available;
  } catch (err) {
    logger.warn({ failure: (err as Error)?.name ?? "Error" }, "ask: the reader's credits could not be read; the pair offer is left out");
    return null;
  }
}

function readScope(viewer: Viewer, { library, reach, circle }: Readable, now: Date): ReadScope {
  const texts = new Map<string, Promise<unknown>>();
  let credits: Promise<number | null> | null = null;
  return {
    viewer,
    library,
    reach,
    circle: new Map(circle.map((member) => [member.profileId, member])),
    thisYear: now.getUTCFullYear(),
    interpretation: (reportId) => {
      let text = texts.get(reportId);
      if (!text) texts.set(reportId, (text = interpretationOf(reportId)));
      return text;
    },
    credits: () => (credits ??= creditsOf(viewer.userId)),
  };
}

/**
 * A kept offer as the card shows it: their first name and the reader's credits now, while the reader can still read
 * their report and has no pair with them. Once they do, or once a stop closes the report, the offer is gone (R-3.6).
 */
async function offerShown(stored: StoredOffer | undefined, read: ReadScope): Promise<AskOffer | null> {
  const member = stored ? read.circle.get(stored.profileId) : undefined;
  if (!member?.offerable) return null;
  const credits = await read.credits();
  return credits === null ? null : { profileId: member.profileId, name: firstWord(member.name), credits };
}

async function quoteCardOf(ref: z.infer<typeof QuoteRefSchema>, read: ReadScope): Promise<QuoteCard | null> {
  const report = read.library.reports.find((r) => r.reportId === ref.reportId);
  const section = report?.sections.find((s) => s.id === ref.section);
  if (!report || !section) return null;
  const text = passageOf(sectionValue(await read.interpretation(report.reportId), report.kind, section.id));
  return text ? { kind: "quote", reportId: report.reportId, reportName: reportNameOf(report), section: section.title, text } : null;
}

function personCardOf(ref: z.infer<typeof PersonRefSchema>, read: ReadScope): PersonCard | null {
  // MB-191 provisional: kept as who and which day, and computed here only while a pair the reader can read holds them.
  const person = read.library.people.find((p) => p.profileId === ref.profileId);
  const zone = validZone(ref.zone) ?? "UTC";
  const chart = person && personAsChart(person, read.viewer, zone);
  const day = chart ? dayOf(chart, ref.date, zone) : null;
  return person && day ? { kind: "person", name: person.name, date: ref.date, events: day.events } : null;
}

async function shownCard(stored: unknown, read: ReadScope): Promise<AskCard | null> {
  const kind = (stored as { kind?: unknown } | null)?.kind;
  try {
    if (kind === "quote") {
      const ref = QuoteRefSchema.safeParse(stored);
      return ref.success ? await quoteCardOf(ref.data, read) : null;
    }
    if (kind === "person") {
      const ref = PersonRefSchema.safeParse(stored);
      return ref.success ? personCardOf(ref.data, read) : null;
    }
    const card = CardSchema.safeParse(stored);
    return card.success ? card.data : null;
  } catch (err) {
    logger.warn({ card: String(kind), failure: (err as Error)?.name ?? "Error" }, "ask: a kept card could not be shown; it is left out");
    return null;
  }
}

async function messageOf(row: Pick<AskMessageRow, "id" | "role" | "body" | "createdAt">, read: ReadScope): Promise<AskMessage | null> {
  if (row.role === "reader") {
    const body = ReaderBodySchema.safeParse(row.body);
    return body.success ? { id: row.id, role: "reader", text: body.data.text, cards: [], choices: [], offer: null, createdAt: row.createdAt } : null;
  }
  const body = AskBodySchema.safeParse(row.body);
  if (!body.success) return null;
  if (!readsAll(sourcesOf(body.data), read.reach)) {
    return { id: row.id, role: "ask", text: ASK_HIDDEN_LINE, cards: [], choices: [], offer: null, createdAt: row.createdAt };
  }
  const cards = (await Promise.all(body.data.cards.map((card) => shownCard(card, read)))).filter((c): c is AskCard => c !== null);
  const choices = body.data.choices.flatMap((choice) => {
    const parsed = StoredChoiceSchema.safeParse(choice);
    const shown = parsed.success ? choiceOf(parsed.data, read.library, read.thisYear) : null;
    return shown ? [shown] : [];
  });
  const offer = await offerShown(body.data.offer, read);
  return { id: row.id, role: "ask", text: body.data.text, cards, choices, offer, createdAt: row.createdAt };
}

async function rowsOf(userId: string) {
  return db
    .select({ id: askMessagesTable.id, role: askMessagesTable.role, body: askMessagesTable.body, createdAt: askMessagesTable.createdAt })
    .from(askMessagesTable)
    .where(eq(askMessagesTable.userId, userId))
    .orderBy(asc(askMessagesTable.createdAt), asc(askMessagesTable.id));
}

/**
 * The reader's thread from the last 31 days, oldest first, with this month's count (ADR-263). Every quote and person
 * card is read again against what the reader can read now, and goes when they no longer can (MB-191); a reply written
 * from a report or a person they can no longer read shows the fixed line instead, and the count stays as it was (B-02).
 */
export async function askThread(viewer: Viewer, options: AskOptions = {}): Promise<AskThread> {
  const now = options.now ?? new Date();
  const userId = viewer.userId;
  if (!userId) return { messages: [], usage: usageFrom(0, now) };
  await forgetOld(userId, now);
  const [rows, own] = await Promise.all([rowsOf(userId), ownChartOf(userId)]);
  const read = readScope(viewer, await readableNow(viewer, own?.profileId ?? null), now);
  const messages = (await Promise.all(rows.map((row) => messageOf(row, read)))).filter((m): m is AskMessage => m !== null);
  return { messages, usage: await askUsage(viewer, now) };
}

/** The cap and the reader's message in one step, one sender at a time per account, so no race passes the count. */
async function storeReaderMessage(userId: string, body: ReaderBody, now: Date): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`ask:${userId}`}, 0))`);
    if ((await usedThisMonth(userId, now, tx)) >= ASK_MONTHLY_CAP) return false;
    await tx.insert(askMessagesTable).values({ id: randomUUID(), userId, role: "reader", body, createdAt: now });
    return true;
  });
}

async function lastChoices(userId: string): Promise<StoredChoice[]> {
  const [row] = await db
    .select({ body: askMessagesTable.body })
    .from(askMessagesTable)
    .where(and(eq(askMessagesTable.userId, userId), eq(askMessagesTable.role, "ask")))
    .orderBy(desc(askMessagesTable.createdAt))
    .limit(1);
  const body = AskBodySchema.safeParse(row?.body);
  if (!body.success) return [];
  return body.data.choices.flatMap((c) => {
    const parsed = StoredChoiceSchema.safeParse(c);
    return parsed.success ? [parsed.data] : [];
  });
}

/** A kept message as the model reads it again, with what a reply was written from and, for Ask's, what it was. */
interface Turn {
  turn: AskTurn;
  sources: Sources;
  said?: Said;
}

/** A row the thread cannot read goes back to the model no more than it shows. */
function turnOf(row: { role: string; body: unknown }): Turn | null {
  if (row.role === "reader") {
    const body = ReaderBodySchema.safeParse(row.body);
    return body.success ? { turn: { role: "reader", text: body.data.text }, sources: NO_SOURCES } : null;
  }
  const body = row.role === "ask" ? AskBodySchema.safeParse(row.body) : null;
  return body?.success ? { turn: { role: "ask", text: body.data.text }, sources: sourcesOf(body.data), said: body.data.said } : null;
}

/**
 * The reader's words before this message since Ask last replied with anything but a question back, newest first: a
 * tap or a reply that answers a question back still asks the question it answers.
 */
function askedBefore(turns: readonly Turn[]): string[] {
  const asked: string[] = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    const { turn, said } = turns[i];
    if (turn.role === "ask" && said !== "ask_back") break;
    if (turn.role === "reader") asked.push(turn.text);
  }
  return asked;
}

/** Everyone the thread's 31 days have offered a pair with: once a person (Review 05/10 §8). */
async function offeredIn(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ profileId: sql<string | null>`${askMessagesTable.body}->'offer'->>'profileId'` })
    .from(askMessagesTable)
    .where(and(eq(askMessagesTable.userId, userId), eq(askMessagesTable.role, "ask"), sql`${askMessagesTable.body}->'offer'->>'profileId' is not null`));
  return new Set(rows.flatMap((row) => (row.profileId ? [row.profileId] : [])));
}

/** The conversation before this message, oldest first, only as much of it as the plan reads. */
async function recentTurns(userId: string): Promise<Turn[]> {
  const rows = await db
    .select({ role: askMessagesTable.role, body: askMessagesTable.body })
    .from(askMessagesTable)
    .where(eq(askMessagesTable.userId, userId))
    .orderBy(desc(askMessagesTable.createdAt), desc(askMessagesTable.id))
    .limit(HISTORY_SENT);
  return rows.reverse().flatMap((row) => turnOf(row) ?? []);
}

/** The conversation as the model is sent it: a reply the thread hides stays out of it, its text in no prompt (B-02). */
function historyFrom(turns: readonly Turn[], reach: Reach): AskTurn[] {
  return turns.filter((t) => readsAll(t.sources, reach)).map((t) => t.turn);
}

/**
 * What an answer was written from: every card its call was given, shown or not, since the text may use any of them.
 * The reader's own report is left out, as their own chart is: no one else's stop can take it away.
 */
function sourcesFrom(computed: readonly Computed[], library: Library): Sources {
  const reports = new Set<string>();
  const profiles = new Set<string>();
  for (const { stored } of computed) {
    if (stored.kind === "quote" && !library.reports.some((r) => r.reportId === stored.reportId && r.own)) reports.add(stored.reportId);
    if (stored.kind === "person") profiles.add(stored.profileId);
  }
  return { reports: [...reports], profiles: [...profiles] };
}

function askReportOf(report: LibraryReport): AskReport {
  return { id: report.id, kind: report.kind, names: report.names, sections: report.sections };
}

function askPersonOf(person: LibraryPerson): AskPerson {
  return { id: person.id, name: person.name, report: person.report };
}

/** The plan's context, holding only what is still readable in `fresh`, under the short ids the plan was shown. */
function stillReadable(context: AskContext, library: Library, fresh: Readable, turns: readonly Turn[]): AskContext {
  const kept = (reportId: string) => fresh.library.reports.some((r) => r.reportId === reportId);
  const reports = library.reports.filter((r) => kept(r.reportId));
  const people = library.people.filter((p) => fresh.library.people.some((f) => f.profileId === p.profileId));
  const from = context.fromReport ? library.reports.find((r) => r.id === context.fromReport) : undefined;
  return {
    ...context,
    history: historyFrom(turns, fresh.reach),
    reports: reports.map(askReportOf),
    people: people.map(askPersonOf),
    fromReport: from && kept(from.reportId) ? from.id : null,
  };
}

interface Reply {
  said: Said;
  text: string;
  cards: StoredCard[];
  choices: StoredChoice[];
  sources: Sources;
  offer: StoredOffer | null;
}

const fixedReply = (said: Said, text: string): Reply => ({ said, text, cards: [], choices: [], sources: NO_SOURCES, offer: null });

/** What the pair offer weighs: the reader's words for this answer, newest first, and who the thread has been offered. */
interface Asking {
  asked: string[];
  offered: ReadonlySet<string>;
}

/**
 * Ask's reply to one message: the plan, then a fixed line, the question back, or the tools and the answer, which alone
 * may carry the pair offer, never a fixed line or a question.
 */
async function replyTo(
  viewer: Viewer, reader: ReaderChart, context: AskContext, library: Library, turns: readonly Turn[], zone: string, now: Date,
  asking: Asking,
): Promise<Reply> {
  const frame: CallFrame = { writeId: randomUUID(), name: context.name, names: namesIn(context) };
  const plan = await askCall(askPlanPrompt(context, await resolveSection(ASK_KEYS.plan)), frame, planChecks);
  if (!plan) return fixedReply("fallback", FALLBACK_LINE);
  switch (plan.intent) {
    case "harm":
      return fixedReply("harm", HARM_REPLY);
    case "off_topic":
      return fixedReply("off_topic", OFF_TOPIC_LINE);
    case "ask_back": {
      const choices: StoredChoice[] = [];
      for (const choice of plan.choices) {
        const stored = storedChoiceOf(choice, library, reader);
        if (stored && !choices.some((c) => sameChoice(c, stored))) choices.push(stored);
      }
      return plan.question ? { said: "ask_back", text: plan.question, cards: [], choices, sources: NO_SOURCES, offer: null } : fixedReply("fallback", FALLBACK_LINE);
    }
    case "answer": {
      // Read again as the tools run: Stop sharing during the plan call closes what it closed (R-3.6).
      const fresh = await readableNow(viewer, reader.profileId);
      const computed = await runTools(plan.tools, { viewer, reader, zone, now, library, fresh: fresh.library });
      const input: AskAnswerInput = { ...stillReadable(context, library, fresh, turns), brief: buildBrief(reader.chart, context.name), cards: computed.map((c) => c.prompt) };
      const answer = await askCall<AskAnswer>(askAnswerPrompt(input, await resolveSection(ASK_KEYS.answer)), { ...frame, names: namesIn(input) }, (o) => checkAskAnswer(o, input));
      if (!answer?.text.trim()) return fixedReply("fallback", FALLBACK_LINE);
      const cards = answer.cards.flatMap((id) => computed.filter((c) => c.prompt.id === id).map((c) => c.stored));
      const offer = offerTarget(asking.asked, fresh.circle, asking.offered, context.name);
      return {
        said: "answer", text: answer.text, cards, choices: [], sources: sourcesFrom(computed, fresh.library),
        offer: offer ? { profileId: offer.profileId } : null,
      };
    }
  }
}

function invalid(error: "validation_error" | "choice_not_offered", message: string): SendAskResult {
  return { kind: "invalid", error, message };
}

/**
 * One message to Ask: text or a tapped choice, never both. The cap comes first and again as the message is stored;
 * then the plan, a fixed line or a question back or the tools and the answer, and the thread as it now stands. A
 * report the message was sent from is read only when the reader can read it (reading 16).
 */
export async function sendAsk(viewer: Viewer, body: SendAskBody, options: AskOptions = {}): Promise<SendAskResult> {
  const now = options.now ?? new Date();
  const userId = viewer.userId;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const choiceId = typeof body.choiceId === "string" ? body.choiceId : "";
  if (!text === !choiceId) return invalid("validation_error", ASK_EMPTY_LINE);
  if (text.length > MESSAGE_MAX) return invalid("validation_error", ASK_TOO_LONG_LINE);
  if (!userId) return { kind: "no_personal_report" };
  if ((await usedThisMonth(userId, now)) >= ASK_MONTHLY_CAP) return { kind: "cap", cap: capOf(now) };

  const reader = await readerChart(viewer);
  if (!reader) return { kind: "no_personal_report" };
  await forgetOld(userId, now);
  const [turns, readable, offered] = await Promise.all([recentTurns(userId), readableNow(viewer, reader.profileId), offeredIn(userId)]);
  const { library } = readable;
  const zone = validZone(options.tz) ?? reader.zone;
  const today = dayIn(now, zone);

  let readerBody: ReaderBody = { text };
  let planChoice: AskPlanChoice | null = null;
  if (choiceId) {
    const tapped = (await lastChoices(userId)).find((c) => c.id === choiceId);
    planChoice = tapped ? planChoiceOf(tapped, library) : null;
    const shown = tapped ? choiceOf(tapped, library, Number(today.slice(0, 4))) : null;
    if (!tapped || !planChoice || !shown) return invalid("choice_not_offered", ASK_CHOICE_GONE_LINE);
    // The thread shows the tap as the words on the button it pressed.
    readerBody = { text: shown.label, choice: tapped };
  }
  if (!(await storeReaderMessage(userId, readerBody, now))) return { kind: "cap", cap: capOf(now) };

  const own = library.reports.find((r) => r.own);
  const name = own?.names[0] ?? "";
  const context: AskContext = {
    message: planChoice ? "" : text,
    tapped: planChoice,
    history: historyFrom(turns, readable.reach),
    today,
    name,
    blind: reader.blind,
    reports: library.reports.map(askReportOf),
    people: library.people.map(askPersonOf),
    fromReport: library.reports.find((r) => r.reportId === body.reportId)?.id ?? null,
  };
  const asking: Asking = { asked: [readerBody.text, ...askedBefore(turns)], offered };
  let reply: Reply;
  try {
    reply = await replyTo(viewer, reader, context, library, turns, zone, now, asking);
  } catch (err) {
    logger.warn({ failure: (err as Error)?.name ?? "Error" }, "ask: a reply could not be made; the reader gets the fallback line");
    reply = fixedReply("fallback", FALLBACK_LINE);
  }
  // When the reply was made, and never before the reader's message, so the thread's order never rests on a tie.
  const at = new Date(Math.max(options.now ? 0 : Date.now(), now.getTime() + 1));
  const stored: AskBody = {
    said: reply.said, text: reply.text, cards: reply.cards, choices: reply.choices, sources: reply.sources,
    ...(reply.offer ? { offer: reply.offer } : {}),
  };
  await db.insert(askMessagesTable).values({ id: randomUUID(), userId, role: "ask", body: stored, createdAt: at });
  return { kind: "thread", thread: await askThread(viewer, { now: at }) };
}

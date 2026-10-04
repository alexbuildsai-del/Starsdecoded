/**
 * The dashboard's one read (ADR-174): the reader's circle with a quick look for
 * each person, their pairs with their stories, and what they are practising, so
 * no card opens a report to draw itself; and from Timeline, Your week for a
 * subscriber or the teaser for a report owner (ADR-211, 212). Who reads what
 * is decided only by access.ts, the rule every list uses (ADR-139, ADR-182);
 * the builders are pure over the rows `loadHome` reads, so every rule here is
 * tested without a database (MB-49).
 */
import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { z } from "zod";
import {
  db,
  profilesTable,
  relationshipParticipantsTable,
  relationshipsTable,
  reportWorkbooksTable,
  reportsTable,
} from "@workspace/db";
import type { GetHomeResponse } from "@workspace/api-zod";
import {
  isSelfFor,
  mayRegenerate,
  natalReportAccess,
  pairReadable,
  readerKey,
  viewerRelationshipIds,
  type PairPerson,
  type ProfileHolders,
  type Viewer,
} from "./access.js";
import { logger } from "./logger.js";
import { firstWord } from "./names.js";
import { shareBackOffered, sharedProfileIds } from "./shares.js";
import { readerChart, teaserView, weekView, type ReaderChart } from "./timeline.js";
import { PAIR_PROMPT_VERSION } from "../prompts/pair/index.js";

export type Home = z.infer<typeof GetHomeResponse>;
export type HomePerson = Home["people"][number];
export type HomePair = Home["pairs"][number];
export type HomePractice = Home["practising"][number];
type Spot = NonNullable<HomePerson["triad"]>["sun"];
type SpotPoint = NonNullable<Spot["band"]>["from"];

export type Workbook = Record<string, string>;
export type WorkbookPatch = Record<string, string | null>;

const ITEM_KEY = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+\.\d+$/;

// A pin sits beside the ticks in the reader's own workbook on the report, so
// pins, like ticks, are each reader's and never show to another (ADR-239).
export const PIN_PREFIX = "pin.";
export const PIN_LIMIT = 3;

/** A segment may carry digits, since a pair chapter's id does ("partners02.nextTime.items.0"). */
export function isItemKey(key: string): boolean {
  return ITEM_KEY.test(key) && !key.startsWith(PIN_PREFIX);
}

export function isPinKey(key: string): boolean {
  return key.startsWith(PIN_PREFIX) && isItemKey(key.slice(PIN_PREFIX.length));
}

export function isWorkbookKey(key: string): boolean {
  return isItemKey(key) || isPinKey(key);
}

/** Only string values are the reader's, whatever an older write left in the column. */
export function workbookOf(value: unknown): Workbook {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

/** The item keys pinned on a report, oldest pin first. */
export function pinsOf(workbook: Workbook): Array<{ key: string; at: string }> {
  return Object.entries(workbook)
    .filter(([key, at]) => isPinKey(key) && !!at)
    .map(([key, at]) => ({ key: key.slice(PIN_PREFIX.length), at }))
    .sort((x, y) => x.at.localeCompare(y.at) || x.key.localeCompare(y.key));
}

/**
 * One shallow merge, as a tick has always been (ADR-24). A patch that pins
 * something new past the limit is refused whole, while unpinning always goes
 * through, so a report left over the limit can still be brought under it.
 */
export function patchWorkbook(current: Workbook, patch: WorkbookPatch): { workbook: Workbook } | { error: "pin_limit" } {
  const workbook: Workbook = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete workbook[key];
    else workbook[key] = value;
  }
  const pinsAnother = Object.entries(patch).some(([key, value]) => isPinKey(key) && !!value && !current[key]);
  if (pinsAnother && pinsOf(workbook).length > PIN_LIMIT) return { error: "pin_limit" };
  return { workbook };
}

type HomeProfile = ProfileHolders & {
  id: string;
  name: string;
  birthDate: string;
  isSelf: boolean;
  claimedAsSelf: boolean;
  chartData: unknown;
  createdAt: Date;
};

export type NatalRow = {
  id: string;
  status: string;
  sessionId: string;
  createdAt: Date;
  interpretation: unknown;
  /** The reader's own ticks and pins on the report, never another reader's (ADR-239). */
  workbook: unknown;
  profile: HomeProfile;
};

export type PairRow = {
  id: string;
  status: string;
  createdAt: Date;
  interpretation: unknown;
  /** The reader's own ticks and pins on the report, never another reader's (ADR-239). */
  workbook: unknown;
  relationship: { type: string; label: string | null; userId: string | null; sessionId: string };
  /** In position order, since the report's items name its two as A and B. */
  parts: Array<PairPerson & { isSelf: boolean; claimedAsSelf: boolean }>;
};

/**
 * What the reader's grants add (ADR-235): the profiles shared with them while
 * the grant stands, and of those, the ones whose sharer they are offered Share
 * yours back for. A session holds none, since only an account is shared with.
 */
export type Grants = { shared: ReadonlySet<string>; shareBack: ReadonlySet<string> };

const NO_GRANTS: Grants = { shared: new Set(), shareBack: new Set() };

type Seat = {
  row: NatalRow;
  access: HomePerson["access"];
  isSelf: boolean;
  shareBack?: boolean;
  canRegenerate: boolean;
};

function newer(x: { createdAt: Date; id: string }, y: { createdAt: Date; id: string }): boolean {
  const by = x.createdAt.getTime() - y.createdAt.getTime();
  return by > 0 || (by === 0 && x.id > y.id);
}

/** A failed report holds only what was written before it stopped, if anything, so nothing is read from it. */
function written(row: { status: string }): boolean {
  return row.status !== "failed";
}

/** A report that did not fail outranks one that did, whatever their dates, so a failed retry never hides one that still opens. */
function outranks(x: NatalRow, y: NatalRow): boolean {
  return written(x) === written(y) ? newer(x, y) : written(x);
}

/**
 * One seat per person: their latest Personal report the reader can read that
 * did not fail. A report still being written holds its seat already, and a
 * person whose every report failed keeps theirs at the latest of them, so
 * their row and quick look say so rather than the person vanishing (ADR-84).
 * A sharer is seated only while their grant stands, so Stop sharing takes
 * them from the circle at once (ADR-235).
 */
function seatsOf(viewer: Viewer, natal: readonly NatalRow[], grants: Grants): Seat[] {
  const latest = new Map<string, Seat>();
  for (const row of natal) {
    const access = natalReportAccess(viewer, row.profile, row, grants.shared.has(row.profile.id));
    if (access !== "owner" && access !== "claimed" && access !== "shared") continue;
    const kept = latest.get(row.profile.id);
    if (kept && !outranks(row, kept.row)) continue;
    latest.set(row.profile.id, {
      row,
      access,
      isSelf: isSelfFor(viewer, row.profile),
      ...(access === "shared" ? { shareBack: grants.shareBack.has(row.profile.id) } : {}),
      canRegenerate: mayRegenerate(viewer, row.profile, row),
    });
  }
  return [...latest.values()].sort((x, y) =>
    x.row.profile.createdAt.getTime() - y.row.profile.createdAt.getTime() || x.row.profile.id.localeCompare(y.row.profile.id),
  );
}

type Placement = { sign?: unknown; degree?: unknown; house?: unknown };

type StoredChart = {
  windowMinutes?: unknown;
  planets?: Record<string, Placement & { band?: { fromDegree?: unknown; toDegree?: unknown } }>;
  angles?: { ascendant?: Placement };
} | null;

// The engine keeps its own list private, and a range's two ends need a sign from a longitude.
const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

function spotOf(body: Placement | undefined, housed: boolean): Spot | null {
  if (typeof body?.sign !== "string" || typeof body.degree !== "number" || !Number.isFinite(body.degree)) return null;
  const house = housed && Number.isInteger(body.house) && Number(body.house) >= 1 && Number(body.house) <= 12
    ? Number(body.house)
    : null;
  return { sign: body.sign, degree: Math.round(body.degree * 100) / 100, house };
}

/** Counted in hundredths of a degree, so a point rounded up to a cusp reads 0° of the next sign, never 30° of its own. */
function pointOf(longitude: unknown): SpotPoint | null {
  if (typeof longitude !== "number" || !Number.isFinite(longitude)) return null;
  const at = ((Math.round(longitude * 100) % 36000) + 36000) % 36000;
  return { sign: SIGNS[Math.floor(at / 3000)], degree: (at % 3000) / 100 };
}

/**
 * The Moon's range across a windowed birth time, from the two ends of the band
 * the stored chart keeps for it (MB-139). Each end takes its sign from its own
 * longitude: the Moon's `sign` is the one it held longest across the band,
 * which would misname one end of a range across a cusp.
 */
function moonRangeOf(chart: StoredChart): Spot["band"] {
  if (typeof chart?.windowMinutes !== "number" || chart.windowMinutes <= 0) return null;
  const band = chart.planets?.moon?.band;
  const from = pointOf(band?.fromDegree);
  const to = pointOf(band?.toDegree);
  return from && to ? { from, to } : null;
}

/**
 * The stored chart's Sun, Moon and Rising. A body has no house without a birth
 * time (R-4.6), and the Rising never shows one: it is where the first house
 * begins. On a windowed birth time the Moon carries its range.
 */
export function triadOf(chartData: unknown): HomePerson["triad"] {
  const chart = chartData as StoredChart;
  const sun = spotOf(chart?.planets?.sun, true);
  const moon = spotOf(chart?.planets?.moon, true);
  if (!sun || !moon) return null;
  const band = moonRangeOf(chart);
  return { sun, moon: band ? { ...moon, band } : moon, rising: spotOf(chart?.angles?.ascendant, false) };
}

/** A point with no space after it is a decimal, not the end of a sentence. */
export function firstSentence(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return /^.+?[.!?…]+["'”’)]*(?=\s|$)/.exec(flat)?.[0] ?? flat;
}

type Chapter08Item = { title?: unknown; text?: unknown };

function lineOf(item: Chapter08Item | undefined): string | null {
  const title = typeof item?.title === "string" ? item.title.trim() : "";
  const sentence = typeof item?.text === "string" ? firstSentence(item.text) : "";
  if (!title || !sentence) return null;
  return `${/[.!?…:]$/.test(title) ? title : `${title}.`} ${sentence}`;
}

/** Chapter 08's superpower and growing edge, each its title then its first sentence, as written (ADR-18). */
export function linesOf(interpretation: unknown): HomePerson["lines"] {
  const chapter = (interpretation as { superpowers?: { superpower?: Chapter08Item; growingEdge?: Chapter08Item } } | null)
    ?.superpowers;
  const superpower = lineOf(chapter?.superpower);
  const growingEdge = lineOf(chapter?.growingEdge);
  return superpower && growingEdge ? { superpower, growingEdge } : null;
}

function personOf(seat: Seat, lines: HomePerson["lines"]): HomePerson {
  const { row, access, isSelf, shareBack, canRegenerate } = seat;
  return {
    profileId: row.profile.id,
    reportId: row.id,
    name: row.profile.name,
    birthDate: row.profile.birthDate,
    status: row.status as HomePerson["status"],
    access,
    isSelf,
    ...(shareBack === undefined ? {} : { shareBack }),
    canRegenerate,
    triad: triadOf(row.profile.chartData),
    lines,
  };
}

// MB-65 provisional: a pair written before p2 cannot render on the seven-chapter
// page, so no list shows it. Every version since renders (p2 to p5, as the web
// lists them); the current one is listed too, so a bump that forgets this list
// still shows its new pairs.
const LISTED_PAIR_VERSIONS: ReadonlySet<string> = new Set(["p2", "p3", "p4", "p5", PAIR_PROMPT_VERSION]);

export function pairListed(report: { status: string; interpretation: unknown }): boolean {
  if (report.status !== "complete") return true;
  const version = (report.interpretation as { meta?: { promptVersion?: unknown } } | null)?.meta?.promptVersion;
  return typeof version === "string" && LISTED_PAIR_VERSIONS.has(version);
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((s): s is string => typeof s === "string" && s.trim() !== "") : [];

// MB-103 provisional: the reader is one of a pair when one of its two is their
// own chart, or when it was shared with them as its other person.
function isOneOf(viewer: Viewer, parts: PairRow["parts"]): boolean {
  return parts.some((p) =>
    isSelfFor(viewer, p) || (!!viewer.userId && p.claimedByUserId === viewer.userId && p.accessRole === "participant"),
  );
}

type Listed = { row: PairRow; pair: HomePair; practised: boolean };

/**
 * The pairs GET /reports lists, newest first. MB-103 provisional: one its maker
 * can no longer read stays, closed and naming who stopped sharing, with nothing
 * of it shown; one shared with the reader goes when its sender stops. One made
 * from a chart shared with its maker closes the same way when that grant goes
 * (ADR-235).
 */
function listedPairs(viewer: Viewer, rows: readonly PairRow[], shared: ReadonlySet<string>): Listed[] {
  return rows
    .filter((row) => row.parts.length === 2 && pairListed(row))
    .flatMap((row): Listed[] => {
      const reading = pairReadable(viewer, row.relationship, row.parts, shared);
      if (!reading.readable && !reading.stoppedBy) return [];
      const two = reading.readable
        ? ((row.interpretation as { twoCharts?: Record<string, unknown> } | null)?.twoCharts ?? null)
        : null;
      const headline = typeof two?.headline === "string" ? two.headline.trim() : "";
      const [a, b] = row.parts;
      return [{
        row,
        practised: reading.readable && isOneOf(viewer, row.parts),
        pair: {
          reportId: row.id,
          lens: row.relationship.type as HomePair["lens"],
          label: row.relationship.label,
          a: { profileId: a.profileId, name: a.name },
          b: { profileId: b.profileId, name: b.name },
          status: row.status as HomePair["status"],
          stoppedBy: reading.stoppedBy,
          strong: strings(two?.strong),
          challenge: strings(two?.work)[0] ?? null,
          story: headline ? { headline, strengths: strings(two?.strengths) } : null,
        },
      }];
    })
    .sort((x, y) => (newer(x.row, y.row) ? -1 : newer(y.row, x.row) ? 1 : 0));
}

/** With nothing pinned, the reader's own report offers this (ADR-174). */
export const CLOSING_FIRST_PRACTICE = "focus.practice.bullets.0";

type Leaf = { point?: unknown; action?: unknown; why?: unknown; for?: unknown };

/** A key is the section, the path and the index the report built it from, so it leads back to its item. */
function itemAt(interpretation: unknown, key: string): Leaf | null {
  let node: unknown = interpretation;
  for (const segment of key.split(".")) {
    if (Array.isArray(node)) node = /^\d+$/.test(segment) ? node[Number(segment)] : undefined;
    else if (node && typeof node === "object" && Object.hasOwn(node, segment)) node = (node as Record<string, unknown>)[segment];
    else return null;
  }
  return node && typeof node === "object" && !Array.isArray(node) ? (node as Leaf) : null;
}

/** A pair's item reads as its report's checklist prints it, led by whose it is. */
function wordsOf(leaf: Leaf, names: { a: string; b: string } | null): Pick<HomePractice, "action" | "why"> | null {
  const text = typeof leaf.point === "string" ? leaf.point.trim() : typeof leaf.action === "string" ? leaf.action.trim() : "";
  if (!text) return null;
  const who = !names ? "" : leaf.for === "A" ? firstWord(names.a) : leaf.for === "B" ? firstWord(names.b) : leaf.for === "both" ? "Both" : "";
  const why = typeof leaf.why === "string" && leaf.why.trim() ? leaf.why.trim() : null;
  return { action: who ? `${who}: ${text}` : text, why };
}

type Source = {
  reportId: string;
  kind: HomePractice["kind"];
  interpretation: unknown;
  workbook: Workbook;
  names: { a: string; b: string } | null;
  offers: boolean;
};

/**
 * Reading 5: the reader's own Personal report and the pairs they are one of,
 * never another person's report, a sharer's included. Pins come first, oldest
 * first, then what an own report with nothing pinned offers; pins and ticks are
 * the reader's own (ADR-239).
 */
function practisingOf(selves: readonly Seat[], pairs: readonly Listed[]): HomePractice[] {
  const sources: Source[] = [
    ...selves.map(({ row }): Source => ({
      reportId: row.id, kind: "natal", interpretation: row.interpretation, workbook: workbookOf(row.workbook), names: null, offers: true,
    })),
    ...pairs.filter((p) => p.practised).map(({ row, pair }): Source => ({
      reportId: row.id, kind: "compatibility", interpretation: row.interpretation, workbook: workbookOf(row.workbook),
      names: { a: pair.a.name, b: pair.b.name }, offers: false,
    })),
  ];
  const pinned: Array<{ at: string; order: number; item: HomePractice }> = [];
  const offered: HomePractice[] = [];
  sources.forEach((source, order) => {
    const practice = (key: string, isPinned: boolean): HomePractice | null => {
      const leaf = itemAt(source.interpretation, key);
      const words = leaf && wordsOf(leaf, source.names);
      if (!words) return null;
      return { reportId: source.reportId, kind: source.kind, key, ...words, pinned: isPinned, ticked: !!source.workbook[key] };
    };
    const mine = pinsOf(source.workbook).flatMap(({ key, at }) => {
      const item = practice(key, true);
      return item ? [{ at, order, item }] : [];
    });
    pinned.push(...mine);
    if (mine.length || !source.offers) return;
    const first = practice(CLOSING_FIRST_PRACTICE, false);
    if (first) offered.push(first);
  });
  pinned.sort((x, y) => x.at.localeCompare(y.at) || x.order - y.order || x.item.key.localeCompare(y.item.key));
  return [...pinned.map((p) => p.item), ...offered];
}

/**
 * The circle is the reader and everyone whose Personal report they can read
 * (ADR-182), a sharer among them while their grant stands (ADR-235); their own
 * sits at the centre, unless several are marked as theirs, when every marked
 * one stays among the people until they settle which. A failed report keeps
 * its person's seat and lends nothing more: no lines and nothing to practise.
 */
export function buildHome(
  viewer: Viewer,
  natal: readonly NatalRow[],
  pairs: readonly PairRow[],
  grants: Grants = NO_GRANTS,
): Home {
  const seats = seatsOf(viewer, natal, grants);
  const selves = seats.filter((s) => s.isSelf);
  const you = selves.length === 1 ? selves[0] : null;
  const listed = listedPairs(viewer, pairs, grants.shared);
  return {
    you: you ? personOf(you, written(you.row) ? linesOf(you.row.interpretation) : null) : null,
    several: selves.length > 1,
    people: seats.filter((s) => s !== you).map((s) => personOf(s, null)),
    pairs: listed.map((l) => l.pair),
    practising: practisingOf(selves.filter((s) => written(s.row)), listed),
  };
}

/** The reader's own row of report_workbooks, so no reader is ever handed another's ticks (ADR-239). */
function ownWorkbook(viewer: Viewer) {
  return and(eq(reportWorkbooksTable.reportId, reportsTable.id), eq(reportWorkbooksTable.reader, readerKey(viewer)));
}

/**
 * The same reach GET /reports has: a natal report through its profile, the
 * reader's own, sent to them, or shared with them while the grant stands
 * (ADR-235). It returns the query unrun, so a test reads what it asks without
 * a database (MB-49).
 */
export function natalRowsOf(viewer: Viewer, shared: ReadonlySet<string>) {
  const reach = viewer.userId
    ? or(
        eq(profilesTable.userId, viewer.userId),
        eq(profilesTable.claimedByUserId, viewer.userId),
        ...(shared.size ? [inArray(profilesTable.id, [...shared])] : []),
      )
    : eq(reportsTable.sessionId, viewer.sessionId);
  return db
    .select({
      id: reportsTable.id,
      status: reportsTable.status,
      sessionId: reportsTable.sessionId,
      createdAt: reportsTable.createdAt,
      interpretation: reportsTable.interpretation,
      workbook: reportWorkbooksTable.workbook,
      profile: {
        id: profilesTable.id,
        name: profilesTable.name,
        birthDate: profilesTable.birthDate,
        userId: profilesTable.userId,
        sessionId: profilesTable.sessionId,
        claimedByUserId: profilesTable.claimedByUserId,
        isSelf: profilesTable.isSelf,
        claimedAsSelf: profilesTable.claimedAsSelf,
        chartData: profilesTable.chartData,
        createdAt: profilesTable.createdAt,
      },
    })
    .from(reportsTable)
    .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
    .leftJoin(reportWorkbooksTable, ownWorkbook(viewer))
    .where(and(eq(reportsTable.type, "natal"), reach));
}

/** A pair through the reader's relationships, unrun like `natalRowsOf`. */
export function pairReportsOf(viewer: Viewer, relationshipIds: readonly string[]) {
  return db
    .select({
      id: reportsTable.id,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
      interpretation: reportsTable.interpretation,
      workbook: reportWorkbooksTable.workbook,
      relationship: relationshipsTable,
    })
    .from(reportsTable)
    .innerJoin(relationshipsTable, eq(reportsTable.relationshipId, relationshipsTable.id))
    .leftJoin(reportWorkbooksTable, ownWorkbook(viewer))
    .where(and(eq(reportsTable.type, "compatibility"), inArray(reportsTable.relationshipId, [...relationshipIds])));
}

async function pairRowsOf(viewer: Viewer): Promise<PairRow[]> {
  const { owned, participant } = await viewerRelationshipIds(viewer);
  const ids = [...new Set([...owned, ...participant])];
  if (!ids.length) return [];
  const [reports, parts] = await Promise.all([
    pairReportsOf(viewer, ids),
    db
      .select({
        relationshipId: relationshipParticipantsTable.relationshipId,
        accessRole: relationshipParticipantsTable.accessRole,
        profileId: profilesTable.id,
        name: profilesTable.name,
        userId: profilesTable.userId,
        sessionId: profilesTable.sessionId,
        claimedByUserId: profilesTable.claimedByUserId,
        isSelf: profilesTable.isSelf,
        claimedAsSelf: profilesTable.claimedAsSelf,
      })
      .from(relationshipParticipantsTable)
      .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
      .where(inArray(relationshipParticipantsTable.relationshipId, ids))
      .orderBy(asc(relationshipParticipantsTable.position)),
  ]);
  const byPair = new Map<string, PairRow["parts"]>();
  for (const { relationshipId, ...part } of parts) byPair.set(relationshipId, [...(byPair.get(relationshipId) ?? []), part]);
  return reports.map((r) => ({ ...r, parts: byPair.get(r.relationship.id) ?? [] }));
}

async function shareBackOf(viewer: Viewer, shared: ReadonlySet<string>): Promise<Set<string>> {
  const userId = viewer.userId;
  if (!userId) return new Set();
  const offered = await Promise.all([...shared].map(async (id) => ((await shareBackOffered(userId, id)) ? [id] : [])));
  return new Set(offered.flat());
}

export interface HomeOptions {
  /** The browser's zone, which Your week's days are read in; the birth place's when the server cannot read it (reading 4). */
  tz?: string | null;
  now?: Date;
  /**
   * The one access check's answer (ADR-262), which the route asks, so this file never reads a request; null when the
   * check could not be read, which shows neither section.
   */
  access?: boolean | null;
}

/** Whether the reader has Timeline, and their own chart with a finished Personal report to read it from (reading 2). */
export interface HomeTimeline {
  access: boolean;
  reader: ReaderChart | null;
}

export type TimelineSlot = "week" | "teaser" | null;

/** Nobody in the circle and no pair: the dashboard's empty state, as the web reads it. */
function isEmpty(home: Home): boolean {
  return !home.you && !home.several && home.people.length === 0 && home.pairs.length === 0;
}

/**
 * Which of Timeline's two sections the dashboard carries (ADR-211, 212, 262; reading 26): Your week for a reader with
 * Timeline and their own chart; the teaser for one without it whose own Personal report is finished, never on an empty
 * dashboard; neither for anyone else, a subscriber with no chart to read among them.
 */
export function timelineSlotOf(home: Home, timeline: HomeTimeline | null): TimelineSlot {
  if (!timeline?.reader) return null;
  if (timeline.access) return "week";
  return isEmpty(home) ? null : "teaser";
}

/**
 * Your week or the teaser, whichever the slot holds, and neither key otherwise, so every other home reads as it did.
 * The engine's work fails alone: the dashboard still opens, with neither.
 */
export function timelinePartOf(home: Home, timeline: HomeTimeline | null, options: HomeOptions = {}): Pick<Home, "week" | "teaser"> {
  const slot = timelineSlotOf(home, timeline);
  const reader = timeline?.reader;
  if (!slot || !reader) return {};
  const now = options.now ?? new Date();
  try {
    if (slot === "week") return { week: weekView(reader, options.tz, now) };
    const teaser = teaserView(reader, now);
    return teaser ? { teaser } : {};
  } catch (err) {
    logger.error({ err }, "Your week or the teaser could not be drawn; the home shows neither");
    return {};
  }
}

/**
 * Whether the signed-in reader has Timeline, and their chart. Both are an account's (ADR-262), so a session is asked
 * nothing. A read that fails is neither: the dashboard still opens, and a broken read never offers a subscriber the
 * teaser.
 */
async function homeTimelineOf(viewer: Viewer, access: boolean | null | undefined): Promise<HomeTimeline | null> {
  if (!viewer.userId || access === null) return null;
  try {
    return { access: access === true, reader: await readerChart(viewer) };
  } catch (err) {
    logger.error({ err }, "Timeline could not be read for the home; it shows neither Your week nor the teaser");
    return null;
  }
}

export async function loadHome(viewer: Viewer, options: HomeOptions = {}): Promise<Home> {
  const shared = sharedProfileIds(viewer.userId);
  const [natal, shareBack, pairs, timeline] = await Promise.all([
    shared.then((ids) => natalRowsOf(viewer, ids)),
    shared.then((ids) => shareBackOf(viewer, ids)),
    pairRowsOf(viewer),
    homeTimelineOf(viewer, options.access),
  ]);
  const home = buildHome(viewer, natal, pairs, { shared: await shared, shareBack });
  return { ...home, ...timelinePartOf(home, timeline, options) };
}

/**
 * The dashboard's one read (ADR-174): the reader's circle with a quick look for
 * each person, their pairs with their stories, and what they are practising, so
 * no card opens a report to draw itself. Who reads what is decided only by
 * access.ts, the rule every list uses (ADR-139, ADR-182); the builders are pure
 * over the rows `loadHome` reads, so every rule here is tested without a
 * database (MB-49).
 */
import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { z } from "zod";
import {
  db,
  profilesTable,
  relationshipParticipantsTable,
  relationshipsTable,
  reportsTable,
} from "@workspace/db";
import type { GetHomeResponse } from "@workspace/api-zod";
import {
  isSelfFor,
  natalReportAccess,
  pairReadable,
  viewerRelationshipIds,
  type PairPerson,
  type ProfileHolders,
  type Viewer,
} from "./access.js";
import { firstWord } from "./names.js";
import { PAIR_PROMPT_VERSION } from "../prompts/pair/index.js";

export type Home = z.infer<typeof GetHomeResponse>;
export type HomePerson = Home["people"][number];
export type HomePair = Home["pairs"][number];
export type HomePractice = Home["practising"][number];
type Spot = NonNullable<HomePerson["triad"]>["sun"];

export type Workbook = Record<string, string>;
export type WorkbookPatch = Record<string, string | null>;

const ITEM_KEY = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+\.\d+$/;

// MB-110 provisional: a pin is kept in the report's workbook beside the ticks,
// so everyone who reads the report shares its pins as they share its ticks.
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
  workbook: unknown;
  profile: HomeProfile;
};

export type PairRow = {
  id: string;
  status: string;
  createdAt: Date;
  interpretation: unknown;
  workbook: unknown;
  relationship: { type: string; label: string | null; userId: string | null; sessionId: string };
  /** In position order, since the report's items name its two as A and B. */
  parts: Array<PairPerson & { isSelf: boolean; claimedAsSelf: boolean }>;
};

type Seat = { row: NatalRow; access: HomePerson["access"]; isSelf: boolean };

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
 */
function seatsOf(viewer: Viewer, natal: readonly NatalRow[]): Seat[] {
  const latest = new Map<string, Seat>();
  for (const row of natal) {
    const access = natalReportAccess(viewer, row.profile, row);
    if (access !== "owner" && access !== "claimed") continue;
    const kept = latest.get(row.profile.id);
    if (kept && !outranks(row, kept.row)) continue;
    latest.set(row.profile.id, { row, access, isSelf: isSelfFor(viewer, row.profile) });
  }
  return [...latest.values()].sort((x, y) =>
    x.row.profile.createdAt.getTime() - y.row.profile.createdAt.getTime() || x.row.profile.id.localeCompare(y.row.profile.id),
  );
}

type Placement = { sign?: unknown; degree?: unknown; house?: unknown };

function spotOf(body: Placement | undefined, housed: boolean): Spot | null {
  if (typeof body?.sign !== "string" || typeof body.degree !== "number" || !Number.isFinite(body.degree)) return null;
  const house = housed && Number.isInteger(body.house) && Number(body.house) >= 1 && Number(body.house) <= 12
    ? Number(body.house)
    : null;
  return { sign: body.sign, degree: Math.round(body.degree * 100) / 100, house };
}

/**
 * The stored chart's Sun, Moon and Rising. A body has no house without a birth
 * time (R-4.6), and the Rising never shows one: it is where the first house begins.
 */
export function triadOf(chartData: unknown): HomePerson["triad"] {
  const chart = chartData as { planets?: Record<string, Placement>; angles?: { ascendant?: Placement } } | null;
  const sun = spotOf(chart?.planets?.sun, true);
  const moon = spotOf(chart?.planets?.moon, true);
  if (!sun || !moon) return null;
  return { sun, moon, rising: spotOf(chart?.angles?.ascendant, false) };
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
  const { row, access, isSelf } = seat;
  return {
    profileId: row.profile.id,
    reportId: row.id,
    name: row.profile.name,
    birthDate: row.profile.birthDate,
    status: row.status as HomePerson["status"],
    access,
    isSelf,
    triad: triadOf(row.profile.chartData),
    lines,
  };
}

// MB-65 provisional: a pair written before p2 cannot render on the seven-chapter
// page, so no list shows it; p2 keeps rendering beside the current version (reading 15).
const LISTED_PAIR_VERSIONS: ReadonlySet<string> = new Set(["p2", PAIR_PROMPT_VERSION]);

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
 * of it shown; one shared with the reader goes when its sender stops.
 */
function listedPairs(viewer: Viewer, rows: readonly PairRow[]): Listed[] {
  return rows
    .filter((row) => row.parts.length === 2 && pairListed(row))
    .flatMap((row): Listed[] => {
      const reading = pairReadable(viewer, row.relationship, row.parts);
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
 * never another person's report. Pins come first, oldest first, then what an
 * own report with nothing pinned offers. MB-110 provisional, as pins are.
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
 * (ADR-182); their own sits at the centre, unless several are marked as theirs,
 * when every marked one stays among the people until they settle which. A
 * failed report keeps its person's seat and lends nothing more: no lines and
 * nothing to practise.
 */
export function buildHome(viewer: Viewer, natal: readonly NatalRow[], pairs: readonly PairRow[]): Home {
  const seats = seatsOf(viewer, natal);
  const selves = seats.filter((s) => s.isSelf);
  const you = selves.length === 1 ? selves[0] : null;
  const listed = listedPairs(viewer, pairs);
  return {
    you: you ? personOf(you, written(you.row) ? linesOf(you.row.interpretation) : null) : null,
    several: selves.length > 1,
    people: seats.filter((s) => s !== you).map((s) => personOf(s, null)),
    pairs: listed.map((l) => l.pair),
    practising: practisingOf(selves.filter((s) => written(s.row)), listed),
  };
}

/** The same reach GET /reports has: a natal report through its profile, a pair through the reader's relationships. */
async function natalRowsOf(viewer: Viewer): Promise<NatalRow[]> {
  const reach = viewer.userId
    ? or(eq(profilesTable.userId, viewer.userId), eq(profilesTable.claimedByUserId, viewer.userId))
    : eq(reportsTable.sessionId, viewer.sessionId);
  return db
    .select({
      id: reportsTable.id,
      status: reportsTable.status,
      sessionId: reportsTable.sessionId,
      createdAt: reportsTable.createdAt,
      interpretation: reportsTable.interpretation,
      workbook: reportsTable.workbook,
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
    .where(and(eq(reportsTable.type, "natal"), reach));
}

async function pairRowsOf(viewer: Viewer): Promise<PairRow[]> {
  const { owned, participant } = await viewerRelationshipIds(viewer);
  const ids = [...new Set([...owned, ...participant])];
  if (!ids.length) return [];
  const [reports, parts] = await Promise.all([
    db
      .select({
        id: reportsTable.id,
        status: reportsTable.status,
        createdAt: reportsTable.createdAt,
        interpretation: reportsTable.interpretation,
        workbook: reportsTable.workbook,
        relationship: relationshipsTable,
      })
      .from(reportsTable)
      .innerJoin(relationshipsTable, eq(reportsTable.relationshipId, relationshipsTable.id))
      .where(and(eq(reportsTable.type, "compatibility"), inArray(reportsTable.relationshipId, ids))),
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

export async function loadHome(viewer: Viewer): Promise<Home> {
  const [natal, pairs] = await Promise.all([natalRowsOf(viewer), pairRowsOf(viewer)]);
  return buildHome(viewer, natal, pairs);
}

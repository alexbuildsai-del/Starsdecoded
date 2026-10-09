/**
 * The dashboard's one read (ADR-174): the reader's circle with a quick look for
 * each person, their pairs, and what they are practising, so no card opens a
 * report to draw itself; who reads each report and where the reader is on Your
 * first steps, so every screen reads one answer (ADR-341); and from Timeline,
 * Your week for a subscriber or the teaser for a report owner (ADR-211, 212).
 * Who reads what is decided only by access.ts, the rule every list uses
 * (ADR-139, ADR-182); the builders are pure over the rows `loadHome` reads, so
 * every rule here is tested without a database (MB-49).
 */
import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { z } from "zod";
import {
  db,
  inviteTokensTable,
  profilesTable,
  relationshipParticipantsTable,
  relationshipsTable,
  reportWorkbooksTable,
  reportsTable,
} from "@workspace/db";
import type { GetHomeResponse } from "@workspace/api-zod";
import {
  giverIdOf,
  isSelfFor,
  mayRegenerate,
  natalReportAccess,
  ownsRelationship,
  pairReadable,
  pairSendStateFor,
  readerKey,
  viewerRelationshipIds,
  type PairPerson,
  type PairReading,
  type ProfileHolders,
  type Viewer,
} from "./access.js";
import { isFinal } from "./failureReasons.js";
import { logger } from "./logger.js";
import { firstNameOf, firstWord } from "./names.js";
import { shareBackOffered, sharedProfileIds, sharesOf, type ShareRow } from "./shares.js";
import { readerChart, teaserView, weekView, type ReaderChart } from "./timeline.js";
import { PAIR_PROMPT_VERSION } from "../prompts/pair/index.js";

export type Home = z.infer<typeof GetHomeResponse>;
export type HomePerson = Home["people"][number];
export type HomePair = Home["pairs"][number];
export type HomePractice = Home["practising"][number];
export type HomeReader = HomePerson["readers"][number];
export type FirstSteps = NonNullable<Home["firstSteps"]>;
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
  /** Failures since it last took a credit or finished; the third makes a failed report final (ADR-313). None when absent. */
  failedTries?: number;
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
  /** Its `id` is what the pair's links name; a row without one matches no link. */
  relationship: { id?: string; type: string; label: string | null; userId: string | null; sessionId: string };
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

/** A send or a gift the reader made, in any state (ADR-139, 181, 331). */
export type LinkRow = {
  id: string;
  kind: string;
  /** The address the reader typed for it. */
  email: string;
  profileId: string | null;
  relationshipId: string | null;
  recipientName: string | null;
  claimedAt: Date | null;
  claimedByUserId: string | null;
  revokedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

/**
 * What the reader has shared, sent and gifted, for who reads what and for Your
 * first steps (ADR-341); none for a session, which shares nothing. `names` holds
 * the first names the lists show, by account.
 */
export type Sharing = {
  /** Their own Personal report's waiting links and standing grants, as `sharesOf` lists them (ADR-235). */
  shares: readonly ShareRow[];
  links: readonly LinkRow[];
  names: ReadonlyMap<string, string | null>;
  now?: Date;
};

const NO_SHARING: Sharing = { shares: [], links: [], names: new Map() };

// A send's link lives a week from the day it went out, a gift's until its stored date (ADR-123). Nothing sweeps old
// links, so every read applies the lifetime itself, as invites.ts and shares.ts do.
const SEND_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/** A link that can still be claimed: not claimed, not cancelled, not run out. */
function waits(link: LinkRow, now: Date): boolean {
  if (link.claimedAt || link.revokedAt || link.expiresAt.getTime() <= now.getTime()) return false;
  return link.kind === "gift" || link.createdAt.getTime() > now.getTime() - SEND_LIFETIME_MS;
}

const oldestFirst = (x: LinkRow, y: LinkRow) => x.createdAt.getTime() - y.createdAt.getTime() || x.id.localeCompare(y.id);

const address = (email: string) => email.trim().toLowerCase();

function nameOf(sharing: Sharing, userId: string | null): string | null {
  return userId ? (sharing.names.get(userId) ?? null) : null;
}

function invited(link: { id: string; email: string }): HomeReader {
  return { name: null, email: link.email || null, state: "invited", shareId: null, inviteId: link.id };
}

/**
 * Once they can read it, a reader is named by first name alone, never by an address (ADR-135): the address the reader
 * typed was for the link, and a grant made without a link has no address the reader gave (R15-18's lesson).
 */
function readsIt(name: string | null, shareId: string | null = null): HomeReader {
  return { name, email: null, state: "can-read", shareId, inviteId: null };
}

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

// A report under a horizon pass keeps its text, so it counts as finished, as `ownChartOf` counts it.
const FINISHED: ReadonlySet<string> = new Set(["complete", "revising"]);

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
 * them from the circle at once (ADR-235). A final report offers no Try again:
 * its credit is back, and one more try would be a report nobody paid for
 * (ADR-313).
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
      canRegenerate: mayRegenerate(viewer, row.profile, row) && !isFinal({ type: "natal", status: row.status, failedTries: row.failedTries }),
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

/** Whose own chart a sharer's seat is: whichever of its holders keeps it as theirs (ADR-235), as reports.ts reads it. */
function keeperOf(profile: HomeProfile): string | null {
  for (const id of [profile.claimedByUserId, profile.userId]) {
    if (id && isSelfFor({ userId: id, sessionId: "" }, profile)) return id;
  }
  return null;
}

/** The account a person in the circle reads with: a sharer's own, or whoever holds a report the reader wrote. */
function accountOf(seat: Seat): string | null {
  if (seat.access === "shared") return keeperOf(seat.row.profile);
  return seat.access === "owner" ? seat.row.profile.claimedByUserId : null;
}

/**
 * Everyone who reads the reader's own Personal report besides them (ADR-235,
 * 390): each waiting link by the address the reader typed, each grant that
 * stands by its reader's first name. A report someone wrote and sent to the
 * reader is read by its writer too, until the reader stops sharing it (ADR-139),
 * so the window's "Only the people below can read it" holds.
 */
function ownReaders(viewer: Viewer, seat: Seat, sharing: Sharing): HomeReader[] {
  const shared = sharing.shares
    .filter((share) => share.profileId === seat.row.profile.id)
    .map((share) => (share.state === "waiting" ? invited(share) : readsIt(nameOf(sharing, share.readerUserId), share.id)));
  const giver = giverIdOf(viewer, seat.row.profile);
  return giver ? [readsIt(nameOf(sharing, giver)), ...shared] : shared;
}

/**
 * The person a report the reader wrote is about, once it is sent to them
 * (ADR-181): by the address the reader typed while its link waits, by the name
 * the reader gave them once they hold it. A pair's waiting link is the pair's
 * to list, though its claim would hand this chart over too.
 */
function subjectReaders(seat: Seat, sharing: Sharing, now: Date): HomeReader[] {
  const profile = seat.row.profile;
  if (profile.claimedByUserId) return [readsIt(firstWord(profile.name) || null)];
  return sharing.links
    .filter((link) => link.kind === "send" && link.profileId === profile.id && !link.relationshipId && waits(link, now))
    .sort(oldestFirst)
    .map(invited);
}

/** Everyone on the reader's own report, the subject on one they wrote, and no one on a report someone else holds. */
function readersOf(viewer: Viewer, seat: Seat, sharing: Sharing, now: Date): HomeReader[] {
  if (seat.isSelf) return ownReaders(viewer, seat, sharing);
  return seat.access === "owner" ? subjectReaders(seat, sharing, now) : [];
}

/**
 * Whether this person reads the reader's own Personal report (ADR-235, 341):
 * through a grant to the account they read with, or to an address the reader
 * typed for them; invited while a link to such an address waits. Matched only
 * on addresses the reader typed, so it never ties a person to one they did not
 * give (R15-18's lesson). The reader's own seat reads no grant of its own.
 */
function readsYoursOf(seat: Seat, sharing: Sharing): HomePerson["readsYours"] {
  if (seat.isSelf) return "no";
  const account = accountOf(seat);
  const typed = new Set(
    sharing.links.filter((link) => link.kind === "send" && link.profileId === seat.row.profile.id).map((link) => address(link.email)),
  );
  const atTheirs = (share: ShareRow) => !!share.email && typed.has(address(share.email));
  if (sharing.shares.some((s) => s.state === "active" && ((!!account && s.readerUserId === account) || atTheirs(s)))) return "can-read";
  return sharing.shares.some((s) => s.state === "waiting" && atTheirs(s)) ? "invited" : "no";
}

function personOf(viewer: Viewer, seat: Seat, lines: HomePerson["lines"], sharing: Sharing, now: Date): HomePerson {
  const { row, access, isSelf, shareBack, canRegenerate } = seat;
  return {
    profileId: row.profile.id,
    reportId: row.id,
    name: row.profile.name,
    birthDate: row.profile.birthDate,
    createdAt: row.createdAt.toISOString(),
    status: row.status as HomePerson["status"],
    access,
    isSelf,
    ...(shareBack === undefined ? {} : { shareBack }),
    canRegenerate,
    triad: triadOf(row.profile.chartData),
    lines,
    readsYours: readsYoursOf(seat, sharing),
    readers: readersOf(viewer, seat, sharing, now),
  };
}

// MB-65 provisional: a pair written before p2 cannot render on the seven-chapter
// page, so no list shows it. Every version since renders (p2 to p6, as the web
// lists them), each named here, so a bump keeps every pair already stored; the
// current one is listed too, so a bump that forgets this list still shows its new
// pairs.
const LISTED_PAIR_VERSIONS: ReadonlySet<string> = new Set(["p2", "p3", "p4", "p5", "p6", PAIR_PROMPT_VERSION]);

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

/** The side of a pair a signed-in reader holds, as access.ts reads it: the chart sent to them, or their own. */
function holds(viewer: Viewer, side: ProfileHolders): boolean {
  if (!viewer.userId) return false;
  return side.claimedByUserId ? side.claimedByUserId === viewer.userId : side.userId === viewer.userId;
}

/**
 * A pair's one chip and who reads it (ADR-337, 341). Its maker reads it as its
 * Share does (`pairSendStateFor`): its other person reads it, a link to them
 * waits, or only the maker reads it, as on a closed pair and on a pair of two
 * other people, which has no one to send it to; a pair sent to the reader is
 * shared by its other person, who made it (MB-103).
 */
// MB-103 provisional
function pairShareOf(viewer: Viewer, row: PairRow, pairReading: PairReading, sharing: Sharing, now: Date): Pick<HomePair, "share" | "readers"> {
  if (!ownsRelationship(viewer, row.relationship)) {
    const maker = row.parts.find((part) => !holds(viewer, part));
    return { share: { state: "shared-by", name: firstWord(maker?.name ?? "") }, readers: [] };
  }
  const own = row.parts.filter((part) => isSelfFor(viewer, part));
  const other = own.length === 1 ? row.parts.find((part) => part !== own[0]) : undefined;
  const name = other ? firstWord(other.name) : "";
  const relationshipId = row.relationship.id;
  const open = sharing.links
    .filter((link) => link.kind === "send" && !!relationshipId && link.relationshipId === relationshipId && waits(link, now))
    .sort(oldestFirst);
  const send = other && pairReading.readable
    ? pairSendStateFor(
        viewer,
        own[0].profileId,
        {
          profileId: other.profileId,
          name: other.name,
          claimedByUserId: other.claimedByUserId,
          accessRole: other.accessRole,
          relationshipId: relationshipId ?? null,
          userId: other.userId,
        },
        open.at(-1) ?? null,
        row,
      )
    : null;
  if (send?.state === "joined") return { share: { state: "can-read", name }, readers: [readsIt(name || null)] };
  if (send?.state === "sent") return { share: { state: "waiting", name }, readers: open.map(invited) };
  return { share: { state: "only-you", name }, readers: [] };
}

/**
 * The pairs GET /reports lists, newest first. MB-103 provisional: one its maker
 * can no longer read stays, closed and naming who stopped sharing, with nothing
 * of it shown; one shared with the reader goes when its sender stops. One made
 * from a chart shared with its maker closes the same way when that grant goes
 * (ADR-235).
 */
function listedPairs(viewer: Viewer, rows: readonly PairRow[], shared: ReadonlySet<string>, sharing: Sharing, now: Date): Listed[] {
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
          ...pairShareOf(viewer, row, reading, sharing, now),
        },
      }];
    })
    .sort((x, y) => (newer(x.row, y.row) ? -1 : newer(y.row, x.row) ? 1 : 0));
}

/** With nothing pinned, the reader's own report offers this (ADR-174). */
export const CLOSING_FIRST_PRACTICE = "focus.practice.bullets.0";

type Leaf = { point?: unknown; action?: unknown; why?: unknown; for?: unknown };

/**
 * A key is the section, the path and the index the report built it from, so it leads back to its item. A chapter
 * with one practice keeps it as a plain string, which the report ticks and pins as the first of a list of one
 * ("mind.practice.0", Review 05/10 §7).
 */
function itemAt(interpretation: unknown, key: string): Leaf | null {
  let node: unknown = interpretation;
  const segments = key.split(".");
  for (const [at, segment] of segments.entries()) {
    if (typeof node === "string") return segment === "0" && at === segments.length - 1 ? { action: node } : null;
    if (Array.isArray(node)) node = /^\d+$/.test(segment) ? node[Number(segment)] : undefined;
    else if (node && typeof node === "object" && Object.hasOwn(node, segment)) node = (node as Record<string, unknown>)[segment];
    else return null;
  }
  return node && typeof node === "object" && !Array.isArray(node) ? (node as Leaf) : null;
}

/** Chapter 07's lists say whose an item is by their key, not by a `for` field. */
const FOR_BY_LIST: Record<string, "A" | "B" | "both"> = { forA: "A", forB: "B", forBoth: "both" };

/** A pair's item reads as its report's checklist prints it, led by whose it is. */
function wordsOf(leaf: Leaf, names: { a: string; b: string } | null, key: string): Pick<HomePractice, "action" | "why"> | null {
  const text = typeof leaf.point === "string" ? leaf.point.trim() : typeof leaf.action === "string" ? leaf.action.trim() : "";
  if (!text) return null;
  const whose = leaf.for ?? key.split(".").map((segment) => (Object.hasOwn(FOR_BY_LIST, segment) ? FOR_BY_LIST[segment] : undefined)).find(Boolean);
  const who = !names ? "" : whose === "A" ? firstWord(names.a) : whose === "B" ? firstWord(names.b) : whose === "both" ? "Both" : "";
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
      const words = leaf && wordsOf(leaf, source.names, key);
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

const NO_STEP_PERSON: Pick<FirstSteps, "person" | "gift" | "pairReady"> = { person: null, gift: false, pairReady: false };

/**
 * Your first steps (ADR-330, reading 18), from what the reader has done: 1 their
 * own Personal report finished; 2 the newest person they added, by writing their
 * report or gifting them one; 3 that report sent to them, where a gift is done
 * once sent; 4 You & them, ready once the reader can read both finished reports
 * (ADR-332): at once for a report they wrote, for a gift once its recipient shares
 * back (ADR-331), till then named as the giver typed it. Gone once a Compatibility
 * report is on their list.
 */
function firstStepsOf(
  seats: readonly Seat[],
  natal: readonly NatalRow[],
  listed: readonly Listed[],
  sharing: Sharing,
  now: Date,
): FirstSteps | null {
  if (listed.length) return null;
  const finished = (profileId: string) => natal.some((row) => row.profile.id === profileId && FINISHED.has(row.status));
  if (!seats.some((seat) => seat.isSelf && finished(seat.row.profile.id))) return { step: 1, ...NO_STEP_PERSON };
  const added = [
    ...seats
      .filter((seat) => seat.access === "owner" && !seat.isSelf && written(seat.row))
      .map((seat) => ({ at: seat.row.profile.createdAt, id: seat.row.profile.id, seat, gift: null })),
    ...sharing.links
      .filter((link) => link.kind === "gift" && (!!link.claimedAt || waits(link, now)))
      .map((gift) => ({ at: gift.createdAt, id: gift.id, seat: null, gift })),
  ].sort((x, y) => y.at.getTime() - x.at.getTime() || y.id.localeCompare(x.id));
  const newest = added[0];
  if (!newest) return { step: 2, ...NO_STEP_PERSON };
  if (newest.seat) {
    const { profile } = newest.seat.row;
    const sent = subjectReaders(newest.seat, sharing, now).length > 0;
    return { step: sent ? 4 : 3, person: { profileId: profile.id, name: firstWord(profile.name) }, gift: false, pairReady: finished(profile.id) };
  }
  const gift = newest.gift;
  const back = gift.claimedByUserId
    ? seats.find((seat) => seat.access === "shared" && keeperOf(seat.row.profile) === gift.claimedByUserId)
    : undefined;
  // Nothing of theirs reaches the giver before they share it back (R-3.6), so till then the person is only the name
  // the giver typed, with no profile to pair.
  const person = back
    ? { profileId: back.row.profile.id, name: firstWord(back.row.profile.name) }
    : { profileId: "", name: firstWord(gift.recipientName ?? "") };
  return { step: 4, person, gift: true, pairReady: !!back && finished(back.row.profile.id) };
}

/**
 * The circle is the reader and everyone whose Personal report they can read
 * (ADR-182), a sharer among them while their grant stands (ADR-235); their own
 * sits at the centre, unless several are marked as theirs, when every marked
 * one stays among the people until they settle which. A failed report keeps
 * its person's seat and lends nothing more: no lines and nothing to practise.
 * Who reads each report, each pair's chip and Your first steps come from what
 * the reader has shared, sent and gifted (ADR-341).
 */
export function buildHome(
  viewer: Viewer,
  natal: readonly NatalRow[],
  pairs: readonly PairRow[],
  grants: Grants = NO_GRANTS,
  sharing: Sharing = NO_SHARING,
): Home {
  const now = sharing.now ?? new Date();
  const seats = seatsOf(viewer, natal, grants);
  const selves = seats.filter((s) => s.isSelf);
  const you = selves.length === 1 ? selves[0] : null;
  const listed = listedPairs(viewer, pairs, grants.shared, sharing, now);
  return {
    you: you ? personOf(viewer, you, written(you.row) ? linesOf(you.row.interpretation) : null, sharing, now) : null,
    several: selves.length > 1,
    people: seats.filter((s) => s !== you).map((s) => personOf(viewer, s, null, sharing, now)),
    pairs: listed.map((l) => l.pair),
    practising: practisingOf(selves.filter((s) => written(s.row)), listed),
    firstSteps: firstStepsOf(seats, natal, listed, sharing, now),
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
      failedTries: reportsTable.failedTries,
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

/** Every send and gift the reader made, in any state; only an account sends or gifts. */
function linksOf(userId: string): Promise<LinkRow[]> {
  return db
    .select({
      id: inviteTokensTable.id,
      kind: inviteTokensTable.kind,
      email: inviteTokensTable.email,
      profileId: inviteTokensTable.profileId,
      relationshipId: inviteTokensTable.relationshipId,
      recipientName: inviteTokensTable.recipientName,
      claimedAt: inviteTokensTable.claimedAt,
      claimedByUserId: inviteTokensTable.claimedByUserId,
      revokedAt: inviteTokensTable.revokedAt,
      expiresAt: inviteTokensTable.expiresAt,
      createdAt: inviteTokensTable.createdAt,
    })
    .from(inviteTokensTable)
    .where(and(eq(inviteTokensTable.createdByUserId, userId), inArray(inviteTokensTable.kind, ["send", "gift"])));
}

/** The accounts the home names by their first name: whoever reads the reader's own report through a grant, or wrote it. */
function accountsNamed(viewer: Viewer, natal: readonly NatalRow[], shares: readonly ShareRow[]): string[] {
  const ids = new Set<string>();
  for (const share of shares) if (share.readerUserId) ids.add(share.readerUserId);
  for (const row of natal) {
    const giver = isSelfFor(viewer, row.profile) ? giverIdOf(viewer, row.profile) : null;
    if (giver) ids.add(giver);
  }
  return [...ids];
}

/** A name is a nicety on a list, so a lookup that fails leaves it out rather than failing the home. */
async function namesOf(userIds: readonly string[]): Promise<Map<string, string | null>> {
  return new Map(await Promise.all(userIds.map(async (id) => [id, await firstNameOf(id).catch(() => null)] as const)));
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
 * Which of Timeline's two sections the dashboard carries (ADR-211, 212, 262; reading 26): Your week needs both Timeline
 * and a finished Personal report of their own (Review 05/10 §1), and `reader` is only ever read from that report, so an
 * admin's access alone shows no week; the teaser for one without Timeline whose own Personal report is finished, never
 * on an empty dashboard; neither for anyone else.
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
  const userId = viewer.userId;
  const shared = sharedProfileIds(userId);
  const [natal, shareBack, pairs, timeline, shares, links] = await Promise.all([
    shared.then((ids) => natalRowsOf(viewer, ids)),
    shared.then((ids) => shareBackOf(viewer, ids)),
    pairRowsOf(viewer),
    homeTimelineOf(viewer, options.access),
    userId ? sharesOf(userId) : [],
    userId ? linksOf(userId) : [],
  ]);
  const names = await namesOf(accountsNamed(viewer, natal, shares));
  const sharing: Sharing = { shares, links, names, now: options.now ?? new Date() };
  const home = buildHome(viewer, natal, pairs, { shared: await shared, shareBack }, sharing);
  return { ...home, ...timelinePartOf(home, timeline, options) };
}

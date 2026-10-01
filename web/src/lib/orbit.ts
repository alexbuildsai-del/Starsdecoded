/**
 * Who is on the dashboard's circle and where they sit, pure so the dashboard
 * and the landing's sample orbit (R11) share one rule set a test can pin. The
 * circle is not a chart (ADR-89): nothing here reads a placement.
 *
 * Membership is the People list (ADR-182, reading 6): everyone whose Personal
 * report the reader can read, written until its subject stops sharing or sent
 * to them, as `GET /home` lists them, so a stop takes the person off at the
 * next read. The reader's own report is the centre, never a point. Then the
 * reader's gifts still waiting, one Add someone point, and while the circle
 * is nearly empty, ghost seats that show who could join it.
 */
import type { CreditCounts, Gift, HomePerson, ProfileSummary, ReportSummary } from "@workspace/api-client-react";

/** What a tap on the centre selects: the reader's own quick look, or the report they still have to get. */
export const CENTRE_ID = "self";

export type OrbitPointKind = "person" | "gift" | "add" | "ghost";

export interface OrbitPoint {
  /** A person's profile id, so a pair's participant ids and the centre's profile id need no mapping; `gift:{id}`, `add` and `ghost:{n}` otherwise. */
  id: string;
  kind: OrbitPointKind;
  /** The whole name for the accessible label; the add point's action; a ghost's seat. */
  name: string;
  initials: string;
  /** Printed under the disc, in capitals: BEATRICE · WRITING, PIERRE · GIFT WAITING, ADD SOMEONE, PARTNER. */
  label: string;
  writing: boolean;
  /** The violet ring: a compatibility report with the reader that the reader can open (reading 3). */
  sharedPair: boolean;
  profileId?: string;
  reportId?: string;
  giftId?: string;
}

/** Only the fields the rules read, so the sample's people need no more. */
export type OrbitProfile = Pick<ProfileSummary, "id" | "name" | "isSelf">;

export type OrbitReport = Pick<ReportSummary, "id" | "kind" | "status" | "profileId" | "participants" | "createdAt" | "access" | "stoppedBy">;

export type OrbitPair = Pick<OrbitReport, "kind" | "status" | "participants" | "stoppedBy">;

export type OrbitGift = Pick<Gift, "id" | "recipientName" | "state">;

/** The sample orbit's input: a profile list and its reports, as `GET /profiles` and `GET /reports` give them. */
export interface OrbitInput {
  profiles: readonly OrbitProfile[];
  /** Natal and compatibility reports as listed; the pairs light the violet rings. */
  reports: readonly OrbitReport[];
  gifts: readonly OrbitGift[];
  credits: number | Pick<CreditCounts, "available">;
  /** `creditsEnforced()`: true on every host but production (ADR-138). */
  enforced: boolean;
}

/** One person as `GET /home` lists them; only what the circle reads. */
export type CirclePerson = Pick<HomePerson, "profileId" | "reportId" | "name" | "status" | "isSelf">;

/** One pair as `GET /home` lists it; only what the violet rings read. */
export interface CirclePair {
  a: { profileId: string };
  b: { profileId: string };
  status: string;
  stoppedBy?: string | null;
}

/** The dashboard's input: `GET /home`'s `you`, `people` and `pairs`, so a page may spread its home into it. */
export interface CircleInput {
  /** The reader's own Personal report, at the centre; null with none marked as theirs, or several. */
  you: Pick<HomePerson, "profileId"> | null;
  /** In `GET /home`'s order; with several marked as the reader's, each of them stays here until they settle which. */
  people: readonly CirclePerson[];
  pairs: readonly CirclePair[];
  gifts: readonly OrbitGift[];
  credits: number | Pick<CreditCounts, "available">;
  /** `creditsEnforced()`: true on every host but production (ADR-138). */
  enforced: boolean;
}

export interface RingGap {
  /** Degrees in the frame of the point's own angle, clockwise: start ≤ angle ≤ end. */
  start: number;
  end: number;
}

/** Who could join, in the approved mock's words and order; an empty circle shows all four. */
export const GHOST_SEATS = ["Partner", "Mum", "Best friend", "Your child"] as const;

/** The fewest seats a circle with anyone on it shows, so one person and the add point never sit alone on the ring. */
export const CIRCLE_SEATS = 3;

const ADD_ID = "add";
const GIFT_ID_PREFIX = "gift:";
const GHOST_ID_PREFIX = "ghost:";

/** A report under a revision pass keeps its text and is read as it stands (progress.ts). */
function finished(status: string): boolean {
  return status === "complete" || status === "revising";
}

/** Only the first writing is "writing": a revision pass reads as finished, and a failed report keeps its seat with nothing under way while its quick look says why. */
function beingWritten(status: string): boolean {
  return status === "pending" || status === "computing" || status === "interpreting";
}

function words(name: string): string[] {
  return name.normalize("NFC").trim().split(/\s+/).filter(Boolean);
}

function label(...parts: string[]): string {
  return parts.filter(Boolean).join(" · ").toUpperCase();
}

interface PairIds {
  ids: string[];
  status: string;
  stoppedBy?: string | null;
}

/** Either list's pair as its two profile ids; a natal row of `GET /reports` is no pair. */
function pairIds(r: OrbitPair | CirclePair): PairIds | null {
  if ("kind" in r) return r.kind === "compatibility" ? { ids: (r.participants ?? []).map((p) => p.id), status: r.status, stoppedBy: r.stoppedBy } : null;
  return { ids: [r.a.profileId, r.b.profileId], status: r.status, stoppedBy: r.stoppedBy };
}

function readablePair(r: OrbitPair | CirclePair): PairIds | null {
  const pair = pairIds(r);
  // MB-103 provisional: a pair closes when one of its people stops sharing, and a closed pair lights no one.
  return pair && finished(pair.status) && !pair.stoppedBy ? pair : null;
}

/**
 * The circle's points in ring order, clockwise from the top: the Add someone
 * point first, as the approved mock draws it, then the people in the order
 * `GET /home` gives them, then waiting gifts, then ghost seats up to
 * `CIRCLE_SEATS`. An empty circle is four ghost seats and no add point: it
 * starts with the reader's own report, which the centre asks for.
 */
export function circlePoints({ you, people, pairs, gifts, credits, enforced }: CircleInput): OrbitPoint[] {
  const own = new Set<string>(people.filter((p) => p.isSelf).map((p) => p.profileId));
  if (you) own.add(you.profileId);

  const withReader = new Set<string>();
  for (const r of pairs) {
    const pair = readablePair(r);
    if (!pair || !pair.ids.some((id) => own.has(id))) continue;
    for (const id of pair.ids) if (!own.has(id)) withReader.add(id);
  }

  const seated: OrbitPoint[] = [];
  const placed = new Set<string>();
  for (const p of people) {
    if (p.profileId === you?.profileId || placed.has(p.profileId)) continue;
    placed.add(p.profileId);
    const name = p.name.trim();
    const writing = beingWritten(p.status);
    seated.push({
      id: p.profileId,
      kind: "person",
      name,
      initials: initials(name),
      label: label(words(name)[0] ?? "", writing ? "writing" : ""),
      writing,
      sharedPair: withReader.has(p.profileId),
      profileId: p.profileId,
      reportId: p.reportId,
    });
  }

  for (const g of gifts) {
    if (g.state !== "waiting") continue;
    const name = g.recipientName.trim();
    seated.push({
      id: `${GIFT_ID_PREFIX}${g.id}`,
      kind: "gift",
      name,
      initials: initials(name),
      label: label(words(name)[0] ?? "", "gift waiting"),
      writing: false,
      sharedPair: false,
      giftId: g.id,
    });
  }

  const empty = !you && seated.length === 0;
  const points: OrbitPoint[] = [];
  if (!empty) {
    const balance = typeof credits === "number" ? credits : credits.available;
    // MB-6 provisional: zero reads Get credits only where credits are enforced
    // (ADR-138); production keeps the soft pass until checkout exists.
    const out = enforced && balance <= 0;
    points.push({
      id: ADD_ID,
      kind: "add",
      name: out ? "Get credits" : "Add someone",
      initials: "+",
      label: out ? "GET CREDITS" : "ADD SOMEONE",
      writing: false,
      sharedPair: false,
    });
  }
  points.push(...seated);

  const ghosts = empty ? GHOST_SEATS.length : Math.max(0, CIRCLE_SEATS - points.length);
  GHOST_SEATS.slice(0, ghosts).forEach((seat, i) => {
    points.push({
      id: `${GHOST_ID_PREFIX}${i}`,
      kind: "ghost",
      name: seat,
      initials: "",
      label: seat.toUpperCase(),
      writing: false,
      sharedPair: false,
    });
  });
  return points;
}

/**
 * The same circle from a profile list and its reports, for the landing's
 * sample account: per profile, the latest Personal report the reader can read
 * that did not fail, since a failed retry must not hide one that still opens.
 * An older server sends no `access` and listed only the viewer's own reports.
 */
export function orbitPoints({ profiles, reports, gifts, credits, enforced }: OrbitInput): OrbitPoint[] {
  const readable = new Map<string, OrbitReport>();
  for (const r of reports) {
    if (r.kind !== "natal" || !r.profileId || r.status === "failed") continue;
    const access = r.access ?? "owner";
    if (access !== "owner" && access !== "claimed") continue;
    const kept = readable.get(r.profileId);
    if (!kept || r.createdAt > kept.createdAt) readable.set(r.profileId, r);
  }

  // The centre is the one profile marked as the reader's, report or not, so its pairs ring the people it shares them with.
  const selves = profiles.filter((p) => p.isSelf === true);
  const you = selves.length === 1 ? { profileId: selves[0].id } : null;

  const people = profiles.flatMap((p): CirclePerson[] => {
    const report = readable.get(p.id);
    return report ? [{ profileId: p.id, reportId: report.id, name: p.name, status: report.status, isSelf: p.isSelf === true }] : [];
  });

  const pairs = reports.flatMap((r): CirclePair[] => {
    const ids = r.kind === "compatibility" ? (r.participants ?? []).map((p) => p.id) : [];
    return ids.length === 2 ? [{ a: { profileId: ids[0] }, b: { profileId: ids[1] }, status: r.status, stoppedBy: r.stoppedBy }] : [];
  });

  return circlePoints({ you, people, pairs, gifts, credits, enforced });
}

/**
 * Degrees clockwise from three o'clock, as SVG draws with y pointing down, so
 * the default -90 starts at the top as the artifacts do. Ascending and within
 * one turn, so a drift added to every angle keeps them in ring order.
 */
export function pointAngles(n: number, offsetDeg = -90): number[] {
  const count = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return Array.from({ length: count }, (_, i) => offsetDeg + (i * 360) / count);
}

/** The half-angle that clears everything within `halfWidth` of a centre on the ring: a chord, so a disc on the ring is cleared exactly. */
function clearanceDeg(halfWidth: number, radius: number): number {
  if (!(halfWidth > 0)) return 0;
  if (!(radius > 0) || halfWidth >= 2 * radius) return 180;
  return (2 * Math.asin(halfWidth / (2 * radius)) * 180) / Math.PI;
}

/**
 * Where the dotted ring is cut (ADR-112): around each point, as far as its
 * half-width reaches from the point's centre, which the caller sizes to the
 * disc, its name, the float and some air. Two cuts that would overlap meet
 * inside the overlap and never pass either point, so the ring between crowded
 * points is gone rather than drawn through a name. One gap per angle, in the
 * angles' order; for angles in ring order, the ring shows from each gap's end
 * to the next gap's start, the last one running to the first's start + 360.
 */
export function ringGaps(angles: readonly number[], radius: number, halfWidths: number | readonly number[]): RingGap[] {
  const n = angles.length;
  const reach = angles.map((_, i) => clearanceDeg(typeof halfWidths === "number" ? halfWidths : halfWidths[i] ?? 0, radius));
  const before = [...reach];
  const after = [...reach];
  const ring = angles
    .map((a, i) => ({ i, at: ((a % 360) + 360) % 360 }))
    .sort((x, y) => x.at - y.at || x.i - y.i);
  for (let k = 0; n > 1 && k < n; k++) {
    const cur = ring[k].i;
    const next = ring[(k + 1) % n].i;
    const span = k === n - 1 ? ring[0].at + 360 - ring[k].at : ring[k + 1].at - ring[k].at;
    const overlap = after[cur] + before[next] - span;
    if (overlap <= 0) continue;
    const kept = Math.min(span, Math.max(0, after[cur] - overlap / 2));
    after[cur] = kept;
    before[next] = span - kept;
  }
  return angles.map((a, i) => ({ start: a - before[i], end: a + after[i] }));
}

/**
 * Who keeps full light when a point is tapped: the other people of each pair
 * it is in that the reader can open, from either list's pairs. Ids the circle
 * does not draw, the reader's own among them, are left for it to ignore.
 */
export function partnersOf(pointId: string, pairs: readonly (OrbitPair | CirclePair)[]): string[] {
  const out: string[] = [];
  for (const r of pairs) {
    const pair = readablePair(r);
    if (!pair || !pair.ids.includes(pointId)) continue;
    for (const id of pair.ids) if (id !== pointId && !out.includes(id)) out.push(id);
  }
  return out;
}

/** A letter with the marks that follow it, so an accent NFC cannot compose stays on its letter. */
function leadLetter(word: string): string {
  return word.match(/\p{L}\p{M}*/u)?.[0] ?? Array.from(word)[0] ?? "";
}

/**
 * The first letters of the first and last words, so a middle name or a
 * particle never stands for the family name; one word gives one letter.
 */
export function initials(name: string): string {
  const w = words(name);
  if (w.length === 0) return "";
  const ends = w.length === 1 ? [w[0]] : [w[0], w[w.length - 1]];
  return ends.map(leadLetter).join("").toUpperCase();
}

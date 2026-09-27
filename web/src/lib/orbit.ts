/**
 * Who is on the dashboard's orbit and where they sit, pure so the dashboard and
 * the landing's sample orbit (R11) share one rule set a test can pin. The orbit
 * is not a chart (ADR-89): nothing here reads a placement.
 *
 * Membership follows ADR-121 as ADR-139 narrows it: the people whose natal
 * reports the reader made and still reads, the reader's gifts still waiting,
 * and one Add someone point. Nobody else is drawn until they share their own
 * chart with the reader, which MB-104 has not designed: not a giver, not a
 * gift's recipient, not a pair's other person.
 */
import type { CreditCounts, Gift, ProfileSummary, ReportSummary } from "@workspace/api-client-react";

export type OrbitPointKind = "person" | "gift" | "add";

export interface OrbitPoint {
  /** A person's profile id, so a pair's participant ids and the centre's profile id need no mapping; `gift:{id}` and `add` otherwise. */
  id: string;
  kind: OrbitPointKind;
  /** The whole name for the accessible label; the add point's action. */
  name: string;
  initials: string;
  /** Printed under the disc, in capitals: BEATRICE · WRITING, PIERRE · GIFT WAITING, ADD SOMEONE. */
  label: string;
  writing: boolean;
  /** The violet ring: a compatibility report with the reader that the reader can open (reading 3). */
  sharedPair: boolean;
  profileId?: string;
  reportId?: string;
  giftId?: string;
}

/** Only the fields the rules read, so the dashboard passes its lists as they come and R11's sample people need no more. */
export type OrbitProfile = Pick<ProfileSummary, "id" | "name" | "isSelf">;

export type OrbitReport = Pick<ReportSummary, "id" | "kind" | "status" | "profileId" | "participants" | "createdAt" | "access" | "stoppedBy">;

export type OrbitPair = Pick<OrbitReport, "kind" | "status" | "participants" | "stoppedBy">;

export type OrbitGift = Pick<Gift, "id" | "recipientName" | "state">;

export interface OrbitInput {
  profiles: readonly OrbitProfile[];
  /** Natal and compatibility reports as listed; the pairs light the violet rings. */
  reports: readonly OrbitReport[];
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

const ADD_ID = "add";
const GIFT_ID_PREFIX = "gift:";

/** A report under a revision pass keeps its text and is read as it stands (progress.ts), so only the first writing is "writing". */
function finished(status: string): boolean {
  return status === "complete" || status === "revising";
}

function words(name: string): string[] {
  return name.normalize("NFC").trim().split(/\s+/).filter(Boolean);
}

function label(...parts: string[]): string {
  return parts.filter(Boolean).join(" · ").toUpperCase();
}

function readablePair(r: OrbitPair): boolean {
  if (r.kind !== "compatibility" || !finished(r.status)) return false;
  // MB-103 provisional: a pair closes when one of its people stops sharing, and a closed pair lights no one.
  return !r.stoppedBy;
}

function participantIds(r: OrbitPair): string[] {
  return (r.participants ?? []).map((p) => p.id);
}

/**
 * The orbit's points in ring order: people as the profile list orders them,
 * then waiting gifts, then the one Add someone point, never one per credit.
 */
export function orbitPoints({ profiles, reports, gifts, credits, enforced }: OrbitInput): OrbitPoint[] {
  // The reader's own chart is the centre, never a point; with several marked,
  // the centre goes dashed and the list below settles which is theirs.
  const selfIds = new Set(profiles.filter((p) => p.isSelf === true).map((p) => p.id));

  // Per profile, the latest report the reader made that did not fail: a failed
  // retry must not hide a report that can still be opened. An older server
  // sends no `access` and listed only the viewer's own reports.
  const made = new Map<string, OrbitReport>();
  for (const r of reports) {
    if (r.kind !== "natal" || !r.profileId || r.status === "failed") continue;
    if ((r.access ?? "owner") !== "owner") continue;
    const kept = made.get(r.profileId);
    if (!kept || r.createdAt > kept.createdAt) made.set(r.profileId, r);
  }

  const withReader = new Set<string>();
  for (const r of reports) {
    if (!readablePair(r)) continue;
    const ids = participantIds(r);
    if (!ids.some((id) => selfIds.has(id))) continue;
    for (const id of ids) if (!selfIds.has(id)) withReader.add(id);
  }

  const points: OrbitPoint[] = [];
  const placed = new Set<string>();
  for (const p of profiles) {
    const report = made.get(p.id);
    if (!report || selfIds.has(p.id) || placed.has(p.id)) continue;
    placed.add(p.id);
    const name = p.name.trim();
    const writing = !finished(report.status);
    points.push({
      id: p.id,
      kind: "person",
      name,
      initials: initials(name),
      label: label(words(name)[0] ?? "", writing ? "writing" : ""),
      writing,
      sharedPair: withReader.has(p.id),
      profileId: p.id,
      reportId: report.id,
    });
  }

  for (const g of gifts) {
    if (g.state !== "waiting") continue;
    const name = g.recipientName.trim();
    points.push({
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
  return points;
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
 * it is in that the reader can open. Ids the orbit does not draw, the reader's
 * own among them, are left for the orbit to ignore.
 */
export function partnersOf(pointId: string, pairs: readonly OrbitPair[]): string[] {
  const out: string[] = [];
  for (const r of pairs) {
    if (!readablePair(r)) continue;
    const ids = participantIds(r);
    if (!ids.includes(pointId)) continue;
    for (const id of ids) if (id !== pointId && !out.includes(id)) out.push(id);
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

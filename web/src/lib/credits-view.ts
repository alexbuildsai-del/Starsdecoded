/**
 * What the credit surfaces print, pure so a test can pin it: the one balance
 * as dots, the three bundles as counts, History's lines, and the path after a
 * bundle of 3 or more, planned from the whole balance and what the reader
 * already has (ADR-95, 125, 129). No price anywhere: MB-5 is open.
 */
import type {
  CreditCountsLastBundle,
  CreditHistoryItem,
  TestCheckoutBodyCount,
} from "@workspace/api-client-react";
import { APP_ENV, type AppEnv } from "./appEnv";
import { orbitPoints, type OrbitProfile, type OrbitReport } from "./orbit";

/**
 * ADR-138: zero means zero on every host but production, where Get credits is
 * a free test checkout; production keeps the soft pass as a guard.
 */
export function creditsEnforced(appEnv: AppEnv = APP_ENV): boolean {
  // MB-6 provisional: production joins the others once real checkout exists.
  return appEnv !== "production";
}

function whole(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function creditCount(n: number): string {
  const count = whole(n);
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

/** One lit dot per credit still to use, capped at ten so a large balance stays one row, the rest as "+N". */
export function creditDots(n: number): { lit: number; more: number } {
  const count = whole(n);
  const lit = Math.min(count, 10);
  return { lit, more: count - lit };
}

export interface Bundle {
  count: TestCheckoutBodyCount;
  name: string;
}

/** Counts only (ADR-42); what each costs waits for the pricing session (MB-5). */
export const BUNDLES: readonly Bundle[] = [
  { count: 1, name: "One report" },
  { count: 3, name: "Someone and the two of you" },
  { count: 5, name: "Your people and how you fit" },
];

export interface HistoryLine {
  amount: string;
  text: string;
  test: boolean;
}

const HISTORY_FALLBACK: Record<CreditHistoryItem["kind"], (count: number) => string> = {
  bought: (count) => `${creditCount(count)} added`,
  gift: () => "A gift",
  spent: () => "A report",
};

/** The ledger sends a positive count and lets the kind carry the sign (reading 9). */
export function historyLine(item: Pick<CreditHistoryItem, "kind" | "count" | "label" | "test">): HistoryLine {
  const count = whole(item.count);
  const text = item.label.trim() || HISTORY_FALLBACK[item.kind](count);
  return {
    amount: `${item.kind === "spent" ? "−" : "+"}${count}`,
    text,
    // Reading 9 marks the test bundle's line only: off production every
    // credit is a test one, so a mark on each spend would say nothing. The
    // ledger's own label may already say so, and the line says it once.
    test: item.kind === "bought" && item.test && !/\btest\b/i.test(text),
  };
}

/** What the reader already has, which the path ticks rather than plans again. */
export interface PathHave {
  /** The reader's own Personal natal report, finished or being written: its credit is spent either way. */
  ownChart: boolean;
  /** First names of the people on the reader's orbit. */
  people: readonly string[];
  /** How many of those people share a Compatibility report with the reader. */
  pairs: number;
}

/** Read from the lists the dashboard already loads, through the orbit's own membership rule so the two never disagree. */
export function pathHave({ profiles, reports }: { profiles: readonly OrbitProfile[]; reports: readonly OrbitReport[] }): PathHave {
  const people = orbitPoints({ profiles, reports, gifts: [], credits: 0, enforced: false }).filter((p) => p.kind === "person");
  const selfIds = new Set(profiles.filter((p) => p.isSelf === true).map((p) => p.id));
  const ownChart = reports.some(
    (r) => r.kind === "natal" && r.status !== "failed" && !!r.profileId && selfIds.has(r.profileId),
  );
  const onOrbit = new Set(people.map((p) => p.id));
  const paired = new Set<string>();
  for (const r of reports) {
    // MB-103 provisional: a pair closed by a stop is no longer the reader's to count.
    if (r.kind !== "compatibility" || r.status === "failed" || r.stoppedBy) continue;
    const ids = (r.participants ?? []).map((p) => p.id);
    if (!ids.some((id) => selfIds.has(id))) continue;
    for (const id of ids) if (onOrbit.has(id)) paired.add(id);
  }
  return { ownChart, people: people.map((p) => p.name.trim().split(/\s+/)[0]), pairs: paired.size };
}

export type PathStepKind = "written" | "own" | "people" | "pairs";

export interface PathStep {
  kind: PathStepKind;
  title: string;
  line: string;
  /** Credits the step would use; 0 on the written row. */
  credits: number;
  done: boolean;
  /** Printed in the step's disc; null on the written row, which is ticked instead. */
  number: number | null;
  /** The number of the step this one waits for; null when it can start now. */
  after: number | null;
}

const COUNT_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

function writtenTitle(have: PathHave): string | null {
  const people = have.people.filter(Boolean);
  const pairs = Math.min(whole(have.pairs), people.length);
  const parts: string[] = [];
  if (have.ownChart) parts.push("your own chart");
  if (people.length === 1) parts.push(people[0]);
  else if (people.length === 2) parts.push(`${people[0]} and ${people[1]}`);
  else if (people.length > 2) parts.push(`${people.length} people`);
  if (pairs === 1 && people.length === 1) parts.push("the two of you");
  else if (pairs === 1) parts.push("one Compatibility report");
  else if (pairs > 1) parts.push(`${pairs} Compatibility reports`);
  if (!parts.length) return null;
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Planned from the whole balance, not the bundle, so a top-up reads as one
 * plan (ADR-125, 129). Each new person comes with the Compatibility report of
 * the reader and them, which is what the bundles are named for; the people
 * step asks the reader to add them because a gifted person never reaches the
 * reader's orbit (ADR-139). Every open step waits for the one before, so
 * exactly one can start.
 */
export function pathSteps(balance: number, have: PathHave): PathStep[] {
  let left = whole(balance);
  const steps: PathStep[] = [];
  const written = writtenTitle(have);
  if (written) {
    steps.push({ kind: "written", title: written, line: "Already written.", credits: 0, done: true, number: null, after: null });
  }

  const open: Pick<PathStep, "kind" | "title" | "line" | "credits">[] = [];
  if (!have.ownChart && left > 0) {
    open.push({ kind: "own", title: "Your own chart", line: "It sits at the centre, and everyone you add orbits it.", credits: 1 });
    left -= 1;
  }
  const n = Math.floor(left / 2);
  if (n > 0) {
    const more = have.people.length > 0;
    open.push({
      kind: "people",
      title: n === 1
        ? more ? "Someone else close to you" : "Someone close to you"
        : `${countWord(n)} ${more ? "more " : ""}people close to you`,
      line: n === 1 ? "Add them yourself, one credit." : "Add them yourself, one credit each.",
      credits: n,
    });
    open.push({
      kind: "pairs",
      title: n === 1 ? "The two of you" : `${countWord(n)} Compatibility reports`,
      line: n === 1 ? "A Compatibility report, once both charts are written." : "You and each of them.",
      credits: n,
    });
  }
  open.forEach((s, i) => steps.push({ ...s, done: false, number: i + 1, after: i === 0 ? null : i }));
  return steps;
}

export interface PathView {
  eyebrow: string;
  title: string;
  /** A top-up's note that the balance is one; null after a first bundle. */
  line: string | null;
  steps: PathStep[];
  /** The credits no step uses, said once; null when every credit is planned. */
  spare: string | null;
}

/** Everything the path sheet prints for a bundle of `added` credits that left `balance` to use. */
export function pathView(added: number, balance: number, have: PathHave): PathView {
  const bundle = whole(added);
  const total = whole(balance);
  const steps = pathSteps(total, have);
  const planned = steps.reduce((sum, s) => sum + s.credits, 0);
  const spare = Math.max(0, total - planned);
  const before = total - bundle;
  const people = steps.find((s) => s.kind === "people");
  return {
    eyebrow: before > 0 ? `${bundle} more added · a top-up` : `${creditCount(bundle)} added`,
    title: before > 0
      ? `${creditCount(total)} to use`
      : people && people.credits > 1 ? "Your people, then how you fit" : "Here is one way to use them",
    line: before > 0 ? `${before} left from before, ${bundle} just added: one balance.` : null,
    steps,
    spare: spare === 0
      ? null
      : spare === 1 ? "One credit stays for whoever comes next." : `${countWord(spare)} credits stay for whoever comes next.`,
  };
}

/** Once per bundle of 3 or more, and only while there is a credit to plan (ADR-125). */
export function pathDue(
  lastBundle: Pick<NonNullable<CreditCountsLastBundle>, "id" | "count"> | null | undefined,
  available: number,
  seen: readonly string[],
): boolean {
  return !!lastBundle && lastBundle.count >= 3 && whole(available) > 0 && !seen.includes(lastBundle.id);
}

// MB-43 provisional: a functional key holding bundle ids only, no personal
// data; the privacy draft names it (MB-33).
export const PATH_SEEN_KEY = "sd.path.seen";

const PATH_SEEN_KEPT = 20;

/** The part of Storage the path touches, so a test can hand in its own. */
export type PathSeenStore = Pick<Storage, "getItem" | "setItem">;

/** Null where the browser refuses storage, which some private modes do on first touch. */
function localStore(): PathSeenStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readPathSeen(store: PathSeenStore | null = localStore()): string[] {
  try {
    const value: unknown = JSON.parse(store?.getItem(PATH_SEEN_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function markPathSeen(id: string, store: PathSeenStore | null = localStore()): void {
  try {
    const kept = readPathSeen(store).filter((seen) => seen !== id);
    store?.setItem(PATH_SEEN_KEY, JSON.stringify([...kept, id].slice(-PATH_SEEN_KEPT)));
  } catch {
    // The worst case is the path showing once more.
  }
}

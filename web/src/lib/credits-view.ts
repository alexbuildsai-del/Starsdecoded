/**
 * What the credit surfaces print, pure so a test can pin it: the one balance
 * as dots, the bundles as the catalogue names and prices them, History's
 * lines, the path after a bundle of 3 or more, planned from the whole
 * balance and what the reader already has (ADR-95, 125, 129, 168 to 170),
 * and where each step's Get credits goes and comes back to (ADR-274, 275).
 */
import type { CreditCountsLastBundle, CreditHistoryItem, PriceItem } from "@workspace/api-client-react";
import { BUNDLES, bundleById, formatEuro, type Bundle, type BundleId } from "@workspace/commerce";
import type { DateOrder } from "./date-entry";
import { orbitPoints, type OrbitProfile, type OrbitReport } from "./orbit";
import { COMPATIBILITY_REPORT } from "./product";

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

export interface BundleMix {
  text: string;
  kind: "personal" | "compatibility";
}

/** One bundle as every price list prints it (ADR-172). */
export interface BundleRow {
  id: BundleId;
  name: string;
  /**
   * The catalogue's line under the name, word for word: the home page's JSON-LD gives it as the Offer's description,
   * which may only describe what the page shows (MB-140).
   */
  line: string;
  credits: number;
  /**
   * "For example:" over mixes that are only one way to spend the credits; null on Single, whose mixes are alternatives.
   * The line already counts the credits, so nothing under it counts them again (B-08).
   */
  lead: string | null;
  /** Single's mixes are alternatives, read with "or" between them; the others add up to the credits (ADR-170). */
  either: boolean;
  mixes: BundleMix[];
  /** What the bundle costs today: a live campaign's price while one runs, else the catalogue's. */
  price: string;
  launch: boolean;
  /** The same credits bought as Singles, struck through beside a launch price; null where there is none (ADR-169). */
  singles: string | null;
  save: string | null;
  /** A live campaign: the full price struck through beside `price`, and its last day said once; null without one. */
  campaign: { full: string; until: string } | null;
}

const NB = "\u00a0";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "12 October", or "October 12" where the month comes first, as checkout prints the same day (ADR-222): read from the
 * calendar day itself, so no clock zone can move it, and null for a day that isn't real (R16-05).
 */
function lastDay(day: string, order: DateOrder): string | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!parts) return null;
  const [year, month, date] = parts.slice(1).map(Number);
  const at = new Date(Date.UTC(year, month - 1, date));
  if (at.getUTCFullYear() !== year || at.getUTCMonth() !== month - 1 || at.getUTCDate() !== date) return null;
  return order === "dmy" ? `${date}${NB}${MONTHS[month - 1]}` : `${MONTHS[month - 1]}${NB}${date}`;
}

// MB-149 provisional: reading 6's campaign beside the launch price. The server prices each request, so its line wins
// only when it holds a real day and a price under the full one; anything else keeps the catalogue's row.
function campaignOf(price: PriceItem | null, order: DateOrder): { cents: number; full: string; until: string } | null {
  if (!price?.campaign) return null;
  const { cents, fullCents } = price;
  if (!Number.isSafeInteger(cents) || !Number.isSafeInteger(fullCents) || cents < 0 || cents >= fullCents) return null;
  const day = lastDay(price.campaign.endsOn, order);
  return day ? { cents, full: formatEuro(fullCents), until: `until ${day}` } : null;
}

/**
 * `price` is the server's item for this bundle (`usePrices`), or null for the catalogue's own row; `order` is the
 * reader's date order, which only a campaign's last day uses.
 */
export function bundleRow(bundle: Bundle, price: PriceItem | null = null, order: DateOrder = "dmy"): BundleRow {
  const campaign = campaignOf(price?.id === bundle.id ? price : null, order);
  const saved = bundle.fullCents - bundle.cents;
  // A launch price that saves nothing would strike a total the price equals, so it shows no comparison at all; a live
  // campaign brings its own comparison, and the Singles one steps aside while it runs.
  const launch = !campaign && bundle.launch && saved > 0;
  const either = bundle.credits === 1;
  return {
    id: bundle.id,
    name: bundle.name,
    line: bundle.line,
    credits: bundle.credits,
    lead: either ? null : "For example:",
    either,
    mixes: bundle.mixes.map((text) => ({ text, kind: text.includes(COMPATIBILITY_REPORT) ? "compatibility" : "personal" })),
    price: formatEuro(campaign?.cents ?? bundle.cents),
    launch,
    singles: launch ? `${bundle.credits} ${bundleById("solo").name}s ${formatEuro(bundle.fullCents)}` : null,
    save: launch ? `you save ${formatEuro(saved)}` : null,
    campaign: campaign && { full: campaign.full, until: campaign.until },
  };
}

/** `prices` is `usePrices().items`: null while they load or after a refusal, which keeps every row the catalogue's. */
export function bundleRows(prices: readonly PriceItem[] | null = null, order: DateOrder = "dmy"): BundleRow[] {
  return BUNDLES.map((bundle) => bundleRow(bundle, prices?.find((item) => item.id === bundle.id) ?? null, order));
}

/** The dashboard's asking steps a checkout comes back to, each reopened once from `?open=` (reading 2). */
export const REOPENS = ["credits", "gift", "add", "pair"] as const;
export type Reopen = (typeof REOPENS)[number];

/** The step whose Get credits it is: one of the dashboard's, or the birth form the empty dashboard sends a reader to. */
export type AskingStep = Reopen | "chart";

export type ReturnPath = "/chart" | `/dashboard?open=${Reopen}`;

/** Where a step's checkout comes back to, each one an address reading 2's pattern lets a checkout return to. */
export function returnPath(step: AskingStep): ReturnPath {
  return step === "chart" ? "/chart" : `/dashboard?open=${step}`;
}

/** The step a checkout came back to reopen, from the dashboard's query string with or without its "?". */
export function openFrom(search: string): Reopen | null {
  const asked = new URLSearchParams(search).get("open");
  return REOPENS.find((step) => step === asked) ?? null;
}

/** The dashboard's address once its step has reopened, so a reload or Back never opens it a second time. */
export function withoutOpen(search: string): string {
  const rest = new URLSearchParams(search);
  rest.delete("open");
  const query = rest.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

/** Only an account buys (reading 1): a reader without one signs in on the way and lands on the same checkout. */
export function signInFirst(href: string, signedOut: boolean): string {
  return signedOut ? `/sign-in?return_to=${encodeURIComponent(href)}` : href;
}

export interface HistoryLine {
  amount: string;
  text: string;
  test: boolean;
}

const HISTORY_FALLBACK: Record<CreditHistoryItem["kind"], (count: number) => string> = {
  bought: (count) => `${creditCount(count)} added`,
  gift: () => "A gift",
  spent: () => "A report",
  granted: () => "From Stars Decoded",
  refunded: () => "Refunded",
};

const TAKES_AWAY: ReadonlySet<CreditHistoryItem["kind"]> = new Set(["spent", "refunded"]);

/** The ledger sends a positive count and lets the kind carry the sign (reading 9). */
export function historyLine(item: Pick<CreditHistoryItem, "kind" | "count" | "label" | "test">): HistoryLine {
  const count = whole(item.count);
  const text = item.label.trim() || HISTORY_FALLBACK[item.kind](count);
  return {
    amount: `${TAKES_AWAY.has(item.kind) ? "−" : "+"}${count}`,
    text,
    // Reading 9 marks the test bundle's line only: off production every
    // credit is a test one, so a mark on each spend would say nothing. The
    // ledger's own label may already say so, and the line says it once.
    test: item.kind === "bought" && item.test && !/\btest\b/i.test(text),
  };
}

/** What the reader already has, which the path ticks rather than plans again. */
export interface PathHave {
  /** The reader's own Personal report, finished or being written: its credit is spent either way. */
  ownChart: boolean;
  /** First names of the people in the reader's circle. */
  people: readonly string[];
  /** How many of those people share a Compatibility report with the reader. */
  pairs: number;
}

/** Read from the lists the dashboard already loads, through the circle's own membership rule (`orbitPoints`) so the two never disagree. */
export function pathHave({ profiles, reports }: { profiles: readonly OrbitProfile[]; reports: readonly OrbitReport[] }): PathHave {
  const people = orbitPoints({ profiles, reports, gifts: [], credits: 0 }).filter((p) => p.kind === "person");
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
 * the reader and them, which is what the bundles' example mixes hold; the people
 * step asks the reader to add them because a gifted person never reaches the
 * reader's circle (ADR-139). Every open step waits for the one before, so
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
    open.push({ kind: "own", title: "Your own chart", line: "Your circle starts with you.", credits: 1 });
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
  // Credit-loop titled the plan for several people after its bundle's old name; the catalogue's name replaces it
  // (pricing-and-launch), and a plan for one person keeps the plain title.
  const named = people && people.credits > 1 ? BUNDLES.find((row) => row.credits === bundle)?.name : undefined;
  return {
    eyebrow: before > 0 ? `${bundle} more added · a top-up` : `${creditCount(bundle)} added`,
    title: before > 0 ? `${creditCount(total)} to use` : named ?? "Here is one way to use them",
    line: before > 0 ? `${before} left from before, ${bundle} just added: all in one balance.` : null,
    steps,
    spare: spare === 0
      ? null
      : spare === 1 ? "One credit is left for someone else later." : `${countWord(spare)} credits are left for someone else later.`,
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

/**
 * The pair the compatibility picker remembers for the tab, pure so a test can
 * pin the rules that keep a stale one away from a lookup: nothing is looked up
 * before the report list has loaded, and a pair comes back only when both of
 * its reports are still in the list. A deleted report, or another account's in
 * the same tab, once took the dashboard down on every reload.
 */
import type { ReportSummary } from "@workspace/api-client-react";
import { HOW_OPTIONS, LENSES, type HowKnown } from "@/lib/lenses";
import { PERSONAL_REPORT } from "@/lib/product";
import type { Lens } from "@/types/chart";

// MB-6 provisional: with no checkout yet the report runs on the soft credit
// pass; the selection is kept so the payments round can attach checkout and
// return to it.
export const SELECTION_KEY = "sd.pair.selection";

export interface PairSelection { a: string; b: string; lens: Lens; parent: "A" | "B"; how: HowKnown }

/** The part of Storage the selection touches, so a test can hand in its own. */
export type SelectionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type Reconciled =
  | { state: "waiting" }
  | { state: "kept"; selection: Partial<PairSelection> }
  | { state: "dropped" };

/** Null where the browser refuses storage, which some private modes do on first touch. */
function sessionStore(): SelectionStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** The stored value is whatever the tab last wrote, so each field is checked and a bad one left out. */
export function parseSelection(raw: string | null): Partial<PairSelection> {
  let value: unknown;
  try {
    value = JSON.parse(raw ?? "{}");
  } catch {
    return {};
  }
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;
  const s: Partial<PairSelection> = {};
  if (typeof v.a === "string" && v.a) s.a = v.a;
  if (typeof v.b === "string" && v.b) s.b = v.b;
  const lens = LENSES.find((l) => l.lens === v.lens)?.lens;
  if (lens) s.lens = lens;
  if (v.parent === "A" || v.parent === "B") s.parent = v.parent;
  const how = HOW_OPTIONS.find((h) => h === v.how);
  if (how) s.how = how;
  return s;
}

export function readSelection(store: SelectionStore | null = sessionStore()): Partial<PairSelection> {
  try {
    return parseSelection(store?.getItem(SELECTION_KEY) ?? null);
  } catch {
    return {};
  }
}

export function rememberSelection(s: Partial<PairSelection>, store: SelectionStore | null = sessionStore()): void {
  try {
    store?.setItem(SELECTION_KEY, JSON.stringify(s));
  } catch {
    // Nothing else depends on it.
  }
}

export function forgetSelection(store: SelectionStore | null = sessionStore()): void {
  try {
    store?.removeItem(SELECTION_KEY);
  } catch {
    // Nothing else depends on it.
  }
}

/**
 * The list is undefined while it loads, and an empty list is not the same
 * answer: reading a pair against it would drop a good pair on every cold load.
 */
export function reconcileSelection(remembered: Partial<PairSelection>, reports: readonly ReportSummary[] | undefined): Reconciled {
  if (!reports) return { state: "waiting" };
  const listed = (id: string | undefined) => !!id && reports.some((r) => r.id === id);
  return listed(remembered.a) && listed(remembered.b) ? { state: "kept", selection: remembered } : { state: "dropped" };
}

/**
 * The selection a dashboard Generate hands the picker (dashboard-sky, MB-86):
 * the reader's report as A, the other person's as B, and no lens, since the
 * picker still asks it (ADR-40, ADR-68). It enters through
 * `reconcileSelection` like a remembered pair, so it waits for the list and
 * only a pair whose two reports are both listed reaches a lookup.
 */
export function preselectPair(a: string, b: string): Partial<PairSelection> {
  const s: Partial<PairSelection> = {};
  if (a) s.a = a;
  // A report is never paired with itself; the picker's selects exclude it too.
  if (b && b !== a) s.b = b;
  return s;
}

/**
 * What the picker holds once a preselect enters. A press for the two already
 * chosen keeps the lens and its answers, since a second press should cost no
 * choice; the parent stays the same person when the two come the other way
 * round. Any other pair starts clean: a lens belongs to the two it was chosen for.
 */
export function enterPreselect(current: Partial<PairSelection>, preselect: Partial<PairSelection>): Partial<PairSelection> {
  const same = current.a === preselect.a && current.b === preselect.b;
  const swapped = current.a === preselect.b && current.b === preselect.a;
  if (!preselect.a || !preselect.b || !(same || swapped)) return { ...preselect };
  const kept: Partial<PairSelection> = { ...preselect };
  if (current.lens) kept.lens = current.lens;
  if (current.how) kept.how = current.how;
  if (current.parent) kept.parent = same ? current.parent : current.parent === "A" ? "B" : "A";
  return kept;
}

/** Why a report cannot be picked, or null when it can. An id the list no longer holds has no report behind it. */
export function unpickable(r: ReportSummary | undefined): string | null {
  if (!r) return "no longer available";
  if (r.kind !== "natal") return `not a ${PERSONAL_REPORT.toLowerCase()}`;
  if (r.status === "complete") return null;
  if (r.status === "failed") return r.failureReason?.line ?? "could not be written";
  return "still writing";
}

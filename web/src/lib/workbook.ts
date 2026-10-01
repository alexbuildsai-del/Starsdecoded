/**
 * The reader's workbook: which actions they have ticked and which they have
 * pinned, saved on the report rather than in this browser, so the same owner
 * sees the same ticks anywhere (ADR-24). A tick or a pin is one shallow PATCH,
 * applied optimistically and rolled back if the request fails. A tick is
 * silent: no counter anywhere (ADR-48).
 */
import {
  createContext, createElement, useCallback, useContext, useMemo, useState,
  type ReactNode,
} from "react";
import { useUpdateReportWorkbook } from "@workspace/api-client-react";
import type { Workbook } from "@/types/chart";

export type WorkbookPatch = Record<string, string | null>;

/**
 * A key is the section id, the dot path to the list, and the index in it:
 * `career.actions.0`, `superpowers.growingEdge.actions.2`, `partners02.nextTime.items.0`.
 */
export function itemKey(section: string, path: string, index: number): string {
  return `${section}.${path}.${index}`;
}

// A pair chapter's id carries its number (`partners02`), so a segment may hold digits after its first letter.
const KEY = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+\.\d+$/;

export function isItemKey(key: string): boolean {
  return KEY.test(key);
}

/** The most items one report can pin to What you're practising (ADR-174); the API refuses a fourth as well. */
export const PIN_LIMIT = 3;

const PIN = "pin.";

/** A pin lives beside the ticks under its own key, so pinning an item never ticks it and unticking never unpins it. */
export function pinKey(key: string): string {
  return `${PIN}${key}`;
}

export function isPinKey(key: string): boolean {
  return key.startsWith(PIN) && isItemKey(key.slice(PIN.length));
}

export function pinCount(workbook: Workbook): number {
  return Object.keys(workbook).filter((key) => isPinKey(key) && Boolean(workbook[key])).length;
}

/** Shallow merge, exactly as the API applies it. A null value removes the tick or the pin. */
export function mergeWorkbook(current: Workbook, patch: WorkbookPatch): Workbook {
  const next: Workbook = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete next[key];
    else next[key] = value;
  }
  return next;
}

/** The body one toggle sends: null to untick a ticked key, the ISO date to tick one. */
export function togglePatch(workbook: Workbook, key: string, now: Date = new Date()): WorkbookPatch {
  return { [key]: workbook[key] ? null : now.toISOString() };
}

/**
 * The body one pin toggle sends: null to unpin, the ISO date to pin. No body
 * at all when the report already holds PIN_LIMIT pins, since the API would
 * refuse it and the reader should hear why at once.
 */
export function pinPatch(workbook: Workbook, key: string, now: Date = new Date()): WorkbookPatch | null {
  const pin = pinKey(key);
  if (workbook[pin]) return { [pin]: null };
  return pinCount(workbook) < PIN_LIMIT ? { [pin]: now.toISOString() } : null;
}

/**
 * What a checklist ticks against: a report's workbook, a page's own ticks in
 * memory, or the dashboard's. Only a store with both pin methods can pin.
 */
export interface TickStore {
  ticked: (key: string) => boolean;
  toggle: (key: string) => void;
  pinned?: (key: string) => boolean;
  /** False when the report already holds PIN_LIMIT pins, so nothing changed. */
  togglePin?: (key: string) => boolean;
  saving: boolean;
}

/** One report's workbook as a store. It only decides what to send, so the pin limit holds here before the API holds it again. */
export function workbookStore(workbook: Workbook, send: (body: WorkbookPatch) => void, saving: boolean): TickStore {
  return {
    ticked: (key) => Boolean(workbook[key]),
    toggle: (key) => send(togglePatch(workbook, key)),
    // MB-110 provisional: pins sit in the report's one workbook, so everyone who can read a shared report sees the same pins, as they see the same ticks.
    pinned: (key) => Boolean(workbook[pinKey(key)]),
    togglePin: (key) => {
      const body = pinPatch(workbook, key);
      if (body) send(body);
      return body !== null;
    },
    saving,
  };
}

export interface PatchOutcome {
  onError: () => void;
  onSuccess: (merged?: Workbook | null) => void;
}

/**
 * Shows the patch at once, then sends it: a failure puts back the workbook the
 * patch was built from, and a success takes the API's merged workbook.
 */
export function sendPatch(
  workbook: Workbook,
  body: WorkbookPatch,
  set: (next: Workbook) => void,
  request: (body: WorkbookPatch, outcome: PatchOutcome) => void,
): void {
  const next = mergeWorkbook(workbook, body);
  set(next);
  request(body, { onError: () => set(workbook), onSuccess: (merged) => set(merged ?? next) });
}

const LOCAL = new WeakSet<TickStore>();

/**
 * Ticks held in this page's memory and never sent, for things to try that
 * belong to no report, as on the site. They cannot pin.
 */
export function localTicks(): TickStore {
  const ticks = new Set<string>();
  const store: TickStore = {
    ticked: (key) => ticks.has(key),
    toggle: (key) => {
      if (!ticks.delete(key)) ticks.add(key);
    },
    saving: false,
  };
  LOCAL.add(store);
  return store;
}

const WorkbookContext = createContext<TickStore | null>(null);

export function WorkbookProvider({
  reportId, initial, children,
}: { reportId: string; initial?: Workbook | null; children: ReactNode }) {
  const [workbook, setWorkbook] = useState<Workbook>(initial ?? {});
  const { mutate, isPending } = useUpdateReportWorkbook();

  // The patch is built from the rendered workbook, never inside the state
  // updater: React runs the updater after mutate has read the body, which is
  // how an empty body reached the API and a {} rollback wiped the page.
  const send = useCallback((body: WorkbookPatch) => {
    sendPatch(workbook, body, setWorkbook, (data, outcome) => mutate({ id: reportId, data }, outcome));
  }, [mutate, reportId, workbook]);

  const store = useMemo(() => workbookStore(workbook, send, isPending), [workbook, send, isPending]);

  return createElement(WorkbookContext.Provider, { value: store }, children);
}

/**
 * Null outside a provider, which is how the print path and any isolated render
 * get a checklist that shows its items and simply does not tick.
 */
export function useWorkbook(): TickStore | null {
  return useContext(WorkbookContext);
}

/**
 * The store a checklist ticks against: the one it is given, else the report's
 * workbook. A localTicks() store keeps its ticks in itself, so a list holds on
 * to the first one it gets: a page that re-renders would otherwise hand it a
 * fresh one and clear the reader's ticks.
 */
export function useTickStore(given?: TickStore): TickStore | null {
  const workbook = useWorkbook();
  const [first] = useState(given);
  if (given && LOCAL.has(given)) return first && LOCAL.has(first) ? first : given;
  return given ?? workbook;
}

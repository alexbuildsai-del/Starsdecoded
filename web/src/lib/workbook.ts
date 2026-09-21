/**
 * The reader's workbook: which actions they have ticked, saved on the report
 * rather than in this browser, so the same owner sees the same ticks anywhere
 * (ADR-24). A tick is one shallow PATCH, applied optimistically and rolled back
 * if the request fails. A tick is silent: no counter anywhere (ADR-48).
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
 * `career.actions.0`, `superpowers.growingEdge.actions.2`.
 */
export function itemKey(section: string, path: string, index: number): string {
  return `${section}.${path}.${index}`;
}

const KEY = /^[a-z][a-zA-Z]*(\.[a-zA-Z]+)+\.\d+$/;

export function isItemKey(key: string): boolean {
  return KEY.test(key);
}

/** Shallow merge, exactly as the API applies it. A null value removes the tick. */
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

interface WorkbookStore {
  ticked: (key: string) => boolean;
  toggle: (key: string) => void;
  saving: boolean;
}

const WorkbookContext = createContext<WorkbookStore | null>(null);

export function WorkbookProvider({
  reportId, initial, children,
}: { reportId: string; initial?: Workbook | null; children: ReactNode }) {
  const [workbook, setWorkbook] = useState<Workbook>(initial ?? {});
  const patch = useUpdateReportWorkbook();

  // The patch is built from the rendered workbook, never inside the state
  // updater: React runs the updater after mutate has read the body, which is
  // how an empty body reached the API and a {} rollback wiped the page.
  const toggle = useCallback((key: string) => {
    const rollback = workbook;
    const body = togglePatch(workbook, key);
    setWorkbook(mergeWorkbook(workbook, body));
    patch.mutate(
      { id: reportId, data: body },
      { onError: () => setWorkbook(rollback), onSuccess: (merged) => setWorkbook(merged ?? rollback) },
    );
  }, [patch, reportId, workbook]);

  const store = useMemo<WorkbookStore>(() => ({
    ticked: (key) => Boolean(workbook[key]),
    toggle,
    saving: patch.isPending,
  }), [workbook, toggle, patch.isPending]);

  return createElement(WorkbookContext.Provider, { value: store }, children);
}

/**
 * Null outside a provider, which is how the print path and any isolated render
 * get a checklist that shows its items and simply does not tick.
 */
export function useWorkbook(): WorkbookStore | null {
  return useContext(WorkbookContext);
}

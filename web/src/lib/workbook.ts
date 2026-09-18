/**
 * The reader's workbook: which actions they have ticked, saved on the report
 * rather than in this browser, so the same owner sees the same ticks anywhere
 * (ADR-24). A tick is one shallow PATCH, applied optimistically and rolled back
 * if the request fails.
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

export function countTicked(workbook: Workbook, keys: string[]): number {
  return keys.reduce((n, key) => (workbook[key] ? n + 1 : n), 0);
}

interface WorkbookStore {
  ticked: (key: string) => boolean;
  toggle: (key: string) => void;
  count: (keys: string[]) => number;
  saving: boolean;
}

const WorkbookContext = createContext<WorkbookStore | null>(null);

export function WorkbookProvider({
  reportId, initial, children,
}: { reportId: string; initial?: Workbook | null; children: ReactNode }) {
  const [workbook, setWorkbook] = useState<Workbook>(initial ?? {});
  const patch = useUpdateReportWorkbook();

  const toggle = useCallback((key: string) => {
    let rollback: Workbook = {};
    let body: WorkbookPatch = {};
    setWorkbook((current) => {
      rollback = current;
      body = { [key]: current[key] ? null : new Date().toISOString() };
      return mergeWorkbook(current, body);
    });
    patch.mutate(
      { id: reportId, data: body },
      { onError: () => setWorkbook(rollback), onSuccess: (merged) => setWorkbook(merged ?? rollback) },
    );
  }, [patch, reportId]);

  const store = useMemo<WorkbookStore>(() => ({
    ticked: (key) => Boolean(workbook[key]),
    toggle,
    count: (keys) => countTicked(workbook, keys),
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

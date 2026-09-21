/**
 * The report as it stands right now. The page opens as soon as the chart is
 * stored and the chapters arrive one at a time (ADR-25), so the report query
 * gives the row and the status query gives whatever has been written since,
 * every two seconds until the last section lands. Real progress, the door and
 * the provisional positions come from the same status (ADR-47); a horizon pass
 * reads as `revising`, with its counts from the report itself (ADR-35).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetReportQueryKey, getGetReportStatusQueryKey, useGetReport, useGetReportStatus,
} from "@workspace/api-client-react";
import { progressOf, registryFor, type Progress } from "@/lib/progress";
import type { Positions } from "@/lib/orrery";
import type { HorizonPass, Interpretation, Lens, PairInterpretation, Workbook } from "@/types/chart";

const SETTLED = new Set(["complete", "failed"]);
const POLL_MS = 2000;
/** How often the creep is redrawn while the report writes. */
const TICK_MS = 250;

export type SectionState = Record<string, "pending" | "done">;

export function useLiveReport(id: string) {
  const client = useQueryClient();

  const report = useGetReport(id, {
    query: { queryKey: getGetReportQueryKey(id), enabled: !!id },
  });

  const status = useGetReportStatus(id, {
    query: {
      queryKey: getGetReportStatusQueryKey(id),
      enabled: !!id,
      refetchOnWindowFocus: false,
      refetchInterval: (query) => (SETTLED.has(query.state.data?.status ?? "") ? false : POLL_MS),
    },
  });

  const serverStatus = status.data?.status ?? report.data?.status;
  const writing = serverStatus !== undefined && !SETTLED.has(serverStatus);
  const revising = serverStatus === "revising";

  // The last frame carries the word count, the usage block and the workbook,
  // none of which the status route is the source of truth for.
  useEffect(() => {
    if (status.data?.status === "complete") {
      client.invalidateQueries({ queryKey: getGetReportQueryKey(id) });
    }
  }, [status.data?.status, id, client]);

  const interpretation = useMemo<Interpretation | PairInterpretation | null>(() => {
    const stored = (report.data?.interpretation ?? null) as Interpretation | null;
    const live = (status.data?.interpretation ?? null) as Interpretation | null;
    if (!stored && !live) return null;
    // The status route is the fresher of the two while a report is writing.
    return { ...(stored ?? {}), ...(live ?? {}) } as Interpretation;
  }, [report.data?.interpretation, status.data?.interpretation]);

  const sections = (status.data?.sections ?? {}) as SectionState;
  const type = (report.data?.type ?? interpretation?.meta?.reportType ?? "natal") as "natal" | "compatibility";
  const horizon = interpretation?.meta?.horizon;
  const lens = (report.data?.lens ?? interpretation?.meta?.lens ?? null) as Lens | null;
  const { registry, required } = useMemo(() => registryFor(type, horizon, lens), [type, horizon, lens]);
  const chartReady = status.data?.chartReady ?? report.data?.chartData != null;

  // Real progress moves only on events; the creep between them needs a clock.
  const landedKey = registry.filter((s) => sections[s] === "done").join(",") + `|${chartReady}|${serverStatus}`;
  const milestoneAt = useRef(Date.now());
  const lastKey = useRef(landedKey);
  if (lastKey.current !== landedKey) {
    lastKey.current = landedKey;
    milestoneAt.current = Date.now();
  }
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!writing) return;
    const t = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(t);
  }, [writing]);

  const progress: Progress = useMemo(() => progressOf({
    status: serverStatus,
    chartReady,
    sections,
    registry,
    required,
    sinceMilestoneMs: now - milestoneAt.current,
  }), [serverStatus, chartReady, sections, registry, required, now]);

  // Open means the reader took the door or the page opened itself; a report
  // that was already complete or revising when the page loaded needs no door.
  const [opened, setOpened] = useState(false);
  const settledAtLoad = useRef<boolean | null>(null);
  if (settledAtLoad.current === null && serverStatus !== undefined) {
    settledAtLoad.current = serverStatus === "complete" || serverStatus === "revising";
  }
  const open = opened || settledAtLoad.current === true || revising;
  const setOpen = useCallback(() => setOpened(true), []);

  const meta = interpretation?.meta;
  const horizonPass = (meta?.horizonPass ?? null) as HorizonPass | null;

  return {
    report: report.data,
    interpretation,
    sections,
    workbook: (report.data?.workbook ?? {}) as Workbook,
    status: serverStatus,
    writing,
    revising,
    chartReady,
    provisional: (status.data?.provisional?.bodies ?? null) as Positions | null,
    progress,
    open,
    setOpen,
    type,
    lens,
    participants: report.data?.participants ?? null,
    horizonPass,
    revisions: report.data?.revisions ?? [],
    horizonPasses: report.data?.horizonPasses ?? 0,
    errorMessage: status.data?.errorMessage ?? report.data?.errorMessage ?? null,
    isLoading: report.isLoading,
    isError: report.isError,
  };
}

export default useLiveReport;

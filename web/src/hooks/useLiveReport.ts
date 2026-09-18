/**
 * The report as it stands right now. The page opens as soon as the chart is
 * stored and the chapters arrive one at a time (ADR-25), so the report query
 * gives the row and the status query gives whatever has been written since,
 * every two seconds until the last section lands.
 */
import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetReportQueryKey, getGetReportStatusQueryKey, useGetReport, useGetReportStatus,
} from "@workspace/api-client-react";
import type { Interpretation, Workbook } from "@/types/chart";

const SETTLED = new Set(["complete", "failed"]);
const POLL_MS = 2000;

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

  // The last frame carries the word count, the usage block and the workbook,
  // none of which the status route is the source of truth for.
  useEffect(() => {
    if (status.data?.status === "complete") {
      client.invalidateQueries({ queryKey: getGetReportQueryKey(id) });
    }
  }, [status.data?.status, id, client]);

  const interpretation = useMemo<Interpretation | null>(() => {
    const stored = (report.data?.interpretation ?? null) as Interpretation | null;
    const live = (status.data?.interpretation ?? null) as Interpretation | null;
    if (!stored && !live) return null;
    // The status route is the fresher of the two while a report is writing.
    return { ...(stored ?? {}), ...(live ?? {}) } as Interpretation;
  }, [report.data?.interpretation, status.data?.interpretation]);

  const sections = (status.data?.sections ?? {}) as SectionState;

  return {
    report: report.data,
    interpretation,
    sections,
    workbook: (report.data?.workbook ?? {}) as Workbook,
    status: serverStatus,
    writing,
    chartReady: status.data?.chartReady ?? report.data?.chartData != null,
    errorMessage: status.data?.errorMessage ?? report.data?.errorMessage ?? null,
    isLoading: report.isLoading,
    isError: report.isError,
  };
}

export default useLiveReport;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/ds/molecules/Card";
import { Loader2 } from "lucide-react";
import { Select } from "@/ds/atoms/Select";
import { Button } from "@/ds/atoms/Button";
import { LabApiError, cents, labApi, type CompareResponse, type FixturesStatus, type LabRunRow } from "@/lib/labApi";

/**
 * Run the fixtures (B-30, ADR-290), the one button on Runs that spends: the release lab's charts and their pair,
 * written fresh on staging, with the price on screen before the press. While they write, the list reloads each time
 * a report lands, so its numbers can be read before the run ends.
 */
function FixturesRun({ onLanded }: { onLanded: () => void }) {
  const [status, setStatus] = useState<FixturesStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<string | null>(null);
  const landed = useRef(onLanded);
  landed.current = onLanded;

  const refresh = useCallback(async () => {
    const next = await labApi.fixtures();
    setStatus(next);
    const mark = next.running ? `${next.running.label}:${next.running.landed.length}` : next.last ? `${next.last.label}:done` : "";
    if (seen.current !== null && mark !== seen.current) landed.current();
    seen.current = mark;
  }, []);

  useEffect(() => { refresh().catch((e: Error) => setError(e.message)); }, [refresh]);

  const writing = Boolean(status?.running);
  useEffect(() => {
    if (!writing) return;
    const timer = window.setInterval(() => { refresh().catch((e: Error) => setError(e.message)); }, 5000);
    return () => window.clearInterval(timer);
  }, [writing, refresh]);

  const run = async () => {
    setStarting(true);
    setError(null);
    try {
      await labApi.runFixtures();
    } catch (e) {
      setError(e instanceof LabApiError && e.code === "lab_budget" ? `Refused: ${e.message}` : (e as Error).message);
    } finally {
      await refresh().catch(() => undefined);
      setStarting(false);
    }
  };

  if (!status) return error ? <p className="text-xs text-error">Fixtures: {error}</p> : null;
  const total = status.charts.length + 1;
  const last = status.last;
  const written = last ? last.natalRunKeys.length + (last.pairRunKey ? 1 : 0) : 0;
  return (
    <Card as="div" className="p-3">
      <p className="font-label text-xs tracking-wide text-indigo-lt">Fixtures · the {status.charts.length} charts and their pair, written fresh</p>
      <p className="text-xs text-paper-dim">This doesn't release anything. Each run shows in the list below once it's written.</p>
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="compact" disabled={starting || writing || !status.stagingOnly || status.overBudget} onClick={run}>
          {starting ? "Starting" : "Run the fixtures"}
        </Button>
        <p className={`text-xs font-numeric ${status.overBudget ? "text-error" : "text-paper-dim"}`}>
          about {cents(status.estimateUsd)} · spent {cents(status.spentUsd)} of {cents(status.budgetUsd)}{status.overBudget ? " · over budget, refused" : ""}
        </p>
      </div>
      {!status.stagingOnly && <p className="text-xs text-paper-dim">Runs on staging only.</p>}
      {status.running && (
        <p role="status" className="text-xs font-numeric flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin text-indigo-lt" aria-hidden="true" /> Writing {status.running.label}: {status.running.landed.length} of {total} done
        </p>
      )}
      {!status.running && last && (
        <p role="status" className={`text-xs font-numeric ${last.failed.length ? "text-error" : "text-paper-dim"}`}>
          {last.label}: {written === total ? `all ${total}` : `${written} of ${total}`} written, {cents(last.costUsd)}
          {last.failed.length ? `. Failed: ${last.failed.map((f) => `${f.fixture} (${f.error.slice(0, 80)})`).join(", ")}` : ""}
        </p>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
    </Card>
  );
}

/**
 * Runs: every stored run by fixture and label, per-section words, cost,
 * seconds and faults, and the compare table for any two labels (annex
 * scope 5). Numbers only; no report text is ever loaded here (ADR-75).
 */
export function RunsView() {
  const [runs, setRuns] = useState<LabRunRow[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labelA, setLabelA] = useState("");
  const [labelB, setLabelB] = useState("");
  const [compared, setCompared] = useState<CompareResponse[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<string | null>(null);

  const load = () => labApi.runs().then((r) => { setRuns(r.runs); setLabels(r.labels); }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);

  // The r05 and r06 runs are the baseline (MB-72); they come from the public report-lab branches, no token.
  const importBaseline = async () => {
    setImporting(true);
    setImported(null);
    try {
      const out = await labApi.importRuns(["r05", "r06"]);
      setImported(out.results.map((r) => `${r.label}: ${r.imported.length} imported${r.missing.length ? `, ${r.missing.length} not on the branch` : ""}${r.failed.length ? `, ${r.failed.length} failed` : ""}`).join(" · "));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const byRun = useMemo(() => {
    const map = new Map<string, LabRunRow[]>();
    for (const r of runs) map.set(r.runKey, [...(map.get(r.runKey) ?? []), r]);
    return [...map.entries()].sort((a, b) => (b[1][0]?.createdAt ?? "").localeCompare(a[1][0]?.createdAt ?? ""));
  }, [runs]);

  const compare = async () => {
    if (!labelA || !labelB) return;
    setComparing(true);
    setCompared(null);
    try {
      const fixtures = [...new Set(runs.filter((r) => r.label === labelA).map((r) => r.fixture))]
        .filter((f) => runs.some((r) => r.label === labelB && r.fixture === f));
      const out = await Promise.all(fixtures.map((f) => labApi.compare(`${f}.${labelA}`, `${f}.${labelB}`)));
      setCompared(out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setComparing(false);
    }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted" />;
  if (error) return <p className="text-sm text-error">{error}</p>;

  return (
    <div className="flex flex-col gap-6">
      <FixturesRun onLanded={() => { void load(); }} />
      <div className="flex items-end gap-2 flex-wrap">
        <Select label="Compare" value={labelA} onChange={(e) => setLabelA(e.target.value)} className="h-10 w-auto min-w-32">
            <option value="">label a</option>
            {labels.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        <Select label="against" value={labelB} onChange={(e) => setLabelB(e.target.value)} className="h-10 w-auto min-w-32">
            <option value="">label b</option>
            {labels.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        <Button size="compact" variant="secondary" disabled={!labelA || !labelB || comparing} onClick={compare}>
          {comparing ? "Comparing" : "Compare"}
        </Button>
        <Button size="compact" variant="secondary" disabled={importing} onClick={importBaseline} className="ml-auto">
          {importing ? "Importing" : "Import r05 and r06"}
        </Button>
      </div>
      {imported && <p className="text-xs text-paper-dim">{imported}</p>}

      {compared && compared.map((c) => (
        <div key={`${c.a}-${c.b}`} className="rounded-card border border-line bg-surface p-3">
          <p className="font-label text-xs tracking-wide text-indigo-lt mb-2">{c.a} → {c.b} · {cents(c.costUsd[0])} → {cents(c.costUsd[1])} · {c.worse.length} worse, {c.better.length} better</p>
          <table className="w-full text-xs font-numeric">
            <thead className="text-paper-dim"><tr><th className="text-left">section</th><th className="text-left">model</th><th>words</th><th>¢</th><th>s</th><th className="text-left">verdict</th></tr></thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.section} className="border-t border-line">
                  <td>{r.section}</td>
                  <td>{r.model[0] === r.model[1] ? r.model[0] : `${r.model[0]}→${r.model[1]}`}</td>
                  <td className="text-center">{r.words[0]}→{r.words[1]}</td>
                  <td className="text-center">{cents(r.costUsd[0])}→{cents(r.costUsd[1])}</td>
                  <td className="text-center">{r.seconds[0].toFixed(1)}→{r.seconds[1].toFixed(1)}</td>
                  <td className={/WORSE/.test(r.verdict) ? "text-error" : r.verdict === "better" ? "text-indigo-lt" : "text-paper-dim"}>{r.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {byRun.length === 0 && <p className="text-sm text-paper-dim">No run yet. Import r05 and r06 above; they come from the public report-lab branches.</p>}

      {byRun.map(([runKey, rows]) => {
        const total = rows.filter((r) => r.section !== "foundation").reduce((n, r) => n + r.words, 0);
        const cost = rows.reduce((n, r) => n + (r.costUsd ?? 0), 0);
        const seconds = rows.reduce((n, r) => n + (r.seconds ?? 0), 0);
        const faults = rows.reduce((n, r) => n + r.faults.length, 0);
        const head = rows[0];
        return (
          <details key={runKey} className="rounded-card border border-line bg-surface">
            <summary className="cursor-pointer px-3 py-2 flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="font-label text-indigo-lt">{runKey}</span>
              <span className="text-paper-dim text-xs">{head.source}{head.subjectName ? ` · ${head.subjectName}` : ""} · {new Date(head.createdAt).toISOString().slice(0, 10)}</span>
              <span className="font-numeric text-xs ml-auto">{total} words · {cents(cost)} · {seconds.toFixed(0)} s · {faults ? <span className="text-error">{faults} faults</span> : "no fault"}</span>
            </summary>
            <table className="w-full text-xs font-numeric mb-2">
              <thead className="text-paper-dim"><tr><th className="text-left pl-3">section</th><th className="text-left">model</th><th>tier</th><th>words</th><th>¢</th><th>s</th><th className="text-left">code</th><th className="text-left">faults</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="pl-3">{r.section}</td>
                    <td>{r.model}{r.reasoningEffort ? ` · ${r.reasoningEffort}` : ""}</td>
                    <td className="text-center">{r.serviceTier}</td>
                    <td className="text-center">{r.status === "done" ? r.words : r.status}</td>
                    <td className="text-center">{cents(r.costUsd)}</td>
                    <td className="text-center">{r.seconds?.toFixed(1) ?? "-"}</td>
                    <td className={r.failureCode ? "text-error" : "text-paper-dim"}>{r.failureCode ?? "-"}</td>
                    <td className={r.faults.length ? "text-error" : "text-paper-dim"}>{r.error ?? (r.faults.join(" ") || "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        );
      })}
    </div>
  );
}

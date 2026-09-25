import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cents, labApi, type CompareResponse, type LabRunRow } from "@/lib/labApi";

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

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary/40" />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2 flex-wrap">
        <label className="text-xs font-label text-muted-foreground flex flex-col gap-1">
          Compare
          <select value={labelA} onChange={(e) => setLabelA(e.target.value)} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-sm text-foreground">
            <option value="">label a</option>
            {labels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="text-xs font-label text-muted-foreground flex flex-col gap-1">
          against
          <select value={labelB} onChange={(e) => setLabelB(e.target.value)} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-sm text-foreground">
            <option value="">label b</option>
            {labels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <Button size="sm" variant="outline" disabled={!labelA || !labelB || comparing} onClick={compare}>
          {comparing ? "Comparing" : "Compare"}
        </Button>
        <Button size="sm" variant="outline" disabled={importing} onClick={importBaseline} className="ml-auto">
          {importing ? "Importing" : "Import r05 and r06"}
        </Button>
      </div>
      {imported && <p className="text-xs text-muted-foreground">{imported}</p>}

      {compared && compared.map((c) => (
        <div key={`${c.a}-${c.b}`} className="rounded-lg border border-border/60 bg-card/40 p-3">
          <p className="font-label text-xs tracking-wide text-primary mb-2">{c.a} → {c.b} · {cents(c.costUsd[0])} → {cents(c.costUsd[1])} · {c.worse.length} worse, {c.better.length} better</p>
          <table className="w-full text-xs font-numeric">
            <thead className="text-muted-foreground"><tr><th className="text-left">section</th><th className="text-left">model</th><th>words</th><th>¢</th><th>s</th><th className="text-left">verdict</th></tr></thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.section} className="border-t border-border/30">
                  <td>{r.section}</td>
                  <td>{r.model[0] === r.model[1] ? r.model[0] : `${r.model[0]}→${r.model[1]}`}</td>
                  <td className="text-center">{r.words[0]}→{r.words[1]}</td>
                  <td className="text-center">{cents(r.costUsd[0])}→{cents(r.costUsd[1])}</td>
                  <td className="text-center">{r.seconds[0].toFixed(1)}→{r.seconds[1].toFixed(1)}</td>
                  <td className={/WORSE/.test(r.verdict) ? "text-destructive" : r.verdict === "better" ? "text-primary" : "text-muted-foreground"}>{r.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {byRun.length === 0 && <p className="text-sm text-muted-foreground">No run yet. Import r05 and r06 above; they come from the public report-lab branches.</p>}

      {byRun.map(([runKey, rows]) => {
        const total = rows.filter((r) => r.section !== "foundation").reduce((n, r) => n + r.words, 0);
        const cost = rows.reduce((n, r) => n + (r.costUsd ?? 0), 0);
        const seconds = rows.reduce((n, r) => n + (r.seconds ?? 0), 0);
        const faults = rows.reduce((n, r) => n + r.faults.length, 0);
        const head = rows[0];
        return (
          <details key={runKey} className="rounded-lg border border-border/60 bg-card/40">
            <summary className="cursor-pointer px-3 py-2 flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="font-label text-primary">{runKey}</span>
              <span className="text-muted-foreground text-xs">{head.source}{head.subjectName ? ` · ${head.subjectName}` : ""} · {new Date(head.createdAt).toISOString().slice(0, 10)}</span>
              <span className="font-numeric text-xs ml-auto">{total} words · {cents(cost)} · {seconds.toFixed(0)} s · {faults ? <span className="text-destructive">{faults} faults</span> : "no fault"}</span>
            </summary>
            <table className="w-full text-xs font-numeric mb-2">
              <thead className="text-muted-foreground"><tr><th className="text-left pl-3">section</th><th className="text-left">model</th><th>tier</th><th>words</th><th>¢</th><th>s</th><th className="text-left">code</th><th className="text-left">faults</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/30">
                    <td className="pl-3">{r.section}</td>
                    <td>{r.model}{r.reasoningEffort ? ` · ${r.reasoningEffort}` : ""}</td>
                    <td className="text-center">{r.serviceTier}</td>
                    <td className="text-center">{r.status === "done" ? r.words : r.status}</td>
                    <td className="text-center">{cents(r.costUsd)}</td>
                    <td className="text-center">{r.seconds?.toFixed(1) ?? "-"}</td>
                    <td className={r.failureCode ? "text-destructive" : "text-muted-foreground"}>{r.failureCode ?? "-"}</td>
                    <td className={r.faults.length ? "text-destructive" : "text-muted-foreground"}>{r.error ?? (r.faults.join(" ") || "-")}</td>
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

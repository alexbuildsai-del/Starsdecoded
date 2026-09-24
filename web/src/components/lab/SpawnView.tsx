import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabApiError, cents, labApi, myReports, type CatalogueEntry, type EstimateResponse, type SessionDetail } from "@/lib/labApi";

/** The first session's sections, career first (annex, resolved at lock). */
const FIRST_SESSION = ["career", "overview", "superpowers", "discoveries"];
const ALL_SECTIONS = ["career", "overview", "superpowers", "discoveries", "mind", "money", "relationships", "family", "triad", "focus", "houses", "foundation"];

/**
 * Spawn a session (ADR-75): tick bases, sections, charts and writers, read
 * the estimate, then spawn. Nothing is generated before Spawn, and the
 * estimate must be in hand before the button enables. A base is a stored
 * label or one of the admin's own reports, by id and name; no birth data
 * is shown or sent.
 */
export function SpawnView({ onSpawned }: { onSpawned: (sessionId: string) => void }) {
  const [labels, setLabels] = useState<string[]>([]);
  const [fixturesByLabel, setFixturesByLabel] = useState<Record<string, string[]>>({});
  const [reports, setReports] = useState<Array<{ id: string; name: string }>>([]);
  const [models, setModels] = useState<CatalogueEntry[]>([]);
  const [baseline, setBaseline] = useState("gpt-5.2");
  const [label, setLabel] = useState(() => `session-${new Date().toISOString().slice(0, 10)}`);
  const [baseLabel, setBaseLabel] = useState("");
  const [charts, setCharts] = useState<Set<string>>(new Set());
  const [reportBases, setReportBases] = useState<Set<string>>(new Set());
  const [sections, setSections] = useState<Set<string>>(new Set(FIRST_SESSION));
  const [writers, setWriters] = useState<Set<string>>(new Set(["stored"]));
  const [control, setControl] = useState(true);
  const [tier, setTier] = useState<"flex" | "standard">("flex");
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spawned, setSpawned] = useState<SessionDetail | null>(null);
  const [spawning, setSpawning] = useState(false);
  const poll = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([labApi.runs(), labApi.catalogue(), myReports()]).then(([r, c, mine]) => {
      setLabels(r.labels);
      const by: Record<string, string[]> = {};
      for (const row of r.runs) if (row.source === "lab") by[row.label] = [...new Set([...(by[row.label] ?? []), row.fixture])];
      setFixturesByLabel(by);
      setModels(c.models);
      setBaseline(c.baseline);
      setWriters(new Set(["stored", ...c.models.filter((m) => m.id !== c.baseline && /^gpt-6/.test(m.id)).map((m) => m.id)]));
      setReports(mine);
      const first = r.labels[0] ?? "";
      setBaseLabel(first);
      setCharts(new Set(by[first] ?? []));
    }).catch((e: Error) => setError(e.message));
  }, []);

  const bases = useMemo(() => [
    ...(baseLabel ? [...charts].map((c) => `${c}.${baseLabel}`) : []),
    ...[...reportBases].map((id) => `report:${id}`),
  ], [baseLabel, charts, reportBases]);

  const body = useMemo(() => ({ bases, sections: ALL_SECTIONS.filter((s) => sections.has(s)), writers: [...writers], control }), [bases, sections, writers, control]);

  useEffect(() => {
    setEstimate(null);
    if (!bases.length || !body.sections.length || !body.writers.length) return;
    setEstimating(true);
    const t = window.setTimeout(() => {
      labApi.estimate(body).then(setEstimate).catch((e: Error) => setError(e.message)).finally(() => setEstimating(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [body, bases.length]);

  useEffect(() => () => { if (poll.current) window.clearInterval(poll.current); }, []);

  const toggle = (set: Set<string>, value: string, update: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    update(next);
  };

  const spawn = async () => {
    setSpawning(true);
    setError(null);
    try {
      const out = await labApi.spawn({ ...body, label, serviceTier: tier });
      const read = async () => {
        const s = await labApi.session(out.sessionId);
        setSpawned(s);
        if (s.ready && poll.current) { window.clearInterval(poll.current); poll.current = null; }
      };
      await read();
      poll.current = window.setInterval(read, 5000);
    } catch (e) {
      setError(e instanceof LabApiError && e.code === "lab_budget" ? `Over budget: ${cents(Number(e.body.spentUsd))} spent of ${cents(Number(e.body.budgetUsd))}` : (e as Error).message);
    } finally {
      setSpawning(false);
    }
  };

  const overBudget = estimate?.overBudget === true;
  const shownCost = estimate ? (tier === "flex" ? estimate.flexUsd : estimate.standardUsd) : null;

  if (spawned) {
    const pending = spawned.pending.filter((p) => p.status === "queued" || p.status === "running").length;
    const failed = spawned.pending.filter((p) => p.status === "failed");
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-4 flex flex-col gap-2 text-sm">
        <p className="font-label text-primary">{spawned.label}: {spawned.cards} cards</p>
        {spawned.ready
          ? <p>The room is ready.</p>
          : <p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary/40" /> {pending} replay{pending === 1 ? "" : "s"} still writing</p>}
        {failed.length > 0 && <p className="text-xs text-destructive">{failed.length} replay{failed.length === 1 ? "" : "s"} failed and will be named at the reveal: {failed.map((f) => `${f.section}`).join(", ")}</p>}
        <div><Button size="sm" disabled={!spawned.ready} onClick={() => onSpawned(spawned.id)}>Open the reading room</Button></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 text-sm">
      {error && <p className="text-xs text-destructive">{error}</p>}

      <label className="flex flex-col gap-1 max-w-xs">
        <span className="font-label text-xs text-muted-foreground">Session label</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-foreground" />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-label text-xs text-muted-foreground mb-1">Base: a stored label and its charts</legend>
        <select value={baseLabel} onChange={(e) => { setBaseLabel(e.target.value); setCharts(new Set(fixturesByLabel[e.target.value] ?? [])); }} className="bg-card/60 border border-border/60 rounded px-2 py-1 max-w-xs text-foreground">
          <option value="">no stored label</option>
          {labels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="flex flex-wrap gap-3">
          {(fixturesByLabel[baseLabel] ?? []).map((c) => (
            <label key={c} className="flex items-center gap-1.5"><input type="checkbox" checked={charts.has(c)} onChange={() => toggle(charts, c, setCharts)} /> {c}</label>
          ))}
        </div>
      </fieldset>

      {reports.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-label text-xs text-muted-foreground mb-1">Or your own reports, replayed in place</legend>
          <div className="flex flex-wrap gap-3">
            {reports.map((r) => (
              <label key={r.id} className="flex items-center gap-1.5"><input type="checkbox" checked={reportBases.has(r.id)} onChange={() => toggle(reportBases, r.id, setReportBases)} /> {r.name} <span className="font-numeric text-xs text-muted-foreground">{r.id.slice(0, 8)}</span></label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="font-label text-xs text-muted-foreground mb-1">Sections</legend>
        <div className="flex flex-wrap gap-3">
          {ALL_SECTIONS.map((s) => (
            <label key={s} className="flex items-center gap-1.5"><input type="checkbox" checked={sections.has(s)} onChange={() => toggle(sections, s, setSections)} /> {s}</label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-label text-xs text-muted-foreground mb-1">Writers</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={writers.has("stored")} onChange={() => toggle(writers, "stored", setWriters)} /> stored <span className="text-xs text-muted-foreground">(the base text, free)</span></label>
          {models.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5">
              <input type="checkbox" checked={writers.has(m.id)} onChange={() => toggle(writers, m.id, setWriters)} /> {m.id}
              <span className="font-numeric text-xs text-muted-foreground">{m.input}/{m.output} · {m.reasoningEffort}{m.flex ? " · flex" : ""}{m.checked ? "" : " · unchecked"}</span>
            </label>
          ))}
        </div>
        <label className="flex items-center gap-1.5 mt-1"><input type="checkbox" checked={control} onChange={() => setControl(!control)} /> hidden control <span className="text-xs text-muted-foreground">(a fresh {baseline} replay, never named before the reveal)</span></label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={tier === "flex"} onChange={() => setTier(tier === "flex" ? "standard" : "flex")} /> Flex tier where offered <span className="text-xs text-muted-foreground">(half price; standard otherwise)</span></label>
      </fieldset>

      <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex flex-col gap-1">
        <p className="font-label text-xs text-muted-foreground">Estimate</p>
        {estimating && <p className="flex items-center gap-2 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> pricing the cards</p>}
        {estimate && (
          <>
            <p className="font-numeric">{estimate.cards} cards · standard {cents(estimate.standardUsd)} · Flex {cents(estimate.flexUsd)} · spent this month {cents(estimate.spentUsd)} of {cents(estimate.budgetUsd)}</p>
            <p className="text-xs text-muted-foreground font-numeric">{estimate.perWriter.map((w) => `${w.writer}: ${w.replays} replays, ${cents(tier === "flex" ? w.flexUsd : w.standardUsd)}`).join(" · ")}</p>
            {overBudget && <p className="text-xs text-destructive">Over the lab budget: {cents(estimate.spentUsd)} spent plus {cents(shownCost)} would pass {cents(estimate.budgetUsd)} (LAB_BUDGET_USD).</p>}
          </>
        )}
        {!estimate && !estimating && <p className="text-xs text-muted-foreground">Tick at least one base, one section and one writer.</p>}
      </div>

      <div>
        <Button disabled={!estimate || overBudget || spawning || !label.trim()} onClick={spawn}>
          {spawning ? "Spawning" : `Spawn${shownCost !== null ? ` · ${cents(shownCost)}` : ""}`}
        </Button>
      </div>
    </div>
  );
}

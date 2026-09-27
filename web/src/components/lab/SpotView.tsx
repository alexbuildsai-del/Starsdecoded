import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabApiError, cents, labApi, type CatalogueEntry, type DryResponse, type ReplayStatus, type SpotEstimateResponse } from "@/lib/labApi";

const SECTIONS = ["pipeline", "foundation", "overview", "triad", "houses", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus"];
const CHARTS = ["marie-curie", "day-angular", "night-angular", "high-latitude", "audrey-hepburn", "marie-curie-unknown"];
const PAIRS = ["", "curie-winfrey", "william-charlotte", "william-george", "charles-william", "beatrice-athena"];

/**
 * Spot and dry (ADR-86): the dry is a button and free, every natal prompt
 * for the base's charts and every pair prompt for one pair, tokens and
 * schema per prompt, zero usage. The spot picks sections, charts and a
 * writer, shows the estimate against the budget, then replays on demand
 * and polls its rows. Nothing spends before the estimate is in hand.
 */
export function SpotView({ readOnly }: { readOnly: boolean }) {
  const [models, setModels] = useState<CatalogueEntry[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [base, setBase] = useState("r06");
  const [sections, setSections] = useState<Set<string>>(new Set(["career"]));
  const [charts, setCharts] = useState<Set<string>>(new Set(["marie-curie", "day-angular"]));
  const [model, setModel] = useState("gpt-5.2");
  const [tier, setTier] = useState<"flex" | "standard">("flex");
  const [estimate, setEstimate] = useState<SpotEstimateResponse | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [running, setRunning] = useState<ReplayStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState("");
  const [lens, setLens] = useState("");
  const [dry, setDry] = useState<DryResponse | null>(null);
  const [drying, setDrying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    labApi.catalogue().then((c) => { setModels(c.models); setModel(c.baseline); }).catch((e: Error) => setError(e.message));
    labApi.runs().then((r) => setLabels(r.labels)).catch(() => undefined);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, []);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };
  const request = () => ({ sections: [...sections], charts: [...charts], base, model, serviceTier: tier });

  const runEstimate = async () => {
    setEstimating(true);
    setError(null);
    setEstimate(null);
    try { setEstimate(await labApi.spotEstimate(request())); } catch (e) { setError((e as Error).message); } finally { setEstimating(false); }
  };

  const poll = (runKeys: string[]) => {
    const tick = async () => {
      const out = await Promise.all(runKeys.map((k) => labApi.replay(k)));
      setRunning(out);
      if (out.every((r) => r.status !== "running") && timer.current) { window.clearInterval(timer.current); timer.current = null; }
    };
    void tick();
    timer.current = window.setInterval(() => { void tick(); }, 5000);
  };

  const runSpot = async () => {
    setError(null);
    try {
      const out = await labApi.spot(request());
      setRunning(out.runKeys.map((runKey) => ({ runKey, status: "running", sections: [] })));
      poll(out.runKeys);
    } catch (e) {
      setError(e instanceof LabApiError && e.code === "lab_budget" ? `Refused: ${e.message}` : (e as Error).message);
    }
  };

  const runDry = async () => {
    setDrying(true);
    setError(null);
    setDry(null);
    try { setDry(await labApi.dry(base, pair || undefined, lens || undefined)); } catch (e) { setError((e as Error).message); } finally { setDrying(false); }
  };

  const chip = (on: boolean) => `px-2 py-1 rounded-md text-xs font-label border ${on ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="flex flex-col gap-6 text-sm">
      <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex flex-col gap-3">
        <p className="font-label text-xs tracking-wide text-primary">Dry · free</p>
        <div className="flex items-end gap-2 flex-wrap">
          <label className="text-xs font-label text-muted-foreground flex flex-col gap-1">base
            <select value={base} onChange={(e) => setBase(e.target.value)} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-foreground">
              {[...new Set(["r06", ...labels])].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="text-xs font-label text-muted-foreground flex flex-col gap-1">pair
            <select value={pair} onChange={(e) => setPair(e.target.value)} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-foreground">
              {PAIRS.map((p) => <option key={p} value={p}>{p || "none"}</option>)}
            </select>
          </label>
          <label className="text-xs font-label text-muted-foreground flex flex-col gap-1">lens
            <select value={lens} onChange={(e) => setLens(e.target.value)} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-foreground">
              {["", "partners", "parent_child", "people"].map((l) => <option key={l} value={l}>{l || "the fixture's"}</option>)}
            </select>
          </label>
          <Button size="sm" variant="outline" disabled={drying} onClick={runDry}>{drying ? "Rendering" : "Dry"}</Button>
        </div>
        {dry && (
          <>
            <p className="text-xs text-muted-foreground">{dry.rows.length} prompts, usage recorded {dry.usageRecorded}. Served: {Object.entries(dry.served).map(([m, ok]) => `${m} ${ok ? "yes" : "no"}`).join(", ") || (dry.servedError ? `unknown (${dry.servedError.slice(0, 60)})` : "-")}</p>
            <table className="w-full text-xs font-numeric">
              <thead className="text-muted-foreground"><tr><th className="text-left">fixture</th><th className="text-left">section</th><th>tokens</th><th>baseline</th><th>delta</th><th>schema</th></tr></thead>
              <tbody>
                {dry.rows.map((r) => (
                  <tr key={`${r.fixture}-${r.section}`} className="border-t border-border/30">
                    <td>{r.fixture}</td><td>{r.section}</td><td className="text-center">{r.inputTokens}</td><td className="text-center">{r.baselineInputTokens ?? "-"}</td>
                    <td className="text-center">{r.baselineInputTokens === null ? "-" : r.inputTokens - r.baselineInputTokens}</td>
                    <td className={`text-center ${r.schemaOk ? "text-primary" : "text-destructive"}`}>{r.schemaOk ? "ok" : `BROKEN${r.error ? ` (${r.error.slice(0, 60)})` : ""}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex flex-col gap-3">
        <p className="font-label text-xs tracking-wide text-primary">Spot · the changed sections replayed, foundation held</p>
        <div className="flex flex-wrap gap-1">{SECTIONS.map((s) => <button key={s} type="button" className={chip(sections.has(s))} onClick={() => toggle(sections, setSections, s)}>{s}</button>)}</div>
        <div className="flex flex-wrap gap-1">{CHARTS.map((c) => <button key={c} type="button" className={chip(charts.has(c))} onClick={() => toggle(charts, setCharts, c)}>{c}</button>)}</div>
        <div className="flex items-end gap-2 flex-wrap">
          <label className="text-xs font-label text-muted-foreground flex flex-col gap-1">writer
            <select value={model} onChange={(e) => setModel(e.target.value)} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-foreground">
              {models.map((m) => <option key={m.id} value={m.id}>{m.id}{m.flex ? " · flex" : ""}</option>)}
            </select>
          </label>
          <label className="text-xs font-label text-muted-foreground flex flex-col gap-1">tier
            <select value={tier} onChange={(e) => setTier(e.target.value as "flex" | "standard")} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-foreground">
              <option value="flex">flex where offered</option><option value="standard">standard</option>
            </select>
          </label>
          <Button size="sm" variant="outline" disabled={estimating || !sections.size || !charts.size} onClick={runEstimate}>{estimating ? "Pricing" : "Estimate"}</Button>
          <Button size="sm" disabled={!estimate || estimate.overBudget || readOnly || (running?.some((r) => r.status === "running") ?? false)} onClick={runSpot}>Run the spot</Button>
        </div>
        {estimate && (
          <p className={`text-xs font-numeric ${estimate.overBudget ? "text-destructive" : "text-muted-foreground"}`}>
            about {cents(estimate.estimateUsd)} on {estimate.model} ({estimate.serviceTier}) · {estimate.perChart.map((c) => `${c.chart} ${cents(c.estimateUsd)}`).join(", ")} · spent {cents(estimate.spentUsd)} of {cents(estimate.budgetUsd)}{estimate.overBudget ? " · over budget, refused" : ""}
          </p>
        )}
        {running && running.map((r) => (
          <div key={r.runKey} className="text-xs font-numeric">
            <p className="font-label text-primary">{r.runKey} · {r.status === "running" ? <Loader2 className="inline h-3 w-3 animate-spin" /> : r.status}</p>
            {r.sections.map((s) => <p key={s.id} className={s.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{s.section} · {s.status}{s.status === "done" ? ` · ${s.words} words · ${cents(s.costUsd)}${s.faults.length ? ` · ${s.faults.join(" ")}` : ""}` : ""}{s.failureCode ? ` · ${s.failureCode}` : ""}</p>)}
          </div>
        ))}
      </div>
      {error && <p className="text-destructive">{error}</p>}
    </div>
  );
}

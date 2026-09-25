import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LabApiError, cents, labApi, type RevealResponse, type SessionSummary, type WriterTally } from "@/lib/labApi";
import { ProseStudyView } from "@/components/lab/ProseStudyView";

const tally = (t: WriterTally | undefined) => (t ? `${t.best}/${t.tied}/${t.notShip}` : "-");

/**
 * Reveal (ADR-54): disabled until every card is judged, then per writer the
 * best, tied and not-shippable counts by section and by tier with faults,
 * words and cost; per mix the cost and the sections marked worse than the
 * baseline; the control's agreement rate as the noise floor. Older
 * sessions stay readable here with their notes.
 */
export function RevealView({ sessionId, onSession }: { sessionId: string | null; onSession: (id: string) => void }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "locked" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    labApi.sessions().then((s) => {
      setSessions(s.sessions);
      if (!sessionId && s.sessions[0]) onSession(s.sessions[0].id);
    }).catch((e: Error) => { setState("error"); setMessage(e.message); });
  }, [sessionId, onSession]);

  useEffect(() => {
    if (!sessionId) return;
    setState("loading");
    setReveal(null);
    labApi.reveal(sessionId).then((r) => { setReveal(r); setState("idle"); }).catch((e: unknown) => {
      if (e instanceof LabApiError && e.status === 409) { setState("locked"); setMessage(e.message); }
      else { setState("error"); setMessage((e as Error).message); }
    });
  }, [sessionId]);

  const sections = reveal ? [...new Set(reveal.writers.flatMap((w) => Object.keys(w.bySection)))] : [];
  const tiers = reveal ? [...new Set(reveal.writers.flatMap((w) => Object.keys(w.byTier)))] : [];

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={sessionId ?? ""} onChange={(e) => onSession(e.target.value)} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-foreground">
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.judged}/{s.cards}{s.revealedAt ? " · revealed" : ""}</option>)}
        </select>
        {state === "loading" && <Loader2 className="h-4 w-4 animate-spin text-primary/40" />}
      </div>
      {!sessions.length && <p className="text-muted-foreground">No session yet.</p>}
      {state === "locked" && <p className="text-muted-foreground">Reveal is disabled until every card is judged. {message}</p>}
      {state === "error" && <p className="text-destructive">{message}</p>}

      {reveal && (
        <>
          <p className="font-label text-primary">{reveal.label} · control agreement {reveal.control.rate === null ? "-" : `${Math.round(reveal.control.rate * 100)}%`} on {reveal.control.cards} cards <span className="text-xs text-muted-foreground">(how often one 5.2 was preferred over the other: the noise floor a writer must beat)</span></p>

          <div className="rounded-lg border border-border/60 bg-card/40 p-3 overflow-x-auto">
            <p className="font-label text-xs text-muted-foreground mb-2">Per writer: best / tied / would not ship</p>
            <table className="text-xs font-numeric w-full">
              <thead className="text-muted-foreground">
                <tr><th className="text-left">writer</th><th>tier</th><th>total</th>{tiers.map((t) => <th key={t}>{t}</th>)}{sections.map((s) => <th key={s}>{s}</th>)}<th>faults</th><th>words</th><th>¢</th></tr>
              </thead>
              <tbody>
                {reveal.writers.map((w) => (
                  <tr key={`${w.writer}-${w.serviceTier}`} className="border-t border-border/30">
                    <td className="text-left">{w.writer}</td><td className="text-center">{w.serviceTier}</td><td className="text-center">{tally(w.total)}</td>
                    {tiers.map((t) => <td key={t} className="text-center">{tally(w.byTier[t])}</td>)}
                    {sections.map((s) => <td key={s} className="text-center">{tally(w.bySection[s])}</td>)}
                    <td className={`text-center ${w.faults ? "text-destructive" : ""}`}>{w.faults}</td><td className="text-center">{w.words}</td><td className="text-center">{cents(w.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-3">
            <p className="font-label text-xs text-muted-foreground mb-2">Per mix</p>
            <table className="text-xs font-numeric w-full">
              <thead className="text-muted-foreground"><tr><th className="text-left">mix</th><th className="text-left">writers</th><th>¢ a report</th><th className="text-left">sections worse than the baseline</th></tr></thead>
              <tbody>
                {reveal.mixes.map((m) => (
                  <tr key={m.mix} className="border-t border-border/30"><td>{m.mix}</td><td>{m.description}</td><td className="text-center">{cents(m.costUsd)}</td><td className={m.worseThanBaseline.length ? "text-destructive" : "text-muted-foreground"}>{m.worseThanBaseline.join(", ") || "none"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {reveal.dropped.length > 0 && (
            <p className="text-xs text-destructive">Dropped after a retry: {reveal.dropped.map((d) => `${d.writer} on ${d.fixture}/${d.section}${d.error ? ` (${d.error.slice(0, 80)})` : ""}`).join("; ")}</p>
          )}

          <details className="rounded-lg border border-border/60 bg-card/40">
            <summary className="cursor-pointer px-3 py-2 font-label text-xs text-muted-foreground">Every card, letters named, with the notes</summary>
            <table className="text-xs font-numeric w-full mb-2">
              <thead className="text-muted-foreground"><tr><th className="text-left pl-3">card</th><th className="text-left">letters</th><th className="text-left">best</th><th className="text-left">not ship</th><th className="text-left">same</th><th className="text-left">note</th></tr></thead>
              <tbody>
                {reveal.cards.map((c) => {
                  const name = (i: number) => `${Object.keys(c.letters)[i] ?? i}=${Object.values(c.letters)[i] ?? "?"}`;
                  return (
                    <tr key={c.id} className="border-t border-border/30 align-top">
                      <td className="pl-3">{c.section} · {c.fixture}</td>
                      <td>{Object.entries(c.letters).map(([l, w]) => `${l} ${w}`).join(" · ")}</td>
                      <td>{c.picks?.best.map(name).join(", ") || "-"}</td>
                      <td>{c.picks?.notShip.map(name).join(", ") || "-"}</td>
                      <td>{c.picks?.same.map((g) => g.map(name).join("=")).join("; ") || "-"}</td>
                      <td className="font-sans">{c.note || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>

          <ProseStudyView sessionId={reveal.sessionId} revealed />
        </>
      )}
    </div>
  );
}

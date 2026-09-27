import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabApiError, cents, labApi, type NotesEstimate, type NotesResponse, type ProseStudyResponse } from "@/lib/labApi";

const METRICS: Array<[string, string, number]> = [
  ["wordsPerSentenceMean", "words a sentence", 1], ["wordsPerSentenceP90", "p90", 0], ["longestSentence", "longest", 0], ["longWordShare", "long words", 2],
  ["avgWordLength", "word length", 2], ["fleschReadingEase", "reading ease", 0], ["secondPersonSentenceShare", "second person", 2], ["emDashes", "em dashes", 1], ["semicolons", "semicolons", 1], ["words", "words", 0],
];
const fmt = (v: number | null | undefined, d: number) => (v === null || v === undefined ? "-" : (d ? v.toFixed(d) : Math.round(v).toString()));
const signed = (v: number | null | undefined, d: number) => (v === null || v === undefined ? "-" : `${v > 0 ? "+" : ""}${fmt(v, d)}`);

/**
 * Prose study (ADR-88): after the reveal, every variant measured in code
 * and the picks compared with what was passed over, per card, overall and
 * per writer; a measure agreeing on 8 of 12 cards is a proposal with its
 * numbers, for the Owner to approve. Free; the optional notes step shows
 * its estimate before it runs and is the only text this view shows.
 */
export function ProseStudyView({ sessionId, revealed }: { sessionId: string; revealed: boolean }) {
  const [study, setStudy] = useState<ProseStudyResponse | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [estimate, setEstimate] = useState<NotesEstimate | null>(null);
  const [notes, setNotes] = useState<NotesResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setState("loading");
    try { setStudy(await labApi.proseStudy(sessionId)); setState("idle"); } catch (e) { setState("error"); setMessage(e instanceof LabApiError && e.status === 409 ? `Not yet: ${e.message}` : (e as Error).message); }
  };
  const price = async () => { setBusy(true); try { setEstimate(await labApi.notesEstimate(sessionId)); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  const write = async () => { setBusy(true); try { setNotes(await labApi.notes(sessionId)); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-label text-xs tracking-wide text-primary">Prose study · free, measured in code</p>
        <Button size="sm" variant="outline" disabled={!revealed || state === "loading"} onClick={run}>{state === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Prose study"}</Button>
        {!revealed && <span className="text-xs text-muted-foreground">after the reveal</span>}
      </div>
      {state === "error" && <p className="text-xs text-destructive">{message}</p>}
      {study && (
        <>
          <p className="text-xs text-muted-foreground">{study.overall.cards} comparable cards of {study.cards.length}. Picked minus passed over; a proposal needs 8 of 12 cards to agree.</p>
          <table className="w-full text-xs font-numeric">
            <thead className="text-muted-foreground"><tr><th className="text-left">card</th>{METRICS.map(([k, name]) => <th key={k}>{name}</th>)}</tr></thead>
            <tbody>
              {study.cards.map((c) => (
                <tr key={c.id} className="border-t border-border/30"><td className="text-left">{c.section} · {c.fixture}</td>{METRICS.map(([k, , d]) => <td key={k} className="text-center">{signed(c.delta[k], d)}</td>)}</tr>
              ))}
              <tr className="border-t border-border/60 text-primary"><td className="text-left">overall</td>{METRICS.map(([k, , d]) => <td key={k} className="text-center">{signed(study.overall.delta[k], d)}</td>)}</tr>
            </tbody>
          </table>
          <table className="w-full text-xs font-numeric">
            <thead className="text-muted-foreground"><tr><th className="text-left">writer</th><th>picked</th>{METRICS.map(([k, name]) => <th key={k}>{name}</th>)}</tr></thead>
            <tbody>
              {study.writers.map((w) => (
                <tr key={w.writer} className="border-t border-border/30"><td className="text-left">{w.writer}</td><td className="text-center">{w.picked}/{w.variants}</td>{METRICS.map(([k, , d]) => <td key={k} className="text-center">{fmt(w.mean[k], d)} <span className="text-muted-foreground">({signed(w.delta[k], d)})</span></td>)}</tr>
              ))}
            </tbody>
          </table>
          <div>
            <p className="font-label text-xs text-muted-foreground mb-1">Proposals ({study.proposals.length})</p>
            {study.proposals.length === 0 && <p className="text-xs text-muted-foreground">No measure agrees on 8 of 12 cards.</p>}
            <ul className="text-xs list-disc pl-4">{study.proposals.map((p) => <li key={p.metric}><span className="text-foreground">{p.metric}</span> {p.direction} on {p.agree} of {p.cards}: {p.rule}</li>)}</ul>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" disabled={busy} onClick={price}>Price the notes</Button>
            {estimate && <span className="text-xs font-numeric text-muted-foreground">about {cents(estimate.estimateUsd)} on {estimate.model} for {estimate.cards} cards · spent {cents(estimate.spentUsd)} of {cents(estimate.budgetUsd)}</span>}
            {estimate && <Button size="sm" disabled={busy || estimate.overBudget} onClick={write}>Write three lines a card</Button>}
          </div>
          {notes && (
            <div className="text-xs flex flex-col gap-2">
              <p className="text-muted-foreground">{notes.notes.length} cards · {cents(notes.costUsd)} on {notes.model}</p>
              {notes.notes.map((n) => <div key={n.id}><p className="font-label text-primary">{n.section} · {n.fixture}</p>{n.lines.map((l, i) => <p key={i}>{l}</p>)}</div>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

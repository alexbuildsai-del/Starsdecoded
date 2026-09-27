import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { labApi, type CardDetail, type SessionDetail, type SessionSummary } from "@/lib/labApi";
import { EMPTY_PICKS, blocksOf, groupOf, isJudged, nextCard, orderCards, tie, toggleBest, toggleNotShip, untie, type Picks } from "@/lib/labCards";

/**
 * The reading room (ADR-54, ADR-57): one card per fixture and section, the
 * variants side by side as A, B, C in the stored shuffled order, model,
 * cost and faults hidden. A card fetches its text only when it opens
 * (ADR-75); a pick saves at once; the room reopens on the first unjudged
 * card, career first.
 */
export function ReadingRoom({ sessionId, onSession, onReveal }: { sessionId: string | null; onSession: (id: string) => void; onReveal: (id: string) => void }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [card, setCard] = useState<CardDetail | null>(null);
  const [picks, setPicks] = useState<Picks>(EMPTY_PICKS);
  const [note, setNote] = useState("");
  const [tying, setTying] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    labApi.sessions().then((s) => {
      setSessions(s.sessions);
      if (!sessionId && s.sessions[0]) onSession(s.sessions[0].id);
    }).catch((e: Error) => setError(e.message));
  }, [sessionId, onSession]);

  useEffect(() => {
    if (!sessionId) return;
    setCard(null);
    labApi.session(sessionId).then((s) => {
      setSession(s);
      const next = nextCard(s.list) ?? orderCards(s.list)[0];
      if (next) open(sessionId, next.id);
    }).catch((e: Error) => setError(e.message));
  }, [sessionId]);

  const open = async (sid: string, cardId: string) => {
    try {
      const c = await labApi.card(sid, cardId);
      setCard(c);
      setPicks(c.picks ?? EMPTY_PICKS);
      setNote(c.note ?? "");
      setTying(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const save = async (next: Picks, nextNote = note) => {
    if (!session || !card) return;
    setPicks(next);
    setSaving(true);
    try {
      await labApi.judge(session.id, card.id, { picks: next, note: nextNote });
      setSession({ ...session, list: session.list.map((c) => (c.id === card.id ? { ...c, judged: isJudged(next) } : c)), judged: session.list.filter((c) => (c.id === card.id ? isJudged(next) : c.judged)).length });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (!session) return;
    const after = nextCard(session.list.filter((c) => c.id !== card?.id));
    if (after) open(session.id, after.id);
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!sessions.length) return <p className="text-sm text-muted-foreground">No session yet. Spawn one first.</p>;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <select value={sessionId ?? ""} onChange={(e) => onSession(e.target.value)} className="bg-card/60 border border-border/60 rounded px-2 py-1 text-foreground">
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.judged}/{s.cards}{s.revealedAt ? " · revealed" : s.ready ? "" : " · writing"}</option>)}
        </select>
        {session && <span className="font-numeric text-xs text-muted-foreground">{session.judged} of {session.cards} judged</span>}
        {session && <Button size="sm" variant="outline" disabled={session.judged < session.cards} onClick={() => onReveal(session.id)}>Reveal</Button>}
      </div>

      {session && !session.ready && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> replays still writing; cards open as they land</p>}

      {session && (
        <div className="flex flex-wrap gap-1">
          {orderCards(session.list).map((c) => (
            <button key={c.id} type="button" onClick={() => open(session.id, c.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-label border ${card?.id === c.id ? "border-primary text-primary" : c.judged ? "border-border/40 text-muted-foreground" : "border-border/80 text-foreground"}`}>
              {c.section} · {c.fixture}
            </button>
          ))}
        </div>
      )}

      {card && (
        <div className="flex flex-col gap-3">
          <p className="font-label text-primary">{card.section} · {card.fixture}</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(card.variants.length, 3)}, minmax(0, 1fr))` }}>
            {card.variants.map((v, i) => {
              const best = picks.best.includes(i), bad = picks.notShip.includes(i), group = groupOf(picks, i);
              return (
                <div key={v.letter} className={`rounded-lg border p-3 flex flex-col gap-2 ${best ? "border-primary/70" : bad ? "border-destructive/60" : "border-border/60"} bg-card/40`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-lg">{v.letter}</span>
                    {group && <span className="text-[11px] text-muted-foreground">same as {group.filter((x) => x !== i).map((x) => card.variants[x]?.letter).join(", ")}</span>}
                    <span className="ml-auto flex gap-1">
                      <Button size="sm" variant={best ? "default" : "outline"} disabled={saving} onClick={() => save(toggleBest(picks, i))}>best</Button>
                      <Button size="sm" variant={bad ? "destructive" : "outline"} disabled={saving} onClick={() => save(toggleNotShip(picks, i))}>would not ship</Button>
                      {tying === null
                        ? <Button size="sm" variant="ghost" disabled={saving} onClick={() => setTying(i)}>same as…</Button>
                        : tying === i
                          ? <Button size="sm" variant="ghost" onClick={() => setTying(null)}>cancel</Button>
                          : <Button size="sm" variant="ghost" disabled={saving} onClick={() => { save(tie(picks, tying, i)); setTying(null); }}>= {card.variants[tying]?.letter}</Button>}
                      {group && <Button size="sm" variant="ghost" disabled={saving} onClick={() => save(untie(picks, i))}>untie</Button>}
                    </span>
                  </div>
                  <div className="prose-sm max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-1.5 leading-relaxed">
                    {blocksOf(v.text).map((b, k) =>
                      b.kind === "heading" ? <p key={k} className="font-label text-[10px] tracking-[0.15em] uppercase text-muted-foreground mt-2">{b.text}</p>
                        : b.kind === "bullet" ? <p key={k} className="pl-3 border-l border-border/40">{b.text}</p>
                          : <p key={k}>{b.text}</p>)}
                  </div>
                </div>
              );
            })}
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-label text-xs text-muted-foreground">Note</span>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => { if (note !== (card.note ?? "")) save(picks, note); }} rows={2} />
          </label>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={goNext} disabled={saving}>Next unjudged</Button>
            {saving && <span className="text-xs text-muted-foreground">saving</span>}
          </div>
        </div>
      )}
    </div>
  );
}

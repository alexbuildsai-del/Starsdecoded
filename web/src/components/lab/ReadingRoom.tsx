import { useEffect, useState } from "react";
import { Card } from "@/ds/molecules/Card";
import { Loader2 } from "lucide-react";
import { Chip } from "@/ds/atoms/Chip";
import { Select } from "@/ds/atoms/Select";
import { Button } from "@/ds/atoms/Button";
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

  if (error) return <p className="text-sm text-error">{error}</p>;
  if (!sessions.length) return <p className="text-sm text-paper-dim">No session yet. Spawn one first.</p>;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={sessionId ?? ""} onChange={(e) => onSession(e.target.value)} className="h-10 w-auto min-w-32">
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.judged}/{s.cards}{s.revealedAt ? " · revealed" : s.ready ? "" : " · writing"}</option>)}
        </Select>
        {session && <span className="font-numeric text-data text-paper-dim">{session.judged} of {session.cards} judged</span>}
        {session && <Button size="compact" variant="secondary" disabled={session.judged < session.cards} onClick={() => onReveal(session.id)}>Reveal</Button>}
      </div>

      {session && !session.ready && <p className="text-xs text-paper-dim flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> replays still writing; cards open as they land</p>}

      {session && (
        <div className="flex flex-wrap gap-1">
          {orderCards(session.list).map((c) => (
            <Chip key={c.id} quiet selected={card?.id === c.id} className={c.judged ? "text-paper-dim" : undefined} onClick={() => open(session.id, c.id)}>
              {c.section} · {c.fixture}
            </Chip>
          ))}
        </div>
      )}

      {card && (
        <div className="flex flex-col gap-3">
          <p className="font-label text-indigo-lt">{card.section} · {card.fixture}</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(card.variants.length, 3)}, minmax(0, 1fr))` }}>
            {card.variants.map((v, i) => {
              const best = picks.best.includes(i), bad = picks.notShip.includes(i), group = groupOf(picks, i);
              return (
                <div key={v.letter} className={`rounded-card border p-3 flex flex-col gap-2 ${best ? "border-indigo-lt" : bad ? "border-error/60" : "border-line"} bg-surface`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-lg">{v.letter}</span>
                    {group && <span className="text-data-sm text-paper-dim">same as {group.filter((x) => x !== i).map((x) => card.variants[x]?.letter).join(", ")}</span>}
                    <span className="ml-auto flex gap-1">
                      <Button size="compact" variant={best ? "primary" : "secondary"} disabled={saving} onClick={() => save(toggleBest(picks, i))}>best</Button>
                      <Button size="compact" variant={bad ? "danger" : "secondary"} disabled={saving} onClick={() => save(toggleNotShip(picks, i))}>would not ship</Button>
                      {tying === null
                        ? <Button size="compact" variant="secondary" disabled={saving} onClick={() => setTying(i)}>same as…</Button>
                        : tying === i
                          ? <Button size="compact" variant="secondary" onClick={() => setTying(null)}>cancel</Button>
                          : <Button size="compact" variant="secondary" disabled={saving} onClick={() => { save(tie(picks, tying, i)); setTying(null); }}>= {card.variants[tying]?.letter}</Button>}
                      {group && <Button size="compact" variant="secondary" disabled={saving} onClick={() => save(untie(picks, i))}>untie</Button>}
                    </span>
                  </div>
                  <div className="prose-sm max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-1.5 leading-relaxed">
                    {blocksOf(v.text).map((b, k) =>
                      b.kind === "heading" ? <p key={k} className="font-label text-label tracking-[0.15em] uppercase text-paper-dim mt-2">{b.text}</p>
                        : b.kind === "bullet" ? <p key={k} className="pl-3 border-l border-line">{b.text}</p>
                          : <p key={k}>{b.text}</p>)}
                  </div>
                </div>
              );
            })}
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-label text-xs text-paper-dim">Note</span>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => { if (note !== (card.note ?? "")) save(picks, note); }} rows={2} />
          </label>
          <div className="flex items-center gap-2">
            <Button size="compact" onClick={goNext} disabled={saving}>Next unjudged</Button>
            {saving && <span className="text-xs text-paper-dim">saving</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Chapter 01's ledger (ADR-101): "Naturally strong" in teal and "Will take
 * work" in rose, side by side from 760 px, each line in the display face
 * beside the glyph of the cross link its claims cite, A's render, the link,
 * B's render, the two body names under; a strong link is a straight line,
 * brass for a touch and teal otherwise, a work link the rose zigzag. A chip
 * points at the lens chapter whose claims cite the link. The paradox spans
 * both columns under a teal-to-rose rule and the pointer closes. No number,
 * bar or score, and no strengths block: those live on the share card.
 */
import { CitedText, newCitationCounter, type CitationCounter } from "@/components/report/Citation";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { ledgerRows, linkAnchor, type LedgerRow } from "@/lib/ledger";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { PLANET_GLYPHS, PLANET_LABELS, type Lens, type PairInterpretation, type PairTwoCharts } from "@/types/chart";

const TEAL = "#5FB3A1";
const ROSE = "#D07A8A";
const BRASS = "#D4B06A";

export interface TwoChartsLedgerProps {
  s: PairTwoCharts;
  names: { a: string; b: string };
  interpretation: PairInterpretation;
  lens: Lens;
}

function Body({ body, x }: { body: string; x: number }) {
  const src = PLANET_RENDERS[body];
  if (src) return <image href={src} x={x} y={4} width={26} height={26} />;
  // Chiron and the nodes have no render: the point, as the wheel draws it.
  return (
    <g>
      <circle cx={x + 13} cy={17} r={9} fill="#0B0E14" stroke={BRASS} strokeOpacity={0.55} />
      <text x={x + 13} y={21} textAnchor="middle" fontSize={11} fill={BRASS}>{PLANET_GLYPHS[body] ?? "·"}</text>
    </g>
  );
}

/** The link between the two renders: straight for what comes easily, the zigzag for what takes work. */
function Glyph({ row }: { row: LedgerRow }) {
  if (!row.link || !row.glyph) return null;
  const colour = row.glyph === "rub" ? ROSE : row.glyph === "touch" ? BRASS : TEAL;
  return (
    <svg viewBox="0 0 90 34" width="90" height="34" aria-hidden className="block" data-glyph={row.glyph}>
      {row.glyph === "rub"
        ? <polyline points="29,17 34,11 39,23 44,11 49,23 54,11 61,17" fill="none" stroke={colour} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" />
        : <line x1={28} y1={17} x2={62} y2={17} stroke={colour} strokeWidth={2.2} strokeLinecap="round" />}
      <Body body={row.link.planetA} x={2} />
      <Body body={row.link.planetB} x={62} />
    </svg>
  );
}

function Row({ row, names, claims, counter, hasCard }: { row: LedgerRow; names: { a: string; b: string }; claims: PairTwoCharts["claims"]; counter: CitationCounter; hasCard: boolean }) {
  const reduced = useReducedMotion();
  const label = row.link ? `${PLANET_LABELS[row.link.planetA] ?? row.link.planetA} · ${PLANET_LABELS[row.link.planetB] ?? row.link.planetB}` : "";
  const title = row.link ? `${names.a}'s ${PLANET_LABELS[row.link.planetA] ?? row.link.planetA}, ${names.b}'s ${PLANET_LABELS[row.link.planetB] ?? row.link.planetB}` : "";
  const open = () => {
    if (!row.link) return;
    const card = document.getElementById(linkAnchor(row.link));
    if (!card) return;
    card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    card.focus({ preventScroll: true });
  };
  const glyph = (
    <>
      <Glyph row={row} />
      {row.link && <small className="block font-label text-[9px] tracking-[0.16em] uppercase text-[var(--paper-dim)] text-center">{label}</small>}
    </>
  );
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-[var(--line-soft)] py-4 first:border-t-0 first:pt-2" data-ledger-row>
      <div className="min-w-0">
        {row.link && hasCard
          ? <button type="button" onClick={open} title={`${title}: read the link card`} aria-label={`${title}: read the link card`} className="block w-[90px] rounded-md p-0 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]">{glyph}</button>
          : row.link ? <span className="block w-[90px]" title={title}>{glyph}</span> : null}
      </div>
      <div className="min-w-0">
        <p className="font-display text-[17px] leading-[1.45] text-[var(--paper)]">{CitedText({ text: row.text, claims, counter })}</p>
        {row.chapter && (
          <a
            href={`#chapter-${row.chapter.number}`}
            className="mt-2 inline-block rounded-full border border-current px-2.5 py-1 font-label text-[9.5px] uppercase tracking-[0.16em] no-underline"
            style={{ color: "inherit" }}
          >
            → {String(row.chapter.number).padStart(2, "0")} {row.chapter.title}
          </a>
        )}
      </div>
    </div>
  );
}

function Column({ title, colour, rows, names, claims, counter, cards }: {
  title: string; colour: string; rows: LedgerRow[]; names: { a: string; b: string }; claims: PairTwoCharts["claims"]; counter: CitationCounter; cards: Set<string>;
}) {
  return (
    <div className="min-w-0" style={{ color: colour }} data-ledger-column>
      <div className="flex items-center gap-3">
        <span className="font-label text-[10px] tracking-[0.2em] uppercase">{title}</span>
        <span aria-hidden className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${colour}, transparent)` }} />
      </div>
      <div className="mt-2 text-[var(--paper)]">
        {rows.map((row, i) => <Row key={i} row={row} names={names} claims={claims} counter={counter} hasCard={row.link ? cards.has(linkAnchor(row.link)) : false} />)}
      </div>
    </div>
  );
}

export function TwoChartsLedger({ s, names, interpretation, lens }: TwoChartsLedgerProps) {
  const counter = newCitationCounter();
  const rows = ledgerRows(s, interpretation, lens);
  const cards = new Set(
    (interpretation.links?.links ?? [])
      .filter((l) => l.kind !== "overlay" && l.planetA && l.aspect && l.planetB)
      .map((l) => linkAnchor({ planetA: l.planetA!, aspect: l.aspect!, planetB: l.planetB! })),
  );
  return (
    <div className="mt-8" data-two-charts-ledger>
      <div className="grid gap-8 min-[760px]:grid-cols-2 min-[760px]:gap-x-10">
        <Column title="Naturally strong" colour={TEAL} rows={rows.strong} names={names} claims={s.claims} counter={counter} cards={cards} />
        <Column title="Will take work" colour={ROSE} rows={rows.work} names={names} claims={s.claims} counter={counter} cards={cards} />
      </div>
      <div className="mx-auto mt-10 max-w-[44ch] text-center" data-paradox>
        <span className="font-label text-[10px] tracking-[0.2em] uppercase text-[var(--paper-dim)]">The paradox</span>
        <span aria-hidden className="mx-auto mt-3 block h-px w-full" style={{ background: `linear-gradient(90deg, ${TEAL}, ${ROSE})` }} />
        <p className="mt-4 font-display italic text-[22px] leading-[1.35] text-[var(--paper)]">{CitedText({ text: s.paradox, claims: s.claims, counter })}</p>
      </div>
      <p className="rp-pull mx-auto">{CitedText({ text: s.pointer, claims: s.claims, counter })}</p>
    </div>
  );
}

export default TwoChartsLedger;

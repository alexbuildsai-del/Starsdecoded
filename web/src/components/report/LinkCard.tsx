/**
 * Where your charts meet (ADR-177), the end of chapter 01: one card per point
 * where the two charts meet, titled in people words with the astrology in
 * small mono under it, tagged Comes naturally in teal or Challenge in rose.
 * The two tags stand side by side from 760 px, as the ledger's columns do.
 * Three of each lead and the rest, overlays included, wait behind Show all N;
 * paper prints every card, since a PDF has nothing to tap. No number
 * describes the pair; the orb is geometry. An aspect card carries the id the
 * ledger's glyph scrolls to (ADR-101).
 */
import { useEffect, useId, useRef, useState } from "react";
import { MEET_COLOURS, MEET_TAGS, meetCards, meetIntro, type MeetCard, type MeetTag } from "@/lib/charts-meet";
import type { LedgerLink } from "@/lib/ledger";
import type { PairLink } from "@/types/chart";

interface Placed {
  card: MeetCard;
  /** Behind Show all until it is pressed; printed either way. */
  rest: boolean;
}

function Dot({ colour }: { colour: string }) {
  return <span aria-hidden className="block h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: colour }} />;
}

export function LinkCard({ card, rest = false }: { card: MeetCard; rest?: boolean }) {
  return (
    <article
      id={card.anchor}
      tabIndex={-1}
      data-meet-card={card.tag ?? "overlay"}
      data-rest={rest || undefined}
      className="rp-link h-full scroll-mt-24 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] print:break-inside-avoid print:border-[#bbb] print:bg-transparent"
    >
      {card.tag && (
        <div className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.14em]" style={{ color: MEET_COLOURS[card.tag] }}>
          <Dot colour={MEET_COLOURS[card.tag]} />
          {MEET_TAGS[card.tag]}
        </div>
      )}
      <h4 className="text-[18px] leading-[1.25] text-[var(--paper)] first:mt-0 print:text-black">{card.title}</h4>
      <p className="mt-1 font-numeric text-[10.5px] uppercase leading-[1.5] tracking-[0.08em] text-[var(--paper-dim)] print:text-[#444]">{card.astro}</p>
      <p className="print:text-black">{card.body}</p>
      {card.check && <p className="print:text-black"><span className="rp-lab">Does this sound like you?</span> {card.check}</p>}
    </article>
  );
}

function Group({ tag, placed, all, wide }: { tag: MeetTag; placed: Placed[]; all: boolean; wide: boolean }) {
  const label = useId();
  const shown = all ? placed.length : placed.filter((p) => !p.rest).length;
  return (
    <div role="group" aria-labelledby={label} className="min-w-0" data-meet-group={tag}>
      <p id={label} className="flex items-center gap-2 font-label text-[11px] uppercase tracking-[0.14em]" style={{ color: MEET_COLOURS[tag] }}>
        <Dot colour={MEET_COLOURS[tag]} />
        <span>{MEET_TAGS[tag]}<span className="print:hidden"> · {shown} of {placed.length}</span></span>
      </p>
      <div className={`mt-3 grid gap-2.5 ${wide ? "min-[760px]:grid-cols-2 min-[760px]:gap-x-6" : ""}`}>
        {placed.map(({ card, rest }, i) => (
          <div key={i} className={`min-w-0 ${rest && !all ? "hidden print:block" : ""}`}>
            <LinkCard card={card} rest={rest} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartsMeet({ links, ledgerLinks, names }: { links: PairLink[]; ledgerLinks: LedgerLink[]; names: { a: string; b: string } }) {
  const heading = useId();
  const box = useRef<HTMLElement>(null);
  const [all, setAll] = useState(false);
  // The button goes once pressed, so focus moves to the first card it opened rather than falling back to the page.
  useEffect(() => {
    if (all) box.current?.querySelector<HTMLElement>("[data-rest]")?.focus();
  }, [all]);

  const { lead, rest } = meetCards(links, ledgerLinks, names);
  const count = lead.length + rest.length;
  if (!count) return null;
  const groups = (["comes", "challenge"] as const)
    .map((tag) => ({
      tag,
      placed: [
        ...lead.filter((c) => c.tag === tag).map((card) => ({ card, rest: false })),
        ...rest.filter((c) => c.tag === tag).map((card) => ({ card, rest: true })),
      ],
    }))
    .filter((g) => g.placed.length > 0);
  const overlays = rest.filter((c) => c.tag === null);

  return (
    <section ref={box} aria-labelledby={heading} className="mt-12" data-charts-meet>
      <h3 id={heading} className="font-display text-[24px] leading-[1.15] text-[var(--paper)] sm:text-[26px] print:text-black">Where your charts meet</h3>
      <p className="mt-2 max-w-[60ch] text-[13.5px] leading-[1.55] text-[var(--paper-dim)] print:text-[#444]">{meetIntro(names)}</p>
      {groups.length > 0 && (
        <div className={`mt-6 grid gap-8 ${groups.length > 1 ? "min-[760px]:grid-cols-2 min-[760px]:gap-x-6" : ""}`}>
          {groups.map((g) => <Group key={g.tag} tag={g.tag} placed={g.placed} all={all} wide={groups.length === 1} />)}
        </div>
      )}
      {overlays.length > 0 && (
        <div className={`mt-8 gap-2.5 min-[760px]:grid-cols-2 min-[760px]:gap-x-6 ${all ? "grid" : "hidden print:grid"}`}>
          {overlays.map((card, i) => <div key={i} className="min-w-0"><LinkCard card={card} rest /></div>)}
        </div>
      )}
      {rest.length > 0 && !all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="no-print mt-6 min-h-[44px] w-full rounded-[10px] border border-dashed border-[var(--line)] px-3 py-3 font-label text-[13px] text-[var(--indigo-lt)] transition-colors hover:border-[var(--indigo-lt)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--indigo-lt)]"
        >
          Show all {count}
        </button>
      )}
    </section>
  );
}

export default LinkCard;

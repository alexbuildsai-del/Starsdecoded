/**
 * What a report is (ADR-243 to 245): right after the home page's hero, and again at the end of /sample, two pages of
 * the sample's stored run, each the report's own path in four rows: a moment, the placements behind it, the Behaviour
 * check and the thing to try. The thing to try carries the report's one tick box (ADR-172), its ticks kept in this
 * page's memory and never sent.
 */
import { useId, useState } from "react";
import { Checklist, localTicks, type TickStore } from "@/ds/organisms/Checklist";
import { WORKBOOK_CARDS, chipParts, houseTag, type WorkbookCard } from "@/site/data/differences";
import { SAMPLE } from "@/site/data/sample";

const LEDE = `Two pages from ${SAMPLE.name}'s report. Yours is written the same way, from your own chart.`;

// Each row's label takes its kind's hue: evidence the report's indigo, a thing to try the checklist's teal, and the
// card's name and its check brass, as the approved artifact draws them.
const LABEL = "font-label text-kicker font-medium uppercase leading-[1.2] tracking-[.16em]";
const ROW = "grid min-w-0 content-start gap-[7px] border-t border-line-soft px-4 pb-3.5 pt-3";
const CHIP =
  "max-w-full rounded-inner border border-indigo-lt/35 bg-indigo/12 px-2 py-[5px] font-numeric text-caption font-medium leading-[1.2] text-paper";
// The row's label names the list, so the checklist's own rule and heading stand down, the heading kept for a screen
// reader; and its item drops its own box, so no card sits inside the card.
const BARE =
  "[&>div]:mt-0 [&>div]:max-w-none [&>div]:border-t-0 [&>div]:pt-0 [&>div>span:first-child]:sr-only [&_ul]:mt-0 [&_li]:rounded-none [&_li]:border-0 [&_li]:bg-transparent [&_li]:p-0";

// The house and its word stay on one line, so a narrow phone breaks a chip after the sign rather than before "(work)".
function Chip({ label }: { label: string }) {
  const { at, house } = chipParts(label);
  return (
    <li className={CHIP}>
      {at}
      {house ? (
        <>
          {" "}
          <span className="whitespace-nowrap text-indigo-lt">{house}</span>
        </>
      ) : null}
    </li>
  );
}

function Card({ card, ticks }: { card: WorkbookCard; ticks: TickStore }) {
  const id = useId();
  // From 900 px each card takes five rows of the shared grid, so the two cards' rows line up side by side.
  return (
    <article
      aria-labelledby={id}
      className="grid min-w-0 rounded-2xl border border-line bg-surface min-[900px]:row-span-5 min-[900px]:grid-rows-subgrid"
    >
      <div className="flex items-center justify-between gap-2.5 px-4 pt-3.5">
        <h3 id={id} className="font-label text-kicker font-medium uppercase leading-[1.2] tracking-[.2em] text-brass">
          {card.name}
        </h3>
        <p className="whitespace-nowrap font-numeric text-caption leading-[1.2] text-muted">{houseTag(card.house)}</p>
      </div>
      <p className="min-w-0 px-4 pb-4 pt-2.5 font-display text-sheet-title leading-[1.3] text-pretty text-paper min-[900px]:text-sheet-title">
        <q>{card.moment}</q>
      </p>
      <div className={ROW}>
        <p className={`${LABEL} text-indigo-lt`}>In her chart</p>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {card.chips.map((label) => (
            <Chip key={label} label={label} />
          ))}
        </ul>
        <p className="text-small leading-[1.5] text-paper-dim">{card.plain}</p>
      </div>
      <div className={ROW}>
        <p className={`${LABEL} text-brass`}>Does this sound like you?</p>
        <p className="font-display text-card-title-sm italic leading-[1.4] text-paper">{card.check}</p>
      </div>
      <div className={ROW}>
        <p className={`${LABEL} text-teal`}>Something to try</p>
        <div className={BARE}>
          <Checklist heading="Practice" items={[card.action]} store={ticks} />
        </div>
      </div>
    </article>
  );
}

/** Void at both edges, the dark the hero's ground fades to and Claims starts on, so neither meets a lighter band. */
export default function Differences() {
  const id = useId();
  const [ticks] = useState(localTicks);
  return (
    <section
      aria-labelledby={id}
      className="relative bg-[linear-gradient(180deg,var(--void)_0%,var(--bg)_22%,var(--bg)_78%,var(--void)_100%)] py-[64px] min-[900px]:py-[96px]"
    >
      <div className="sd-wrap grid gap-3.5">
        <p className="sd-eyebrow">Your report</p>
        <h2 id={id} className="sd-h2 max-w-[18ch] text-page-title min-[900px]:text-hero">
          A personality report, not a horoscope
        </h2>
        <p className="max-w-[40em] font-display text-prose leading-[1.5] text-pretty text-paper-dim min-[900px]:text-lede">{LEDE}</p>
        {/* Stacked, a card is no wider than one of the pair on a desktop, so a tablet's lines read as long as a desktop's. */}
        <div className="grid min-w-0 max-w-[560px] gap-3.5 min-[900px]:mt-3.5 min-[900px]:max-w-none min-[900px]:grid-cols-2 min-[900px]:grid-rows-[repeat(5,auto)] min-[900px]:gap-x-5 min-[900px]:gap-y-0">
          {WORKBOOK_CARDS.map((card) => (
            <Card key={card.house} card={card} ticks={ticks} />
          ))}
        </div>
      </div>
    </section>
  );
}

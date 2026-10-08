/**
 * Four things to know, once, before the first house card (ADR-380, 399), so a card never has to stop and explain why
 * it names a planet that isn't in the house. The words are the explain-like-a-friend artifact's; the table reads the
 * engine's COMFORT, the one table the brief and the cards read too, so no copy of it lives here.
 */
import { COMFORT, type ComfortPlanet } from "@workspace/engine";
import { PLANET_LABELS } from "@/types/chart";

const ORDER: readonly ComfortPlanet[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];

const ROW = "grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[color:var(--line-soft)] py-3 md:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.7fr)] md:gap-y-0 print:border-neutral-300";

function Idea({ n, title, children }: { n: number; title: string; children: string }) {
  return (
    <li className="grid content-start gap-1.5 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-3.5 print:break-inside-avoid print:border-neutral-300 print:bg-transparent">
      <p className="font-mono text-[11px] font-medium text-brass">{n}</p>
      <p className="font-label text-[14px] font-semibold leading-snug text-[color:var(--paper)] print:text-black">{title}</p>
      <p className="font-display text-[15.5px] italic leading-[1.45] text-[color:var(--paper-dim)] print:text-black">{children}</p>
    </li>
  );
}

function Cell({ label, children }: { label: string; children: string }) {
  return (
    <div role="cell" className="min-w-0">
      <span className="block font-label text-[10px] font-medium uppercase tracking-[.12em] text-[color:var(--paper-dim)] md:hidden print:text-black">{label}</span>
      <span className="text-[14px] leading-[1.45] text-[color:var(--paper)] print:text-black">{children}</span>
    </div>
  );
}

/** ascendantSign is the reader's rising sign; the deck only shows a primer for a chart that has one. */
export function HousePrimer({ ascendantSign }: { ascendantSign: string }) {
  return (
    <section aria-labelledby="house-primer" className="mb-6 grid gap-4 print:break-inside-avoid">
      <h3 id="house-primer" className="font-display text-[22px] font-normal leading-[1.15] text-[color:var(--paper)] print:text-black">
        Before House by House: four things to know
      </h3>
      <ol className="grid list-none gap-2.5 p-0 sm:grid-cols-2 xl:grid-cols-4">
        <Idea n={1} title="Your houses start at your rising sign">
          {`The sign rising when you were born is your 1st house. For you, that's ${ascendantSign}. The next sign is your 2nd, and so on round the circle.`}
        </Idea>
        <Idea n={2} title="Each house is one part of life">
          Money, home, work, love, friends. Twelve parts, twelve houses.
        </Idea>
        <Idea n={3} title="Every house has a planet in charge">
          Even an empty one. Where that planet sits is where that part of life plays out.
        </Idea>
        <Idea n={4} title="Every planet has a home sign">
          At home, it works with ease. In the opposite sign, it's least at ease, like a guest in a house they can't stand.
        </Idea>
      </ol>
      <div>
        <h4 className="font-label text-[12px] font-medium uppercase tracking-[.12em] text-[color:var(--accent)] print:text-black">The cool fact, in one table</h4>
        <div role="table" aria-labelledby="house-primer" className="mt-2">
          <div role="row" className={`${ROW} border-t-0 max-md:sr-only py-1.5 font-label text-[10px] font-medium uppercase tracking-[.12em] text-[color:var(--paper-dim)]`}>
            <span role="columnheader">Planet</span>
            <span role="columnheader">At home in</span>
            <span role="columnheader">Least at ease in</span>
            <span role="columnheader">Why, in one line</span>
          </div>
          {ORDER.map((p) => (
            <div role="row" key={p} className={ROW}>
              <div role="rowheader" className="col-span-2 font-label text-[14px] font-semibold text-[color:var(--paper)] md:col-span-1 print:text-black">{PLANET_LABELS[p]}</div>
              <Cell label="At home in">{COMFORT[p].home.join(", ")}</Cell>
              <Cell label="Least at ease in">{COMFORT[p].leastAtEase.join(", ")}</Cell>
              <div role="cell" className="col-span-2 min-w-0 text-[13.5px] leading-[1.45] text-[color:var(--paper-dim)] md:col-span-1 print:text-black">{COMFORT[p].why}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HousePrimer;

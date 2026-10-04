/**
 * The compatibility report's lens and practice blocks (ADR-63, ADR-64,
 * ADR-176); chapter 01 is TwoChartsLedger. A lens chapter reads in story
 * order: the side-by-side card headed Going in, its one scene under its
 * title, what just happened opening on the pair line with the two
 * because-kickers, the pattern, and next time through the one checklist,
 * whose items pin; chapter 07 is three checklists that write to the
 * workbook, then a closing paragraph. Nothing here draws a number, a rating
 * or a bar.
 */
import { CitedText, newCitationCounter } from "@/components/report/Citation";
import { Checklist, type ChecklistHeading, type ChecklistItem } from "@/components/report/Checklist";
import { fromPersonalReport } from "@/lib/product";
import { itemKey } from "@/lib/workbook";
import type { PairChecklist, PairLensChapter, PairPractise } from "@/types/chart";

export interface PairNames { a: string; b: string }

export const first = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

/** The kicker over a person's own lines: their first name, and where the words come from (ADR-61). */
export function personKicker(name: string): string {
  return fromPersonalReport(first(name));
}

/** Chapter 02's introduction, under its title (ADR-103): what each chapter from here holds, one scene each (ADR-176). */
export function ScenesIntro() {
  return (
    <p className="rp-lede" data-scenes-intro>
      Each chapter from here shows one everyday moment between you: how it tends to go, what is behind it, and one thing to try next time.
    </p>
  );
}

/** The side-by-side card, headed Going in: three lines a side in each person's own words; the pair line opens What just happened. */
function SideBySide({ card, names }: { card: PairLensChapter["card"]; names: PairNames }) {
  return (
    <div className="rp-box" data-side-by-side>
      <span className="rp-lab">Going in</span>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {([["a", names.a, card.a], ["b", names.b, card.b]] as const).map(([side, name, lines]) => (
          <div key={side} className="min-w-0">
            <span className="rp-kicker">{personKicker(name)}</span>
            <ul className="mt-2 grid gap-1.5">
              {lines.map((line, i) => <li key={i} className="text-[14.5px] leading-[1.55]">{line}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function nextTimeItems(chapter: string, items: PairLensChapter["nextTime"]["items"], names: PairNames): ChecklistItem[] {
  const who = (f: "A" | "B" | "both") => (f === "A" ? first(names.a) : f === "B" ? first(names.b) : "Both");
  return items.map((it, i) => ({ key: itemKey(chapter, "nextTime.items", i), action: `${who(it.for)}: ${it.action}`, why: it.why }));
}

/** A lens chapter, chapters 02 to 06 (ADR-63, ADR-64, ADR-176). */
export function LensChapterBlock({ s, names, chapter, sceneTitle }: {
  s: PairLensChapter; names: PairNames; chapter: string; sceneTitle: string | null;
}) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <SideBySide card={s.card} names={names} />
      <div className="rp-lblk" data-scene>
        <span className="rp-lab">{sceneTitle ? `The scene · ${sceneTitle}` : "The scene"}</span>
        <p className="whitespace-pre-line">{s.scene}</p>
      </div>
      <div className="rp-lblk">
        <span className="rp-lab">What just happened</span>
        <p className="font-display text-[17px] leading-[1.4] text-[var(--paper)]" data-pair-line>{s.card.pair}</p>
        <div className="mt-3 grid gap-3">
          <div>
            <span className="rp-kicker">{first(names.a)} · because</span>
            <p>{CitedText({ text: s.whatJustHappened.becauseA, claims: s.claims, counter: k })}</p>
          </div>
          <div>
            <span className="rp-kicker">{first(names.b)} · because</span>
            <p>{CitedText({ text: s.whatJustHappened.becauseB, claims: s.claims, counter: k })}</p>
          </div>
        </div>
      </div>
      <div className="rp-lblk">
        <span className="rp-lab">What's behind it</span>
        <p>{CitedText({ text: s.pattern, claims: s.claims, counter: k })}</p>
      </div>
      <Checklist heading="Next time" items={nextTimeItems(chapter, s.nextTime.items, names)} pinnable />
    </div>
  );
}

function items(section: string, path: string, list: PairChecklist): ChecklistItem[] {
  return list.items.map((a, i) => ({ key: itemKey(section, path, i), action: a.action, why: a.why }));
}

/** Chapter 07: the opening, three checklists headed For you, For them, For both, and the closing paragraph (ADR-40). */
export function PractiseBlock({ s, names }: { s: PairPractise; names: PairNames }) {
  const k = newCitationCounter();
  const lists: Array<{ heading: ChecklistHeading; path: string; list: PairChecklist; who: string }> = [
    { heading: "For you", path: "forA", list: s.forA, who: names.a },
    { heading: "For them", path: "forB", list: s.forB, who: names.b },
    { heading: "For both", path: "forBoth", list: s.forBoth, who: "Both" },
  ];
  return (
    <div className="rp-prose">
      <p>{CitedText({ text: s.opening, claims: s.claims, counter: k })}</p>
      {lists.map((l) => (
        <div key={l.path} className="rp-lblk">
          <span className="rp-lab">{l.who}</span>
          <p>{CitedText({ text: l.list.intro, claims: s.claims, counter: k })}</p>
          <Checklist heading={l.heading} items={items("whatToPractise", l.path, l.list)} />
        </div>
      ))}
      <p className="rp-pull">{CitedText({ text: s.closing, claims: s.claims, counter: k })}</p>
    </div>
  );
}

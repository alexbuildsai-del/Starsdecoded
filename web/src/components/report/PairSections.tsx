/**
 * The compatibility report's lens and practice blocks (ADR-63, ADR-64,
 * ADR-103); chapter 01 is TwoChartsLedger. A lens chapter reads in story
 * order: the side-by-side card headed Going in, the scene introduced with
 * its chip row, what just happened opening on the pair line with the two
 * because-kickers, the pattern, and next time through the one checklist;
 * chapter 07 is three checklists that write to the workbook, then a closing
 * paragraph. Nothing here draws a number, a rating or a bar.
 */
import { CitedText, newCitationCounter } from "@/components/report/Citation";
import { Checklist, type ChecklistHeading, type ChecklistItem } from "@/components/report/Checklist";
import { SceneChips, SceneIntro } from "@/components/report/SceneChips";
import { fromPersonalReport } from "@/lib/product";
import { itemKey } from "@/lib/workbook";
import type { PairChapterScenes, PairChecklist, PairLensChapter, PairPractise } from "@/types/chart";

export interface PairNames { a: string; b: string }

export const first = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

/** The kicker over a person's own lines: their first name, and where the words come from (ADR-61). */
export function personKicker(name: string): string {
  return fromPersonalReport(first(name));
}

/** Chapter 02's introduction, under its title (ADR-103): what follows, and that two more scenes wait; print drops the second sentence. */
export function ScenesIntro() {
  return (
    <p className="rp-lede" data-scenes-intro>
      From here, each chapter plays out one scene between you: how it tends to go, what was going on under it, and one thing to try next time.
      <span className="print:hidden"> Two more scenes wait under each one.</span>
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

/** A lens chapter, chapters 02 to 06 (ADR-63, ADR-64, ADR-65). */
export function LensChapterBlock({ s, names, chapter, scenes, reportId }: {
  s: PairLensChapter; names: PairNames; chapter: string; scenes?: PairChapterScenes; reportId: string;
}) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <SideBySide card={s.card} names={names} />
      {scenes
        ? <SceneChips reportId={reportId} chapter={chapter} scenes={scenes} written={s.scene} />
        : <div className="rp-lblk"><span className="rp-lab">The scene</span><SceneIntro /><p className="whitespace-pre-line">{s.scene}</p></div>}
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
        <span className="rp-lab">The pattern under it</span>
        <p>{CitedText({ text: s.pattern, claims: s.claims, counter: k })}</p>
      </div>
      <Checklist heading="Next time" items={nextTimeItems(chapter, s.nextTime.items, names)} />
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

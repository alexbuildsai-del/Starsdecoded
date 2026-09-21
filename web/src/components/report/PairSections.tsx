/**
 * The compatibility report's blocks (ADR-63, ADR-64): chapter 01 is the
 * verdict, three strong lines, three work lines, the paradox, the strengths
 * card and one pointer; a lens chapter is the workbook, the side-by-side
 * card, the scene with its chip row, what just happened with the two
 * because-kickers, the pattern, and next time through the one checklist;
 * chapter 07 is three checklists that write to the workbook, then a closing
 * paragraph. Nothing here draws a number, a rating or a bar.
 */
import { CitedText, newCitationCounter, type CitationCounter } from "@/components/report/Citation";
import { Checklist, type ChecklistHeading, type ChecklistItem } from "@/components/report/Checklist";
import { SceneChips } from "@/components/report/SceneChips";
import { itemKey } from "@/lib/workbook";
import type { Claim, PairChapterScenes, PairChecklist, PairLensChapter, PairPractise, PairTwoCharts } from "@/types/chart";

export interface PairNames { a: string; b: string }

export const first = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

/** The kicker over a person's own lines: their first name, and where the words come from (ADR-61). */
export function personKicker(name: string): string {
  return `${first(name)} · from personal report`;
}

function Lines({ lines, claims, counter }: { lines: string[]; claims?: Claim[]; counter: CitationCounter }) {
  return (
    <ul className="mt-2 grid gap-2">
      {lines.map((line, i) => (
        <li key={i} className="relative pl-4 before:absolute before:left-0.5 before:text-[var(--accent)] before:content-['·']">
          {CitedText({ text: line, claims, counter })}
        </li>
      ))}
    </ul>
  );
}

/** The pair's three strengths as one card, both names on it; the share card draws from the same lines (ADR-71). */
export function StrengthsCard({ lines, names }: { lines: string[]; names: PairNames }) {
  return (
    <div className="rp-box" data-strengths-card>
      <span className="rp-lab">{first(names.a)} and {first(names.b)} · your three strengths as a pair</span>
      <ul className="mt-2 grid gap-2">
        {lines.map((line, i) => (
          <li key={i} className="font-display text-[17px] leading-snug text-[var(--paper)]">{line}</li>
        ))}
      </ul>
    </div>
  );
}

/** Chapter 01 under the wheel and its cards: the introduction (ADR-63). */
export function TwoChartsBlock({ s, names }: { s: PairTwoCharts; names: PairNames }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      <div className="rp-lblk">
        <span className="rp-lab">What is naturally strong between you</span>
        <Lines lines={s.strong} claims={s.claims} counter={k} />
      </div>
      <div className="rp-lblk">
        <span className="rp-lab">What will take work</span>
        <Lines lines={s.work} claims={s.claims} counter={k} />
      </div>
      <div className="rp-lblk">
        <span className="rp-lab">The paradox</span>
        <p>{CitedText({ text: s.paradox, claims: s.claims, counter: k })}</p>
      </div>
      <StrengthsCard lines={s.strengths} names={names} />
      <p className="rp-pull">{CitedText({ text: s.pointer, claims: s.claims, counter: k })}</p>
    </div>
  );
}

/** The side-by-side card: three lines a side in each person's own words, one for the pair. */
function SideBySide({ card, names }: { card: PairLensChapter["card"]; names: PairNames }) {
  return (
    <div className="rp-box grid gap-4 sm:grid-cols-2" data-side-by-side>
      {([["a", names.a, card.a], ["b", names.b, card.b]] as const).map(([side, name, lines]) => (
        <div key={side} className="min-w-0">
          <span className="rp-lab">{personKicker(name)}</span>
          <ul className="mt-2 grid gap-1.5">
            {lines.map((line, i) => <li key={i} className="text-[14.5px] leading-[1.55]">{line}</li>)}
          </ul>
        </div>
      ))}
      <p className="sm:col-span-2 border-t border-[var(--line-soft)] pt-3 font-display text-[16px] text-[var(--paper)]">{card.pair}</p>
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
        : <div className="rp-lblk"><span className="rp-lab">The scene</span><p className="whitespace-pre-line">{s.scene}</p></div>}
      <div className="rp-lblk">
        <span className="rp-lab">What just happened</span>
        <div className="mt-2 grid gap-3">
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

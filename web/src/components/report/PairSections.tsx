/**
 * The compatibility report's blocks (ADR-39, ADR-41): a chapter is a headline
 * and passages, each tagged natal, read from one of the two stored reports
 * with its citation carried over, or new, written for the pair; chapter 09
 * is three checklists that write to the workbook, then a closing paragraph.
 * Nothing here draws a number, a rating or a bar.
 */
import { CitedText, newCitationCounter, type CitationCounter } from "@/components/report/Citation";
import { Checklist, type ChecklistHeading, type ChecklistItem } from "@/components/report/Checklist";
import { itemKey } from "@/lib/workbook";
import type { Claim, PairChapter, PairChecklist, PairPassage, PairPractise } from "@/types/chart";

export interface PairNames { a: string; b: string }

/** Who a passage is about, as its kicker: the person's name, "Both", or nothing for a new bridging paragraph. */
export function passageKicker(p: PairPassage, names: PairNames): string | null {
  if (p.source === "natal") {
    const who = p.of === "A" ? names.a : p.of === "B" ? names.b : "Both";
    return `${who} · from the natal report`;
  }
  return p.of === "both" ? "Both" : p.of === "A" ? names.a : p.of === "B" ? names.b : null;
}

function Passage({ p, names, claims, counter }: { p: PairPassage; names: PairNames; claims?: Claim[]; counter: CitationCounter }) {
  const kicker = passageKicker(p, names);
  return (
    <div className={kicker ? "rp-lblk" : "mt-[15px] max-w-[64ch]"} data-source={p.source}>
      {kicker && <span className="rp-lab">{kicker}</span>}
      <p>{CitedText({ text: p.text, claims, counter })}</p>
    </div>
  );
}

export function PairChapterBlock({ s, names }: { s: PairChapter; names: PairNames }) {
  const k = newCitationCounter();
  return (
    <div className="rp-prose">
      {s.passages.map((p, i) => <Passage key={i} p={p} names={names} claims={s.claims} counter={k} />)}
    </div>
  );
}

function items(section: string, path: string, list: PairChecklist): ChecklistItem[] {
  return list.items.map((a, i) => ({ key: itemKey(section, path, i), action: a.action, why: a.why }));
}

/** Chapter 09: the opening, three checklists headed For you, For them, For both, and the closing paragraph (ADR-40). */
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
      <p className="rp-pull">{s.closing}</p>
    </div>
  );
}

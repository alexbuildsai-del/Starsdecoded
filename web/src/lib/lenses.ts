/**
 * The three lenses of the compatibility report (ADR-40), as pure data: what
 * each is called, what it sets, and the one question parent and child asks.
 */
import type { Lens } from "@/types/chart";

export interface LensInfo {
  lens: Lens;
  title: string;
  strapline: string;
  /** Chapters 07 and 08 under this lens. */
  chapterSeven: string;
  chapterEight: string;
  /** The example register the report writes in. */
  register: string;
  /** Asymmetric: the picker asks who the parent is. */
  asksParent: boolean;
  /** The two roles, in position order, or the symmetric pair. */
  roles: [string, string];
}

export const LENSES: readonly LensInfo[] = [
  {
    lens: "partners",
    title: "Partners",
    strapline: "How compatible you are, and why.",
    chapterSeven: "Love and closeness",
    chapterEight: "Building a life",
    register: "a weekend, a bill, an argument at 11 pm, a move",
    asksParent: false,
    roles: ["primary", "secondary"],
  },
  {
    lens: "parent_child",
    title: "Parent and child",
    strapline: "What this child needs, and how you meet it.",
    chapterSeven: "What this child needs",
    chapterEight: "How you parent them",
    register: "bedtime, homework, a tantrum, praise, a first heartbreak",
    asksParent: true,
    roles: ["parent", "child"],
  },
  {
    lens: "people",
    title: "Two people",
    strapline: "Being family, and the conversation nobody starts.",
    chapterSeven: "Being family",
    chapterEight: "Gatherings, gifts and hard talks",
    register: "a dinner, a gift, the group chat, a shared care duty, the conversation nobody starts",
    asksParent: false,
    roles: ["primary", "secondary"],
  },
];

export function lensInfo(lens: Lens): LensInfo {
  return LENSES.find((l) => l.lens === lens) ?? LENSES[0];
}

export const PARENT_QUESTION = "Who is the parent?";

/** The nine chapter titles under a lens, in order. */
export const PAIR_CHAPTER_TITLES = (lens: Lens): string[] => {
  const info = lensInfo(lens);
  return [
    "How you meet", "The two charts", "Two ways of being", "Where it flows", "Where it rubs", "How you talk",
    info.chapterSeven, info.chapterEight, "What to practise",
  ];
};

/** The tile, tab and PDF name (ADR-39). */
export function pairTitle(a: string, b: string): string {
  return `${a} & ${b}`;
}

export function pairTabTitle(a: string, b: string): string {
  return `${pairTitle(a, b)} · Compatibility Report · Stars Decoded`;
}

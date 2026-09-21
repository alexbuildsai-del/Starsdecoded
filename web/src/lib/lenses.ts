/**
 * The three lenses of the compatibility report (ADR-40, ADR-68), as pure
 * data: what each is called, what it sets, the one question parent and child
 * asks, the one question two people asks, and the seven chapter titles under
 * each (ADR-63).
 */
import type { Lens } from "@/types/chart";

export interface LensInfo {
  lens: Lens;
  title: string;
  strapline: string;
  /** The marketing door: who this lens is for, in a few words. */
  door: string;
  /** The example register the report writes in. */
  register: string;
  /** Asymmetric: the picker asks who the parent is. */
  asksParent: boolean;
  /** The picker asks how the two know each other; the answer is the free label. */
  asksHow: boolean;
  /** The two roles, in position order, or the symmetric pair. */
  roles: [string, string];
  /** Chapters 02 to 06 under this lens. */
  chapters: [string, string, string, string, string];
}

export const LENSES: readonly LensInfo[] = [
  {
    lens: "partners",
    title: "Partners",
    strapline: "How you love, fight, live and rest together, and what you are building.",
    door: "Couples",
    register: "the end of a long day, a bill, an argument at 11 pm, Friday with no plan, a move",
    asksParent: false,
    asksHow: false,
    roles: ["primary", "secondary"],
    chapters: ["How you love", "How you fight and repair", "Home, chores and money", "Fun, weekends and holidays", "What you are building"],
  },
  {
    lens: "parent_child",
    title: "Parent and child",
    strapline: "What your child needs from you at this age, and how you meet it.",
    door: "A parent and a child",
    register: "bedtime, the morning rush, homework at the kitchen table, the tablet, the Sunday call",
    asksParent: true,
    asksHow: false,
    roles: ["parent", "child"],
    chapters: ["What your child needs from you", "Feelings and the big reactions", "Home, chores and contributing", "School, homework and how they learn", "Rules, freedom and screens"],
  },
  {
    lens: "people",
    title: "Two people",
    strapline: "In a room, on a job, having fun, in the hard talk, and what you give each other.",
    door: "Friends, family, colleagues",
    register: "the big dinner, the meeting where one goes quiet, the weekend away, the group chat, the favour too big to ask",
    asksParent: false,
    asksHow: true,
    roles: ["primary", "secondary"],
    chapters: ["In a room together", "Working on something together", "Having fun", "The hard talk", "What you give each other"],
  },
];

export function lensInfo(lens: Lens): LensInfo {
  return LENSES.find((l) => l.lens === lens) ?? LENSES[0];
}

export const PARENT_QUESTION = "Who is the parent?";

/** Two people's one question; the answer goes into the free label and picks a scene and a few words of register (ADR-68). */
export const HOW_QUESTION = "How do you know each other?";
export const HOW_OPTIONS = ["family", "friends", "colleagues"] as const;
export type HowKnown = (typeof HOW_OPTIONS)[number];

/** The seven chapter titles under a lens, in order: the two charts, the lens's five, the practice. */
export const PAIR_CHAPTER_TITLES = (lens: Lens): string[] => ["Your two charts", ...lensInfo(lens).chapters, "What to practise"];

/** The tile, tab and PDF name (ADR-39). */
export function pairTitle(a: string, b: string): string {
  return `${a} & ${b}`;
}

export function pairTabTitle(a: string, b: string): string {
  return `${pairTitle(a, b)} · Compatibility Report · Stars Decoded`;
}

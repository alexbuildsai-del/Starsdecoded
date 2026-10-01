/**
 * What each chapter of the Personal report tells its reader, for the home
 * page's Inside (ADR-111): one sentence written from the chapter's own prompt,
 * and the parts it covers in the order the chapter prints them. The names and
 * their order stay in `CHAPTERS`, so a chapter is still named once. No word
 * count, here or on the page: the report promises none (ADR-111).
 */
import { CHAPTERS, type ChapterSection } from "@/lib/chapters";

export interface ChapterGlimpse {
  line: string;
  parts: readonly string[];
}

export const INSIDE: Record<ChapterSection, ChapterGlimpse> = {
  overview: {
    line: "The big picture and what stands out in your chart",
    parts: ["Headline", "What makes it unusual", "Where it all points"],
  },
  houses: {
    line: "A short read of each of your twelve houses, and where the weight of your chart sits",
    parts: ["Twelve houses", "Where the weight sits", "How you run"],
  },
  mind: {
    line: "How you think, how you make decisions and why people sometimes get you wrong",
    parts: ["How you think", "How you decide", "How you are understood", "A practice"],
  },
  career: {
    line: "The kind of work that suits you, how you come across at work and where you can grow",
    parts: ["Vocational pull", "How you show up", "Growth through work", "Career paths"],
  },
  money: {
    line: "How you earn, spend and share money",
    parts: ["Your relationship to resources", "What works", "Shared money"],
  },
  relationships: {
    line: "How you love, what keeps going wrong and who suits you",
    parts: ["How you love", "The challenge", "What partnership asks", "You connect best with"],
  },
  family: {
    line: "What you took from the family you grew up in and what you want to do differently",
    parts: ["What you carry", "What roots you", "The inherited edge"],
  },
  superpowers: {
    line: "What you're naturally good at, the habit you'll always have to manage and where you can grow",
    parts: ["Your superpower", "The pattern you will always navigate", "Your growing edge"],
  },
  discoveries: {
    line: "The parts of you that pull in different directions and how to live with both",
    parts: ["Two or three paradoxes", "A way through each"],
  },
  focus: {
    line: "What to do more of, what to watch for and what to try next",
    parts: ["Lean into", "Notice", "Practice", "Closing"],
  },
};

// Keyed by the registry's own length, so adding or dropping a chapter stops the build here until the section's sentence is said again.
const IN_WORDS: Record<typeof CHAPTERS.length, string> = { 10: "ten" };

/** How many chapters the report has, as the section's sentence says it. */
export const CHAPTER_COUNT = IN_WORDS[CHAPTERS.length];

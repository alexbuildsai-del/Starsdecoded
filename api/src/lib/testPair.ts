/**
 * Test-only: canned, schema-valid compatibility replies built from a real
 * pair brief, shared by the pipeline and the scene tests. Every link goes to
 * chapter 1 or a lens chapter, and each chapter cites its own.
 */
import { pairChapterIds } from "../prompts/pair/index.js";
import { linkList } from "../prompts/pair/sections/links.js";
import type { PairBrief } from "./pairBrief.js";

const SENTENCE = "You both decide late and then all at once, and the weekend gets planned twice.";
const reading = (bodies: string) => `${bodies} meet in the small hours, when one wants the talk finished and the other wants it opened. The weekend plan gets made twice, once out loud and once in private, and the private one wins. Behaviour check: notice who books the table this week.`;

export function pairReplies(brief: PairBrief): Record<string, unknown> {
  const sourceA = { kind: "source", report: "A", section: "overview", claim: 1 };
  const sourceB = { kind: "source", report: "B", section: "relationships", claim: 1 };
  const crossRef = (i: number) => {
    const c = brief.cross[i];
    return { kind: "cross", planetA: c.planetA, planetB: c.planetB, aspect: c.type, orb: c.orb };
  };
  // Link i (0-based) goes to lens chapter 2 + i % 5; the first three also to chapter 1.
  const owners = brief.links.map((l, i) => ({ link: l.n, chapters: i < 3 ? [1, 2 + (i % 5)] : [2 + (i % 5)] }));
  const claimsFor = (crossIndex: number) => [
    { quote: SENTENCE, evidence: [crossRef(crossIndex)] },
    { quote: "You investigate first and commit second.", evidence: [sourceA] },
    { quote: "You leave the room a minute before you are asked to.", evidence: [sourceB] },
  ];
  const item = (who: "A" | "B" | "both") => ({ for: who, action: "Plan the weekend once, out loud, on Thursday.", why: "so nobody plans it twice in private" });
  const lensChapter = (n: number) => ({
    headline: SENTENCE,
    card: {
      a: ["Marie investigates first and commits second.", "Marie keeps going after the room gives up.", "Marie decides late, then all at once."],
      b: ["Oprah leaves the room a minute early.", "Oprah says the thing out loud first.", "Oprah plans the weekend twice."],
      pair: "You both plan it twice and the private one wins.",
    },
    scene: "Marie comes in late and says nothing. Oprah has the plan on the table already. \"We said Thursday,\" Oprah says. Marie nods, and reads it twice.",
    whatJustHappened: { becauseA: "You investigate first and commit second.", becauseB: "You leave the room a minute before you are asked to." },
    pattern: `${SENTENCE} This is where it flows.`,
    nextTime: { items: [item("A"), item("B"), item("both")] },
    claims: claimsFor(n - 2),
  });
  const checklist = (intro: string) => ({ intro, items: [item("A"), item("A"), item("A")].map(({ action, why }) => ({ action, why })) });
  const links = linkList(brief).map((l) => {
    const m = l.match(/^overlay: (A|B) (\w[\w ]*) in (A|B)'s (\d+)/);
    if (m) {
      const body = m[2].toLowerCase().replace(" ", "_");
      return { kind: "overlay", planetA: "", planetB: "", aspect: "", orb: 0, planet: body, of: m[1], house: Number(m[4]), reading: reading(`Your ${m[2]} and the house it lands in`) };
    }
    const a = l.match(/^aspect: A (\w[\w ]*) (\w+) B (\w[\w ]*) \(orb ([\d.]+)\)/)!;
    const flows = ["trine", "sextile", "conjunction"].includes(a[2]);
    return { kind: flows ? "flows" : "rubs", planetA: a[1].toLowerCase().replace(" ", "_"), planetB: a[3].toLowerCase().replace(" ", "_"), aspect: a[2], orb: Number(a[4]), planet: "", of: "none", house: 0, reading: reading("Your two") };
  });
  const chapterIds = pairChapterIds(brief.lens);
  return {
    pair_foundation: {
      pairThesis: "Two slow deciders who move fast once decided.",
      strongestLinks: [1, 2, 3].map((k) => ({ link: k, why: "one needs quiet and the other fills it" })),
      frictionThatMatters: "The plan made twice.",
      strengths: ["Marie finishes what Oprah starts.", "Oprah says the thing out loud first.", "Neither of you leaves a room angry."],
      owners,
      scenes: [2, 3, 4, 5, 6].map((chapter) => ({ chapter, index: chapter % 3 })),
      guidance: chapterIds.map(() => "one thing"),
    },
    pair_twoCharts: {
      headline: SENTENCE,
      strong: [SENTENCE, SENTENCE, SENTENCE],
      work: [SENTENCE, SENTENCE, SENTENCE],
      paradox: "You investigate first and commit second.",
      strengths: ["Marie finishes what Oprah starts.", "Oprah says the thing out loud first.", "Neither of you leaves a room angry."],
      pointer: "You leave the room a minute before you are asked to.",
      claims: [{ quote: SENTENCE, evidence: [crossRef(0)] }, { quote: SENTENCE, evidence: [crossRef(1)] }, { quote: SENTENCE, evidence: [crossRef(2)] }, { quote: "You investigate first and commit second.", evidence: [sourceA] }],
    },
    ...Object.fromEntries([2, 3, 4, 5, 6].map((n) => [`pair_${chapterIds[n - 1]}`, lensChapter(n)])),
    pair_whatToPractise: {
      opening: `${SENTENCE} You investigate first and commit second.`,
      forA: checklist("Marie, three things."), forB: checklist("Oprah, three things."), forBoth: checklist("Both of you."),
      closing: "You leave the room a minute before you are asked to.",
      claims: claimsFor(0),
    },
    pair_links: { links },
  };
}


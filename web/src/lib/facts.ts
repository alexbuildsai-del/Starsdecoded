/**
 * The facts log (Review 05/10 §9, ADR-317): every "why is it like this?" the Owner asked, in the words the Did you know
 * card shows under a loading screen. A new question is a new entry here and nothing else. The titles finish the card's
 * "Did you know", so each ends on its question mark; the sentences are two or three, plain and one idea each.
 */

export interface Fact {
  id: "retrograde" | "stellium" | "east-left" | "house-sign" | "saturn-return";
  title: string;
  sentences: readonly string[];
  /** Where the Owner asked, so the log keeps its own history. */
  askedIn: string;
  /** Which small copy of a drawing the product already makes the card shows beside the words. */
  drawing: "dial-retrograde" | "sign-stellium" | "hero-east" | "wheel-house" | "age-ring";
  /**
   * True when the drawing is read off the horizon (the east, the houses), so a chart with no birth time cannot show it.
   * The retrograde loop, a Saturn return and a stellium by sign need none.
   */
  needsHorizon: boolean;
}

export const FACTS: readonly Fact[] = [
  {
    id: "retrograde",
    title: "Planets can look like they go backwards?",
    sentences: [
      "They don't really.",
      "Earth and the planet pass each other on their way round the Sun, and that makes the planet seem to slide back for weeks or months.",
      "This is called retrograde, and your chart marks it R.",
    ],
    askedIn: "Review 05/10, note 11",
    drawing: "dial-retrograde",
    needsHorizon: false,
  },
  {
    id: "stellium",
    title: "What's a stellium?",
    sentences: [
      "When three or more planets and points, like the North Node, sit in one sign, astrologers call it a stellium.",
      "That part of life gets a lot of your attention.",
      "To balance it, people look to the opposite house.",
    ],
    askedIn: "Review 08/10, note 7",
    drawing: "sign-stellium",
    needsHorizon: false,
  },
  {
    id: "east-left",
    title: "Why east is on the left?",
    sentences: [
      "Your chart is drawn as if you face south, the way old sky maps were.",
      "So the east, where the Sun rises, is on your left.",
      "Your rising sign sits there.",
    ],
    askedIn: "Review 05/10, round 3",
    drawing: "hero-east",
    needsHorizon: true,
  },
  {
    id: "house-sign",
    title: "Each house starts in a sign?",
    sentences: [
      "That sign's own planet speaks for the house, even when it sits somewhere else in your chart.",
      "That's why a house with no planets still says something about you.",
    ],
    askedIn: "Review 05/10, note 18",
    drawing: "wheel-house",
    needsHorizon: true,
  },
  {
    id: "saturn-return",
    title: "Saturn comes back every 29½ years?",
    sentences: [
      "A cycle's ages come from how long the planet takes to go round.",
      "So Saturn's returns come at about 29, 58 and 88.",
    ],
    askedIn: "Review 05/10, note 7",
    drawing: "age-ring",
    needsHorizon: false,
  },
];

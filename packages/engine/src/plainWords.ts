/**
 * Timeline's plain words live in the engine so the page's prerender and the
 * API read one table and never word the same sky two ways (reading 9,
 * ADR-256, 257). A headline says what a stretch feels like and names no
 * aspect: the tone printed beside it carries the aspect's feel, so a planet
 * on a point has one line. Retrogrades and eclipses touch no point, so their
 * lines come from the house they fall in. No line holds a date, a forecast
 * or something to do (R-5.2); the astronomy waits in the facts line.
 */
import type { CycleId } from "./cycles.js";
import type { Aspect, ContactEvent, EclipseEvent, NatalTarget, RetrogradeEvent } from "./doctrine.js";

type Mover = ContactEvent["body"];
type House = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
interface HouseLines { none: string; in: Record<House, string> }

const HEADLINES: Record<Mover, Record<NatalTarget, string>> = {
  mars: {
    sun: "Feeling bolder",
    moon: "Short-fuse days",
    mercury: "Words come out sharper",
    venus: "Feeling more passionate",
    mars: "Impatient to get going",
    jupiter: "A burst of energy",
    saturn: "Wanting to act, feeling held back",
    ascendant: "Coming across more strongly",
    midheaven: "More drive at work",
  },
  jupiter: {
    sun: "Feeling good about yourself",
    moon: "Big feelings",
    mercury: "Big ideas",
    venus: "Warmth in love and money",
    mars: "More courage to act",
    jupiter: "More room to grow",
    saturn: "Duties feel lighter",
    ascendant: "More open and outgoing",
    midheaven: "Growth at work",
  },
  saturn: {
    sun: "More responsibility",
    moon: "A more serious mood",
    mercury: "Thinking things through",
    venus: "A serious look at love and money",
    mars: "Slow, steady effort",
    jupiter: "Getting realistic about your hopes",
    saturn: "Looking at what you've built",
    ascendant: "Taking yourself more seriously",
    midheaven: "Taking your work more seriously",
  },
  uranus: {
    sun: "Wanting more freedom",
    moon: "Moods change quickly",
    mercury: "New ways of thinking",
    venus: "Wanting something new in love",
    mars: "Restless energy",
    jupiter: "Hoping for something different",
    saturn: "Shaking up your routine",
    ascendant: "Showing a new side of yourself",
    midheaven: "Wanting a change at work",
  },
  neptune: {
    sun: "Going more by feel",
    moon: "More sensitive than usual",
    mercury: "A dreamier mind",
    venus: "Love feels more romantic",
    mars: "Energy comes and goes",
    jupiter: "Room to dream",
    saturn: "Routines feel looser",
    ascendant: "Coming across more gently",
    midheaven: "Looking for meaning in your work",
  },
  pluto: {
    sun: "Big changes in how you see yourself",
    moon: "Strong feelings come up",
    mercury: "Thinking more deeply",
    venus: "Love feels more intense",
    mars: "More determined than usual",
    jupiter: "Rethinking your plans",
    saturn: "Big changes to your routines",
    ascendant: "Changing how you come across",
    midheaven: "A hard look at your direction",
  },
};

/** Two of the page's approved lines for Mira carry a feel only their own aspect has, so another aspect keeps the pair's line. */
const ONE_ASPECT: Partial<Record<`${Mover}.${Aspect}.${NatalTarget}`, string>> = {
  "uranus.trine.saturn": "Easy changes to your routine",
  "saturn.square.midheaven": "Work feels heavier",
};

/** A retrograde crossing two houses is named by the first in its list, the house it turns back in. */
const RETROGRADE_LINES: Record<RetrogradeEvent["body"], HouseLines> = {
  mercury: {
    none: "A second look at plans and messages",
    in: {
      1: "A second look at yourself",
      2: "A second look at money",
      3: "A second look at what you say",
      4: "A second look at home and family",
      5: "A second look at fun and play",
      6: "A second look at your daily work",
      7: "A second look at your partnerships",
      8: "A second look at shared money",
      9: "A second look at what you believe",
      10: "A second look at your career",
      11: "A second look at friendships",
      12: "A second look at your private life",
    },
  },
  venus: {
    none: "Rethinking what you value",
    in: {
      1: "Rethinking what you want for yourself",
      2: "Rethinking money and what you value",
      3: "Rethinking how you say what you feel",
      4: "Rethinking what home means to you",
      5: "Rethinking what you do for fun",
      6: "Rethinking what you enjoy at work",
      7: "Rethinking what you want from a partner",
      8: "Rethinking closeness and shared money",
      9: "Rethinking what you believe in",
      10: "Rethinking what you want from your career",
      11: "Rethinking your friendships",
      12: "Rethinking what you keep private",
    },
  },
  mars: {
    none: "Taking things slower",
    in: {
      1: "Your energy runs lower",
      2: "Taking it slower with money",
      3: "Slower to speak your mind",
      4: "Taking it slower at home",
      5: "Less energy for fun and play",
      6: "Taking it slower at work",
      7: "Taking it slower with a partner",
      8: "Taking it slower with shared money",
      9: "Slower to act on what you believe",
      10: "Taking it slower in your career",
      11: "Taking it slower with friends",
      12: "More need for time alone",
    },
  },
};

const ECLIPSE_LINES: Record<EclipseEvent["eclipse"]["kind"], HouseLines> = {
  solar: {
    none: "More focus on new beginnings",
    in: {
      1: "More focus on yourself",
      2: "More focus on money",
      3: "More focus on what you say",
      4: "More focus on home and family",
      5: "More focus on fun and play",
      6: "More focus on your daily work",
      7: "More focus on your partnerships",
      8: "More focus on shared money",
      9: "More focus on what you believe",
      10: "More focus on your career",
      11: "More focus on friendships",
      12: "More focus on time alone",
    },
  },
  lunar: {
    none: "Feelings come up",
    in: {
      1: "Feelings about yourself come up",
      2: "Feelings about money come up",
      3: "Feelings come out in what you say",
      4: "Feelings about home and family come up",
      5: "Feelings about romance and fun come up",
      6: "Feelings about your daily work come up",
      7: "Feelings about your partnerships come up",
      8: "Feelings about shared money come up",
      9: "Feelings about what you believe come up",
      10: "Feelings about your career come up",
      11: "Feelings about friendships come up",
      12: "Hidden feelings come up",
    },
  },
};

const BODY_NAMES: Record<Mover | RetrogradeEvent["body"], string> = {
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};

const TARGET_NAMES: Record<NatalTarget, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  ascendant: "Ascendant",
  midheaven: "Midheaven",
};

const ASPECT_WORDS: Record<Aspect, string> = { conjunction: "on", square: "square to", opposition: "opposite", trine: "trine to" };

const ECLIPSE_NAMES: Record<EclipseEvent["eclipse"]["kind"], string> = { solar: "Solar eclipse", lunar: "Lunar eclipse" };

/** Each life cycle's name and its plain word, in sentence case: lower the first letter where it runs on in a sentence. */
export const CYCLE_WORDS: Record<CycleId, { name: string; word: string }> = {
  "jupiter-return": { name: "Jupiter return", word: "A fresh start" },
  "jupiter-opposition": { name: "Jupiter opposition", word: "Seeing how far you've come" },
  "saturn-return": { name: "Saturn return", word: "A reset" },
  "saturn-opposition": { name: "Saturn opposition", word: "A reality check" },
  "saturn-square": { name: "Saturn square", word: "Adjusting your plans" },
  "node-return": { name: "Nodal return", word: "A new direction" },
  "node-opposition": { name: "The nodes reversed", word: "Checking your direction" },
  "uranus-return": { name: "Uranus return", word: "A late-life change" },
  "uranus-opposition": { name: "Uranus opposition", word: "A midlife change" },
  "uranus-square": { name: "Uranus square", word: "A need for freedom" },
  "neptune-square": { name: "Neptune square", word: "Doubts and dreams" },
  "pluto-square": { name: "Pluto square", word: "A deep change" },
};

/** Only the fields the words read, so the dial can word a contact it holds as body, aspect and target. */
type ContactWords = Pick<ContactEvent, "kind" | "body" | "aspect" | "target">;
type RetrogradeWords = Pick<RetrogradeEvent, "kind" | "body" | "houses">;
type EclipseWords = Pick<EclipseEvent, "kind" | "eclipse" | "house">;

export function headlineOf(event: ContactWords | RetrogradeWords | EclipseWords): string {
  switch (event.kind) {
    case "contact":
      return contactHeadline(event);
    case "retrograde":
      return houseLine(RETROGRADE_LINES[event.body], event.houses[0]);
    case "eclipse":
      return houseLine(ECLIPSE_LINES[event.eclipse.kind], event.house);
  }
}

function contactHeadline({ body, aspect, target }: ContactWords): string {
  return ONE_ASPECT[`${body}.${aspect}.${target}`] ?? HEADLINES[body][target];
}

function isHouse(house: number | null | undefined): house is House {
  return typeof house === "number" && Number.isInteger(house) && house >= 1 && house <= 12;
}

function houseLine(lines: HouseLines, house: number | null | undefined): string {
  return isHouse(house) ? lines.in[house] : lines.none;
}

/** The small grey line under a headline: "Saturn on your Ascendant" and "1st house"; the page adds the dates. */
export function factsOf(
  event: Pick<ContactEvent, "kind" | "body" | "aspect" | "target" | "house">
    | Pick<RetrogradeEvent, "kind" | "body" | "houses">
    | Pick<EclipseEvent, "kind" | "eclipse" | "house" | "near">,
): { sky: string; house: string | null } {
  switch (event.kind) {
    case "contact":
      return {
        sky: `${BODY_NAMES[event.body]} ${ASPECT_WORDS[event.aspect]} your ${TARGET_NAMES[event.target]}`,
        house: housesFact(event.house === null ? [] : [event.house]),
      };
    case "retrograde":
      return { sky: `${BODY_NAMES[event.body]} retrograde`, house: housesFact(event.houses) };
    case "eclipse":
      return {
        sky: `${ECLIPSE_NAMES[event.eclipse.kind]}${event.near ? ` near your ${TARGET_NAMES[event.near.target]}` : ""}`,
        house: housesFact(event.house === null ? [] : [event.house]),
      };
  }
}

function housesFact(houses: readonly number[]): string | null {
  const named = houses.filter(isHouse).map(ordinal);
  if (!named.length) return null;
  if (named.length === 1) return `${named[0]} house`;
  return `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]} houses`;
}

function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

type WeekEvent =
  | Pick<ContactEvent, "kind" | "window">
  | Pick<RetrogradeEvent, "kind" | "start" | "end">
  | Pick<EclipseEvent, "kind" | "eclipse">;

const WEEK_MS = 7 * 86_400_000;
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/**
 * The week's sentence, counted from the seven days that open at `from`: what
 * eases, what peaks and what starts ("Two things ease and nothing new starts
 * this week"). An eclipse is one moment, so it only peaks; a retrograde turns
 * back and forward but never peaks. A week nothing reaches says so.
 */
export function weekSentence(events: readonly WeekEvent[], from: Date): string {
  const open = from.getTime();
  const close = open + WEEK_MS;
  const inWeek = (at: Date) => at.getTime() >= open && at.getTime() < close;
  let reached = 0;
  let starts = 0;
  let peaks = 0;
  let eases = 0;
  for (const event of events) {
    if (event.kind === "eclipse") {
      if (inWeek(event.eclipse.at)) {
        reached++;
        peaks++;
      }
      continue;
    }
    const [start, end, exact]: [Date, Date, readonly Date[]] =
      event.kind === "contact" ? [event.window.start, event.window.end, event.window.exact] : [event.start, event.end, []];
    if (end.getTime() < open || start.getTime() >= close) continue;
    reached++;
    if (inWeek(start)) starts++;
    if (exact.some(inWeek)) peaks++;
    if (inWeek(end)) eases++;
  }
  if (!reached) return "A quiet week for your chart";
  const parts: string[] = [];
  if (eases) parts.push(`${countWord(eases)} ${eases === 1 ? "thing eases" : "things ease"}`);
  if (peaks) {
    const noun = parts.length ? "" : peaks === 1 ? "thing " : "things ";
    parts.push(`${countWord(peaks)} ${noun}${peaks === 1 ? "peaks" : "peak"}`);
  }
  parts.push(starts ? `${countWord(starts)} new ${starts === 1 ? "thing starts" : "things start"}` : "nothing new starts");
  const said = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `${said.charAt(0).toUpperCase()}${said.slice(1)} this week`;
}

function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

/**
 * Timeline's plain words live in the engine so the page's prerender and the
 * API read one table and never word the same sky two ways (reading 9,
 * ADR-256, 257). A headline says what a stretch feels like and names no
 * aspect: the tone printed beside it carries the aspect's feel, so a planet
 * on a point has one line, except where a Light pairing's shared line names
 * only a strain, which a Light card's tone would contradict (Review 05/10 §2).
 * Retrogrades and eclipses touch no point, so their lines come from the house
 * they fall in. No line holds a date, a forecast or something to do (R-5.2);
 * the astronomy waits in the facts line. "Transit" is the only name a line
 * gives the sky, never "thing" (reading 23).
 */
import type { CycleId } from "./cycles.js";
import { inEffect, type Aspect, type ContactEvent, type EclipseEvent, type NatalTarget, type RetrogradeEvent, type SkyEvent } from "./doctrine.js";
import type { Tone } from "./tone.js";

type Mover = ContactEvent["body"];
type House = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
interface HouseLines { none: string; in: Record<House, string> }

// MB-215 provisional: Saturn on Mercury's line loses "things" by hand until the Owner settles Timeline's fixed lines.
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
    mercury: "Thinking more carefully",
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

// MB-215 provisional: Light pairings' own lines, rewritten by hand (Review 05/10 §2) until the Owner settles Timeline's fixed lines.
/**
 * A Light card's tone says the time goes the reader's way, so where the pair's shared line names only a strain the
 * Light pairing says how it helps instead; Heavy and Mixed pairings keep the shared line. Light pairings only.
 */
const LIGHT: Partial<Record<`${Mover}.${Aspect}.${NatalTarget}`, string>> = {
  "saturn.trine.sun": "Feeling steady and capable",
  "saturn.trine.moon": "A calm, settled mood",
  "uranus.trine.moon": "Feeling freer and lighter",
  "uranus.trine.mars": "Energy for something new",
  "neptune.trine.moon": "Softer, more open feelings",
  "neptune.trine.mars": "Energy for what you care about",
  "pluto.trine.moon": "Feeling stronger inside",
  "pluto.trine.venus": "Love feels deeper",
  "pluto.trine.midheaven": "A clear look at your direction",
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
    // MB-215 provisional: "things" out by hand, as the house lines below already say it.
    none: "Taking it slower",
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
  const pairing = `${body}.${aspect}.${target}` as const;
  return ONE_ASPECT[pairing] ?? LIGHT[pairing] ?? HEADLINES[body][target];
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

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TONE_ORDER: Readonly<Record<Tone, number>> = { intense: 0, mixed: 1, easy: 2 };

/**
 * The week's sentence over the seven days from `weekStart`, the reader's Monday midnight (Review 05/10 §3, reading
 * 23): "5 transits this week. 4 last all week. Short-fuse days ends on Tuesday.", each part only where it applies.
 * Every event on a day of the week is a transit, one row of the week's picture, a retrograde and an eclipse included.
 * One lasts all week when it is on every day of it and on the days either side, so it neither starts nor ends in
 * it. The one named is the first to end, a stronger tone first on the same day; an eclipse is a moment, so it never
 * ends a stretch. Days are counted in whole days from `weekStart`, since the signature carries no zone: a clock
 * change moves a day's edge by an hour at most.
 */
export function weekSentence(events: readonly SkyEvent[], weekStart: Date): string {
  const open = weekStart.getTime();
  const on = (event: SkyEvent, day: number): boolean => inEffect([event], new Date(open + day * DAY_MS)).length > 0;
  const days = [0, 1, 2, 3, 4, 5, 6];
  let transits = 0;
  let allWeek = 0;
  let ending: { day: number; tone: number; headline: string } | null = null;
  for (const event of events) {
    const held = days.map((day) => on(event, day));
    if (!held.includes(true)) continue;
    transits++;
    if (event.kind === "eclipse") continue;
    const after = on(event, 7);
    if (held.every(Boolean) && after && on(event, -1)) allWeek++;
    const last = days.find((day) => held[day] && !(day === 6 ? after : held[day + 1]));
    if (last === undefined) continue;
    const tone = TONE_ORDER[event.tone];
    if (!ending || last < ending.day || (last === ending.day && tone < ending.tone)) ending = { day: last, tone, headline: headlineOf(event) };
  }
  if (!transits) return "No transits this week.";
  const parts = [`${transits} ${transits === 1 ? "transit" : "transits"} this week.`];
  if (allWeek) parts.push(`${allWeek} ${allWeek === 1 ? "lasts" : "last"} all week.`);
  if (ending) parts.push(`${ending.headline} ends on ${WEEKDAYS[ending.day]}.`);
  return parts.join(" ");
}

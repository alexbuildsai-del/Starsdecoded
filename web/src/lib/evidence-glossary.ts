/**
 * General astrological vocabulary, written once and never about a reader.
 * ADR-18: the UI writes no prose about this chart. Everything here describes
 * a body, sign, house, aspect, dignity or sect role in the abstract, so an
 * evidence card can say what a verified reference means without inventing an
 * interpretation the report did not make.
 */
import type { EvidenceRef } from "@/types/chart";

export const ORDINALS = [
  "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th",
] as const;

export const QUADRANTS = [
  "Self · Development", "Self · Expression", "Self · Expansion", "Self · Transcendence",
] as const;

export const HOUSE_NAMES = [
  "Self & body", "Money & worth", "Mind & exchange", "Home & roots", "Play & creation",
  "Work & health", "Partnership", "Depth & shared money", "Belief & distance",
  "Career & public role", "Friends & collective", "Solitude & the unseen",
] as const;

export const HOUSE_THEMES = [
  "Self, body, how you arrive",
  "Money, resources, what you value",
  "Mind, siblings, the daily exchange",
  "Home, roots, the private self",
  "Play, creativity, romance, children",
  "Work, health, the daily craft",
  "Partnership, and the other person",
  "Shared money, depth, what you inherit",
  "Belief, distance, the bigger picture",
  "Career, public role, reputation",
  "Friends, groups, collective aims",
  "Solitude, the unseen, what runs underneath",
] as const;

export const HOUSE_QUESTIONS = [
  "Why do I come across the way I do?",
  "Why does security feel like this?",
  "Why do I think and talk this way?",
  "Why do home and roots matter so much to me?",
  "Why do I play and create like this?",
  "Why does daily work feel like this?",
  "Why do partnerships go this way?",
  "Why is depth and shared money charged for me?",
  "Why do I believe and travel like this?",
  "Why does my public life take this shape?",
  "Why do groups and friendships work like this?",
  "Why does the hidden part of me run this way?",
] as const;

const BODY_MEANINGS: Record<string, string> = {
  sun: "identity, and what you are for",
  moon: "the body, habits, what makes you feel safe",
  mercury: "how you think and make yourself understood",
  venus: "attraction, taste, what draws you in",
  mars: "drive, and the capacity to cut through",
  jupiter: "expansion, confidence, what opens up",
  saturn: "structure, limit, and what lasts",
  uranus: "disruption, and the sudden break",
  neptune: "longing, imagination, the blurred edge",
  pluto: "power, and change you cannot avoid",
  chiron: "the wound that turns into skill",
  north_node: "the growth direction, unfamiliar on purpose",
  south_node: "the default you reach for too easily",
};

const SIGN_MEANINGS: Record<string, string> = {
  aries: "acts first, fast and direct",
  taurus: "steady, sensory, slow to move",
  gemini: "curious, quick, wants variety",
  cancer: "protective, tidal, home-minded",
  leo: "warm, visible, wants to matter",
  virgo: "precise, useful, notices what is off",
  libra: "balancing, relational, keeps the peace",
  scorpio: "deep, private, all or nothing",
  sagittarius: "roaming, meaning-hungry, blunt",
  capricorn: "disciplined, ambitious, plays long",
  aquarius: "systemic, detached, future-facing",
  pisces: "permeable, imaginative, absorbs everything",
};

const ASPECT_MEANINGS: Record<string, string> = {
  conjunction: "Fused. The two work as one function, for better and worse.",
  opposition: "A see-saw. You get pulled between two poles and have to hold both.",
  trine: "Flows so easily it often goes unnoticed and undervalued.",
  square: "Friction that forces development. It does not resolve, it matures.",
  sextile: "Available, but only if you go and use it.",
};

const SECT_MEANINGS: Record<string, string> = {
  sect_light: "The light that leads the chart, set by whether the Sun was above the horizon.",
  benefic_of_sect: "The helpful planet best placed to actually help in a chart of this sect.",
  benefic_out_of_sect: "The helpful planet working against the chart's grain, so its help arrives late.",
  malefic_of_sect: "The hard planet, at least working with the chart's grain.",
  malefic_out_of_sect: "The hard planet running against the grain. It costs more.",
};

const DIGNITY_MEANINGS: Record<string, string> = {
  domicile: "at home and at full strength",
  exaltation: "honoured, running above itself",
  detriment: "out of place, working hard for uneven results",
  fall: "weakened, slow to deliver",
  peregrine: "unsupported, neither strong nor weak",
};

const ANGLE_MEANINGS: Record<string, string> = {
  ascendant: "The Ascendant is the degree of the zodiac rising on the eastern horizon at a moment of birth. It is the point the whole-sign houses are counted from, and it describes manner and approach rather than the work of a planet.",
  midheaven: "The Midheaven is the highest point the ecliptic reaches at a moment of birth. It marks the top of the chart and stands for public direction and standing rather than for a body.",
};

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function label(name: unknown): string {
  return typeof name === "string" ? cap(name.replace(/_/g, " ")) : "";
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function houseIndex(v: unknown): number {
  return typeof v === "number" && v >= 1 && v <= 12 ? v - 1 : -1;
}

function theHouse(v: unknown): string {
  const i = houseIndex(v);
  return i < 0 ? "that house" : `${ORDINALS[i]} (${HOUSE_THEMES[i].toLowerCase()})`;
}

/** One line of plain English for a verified reference. Never about this reader. */
export function glossFor(ref: EvidenceRef): string {
  switch (ref.kind) {
    case "placement": {
      const body = BODY_MEANINGS[str(ref.body)] ?? "";
      const sign = SIGN_MEANINGS[str(ref.sign)] ?? "";
      const parts = [
        body && cap(body) + ".",
        sign && `${label(ref.sign)} ${sign}.`,
        `The ${theHouse(ref.house)}.`,
      ].filter(Boolean);
      return parts.join(" ");
    }
    case "aspect": {
      const meaning = ASPECT_MEANINGS[str(ref.type)] ?? "";
      const pair = `${label(ref.body1)} and ${label(ref.body2)}`;
      const orb = typeof ref.orb === "number" ? `, ${ref.orb.toFixed(1)}° apart` : "";
      return `${meaning} Here it is ${pair}${orb}.`.trim();
    }
    case "ruler": {
      const dignity = DIGNITY_MEANINGS[str(ref.dignity)];
      return `The ${theHouse(ref.house)} answers to ${label(ref.ruler)}, which sits in `
        + `${label(ref.rulerSign)} in the ${ORDINALS[houseIndex(ref.rulerHouse)] ?? "chart"}`
        + `${dignity ? `, ${dignity}` : ""}.`;
    }
    case "lot":
      return `The Lot of ${label(ref.lot)} is a computed point, not a body. Here it falls in `
        + `${label(ref.sign)}, the ${theHouse(ref.house)}.`;
    case "sect":
      return SECT_MEANINGS[str(ref.role)] ?? "";
    case "angle": {
      const meaning = ANGLE_MEANINGS[str(ref.angle)] ?? "";
      const sign = SIGN_MEANINGS[str(ref.sign)] ?? "";
      return [meaning, sign && `${label(ref.sign)} ${sign}.`].filter(Boolean).join(" ");
    }
    // The pair's two kinds (ADR-41): a cross-chart shape, or a claim read from one of the two natal reports.
    case "cross": {
      if (typeof ref.aspect === "string") {
        const meaning = ASPECT_MEANINGS[str(ref.aspect)] ?? "";
        return `${meaning} Here it runs between the two charts: one person's ${label(ref.planetA)} and the other's ${label(ref.planetB)}.`.trim();
      }
      const body = BODY_MEANINGS[str(ref.planet)] ?? "";
      return [body && cap(body) + ".", `It falls in the other person's ${theHouse(ref.house)}.`].filter(Boolean).join(" ");
    }
    case "source":
      return `Read from the natal report's ${label(ref.section)} chapter, claim ${typeof ref.claim === "number" ? ref.claim : ""}; the evidence is that report's own, verified when it was written.`.replace(/\s+;/, ";");
    default:
      return "";
  }
}

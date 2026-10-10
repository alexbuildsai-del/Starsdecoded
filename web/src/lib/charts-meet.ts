/**
 * Where your charts meet (ADR-177), pure: chapter 01's cards, one per point
 * where a body in one chart meets a body in the other. Code names each card
 * in people words from one fixed word per body, so the writer never titles
 * one, and the astrology goes under it in small type. A flowing aspect comes
 * naturally and a hard one is a challenge, as the links chapter's check
 * tagged it (`flows` and `rubs` stay the stored enum); an overlay has no tag
 * and waits under Show all. Three of each tag lead, the ledger's links first
 * so every glyph above lands on a card on view, then the brief's order,
 * strongest first.
 */
import { tokens } from "@workspace/design";
import { ORDINALS, houseWord } from "@/lib/evidence-glossary";
import { linkAnchor, linkOf, type LedgerLink } from "@/lib/ledger";
import { PLANET_LABELS, type PairLink, type PairTwoCharts } from "@/types/chart";

export type MeetTag = "comes" | "challenge";

export interface MeetCard {
  tag: MeetTag | null;
  title: string;
  astro: string;
  body: string;
  check: string | null;
  /** An aspect card's id, so the ledger's glyph can scroll to it (ADR-101); no glyph points at an overlay. */
  anchor?: string;
}

/** One word per body, the spec's list; Chiron and the nodes keep their names. */
export const BODY_WORDS: Readonly<Record<string, string>> = {
  sun: "identity",
  moon: "feelings",
  mercury: "mind",
  venus: "affection",
  mars: "drive",
  jupiter: "optimism",
  saturn: "structure",
  uranus: "independence",
  neptune: "imagination",
  pluto: "intensity",
};

/** One pair of words for the ledger's columns, the cards and the prose. */
export const MEET_TAGS: Readonly<Record<MeetTag, string>> = { comes: "Comes naturally", challenge: "Challenge" };

/** The report's own teal and rose, so a tag looks the same in the ledger and on a card. */
export const MEET_COLOURS: Readonly<Record<MeetTag, string>> = { comes: tokens.color.teal, challenge: tokens.color.rose };

export const LEAD_PER_TAG = 3;

const ASPECT_WORDS: Readonly<Record<string, string>> = {
  conjunction: "conjunct",
  opposition: "opposite",
  square: "square",
  trine: "trine",
  sextile: "sextile",
};

const CHECK = "Behaviour check:";

const firstName = (name: string): string => name.trim().split(/\s+/)[0];

const bodyLabel = (body: string): string => PLANET_LABELS[body] ?? body;

export function bodyWord(body: string): string {
  return BODY_WORDS[body] ?? bodyLabel(body);
}

/** A's body first, as the link and its astrology line read. */
export function aspectTitle(planetA: string, planetB: string, names: { a: string; b: string }): string {
  return `${firstName(names.a)}'s ${bodyWord(planetA)} and ${firstName(names.b)}'s ${bodyWord(planetB)}`;
}

export function meetIntro(names: { a: string; b: string }): string {
  return `Each card is one point where a planet in ${firstName(names.a)}'s chart meets one in ${firstName(names.b)}'s.`;
}

/** The reading and its closing behaviour check, apart, so the check can carry its label. */
export function splitCheck(reading: string): [string, string | null] {
  const i = reading.indexOf(CHECK);
  if (i < 0) return [reading, null];
  return [reading.slice(0, i).trim(), reading.slice(i + CHECK.length).trim()];
}

// A stored card leaves the fields that do not apply empty; one missing its own has no title that would be true, so it gets no card.
function cardOf(link: PairLink, names: { a: string; b: string }): MeetCard | null {
  const [body, check] = splitCheck(link.reading);
  if (link.kind === "overlay") {
    const house = link.house ?? 0;
    const word = houseWord(house);
    if (!link.planet || !word || (link.of !== "A" && link.of !== "B")) return null;
    const [owner, host] = link.of === "A" ? [names.a, names.b] : [names.b, names.a];
    return {
      tag: null,
      title: `${firstName(owner)}'s ${bodyWord(link.planet)} in ${firstName(host)}'s ${word}`,
      astro: `${bodyLabel(link.planet)} in ${ORDINALS[house - 1]} house`,
      body,
      check,
    };
  }
  if (!link.planetA || !link.planetB || !link.aspect) return null;
  const orb = typeof link.orb === "number" ? ` · ${link.orb.toFixed(1)}°` : "";
  return {
    tag: link.kind === "rubs" ? "challenge" : "comes",
    title: aspectTitle(link.planetA, link.planetB, names),
    astro: `${bodyLabel(link.planetA)} ${ASPECT_WORDS[link.aspect] ?? link.aspect} ${bodyLabel(link.planetB)}${orb}`,
    body,
    check,
    anchor: linkAnchor({ planetA: link.planetA, aspect: link.aspect, planetB: link.planetB }),
  };
}

/** The links the ledger's lines cite, in the ledger's order, so the cards can lead with what the ledger points at. */
export function ledgerLinksOf(s: PairTwoCharts | undefined): LedgerLink[] {
  if (!s) return [];
  return [...s.strong, ...s.work].map((text) => linkOf(text, s.claims)).filter((l): l is LedgerLink => l !== null);
}

export function meetCards(links: PairLink[], ledgerLinks: LedgerLink[], names: { a: string; b: string }): { lead: MeetCard[]; rest: MeetCard[] } {
  const cards = links.map((l) => cardOf(l, names)).filter((c): c is MeetCard => c !== null);
  const ledger = ledgerLinks.map(linkAnchor);
  const rank = (c: MeetCard): number => {
    const i = c.anchor ? ledger.indexOf(c.anchor) : -1;
    return i < 0 ? ledger.length : i;
  };
  const lead: MeetCard[] = [];
  const more: MeetCard[] = [];
  for (const tag of ["comes", "challenge"] as const) {
    const group = cards
      .map((card, stored) => ({ card, stored }))
      .filter(({ card }) => card.tag === tag)
      .sort((x, y) => rank(x.card) - rank(y.card) || x.stored - y.stored)
      .map(({ card }) => card);
    lead.push(...group.slice(0, LEAD_PER_TAG));
    more.push(...group.slice(LEAD_PER_TAG));
  }
  return { lead, rest: [...more, ...cards.filter((c) => c.tag === null)] };
}

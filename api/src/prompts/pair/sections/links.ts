import type { z } from "zod/v4";
import type { PairSectionSpec } from "../shapes.js";
import { PairLinkSchema, PairLinksSchema, ratingChecks, stripBracketedBodies } from "../shapes.js";
import type { PairBrief } from "../../../lib/pairBrief.js";
import { BODIES, BODY_LABELS, cap, ordinal, type Body } from "../../vocabulary.js";
import { block, buffered, fixed, warned, type Check, type Validated } from "../../checks.js";

const label = (b: string): string => BODY_LABELS[b as Body] ?? cap(b);
const words = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** A luminary leads a notable overlay's card when the group holds one. */
function leadBody(planets: Body[]): Body {
  return planets.find((p) => p === "sun" || p === "moon") ?? planets[0];
}

/** The cards the section must write, one per drawn link and per notable overlay, as the brief lists them. */
export function linkList(brief: PairBrief): string[] {
  const out = brief.cross.map((c) => `aspect: A ${label(c.planetA)} ${c.type} B ${label(c.planetB)} (orb ${c.orb.toFixed(1)})`);
  if (!brief.blind) {
    for (const n of brief.notable) {
      const lead = leadBody(n.planets);
      const rest = n.planets.filter((p) => p !== lead);
      out.push(`overlay: ${n.of} ${label(lead)} in ${n.inHouseOf}'s ${ordinal(n.house)} house${rest.length ? ` (with ${rest.map(label).join(", ")})` : ""}`);
    }
  }
  return out;
}

/** The card's word band and its 20% buffer (annex row 32). */
export const LINK_CARD_WORDS: [number, number] = [40, 70];
export const LINK_CARD_BUFFER: [number, number] = [32, 84];

const ENDING = "Behaviour check:";

/** The ending in any spelling or case, at the start of the last sentence, normalised to the one the page expects (annex row 33). Null when there is none. */
export function normaliseEnding(reading: string): string | null {
  const text = reading.trim();
  const re = /\bbehaviou?r[\s-]*check\s*[:\-–—]?\s*/gi;
  let last: RegExpExecArray | null = null;
  for (let m = re.exec(text); m; m = re.exec(text)) last = m;
  if (!last) return null;
  const before = text.slice(0, last.index).trimEnd();
  const after = text.slice(last.index + last[0].length).trim();
  if (!after) return null;
  const head = before && !/[.!?]$/.test(before) ? `${before}.` : before;
  return `${head ? `${head} ` : ""}${ENDING} ${after}`;
}

/** Which listed link a card is for, by its own fields; null when it matches none (annex rows 31, 34). */
function matchIndex(card: z.infer<typeof PairLinkSchema>, brief: PairBrief): number | null {
  const crossCount = brief.cross.length;
  if (card.kind === "overlay" || (card.planet && card.of !== "none")) {
    if (brief.blind) return null;
    const i = brief.notable.findIndex((n) => n.of === card.of && n.house === card.house && n.planets.includes(card.planet as Body));
    return i === -1 ? null : crossCount + i;
  }
  const i = brief.cross.findIndex((c) => c.planetA === card.planetA && c.planetB === card.planetB && c.type === card.aspect);
  return i === -1 ? null : i;
}

/** The cards reconciled against the list: dropped, snapped, tagged in code; a card over the buffer or naming a third body blocks. */
export function linksChecks(out: z.infer<typeof PairLinksSchema>, brief: PairBrief): Validated<z.infer<typeof PairLinksSchema>> {
  const checks: Check[] = [];
  const expected = linkList(brief);
  const byIndex = new Map<number, z.infer<typeof PairLinkSchema>>();
  out.links.forEach((l, i) => {
    const tag = `card ${i + 1}`;
    const at = matchIndex(l, brief);
    if (at === null) {
      checks.push(fixed("chk-34", brief.blind && (l.kind === "overlay" || l.of !== "none") ? `${tag}: an overlay card on a blind pair; dropped` : `${tag}: matches no listed link; dropped`));
      return;
    }
    if (byIndex.has(at)) { checks.push(fixed("chk-31", `${tag}: a second card for link ${at + 1}; dropped`)); return; }
    byIndex.set(at, l);
  });
  if (byIndex.size < expected.length) checks.push(warned("chk-31", `${byIndex.size} cards for ${expected.length} listed links; the missing ones have no card`));

  const links = [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([at, card]) => {
    const tag = `card for link ${at + 1}`;
    let l = { ...card };
    const stripped = stripBracketedBodies(l.reading);
    if (stripped.stripped) { checks.push(fixed("chk-20", `${tag}: ${stripped.stripped} bracketed body name(s) stripped`)); l.reading = stripped.text; }
    const ended = normaliseEnding(l.reading);
    if (ended === null) checks.push(warned("chk-33", `${tag}: does not end on "${ENDING}"`));
    else if (ended !== l.reading.trim()) { checks.push(fixed("chk-33", `${tag}: the ending normalised to "${ENDING}"`)); l.reading = ended; }
    const w = words(l.reading);
    if (w < LINK_CARD_BUFFER[0] || w > LINK_CARD_BUFFER[1]) checks.push(block("chk-32", `${tag}: ${w} words, the card takes ${LINK_CARD_WORDS[0]} to ${LINK_CARD_WORDS[1]}`));
    else if (w < LINK_CARD_WORDS[0] || w > LINK_CARD_WORDS[1]) checks.push(buffered("chk-32", `${tag}: ${w} words, outside ${LINK_CARD_WORDS[0]} to ${LINK_CARD_WORDS[1]} and inside the buffer`));
    const allowed = new Set<string>();
    if (at >= brief.cross.length) {
      const hit = brief.notable[at - brief.cross.length];
      if (l.kind !== "overlay") { checks.push(fixed("chk-35", `${tag}: tagged ${l.kind}; an overlay card is tagged overlay`)); l.kind = "overlay"; }
      for (const p of hit.planets) allowed.add(label(p));
    } else {
      const hit = brief.cross[at];
      if (Math.abs(hit.orb - l.orb) > 0.2) { checks.push(fixed("chk-08", `${tag}: orb ${l.orb} snapped to the computed ${hit.orb.toFixed(1)}`)); l.orb = hit.orb; }
      const flows = hit.type === "trine" || hit.type === "sextile" || hit.type === "conjunction";
      const kind = flows ? "flows" : "rubs";
      if (l.kind !== kind) { checks.push(fixed("chk-35", `${tag}: a ${hit.type} is tagged ${l.kind}; set to ${kind}`)); l.kind = kind; }
      allowed.add(label(l.planetA));
      allowed.add(label(l.planetB));
    }
    for (const b of BODIES) {
      const name = BODY_LABELS[b];
      if (allowed.has(name)) continue;
      if (new RegExp(`\\b${name}\\b`).test(l.reading)) checks.push(block("chk-36", `${tag}: the reading names ${name}, which is not one of its bodies`));
    }
    checks.push(...ratingChecks(l.reading).map((c) => ({ ...c, message: `${tag}: ${c.message}` })));
    if (/\borbs?\b/i.test(l.reading)) checks.push(block("chk-22", `${tag}: the word orb sits in the reading`));
    return l;
  });
  return { output: { links }, checks };
}

export const links: PairSectionSpec<typeof PairLinksSchema> = {
  key: "pair:links",
  label: "Link cards",
  adminLabel: "Link cards (chapter 01)",
  chapter: 0,
  wordTarget: [0, 0],
  maxTokens: 8_000,
  schema: PairLinksSchema,
  extraContext: (brief) => ["CARDS TO WRITE, one entry each, in this order (the only links and bodies each reading may name; a card for a link not listed here is dropped):", ...linkList(brief).map((l) => `- ${l}`)].join("\n"),
  validate: linksChecks,
  instructions: `Write the link cards that sit under the two charts in chapter one: one card per listed link, in the listed order, and only the listed links, 45 to 60 words each. The body fields take the key form (sun, moon, mercury, north_node), never the letter or the capitalised name.

An aspect card names only its two bodies, A's and B's, and reads what that contact does between these two people from the lens register: a trine, sextile or conjunction is tagged flows, a square or opposition is tagged rubs. A conjunction between two hard bodies still flows, but say what it costs. An overlay card names only the bodies listed for it and the house they fall in, and is tagged overlay: it reads where that person lands in the other's life, from the host's side; the lead body is the one listed first and goes in the planet field. Copy the bodies, the aspect type, the orb, the owner and the house exactly from the list; set the fields that do not apply to empty, none or 0.

Rule 8 of the style contract is lifted here alone: the two bodies may be named, because the reader is looking at them on the two charts. Never name a third body, and never a sign. End every reading on one sentence beginning "Behaviour check:" that gives the two of them something to test this week; that is the last sentence of the card, nothing after it. No score, no number.`,
};

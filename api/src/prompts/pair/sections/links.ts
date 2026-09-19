import type { PairSectionSpec } from "../shapes.js";
import { PairLinksSchema, ratingProblems } from "../shapes.js";
import type { PairBrief } from "../../../lib/pairBrief.js";
import { BODIES, BODY_LABELS, cap, ordinal, type Body } from "../../vocabulary.js";

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

export const links: PairSectionSpec<typeof PairLinksSchema> = {
  key: "pair:links",
  label: "Link cards",
  adminLabel: "Link cards (chapter 02)",
  chapter: 0,
  wordTarget: [0, 0],
  maxTokens: 8_000,
  schema: PairLinksSchema,
  extraContext: (brief) => ["CARDS TO WRITE, one entry each, in this order (the only links and bodies each reading may name):", ...linkList(brief).map((l) => `- ${l}`)].join("\n"),
  validate: (out, brief) => {
    const problems: string[] = [];
    const expected = linkList(brief);
    if (out.links.length !== expected.length) problems.push(`${out.links.length} cards, but ${expected.length} links are listed: write one card per listed link`);
    out.links.forEach((l, i) => {
      const tag = `card ${i + 1}`;
      const w = words(l.reading);
      if (w < 40 || w > 70) problems.push(`${tag}: ${w} words, the card takes 40 to 70`);
      if (!/Behaviour check:[^.]*\.?\s*$/.test(l.reading.trim())) problems.push(`${tag}: must end on a sentence beginning "Behaviour check:"`);
      const allowed = new Set<string>();
      if (l.kind === "overlay") {
        if (brief.blind) { problems.push(`${tag}: no overlay card when a chart has no horizon`); return; }
        const hit = brief.notable.find((n) => n.of === l.of && n.house === l.house && n.planets.includes(l.planet as Body));
        if (!hit) problems.push(`${tag}: no notable overlay of ${l.of} ${l.planet} in the ${ordinal(l.house)}`);
        for (const p of hit?.planets ?? [l.planet as Body]) allowed.add(label(p));
      } else {
        const hit = brief.cross.find((c) => c.planetA === l.planetA && c.planetB === l.planetB && c.type === l.aspect);
        if (!hit) problems.push(`${tag}: no A ${l.planetA} ${l.aspect} B ${l.planetB} within orb`);
        else if (Math.abs(hit.orb - l.orb) > 0.2) problems.push(`${tag}: orb is ${hit.orb.toFixed(1)}, not ${l.orb}`);
        const flows = l.aspect === "trine" || l.aspect === "sextile" || l.aspect === "conjunction";
        if (l.kind === "flows" && !flows) problems.push(`${tag}: a ${l.aspect} is tagged flows; it rubs`);
        if (l.kind === "rubs" && flows) problems.push(`${tag}: a ${l.aspect} is tagged rubs; it flows`);
        allowed.add(label(l.planetA));
        allowed.add(label(l.planetB));
      }
      for (const b of BODIES) {
        const name = BODY_LABELS[b];
        if (allowed.has(name)) continue;
        if (new RegExp(`\\b${name}\\b`).test(l.reading)) problems.push(`${tag}: the reading names ${name}, which is not one of its two bodies`);
      }
      problems.push(...ratingProblems(l.reading).map((p) => `${tag}: ${p}`));
    });
    return problems;
  },
  instructions: `Write the link cards that sit under the bi-wheel in chapter two: one card per listed link, in the listed order, 45 to 65 words each; 70 is a hard ceiling.

An aspect card names only its two bodies, A's and B's, and reads what that contact does between these two people from the lens register: a trine, sextile or conjunction is tagged flows, a square or opposition is tagged rubs. A conjunction between two hard bodies still flows, but say what it costs. An overlay card names only the bodies listed for it and the house they fall in, and is tagged overlay: it reads where that person lands in the other's life, from the host's side; the lead body is the one listed first and goes in the planet field. Copy the bodies, the aspect type, the orb, the owner and the house exactly from the list; set the fields that do not apply to empty, none or 0.

Rule 8 of the style contract is lifted here alone: the two bodies may be named, because the reader is looking at them on the wheel. Never name a third body, and never a sign. End every reading on one sentence beginning "Behaviour check:" that gives the two of them something to test this week. No score, no number.`,
};

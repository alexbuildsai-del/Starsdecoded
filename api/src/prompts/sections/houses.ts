import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import type { ChartBrief } from "../brief.js";
import { chartPatterns, type NatalChartData } from "../../lib/chartCalculation.js";
import { houseRulers } from "../../lib/traditional.js";
import { BODIES, BODY_LABELS, HOUSE_COVERS, RETROGRADE_BY_BODY, cap, ordinal, type Body } from "../vocabulary.js";
import { block, fixed, warned, type Check, type Validated } from "../checks.js";
import { observationsFor } from "../observations.js";

// Strict mode always sends both blocks; the defaults let a reply in the shape before v12 (a stub's, a stored test's)
// read as a card with none, and they leave the schema the model is sent unchanged.
const HouseReadingSchema = z.object({
  house: z.int().describe("the house number, 1 through 12, in order"),
  reading: z.string().describe("40 to 70 words, ending on a sentence that begins 'Behaviour check:'"),
  retrograde: z.array(z.object({
    planet: z.string().describe("the body's name, as its line under HOUSE BY HOUSE gives it"),
    text: z.string().describe("two or three sentences, 25 to 45 words: what going backwards may change for this body in this house"),
  })).describe("one block for each body the house's line asks a retrograde block for, and an empty list on every other house").default([]),
  stellium: z.object({
    text: z.string().describe("two sentences, 20 to 40 words: what so much in this one part of life may mean for the reader"),
    balance: z.string().describe("one or two sentences, 15 to 30 words: what the opposite house covers, then one thing to do there"),
  }).nullable().describe("only on the house whose line asks a stellium block, and null on every other house").default(null),
});

export const HousesSchema = z.object({
  houses: z.array(HouseReadingSchema).min(12).max(12),
});

/** Often noticed: the card's first idea in the observations table, with its reason, never model text (ADR-403, 404). */
export interface Noticed {
  idea: string;
  why: string;
}

/** A house as stored. A block's `planet` is the chart's key ("saturn"), so the card finds the body's label and glyph. */
export type StoredHouseReading = z.infer<typeof HouseReadingSchema> & { noticed: Noticed | null };

export interface StoredHouses {
  houses: StoredHouseReading[];
}

/** A reply as it may arrive: the blocks are optional in one written before v12. */
type ModelHouse = z.input<typeof HouseReadingSchema>;

/** What one card holds, from the chart and the engine's patterns, so the prompt and the validator read the same facts. */
interface HouseFacts {
  house: number;
  sign: string;
  bodies: Body[];
  /** A planet or Chiron going backwards at birth: the nodes always move backwards, so they never get a block (ADR-396). */
  backwards: Body[];
  stellium: { bodies: string[] } | null;
  pair: string[] | null;
  strongest: string[];
  empty: boolean;
  ruler: { body: Body; house: number };
  noticed: Noticed | null;
}

const PLANETS: readonly Body[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const COUNTS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

const opposite = (house: number): number => ((house + 5) % 12) + 1;

function list(items: readonly string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const labels = (bodies: readonly string[]): string => list(bodies.map((b) => BODY_LABELS[b as Body] ?? b));

/** Never called blind: the section is skipped when the horizon is unknown, and a blind chart has no house to rule. */
function houseFacts(chart: NatalChartData): HouseFacts[] {
  const patterns = chartPatterns(chart.planets, chart.angles);
  const noticed = new Map<number, Noticed>();
  // A card shows only its first idea, so the table's order is the choice (ADR-404).
  for (const { observation, house } of observationsFor(chart)) {
    if (house !== null && !noticed.has(house)) noticed.set(house, { idea: observation.idea, why: observation.why });
  }
  return houseRulers(chart).map((r) => {
    const bodies = BODIES.filter((b) => chart.planets[b]?.house === r.house);
    const stellium = patterns.stelliums.find((s) => s.house === r.house);
    const pair = patterns.pairs.find((p) => p.house === r.house);
    return {
      house: r.house,
      sign: cap(r.sign),
      bodies,
      backwards: bodies.filter((b) => chart.planets[b].retrograde && RETROGRADE_BY_BODY[b] !== undefined),
      stellium: stellium ? { bodies: stellium.bodies } : null,
      pair: pair ? pair.bodies : null,
      strongest: patterns.angular.filter((p) => chart.planets[p]?.house === r.house),
      empty: patterns.emptyHouses.includes(r.house),
      ruler: { body: r.ruler as Body, house: r.rulerHouse },
      noticed: noticed.get(r.house) ?? null,
    };
  });
}

function houseLine(f: HouseFacts): string {
  const held = !f.bodies.length ? "empty"
    : f.empty ? `${labels(f.bodies)} only, so read it as empty`
      : !f.bodies.some((b) => PLANETS.includes(b)) ? `${labels(f.bodies)}, with no planet`
        : labels(f.bodies);
  // A group that is the whole card is named once, by the card.
  const whole = (group: readonly string[]) => group.length === f.bodies.length && group.every((b) => f.bodies.includes(b as Body));
  const notes: string[] = [];
  if (f.stellium) {
    const across = opposite(f.house);
    const who = whole(f.stellium.bodies) ? "Together they make" : `${labels(f.stellium.bodies)} make`;
    notes.push(`${who} a stellium of ${COUNTS[f.stellium.bodies.length]}, balanced by your ${ordinal(across)} (${HOUSE_COVERS[across - 1]}).`);
  }
  if (f.pair) notes.push(whole(f.pair) ? "They are a pair." : `${labels(f.pair)} are a pair.`);
  if (f.strongest.length) notes.push(`${labels(f.strongest)} ${f.strongest.length > 1 ? "are" : "is"} among the chart's strongest planets.`);
  if (f.bodies.includes("chiron")) notes.push("Chiron gets one sentence.");
  notes.push(f.bodies.includes(f.ruler.body)
    ? `${BODY_LABELS[f.ruler.body]} is also its planet in charge.`
    : `Planet in charge: ${BODY_LABELS[f.ruler.body]}, in your ${ordinal(f.ruler.house)}.`);
  if (f.noticed) notes.push(`Its card shows "${f.noticed.idea}" as Often noticed.`);
  const blocks = [
    ...f.backwards.map((b) => `a retrograde block for ${BODY_LABELS[b]}`),
    ...(f.stellium ? ["a stellium block"] : []),
  ];
  notes.push(`Blocks: ${blocks.length ? list(blocks) : "none"}.`);
  return `- ${ordinal(f.house)}, ${f.sign}: ${held}. ${notes.join(" ")}`;
}

/** The body a block names, read as the writer may spell it ("Saturn", "saturn", "Saturn retrograde"); null when unclear. */
function bodyNamed(name: string): Body | null {
  const plain = name.trim().toLowerCase();
  const exact = BODIES.find((b) => b === plain.replace(/[\s-]+/g, "_") || BODY_LABELS[b].toLowerCase() === plain);
  if (exact) return exact;
  const inside = BODIES.filter((b) => new RegExp(`\\b${BODY_LABELS[b]}\\b`, "i").test(name));
  return inside.length === 1 ? inside[0] : null;
}

// A block the chart doesn't call for is dropped (annex row 14); one it calls for that the writer left out is logged,
// since the reading above it is still right for the reader (row 52, ADR-81, ADR-385).
function withBlocks(h: ModelHouse, f: HouseFacts, checks: Check[]): StoredHouseReading {
  const retrograde: StoredHouseReading["retrograde"] = [];
  const dropped: string[] = [];
  for (const r of h.retrograde ?? []) {
    const body = bodyNamed(r.planet);
    if (body && f.backwards.includes(body) && r.text.trim() && !retrograde.some((k) => k.planet === body)) retrograde.push({ planet: body, text: r.text });
    else dropped.push(body ? BODY_LABELS[body] : "a body the chart does not have");
  }
  if (dropped.length) {
    checks.push(fixed("chk-14", `house ${f.house}: ${dropped.length} retrograde block(s) dropped (${list(dropped)}); a card keeps one block, with text, for each body going backwards in it`));
  }
  for (const b of f.backwards) {
    if (!retrograde.some((k) => k.planet === b)) checks.push(warned("chk-52", `house ${f.house}: ${BODY_LABELS[b]} went backwards at birth and has no block`));
  }
  let stellium = h.stellium ?? null;
  if (stellium && (!f.stellium || !stellium.text.trim() || !stellium.balance.trim())) {
    checks.push(fixed("chk-14", f.stellium ? `house ${f.house}: a stellium block with an empty part was dropped` : `house ${f.house} holds no stellium; its stellium block was dropped`));
    stellium = null;
  }
  if (f.stellium && !stellium) checks.push(warned("chk-52", `house ${f.house} holds a stellium and has no stellium block`));
  return { house: h.house, reading: h.reading, retrograde, stellium, noticed: f.noticed };
}

/** `validate` also takes a reply in the shape before v12, which a stored test may still pass in. */
type HousesSpec = SectionSpec<typeof HousesSchema> & {
  validate: (out: z.input<typeof HousesSchema>, brief: ChartBrief) => Validated<StoredHouses>;
};

export const houses: HousesSpec = {
  key: "natal:houses",
  label: "House readings",
  adminLabel: "House readings",
  // The twelve readings' 480 to 780 words, plus the blocks: the busiest drawn fixtures carry four going-backwards
  // blocks and a stellium (the fifteen average three and one), at their middle lengths. Blind plus the horizon pass
  // still sits inside 3,500 to 5,500.
  wordTarget: [480, 1000],
  maxTokens: 6_000,
  schema: HousesSchema,
  skipWhenBlind: true,
  extraContext: (brief) => [
    "HOUSE BY HOUSE (worked out from the chart, one line per card). A reading names only the bodies on its line, and any other name is rejected. Blocks says what the card's retrograde list and stellium hold: a card with none returns an empty list and a null stellium.",
    ...houseFacts(brief.chart).map(houseLine),
  ].join("\n"),
  // Order and duplicates are fixed in code; a missing house or a body that is not in the house blocks (annex rows 14, 15).
  validate: (out: z.input<typeof HousesSchema>, brief: ChartBrief): Validated<StoredHouses> => {
    const checks: Check[] = [];
    const byHouse = new Map<number, ModelHouse>();
    for (const h of out.houses) {
      if (h.house < 1 || h.house > 12) { checks.push(fixed("chk-14", `an entry for house ${h.house} was dropped; houses run 1 to 12`)); continue; }
      if (byHouse.has(h.house)) { checks.push(fixed("chk-14", `house ${h.house} appears twice; the first reading kept`)); continue; }
      byHouse.set(h.house, h);
    }
    const houses = [...byHouse.values()].sort((a, b) => a.house - b.house);
    if (houses.some((h, i) => out.houses[i]?.house !== h.house)) checks.push(fixed("chk-14", "the twelve readings were out of order; sorted"));
    for (let n = 1; n <= 12; n++) if (!byHouse.has(n)) checks.push(block("chk-14", `house ${n} has no reading: return all twelve houses, 1 to 12`));
    const rulers = houseRulers(brief.chart);
    for (const { house, reading } of houses) {
      const allowed = new Set<string>();
      for (const b of BODIES) if (brief.chart.planets[b]?.house === house) allowed.add(BODY_LABELS[b]);
      const ruler = rulers[house - 1];
      if (ruler) allowed.add(BODY_LABELS[ruler.ruler as Body]);
      for (const b of BODIES) {
        const label = BODY_LABELS[b];
        if (allowed.has(label)) continue;
        if (new RegExp(`\\b${label}\\b`).test(reading)) {
          checks.push(block("chk-15", `house ${house}: the reading names ${label}, which is neither placed in the ${ordinal(house)} nor its ruler`));
        }
      }
    }
    const facts = new Map(houseFacts(brief.chart).map((f) => [f.house, f]));
    const stored: StoredHouseReading[] = houses.map((h) => withBlocks(h, facts.get(h.house)!, checks));
    return { output: { houses: stored }, checks };
  },
  instructions: `Write the twelve house readings for the house cards in the chart explorer. One entry per house, 1 through 12, in order. Each reading is 45 to 65 words, and 70 is a hard ceiling. It ends on one sentence that begins "Behaviour check:" and gives the reader something to test in their own week.

A short primer sits before the first card. It already says that the houses start at the rising sign, that each house is one part of life, that every house has a planet in charge, and that every planet has a home sign. So a reading never stops to explain these. It uses them.

Open on the reader's life, then give the reason. Say what the reader does, never how they "come across". Never open two readings the same way, and never on a line like "Your 9th house is empty."

Names. A reading may name every body on its line under HOUSE BY HOUSE, since the reader sees them on the card. Give each one its plain meaning and a moment the reader can check. The house's planet in charge is named only with its reason in the same sentence: "<Planet> rules <Sign>, the sign on this house, and it sits in your <Nth>." If the reason doesn't help the reader, leave that planet out. Never name any other body, and that includes the other end of an aspect: a planet in another house is "a planet elsewhere in your chart". Name a sign only as the sign on this house or the sign its planet in charge sits in.

A house with planets: lead with what they do together, as things the reader does. A pair is read together: what each brings, and where they pull apart. A planet among the chart's strongest gets that said once, with why: it sits at one of the chart's four main points, so it shows clearly in a life. Never write "angular".

Chiron gets one sentence in its house, even when planets share it: the sore spot, then the gift, in possibility words. Read it by its house, never by its sign.

An empty house still counts. Read it through its planet in charge, from its EMPTY HOUSES line in the brief: the sign that starts the house, its planet in charge, how at ease that planet is in its sign and why, and the house it sits in, which is where this house's story plays out. Never call a house easy or quiet without that reason, and never say nothing happens there. A house with no planet, only Chiron or a node, is read the same way after naming what it holds.

Blocks. A card can carry two kinds of block under its reading. Write only the blocks its line asks for. A block names no body that is not on its card's line, and the reading never repeats a block's point. The house opposite comes up only in a stellium's balance.
- retrograde: one entry for each body its line asks a retrograde block for, and an empty list on every other card. "planet" is that body's name. "text" is two or three sentences, 25 to 45 words, written for that body in this house: what going backwards may change, compared with the body moving forward. Name it plainly in a "may" sentence ("<Planet> retrograde may…"). For Jupiter, Saturn, Uranus, Neptune, Pluto and Chiron, say how common it is, from RETROGRADE AT BIRTH in the brief. Work from the body's going-backwards line in the vocabulary, and never copy it.
- stellium: only on the card its line asks a stellium block for, and null on every other card. The card prints "A stellium: <n> in one house" above it. "text" is two sentences, 20 to 40 words: what so much in this one part of life may mean for the reader, with a moment they could picture. "balance" is one or two sentences, 15 to 30 words. The card prints "To balance it: your <Nth> house" before it, so start straight on what that house covers, in everyday words, then give one thing to do there when this house gets too full.

An idea a line marks as Often noticed is printed on that card in code. The reading may build on it, but never repeats it.

Use possibility words: could, might, may, you may notice. Never will or is going to, and never a named event as the outcome.

Each reading stands alone. Do not repeat an image or a sentence across the twelve.`,
};

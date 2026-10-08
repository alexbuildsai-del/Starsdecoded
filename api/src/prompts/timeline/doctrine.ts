/**
 * How a Timeline reading reads the sky over one chart (ADR-210): the family's
 * own doctrine, beside the natal one every reading also carries. The bodies,
 * aspects and orbs are rendered from the engine's doctrine, so the prompt and
 * the search that found the event cannot disagree (ADR-208).
 */
import { DOCTRINE as SKY_DOCTRINE, type Aspect, type ContactBody, type NatalTarget } from "@workspace/engine";

/**
 * R-5.2 as the timeline spec amends it (ADR-206), word for word: the rule the
 * blocking checks hold every reading to, so the writer reads it as the
 * product states it.
 */
export const TIME_RULE = `THE RULE ON TIME (the product's own words, and you are the model they mean).
The model may describe behavioural patterns, tendencies and growth edges. It may never predict events, name dates, promise outcomes, give medical or psychological diagnoses, or invoke fate or karma. It may name the dates of computed sky events and say how astrology reads that time. It never names a date for something in the reader's life, and never tells the reader to do or not do the thing they asked about.`;

const NAMES: Record<ContactBody | NatalTarget, string> = {
  sun: "the Sun",
  moon: "the Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
  ascendant: "the Ascendant",
  midheaven: "the Midheaven",
};

function list(items: readonly string[], last = "and"): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`;
}

/**
 * The contact bodies whose backwards passes a contact's reading reads, Jupiter to Pluto (ADR-392): Mars's going back
 * is an event with its own card and reading, as Mercury's and Venus's are, so a Mars contact is read without it.
 */
export const BACKWARDS_PASS_BODIES: ReadonlySet<ContactBody> = new Set(
  SKY_DOCTRINE.bodies.filter((body) => !(SKY_DOCTRINE.retrogrades as readonly string[]).includes(body)),
);

/** Bodies that share the same aspects, or the same orb, are said together, in the engine's order. */
function grouped<K>(keyOf: (body: ContactBody) => K): [K, ContactBody[]][] {
  const groups = new Map<K, ContactBody[]>();
  for (const body of SKY_DOCTRINE.bodies) groups.set(keyOf(body), [...(groups.get(keyOf(body)) ?? []), body]);
  return [...groups];
}

function skyLine(): string {
  const touches = grouped((body) => SKY_DOCTRINE.aspects[body].join(" ")).map(([aspects, bodies]) => {
    const named = list(bodies.map((b) => NAMES[b]));
    const by = list(aspects.split(" ") as Aspect[], "or");
    return `${named} ${bodies.length > 1 ? "touch" : "touches"} a natal point by ${by}.`;
  });
  const orbs = grouped((body) => SKY_DOCTRINE.orbs[body]).map(([orb, bodies]) => `The orb is ${orb}° for ${list(bodies.map((b) => NAMES[b]))}.`);
  const points = list(SKY_DOCTRINE.targets.map((t) => NAMES[t]));
  return `- The sky Timeline reads. ${touches.join(" ")} ${orbs.join(" ")} The natal points are ${points}. An eclipse counts within ${SKY_DOCTRINE.eclipseNear}° of a natal point. Nothing else makes an event: no sextile, no move of the Moon, no minor body.`;
}

/** Under this age a time is a childhood's, read in a child's words (Review 05/10 §4). */
export const CHILD_UNDER = 16;

// The passes line is an astrology call Decided by Claude (Review 08/10 §1, ADR-392), so changing it takes a new
// Decisions row, not an edit here alone.
export const TIMELINE_DOCTRINE = `TIMELINE DOCTRINE (how to read the sky over one chart, never to be written down for the reader).

- A reading is about one event in the reader's own chart, found and dated by the engine: a slow planet near a natal point, ${list(SKY_DOCTRINE.retrogrades.map((b) => NAMES[b]), "or")} going back over part of the chart, an eclipse near a natal point, or a long cycle that brings a slow planet back round to where it was at birth. You read the event. You never add to it.
${skyLine()}
- What each planet brings as it passes. Mars: a few days of push and heat. Jupiter: growth, ease and more of something. Saturn: weight, effort and what lasts. Uranus: change and a want for more freedom. Neptune: blur, longing and going by feel. Pluto: slow, deep change.
- What each contact does. On the point, the planet's theme lands right on it. Square to it, the two rub and something has to adjust. Opposite it, the theme shows up through other people and asks for balance. Trine to it, the two work together easily.
- Where it lands. The Sun is how the reader sees themselves. The Moon is how they feel. Mercury is how they think and talk. Venus is love, pleasure and money. Mars is drive. Jupiter is hope and growth. Saturn is duty and structure. The Ascendant is how they come across. The Midheaven is work and direction.
- Read it by house. A house is one part of life. A contact touches two: the house of the natal point, where its theme lands, and the house the planet moves through, where the reader may notice it day to day. Name both, each with what it covers. When the planet moves into the next house while it is still close, name both in the order it reaches them.
- Stretches. THE EVENT gives each stretch the planet is within orb. With more than one, it comes close, moves off and comes back. Name a stretch by its own dates, never one long stretch from the first day to the last.
- Passes. ${list([...BACKWARDS_PASS_BODIES].map((b) => NAMES[b]))} can pass the same point more than once: forward, then backwards, then forward again. THE EVENT then says which way each pass goes and when the planet goes backwards. The first pass brings the theme up. A backwards pass brings it back, quieter and more inward: the reader may go over it alone instead of in the moment. The last forward pass is when it may settle. Where THE EVENT marks a pass backwards, say what that pass may change. Always "may": none of it is sure.
- Going back. Mercury going back is a second look at plans and messages. Venus going back is a rethink of what the reader values. Mars going back is slower energy. Read it through the houses it moves back over, in that order.
- An eclipse is a short burst of focus. A solar eclipse is about new starts. A lunar eclipse brings feelings up. Read it through its house and the natal point it is near.
- A long cycle starts a new round when the planet comes back to its place at birth. Halfway round, it is a time to see how far the reader has come. A quarter of the way round, plans adjust. Write to the cycle's plain word. The nodes reversed is not a return: the North Node stands where the South Node was at birth. Say so plainly, as THE EVENT does.
- A cycle behind the reader is read short and in the past tense, as a time that may have brought its theme up.
- A time before the reader was ${CHILD_UNDER} is a childhood. Read its houses in a child's words, as THE EVENT gives them: the 5th is play and making things, never romance.
- The tone (Light, Mixed or Heavy, the word on the card) comes from a fixed table. On a Light time, say how it helps. On a Heavy time, say what it asks of the reader. On a Mixed time, say what helps and what it asks. Never call a time lucky or unlucky, or good or bad as a whole, and never give it a score.
- A reading builds on the reader's report. Where a passage from it is given, say what it says and how this time meets it. Quote it only word for word: a few of its words, in double quotation marks.
- The style contract bends here, and only here. A reading has no claims, so the body names the event the way THE EVENT does: the planet, the point and the houses, each once where it first matters, each with its plain meaning. It may say once what the reader's report says. The line names no planet, sign, house or date. Every other rule holds.
- Time belongs to the sky. Name only the dates and degrees THE EVENT lists, each date with its year, and only as the sky's: when a planet reaches a point, turns or moves on. Never a date, month, year or age for something in the reader's life. Never a season, a holiday, a clock time or a day counted from today, like "next month" or "this week": the reading is kept and read later.
- Possibilities, not forecasts. Never say what will happen to the reader or to anyone in their life, and never promise how a time turns out. Say what the reader could notice or may feel, with could, might or may. Never will, is going to or very likely, and never a life event as the outcome.
- No do or don't. A reading answers no question and gives no advice: no should, must, need to, try, avoid or make sure, and no sentence that starts by telling the reader to do something. It ends on what the time could be a good time to do, as a possibility, which leaves the choice with the reader.
- A chart whose brief reads HORIZON: unknown has no house, no Ascendant and no Midheaven. Never name one, and never mention that the birth time is missing.`;

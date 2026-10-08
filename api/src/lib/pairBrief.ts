/**
 * The pair brief: everything the compatibility prompts are grounded in,
 * derived in code from two finished natal reports and their cached charts
 * (ADR-39). No chart is recomputed. Both foundations' theses, the cross
 * aspects with orbs, the whole-sign overlays in both directions, each side's
 * connectBestWith and theChallenge and its planets going backwards at birth,
 * every stored claim the pair may cite, the lens with its register, and under
 * the parent lens the child's age band.
 *
 * The head (`text`) is common to every call and sits first, so the parallel
 * calls share one cached prefix. Each chapter then gets its own tail
 * (`chapterBrief`): the links the foundation gave it, the claims of the
 * personal-report sections it draws on, its one scene and the band
 * (ADR-66, ADR-176). A blind chart on either side means the overlays and
 * every house-based line are omitted, not guessed (R-4.6).
 *
 * The two names and how they know each other are typed by a reader, so each
 * appears once, in its data block, and every other line says A or B (ADR-202).
 * That holds for the natal text quoted here too: a natal writer was shown its
 * reader's name and may have written it back (ADR-240).
 */
import { hasHorizon, type NatalChartData } from "./chartCalculation.js";
import type { ReportInterpretation } from "./aiInterpretation.js";
import { computeCrossAspects, type CrossAspect } from "./synastryCompute.js";
import { computeOverlays, notableOverlays, type NotableOverlay, type Overlay, type Side } from "./overlays.js";
import { SECTION_IDS, type StoredClaim } from "../prompts/index.js";
import { dataBlock, lettersNote, maskNames } from "../prompts/data.js";
import { BODY_LABELS, cap, ordinal, type Body } from "../prompts/vocabulary.js";

export type Lens = "partners" | "parent_child" | "people";

export const LENSES: readonly Lens[] = ["partners", "parent_child", "people"];

/** The child's age band, from the birth date at generation (ADR-67). */
export type Band = "little" | "school" | "teen" | "grown";
export const BANDS: readonly Band[] = ["little", "school", "teen", "grown"];
export const BAND_LABELS: Record<Band, string> = { little: "little (0 to 5)", school: "school (6 to 12)", teen: "teen (13 to 17)", grown: "grown (18 and over)" };

/** The example register every section of a lens writes in (ADR-40, ADR-68). */
export const LENS_REGISTER: Record<Lens, { label: string; examples: string[] }> = {
  partners: {
    label: "partners",
    examples: ["the end of a long day", "a bill", "an argument at 11 pm", "Friday with no plan", "a move"],
  },
  parent_child: {
    label: "parent and child",
    examples: ["bedtime", "the morning rush", "homework at the kitchen table", "the tablet", "the Sunday call"],
  },
  people: {
    label: "two people",
    examples: ["the big dinner", "the meeting where one goes quiet", "the weekend away", "the group chat", "the favour too big to ask"],
  },
};

/** The orb within which a cross aspect is drawn and may be cited (ADR-43). */
export const CROSS_ORB = 4;
/** How many cross aspects are drawn and carded: the strongest by the internal weighting, which only orders them. */
export const DRAWN_LINKS = 12;

/** Full years between a birth date and a moment, as a birthday is counted. */
export function ageAt(birthDate: string, at: Date): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = at.getUTCFullYear() - y;
  const beforeBirthday = at.getUTCMonth() + 1 < m || (at.getUTCMonth() + 1 === m && at.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

export function bandOf(birthDate: string, at: Date = new Date()): Band {
  const age = ageAt(birthDate, at);
  if (age <= 5) return "little";
  if (age <= 12) return "school";
  if (age <= 17) return "teen";
  return "grown";
}

/** A child under 3 is written as 3 (ADR-176): the youngest age any prompt states. */
export const YOUNGEST_WRITTEN_AGE = 3;

/** The child's age as prompt text states it; the band and everything stored keep the real age. */
export function writtenAge(age: number): number {
  return Math.max(YOUNGEST_WRITTEN_AGE, age);
}

export interface PairSide {
  name: string;
  chart: NatalChartData;
  interpretation: ReportInterpretation;
  blind: boolean;
  foundation: { chartThesis: string; dominantPattern: string; centralTension: string };
  connectBestWith: Array<{ item: string; reason: string }>;
  theChallenge: string;
  /** Every stored claim, by section, as the pair may cite it. */
  claims: Record<string, StoredClaim[]>;
  /** The planets going backwards at this person's birth, in the vocabulary's order (reading 5). */
  backwards: Body[];
}

/** One drawn link, numbered as the brief lists it, keyed as a claim's reference resolves to it. */
export interface LinkRef {
  n: number;
  key: string;
  label: string;
  kind: "aspect" | "overlay";
}

export interface PairBrief {
  /** The common head: the pair, the lens, both sides, every link numbered. */
  text: string;
  lens: Lens;
  /** Under the parent_child lens, which side is the parent. */
  parent: Side | null;
  /** The free label: how two people know each other (family, friends, colleagues). */
  label: string | null;
  /** The child's band under the parent lens, null under the other two. */
  band: Band | null;
  /** The child's age in years on the day of generation, null under the other two lenses (ADR-83). */
  childAge: number | null;
  a: PairSide;
  b: PairSide;
  /** The drawn cross aspects: within orb, the strongest first, at most DRAWN_LINKS. */
  cross: CrossAspect[];
  overlays: Overlay[];
  notable: NotableOverlay[];
  /** The numbered links: the cross aspects, then the notable overlays. */
  links: LinkRef[];
  /** Either chart is blind: no overlays, no house line anywhere. */
  blind: boolean;
  /** Chapter id to the link keys it owns, set once the foundation has allocated them (ADR-66). */
  allocation?: Record<string, string[]>;
}

export interface PairInput {
  lens: Lens;
  parent?: Side | null;
  label?: string | null;
  /** When the report is written; the band is derived against it. Defaults to now. */
  at?: Date;
  a: { name: string; birthDate?: string; chart: NatalChartData; interpretation: ReportInterpretation };
  b: { name: string; birthDate?: string; chart: NatalChartData; interpretation: ReportInterpretation };
}

/**
 * The planets a link can read going backwards: the Sun and Moon never do, the nodes always do and are never read,
 * and Chiron sits in no link (reading 5).
 */
const BACKWARDS_BODIES: readonly Body[] = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

function side(input: PairInput["a"]): PairSide {
  const i = input.interpretation;
  const claims: Record<string, StoredClaim[]> = {};
  for (const id of SECTION_IDS) {
    const section = (i as unknown as Record<string, { claims?: StoredClaim[] } | undefined>)[id];
    if (section?.claims?.length) claims[id] = section.claims;
  }
  return {
    name: input.name,
    chart: input.chart,
    interpretation: i,
    blind: !hasHorizon(input.chart),
    foundation: {
      chartThesis: i.foundation?.chartThesis ?? "",
      dominantPattern: i.foundation?.dominantPattern ?? "",
      centralTension: i.foundation?.centralTension ?? "",
    },
    connectBestWith: i.relationships?.connectBestWith ?? [],
    theChallenge: i.relationships?.theChallenge ?? "",
    claims,
    backwards: BACKWARDS_BODIES.filter((b) => input.chart.planets[b]?.retrograde === true),
  };
}

interface Quoter {
  quote: (text: string) => string;
  /** Whether any quoted text had a name to letter, so the writer is asked for the names back. */
  lettered: () => boolean;
}

/**
 * Natal text as a pair prompt quotes it, each typed name as its letter. Only
 * the prompt changes: the sides keep the stored text, which the source labels
 * and the claim checks read.
 */
function quoter(a: PairSide, b: PairSide): Quoter {
  const names = { a: a.name, b: b.name };
  let lettered = false;
  return {
    quote: (text) => {
      const masked = maskNames(text, names);
      lettered ||= masked !== text;
      return masked;
    },
    lettered: () => lettered,
  };
}

const label = (b: string): string => BODY_LABELS[b as Body] ?? cap(b);

/** A luminary leads a notable overlay's card when the group holds one. */
function leadBody(planets: Body[]): Body {
  return planets.find((p) => p === "sun" || p === "moon") ?? planets[0];
}

export function aspectKey(planetA: string, aspect: string, planetB: string): string {
  return `aspect:${planetA}:${aspect}:${planetB}`;
}

export function overlayKey(of: Side, planet: string, inHouseOf: Side): string {
  return `overlay:${of}:${planet}:${inHouseOf}`;
}

function linkRefs(cross: CrossAspect[], notable: NotableOverlay[], blind: boolean): LinkRef[] {
  const out: LinkRef[] = cross.map((c, i) => ({
    n: i + 1, kind: "aspect",
    key: aspectKey(c.planetA, c.type, c.planetB),
    label: `A ${label(c.planetA)} ${c.type} B ${label(c.planetB)} (orb ${c.orb.toFixed(1)})`,
  }));
  if (!blind) {
    for (const n of notable) {
      const lead = leadBody(n.planets);
      const rest = n.planets.filter((p) => p !== lead);
      out.push({
        n: out.length + 1, kind: "overlay",
        key: overlayKey(n.of, lead, n.inHouseOf),
        label: `${n.of} ${label(lead)} in ${n.inHouseOf}'s ${ordinal(n.house)} house${rest.length ? ` (with ${rest.map(label).join(", ")})` : ""}`,
      });
    }
  }
  return out;
}

export function buildPairBrief(input: PairInput): PairBrief {
  const a = side(input.a);
  const b = side(input.b);
  const blind = a.blind || b.blind;
  const cross = computeCrossAspects(a.chart, b.chart).filter((c) => c.orb <= CROSS_ORB).slice(0, DRAWN_LINKS);
  const overlays = blind ? [] : computeOverlays(a.chart, b.chart);
  const notable = notableOverlays(overlays);
  const register = LENS_REGISTER[input.lens];
  const parent = input.lens === "parent_child" ? (input.parent ?? "A") : null;
  const links = linkRefs(cross, notable, blind);

  let band: Band | null = null;
  let childAge: number | null = null;
  if (parent) {
    const child = parent === "A" ? input.b : input.a;
    if (!child.birthDate) throw new Error("the parent and child lens needs the child's birth date to set the band");
    const at = input.at ?? new Date();
    band = bandOf(child.birthDate, at);
    childAge = ageAt(child.birthDate, at);
  }

  const placement = (s: PairSide, body: Body) => {
    const p = s.chart.planets[body];
    return p ? `${label(body)} ${p.degree.toFixed(1)} ${p.sign}${p.house !== undefined && !blind ? `, ${ordinal(p.house)} house` : ""}` : null;
  };
  const placements = (s: PairSide) => (["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"] as Body[])
    .map((body) => placement(s, body)).filter((l): l is string => l !== null).map((l) => `  - ${l}`);
  const quoted = quoter(a, b);
  const sideLines = (tag: Side, s: PairSide) => [
    `${tag}:`,
    `  thesis: ${quoted.quote(s.foundation.chartThesis)}`,
    `  pattern: ${quoted.quote(s.foundation.dominantPattern)}`,
    `  tension: ${quoted.quote(s.foundation.centralTension)}`,
    `  the challenge in intimacy: ${quoted.quote(s.theChallenge)}`,
    `  connects best with: ${s.connectBestWith.map((c) => `${quoted.quote(c.item)} (${quoted.quote(c.reason)})`).join(", ") || "not stated"}`,
    ...placements(s),
    `  going backwards at birth: ${s.backwards.map(label).join(", ") || "none"}`,
  ];
  const sides = [...sideLines("A", a), ``, ...sideLines("B", b)];

  const lines = [
    `PAIR: A and B. LENS: ${register.label}.`,
    `A's name:`,
    dataBlock("name", a.name),
    `B's name:`,
    dataBlock("name", b.name),
    ...(parent ? [`${parent} is the parent. ${parent === "A" ? "B" : "A"} is the child, ${writtenAge(childAge!)} years old on the day this is written, in the ${BAND_LABELS[band!]} band. Read the child's chart as potential, never a verdict. Write for this age now. A later stage may be discussed, framed as later${band === "grown" ? ". Childhood is past tense only" : ""}.`] : []),
    ...(input.lens === "people" && input.label ? [`How they know each other:`, dataBlock("label", input.label)] : []),
    `EXAMPLE REGISTER (every example in every section comes from here): ${register.examples.join(", ")}.`,
    ...(blind ? [`HORIZON: one chart has no recorded birth time, so there are no houses across the pair. Never name a house or an overlay.`] : []),
    ``,
    ...sides,
    // A writer borrows a person's own words from these lines, and would borrow a letter with them.
    ...(quoted.lettered() ? [lettersNote("the personal reports' lines above")] : []),
    ``,
    `LINKS, numbered (the cross aspects within ${CROSS_ORB} degrees, strongest first, A's body then B's, then the notable overlays):`,
    ...(links.length ? links.map((l) => `  - L${l.n}: ${l.label}`) : ["  - none within orb"]),
  ];
  if (!blind) {
    lines.push(
      ``,
      `OVERLAYS (whole-sign, each person's bodies in the other's houses):`,
      ...overlays.filter((o) => o.of === "A").map((o) => `  - A ${label(o.planet)} falls in B's ${ordinal(o.house)} house`),
      ...overlays.filter((o) => o.of === "B").map((o) => `  - B ${label(o.planet)} falls in A's ${ordinal(o.house)} house`),
    );
  }

  return { text: lines.join("\n"), lens: input.lens, parent, label: input.label ?? null, band, childAge, a, b, cross, overlays, notable, links, blind };
}

/**
 * The claim lines of one side, for the sections named; every section when none
 * are. A quote is natal text, so its names are lettered; a label is composed in
 * code and stays as stored.
 */
export function claimLines(brief: PairBrief, s: PairSide, tag: Side, sections?: readonly string[], quote: (text: string) => string = quoter(brief.a, brief.b).quote): string[] {
  // Across a blind pair the labels stay out: a drawn report's own evidence names houses, and no house is spoken of here.
  return Object.entries(s.claims)
    .filter(([section]) => !sections || sections.includes(section))
    .flatMap(([section, list]) => list.map((c, i) => `  - ${tag}/${section} claim ${i + 1}: "${quote(c.quote)}"${brief.blind ? "" : ` (${c.evidence.map((e) => e.label).join(". ")})`}`));
}

export interface ChapterTail {
  /** The link keys this chapter owns. */
  owned: string[];
  /** The personal-report sections whose claims the chapter may draw on; every section when undefined. */
  draws?: readonly string[];
  /** A lens chapter's one scene (ADR-176). */
  scene?: string;
}

/**
 * The chapter's own part of the brief (ADR-66): its links and nothing
 * else's, the claims of the sections it draws on, its scene, the band.
 */
export function chapterBrief(brief: PairBrief, tail: ChapterTail): string {
  const owned = brief.links.filter((l) => tail.owned.includes(l.key));
  const quoted = quoter(brief.a, brief.b);
  const claims = [...claimLines(brief, brief.a, "A", tail.draws, quoted.quote), ...claimLines(brief, brief.b, "B", tail.draws, quoted.quote)];
  const lines = [
    `THIS CHAPTER'S LINKS (the only cross aspects and overlays this chapter may cite):`,
    ...(owned.length ? owned.map((l) => `  - L${l.n}: ${l.label}`) : ["  - none: cite sources only"]),
    ``,
    `CLAIMS FROM THE PERSONAL REPORTS this chapter draws on, citable as source evidence (report, section, claim number):`,
    ...claims,
    // A card line and a because-line copy a claim's words, and would copy a letter with them.
    ...(quoted.lettered() ? [lettersNote("these claims")] : []),
  ];
  if (tail.scene) lines.push(``, `SCENE for this chapter (write this one and no other): ${tail.scene}`);
  if (brief.band) lines.push(``, `BAND: the child is in the ${BAND_LABELS[brief.band]} band${brief.childAge !== null ? `, ${writtenAge(brief.childAge)} years old today` : ""}. Write for this age now. Later stages only as later.`);
  return lines.join("\n");
}

/** A planet going backwards at one person's birth, and the numbers of the links that read it, strongest first. */
export interface BackwardsRead {
  side: Side;
  body: Body;
  links: number[];
}

/** The bodies a link reads, each with its side: an aspect's two, an overlay's whole group. */
function bodiesRead(brief: PairBrief, link: LinkRef): Array<{ side: Side; body: Body }> {
  if (link.kind === "aspect") {
    const c = brief.cross[link.n - 1];
    return c ? [{ side: "A", body: c.planetA }, { side: "B", body: c.planetB }] : [];
  }
  const o = brief.notable[link.n - 1 - brief.cross.length];
  return o ? o.planets.map((body) => ({ side: o.of, body })) : [];
}

/** The planets going backwards at birth that these links read, each once, in the order of its strongest link. */
export function backwardsRead(brief: PairBrief, keys: readonly string[]): BackwardsRead[] {
  const found = new Map<string, BackwardsRead>();
  for (const link of brief.links) {
    if (!keys.includes(link.key)) continue;
    for (const { side, body } of bodiesRead(brief, link)) {
      if (!(side === "A" ? brief.a : brief.b).backwards.includes(body)) continue;
      const seen = found.get(`${side}:${body}`);
      if (seen) seen.links.push(link.n);
      else found.set(`${side}:${body}`, { side, body, links: [link.n] });
    }
  }
  return [...found.values()];
}

/**
 * Which planet going backwards each lens chapter says, the chapters' links given in report order (review-05-10 §10,
 * reading 5): one sentence where a chapter reads one, each planet once in the report and one a chapter at most, so
 * the chapters, written in parallel, neither crowd one scene nor repeat each other (style rule 9). A chapter takes,
 * of the planets no earlier chapter took, the one the fewest later chapters could take, then its strongest link's.
 */
export function backwardsByChapter(brief: PairBrief, owned: readonly (readonly string[])[]): Array<BackwardsRead | null> {
  const reads = owned.map((keys) => backwardsRead(brief, keys));
  const idOf = (r: BackwardsRead) => `${r.side}:${r.body}`;
  const taken = new Set<string>();
  return reads.map((mine, i) => {
    const later = (r: BackwardsRead) => reads.slice(i + 1).filter((rs) => rs.some((x) => idOf(x) === idOf(r))).length;
    const pick = mine.filter((r) => !taken.has(idOf(r))).sort((x, y) => later(x) - later(y) || x.links[0] - y.links[0])[0] ?? null;
    if (pick) taken.add(idOf(pick));
    return pick;
  });
}

/** The line a lens chapter's prompt carries for the planet going backwards it says, by letter (ADR-202). */
export function backwardsLine(r: BackwardsRead): string {
  return `GOING BACKWARDS: ${r.side}'s ${label(r.body)} was going backwards when ${r.side} was born, and this chapter reads it (${r.links.map((n) => `L${n}`).join(", ")}). Say so once, in one sentence where it fits: what it means for that planet, in plain words, and how it plays out between the two of them. No other chapter says it.`;
}

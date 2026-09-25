/**
 * The pair brief: everything the compatibility prompts are grounded in,
 * derived in code from two finished natal reports and their cached charts
 * (ADR-39). No chart is recomputed. Both foundations' theses, the cross
 * aspects with orbs, the whole-sign overlays in both directions, each side's
 * connectBestWith and theChallenge, every stored claim the pair may cite, the
 * lens with its register, and under the parent lens the child's age band.
 *
 * The head (`text`) is common to every call and sits first, so the parallel
 * calls share one cached prefix. Each chapter then gets its own tail
 * (`chapterBrief`): the links the foundation gave it, the claims of the
 * personal-report sections it draws on, its three scenes and the band
 * (ADR-66). A blind chart on either side means the overlays and every
 * house-based line are omitted, not guessed (R-4.6).
 */
import { hasHorizon, type NatalChartData } from "./chartCalculation.js";
import type { ReportInterpretation } from "./aiInterpretation.js";
import { computeCrossAspects, type CrossAspect } from "./synastryCompute.js";
import { computeOverlays, notableOverlays, type NotableOverlay, type Overlay, type Side } from "./overlays.js";
import { SECTION_IDS, type StoredClaim } from "../prompts/index.js";
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

  const who = (s: Side) => (s === "A" ? a.name : b.name);
  const placement = (s: PairSide, body: Body) => {
    const p = s.chart.planets[body];
    return p ? `${label(body)} ${p.degree.toFixed(1)} ${p.sign}${p.house !== undefined && !blind ? `, ${ordinal(p.house)} house` : ""}` : null;
  };
  const placements = (s: PairSide) => (["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"] as Body[])
    .map((body) => placement(s, body)).filter((l): l is string => l !== null).map((l) => `  - ${l}`);

  const lines = [
    `PAIR: A is ${a.name}. B is ${b.name}. LENS: ${register.label}.`,
    ...(parent ? [`${who(parent)} is the parent; ${who(parent === "A" ? "B" : "A")} is the child, ${childAge} years old on the day this is written, in the ${BAND_LABELS[band!]} band. Read the child's chart as potential, never a verdict. Write for this age now; a later stage may be discussed, framed as later${band === "grown" ? "; childhood is past tense only" : ""}.`] : []),
    ...(input.lens === "people" && input.label ? [`How they know each other: ${input.label}.`] : []),
    `EXAMPLE REGISTER (every example in every section comes from here): ${register.examples.join(", ")}.`,
    ...(blind ? [`HORIZON: one chart has no recorded birth time, so there are no houses across the pair. Never name a house or an overlay.`] : []),
    ``,
    `A, ${a.name}:`,
    `  thesis: ${a.foundation.chartThesis}`,
    `  pattern: ${a.foundation.dominantPattern}`,
    `  tension: ${a.foundation.centralTension}`,
    `  the challenge in intimacy: ${a.theChallenge}`,
    `  connects best with: ${a.connectBestWith.map((c) => `${c.item} (${c.reason})`).join("; ") || "not stated"}`,
    ...placements(a),
    ``,
    `B, ${b.name}:`,
    `  thesis: ${b.foundation.chartThesis}`,
    `  pattern: ${b.foundation.dominantPattern}`,
    `  tension: ${b.foundation.centralTension}`,
    `  the challenge in intimacy: ${b.theChallenge}`,
    `  connects best with: ${b.connectBestWith.map((c) => `${c.item} (${c.reason})`).join("; ") || "not stated"}`,
    ...placements(b),
    ``,
    `LINKS, numbered (the cross aspects within ${CROSS_ORB} degrees, strongest first, A's body then B's; then the notable overlays):`,
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

/** The claim lines of one side, for the sections named; every section when none are. */
export function claimLines(brief: PairBrief, s: PairSide, tag: Side, sections?: readonly string[]): string[] {
  // Across a blind pair the labels stay out: a drawn report's own evidence names houses, and no house is spoken of here.
  return Object.entries(s.claims)
    .filter(([section]) => !sections || sections.includes(section))
    .flatMap(([section, list]) => list.map((c, i) => `  - ${tag}/${section} claim ${i + 1}: "${c.quote}"${brief.blind ? "" : ` (${c.evidence.map((e) => e.label).join("; ")})`}`));
}

export interface ChapterTail {
  /** The link keys this chapter owns. */
  owned: string[];
  /** The personal-report sections whose claims the chapter may draw on; every section when undefined. */
  draws?: readonly string[];
  /** The three scenes and which one the foundation chose, for a lens chapter. */
  scenes?: { titles: readonly string[]; written: number };
}

/**
 * The chapter's own part of the brief (ADR-66): its links and nothing
 * else's, the claims of the sections it draws on, its scenes, the band.
 */
export function chapterBrief(brief: PairBrief, tail: ChapterTail): string {
  const owned = brief.links.filter((l) => tail.owned.includes(l.key));
  const lines = [
    `THIS CHAPTER'S LINKS (the only cross aspects and overlays this chapter may cite):`,
    ...(owned.length ? owned.map((l) => `  - L${l.n}: ${l.label}`) : ["  - none: cite sources only"]),
    ``,
    `CLAIMS FROM THE PERSONAL REPORTS this chapter draws on, citable as source evidence (report, section, claim number):`,
    ...claimLines(brief, brief.a, "A", tail.draws),
    ...claimLines(brief, brief.b, "B", tail.draws),
  ];
  if (tail.scenes) {
    lines.push(``, `SCENES for this chapter (write the one marked chosen; the other two are not written here):`);
    tail.scenes.titles.forEach((t, i) => lines.push(`  ${i + 1}. ${t}${i === tail.scenes!.written ? "  <- chosen" : ""}`));
  }
  if (brief.band) lines.push(``, `BAND: the child is in the ${BAND_LABELS[brief.band]} band${brief.childAge !== null ? `, ${brief.childAge} years old today` : ""}. Write for this age now; later stages only as later.`);
  return lines.join("\n");
}

/**
 * The pair brief: everything the compatibility prompts are grounded in,
 * derived in code from two finished natal reports and their cached charts
 * (ADR-39). No birth data is read and no chart is recomputed. Both
 * foundations' theses, the cross aspects with orbs, the whole-sign overlays
 * in both directions, each side's connectBestWith and theChallenge, every
 * stored claim the pair may cite, and the lens with its register.
 *
 * A blind chart on either side means the overlays and every house-based
 * line are omitted, not guessed (R-4.6).
 */
import { hasHorizon, type NatalChartData } from "./chartCalculation.js";
import type { ReportInterpretation } from "./aiInterpretation.js";
import { computeCrossAspects, type CrossAspect } from "./synastryCompute.js";
import { computeOverlays, notableOverlays, type NotableOverlay, type Overlay, type Side } from "./overlays.js";
import { SECTION_IDS, type StoredClaim } from "../prompts/index.js";
import { BODY_LABELS, cap, ordinal, type Body } from "../prompts/vocabulary.js";

export type Lens = "partners" | "parent_child" | "family";

export const LENSES: readonly Lens[] = ["partners", "parent_child", "family"];

/** The example register every section of a lens writes in (ADR-40). */
export const LENS_REGISTER: Record<Lens, { label: string; examples: string[]; chapterSeven: string; chapterEight: string }> = {
  partners: {
    label: "partners",
    examples: ["a weekend", "a bill", "an argument at 11 pm", "a move"],
    chapterSeven: "Love and closeness",
    chapterEight: "Building a life",
  },
  parent_child: {
    label: "parent and child",
    examples: ["bedtime", "homework", "a tantrum", "praise", "a first heartbreak"],
    chapterSeven: "What this child needs",
    chapterEight: "How you parent them",
  },
  family: {
    label: "family",
    examples: ["a dinner", "a gift", "the group chat", "a shared care duty", "the conversation nobody starts"],
    chapterSeven: "Being family",
    chapterEight: "Gatherings, gifts and hard talks",
  },
};

/** The orb within which a cross aspect is drawn and may be cited (ADR-43). */
export const CROSS_ORB = 4;

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

export interface PairBrief {
  text: string;
  lens: Lens;
  /** Under the parent_child lens, which side is the parent. */
  parent: Side | null;
  a: PairSide;
  b: PairSide;
  /** Cross aspects within the drawn orb, strongest first. */
  cross: CrossAspect[];
  overlays: Overlay[];
  notable: NotableOverlay[];
  /** Either chart is blind: no overlays, no house line anywhere. */
  blind: boolean;
}

export interface PairInput {
  lens: Lens;
  parent?: Side | null;
  a: { name: string; chart: NatalChartData; interpretation: ReportInterpretation };
  b: { name: string; chart: NatalChartData; interpretation: ReportInterpretation };
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

export function buildPairBrief(input: PairInput): PairBrief {
  const a = side(input.a);
  const b = side(input.b);
  const blind = a.blind || b.blind;
  const cross = computeCrossAspects(a.chart, b.chart).filter((c) => c.orb <= CROSS_ORB);
  const overlays = blind ? [] : computeOverlays(a.chart, b.chart);
  const notable = notableOverlays(overlays);
  const register = LENS_REGISTER[input.lens];
  const parent = input.lens === "parent_child" ? (input.parent ?? "A") : null;

  const who = (s: Side) => (s === "A" ? a.name : b.name);
  const placement = (s: PairSide, body: Body) => {
    const p = s.chart.planets[body];
    return p ? `${label(body)} ${p.degree.toFixed(1)} ${p.sign}${p.house !== undefined && !blind ? `, ${ordinal(p.house)} house` : ""}` : null;
  };
  const placements = (s: PairSide) => (["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"] as Body[])
    .map((body) => placement(s, body)).filter((l): l is string => l !== null).map((l) => `  - ${l}`);
  // Across a blind pair the labels stay out: a drawn report's own evidence names houses, and no house is spoken of here.
  const claimLines = (s: PairSide, tag: Side) => Object.entries(s.claims).flatMap(([section, list]) =>
    list.map((c, i) => `  - ${tag}/${section} claim ${i + 1}: "${c.quote}"${blind ? "" : ` (${c.evidence.map((e) => e.label).join("; ")})`}`));

  const lines = [
    `PAIR: A is ${a.name}. B is ${b.name}. LENS: ${register.label}.`,
    ...(parent ? [`${who(parent)} is the parent; ${who(parent === "A" ? "B" : "A")} is the child. Read the child's chart as potential, never a verdict.`] : []),
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
    `CROSS ASPECTS within ${CROSS_ORB} degrees, strongest first (A's body first, then B's):`,
    ...(cross.length ? cross.map((c) => `  - A ${label(c.planetA)} ${c.type} B ${label(c.planetB)} (orb ${c.orb.toFixed(1)})`) : ["  - none within orb"]),
  ];
  if (!blind) {
    lines.push(
      ``,
      `OVERLAYS (whole-sign, each person's bodies in the other's houses):`,
      ...overlays.filter((o) => o.of === "A").map((o) => `  - A ${label(o.planet)} falls in B's ${ordinal(o.house)} house`),
      ...overlays.filter((o) => o.of === "B").map((o) => `  - B ${label(o.planet)} falls in A's ${ordinal(o.house)} house`),
      `NOTABLE OVERLAYS (a luminary, or three or more bodies in one house):`,
      ...(notable.length ? notable.map((n) => `  - ${n.of} ${n.planets.map(label).join(", ")} in ${n.inHouseOf}'s ${ordinal(n.house)} house`) : ["  - none"]),
    );
  }
  lines.push(
    ``,
    `NATAL CLAIMS you may cite as source evidence (report, section, claim number):`,
    ...claimLines(a, "A"),
    ...claimLines(b, "B"),
  );

  return { text: lines.join("\n"), lens: input.lens, parent, a, b, cross, overlays, notable, blind };
}

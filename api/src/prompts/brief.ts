/**
 * The chart brief: everything variable about one person's chart, composed
 * deterministically from the computed chart, the traditional derivation and
 * the vocabulary. No AI, no database, synchronous.
 *
 * This is the VARIABLE tail of every prompt. The vocabulary itself lives in
 * the static system block and is referenced here by name, never repeated, so
 * the brief stays small and the cached prefix stays byte-identical across
 * charts.
 *
 * It also produces the wheel-facing composed text (per-planet cards, per-
 * aspect payloads, angle meanings) that the report page renders without any
 * further generation.
 */
import type { NatalChartData } from "../lib/chartCalculation.js";
import { deriveTraditional, type TraditionalFactors } from "../lib/traditional.js";
import {
  ASPECT, BODY, BODY_LABELS, HOUSE, SIGN, STRUCTURE, BODIES,
  cap, ordinal, type AspectName, type Body, type SignName,
} from "./vocabulary.js";

export interface AspectMeaningPayload {
  dynamic: string;
  tension: string;
  behavior: string;
  growth: string;
}

export interface AngleMeanings {
  ascendant: { firstImpression: string; orientationStyle: string; atYourBest: string; underStress: string };
  midheaven: { publicDirection: string; whereYouThrive: string; atYourBest: string; underPressure: string };
}

export interface ChartBrief {
  /** The variable prompt tail. */
  text: string;
  /** Derived factors, for anything that wants them structured. */
  traditional: TraditionalFactors;
  /** One composed sentence pair per body, for the wheel. */
  personalPlanets: Record<string, string>;
  /** Composed payload per top aspect, keyed `${p1}_${type}_${p2}` in chart order. */
  aspectMeanings: Record<string, AspectMeaningPayload>;
  angleMeanings: AngleMeanings;
  /** Bodies sharing a sign or house, three or more. */
  stelliums: string[];
  emptyHouses: number[];
}

const SHAPE_KEY: Record<string, string> = {
  bundle: "shape_bundle", bowl: "shape_bowl", bucket: "shape_bucket",
  locomotive: "shape_locomotive", seesaw: "shape_seesaw", splash: "shape_splash", splay: "shape_splay",
};

function sig(name: string): SignName {
  return name.toLowerCase() as SignName;
}

function isBody(n: string): n is Body {
  return (BODIES as readonly string[]).includes(n);
}

export function buildBrief(chart: NatalChartData, name: string): ChartBrief {
  const t = deriveTraditional(chart);
  const dignity = new Map(t.planets.map((p) => [p.planet as string, p]));
  const asc = chart.angles.ascendant;
  const mc = chart.angles.midheaven;

  // --- stelliums and empty houses -----------------------------------------
  const bySign = new Map<string, string[]>();
  const byHouse = new Map<number, string[]>();
  for (const b of BODIES) {
    const p = chart.planets[b];
    if (!p || b === "south_node") continue;
    bySign.set(p.sign, [...(bySign.get(p.sign) ?? []), b]);
    byHouse.set(p.house, [...(byHouse.get(p.house) ?? []), b]);
  }
  const stelliums: string[] = [];
  for (const [s, bodies] of bySign) if (bodies.length >= 3) stelliums.push(`${s}: ${bodies.map((b) => BODY_LABELS[b as Body]).join(", ")}`);
  for (const [h, bodies] of byHouse) if (bodies.length >= 3) stelliums.push(`${ordinal(h)} house: ${bodies.map((b) => BODY_LABELS[b as Body]).join(", ")}`);
  const emptyHouses: number[] = [];
  for (let h = 1; h <= 12; h++) if (!byHouse.has(h)) emptyHouses.push(h);

  // --- placements -----------------------------------------------------------
  const placementLines: string[] = [];
  const personalPlanets: Record<string, string> = {};
  for (const b of BODIES) {
    const p = chart.planets[b];
    if (!p) continue;
    const d = dignity.get(b);
    const bits = [
      `${BODY_LABELS[b]} ${p.degree.toFixed(1)} ${p.sign}, ${ordinal(p.house)} house`,
      d ? d.dignity : null,
      d?.inSect === true ? "in sect" : d?.inSect === false ? "contrary to sect" : null,
      p.retrograde && b !== "north_node" && b !== "south_node" ? "retrograde" : null,
    ].filter(Boolean);
    placementLines.push(`- ${bits.join(", ")}`);
    personalPlanets[b] = `${BODY[b].short} ${SIGN[sig(p.sign)].short} ${HOUSE[p.house].short}`;
  }

  // --- house rulers ---------------------------------------------------------
  const rulerLines = t.houseRulers.map((r) =>
    `- ${ordinal(r.house)} (${cap(r.sign)}) ruled by ${BODY_LABELS[r.ruler]}, which sits in ${cap(r.rulerSign)} in the ${ordinal(r.rulerHouse)}, ${r.rulerDignity}${r.inOwnHouse ? ", in its own house" : ""}`,
  );

  // --- aspects --------------------------------------------------------------
  const topAspects = chart.aspects.slice(0, 12);
  const aspectLines = topAspects.map((a) =>
    `- ${BODY_LABELS[a.planet1 as Body] ?? cap(a.planet1)} ${a.type} ${BODY_LABELS[a.planet2 as Body] ?? cap(a.planet2)} (orb ${a.orb.toFixed(1)}, ${a.applying ? "applying" : "separating"})`,
  );
  const aspectMeanings: Record<string, AspectMeaningPayload> = {};
  for (const a of topAspects) {
    const e = ASPECT[a.type as AspectName];
    if (!e || !isBody(a.planet1) || !isBody(a.planet2)) continue;
    const p1 = BODY_LABELS[a.planet1], p2 = BODY_LABELS[a.planet2];
    aspectMeanings[`${a.planet1}_${a.type}_${a.planet2}`] = {
      dynamic: `${p1} and ${p2}. ${BODY[a.planet1].short} ${BODY[a.planet2].short} ${e.dynamic}`,
      tension: e.underStress,
      behavior: e.inFlow,
      growth: e.growth,
    };
  }

  // --- angles ---------------------------------------------------------------
  const cr = t.chartRuler;
  const tenth = t.houseRulers[9];
  const angleMeanings: AngleMeanings = {
    ascendant: {
      firstImpression: `${cap(asc.sign)} rising. ${SIGN[sig(asc.sign)].short}`,
      orientationStyle: `The chart ruler is ${BODY_LABELS[cr.ruler]}, in ${cap(cr.rulerSign)} in the ${ordinal(cr.rulerHouse)}, ${cr.rulerDignity}. ${BODY[cr.ruler].short}`,
      atYourBest: SIGN[sig(asc.sign)].full.split(". ").slice(1, 3).join(". ") + ".",
      underStress: SIGN[sig(asc.sign)].full.split("Under strain")[1]?.trim().replace(/^it becomes/, "Under strain this becomes") ?? "",
    },
    midheaven: {
      publicDirection: `Midheaven in ${cap(mc.sign)}. ${SIGN[sig(mc.sign)].short}`,
      whereYouThrive: `The 10th is ruled by ${BODY_LABELS[tenth.ruler]}, in ${cap(tenth.rulerSign)} in the ${ordinal(tenth.rulerHouse)}, ${tenth.rulerDignity}. ${HOUSE[tenth.rulerHouse].short}`,
      atYourBest: BODY[tenth.ruler].short,
      underPressure: STRUCTURE[tenth.rulerDignity]?.short ?? "",
    },
  };

  // --- the text -------------------------------------------------------------
  const el = chart.elements, mo = chart.modalities;
  const shapeKey = chart.chartShape ? SHAPE_KEY[chart.chartShape] : undefined;
  const lines = [
    `NAME: ${name}`,
    ``,
    `SECT: ${t.sect.sect} chart. Sect light ${cap(t.sect.light)}. Benefic of sect ${cap(t.sect.beneficOfSect)}. Malefic contrary to sect ${cap(t.sect.maleficContrary)}. (See ${t.sect.sect === "day" ? "sect_day" : "sect_night"}.)`,
    `ANGLES: Ascendant ${asc.degree.toFixed(1)} ${asc.sign}. Midheaven ${mc.degree.toFixed(1)} ${mc.sign}. Houses are whole-sign.`,
    `CHART RULER: ${BODY_LABELS[cr.ruler]} in ${cap(cr.rulerSign)}, ${ordinal(cr.rulerHouse)} house, ${cr.rulerDignity}${dignity.get(cr.ruler)?.inSect === false ? ", contrary to sect" : dignity.get(cr.ruler)?.inSect === true ? ", in sect" : ""}.`,
    ``,
    `PLACEMENTS:`,
    ...placementLines,
    ``,
    `HOUSE RULERS (read each house through its ruler):`,
    ...rulerLines,
    ``,
    `LOTS: Fortune ${t.lots.fortune.degree.toFixed(1)} ${cap(t.lots.fortune.sign)}, ${ordinal(t.lots.fortune.house)} house. Spirit ${t.lots.spirit.degree.toFixed(1)} ${cap(t.lots.spirit.sign)}, ${ordinal(t.lots.spirit.house)} house.`,
    ``,
    `ASPECTS (strongest first):`,
    ...aspectLines,
    ``,
    `DISTRIBUTION: Fire ${el.fire}, Earth ${el.earth}, Air ${el.air}, Water ${el.water}. Cardinal ${mo.cardinal}, Fixed ${mo.fixed}, Mutable ${mo.mutable}. Dominant element ${chart.dominance.dominantElement}. Chart shape ${chart.chartShape ?? "unclassified"}${shapeKey ? ` (see ${shapeKey})` : ""}.`,
    stelliums.length ? `STELLIUMS: ${stelliums.join("; ")}.` : `STELLIUMS: none.`,
    `EMPTY HOUSES: ${emptyHouses.length ? emptyHouses.map(ordinal).join(", ") : "none"}. Read each through its ruler above.`,
  ];

  return { text: lines.join("\n"), traditional: t, personalPlanets, aspectMeanings, angleMeanings, stelliums, emptyHouses };
}

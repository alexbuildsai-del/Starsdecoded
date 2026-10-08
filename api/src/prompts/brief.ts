/**
 * The chart brief: everything variable about one person's chart, composed
 * deterministically from the computed chart, the traditional derivation and
 * the vocabulary. No AI, no database, synchronous.
 *
 * This is the VARIABLE tail of every prompt. The vocabulary itself lives in
 * the static system block and is referenced here by name, never repeated, so
 * the brief stays small and the cached prefix stays byte-identical across
 * charts. The name is the one thing a reader typed, so it reaches the model
 * only inside its data block (ADR-202).
 *
 * It also produces the wheel-facing composed text (per-planet cards, per-
 * aspect payloads, angle meanings) that the report page renders without any
 * further generation.
 */
import {
  chartPatterns, COMFORT, comfortOf, hasHorizon,
  type ChartPatterns, type ComfortPlanet, type NatalChartData,
} from "../lib/chartCalculation.js";
import { deriveTraditional, sectPayload, type Dignity, type SectPayload, type TraditionalFactors } from "../lib/traditional.js";
import {
  ASPECT, BODY, BODY_LABELS, HOUSE, SIGN, SIGNS, STRUCTURE, BODIES,
  cap, ordinal, type AspectName, type Body, type SignName,
} from "./vocabulary.js";
import { dataBlock } from "./data.js";
import { observationsFor, type ObservationKey } from "./observations.js";
import { pickScenes, type Scene, type SceneType } from "./scenes.js";

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
  /** The computed chart, for validators. */
  chart: NatalChartData;
  /** The horizon status the brief was written under: unknown means the blind brief (ADR-34). */
  horizon: NatalChartData["horizon"]["status"];
  /** Sect, computed once, in the brief's six-key form. Null when the horizon is unknown. */
  sect: SectPayload | null;
  /** Derived factors, for anything that wants them structured. */
  traditional: TraditionalFactors;
  /** One composed sentence pair per body, for the wheel. */
  personalPlanets: Record<string, string>;
  /** Composed payload per top aspect, keyed `${p1}_${type}_${p2}` in chart order. */
  aspectMeanings: Record<string, AspectMeaningPayload>;
  /** Absent when the horizon is unknown: there is no angle to read. */
  angleMeanings?: AngleMeanings;
  /** The engine's patterns, the one rule the brief, House by House and the house cards read (ADR-397). */
  patterns: ChartPatterns;
  /** Each stellium by its sign, its bodies in sky order: "Scorpio: Sun, Saturn, Venus, Mars". */
  stelliums: string[];
  /** Houses none of the pattern bodies sit in; none when the horizon is unknown. */
  emptyHouses: number[];
  /** A few scenes for each of the ten chapters, by section id, with no scene type twice in the report (ADR-375). */
  scenes: Readonly<Record<string, readonly Scene[]>>;
}

const SHAPE_KEY: Record<string, string> = {
  bundle: "shape_bundle", bowl: "shape_bowl", bucket: "shape_bucket",
  locomotive: "shape_locomotive", seesaw: "shape_seesaw", splash: "shape_splash", splay: "shape_splay",
};

const PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

// Review 05/10 §10's shares: the days each body spends going backwards, counted by the engine from 1950 to 2010. The
// same count gives Chiron 40. The nodes always go backwards, so theirs is said to be normal and never read.
const BACKWARDS_IN_100: Readonly<Record<string, number>> = {
  mercury: 19, venus: 7, mars: 9, jupiter: 30, saturn: 36, uranus: 41, neptune: 44, pluto: 43, chiron: 40,
};

/** The ten chapters handed scenes (ADR-383): the triad and the foundation are written from the brief alone. */
const CHAPTERS = ["overview", "houses", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus"] as const;
type Chapter = (typeof CHAPTERS)[number];
type Wanted = { kind: "body" | "sign" | "house"; key: string | number };

// A report holds 24 scene types, fewer than ten chapters asking three each, so the picks go in rounds: every chapter's
// first key before any chapter's second, and a chapter asked late still gets the scene for what it leans on most.
const SCENE_ROUNDS = 3;

/**
 * A rough birth time can give the Sun or Moon the sign it held for most of the band while its degree is the centre
 * time's, in the sign next door; that degree would name a placement the chart doesn't state, so it is left out.
 */
function degreeIn(p: { sign: string; degree: number; absoluteDegree: number }): string {
  return SIGNS[Math.floor((((p.absoluteDegree % 360) + 360) % 360) / 30)] === sig(p.sign) ? `${p.degree.toFixed(1)} ` : "";
}

function sig(name: string): SignName {
  return name.toLowerCase() as SignName;
}

function isBody(n: string): n is Body {
  return (BODIES as readonly string[]).includes(n);
}

function label(body: string): string {
  return isBody(body) ? BODY_LABELS[body] : cap(body);
}

/** A body inside a sentence: "the Sun", "Mercury". */
function named(body: string): string {
  return body === "sun" || body === "moon" ? `the ${label(body)}` : label(body);
}

function opposite(house: number): number {
  return ((house + 5) % 12) + 1;
}

// MB-161 provisional: the engine's dominance breaks a tie by key order, and a writer told "Dominant
// element fire" on a three-way tie called fire the strongest (QA-01 #4), so a shared top reads as a tie.
// B-67: a chart read back from its jsonb column keeps Postgres's key order, so the tie is named in the distribution's
// own order, the same for a chart computed or stored.
function leaderLine(kind: "element" | "modality", counts: Record<string, number>, order: readonly string[]): string {
  const top = Math.max(...order.map((k) => counts[k]));
  const tied = order.filter((k) => counts[k] === top);
  if (tied.length === 1) return `Dominant ${kind} ${tied[0]}.`;
  return `No dominant ${kind}: ${tied.slice(0, -1).join(", ")} and ${tied[tied.length - 1]} tie at ${top}, so none leads.`;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const unstop = (s: string) => s.replace(/\.$/, "");

/** A dignity's plain words, the text before the colon of its crisp line (reading 3); no standing has none. */
function plainWords(d: Dignity): string | null {
  return d === "peregrine" ? null : lower(STRUCTURE[d].crisp.split(":")[0]);
}

/** The key a section's instructions and the claims read, always beside its plain words. */
function keyed(d: Dignity): string {
  const words = plainWords(d);
  return words ? `${d} (${words})` : d;
}

/**
 * A planet's comfort in its sign in plain words, with its reason (reading 3, ADR-380). At home and least at ease read
 * the engine's table, the one the primer shows the reader; honoured and doubted are their crisp lines' plain phrase,
 * with the picture after it; a planet with no standing there gets none.
 */
function comfortIn(body: string, sign: string, d: Dignity | undefined): { words: string; key: Dignity; reason: string } | null {
  const words = d ? plainWords(d) : null;
  if (!d || !words) return null;
  const comfort = comfortOf(body, sign);
  if (!comfort) return { words, key: d, reason: `: ${unstop(STRUCTURE[d].crisp.slice(STRUCTURE[d].crisp.indexOf(":") + 2))}` };
  const { why, leastAtEase } = COMFORT[body as ComfortPlanet];
  const [want, contrast] = why.split(/(?<=\.) /);
  const wants = `it ${lower(unstop(want))}`;
  if (comfort === "home") return { words, key: d, reason: `, because ${wants}, and ${cap(sign)} is its own sign, where it works with ease` };
  // The table speaks of a planet's two least-at-ease signs together ("These two"), so both are named, this one first.
  const these = [cap(sign), ...leastAtEase.filter((s) => s.toLowerCase() !== sign.toLowerCase())].join(" and ");
  return { words, key: d, reason: `, because ${wants}, and ${unstop(contrast.replace(/^These two/, these))}` };
}

/** The keys each chapter leans on, the strongest first: its own planet or house, then what its instructions read next. */
function sceneKeys(chart: NatalChartData, t: TraditionalFactors, patterns: ChartPatterns, drawn: boolean): Record<Chapter, Wanted[]> {
  const has = (b: string | undefined): b is string => b !== undefined && chart.planets[b] !== undefined;
  const body = (b: string | undefined): Wanted[] => (has(b) ? [{ kind: "body", key: b }] : []);
  const sign = (b: string | undefined): Wanted[] => (has(b) ? [{ kind: "sign", key: chart.planets[b].sign }] : []);
  const house = (h: number | null | undefined): Wanted[] => (drawn && h ? [{ kind: "house", key: h }] : []);
  const houseOf = (b: string | undefined): Wanted[] => house(has(b) ? chart.planets[b].house : undefined);
  const ruler = (h: number | undefined): string | undefined => (h ? t.houseRulers?.[h - 1]?.ruler : undefined);
  const stellium = patterns.stelliums[0];
  const loudest: Wanted[] = !stellium ? [] : stellium.house !== null ? house(stellium.house) : [{ kind: "sign", key: stellium.sign }];
  const backwards = PLANETS.find((p) => chart.planets[p]?.retrograde);
  const uneasy = t.planets.find((p) => p.dignity === "detriment" || p.dignity === "fall")?.planet;
  const keys: Record<Chapter, Wanted[]> = {
    overview: [...loudest, ...body(t.chartRuler?.ruler ?? "sun"), ...body("sun"), ...body("moon"), ...sign("sun")],
    // Chiron is read in its house and nowhere else (ADR-379); a planet going backwards gets its own block on its card;
    // an empty house's story happens where its planet in charge sits (ADR-373).
    houses: drawn ? [...body("chiron"), ...body(backwards), ...houseOf(ruler(patterns.emptyHouses[0])), ...body(patterns.angular[0]), ...houseOf("chiron")] : [],
    mind: [...body("mercury"), ...sign("mercury"), ...houseOf("mercury"), ...house(3), ...house(9)],
    career: [...house(10), ...body(ruler(10) ?? "saturn"), ...body("saturn"), ...body("sun"), ...houseOf(ruler(10))],
    money: [...house(2), ...body(ruler(2) ?? "venus"), ...house(8), ...body("venus"), ...body("saturn")],
    relationships: [...body("venus"), ...house(7), ...body("mars"), ...sign("venus"), ...body(ruler(7))],
    family: [...house(4), ...body("moon"), ...sign("moon"), ...body(ruler(4)), ...body("saturn")],
    superpowers: [...body(t.sect?.beneficOfSect ?? "jupiter"), ...body(patterns.angular[0]), ...body(t.sect?.maleficContrary ?? "saturn"), ...body("south_node")],
    discoveries: [...body(uneasy), ...body("uranus"), ...body("pluto"), ...body("neptune"), ...body(t.chartRuler?.ruler)],
    focus: [...body("north_node"), ...houseOf("north_node"), ...sign("north_node"), ...body(t.sect?.maleficContrary ?? "saturn")],
  };
  for (const c of CHAPTERS) {
    const seen = new Set<string>();
    keys[c] = keys[c].filter((w) => !seen.has(`${w.kind}:${w.key}`) && seen.add(`${w.kind}:${w.key}`));
  }
  return keys;
}

/** The chapters' scenes, the same for the same birth (reading 2): one set of types across the report keeps each to once. */
function scenesFor(chart: NatalChartData, t: TraditionalFactors, patterns: ChartPatterns, drawn: boolean): Record<Chapter, Scene[]> {
  const wanted = sceneKeys(chart, t, patterns, drawn);
  const seed = `${chart.datetimeUtc}|${chart.latitude}|${chart.longitude}`;
  // Mind's Did you know card always sets its idea at a party, so no chapter is handed a second one.
  const taken = new Set<SceneType>(["party"]);
  const scenes = Object.fromEntries(CHAPTERS.map((c) => [c, [] as Scene[]])) as Record<Chapter, Scene[]>;
  for (let round = 0; round < SCENE_ROUNDS; round++) {
    for (const c of CHAPTERS) {
      // A key whose types are all taken gives way to the chapter's next, so a chapter asked late still gets its share.
      for (let want = wanted[c].shift(); want; want = wanted[c].shift()) {
        const got = pickScenes([want], `${seed}|${c}`, taken);
        if (got.length) {
          scenes[c].push(...got);
          break;
        }
      }
    }
  }
  return scenes;
}

/** A sign row has no house card, so its line names the placement instead ("Moon in Gemini"). */
function observationLabel(key: ObservationKey, house: number | null): string {
  if (house !== null) return ordinal(house);
  if (key.kind === "planet-in-sign") return `${label(key.body)} in ${key.sign}`;
  if (key.kind === "aspect") return `${label(key.a)} ${key.aspect} ${label(key.b)}`;
  return "";
}

export function buildBrief(chart: NatalChartData, name: string): ChartBrief {
  const t = deriveTraditional(chart);
  const drawn = hasHorizon(chart);
  const dignity = new Map(t.planets.map((p) => [p.planet as string, p]));
  const patterns = chartPatterns(chart.planets, chart.angles);

  // --- placements -----------------------------------------------------------
  // Blind, a placement carries no house and no sect condition: the hour did not settle them.
  const placementLines: string[] = [];
  const personalPlanets: Record<string, string> = {};
  for (const b of BODIES) {
    const p = chart.planets[b];
    if (!p) continue;
    const d = dignity.get(b);
    const comfort = comfortIn(b, p.sign, d?.dignity);
    const bits = [
      `${BODY_LABELS[b]} ${degreeIn(p)}${p.sign}${p.house !== undefined ? `, ${ordinal(p.house)} house` : ""}`,
      d?.inSect === true ? "in sect" : d?.inSect === false ? "contrary to sect" : null,
      p.retrograde && b !== "north_node" && b !== "south_node" ? "retrograde" : null,
    ].filter(Boolean);
    placementLines.push(`- ${bits.join(", ")}${comfort ? `, ${comfort.words} (${comfort.key})${comfort.reason}` : ""}`);
    // Chiron is read by its house, never its sign (ADR-379).
    const where = [b === "chiron" ? null : SIGN[sig(p.sign)].short, p.house !== undefined ? HOUSE[p.house].short : null];
    personalPlanets[b] = [BODY[b].short, ...where].filter(Boolean).join(" ");
  }

  // --- house rulers ---------------------------------------------------------
  // The claims copy a ruler's dignity as these lines list it, so the key leads and its plain words follow.
  const rulerLines = (t.houseRulers ?? []).map((r) =>
    `- ${ordinal(r.house)} (${cap(r.sign)}) ruled by ${BODY_LABELS[r.ruler]}, which sits in ${cap(r.rulerSign)} in the ${ordinal(r.rulerHouse)}, ${keyed(r.rulerDignity)}${r.inOwnHouse ? ", in its own house" : ""}`,
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
  // The PDF prints these lines, so they carry no dignity word (ADR-371): the comfort words and their reason are the
  // writer's, in the brief.
  let angleMeanings: AngleMeanings | undefined;
  if (drawn && t.chartRuler && t.houseRulers) {
    const asc = chart.angles.ascendant;
    const mc = chart.angles.midheaven;
    const cr = t.chartRuler;
    const tenth = t.houseRulers[9];
    angleMeanings = {
      ascendant: {
        firstImpression: `${cap(asc.sign)} rising. ${SIGN[sig(asc.sign)].short}`,
        orientationStyle: `The chart ruler is ${BODY_LABELS[cr.ruler]}, in ${cap(cr.rulerSign)} in the ${ordinal(cr.rulerHouse)}. ${BODY[cr.ruler].short}`,
        atYourBest: SIGN[sig(asc.sign)].full.split(". ").slice(1, 3).join(". ") + ".",
        underStress: SIGN[sig(asc.sign)].full.split("Under strain")[1]?.trim().replace(/^it becomes/, "Under strain this becomes") ?? "",
      },
      midheaven: {
        publicDirection: `Midheaven in ${cap(mc.sign)}. ${SIGN[sig(mc.sign)].short}`,
        whereYouThrive: `The 10th is ruled by ${BODY_LABELS[tenth.ruler]}, in ${cap(tenth.rulerSign)} in the ${ordinal(tenth.rulerHouse)}. ${HOUSE[tenth.rulerHouse].short}`,
        atYourBest: BODY[tenth.ruler].short,
        underPressure: STRUCTURE[tenth.rulerDignity]?.short ?? "",
      },
    };
  }

  // --- the chart's patterns, going backwards, Chiron, observations ----------
  const names = (bodies: readonly string[], and = ", ") => bodies.map(label).join(and);
  const group = (g: { sign: string; house: number | null }) => (g.house !== null ? `${g.sign}, your ${ordinal(g.house)}` : g.sign);
  const stelliumLines = patterns.stelliums.map((s) =>
    `- ${group(s)}: ${names(s.bodies)}.${s.house !== null ? ` To balance it: your ${ordinal(opposite(s.house))}.` : ""}`);
  const stelliumBlock = stelliumLines.length ? [`STELLIUMS:`, ...stelliumLines] : [`STELLIUMS: none.`];
  const pairs = patterns.pairs.map((p) => `${group(p)}: ${names(p.bodies, " and ")}.`);
  const pairLine = pairs.length ? [`PAIRS: ${pairs.join(" ")}`] : [];
  const angularLine = patterns.angular.length
    ? [`ANGULAR: ${patterns.angular.map((p) => `${label(p)} in your ${ordinal(chart.planets[p].house!)}`).join(", ")}.`]
    : [];
  const SIDE = { above: "above the horizon", below: "below the horizon", east: "east of the meridian", west: "west of the meridian" };
  const halfSkyLine = patterns.halfSky.length
    ? [`HALF THE SKY: ${patterns.halfSky.map((h) => `${h.count} of the ten planets ${SIDE[h.side]}.`).join(" ")}`]
    : [];

  const emptyLines = (t.houseRulers ?? []).filter((r) => patterns.emptyHouses.includes(r.house)).map((r) => {
    const comfort = comfortIn(r.ruler, r.rulerSign, r.rulerDignity);
    const where = `${comfort ? `${comfort.words} in` : "in"} ${cap(r.rulerSign)}, in your ${ordinal(r.rulerHouse)}`;
    return `- ${ordinal(r.house)}: empty. ${cap(r.sign)} starts it. Its planet, ${named(r.ruler)}, is ${where}${comfort ? comfort.reason : ""}.`;
  });
  const emptyBlock = emptyLines.length ? [`EMPTY HOUSES:`, ...emptyLines] : [`EMPTY HOUSES: none.`];

  // Chiron is read by its house alone (ADR-379), so a blind chart gives the writer nothing of it to read.
  const backwardsLines = BODIES.filter((b) => chart.planets[b]?.retrograde && (b !== "chiron" || drawn)).flatMap((b) =>
    b === "north_node" || b === "south_node" ? [`- ${BODY_LABELS[b]}: always, which is normal`]
      : BACKWARDS_IN_100[b] !== undefined ? [`- ${BODY_LABELS[b]}: as for about ${BACKWARDS_IN_100[b]} in 100 people`] : []);
  const backwardsBlock = backwardsLines.length ? [`RETROGRADE AT BIRTH:`, ...backwardsLines] : [`RETROGRADE AT BIRTH: none.`];
  const chironHouse = chart.planets.chiron?.house;
  const chironLine = chironHouse !== undefined ? [`CHIRON: in your ${ordinal(chironHouse)}`] : [];

  const observationLines = observationsFor(chart).map(({ observation: o, house }) =>
    `- ${observationLabel(o.key, house)}: ${o.idea}. Why: ${o.why}.`);
  const observationBlock = observationLines.length ? [`OBSERVATIONS:`, ...observationLines] : [];

  // --- the text -------------------------------------------------------------
  const el = chart.elements, mo = chart.modalities;
  const shapeKey = chart.chartShape ? SHAPE_KEY[chart.chartShape] : undefined;
  const sp = t.sect ? sectPayload(t.sect) : null;
  const distribution = `DISTRIBUTION: Fire ${el.fire}, Earth ${el.earth}, Air ${el.air}, Water ${el.water}. Cardinal ${mo.cardinal}, Fixed ${mo.fixed}, Mutable ${mo.mutable}. ${leaderLine("element", el, ["fire", "earth", "air", "water"])} ${leaderLine("modality", mo, ["cardinal", "fixed", "mutable"])} Chart shape ${chart.chartShape ?? "unclassified"}${shapeKey ? ` (see ${shapeKey})` : ""}.`;
  const lumBand = (b: "sun" | "moon") => {
    const p = chart.planets[b];
    return p.band ? `${BODY_LABELS[b]} travels ${p.band.fromDegree.toFixed(1)} to ${p.band.toDegree.toFixed(1)} across the band, read as ${p.sign}.` : null;
  };

  let lines: string[];
  if (drawn && sp && t.chartRuler && t.lots) {
    const asc = chart.angles.ascendant;
    const mc = chart.angles.midheaven;
    const cr = t.chartRuler;
    lines = [
      `NAME:`,
      dataBlock("name", name),
      ``,
      `SECT (computed once, use these values, never re-derive):`,
      `  sect: ${sp.sect}`,
      `  sect_light: ${sp.sect_light}`,
      `  benefic_of_sect: ${sp.benefic_of_sect}`,
      `  benefic_out_of_sect: ${sp.benefic_out_of_sect}`,
      `  malefic_of_sect: ${sp.malefic_of_sect}`,
      `  malefic_out_of_sect: ${sp.malefic_out_of_sect}`,
      `  (See ${sp.sect === "day" ? "sect_day" : "sect_night"} in the vocabulary.)`,
      `ANGLES: Ascendant ${asc.degree.toFixed(1)} ${asc.sign}. Midheaven ${mc.degree.toFixed(1)} ${mc.sign}. Houses are whole-sign.${chart.horizon.status === "approximate" ? " The birth time is approximate and every angle holds across its window." : ""}`,
      `CHART RULER: ${BODY_LABELS[cr.ruler]} in ${cap(cr.rulerSign)}, ${ordinal(cr.rulerHouse)} house, ${keyed(cr.rulerDignity)}${dignity.get(cr.ruler)?.inSect === false ? ", contrary to sect" : dignity.get(cr.ruler)?.inSect === true ? ", in sect" : ""}.`,
      ``,
      `PLACEMENTS:`,
      ...placementLines,
      ...[lumBand("sun"), lumBand("moon")].filter((l): l is string => l !== null),
      ``,
      `HOUSE RULERS (read each house through its ruler):`,
      ...rulerLines,
      ``,
      `LOTS: Fortune ${t.lots.fortune.degree.toFixed(1)} ${cap(t.lots.fortune.sign)}, ${ordinal(t.lots.fortune.house)} house. Spirit ${t.lots.spirit.degree.toFixed(1)} ${cap(t.lots.spirit.sign)}, ${ordinal(t.lots.spirit.house)} house.`,
      ``,
      `ASPECTS (strongest first):`,
      ...aspectLines,
      ``,
      distribution,
      ...stelliumBlock,
      ...pairLine,
      ...angularLine,
      ...halfSkyLine,
      ...emptyBlock,
      ...backwardsBlock,
      ...chironLine,
      ...observationBlock,
    ];
  } else {
    // The blind brief: no sect block, no angles, no chart ruler, no house
    // rulers, no lots, and no house on any placement, pattern or idea. The
    // model is never handed a fact the hour did not settle (ADR-34).
    lines = [
      `NAME:`,
      dataBlock("name", name),
      ``,
      `HORIZON: unknown. The birth time did not settle the horizon: there is no rising sign, no house, no sect and no lot in this chart. Never name one. Read the signs, the dignities and the aspects.`,
      ``,
      `PLACEMENTS:`,
      ...placementLines,
      ...[lumBand("sun"), lumBand("moon")].filter((l): l is string => l !== null),
      ``,
      `ASPECTS (strongest first):`,
      ...aspectLines,
      ``,
      distribution,
      ...stelliumBlock,
      ...pairLine,
      ...backwardsBlock,
      ...observationBlock,
    ];
  }

  return {
    text: lines.join("\n"), chart, horizon: chart.horizon.status, sect: sp, traditional: t,
    personalPlanets, aspectMeanings, ...(angleMeanings ? { angleMeanings } : {}),
    patterns,
    stelliums: patterns.stelliums.map((s) => `${s.sign}: ${names(s.bodies)}`),
    emptyHouses: patterns.emptyHouses,
    scenes: scenesFor(chart, t, patterns, drawn),
  };
}

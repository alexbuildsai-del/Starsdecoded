import { openai } from "@workspace/integrations-openai-ai-server";
import { resolveSection } from "./promptLoader.js";
import {
  getAscendantSignMeaning,
  getAspectMeaning,
  getMidheavenSignMeaning,
  getPlanetHouseMeaning,
  getPlanetSignMeaning,
  aspectKey,
  type AspectType,
  type House,
  type Planet,
  type Sign,
} from "@workspace/meaning-library";
import type {
  AscendantSignPayload,
  AspectPayload,
  MidheavenSignPayload,
  PlanetHousePayload,
  PlanetSignPayload,
} from "@workspace/db";
import type { NatalChartData } from "./chartCalculation.js";

export interface ThemeCard {
  title: string;
  icon: string;
  bullets: string[];
}

export interface FoundationEvidence {
  placement: string;
  observation: string;
  implication: string;
}

export interface FoundationData {
  chartThesis: string;
  dominantPattern: string;
  centralTension: string;
  supportingEvidence: FoundationEvidence[];
  sectionGuidance: {
    overview: string;
    triad: string;
    career: string;
    relationships: string;
    superpowers: string;
    discoveries: string;
    focus: string;
  };
}

export interface OverviewSection {
  opening: string;
  chartSignature: string;
  dominantThemes: Array<{
    label: string;
    description: string;
  }>;
  integration: string;
}

export interface RelationshipsSection {
  opening?: string;
  cards: [ThemeCard, ThemeCard, ThemeCard];
  synthesis: string;
}

export interface CareerSection {
  opening?: string;
  cards: [ThemeCard, ThemeCard, ThemeCard];
  synthesis: string;
}

export interface SuperpowersSection {
  opening: string;
  superpowers: Array<{ title: string; description: string }>;
  chronicPatterns: Array<{ title: string; description: string }>;
  growingEdges: Array<{ title: string; description: string }>;
  synthesis: string;
}

export interface DiscoveriesSection {
  opening: string;
  paradoxes: Array<{
    title: string;
    tension: string;
    livedExpression: string;
    integration: string;
  }>;
  synthesis: string;
}

export interface FocusSection {
  opening: string;
  priorities: Array<{
    title: string;
    whyItMatters: string;
    practice: string;
  }>;
  closing: string;
}

export interface CoreTriadSection {
  identity: string;
  emotionalLife: string;
  outwardManner: string;
  synthesis: string;
}

export interface LegacyFinalSummary {
  coreRisk: string;
  growthEdges: Array<{
    label: string;
    description: string;
  }>;
  distinctive: {
    description: string;
    pills: string[];
  };
  closingQuote: string;
}

export interface ReportInterpretation {
  foundationData: FoundationData;
  overview: OverviewSection;

  // Computed chart material powers the visualization between Overview and
  // Core Triad. It does not require an additional AI section call.
  personalPlanets: Record<string, string>;
  aspectMeanings?: Record<string, AspectPayload>;
  angleMeanings?: {
    ascendant?: {
      firstImpression?: string;
      orientationStyle?: string;
      atYourBest?: string;
      underStress?: string;
    };
    midheaven?: {
      publicDirection?: string;
      whereYouThrive?: string;
      atYourBest?: string;
      underPressure?: string;
    };
  };

  coreTriad: CoreTriadSection;
  career: CareerSection | string;
  relationships: RelationshipsSection | string;
  superpowers: SuperpowersSection;
  discoveries: DiscoveriesSection;
  focus: FocusSection;

  // Legacy fields are retained as optional compatibility data for reports
  // and clients created before the V2 report UI. Values returned for new
  // reports are derived from V2 output without calling legacy prompts.
  archetypeName?: string;
  archetypeSummary?: string;
  keyThemes?: string[];
  strengthsAndBlindSpots?: {
    strengths: string[];
    blindSpots: string[];
  };
  finalSummary?: LegacyFinalSummary | string;
  aspectsDynamic?: {
    dynamic?: { synthesis: string; aspects: string[] } | string;
    tension?: { synthesis: string; aspects: string[] } | string;
    behavior?: { synthesis: string; aspects: string[] } | string;
    growth?: { synthesis: string; aspects: string[] } | string;
  };
  nodes?: {
    pastPattern: string;
    growthDirection: string;
    challenge: string;
    integration: string;
  };
  elementsModalities?: {
    energyStyle: string;
    decisionStyle: string;
    imbalanceEffect: string;
  };
}

const ALL_PLANETS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const satisfies readonly Planet[];

// Modern rulership table — used to find the planet that rules a given sign
// (e.g. ruler of the 7th-house cusp for the relationships context pack).
const SIGN_RULERS: Record<string, Planet> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "pluto",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "uranus",
  pisces: "neptune",
};

const TENSE_ASPECTS = new Set(["square", "opposition"]);
const FLOWING_ASPECTS = new Set(["trine", "sextile"]);

interface AspectEntry {
  planet1: string;
  planet2: string;
  type: string;
  payload: AspectPayload;
}

interface LibraryContext {
  planetSign: Map<string, PlanetSignPayload>;
  planetHouse: Map<string, PlanetHousePayload>;
  aspects: AspectEntry[];
  aspectByKey: Map<string, AspectPayload>;
  ascendantSign: AscendantSignPayload | null;
  midheavenSign: MidheavenSignPayload | null;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{${k}}`,
  );
}

function fillV2SectionTemplate(
  template: string,
  vars: Record<string, string> & { foundation: string },
): string {
  const rendered = fillTemplate(template, vars);
  if (template.includes("{foundation}")) return rendered;
  return `${rendered}\n\nInternal foundation JSON:\n${vars.foundation}`;
}

function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Take the first sentence of a paragraph, defined by the first sentence-ending
// punctuation followed by whitespace (or end-of-string). Falls back to the full
// trimmed string if no terminator is found. Used to compose tight 2-sentence
// per-planet cards from the library's longer 3-5 sentence summaries.
function firstSentence(s: string | undefined | null): string {
  if (!s) return "";
  const trimmed = s.trim();
  const m = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (m ? m[0] : trimmed).trim();
}

function buildChartSummary(chart: NatalChartData): string {
  const p = chart.planets;
  const a = chart.angles;

  const lines = [
    `Sun: ${p.sun.degree.toFixed(1)}° ${p.sun.sign} (House ${p.sun.house})`,
    `Moon: ${p.moon.degree.toFixed(1)}° ${p.moon.sign} (House ${p.moon.house})`,
    `Mercury: ${p.mercury.degree.toFixed(1)}° ${p.mercury.sign} (House ${p.mercury.house})${p.mercury.retrograde ? " Rx" : ""}`,
    `Venus: ${p.venus.degree.toFixed(1)}° ${p.venus.sign} (House ${p.venus.house})${p.venus.retrograde ? " Rx" : ""}`,
    `Mars: ${p.mars.degree.toFixed(1)}° ${p.mars.sign} (House ${p.mars.house})${p.mars.retrograde ? " Rx" : ""}`,
    `Jupiter: ${p.jupiter.degree.toFixed(1)}° ${p.jupiter.sign} (House ${p.jupiter.house})${p.jupiter.retrograde ? " Rx" : ""}`,
    `Saturn: ${p.saturn.degree.toFixed(1)}° ${p.saturn.sign} (House ${p.saturn.house})${p.saturn.retrograde ? " Rx" : ""}`,
    `Uranus: ${p.uranus.degree.toFixed(1)}° ${p.uranus.sign} (House ${p.uranus.house})`,
    `Neptune: ${p.neptune.degree.toFixed(1)}° ${p.neptune.sign} (House ${p.neptune.house})`,
    `Pluto: ${p.pluto.degree.toFixed(1)}° ${p.pluto.sign} (House ${p.pluto.house})`,
    `North Node: ${p.north_node.degree.toFixed(1)}° ${p.north_node.sign} (House ${p.north_node.house})`,
    `Ascendant: ${a.ascendant.degree.toFixed(1)}° ${a.ascendant.sign}`,
    `Midheaven: ${a.midheaven.degree.toFixed(1)}° ${a.midheaven.sign}`,
    ``,
    `Element distribution: Fire ${chart.elements.fire}, Earth ${chart.elements.earth}, Air ${chart.elements.air}, Water ${chart.elements.water}`,
    `Modality distribution: Cardinal ${chart.modalities.cardinal}, Fixed ${chart.modalities.fixed}, Mutable ${chart.modalities.mutable}`,
    `Dominant element: ${chart.dominance.dominantElement}`,
    `Chart shape: ${chart.chartShape}`,
    ``,
    `Key aspects:`,
    ...chart.aspects.slice(0, 15).map((asp) =>
      `  ${asp.planet1} ${asp.type} ${asp.planet2} (orb: ${asp.orb}°${asp.applying ? ", applying" : ", separating"})`,
    ),
  ];

  return lines.join("\n");
}

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 600): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

// Wrap a library lookup so a single failure doesn't take down the whole pack.
// Returns null on error; callers handle missing entries gracefully.
async function safeLookup<T>(work: Promise<T>): Promise<T | null> {
  try {
    return await work;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Library context — fetched in one parallel batch per chart.
// ---------------------------------------------------------------------------

async function buildLibraryContext(chart: NatalChartData): Promise<LibraryContext> {
  const planetSign = new Map<string, PlanetSignPayload>();
  const planetHouse = new Map<string, PlanetHousePayload>();
  const aspectByKey = new Map<string, AspectPayload>();
  const aspects: AspectEntry[] = [];
  let ascendantSign: AscendantSignPayload | null = null;
  let midheavenSign: MidheavenSignPayload | null = null;

  const tasks: Promise<void>[] = [];

  // Angle meanings — one entry each, pulled in parallel with the planets.
  const ascSign = chart.angles.ascendant?.sign;
  if (ascSign) {
    tasks.push(
      safeLookup(getAscendantSignMeaning(ascSign.toLowerCase() as Sign)).then((res) => {
        if (res) ascendantSign = res;
      }),
    );
  }
  const mcSign = chart.angles.midheaven?.sign;
  if (mcSign) {
    tasks.push(
      safeLookup(getMidheavenSignMeaning(mcSign.toLowerCase() as Sign)).then((res) => {
        if (res) midheavenSign = res;
      }),
    );
  }

  for (const planet of ALL_PLANETS) {
    const data = chart.planets[planet];
    if (!data) continue;
    const sign = data.sign.toLowerCase() as Sign;
    const house = data.house as House;

    tasks.push(
      safeLookup(getPlanetSignMeaning(planet, sign)).then((res) => {
        if (res) planetSign.set(planet, res);
      }),
    );
    tasks.push(
      safeLookup(getPlanetHouseMeaning(planet, house)).then((res) => {
        if (res) planetHouse.set(planet, res);
      }),
    );
  }

  // Top 12 aspects — preserve chart order so the report's Key Aspects list
  // can render its inline meanings in the same order users see.
  const topAspects = chart.aspects.slice(0, 12);
  const aspectResults: Array<AspectEntry | null> = new Array(topAspects.length).fill(null);

  topAspects.forEach((asp, i) => {
    tasks.push(
      safeLookup(
        getAspectMeaning(
          asp.planet1 as Planet,
          asp.type as AspectType,
          asp.planet2 as Planet,
        ),
      ).then((payload) => {
        if (!payload) return;
        aspectResults[i] = {
          planet1: asp.planet1,
          planet2: asp.planet2,
          type: asp.type,
          payload,
        };
        aspectByKey.set(aspectKey(asp.planet1, asp.type, asp.planet2), payload);
      }),
    );
  });

  await Promise.all(tasks);

  for (const entry of aspectResults) {
    if (entry) aspects.push(entry);
  }

  return { planetSign, planetHouse, aspects, aspectByKey, ascendantSign, midheavenSign };
}

// ---------------------------------------------------------------------------
// Composition — turn library entries into report fields with no AI call.
// ---------------------------------------------------------------------------

// Compose a tight two-sentence card per planet — one sentence drawn from the
// sign meaning, one from the house meaning — instead of dumping the library's
// longer 3-5 sentence paragraphs verbatim.
function composePersonalPlanets(context: LibraryContext): Record<string, string> {
  const out: Record<string, string> = {};
  for (const planet of ALL_PLANETS) {
    const ps = context.planetSign.get(planet);
    const ph = context.planetHouse.get(planet);
    if (!ps && !ph) continue;
    const parts: string[] = [];
    const signSentence = firstSentence(ps?.summary);
    const houseSentence = firstSentence(ph?.summary);
    if (signSentence) parts.push(signSentence);
    if (houseSentence) parts.push(houseSentence);
    if (parts.length === 0) continue;
    out[planet] = parts.join(" ");
  }
  return out;
}

function composeAspectMeanings(chart: NatalChartData, context: LibraryContext): Record<string, AspectPayload> {
  // Key aspects by the chart-order tuple so the client can build the lookup
  // key directly from each aspect row without re-implementing canonicalization.
  const out: Record<string, AspectPayload> = {};
  for (const asp of chart.aspects.slice(0, 12)) {
    const payload = context.aspectByKey.get(aspectKey(asp.planet1, asp.type, asp.planet2));
    if (payload) {
      out[`${asp.planet1}_${asp.type}_${asp.planet2}`] = payload;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Context-pack builders — turn subsets of the library into compact text
// blocks the synthesis prompts can reason from.
// ---------------------------------------------------------------------------

function planetEntryText(
  chart: NatalChartData,
  context: LibraryContext,
  planet: Planet,
): string | null {
  const data = chart.planets[planet];
  if (!data) return null;
  const ps = context.planetSign.get(planet);
  const ph = context.planetHouse.get(planet);
  if (!ps && !ph) return null;
  const lines = [`${titleCase(planet)} in ${data.sign} (House ${data.house}):`];
  if (ps?.summary) lines.push(`  Sign meaning: ${ps.summary.trim()}`);
  if (ph?.summary) lines.push(`  House meaning: ${ph.summary.trim()}`);
  return lines.join("\n");
}

function aspectEntryText(entry: AspectEntry): string {
  const p = entry.payload;
  const parts = [`${titleCase(entry.planet1)} ${entry.type} ${titleCase(entry.planet2)}:`];
  if (p.dynamic) parts.push(`  Dynamic: ${p.dynamic.trim()}`);
  if (p.tension) parts.push(`  Tension: ${p.tension.trim()}`);
  if (p.behavior) parts.push(`  Behavior: ${p.behavior.trim()}`);
  if (p.growth) parts.push(`  Growth: ${p.growth.trim()}`);
  return parts.join("\n");
}

function packForPlanets(
  chart: NatalChartData,
  context: LibraryContext,
  planets: readonly Planet[],
): string {
  const blocks: string[] = [];
  for (const planet of planets) {
    const text = planetEntryText(chart, context, planet);
    if (text) blocks.push(text);
  }
  return blocks.join("\n\n");
}

function packForAspects(entries: AspectEntry[]): string {
  return entries.map(aspectEntryText).join("\n\n");
}

function dedupeAspects(entries: AspectEntry[]): AspectEntry[] {
  const seen = new Set<string>();
  const out: AspectEntry[] = [];
  for (const entry of entries) {
    const k = aspectKey(entry.planet1, entry.type, entry.planet2);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(entry);
  }
  return out;
}

function aspectsInvolving(context: LibraryContext, planets: readonly Planet[]): AspectEntry[] {
  const wanted = new Set<string>(planets);
  return context.aspects.filter(
    (a) => wanted.has(a.planet1) || wanted.has(a.planet2),
  );
}

function aspectsBetween(context: LibraryContext, planets: readonly Planet[]): AspectEntry[] {
  const wanted = new Set<string>(planets);
  return context.aspects.filter(
    (a) => wanted.has(a.planet1) && wanted.has(a.planet2),
  );
}

function rulerOfHouse(chart: NatalChartData, house: House): Planet | null {
  const cusp = chart.houses[String(house)];
  if (!cusp?.sign) return null;
  return SIGN_RULERS[cusp.sign.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Section context-pack assembly.
// ---------------------------------------------------------------------------

function coreTriadPack(chart: NatalChartData, context: LibraryContext): string {
  // Sun and Moon get their own library entries directly. The Ascendant is an
  // angle (not a planet), so the library has no asc_sign_X entry — but the
  // chart ruler (the planet that rules the rising sign) is the canonical
  // proxy for Ascendant psychology, so we surface its sign + house meanings.
  const planets = packForPlanets(chart, context, ["sun", "moon"]);
  const sunMoonAspects = aspectsBetween(context, ["sun", "moon"]);
  const ascSign = chart.angles.ascendant?.sign;
  const ascLine = ascSign ? `Ascendant in ${ascSign} — outward manner and presentation.` : "";
  const ascSignLibrary = context.ascendantSign?.summary
    ? `Ascendant-sign library entry:\n${context.ascendantSign.summary}`
    : "";

  // Chart ruler is still surfaced as a secondary proxy when present.
  const ascRuler = ascSign ? SIGN_RULERS[ascSign.toLowerCase()] : null;
  const ascRulerData = ascRuler ? chart.planets[ascRuler] : null;
  const ascRulerText = ascRuler && ascRulerData
    ? planetEntryText(chart, context, ascRuler)
    : null;
  const ascRulerNote = ascRuler && ascRulerData
    ? `Chart ruler (ruler of the rising sign): ${titleCase(ascRuler)} in ${ascRulerData.sign} (House ${ascRulerData.house}). Used alongside the ascendant-sign entry to ground outward presentation.`
    : "";

  const aspects = packForAspects(sunMoonAspects);
  return [
    planets,
    ascLine,
    ascSignLibrary,
    ascRulerNote,
    ascRulerText && `Chart ruler library entry:\n${ascRulerText}`,
    aspects && `Sun↔Moon aspect dynamics:\n${aspects}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function relationshipsPack(chart: NatalChartData, context: LibraryContext): string {
  const seventhRuler = rulerOfHouse(chart, 7 as House);
  const planets: Planet[] = ["venus", "mars", "moon"];
  if (seventhRuler && !planets.includes(seventhRuler)) planets.push(seventhRuler);
  const planetText = packForPlanets(chart, context, planets);
  const aspects = aspectsInvolving(context, ["venus", "mars"]);
  const aspectText = packForAspects(dedupeAspects(aspects));
  const rulerNote = seventhRuler
    ? `Ruler of the 7th house (relationship cusp): ${titleCase(seventhRuler)}.`
    : "";
  return [planetText, rulerNote, aspectText && `Relationship-relevant aspects:\n${aspectText}`]
    .filter(Boolean)
    .join("\n\n");
}

function careerPack(chart: NatalChartData, context: LibraryContext): string {
  // Career-relevant aspects per spec are those involving Saturn or the MC.
  // The MC is an angle and rarely participates in chart.aspects, so the
  // 10th-house ruler (the planet that rules the MC cusp) acts as the
  // canonical proxy when looking for "MC-involving" aspect dynamics.
  const tenthRuler = rulerOfHouse(chart, 10 as House);
  const planets: Planet[] = ["sun", "saturn"];
  if (tenthRuler && !planets.includes(tenthRuler)) planets.push(tenthRuler);
  const planetText = packForPlanets(chart, context, planets);
  const mc = chart.angles.midheaven;
  const mcLine = mc?.sign ? `Midheaven in ${mc.sign} — public-facing direction and vocation.` : "";
  const rulerNote = tenthRuler
    ? `Ruler of the 10th house (Midheaven cusp): ${titleCase(tenthRuler)}. Used as the MC proxy when filtering for career-relevant aspect dynamics.`
    : "";
  const aspectTargets: Planet[] = ["saturn"];
  if (tenthRuler && !aspectTargets.includes(tenthRuler)) aspectTargets.push(tenthRuler);
  const aspects = aspectsInvolving(context, aspectTargets);
  const aspectText = packForAspects(dedupeAspects(aspects));
  return [
    planetText,
    mcLine,
    rulerNote,
    aspectText && `Career-relevant aspects (Saturn / MC-ruler involvement):\n${aspectText}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function strengthsPack(chart: NatalChartData, context: LibraryContext): string {
  // Top dignified placements — first 5 of the personal/social planets that have
  // both sign + house entries; this is a coarse "well-known places to anchor"
  // proxy rather than a true essential-dignity scoring.
  const dignifiedPlanets: Planet[] = [];
  for (const p of ALL_PLANETS) {
    if (context.planetSign.has(p) || context.planetHouse.has(p)) {
      dignifiedPlanets.push(p);
    }
    if (dignifiedPlanets.length >= 5) break;
  }
  const planetText = packForPlanets(chart, context, dignifiedPlanets);
  const tense = context.aspects.filter((a) => TENSE_ASPECTS.has(a.type)).slice(0, 5);
  const flowing = context.aspects.filter((a) => FLOWING_ASPECTS.has(a.type)).slice(0, 3);
  const tenseText = packForAspects(tense);
  const flowingText = packForAspects(flowing);
  return [
    planetText,
    flowingText && `Flowing aspects (sources of natural strength):\n${flowingText}`,
    tenseText && `Tense aspects (sources of friction / blind spots):\n${tenseText}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function summaryPack(chart: NatalChartData, context: LibraryContext): string {
  // Whole-chart pack: every planet + every fetched aspect, deduplicated by virtue
  // of iterating maps once. Keep aspects compact (top 8) so the prompt stays focused.
  const planetText = packForPlanets(chart, context, ALL_PLANETS);
  const aspectText = packForAspects(context.aspects.slice(0, 8));
  return [planetText, aspectText && `Aspect dynamics:\n${aspectText}`]
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// JSON parsing helpers.
// ---------------------------------------------------------------------------

function parseJsonOr<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, ""));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function parseJsonRecord(raw: string): Record<string, unknown> | null {
  const parsed = parseJsonOr<unknown>(raw, null);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function titledDescriptions(
  value: unknown,
): Array<{ title: string; description: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    return [{
      title: stringValue(record.title),
      description: stringValue(record.description),
    }];
  });
}

function labeledDescriptions(
  value: unknown,
): Array<{ label: string; description: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    return [{
      label: stringValue(record.label),
      description: stringValue(record.description),
    }];
  });
}

// Parses a structured section (relationships / career) that must have a `cards`
// array and a `synthesis` string. Falls back to the raw string so old reports
// that stored plain text still render gracefully on the frontend.
function parseStructuredSection<T extends { cards: unknown[]; synthesis: string }>(
  raw: string,
): T | string {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length !== 3) {
      return raw;
    }
    const cards = parsed.cards.map((item) => {
      const card =
        item && typeof item === "object" && !Array.isArray(item)
          ? item as Record<string, unknown>
          : {};
      return {
        title: stringValue(card.title),
        icon: stringValue(card.icon),
        bullets: Array.isArray(card.bullets)
          ? card.bullets.filter((bullet): bullet is string => typeof bullet === "string")
          : [],
      };
    });
    return {
      opening: stringValue(parsed.opening),
      cards,
      synthesis: stringValue(parsed.synthesis),
    } as unknown as T;
  } catch {
    return raw;
  }
}

function emptySectionGuidance(): FoundationData["sectionGuidance"] {
  return {
    overview: "",
    triad: "",
    career: "",
    relationships: "",
    superpowers: "",
    discoveries: "",
    focus: "",
  };
}

function parseFoundationData(raw: string): FoundationData {
  const parsed = parseJsonRecord(raw);
  if (!parsed) {
    return {
      chartThesis: raw,
      dominantPattern: "",
      centralTension: "",
      supportingEvidence: [],
      sectionGuidance: emptySectionGuidance(),
    };
  }

  const guidance =
    parsed.sectionGuidance
    && typeof parsed.sectionGuidance === "object"
    && !Array.isArray(parsed.sectionGuidance)
      ? parsed.sectionGuidance as Record<string, unknown>
      : {};
  return {
    chartThesis: stringValue(parsed.chartThesis) || raw,
    dominantPattern: stringValue(parsed.dominantPattern),
    centralTension: stringValue(parsed.centralTension),
    supportingEvidence: Array.isArray(parsed.supportingEvidence)
      ? parsed.supportingEvidence.filter(
          (item): item is FoundationEvidence =>
            !!item
            && typeof item.placement === "string"
            && typeof item.observation === "string"
            && typeof item.implication === "string",
        )
      : [],
    sectionGuidance: {
      overview: stringValue(guidance.overview),
      triad: stringValue(guidance.triad),
      career: stringValue(guidance.career),
      relationships: stringValue(guidance.relationships),
      superpowers: stringValue(guidance.superpowers),
      discoveries: stringValue(guidance.discoveries),
      focus: stringValue(guidance.focus),
    },
  };
}

function parseOverviewSection(raw: string): OverviewSection {
  const parsed = parseJsonRecord(raw);
  return {
    opening: parsed ? stringValue(parsed.opening) : raw,
    chartSignature: parsed ? stringValue(parsed.chartSignature) : "",
    dominantThemes: parsed ? labeledDescriptions(parsed.dominantThemes) : [],
    integration: parsed ? stringValue(parsed.integration) : "",
  };
}

function parseCoreTriadSection(raw: string): CoreTriadSection {
  const parsed = parseJsonRecord(raw);
  return {
    identity: parsed ? stringValue(parsed.identity) : "",
    emotionalLife: parsed ? stringValue(parsed.emotionalLife) : "",
    outwardManner: parsed ? stringValue(parsed.outwardManner) : "",
    synthesis: parsed ? stringValue(parsed.synthesis) : raw,
  };
}

function parseSuperpowersSection(raw: string): SuperpowersSection {
  const parsed = parseJsonRecord(raw);
  return {
    opening: parsed ? stringValue(parsed.opening) : raw,
    superpowers: parsed ? titledDescriptions(parsed.superpowers) : [],
    chronicPatterns: parsed ? titledDescriptions(parsed.chronicPatterns) : [],
    growingEdges: parsed ? titledDescriptions(parsed.growingEdges) : [],
    synthesis: parsed ? stringValue(parsed.synthesis) : "",
  };
}

function parseDiscoveriesSection(raw: string): DiscoveriesSection {
  const parsed = parseJsonRecord(raw);
  const paradoxes = parsed && Array.isArray(parsed.paradoxes)
    ? parsed.paradoxes.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const record = item as Record<string, unknown>;
        return [{
          title: stringValue(record.title),
          tension: stringValue(record.tension),
          livedExpression: stringValue(record.livedExpression),
          integration: stringValue(record.integration),
        }];
      })
    : [];
  return {
    opening: parsed ? stringValue(parsed.opening) : raw,
    paradoxes,
    synthesis: parsed ? stringValue(parsed.synthesis) : "",
  };
}

function parseFocusSection(raw: string): FocusSection {
  const parsed = parseJsonRecord(raw);
  const priorities = parsed && Array.isArray(parsed.priorities)
    ? parsed.priorities.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const record = item as Record<string, unknown>;
        return [{
          title: stringValue(record.title),
          whyItMatters: stringValue(record.whyItMatters),
          practice: stringValue(record.practice),
        }];
      })
    : [];
  return {
    opening: parsed ? stringValue(parsed.opening) : raw,
    priorities,
    closing: parsed ? stringValue(parsed.closing) : "",
  };
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

export async function generateInterpretation(
  chart: NatalChartData,
  name: string,
): Promise<ReportInterpretation> {
  const chartSummary = buildChartSummary(chart);
  const context = await buildLibraryContext(chart);

  const personalPlanets = composePersonalPlanets(context);
  const aspectMeanings = composeAspectMeanings(chart, context);
  const triadContext = coreTriadPack(chart, context);
  const relationshipsContext = relationshipsPack(chart, context);
  const careerContext = careerPack(chart, context);
  const superpowersContext = strengthsPack(chart, context);
  const summaryContext = summaryPack(chart, context);
  const aspectsContext = packForAspects(context.aspects);

  // Stage 1: Foundation runs alone. Its structured output is the internal
  // editorial handoff supplied to every reader-facing V2 section.
  const foundationPrompt = await resolveSection("natal:foundation");
  const foundationResult = await callAI(
    foundationPrompt.system,
    fillTemplate(foundationPrompt.user, {
      name,
      chartSummary,
      foundationContext: summaryContext,
    }),
    1_200,
  );
  const foundationData = parseFoundationData(foundationResult);
  const foundation = JSON.stringify(foundationData, null, 2);

  // Stage 2: all seven reader-facing sections depend only on Foundation, so
  // they can run in parallel while retaining the declared report order below.
  const [
    overviewPrompt,
    triadPrompt,
    careerPrompt,
    relationshipsPrompt,
    superpowersPrompt,
    discoveriesPrompt,
    focusPrompt,
  ] = await Promise.all([
    resolveSection("natal:overview"),
    resolveSection("natal:triad"),
    resolveSection("natal:career"),
    resolveSection("natal:relationships"),
    resolveSection("natal:superpowers"),
    resolveSection("natal:discoveries"),
    resolveSection("natal:focus"),
  ]);

  const commonVars = { name, chartSummary, foundation };

  const [
    overviewResult,
    triadResult,
    careerResult,
    relationshipsResult,
    superpowersResult,
    discoveriesResult,
    focusResult,
  ] = await Promise.all([
    callAI(
      overviewPrompt.system,
      fillV2SectionTemplate(overviewPrompt.user, {
        ...commonVars,
        overviewContext: summaryContext,
      }),
      1_200,
    ),
    callAI(
      triadPrompt.system,
      fillV2SectionTemplate(triadPrompt.user, { ...commonVars, triadContext }),
      1_100,
    ),
    callAI(
      careerPrompt.system,
      fillV2SectionTemplate(careerPrompt.user, { ...commonVars, careerContext }),
      1_100,
    ),
    callAI(
      relationshipsPrompt.system,
      fillV2SectionTemplate(relationshipsPrompt.user, {
        ...commonVars,
        relationshipsContext,
      }),
      1_100,
    ),
    callAI(
      superpowersPrompt.system,
      fillV2SectionTemplate(superpowersPrompt.user, {
        ...commonVars,
        superpowersContext,
      }),
      1_500,
    ),
    callAI(
      discoveriesPrompt.system,
      fillV2SectionTemplate(discoveriesPrompt.user, {
        ...commonVars,
        discoveriesContext: aspectsContext || summaryContext,
      }),
      1_100,
    ),
    callAI(
      focusPrompt.system,
      fillV2SectionTemplate(focusPrompt.user, {
        ...commonVars,
        focusContext: summaryContext,
      }),
      1_100,
    ),
  ]);

  const overview = parseOverviewSection(overviewResult);
  const coreTriad = parseCoreTriadSection(triadResult);
  const career = parseStructuredSection<CareerSection>(careerResult);
  const relationships =
    parseStructuredSection<RelationshipsSection>(relationshipsResult);
  const superpowers = parseSuperpowersSection(superpowersResult);
  const discoveries = parseDiscoveriesSection(discoveriesResult);
  const focus = parseFocusSection(focusResult);

  // Temporary compatibility fields keep the existing report page usable while
  // its V2 section renderer is introduced. No legacy prompt is called.
  const legacySummary = [
    overview.opening,
    overview.chartSignature,
    overview.integration,
  ]
    .filter(Boolean)
    .join("\n\n");
  const legacyThemes = overview.dominantThemes
    .map((theme) => theme.label)
    .filter(Boolean);

  return {
    foundationData,
    overview,
    personalPlanets,
    aspectMeanings: Object.keys(aspectMeanings).length > 0 ? aspectMeanings : undefined,
    angleMeanings: composeAngleMeanings(chart, context),
    coreTriad,
    career,
    relationships,
    superpowers,
    discoveries,
    focus,
    archetypeName: "Chart Overview",
    archetypeSummary: legacySummary || overviewResult,
    keyThemes: legacyThemes,
    strengthsAndBlindSpots: {
      strengths: superpowers.superpowers.map(
        (item) => `${item.title}: ${item.description}`,
      ),
      blindSpots: superpowers.chronicPatterns.map(
        (item) => `${item.title}: ${item.description}`,
      ),
    },
    finalSummary: focus.closing || focus.opening || focusResult,
  };
}

// Builds the per-angle structured meanings. When the meaning library has a
// direct ascendant_sign / midheaven_sign entry we surface the four slots from
// it directly. When it doesn't, we fall back to the canonical proxy text —
// chart ruler (sign + house) for the Ascendant, 10th-house ruler for the
// Midheaven — and distribute the prose across the four slots so old reports
// and library misses still render gracefully.
function composeAngleMeanings(
  chart: NatalChartData,
  context: LibraryContext,
): ReportInterpretation["angleMeanings"] {
  const ascSlots = composeAngleSlots(
    "ascendant",
    chart.angles.ascendant?.sign,
    context.ascendantSign,
    chart,
    context,
  );
  const mcSlots = composeAngleSlots(
    "midheaven",
    chart.angles.midheaven?.sign,
    context.midheavenSign,
    chart,
    context,
  );
  if (!ascSlots && !mcSlots) return undefined;
  return { ascendant: ascSlots ?? undefined, midheaven: mcSlots ?? undefined };
}

function composeAngleSlots(
  angle: "ascendant" | "midheaven",
  sign: string | undefined,
  atomic: AscendantSignPayload | MidheavenSignPayload | null,
  chart: NatalChartData,
  context: LibraryContext,
):
  | { firstImpression?: string; orientationStyle?: string; atYourBest?: string; underStress?: string }
  | { publicDirection?: string; whereYouThrive?: string; atYourBest?: string; underPressure?: string }
  | null {
  if (angle === "ascendant") {
    // Check if the library payload already carries the four structured slots.
    const asc = atomic as AscendantSignPayload | null;
    if (asc) {
      const p = asc as unknown as Record<string, unknown>;
      if (p.firstImpression || p.orientationStyle || p.atYourBest || p.underStress) {
        return {
          firstImpression: typeof p.firstImpression === "string" ? p.firstImpression : undefined,
          orientationStyle: typeof p.orientationStyle === "string" ? p.orientationStyle : undefined,
          atYourBest: typeof p.atYourBest === "string" ? p.atYourBest : undefined,
          underStress: typeof p.underStress === "string" ? p.underStress : undefined,
        };
      }
      // Library has a summary string — use it as firstImpression, fill remaining with chart context.
      if (!sign) return null;
      const ruler = SIGN_RULERS[sign.toLowerCase()] ?? null;
      const rulerData = ruler ? chart.planets[ruler] : null;
      return {
        firstImpression: asc.summary || undefined,
        orientationStyle: rulerData
          ? `Your ${sign} rising is coloured by ${titleCase(ruler!)} in ${rulerData.sign}, shaping a presentation that blends ${sign} directness with ${rulerData.sign} depth.`
          : undefined,
        atYourBest: `At your best, your ${sign} rising projects clarity and an unmistakable personal presence that others find easy to approach.`,
        underStress: `Under pressure, the ${sign} Ascendant can default to over-controlling first impressions or putting up a rigid front.`,
      };
    }
    // Pure proxy fallback — no library entry at all.
    if (!sign) return null;
    const ruler = SIGN_RULERS[sign.toLowerCase()] ?? null;
    if (!ruler) return null;
    const rulerData = chart.planets[ruler];
    if (!rulerData) return null;
    const ps = context.planetSign.get(ruler);
    const ph = context.planetHouse.get(ruler);
    const signSentence = firstSentence(ps?.summary);
    const houseSentence = firstSentence(ph?.summary);
    return {
      firstImpression: `Your ${sign} rising is most directly read through its chart ruler, ${titleCase(ruler)} in ${rulerData.sign} (House ${rulerData.house}). ${titleCase(ruler)}'s placement is what colours how you arrive and how others first read you.`,
      orientationStyle: [signSentence, houseSentence].filter(Boolean).join(" ") || undefined,
      atYourBest: `At your best, your ${sign} Ascendant brings a natural ease in first encounters and a clear sense of personal presence.`,
      underStress: `Under stress, the ${sign} Ascendant may over-project a rehearsed front rather than allowing authentic contact.`,
    };
  } else {
    // Midheaven
    const mc = atomic as MidheavenSignPayload | null;
    if (mc) {
      const p = mc as unknown as Record<string, unknown>;
      if (p.publicDirection || p.whereYouThrive || p.atYourBest || p.underPressure) {
        return {
          publicDirection: typeof p.publicDirection === "string" ? p.publicDirection : undefined,
          whereYouThrive: typeof p.whereYouThrive === "string" ? p.whereYouThrive : undefined,
          atYourBest: typeof p.atYourBest === "string" ? p.atYourBest : undefined,
          underPressure: typeof p.underPressure === "string" ? p.underPressure : undefined,
        };
      }
      // Library has a summary string — distribute across slots.
      if (!sign) return null;
      const ruler = rulerOfHouse(chart, 10 as House);
      const rulerData = ruler ? chart.planets[ruler] : null;
      return {
        publicDirection: mc.summary || undefined,
        whereYouThrive: rulerData
          ? `Your ${sign} Midheaven is amplified by ${titleCase(ruler!)} in ${rulerData.sign} — the combination points to fields where structure and ambition converge most naturally.`
          : undefined,
        atYourBest: `At your best, your ${sign} Midheaven draws recognition through consistent, purposeful effort aligned with your deepest values.`,
        underPressure: `Under pressure, the ${sign} Midheaven can tip toward overwork or a relentless drive for public approval at the cost of private wellbeing.`,
      };
    }
    // Pure proxy fallback — no library entry at all.
    if (!sign) return null;
    const ruler = rulerOfHouse(chart, 10 as House);
    if (!ruler) return null;
    const rulerData = chart.planets[ruler];
    if (!rulerData) return null;
    const ps = context.planetSign.get(ruler);
    const ph = context.planetHouse.get(ruler);
    const signSentence = firstSentence(ps?.summary);
    const houseSentence = firstSentence(ph?.summary);
    return {
      publicDirection: `Your ${sign} Midheaven is most directly read through the ruler of the 10th house, ${titleCase(ruler)} in ${rulerData.sign} (House ${rulerData.house}). ${titleCase(ruler)}'s placement is what colours how your public direction takes shape.`,
      whereYouThrive: [signSentence, houseSentence].filter(Boolean).join(" ") || undefined,
      atYourBest: `At your best, your ${sign} Midheaven channels ambition into work that is both visible and meaningful to others.`,
      underPressure: `Under pressure, the ${sign} Midheaven can drive a relentless need for external recognition at the expense of sustainable direction.`,
    };
  }
}

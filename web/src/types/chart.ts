export interface ChartPlanet {
  sign: string;
  degree: number;
  absoluteDegree: number;
  /** Whole-sign house. Absent when the horizon is unknown: there is no house to be in (ADR-34). */
  house?: number;
  retrograde: boolean;
  speed: number;
  /** Sun and Moon only, when the birth time is a band: the arc the body covered, absolute degrees. */
  band?: { fromDegree: number; toDegree: number };
}

export type HorizonStatus = "known" | "approximate" | "unknown";

/** One fact the birth hour decides, swept across the band (ADR-33). */
export interface HorizonFact {
  value: string;
  holds: boolean;
  flipsAt: string[];
  values: string[];
  holdsFrom: string;
  holdsTo: string;
}

export interface Horizon {
  status: HorizonStatus;
  ascendant: HorizonFact;
  midheaven: HorizonFact;
  sect: HorizonFact;
  moonSign: HorizonFact;
  sunSign: HorizonFact;
}

export interface ChartAngle {
  sign: string;
  degree: number;
  absoluteDegree: number;
}

export interface ChartAspect {
  planet1: string;
  planet2: string;
  type: string;
  orb: number;
  /** Closing rather than separating. The API has always sent it. */
  applying: boolean;
}

export interface ChartAngles {
  ascendant: ChartAngle;
  midheaven: ChartAngle;
  descendant: ChartAngle;
  ic: ChartAngle;
}

/**
 * A chart whose horizon is unknown carries no angles, houses, sunAltitude or
 * hemisphere counts, and no house on any body. They are absent, not zero, so
 * a consumer must prove the horizon before it reads one (R-4.6).
 */
export interface ChartData {
  planets: Record<string, ChartPlanet>;
  angles?: ChartAngles;
  houses?: Record<string, { sign: string; degree: number }>;
  horizon: Horizon;
  windowMinutes?: number;
  timezone?: string;
  sunAltitude?: number;
  elements: { fire: number; earth: number; air: number; water: number };
  modalities: { cardinal: number; fixed: number; mutable: number };
  dominance: {
    dominantElement: string;
    dominantModality: string;
    dominantPlanets: string[];
  };
  aspects: ChartAspect[];
  chartShape: string | null;
  hemisphereEmphasis?: {
    northern: number;
    southern: number;
    eastern: number;
    western: number;
  };
}

/** A chart with a horizon: the angles and houses are there and typed so. */
export type DrawnChartData = ChartData & { angles: ChartAngles; houses: Record<string, { sign: string; degree: number }> };

export function isDrawn(chart: ChartData): chart is DrawnChartData {
  return chart.angles !== undefined && chart.houses !== undefined;
}

export interface AspectMeaning {
  dynamic: string;
  tension: string;
  behavior: string;
  growth: string;
}

export interface ActionItem {
  action: string;
  why: string;
}

/** A structured, code-verified reference to the chart. Shape varies by kind. */
export interface EvidenceRef {
  kind: "placement" | "aspect" | "ruler" | "lot" | "sect" | "angle" | "cross" | "source";
  [key: string]: unknown;
}

export interface StoredEvidence {
  ref: EvidenceRef;
  /** Composed by the API from the verified reference; never model text. */
  label: string;
}

/** A verbatim quote from the section's prose and the chart facts it rests on. */
export interface Claim {
  quote: string;
  evidence: StoredEvidence[];
}

export interface WithClaims {
  claims: Claim[];
}

export interface OverviewSection extends WithClaims {
  headline: string;
  concentration: string;
  temperament: string;
  distinctive: string;
  bridge: string;
}

export interface TriadPart {
  label: string;
  text: string;
}

export interface TriadSection extends WithClaims {
  sun: TriadPart;
  moon: TriadPart;
  /** Absent when the horizon is unknown. */
  rising?: TriadPart;
}

export interface HouseReading {
  house: number;
  reading: string;
}

/** The twelve house-card readings. No claims: the card they sit on is the evidence. */
export interface HousesSection {
  houses: HouseReading[];
}

export interface MindSection extends WithClaims {
  howYouThink: string;
  howYouDecide: string;
  howYouAreUnderstood: string;
  practice: string;
}

/** A named item and the concrete reason this chart fits it. */
export interface ListedItem {
  item: string;
  reason: string;
}

export interface CareerSection extends WithClaims {
  vocationalPull: string;
  howYouShowUp: string;
  growthThroughWork: string;
  actions: ActionItem[];
  careerPaths: ListedItem[];
}

export interface MoneySection extends WithClaims {
  relationshipToResources: string;
  whatWorks: string;
  sharedAndExposed: string;
  actions: ActionItem[];
}

export interface RelationshipsSection extends WithClaims {
  howYouLove: string;
  theChallenge: string;
  whatPartnershipAsks: string;
  actions: ActionItem[];
  connectBestWith: ListedItem[];
}

export interface FamilySection extends WithClaims {
  whatYouCarry: string;
  whatRootsYou: string;
  theInheritedEdge: string;
  actions: ActionItem[];
}

export interface SuperpowerItem {
  title: string;
  text: string;
  actions: ActionItem[];
}

export interface SuperpowersSection extends WithClaims {
  superpower: SuperpowerItem;
  chronicPattern: SuperpowerItem;
  growingEdge: SuperpowerItem;
}

export interface Paradox {
  title: string;
  tension: string;
  invitation: string;
}

export interface DiscoveriesSection extends WithClaims {
  opening: string;
  paradoxes: Paradox[];
}

export interface FocusBullet {
  point: string;
  why: string;
}

export interface FocusGroup {
  intro: string;
  bullets: FocusBullet[];
}

export interface FocusSection extends WithClaims {
  leanInto: FocusGroup;
  notice: FocusGroup;
  practice: FocusGroup;
  closing: string;
}

export interface AngleMeanings {
  ascendant: { firstImpression: string; orientationStyle: string; atYourBest: string; underStress: string };
  midheaven: { publicDirection: string; whereYouThrive: string; atYourBest: string; underPressure: string };
}

/** The reader's ticked items on a report, valued by the ISO date of the tick. */
export type Workbook = Record<string, string>;

/** One sentence a horizon pass changed (ADR-35). */
export interface RevisionMark {
  before: string;
  now: string;
  evidence: StoredEvidence[];
}

export interface SectionAddition {
  text: string;
  claims: Claim[];
}

/** What the last horizon pass changed. The counts are the report's own; the page never recounts them. */
export interface HorizonPass {
  at: string;
  passes: number;
  sentencesRevised: number;
  paragraphsAdded: number;
  sections: Record<string, { amended: RevisionMark[]; added: SectionAddition[] }>;
}

export type Lens = "partners" | "parent_child" | "people";

/** One passage of a compatibility chapter, tagged by where it came from (ADR-39). */
export interface PairPassage {
  text: string;
  source: "natal" | "new";
  of?: "A" | "B" | "both";
}

export interface PairChapter extends WithClaims {
  headline: string;
  passages: PairPassage[];
}

export interface PairChecklist {
  intro: string;
  items: ActionItem[];
}

export interface PairPractise extends WithClaims {
  opening: string;
  forA: PairChecklist;
  forB: PairChecklist;
  forBoth: PairChecklist;
  closing: string;
}

export interface PairLink {
  kind: "flows" | "rubs" | "overlay";
  planetA?: string;
  planetB?: string;
  aspect?: string;
  orb?: number;
  planet?: string;
  of?: "A" | "B";
  house?: number;
  reading: string;
}

export interface PairLinks {
  links: PairLink[];
}

/**
 * The report shape. Mirrors ReportInterpretation in api/src/lib/aiInterpretation.ts.
 * A section that is present is complete: the API enforces its schema at
 * generation time. Sections are optional because the report is readable while
 * it writes and they arrive one at a time. The deterministic blocks land with
 * the first frame, so they are not.
 */
export interface InterpretationMeta {
  promptVersion: string;
  reportType?: "natal" | "compatibility";
  lens?: Lens;
  model: string;
  houseSystem: "whole-sign";
  zodiac: "tropical";
  ephemeris: string;
  orbs: Record<string, number>;
  /** Mirrors the chart's horizon status (ADR-34). */
  horizon?: HorizonStatus;
  horizonPass?: HorizonPass;
  /** Sect and its inputs are absent when the horizon is unknown. */
  sect?: "day" | "night";
  sectLight?: "sun" | "moon";
  sunAltitude?: number;
  sectMarginal?: boolean;
  generatedAt: string;
  /** Counted once the last section lands. */
  wordCount?: number;
}

export interface Interpretation {
  meta: InterpretationMeta;
  overview?: OverviewSection;
  triad?: TriadSection;
  houses?: HousesSection;
  mind?: MindSection;
  career?: CareerSection;
  money?: MoneySection;
  relationships?: RelationshipsSection;
  family?: FamilySection;
  superpowers?: SuperpowersSection;
  discoveries?: DiscoveriesSection;
  focus?: FocusSection;
  personalPlanets: Record<string, string>;
  aspectMeanings: Record<string, AspectMeaning>;
  /** Absent when the horizon is unknown. */
  angleMeanings?: AngleMeanings;
}

/** The compatibility report: nine chapters and the link cards, streamed like a natal report. */
export interface PairInterpretation {
  meta: InterpretationMeta;
  howYouMeet?: PairChapter;
  twoCharts?: PairChapter;
  twoWays?: PairChapter;
  whereItFlows?: PairChapter;
  whereItRubs?: PairChapter;
  howYouTalk?: PairChapter;
  lensOne?: PairChapter;
  lensTwo?: PairChapter;
  whatToPractise?: PairPractise;
  links?: PairLinks;
}

/** The prompt version this page renders. Older stored reports get the regenerate call to action. */
export const CURRENT_PROMPT_VERSION = "v6";
export const CURRENT_PAIR_PROMPT_VERSION = "p1";

/**
 * A stored report this page can render. Anything older keeps its words but not
 * its shape, so it is offered a regeneration rather than rendered half right.
 */
// MB-45 provisional: a v5 report shows the regenerate CTA and is never regenerated on its own.
export function isCurrentInterpretation(v: unknown): v is Interpretation {
  return typeof v === "object" && v !== null
    && (v as Interpretation).meta?.promptVersion === CURRENT_PROMPT_VERSION;
}

export function isCurrentPairInterpretation(v: unknown): v is PairInterpretation {
  return typeof v === "object" && v !== null
    && (v as PairInterpretation).meta?.promptVersion === CURRENT_PAIR_PROMPT_VERSION;
}

export const PLANET_LABELS: Record<string, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
  chiron: "Chiron",
  north_node: "North Node",
  south_node: "South Node",
};

export const PLANET_GLYPHS: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "⛢",
  neptune: "♆",
  pluto: "♇",
  chiron: "⚷",
  north_node: "☊",
  south_node: "☋",
};

export const SIGN_GLYPHS: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

export const SIGN_ELEMENTS: Record<string, "fire" | "earth" | "air" | "water"> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire",
  Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air",
  Cancer: "water", Scorpio: "water", Pisces: "water",
};

export const SIGN_MODALITIES: Record<string, "cardinal" | "fixed" | "mutable"> = {
  Aries: "cardinal", Cancer: "cardinal", Libra: "cardinal", Capricorn: "cardinal",
  Taurus: "fixed", Leo: "fixed", Scorpio: "fixed", Aquarius: "fixed",
  Gemini: "mutable", Virgo: "mutable", Sagittarius: "mutable", Pisces: "mutable",
};

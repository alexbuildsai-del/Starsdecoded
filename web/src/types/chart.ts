export interface ChartPlanet {
  sign: string;
  degree: number;
  absoluteDegree: number;
  house: number;
  retrograde: boolean;
  speed: number;
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

export interface ChartData {
  planets: Record<string, ChartPlanet>;
  angles: {
    ascendant: ChartAngle;
    midheaven: ChartAngle;
    descendant: ChartAngle;
    ic: ChartAngle;
  };
  elements: { fire: number; earth: number; air: number; water: number };
  modalities: { cardinal: number; fixed: number; mutable: number };
  dominance: {
    dominantElement: string;
    dominantModality: string;
    dominantPlanets: string[];
  };
  aspects: ChartAspect[];
  chartShape: string | null;
  hemisphereEmphasis: {
    northern: number;
    southern: number;
    eastern: number;
    western: number;
  };
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
  kind: "placement" | "aspect" | "ruler" | "lot" | "sect" | "angle";
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
  rising: TriadPart;
}

export interface HouseReading {
  house: number;
  reading: string;
}

/** The twelve house-card readings. No claims: the card they sit on is the evidence. */
export interface HousesSection {
  houses: HouseReading[];
}

export interface PathSection extends WithClaims {
  fallBackOn: string;
  headedToward: string;
  tenderSpot: string;
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

/**
 * The report shape. Mirrors ReportInterpretation in api/src/lib/aiInterpretation.ts.
 * A section that is present is complete: the API enforces its schema at
 * generation time. Sections are optional because the report is readable while
 * it writes and they arrive one at a time. The deterministic blocks land with
 * the first frame, so they are not.
 */
export interface Interpretation {
  meta: {
    promptVersion: string;
    model: string;
    houseSystem: "whole-sign";
    zodiac: "tropical";
    ephemeris: string;
    orbs: Record<string, number>;
    sect: "day" | "night";
    sectLight: "sun" | "moon";
    sunAltitude: number;
    sectMarginal: boolean;
    generatedAt: string;
    /** Counted once the last section lands. */
    wordCount?: number;
  };
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
  path?: PathSection;
  focus?: FocusSection;
  personalPlanets: Record<string, string>;
  aspectMeanings: Record<string, AspectMeaning>;
  angleMeanings: AngleMeanings;
}

/** The prompt version this page renders. Older stored reports get the regenerate call to action. */
export const CURRENT_PROMPT_VERSION = "v5";

/**
 * A stored report this page can render. Anything older keeps its words but not
 * its shape, so it is offered a regeneration rather than rendered half right.
 */
// MB-45 provisional: a v4 report shows the regenerate CTA and is never regenerated on its own.
export function isCurrentInterpretation(v: unknown): v is Interpretation {
  return typeof v === "object" && v !== null
    && (v as Interpretation).meta?.promptVersion === CURRENT_PROMPT_VERSION;
}

/** @deprecated Use isCurrentInterpretation. Removed with the report page assembly. */
export const isV3Interpretation = isCurrentInterpretation;

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

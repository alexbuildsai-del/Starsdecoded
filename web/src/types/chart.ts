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
}

export interface ChartData {
  planets: Record<string, ChartPlanet>;
  angles: {
    ascendant: ChartAngle;
    midheaven: ChartAngle;
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
  kind: "placement" | "aspect" | "ruler" | "lot" | "sect";
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

export interface MindSection extends WithClaims {
  howYouThink: string;
  howYouDecide: string;
  howYouAreUnderstood: string;
  practice: string;
}

export interface CareerSection extends WithClaims {
  vocationalPull: string;
  howYouShowUp: string;
  growthThroughWork: string;
  actions: ActionItem[];
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

/**
 * The V3 report shape. Mirrors ReportInterpretation in api/src/lib/aiInterpretation.ts.
 * Sections are always structured: the API enforces each section's schema at
 * generation time, so there is no string fallback to guard against.
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
    wordCount: number;
  };
  overview: OverviewSection;
  triad: TriadSection;
  mind: MindSection;
  career: CareerSection;
  money: MoneySection;
  relationships: RelationshipsSection;
  family: FamilySection;
  superpowers: SuperpowersSection;
  discoveries: DiscoveriesSection;
  focus: FocusSection;
  personalPlanets: Record<string, string>;
  aspectMeanings: Record<string, AspectMeaning>;
  angleMeanings: AngleMeanings;
}

/** A stored report predates V3 when it lacks the meta block. Such reports must be regenerated. */
export function isV3Interpretation(v: unknown): v is Interpretation {
  return typeof v === "object" && v !== null && typeof (v as Interpretation).meta?.promptVersion === "string"
    && typeof (v as Interpretation).overview?.headline === "string"
    && Array.isArray((v as Interpretation).overview?.claims);
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

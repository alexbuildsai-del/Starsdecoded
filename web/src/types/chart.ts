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
  inFlow?: string;
  underStress?: string;
  inConflict?: string;
}

export interface AspectDynamicGroup {
  synthesis: string;
  aspects: string[];
}

export function isStructuredAspectGroup(v: unknown): v is AspectDynamicGroup {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as AspectDynamicGroup).synthesis === "string" &&
    Array.isArray((v as AspectDynamicGroup).aspects)
  );
}

export interface ThemeCard {
  title: string;
  icon: string;
  bullets: string[];
}

export interface RelationshipsSection {
  cards: [ThemeCard, ThemeCard, ThemeCard];
  synthesis: string;
}

export interface CareerSection {
  cards: [ThemeCard, ThemeCard, ThemeCard];
  synthesis: string;
}

export function isStructuredRelationships(v: unknown): v is RelationshipsSection {
  return (
    typeof v === "object" &&
    v !== null &&
    Array.isArray((v as RelationshipsSection).cards) &&
    (v as RelationshipsSection).cards.length === 3 &&
    typeof (v as RelationshipsSection).synthesis === "string"
  );
}

export function isStructuredCareer(v: unknown): v is CareerSection {
  return (
    typeof v === "object" &&
    v !== null &&
    Array.isArray((v as CareerSection).cards) &&
    (v as CareerSection).cards.length === 3 &&
    typeof (v as CareerSection).synthesis === "string"
  );
}

export interface GrowthEdge {
  label: string;
  description: string;
}

export interface FinalSummaryStructured {
  coreRisk: string;
  growthEdges: GrowthEdge[];
  distinctive: {
    description: string;
    pills: string[];
  };
  closingQuote: string;
}

export function isStructuredFinalSummary(v: unknown): v is FinalSummaryStructured {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as FinalSummaryStructured).coreRisk === "string" &&
    Array.isArray((v as FinalSummaryStructured).growthEdges) &&
    typeof (v as FinalSummaryStructured).closingQuote === "string"
  );
}

export interface Interpretation {
  archetypeName: string;
  archetypeSummary: string;
  keyThemes: string[];
  coreTriad: {
    identity: string;
    emotionalLife: string;
    outwardManner: string;
    synthesis: string;
  };
  relationships: RelationshipsSection | string;
  career: CareerSection | string;
  strengthsAndBlindSpots: {
    strengths: string[];
    blindSpots: string[];
  };
  finalSummary: FinalSummaryStructured | string;
  personalPlanets: Record<string, string>;
  aspectMeanings?: Record<string, AspectMeaning>;
  aspectsDynamic?: {
    dynamic?: AspectDynamicGroup | string;
    tension?: AspectDynamicGroup | string;
    behavior?: AspectDynamicGroup | string;
    growth?: AspectDynamicGroup | string;
  };
  nodes?: {
    pastPattern?: string;
    growthDirection?: string;
    challenge?: string;
    integration?: string;
  };
  elementsModalities?: {
    energyStyle?: string;
    decisionStyle?: string;
    imbalanceEffect?: string;
  };
  angleMeanings?: {
    ascendant?: string;
    midheaven?: string;
  };
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

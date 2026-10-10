/**
 * The nine states of the one chart, named as the Design System's ChartStates
 * table names them. A screen picks a state; it never draws a second chart.
 */
export const CHART_STATES = [
  "full",
  "focus",
  "sun-moon-rising",
  "small",
  "pair",
  "teach",
  "build",
  "no-birth-time",
  "live-sky",
] as const;

export type ChartState = (typeof CHART_STATES)[number];

export const CHART_STATE_LABEL: Record<ChartState, string> = {
  full: "Full",
  focus: "Focus",
  "sun-moon-rising": "Sun, Moon and rising",
  small: "Small",
  pair: "Pair",
  teach: "Teach",
  build: "Build",
  "no-birth-time": "No birth time",
  "live-sky": "Live sky",
};

/** The ChartStates table's rows, back to front, as the Design System's matrix lists them. */
export const CHART_LAYERS = [
  "sign-slices",
  "sign-names",
  "ticks",
  "houses",
  "house-words",
  "planets",
  "points",
  "retrograde",
  "lines",
  "horizon",
  "rising-marker",
  "lit",
  "guest",
] as const;

export type ChartLayer = (typeof CHART_LAYERS)[number];

/** ● on, ○ off, ◐ some (which ones is the state's to say), or on from a plate of this many pixels. */
export type LayerRule = "on" | "off" | "some" | { fromPx: number };

const ALL_BUT_LIT: Record<ChartLayer, LayerRule> = {
  "sign-slices": "on", "sign-names": "on", ticks: "on", houses: "on", "house-words": "on", planets: "on",
  points: "on", retrograde: "on", lines: "on", horizon: "on", "rising-marker": "on", lit: "off", guest: "off",
};

/**
 * The matrix, cell for cell. A chart with no birth time then loses its houses, horizon and marker in any state, and
 * its Moon's lines; that is buildScene's to apply, since the table's own column only shows it on the Full chart.
 */
export const STATE_LAYERS: Record<ChartState, Record<ChartLayer, LayerRule>> = {
  full: ALL_BUT_LIT,
  focus: { ...ALL_BUT_LIT, points: "some", retrograde: "some", lines: "some", lit: "on" },
  "sun-moon-rising": {
    "sign-slices": "on", "sign-names": { fromPx: 200 }, ticks: "off", houses: "off", "house-words": "off", planets: "some",
    points: "off", retrograde: "off", lines: "off", horizon: "on", "rising-marker": "on", lit: "off", guest: "off",
  },
  small: {
    "sign-slices": "on", "sign-names": "off", ticks: "off", houses: "on", "house-words": "off", planets: "some",
    points: "off", retrograde: "off", lines: "off", horizon: "on", "rising-marker": "on", lit: "on", guest: "off",
  },
  pair: {
    "sign-slices": "on", "sign-names": { fromPx: 150 }, ticks: { fromPx: 150 }, houses: "off", "house-words": "off",
    planets: "on", points: "off", retrograde: "off", lines: "off", horizon: "off", "rising-marker": "off", lit: "on", guest: "on",
  },
  teach: {
    "sign-slices": "on", "sign-names": "on", ticks: "off", houses: "some", "house-words": "some", planets: "some",
    points: "off", retrograde: "off", lines: "off", horizon: "some", "rising-marker": "some", lit: "on", guest: "off",
  },
  build: ALL_BUT_LIT,
  "no-birth-time": { ...ALL_BUT_LIT, houses: "off", "house-words": "off", lines: "some", horizon: "off", "rising-marker": "off" },
  "live-sky": ALL_BUT_LIT,
};

/** The rule read at a size: true when the layer is drawn at all. */
export function layerOn(rule: LayerRule, size: number): boolean {
  if (rule === "off") return false;
  if (typeof rule === "object") return size >= rule.fromPx;
  return true;
}

/** The layers a chart with no birth time never draws, whatever the state (ChartStates, No birth time). */
export const NEEDS_BIRTH_TIME: readonly ChartLayer[] = ["houses", "house-words", "horizon", "rising-marker"];

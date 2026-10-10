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

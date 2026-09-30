/**
 * Every chart the public site draws comes from the engine, the one the API
 * writes reports from (ADR-107, R-3.1): a birth goes in, a chart comes out,
 * and no degree on a page is typed.
 */
import { calculateNatalChart, type NatalChartData } from "@workspace/engine";
import type { ChartData } from "@/types/chart";

/**
 * A birth as `fixtures/charts/` holds it and `calculateNatalChart` takes it.
 * The zone, when named, sets the offset in force at birth; the offset is kept
 * for a birth that has no zone.
 */
export interface Birth {
  /** "YYYY-MM-DD" */
  birthDate: string;
  /** "HH:MM" on the local clock; the band's centre when the time is a band. */
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  /** Hours east of UTC. */
  timezoneOffset: number;
  /** The band's half-width in minutes: 0 exact, 180 a part of the day, 720 unknown. */
  birthTimeWindowMinutes?: number;
}

/**
 * The engine's chart in the shape the web reads a report's stored chart. A
 * part the horizon decides stays absent rather than undefined on a chart
 * without one, so `isDrawn` and every "no birth time" branch read it as the
 * report page does (R-4.6).
 */
export function toChartData(natal: NatalChartData): ChartData {
  const { planets, angles, houses, horizon, windowMinutes, timezone, sunAltitude, elements, modalities, dominance, aspects, chartShape, hemisphereEmphasis } = natal;
  return {
    planets,
    ...(angles ? { angles } : {}),
    ...(houses ? { houses } : {}),
    horizon,
    windowMinutes,
    ...(timezone ? { timezone } : {}),
    ...(sunAltitude !== undefined ? { sunAltitude } : {}),
    elements,
    modalities,
    dominance,
    aspects,
    chartShape,
    ...(hemisphereEmphasis ? { hemisphereEmphasis } : {}),
  };
}

export function chartOf(birth: Birth): ChartData {
  return toChartData(calculateNatalChart(
    birth.birthDate,
    birth.birthTime,
    birth.latitude,
    birth.longitude,
    birth.timezone ?? birth.timezoneOffset,
    birth.birthTimeWindowMinutes ?? 0,
  ));
}

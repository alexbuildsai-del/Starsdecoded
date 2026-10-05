/**
 * One triad row everywhere (ADR-211, reading 20): Sun, Moon and Rising, each
 * its sign, degrees and house with its word, built the same way from a stored
 * triad (`GET /home`) or from a chart, so every page that prints a placement
 * prints the same line for it. A known Rising names the 1st house, which it
 * begins; no row names a ruler, since the ruler is the report's to explain.
 * Pure, so a node test pins the words.
 */
import type { HomePerson, Spot, SpotPoint } from "@workspace/api-client-react";
import { houseWithWord } from "@/lib/evidence-glossary";
import type { ChartData } from "@/types/chart";

export type TriadKey = "sun" | "moon" | "rising";

/** `GET /home`'s triad, once the chart is stored. */
export type StoredTriad = NonNullable<HomePerson["triad"]>;

export interface TriadRowData {
  key: TriadKey;
  label: "Sun" | "Moon" | "Rising";
  /** "Pisces 23.22°", or the Moon's range over a rough birth time; null on the Rising of a chart with no birth time. */
  at: string | null;
  /** "12th (solitude)", "1st (self)" on a known Rising; null without a birth time and on a range across two signs. */
  house: string | null;
  /** What the Rising says on a chart with no birth time; null on every other row. */
  blind: string | null;
}

export interface TriadRowsOptions {
  /** The Rising's line on a chart with no birth time, in the words of the page that prints it. */
  blind?: string;
}

/** The Rising's line on a chart with no birth time where the page gives none of its own. */
export const NEEDS_BIRTH_TIME = "Needs a birth time";

const LABELS = { sun: "Sun", moon: "Moon", rising: "Rising" } as const;

// The engine keeps its sign list private, and a range's two ends need a sign from a longitude.
const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const degrees = (degree: number): string => `${degree.toFixed(2)}°`;

/** "Pisces 23.22°": the sign first, as the approved row reads (reading 20). */
const pointText = (sign: string, degree: number): string => `${sign} ${degrees(degree)}`;

/** The Moon over a rough birth time, "10.19° to 22.85° Pisces", or "28.66° Gemini to 6.81° Cancer" across a sign (MB-139). */
function rangeText(from: SpotPoint, to: SpotPoint): string {
  if (from.sign !== to.sign) return `${degrees(from.degree)} ${from.sign} to ${degrees(to.degree)} ${to.sign}`;
  return `${degrees(from.degree)} to ${degrees(to.degree)} ${to.sign}`;
}

function bodyRow(key: "sun" | "moon", spot: Spot): TriadRowData {
  const band = spot.band ?? null;
  const oneSign = !band || band.from.sign === band.to.sign;
  const at = !band
    ? pointText(spot.sign, spot.degree)
    : oneSign && band.from.degree === band.to.degree
      ? pointText(band.to.sign, band.to.degree)
      : rangeText(band.from, band.to);
  // A whole-sign house changes with the sign, so a range across two signs names none.
  const house = spot.house && oneSign ? houseWithWord(spot.house) : null;
  return { key, label: LABELS[key], at, house, blind: null };
}

function risingRow(rising: Spot | null, blind: string): TriadRowData {
  if (!rising) return { key: "rising", label: LABELS.rising, at: null, house: null, blind };
  // The stored triad gives the Rising no house (ADR-174); the web names the 1st, which the Rising begins (ADR-211).
  return { key: "rising", label: LABELS.rising, at: pointText(rising.sign, rising.degree), house: houseWithWord(1), blind: null };
}

type Placement = { sign?: unknown; degree?: unknown; house?: unknown };

/** As `GET /home` reads a body (api `home.ts`, `spotOf`), so a chart and the triad stored from it print the same row. */
function spotOf(body: Placement | undefined, housed: boolean): Spot | null {
  if (typeof body?.sign !== "string" || typeof body.degree !== "number" || !Number.isFinite(body.degree)) return null;
  const house = housed && Number.isInteger(body.house) && Number(body.house) >= 1 && Number(body.house) <= 12 ? Number(body.house) : null;
  return { sign: body.sign, degree: Math.round(body.degree * 100) / 100, house };
}

/** Counted in hundredths of a degree, so an end rounded up to a cusp reads 0° of the next sign, never 30° of its own. */
function pointOf(longitude: unknown): SpotPoint | null {
  if (typeof longitude !== "number" || !Number.isFinite(longitude)) return null;
  const at = ((Math.round(longitude * 100) % 36000) + 36000) % 36000;
  return { sign: SIGNS[Math.floor(at / 3000)], degree: (at % 3000) / 100 };
}

/** The Moon's range only over a windowed birth time, each end its own sign, as `GET /home` reads it (MB-139). */
function moonRangeOf(chart: ChartData): Spot["band"] {
  if (typeof chart.windowMinutes !== "number" || chart.windowMinutes <= 0) return null;
  const band = chart.planets.moon?.band;
  const from = pointOf(band?.fromDegree);
  const to = pointOf(band?.toDegree);
  return from && to ? { from, to } : null;
}

/** A chart read as `GET /home` stores its triad; null without a Sun and a Moon. */
export function triadOfChart(chart: ChartData): StoredTriad | null {
  const sun = spotOf(chart.planets.sun, true);
  const moon = spotOf(chart.planets.moon, true);
  if (!sun || !moon) return null;
  const band = moonRangeOf(chart);
  return { sun, moon: band ? { ...moon, band } : moon, rising: spotOf(chart.angles?.ascendant, false) };
}

/** The three rows, or none while the chart is not stored yet. */
export function triadRowsOf(source: StoredTriad | ChartData | null | undefined, options: TriadRowsOptions = {}): TriadRowData[] {
  const triad = source && "planets" in source ? triadOfChart(source) : source;
  if (!triad) return [];
  return [bodyRow("sun", triad.sun), bodyRow("moon", triad.moon), risingRow(triad.rising, options.blind ?? NEEDS_BIRTH_TIME)];
}

/** A row as one line, for print or a label: "Pisces 23.22° · 12th (solitude)"; compact leaves the house out. */
export function triadText(row: TriadRowData, compact = false): string {
  if (row.at === null) return row.blind ?? "";
  return row.house && !compact ? `${row.at} · ${row.house}` : row.at;
}

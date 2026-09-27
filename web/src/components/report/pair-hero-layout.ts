/**
 * The compatibility hero's layout (ADR-70, ADR-99), pure: which person sits on
 * the left, how much each triad row says at this width, whether the two
 * columns sit side by side, and where the cue's stem ends against the corner
 * text. No ring: one centred group, each name once over its three rows, and
 * both birth records in the four corners.
 */
import { houseWithWord } from "@/lib/evidence-glossary";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { SIGN_ORDER, norm360 } from "@/components/chart/wheel-geometry";
import { PLANET_LABELS, type ChartData } from "@/types/chart";

export type PairSide = "A" | "B";

/** From this width up a row carries the house and the ruler; below it, the degree and the sign. */
export const PAIR_DETAIL_FROM = 640;

export interface PairHeroInput {
  viewportWidth: number;
  /** The reader's own report, when one of the two is theirs. */
  selfSide: PairSide | null;
}

export interface PairHeroLayout {
  left: PairSide;
  right: PairSide;
  detail: "degree" | "full";
}

export function pairHeroLayout(input: PairHeroInput): PairHeroLayout {
  const left: PairSide = input.selfSide === "B" ? "B" : "A";
  return { left, right: left === "A" ? "B" : "A", detail: input.viewportWidth >= PAIR_DETAIL_FROM ? "full" : "degree" };
}

export const NOT_DRAWN = "not drawn";

export interface TriadRow {
  key: "sun" | "moon" | "rising";
  label: string;
  value: string;
  /** The rising row of a blind chart: no degree, no sign. */
  blind?: boolean;
}

const signAt = (absoluteDegree: number): string => SIGN_ORDER[Math.floor(norm360(absoluteDegree) / 30)];
const inSign = (absoluteDegree: number): string => `${(norm360(absoluteDegree) % 30).toFixed(2)}°`;

/** A body swept across the birth-time band (ADR-33): "10.20°–22.85° Pisces", both signs named when it crosses one. */
export function bandText(band: { fromDegree: number; toDegree: number }): string {
  const from = signAt(band.fromDegree);
  const to = signAt(band.toDegree);
  return from === to
    ? `${inSign(band.fromDegree)}–${inSign(band.toDegree)} ${to}`
    : `${inSign(band.fromDegree)} ${from}–${inSign(band.toDegree)} ${to}`;
}

/** The three rows of one column at this detail. A blind chart's rising row reads "not drawn". */
export function triadRows(chart: ChartData, detail: PairHeroLayout["detail"]): TriadRow[] {
  const asc = chart.angles?.ascendant ?? null;
  const body = (key: "sun" | "moon"): string => {
    const p = chart.planets[key];
    if (!p) return "";
    const base = p.band ? bandText(p.band) : `${p.degree.toFixed(2)}° ${p.sign}`;
    return detail === "full" && p.house && asc ? `${base} · ${houseWithWord(p.house)}` : base;
  };
  const rising = (): string => {
    if (!asc) return NOT_DRAWN;
    const ruler = TRADITIONAL_RULER[asc.sign];
    const base = `${asc.degree.toFixed(2)}° ${asc.sign}`;
    return detail === "full" && ruler ? `${base} · ruled by ${PLANET_LABELS[ruler]}` : base;
  };
  return [
    { key: "sun", label: "Sun", value: body("sun") },
    { key: "moon", label: "Moon", value: body("moon") },
    { key: "rising", label: "Rising", value: rising(), blind: !asc },
  ];
}

/** The row's text as the page prints it: a blind rising row reads "rising · not drawn". */
export function rowText(row: TriadRow): string {
  return row.blind ? `rising · ${row.value}` : row.value;
}

/**
 * The pair hero's stack, in CSS pixels; the cue must end clear of the corner
 * text (ADR-70). A column is measured on its widest full row, "29.99°
 * Sagittarius · 7th (partnership)" at 11.5 px Plex Mono (38 characters at
 * 6.9 px) plus the render, the key and their gaps.
 */
export const PAIR_STACK = {
  nav: 56,
  padTop: 16,
  padX: 16,
  gap: 18,
  eyebrow: 22,
  /** The name line: clamp(28px, 4.2vw, 52px) at a line height of 1.08, then the gap to its rows. */
  nameMin: 28,
  nameMax: 52,
  nameShare: 0.042,
  nameLineHeight: 1.08,
  nameGap: 8,
  /** Three legend rows and their gaps. */
  rows: 3 * 29 + 2 * 7,
  /** The AND between the columns, stacked. */
  and: 20,
  /** The AND between the columns, side by side, with its gaps. */
  andColumn: 88,
  columnWidth: 354,
  cue: 92,
  cuePad: 4,
  hudBand: 40,
  clearance: 24,
} as const;

/** Side by side from this width: two measured columns, the AND between and the padding. */
export const PAIR_COLUMNS_FROM = 2 * PAIR_STACK.columnWidth + PAIR_STACK.andColumn + 2 * PAIR_STACK.padX;

export interface PairStack {
  order: Array<"eyebrow" | "columns" | "cue">;
  /** Whether the two columns sit side by side or, on a phone, one under the other with the AND between. */
  columnsSideBySide: boolean;
  stemBottom: number;
  hudTop: number;
  clearance: number;
}

function nameLine(viewportWidth: number): number {
  return Math.min(PAIR_STACK.nameMax, Math.max(PAIR_STACK.nameMin, PAIR_STACK.nameShare * viewportWidth)) * PAIR_STACK.nameLineHeight;
}

/** One centred group; the stack fits above the corners at every phone height by giving up nothing but air. */
export function pairStack(viewportWidth: number, viewportHeight: number): PairStack {
  const columnsSideBySide = viewportWidth >= PAIR_COLUMNS_FROM;
  const column = nameLine(viewportWidth) + PAIR_STACK.nameGap + PAIR_STACK.rows;
  const columns = columnsSideBySide ? column : column * 2 + PAIR_STACK.gap * 2 + PAIR_STACK.and;
  const top = PAIR_STACK.nav + PAIR_STACK.padTop;
  const hudTop = viewportHeight - PAIR_STACK.hudBand;
  const content = PAIR_STACK.eyebrow + PAIR_STACK.gap + columns + PAIR_STACK.gap + PAIR_STACK.cue;
  // Centred in the room above the corners, never lower than the clearance allows.
  const room = hudTop - PAIR_STACK.clearance - top;
  const start = top + Math.max(0, (room - content) / 2);
  const stemBottom = Math.min(start + content, hudTop - PAIR_STACK.clearance) - PAIR_STACK.cuePad;
  return { order: ["eyebrow", "columns", "cue"], columnsSideBySide, stemBottom, hudTop, clearance: hudTop - stemBottom };
}

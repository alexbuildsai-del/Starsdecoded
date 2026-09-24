/**
 * The compatibility hero's layout (ADR-70), pure: which person sits on the
 * left, how much each triad row says at this width, and where the cue's
 * stem ends against the corner text. No ring: two triad plates, one per
 * person, and both birth records in the four corners.
 */
import { ORDINALS } from "@/lib/evidence-glossary";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
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

/** The three rows of one plate at this detail. A blind chart's rising row reads "not drawn". */
export function triadRows(chart: ChartData, detail: PairHeroLayout["detail"]): TriadRow[] {
  const asc = chart.angles?.ascendant ?? null;
  const body = (key: "sun" | "moon"): string => {
    const p = chart.planets[key];
    if (!p) return "";
    const base = `${p.degree.toFixed(2)}° ${p.sign}`;
    return detail === "full" && p.house && asc ? `${base} · ${ORDINALS[p.house - 1]}` : base;
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

/** The pair hero's stack, in CSS pixels; the cue must end clear of the corner text (ADR-70). */
export const PAIR_STACK = {
  nav: 56,
  padTop: 16,
  gap: 18,
  eyebrow: 22,
  /** Two name lines and the AND between them. */
  names: 132,
  /** A plate: the mini ring and three rows. */
  plate: 236,
  cue: 92,
  cuePad: 4,
  hudBand: 40,
  clearance: 24,
} as const;

export interface PairStack {
  order: Array<"eyebrow" | "names" | "plates" | "cue">;
  /** Whether the two plates sit side by side or, on a very narrow screen, one under the other. */
  platesSideBySide: boolean;
  stemBottom: number;
  hudTop: number;
  clearance: number;
}

/** Side by side from 320 px; the stack fits above the corners at every phone height by giving up nothing but air. */
export function pairStack(viewportWidth: number, viewportHeight: number): PairStack {
  const platesSideBySide = viewportWidth >= 320;
  const plates = platesSideBySide ? PAIR_STACK.plate : PAIR_STACK.plate * 2 + PAIR_STACK.gap;
  const top = PAIR_STACK.nav + PAIR_STACK.padTop;
  const hudTop = viewportHeight - PAIR_STACK.hudBand;
  const content = PAIR_STACK.eyebrow + PAIR_STACK.gap + PAIR_STACK.names + PAIR_STACK.gap + plates + PAIR_STACK.gap + PAIR_STACK.cue;
  // Centred in the room above the corners, never lower than the clearance allows.
  const room = hudTop - PAIR_STACK.clearance - top;
  const start = top + Math.max(0, (room - content) / 2);
  const stemBottom = Math.min(start + content, hudTop - PAIR_STACK.clearance) - PAIR_STACK.cuePad;
  return { order: ["eyebrow", "names", "plates", "cue"], platesSideBySide, stemBottom, hudTop, clearance: hudTop - stemBottom };
}

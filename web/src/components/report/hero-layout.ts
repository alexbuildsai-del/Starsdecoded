/**
 * Where the hero's labels go. Pure: degrees and pixels in, positions out, so
 * the one promise the plate makes can be asserted rather than eyeballed.
 *
 * A body never leaves its degree. A label sits beside its body on the side away
 * from the centre and, if it would touch anything, slides vertically outward in
 * fixed steps until it is clear (ADR-27). When the Sun and the Moon are within
 * a disc of each other the Moon holds the ring and the Sun steps outward along
 * its own spoke, so two discs never overlap and neither is moved off its angle.
 */
import { norm360, pointAt, theta, type Point } from "@/components/chart/wheel-geometry";
import { houseWithWord } from "@/lib/evidence-glossary";

export const CONJUNCTION_DEGREES = 12;
/** How far outside the ring the Sun steps when the two lights are together. */
export const OUTSIDE_STEP = 118;
export const SLIDE_STEP = 22;
const MAX_SLIDES = 14;
/** Clear space between a body's edge and its label. */
const LABEL_GAP = 16;

/**
 * What a plate puts at east. "sign" is the chart wheel's frame (`theta`): the start of the rising sign, where its 1st
 * house begins. "degree" is the Ascendant itself, as the loading story frames it. The hero's horizon is level (ADR-395),
 * and on the sign's frame the line through the Ascendant and the Descendant leans by the Ascendant's degree in its sign,
 * up to 30°.
 */
export type FrameOn = "sign" | "degree";

/** A longitude's angle on a plate, counter-clockwise from +x, with east (180°) on the left as every chart is drawn. */
export function heroTheta(absoluteDegree: number, frameDegree: number, frameOn: FrameOn = "sign"): number {
  return frameOn === "degree" ? 180 + norm360(absoluteDegree - frameDegree) : theta(absoluteDegree, frameDegree);
}

export interface Rect { x: number; y: number; w: number; h: number }

export interface HeroBody {
  key: string;
  absoluteDegree: number;
  /** Rendered diameter in plate units. */
  size: number;
}

export interface HeroLayoutInput {
  cx: number;
  cy: number;
  ringRadius: number;
  /** The frame: the Ascendant when the horizon is drawn, 0° Aries when it is not. */
  frameDegree: number;
  /** "sign", the wheel's frame, unless given: the hero and `TriadPlate` pass "degree". */
  frameOn?: FrameOn;
  /** In placement order: the Sun is placed first, so it wins the room it needs. */
  bodies: HeroBody[];
  labelWidth: number;
  labelHeight: number;
  /** What every label must also avoid: the name plate, on a plate that holds the name. */
  obstacles: Rect[];
  /**
   * The horizon labels' blocks at rest, each under its end of the line. A block that touches a body's disc or an obstacle
   * slides down, away from the line, until it is clear, so a Moon just past the Ascendant no longer covers "EAST · RISING"
   * (ADR-27, B-62); the bodies' labels then avoid it where it landed.
   */
  horizonLabels?: Rect[];
  /**
   * `OUTSIDE_STEP` unless given: a plate too small for it passes the room it has, so its Sun stays on it even where
   * the two discs then overlap (MB-171).
   */
  outsideStep?: number;
}

export interface PlacedBody {
  key: string;
  x: number;
  y: number;
  size: number;
  /** True when the body stepped outside the ring to clear a conjunction. */
  outside: boolean;
}

export interface PlacedLabel {
  key: string;
  x: number;
  y: number;
  anchor: "start" | "end";
  rect: Rect;
}

export interface HeroLayout {
  bodies: PlacedBody[];
  labels: PlacedLabel[];
  /** How far down each of `horizonLabels` slid, in the same order: 0 where nothing touched it. */
  horizonDrops: number[];
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** The shorter way round between two ecliptic longitudes. */
export function separation(a: number, b: number): number {
  const d = norm360(a - b);
  return d > 180 ? 360 - d : d;
}

function discRect(b: PlacedBody): Rect {
  return { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };
}

function labelRect(x: number, y: number, anchor: "start" | "end", w: number, h: number): Rect {
  return { x: anchor === "start" ? x : x - w, y: y - h * 0.72, w, h };
}

/** Where the bodies sit, which no label or name moves: the plate's own fields of `HeroLayoutInput`. */
export type BodyPlacementInput = Pick<HeroLayoutInput, "cx" | "cy" | "ringRadius" | "frameDegree" | "frameOn" | "bodies" | "outsideStep">;

export function placeBodies(input: BodyPlacementInput): PlacedBody[] {
  const { cx, cy, ringRadius, frameDegree: asc, frameOn = "sign", outsideStep = OUTSIDE_STEP } = input;
  // The Sun is the one body allowed to leave the ring, and only to clear the
  // Moon. Everything else sits on it.
  const moon = input.bodies.find((b) => b.key === "moon");
  return input.bodies.map((b) => {
    const t = heroTheta(b.absoluteDegree, asc, frameOn);
    const tight = b.key === "sun" && moon !== undefined
      && separation(b.absoluteDegree, moon.absoluteDegree) < CONJUNCTION_DEGREES;
    const radius = tight ? ringRadius + outsideStep : ringRadius;
    const p = pointAt(cx, cy, radius, t);
    return { key: b.key, x: p.x, y: p.y, size: b.size, outside: tight };
  });
}

export function layoutHero(input: HeroLayoutInput): HeroLayout {
  const { cx, cy, labelWidth, labelHeight } = input;
  const placed = placeBodies(input);
  const discs = placed.map(discRect);
  const fixed = [...input.obstacles, ...discs];
  const blocks = input.horizonLabels ?? [];
  const horizonDrops = blocks.map((block) => {
    let drop = 0;
    for (let step = 1; step <= MAX_SLIDES && fixed.some((f) => overlaps({ ...block, y: block.y + drop }, f)); step++) {
      drop = step * SLIDE_STEP;
    }
    return drop;
  });

  const taken: Rect[] = [...input.obstacles, ...blocks.map((b, i) => ({ ...b, y: b.y + horizonDrops[i] })), ...discs];
  const labels: PlacedLabel[] = [];

  for (const body of placed) {
    const right = body.x >= cx;
    const anchor: "start" | "end" = right ? "start" : "end";
    const x = body.x + (right ? 1 : -1) * (body.size / 2 + LABEL_GAP);
    // Outward is away from the centre, so a label never slides across the plate.
    const direction = body.y <= cy ? -1 : 1;

    let y = body.y;
    let rect = labelRect(x, y, anchor, labelWidth, labelHeight);
    for (let step = 1; step <= MAX_SLIDES && taken.some((t) => overlaps(rect, t)); step++) {
      y = body.y + direction * step * SLIDE_STEP;
      rect = labelRect(x, y, anchor, labelWidth, labelHeight);
    }
    labels.push({ key: body.key, x, y, anchor, rect });
    taken.push(rect);
  }

  return { bodies: placed, labels, horizonDrops };
}

/** The hero's rising marker, in plate units: its ring's radius and stroke. */
export const MARKER_RADIUS = 13;
export const MARKER_STROKE = 1.5;
/** How far the marker reaches right of its centre, towards the name; its tick points the other way, outward. */
export const MARKER_REACH = MARKER_RADIUS + MARKER_STROKE / 2;
/** Clear air, in px, that the name keeps from the rising marker and from every body. */
export const NAME_AIR = 8;

export interface Size { width: number; height: number }

export interface NamePlaceInput {
  /** The plate's centre and its ring's radius, in plate units, and the screen px one unit takes. */
  cx: number;
  cy: number;
  ringRadius: number;
  scale: number;
  /**
   * The name at each size it may take, largest first: its own rung of the ladder, then the rungs below. Each is
   * measured as drawn at that size, since the face's widths do not scale in step with its size.
   */
  names: (Size & { size: number })[];
  /** Each row's text width over the row's height, in px; no date on a report that has none. */
  eyebrow: Size;
  written: Size | null;
  /** Px between the rows. */
  gap: number;
  /** The bodies as drawn, in plate units. */
  bodies: PlacedBody[];
}

export interface NamePlace {
  size: number;
  /** Px from the line up to the standing name and down to its date; null while the name is centred on the line. */
  clearance: number | null;
  scale: number;
  /** The rows where they sit, eyebrow, name and date, each with NAME_AIR around it, in plate units: what labels avoid. */
  obstacles: Rect[];
}

/** Px from a body's disc to a box, both in px from the plate's centre: below zero where they overlap. */
function discGap(disc: { x: number; y: number; r: number }, box: Rect): number {
  const dx = Math.max(box.x - disc.x, 0, disc.x - (box.x + box.w));
  const dy = Math.max(box.y - disc.y, 0, disc.y - (box.y + box.h));
  return Math.hypot(dx, dy) - disc.r;
}

/**
 * Where a plate that holds the name puts it, and at what size. The name is centred on the horizon, which runs behind
 * its halo; a name wide enough to reach the rising marker would cover it, so it stands just above the line instead,
 * its date just below. Wherever it sits, a body under the name or its date would be covered, so the name takes the
 * ladder's next rung and is placed again: it stands only if it still reaches the marker. The largest size that keeps
 * NAME_AIR from every body wins; failing that, the largest that covers none; failing that, the one that covers least.
 * Only the name's widths and the bodies decide, so the choice holds once it is drawn. Null before the plate is laid out.
 */
export function placeName(input: NamePlaceInput): NamePlace | null {
  const { scale, eyebrow, written, gap } = input;
  if (!(scale > 0) || input.names.length === 0) return null;
  const reach = MARKER_REACH * scale;
  const markerRight = -input.ringRadius * scale + reach;
  const clearance = reach + NAME_AIR;
  const discs = input.bodies.map((b) => ({ x: (b.x - input.cx) * scale, y: (b.y - input.cy) * scale, r: (b.size / 2) * scale }));
  const air = NAME_AIR / scale;
  const row = (width: number, top: number, height: number): Rect => ({ x: -width / 2, y: top, w: width, h: height });
  const options = input.names.map((name) => {
    const stands = -name.width / 2 < markerRight + NAME_AIR;
    // Px from the plate's centre, the line through it: the centred block is centred on the line, as the page sets it.
    const nameTop = stands
      ? -clearance - name.height
      : -(eyebrow.height + gap + name.height + (written ? gap + written.height : 0)) / 2 + eyebrow.height + gap;
    const rows = [
      row(eyebrow.width, nameTop - gap - eyebrow.height, eyebrow.height),
      row(name.width, nameTop, name.height),
      ...(written ? [row(written.width, stands ? clearance : nameTop + name.height + gap, written.height)] : []),
    ];
    const place: NamePlace = {
      size: name.size,
      clearance: stands ? clearance : null,
      scale,
      obstacles: rows.map((r) => ({ x: input.cx + r.x / scale - air, y: input.cy + r.y / scale - air, w: r.w / scale + 2 * air, h: r.h / scale + 2 * air })),
    };
    const nearest = Math.min(Infinity, ...discs.flatMap((d) => rows.map((r) => discGap(d, r))));
    return { place, nearest };
  });
  const least = options.reduce((best, o) => (o.nearest > best.nearest ? o : best));
  return (options.find((o) => o.nearest >= NAME_AIR) ?? options.find((o) => o.nearest >= 0) ?? least).place;
}

export interface MoonArc {
  /** The ring points at the band's two ends, in order of travel. */
  from: Point;
  to: Point;
  /** Degrees the Moon covered, forward along the zodiac. */
  span: number;
  /** An SVG path along the ring from one end to the other, sampled so no sweep flag can be wrong. */
  d: string;
}

/**
 * The arc the Moon travelled across the birth-time band (ADR-37): its ends are
 * its longitudes at the band's edges, on the same ring the bodies sit on. The
 * Moon never runs backwards, so the arc is always the forward way round.
 */
export function moonArc(
  cx: number, cy: number, ringRadius: number, frameDegree: number, band: { fromDegree: number; toDegree: number }, frameOn: FrameOn = "sign",
): MoonArc {
  const span = norm360(band.toDegree - band.fromDegree);
  const steps = Math.max(1, Math.ceil(span));
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const deg = i === steps ? band.toDegree : band.fromDegree + (span * i) / steps;
    points.push(pointAt(cx, cy, ringRadius, heroTheta(deg, frameDegree, frameOn)));
  }
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  return { from: points[0], to: points[points.length - 1], span, d };
}

// ---------------------------------------------------------------------------
// The phone tier (ADR-59, review 20/09 note 1): the ring on top, the name
// under it, the triad legend, then the cue, whose stem ends clear of the
// corner text. Pure, so the stack order and the clearance can be asserted.
// ---------------------------------------------------------------------------

/** The fixed sizes of the phone stack, in CSS pixels; the component draws from the same numbers. */
export const PHONE = {
  /** The transparent top bar. */
  nav: 56,
  padTop: 12,
  gap: 14,
  /** The ring's diameter as a share of the viewport width, when the height allows it. */
  ringShare: 0.82,
  /** The ring's diameter as a share of the plate's square svg. */
  ringOfSvg: 0.82,
  eyebrow: 22,
  nameGap: 8,
  nameLineHeight: 1.08,
  legendRow: 29,
  legendGap: 7,
  legendRows: 3,
  /** Label, gap, a 56 px stem, padding. */
  cue: 92,
  /** The stem ends at the cue's bottom padding. */
  cuePad: 4,
  /** "Written on 5 Oct 2026", one line in 11 px type with its leading. */
  written: 16,
  /** The corner text's two lines and the hud's padding, up from the viewport's bottom. */
  hudBand: 40,
  clearance: 24,
} as const;

export type PhoneStackItem = "ring" | "name" | "legend" | "cue";

export interface PhoneStackInput {
  viewportWidth: number;
  viewportHeight: number;
  nameLines: number;
  nameSize: number;
  /** A "Written on" line sits under the name. */
  dated?: boolean;
}

export interface PhoneStack {
  order: PhoneStackItem[];
  /** The plate svg's side, square. */
  svg: number;
  /** The ring's diameter. */
  ring: number;
  name: number;
  legend: number;
  cue: number;
  /** Where the cue's stem ends, from the viewport's top. */
  stemBottom: number;
  /** The corner text's top edge, from the viewport's top. */
  hudTop: number;
  clearance: number;
}

/**
 * The stack from the top: ring, name, legend, cue. The ring takes 82vw; when
 * the viewport is too short for that, the ring gives way, never the name,
 * which has already broken to its lines from its length alone.
 */
export function phoneStack(input: PhoneStackInput): PhoneStack {
  const name = PHONE.eyebrow + PHONE.nameGap + input.nameLines * input.nameSize * PHONE.nameLineHeight
    + (input.dated ? PHONE.nameGap + PHONE.written : 0);
  const legend = PHONE.legendRows * PHONE.legendRow + (PHONE.legendRows - 1) * PHONE.legendGap;
  const cue = PHONE.cue;
  const hudTop = input.viewportHeight - PHONE.hudBand;
  const rest = 3 * PHONE.gap + name + legend + cue;
  const top = PHONE.nav + PHONE.padTop;
  const svgMax = hudTop - PHONE.clearance - top - rest;
  const svgWanted = (input.viewportWidth * PHONE.ringShare) / PHONE.ringOfSvg;
  const svg = Math.max(0, Math.min(svgWanted, svgMax));
  const ring = svg * PHONE.ringOfSvg;
  const stemBottom = top + svg + rest - PHONE.cuePad;
  return { order: ["ring", "name", "legend", "cue"], svg, ring, name, legend, cue, stemBottom, hudTop, clearance: hudTop - stemBottom };
}

/**
 * The Ascendant as the hero's Sun and Moon values are written (`triadText`): "Gemini 19.07° · 1st (self)". The Rising begins the
 * 1st house in a whole-sign chart, so the house needs no input. Null on a chart with no birth time, which has no horizon.
 */
export function ascendantValue(asc: { sign: string; degree: number } | null | undefined): string | null {
  if (!asc || !Number.isFinite(asc.degree)) return null;
  return `${asc.sign} ${asc.degree.toFixed(2)}° · ${houseWithWord(1)}`;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "5 Oct 2026" in the reader's own day, built by hand because en-GB spells September "Sept" in newer engines. */
export function shortDate(when: string | Date | null | undefined): string | null {
  if (when === null || when === undefined || when === "") return null;
  const d = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Written on 5 Oct 2026", or null when the report has no date to give. */
export function writtenOnText(when: string | Date | null | undefined): string | null {
  const day = shortDate(when);
  return day ? `Written on ${day}` : null;
}

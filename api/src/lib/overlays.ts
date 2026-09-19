/**
 * Whole-sign overlays, both directions: which of one person's bodies sit in
 * which of the other's houses (ADR-43). Pure. A house is counted from the
 * host's Ascendant sign, so a host whose horizon is unknown has no houses
 * and the overlays onto them are omitted, never guessed (R-4.6).
 */
import { hasHorizon, type NatalChartData } from "./chartCalculation.js";
import { BODIES, type Body } from "../prompts/vocabulary.js";

export type Side = "A" | "B";

export interface Overlay {
  /** The body that sits in the other chart's house. */
  planet: Body;
  of: Side;
  /** Whose houses it is read against. */
  inHouseOf: Side;
  house: number;
}

/** A luminary anywhere, or three or more of one person's bodies in one of the other's houses. */
export interface NotableOverlay {
  inHouseOf: Side;
  house: number;
  of: Side;
  planets: Body[];
  reason: "luminary" | "cluster";
}

const LUMINARIES = new Set<Body>(["sun", "moon"]);
/** The bodies that overlay: the ten planets. Nodes and Chiron colour a natal chart but do not land on another's. */
const OVERLAY_BODIES = BODIES.filter((b) => b !== "chiron" && b !== "north_node" && b !== "south_node");

function wholeSignHouse(longitude: number, ascendantLongitude: number): number {
  const asc = Math.floor((((ascendantLongitude % 360) + 360) % 360) / 30);
  const lon = Math.floor((((longitude % 360) + 360) % 360) / 30);
  return ((lon - asc + 12) % 12) + 1;
}

function onto(guest: NatalChartData, of: Side, host: NatalChartData, inHouseOf: Side): Overlay[] {
  if (!hasHorizon(host)) return [];
  const asc = host.angles.ascendant.absoluteDegree;
  const out: Overlay[] = [];
  for (const planet of OVERLAY_BODIES) {
    const p = guest.planets[planet];
    if (!p) continue;
    out.push({ planet, of, inHouseOf, house: wholeSignHouse(p.absoluteDegree, asc) });
  }
  return out;
}

/** Every overlay in both directions: A's bodies in B's houses and B's bodies in A's. */
export function computeOverlays(chartA: NatalChartData, chartB: NatalChartData): Overlay[] {
  return [...onto(chartA, "A", chartB, "B"), ...onto(chartB, "B", chartA, "A")];
}

/**
 * The overlays worth a card: a luminary in any house of the other, or three
 * or more of one person's bodies in one house of the other. One entry per
 * house and direction; a cluster that also holds a luminary reads as a cluster.
 */
export function notableOverlays(overlays: Overlay[]): NotableOverlay[] {
  const byHouse = new Map<string, Overlay[]>();
  for (const o of overlays) {
    const key = `${o.of}>${o.inHouseOf}:${o.house}`;
    byHouse.set(key, [...(byHouse.get(key) ?? []), o]);
  }
  const out: NotableOverlay[] = [];
  for (const group of byHouse.values()) {
    const { of, inHouseOf, house } = group[0];
    const planets = group.map((o) => o.planet);
    if (planets.length >= 3) out.push({ inHouseOf, house, of, planets, reason: "cluster" });
    else if (planets.some((p) => LUMINARIES.has(p))) out.push({ inHouseOf, house, of, planets: planets.filter((p) => LUMINARIES.has(p)), reason: "luminary" });
  }
  return out.sort((x, y) => (x.inHouseOf === y.inHouseOf ? x.house - y.house : x.inHouseOf < y.inHouseOf ? -1 : 1));
}

export function findOverlay(overlays: Overlay[], planet: string, of: Side, inHouseOf: Side): Overlay | undefined {
  return overlays.find((o) => o.planet === planet && o.of === of && o.inHouseOf === inHouseOf);
}

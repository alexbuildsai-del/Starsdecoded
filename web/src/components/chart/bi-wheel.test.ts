/**
 * The longitudes are the engine's own output for the committed marie-curie
 * and oprah-winfrey fixtures; the API's overlays.test.ts pins the same pair.
 */
import { describe, expect, it } from "vitest";
import { crossLinks, hostHouses, layoutBiWheel, linkColour, linkEndpoints, swapHost } from "./bi-wheel";
import { houseOf, norm360 } from "./wheel-geometry";
import type { ChartData, ChartPlanet } from "@/types/chart";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const CURIE: Record<string, number> = { sun: 224.58, mercury: 246.63, venus: 235.57, mars: 239.62, jupiter: 328.01, saturn: 235.27, uranus: 102.73, neptune: 12.85, pluto: 45.13, moon: 346.48, chiron: 119.36, north_node: 160.97, south_node: 340.97 };
const WINFREY: Record<string, number> = { sun: 308.99, mercury: 319.16, venus: 308.86, mars: 233.58, jupiter: 76.66, saturn: 219.05, uranus: 110.31, neptune: 206.06, pluto: 144.15, moon: 244.53, chiron: 25.58, north_node: 293.24, south_node: 113.24 };

function chart(lon: Record<string, number>, asc: number | null, mc = 0): ChartData {
  const angle = (d: number) => ({ sign: SIGNS[Math.floor(d / 30)], degree: d % 30, absoluteDegree: d });
  const planets = Object.fromEntries(Object.entries(lon).map(([k, d]): [string, ChartPlanet] => [k, {
    ...angle(d), ...(asc !== null ? { house: houseOf(d, asc) } : {}), retrograde: false, speed: 1,
  }]));
  return {
    planets,
    ...(asc !== null ? { angles: { ascendant: angle(asc), midheaven: angle(mc), descendant: angle(norm360(asc + 180)), ic: angle(norm360(mc + 180)) }, houses: {} } : {}),
    horizon: { status: asc !== null ? "known" : "unknown" } as ChartData["horizon"],
    elements: { fire: 0, earth: 0, air: 0, water: 0 }, modalities: { cardinal: 0, fixed: 0, mutable: 0 },
    dominance: { dominantElement: "water", dominantModality: "fixed", dominantPlanets: [] }, aspects: [], chartShape: null,
  };
}

const A = chart(CURIE, 282.07, 228.63);
const B = chart(WINFREY, 269.69, 197.41);

describe("cross links", () => {
  it("draws only cross aspects within four degrees of the Curie-Winfrey pair, tightest first", () => {
    const links = crossLinks(A, B);
    expect(links.length).toBeGreaterThan(5);
    for (const l of links) {
      const sep = Math.abs(norm360(CURIE[l.planetA]) - norm360(WINFREY[l.planetB]));
      const d = sep > 180 ? 360 - sep : sep;
      const angle = { conjunction: 0, opposition: 180, trine: 120, square: 90, sextile: 60 }[l.type]!;
      expect(Math.abs(d - angle)).toBeLessThanOrEqual(4);
      expect(l.orb).toBeLessThanOrEqual(4);
    }
    for (let i = 1; i < links.length; i++) expect(links[i].orb).toBeGreaterThanOrEqual(links[i - 1].orb);
    // Curie's Moon square Winfrey's Jupiter, 0.2°, is the tightest link the engine reports too.
    expect(links[0]).toEqual({ planetA: "moon", planetB: "jupiter", type: "square", orb: 0.2 });
  });

  it("colours a conjunction brass, a trine or sextile teal, a square or opposition rose", () => {
    expect(linkColour("conjunction")).toBe("brass");
    expect(linkColour("trine")).toBe("teal");
    expect(linkColour("sextile")).toBe("teal");
    expect(linkColour("square")).toBe("rose");
    expect(linkColour("opposition")).toBe("rose");
  });
});

describe("the layout", () => {
  it("keeps every body at its true degree on its own ring, A inside and B outside", () => {
    const layout = layoutBiWheel(A, B, "A", 600);
    for (const p of layout.a) expect(layout.radii.innerLanes).toContain(p.radius);
    for (const p of layout.b) expect(layout.radii.outerLanes).toContain(p.radius);
    const sun = layout.a.find((p) => p.key === "sun")!;
    expect(norm360(sun.theta - 180)).toBeCloseTo(norm360(CURIE.sun - 270), 6);
    expect(layout.houses).toBe(true);
    expect(layout.ascendant).toBe(282.07);
  });

  it("swaps the host in one move and re-hosts the houses on the other Ascendant", () => {
    const asA = layoutBiWheel(A, B, "A", 600);
    const asB = layoutBiWheel(A, B, swapHost("A"), 600);
    expect(asB.host).toBe("B");
    expect(asB.ascendant).toBe(269.69);
    expect(hostHouses(asA)![0].sign).toBe("Capricorn");
    expect(hostHouses(asB)![0].sign).toBe("Sagittarius");
    // Winfrey's Sun in Curie's 2nd, Curie's Sun in Winfrey's 12th: the host's houses are the host's.
    const winfreySunInA = hostHouses(asA)!.find((h) => h.sign === SIGNS[Math.floor(WINFREY.sun / 30)])!.house;
    expect(winfreySunInA).toBe(2);
    const curieSunInB = hostHouses(asB)!.find((h) => h.sign === SIGNS[Math.floor(CURIE.sun / 30)])!.house;
    expect(curieSunInB).toBe(12);
    // The bodies never move between rings when the host swaps; only the frame turns.
    expect(asB.a.map((p) => p.radius).every((r) => asB.radii.innerLanes.includes(r))).toBe(true);
  });

  it("draws every link between the two bodies' true angles on the aspect disc", () => {
    const layout = layoutBiWheel(A, B, "A", 600);
    for (const link of layout.links) {
      const ends = linkEndpoints(layout, link, A, B)!;
      const c = layout.radii.centre;
      expect(Math.hypot(ends.from.x - c, ends.from.y - c)).toBeCloseTo(layout.radii.aspect, 6);
      expect(Math.hypot(ends.to.x - c, ends.to.y - c)).toBeCloseTo(layout.radii.aspect, 6);
    }
  });

  it("drops the house ring when the host is blind and keeps the sign band and the aspects", () => {
    const blindA = chart(CURIE, null);
    const layout = layoutBiWheel(blindA, B, "A", 600);
    expect(layout.houses).toBe(false);
    expect(hostHouses(layout)).toBeNull();
    expect(layout.links.length).toBe(crossLinks(A, B).length);
    expect(layout.a.length).toBe(13);
    const other = layoutBiWheel(blindA, B, "B", 600);
    expect(other.houses).toBe(true);
  });
});

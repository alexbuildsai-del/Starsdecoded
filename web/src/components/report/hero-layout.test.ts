/**
 * Both charts are the engine's own output for real birth data. Marie Curie is
 * the committed fixture, the same longitudes wheel-geometry.test.ts pins. The
 * second is a chart whose Sun and Moon are 0.02° apart, computed once with:
 *
 *   pnpm --filter @workspace/api-server exec tsx -e \
 *     'import {calculateNatalChart} from "./src/lib/chartCalculation.js";
 *      console.log(calculateNatalChart("1999-08-11","12:10",51.5074,-0.1278,1))'
 */
import { describe, expect, it } from "vitest";
import {
  CONJUNCTION_DEGREES, OUTSIDE_STEP, PHONE, ascendantValue, layoutHero, moonArc, overlaps, phoneStack, separation, shortDate, writtenOnText,
} from "./hero-layout";
import { angleGlyphRadius } from "./AngleGlyph";
import { pointAt, theta } from "@/components/chart/wheel-geometry";

const PLATE = { cx: 500, cy: 330, ringRadius: 200, labelWidth: 176, labelHeight: 30 };

// The name plate at the centre and the two horizon labels, as the hero draws them.
const OBSTACLES = [
  { x: 500 - 150, y: 330 - 52, w: 300, h: 104 },
  { x: 160, y: 352, w: 150, h: 26 },
  { x: 690, y: 352, w: 150, h: 26 },
];

const CURIE = {
  ascendant: 282.07,
  bodies: [
    { key: "sun", absoluteDegree: 224.58, size: 116 },
    { key: "moon", absoluteDegree: 346.48, size: 72 },
  ],
};

/**
 * The same birth data with the time not recorded (marie-curie-unknown): the
 * band runs the whole day around noon, so the Moon's ends are its longitudes
 * at 00:00 and 23:59 local and the plate is framed on 0° Aries.
 */
const CURIE_BLIND = {
  frame: 0,
  moon: { absoluteDegree: 346.48, band: { fromDegree: 340.2, toDegree: 352.85 } },
};

const ECLIPSE = {
  ascendant: 205.91,
  bodies: [
    { key: "sun", absoluteDegree: 138.35, size: 116 },
    { key: "moon", absoluteDegree: 138.37, size: 72 },
  ],
};

function run(chart: typeof CURIE) {
  return layoutHero({ ...PLATE, frameDegree: chart.ascendant, bodies: chart.bodies, obstacles: OBSTACLES });
}

function discs(layout: ReturnType<typeof run>) {
  return layout.bodies.map((b) => ({ x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size }));
}

describe("separation", () => {
  it("takes the shorter way round", () => {
    expect(separation(1, 359)).toBeCloseTo(2, 6);
    expect(separation(138.35, 138.37)).toBeCloseTo(0.02, 6);
    expect(separation(224.58, 346.48)).toBeCloseTo(121.9, 6);
  });
});

describe("layoutHero", () => {
  it("leaves both bodies on the ring when they are nowhere near each other", () => {
    const layout = run(CURIE);
    for (const b of layout.bodies) {
      expect(b.outside).toBe(false);
      expect(Math.hypot(b.x - PLATE.cx, b.y - PLATE.cy)).toBeCloseTo(PLATE.ringRadius, 6);
    }
  });

  it("steps the Sun outside the ring and holds the Moon on it when they are together", () => {
    const layout = run(ECLIPSE);
    const sun = layout.bodies.find((b) => b.key === "sun")!;
    const moon = layout.bodies.find((b) => b.key === "moon")!;
    expect(sun.outside).toBe(true);
    expect(moon.outside).toBe(false);
    expect(Math.hypot(sun.x - PLATE.cx, sun.y - PLATE.cy)).toBeCloseTo(PLATE.ringRadius + OUTSIDE_STEP, 6);
    expect(Math.hypot(moon.x - PLATE.cx, moon.y - PLATE.cy)).toBeCloseTo(PLATE.ringRadius, 6);
    // Both discs stay readable: they no longer touch.
    expect(Math.hypot(sun.x - moon.x, sun.y - moon.y)).toBeGreaterThan((sun.size + moon.size) / 2);
    expect(separation(ECLIPSE.bodies[0].absoluteDegree, ECLIPSE.bodies[1].absoluteDegree)).toBeLessThan(CONJUNCTION_DEGREES);
  });

  it("steps the Sun by the step a plate passes, still along its own spoke, with the Moon still on the ring (MB-171)", () => {
    const step = 40;
    const layout = layoutHero({ ...PLATE, frameDegree: ECLIPSE.ascendant, bodies: ECLIPSE.bodies, obstacles: OBSTACLES, outsideStep: step });
    const sun = layout.bodies.find((b) => b.key === "sun")!;
    const moon = layout.bodies.find((b) => b.key === "moon")!;
    const spoke = pointAt(PLATE.cx, PLATE.cy, PLATE.ringRadius + step, theta(ECLIPSE.bodies[0].absoluteDegree, ECLIPSE.ascendant));
    expect(sun.outside).toBe(true);
    expect(sun.x).toBeCloseTo(spoke.x, 6);
    expect(sun.y).toBeCloseTo(spoke.y, 6);
    expect(moon.outside).toBe(false);
    expect(Math.hypot(moon.x - PLATE.cx, moon.y - PLATE.cy)).toBeCloseTo(PLATE.ringRadius, 6);
  });

  it("puts every label beside its body, on the side away from the centre", () => {
    for (const chart of [CURIE, ECLIPSE]) {
      const layout = run(chart);
      for (const label of layout.labels) {
        const body = layout.bodies.find((b) => b.key === label.key)!;
        if (body.x >= PLATE.cx) {
          expect(label.anchor).toBe("start");
          expect(label.x).toBeGreaterThan(body.x);
        } else {
          expect(label.anchor).toBe("end");
          expect(label.x).toBeLessThan(body.x);
        }
      }
    }
  });

  it("puts no label over another label, a body, the name plate or a horizon label", () => {
    for (const chart of [CURIE, ECLIPSE]) {
      const layout = run(chart);
      const fixed = [...OBSTACLES, ...discs(layout)];
      layout.labels.forEach((label, i) => {
        for (const other of fixed) {
          expect(overlaps(label.rect, other), `${label.key} label hits a fixed box`).toBe(false);
        }
        for (const later of layout.labels.slice(i + 1)) {
          expect(overlaps(label.rect, later.rect), `${label.key} label hits ${later.key}`).toBe(false);
        }
      });
    }
  });
});

describe("moonArc", () => {
  it("ends on the Moon's longitudes at the two edges of the band, on the ring", () => {
    const arc = moonArc(PLATE.cx, PLATE.cy, PLATE.ringRadius, CURIE_BLIND.frame, CURIE_BLIND.moon.band);
    const start = pointAt(PLATE.cx, PLATE.cy, PLATE.ringRadius, theta(CURIE_BLIND.moon.band.fromDegree, CURIE_BLIND.frame));
    const end = pointAt(PLATE.cx, PLATE.cy, PLATE.ringRadius, theta(CURIE_BLIND.moon.band.toDegree, CURIE_BLIND.frame));
    expect(arc.from.x).toBeCloseTo(start.x, 6);
    expect(arc.from.y).toBeCloseTo(start.y, 6);
    expect(arc.to.x).toBeCloseTo(end.x, 6);
    expect(arc.to.y).toBeCloseTo(end.y, 6);
    expect(arc.span).toBeCloseTo(12.65, 6);
    expect(arc.d.startsWith("M")).toBe(true);
    // The centre-time Moon sits on the arc, not off it.
    expect(Math.hypot(arc.from.x - PLATE.cx, arc.from.y - PLATE.cy)).toBeCloseTo(PLATE.ringRadius, 6);
  });

  it("goes the forward way round even across 0° Aries", () => {
    const arc = moonArc(PLATE.cx, PLATE.cy, PLATE.ringRadius, 0, { fromDegree: 355, toDegree: 8 });
    expect(arc.span).toBeCloseTo(13, 6);
  });

  it("keeps a blind layout's bodies on the ring with the plate framed on Aries", () => {
    const layout = layoutHero({
      ...PLATE, frameDegree: CURIE_BLIND.frame, obstacles: OBSTACLES,
      bodies: [{ key: "sun", absoluteDegree: 224.58, size: 116 }, { key: "moon", absoluteDegree: CURIE_BLIND.moon.absoluteDegree, size: 72 }],
    });
    for (const b of layout.bodies) expect(Math.hypot(b.x - PLATE.cx, b.y - PLATE.cy)).toBeCloseTo(PLATE.ringRadius, 6);
  });
});

describe("the phone stack", () => {
  const size = 44;

  it("puts the ring on top at 82vw, then the name, the legend and the cue, with the stem 24 px clear of the corner text", () => {
    const s = phoneStack({ viewportWidth: 390, viewportHeight: 844, nameLines: 1, nameSize: size });
    expect(s.order).toEqual(["ring", "name", "legend", "cue"]);
    expect(s.ring).toBeCloseTo(390 * PHONE.ringShare, 3);
    expect(s.clearance).toBeGreaterThanOrEqual(PHONE.clearance);
    expect(s.stemBottom).toBeLessThan(s.hudTop);
  });

  it("breaks the name to two lines before the ring shrinks", () => {
    const one = phoneStack({ viewportWidth: 390, viewportHeight: 844, nameLines: 1, nameSize: size });
    const two = phoneStack({ viewportWidth: 390, viewportHeight: 844, nameLines: 2, nameSize: 28 });
    expect(two.name).toBeGreaterThan(one.name);
    // The wrap comes from the name's length, never from the ring giving way; the ring holds within a hair.
    expect(two.ring).toBeGreaterThanOrEqual(one.ring * 0.98);
    expect(two.clearance).toBeGreaterThanOrEqual(PHONE.clearance);
  });

  it("gives up ring, never clearance, on a short phone", () => {
    const s = phoneStack({ viewportWidth: 390, viewportHeight: 664, nameLines: 2, nameSize: 28 });
    expect(s.order).toEqual(["ring", "name", "legend", "cue"]);
    expect(s.ring).toBeLessThan(390 * PHONE.ringShare);
    expect(s.ring).toBeGreaterThan(150);
    expect(s.clearance).toBeGreaterThanOrEqual(PHONE.clearance);
  });
});

describe("the Ascendant's value", () => {
  it("reads as the Sun's and Moon's values do, sign first, with the 1st house and its word", () => {
    expect(ascendantValue({ sign: "Gemini", degree: 19.07 })).toBe("Gemini 19.07° · 1st (self)");
    expect(ascendantValue({ sign: "Aries", degree: 0.5 })).toBe("Aries 0.50° · 1st (self)");
  });

  it("prints nothing on a chart with no birth time", () => {
    expect(ascendantValue(null)).toBeNull();
    expect(ascendantValue(undefined)).toBeNull();
  });
});

describe("the report's date", () => {
  it("says Written on, then the day in short form", () => {
    expect(writtenOnText("2026-10-05T12:00:00")).toBe("Written on 5 Oct 2026");
    expect(shortDate(new Date(2026, 8, 12, 12))).toBe("12 Sep 2026");
  });

  it("prints nothing without a date or with one that is not a date", () => {
    expect(writtenOnText(null)).toBeNull();
    expect(writtenOnText(undefined)).toBeNull();
    expect(writtenOnText("")).toBeNull();
    expect(writtenOnText("not a date")).toBeNull();
  });

  it("makes the phone's name taller by its line and still holds the clearance", () => {
    const plain = phoneStack({ viewportWidth: 390, viewportHeight: 844, nameLines: 1, nameSize: 44 });
    const dated = phoneStack({ viewportWidth: 390, viewportHeight: 844, nameLines: 1, nameSize: 44, dated: true });
    expect(dated.name).toBe(plain.name + PHONE.nameGap + PHONE.written);
    expect(dated.clearance).toBeGreaterThanOrEqual(PHONE.clearance);
  });
});

describe("the angle glyph", () => {
  it("keeps the tick, round cap and all, inside its box at 22 px and at every size the report uses", () => {
    for (const size of [16, 22, 36]) {
      const r = angleGlyphRadius(size, 1.5);
      const tickEnd = size / 2 - r * 1.85;
      expect(tickEnd, `${size} px`).toBeGreaterThanOrEqual(0.75 - 1e-9);
      expect(r).toBeGreaterThan(3);
    }
  });
});

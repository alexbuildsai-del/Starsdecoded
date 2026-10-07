/**
 * The Personal report's loading story (report-loading-story §1, acceptance 1, 2 and 4). Mira's numbers are the
 * spec's acceptance; her chart is the engine's, computed here from her fixture, so a number the story printed but
 * the engine did not give fails here (R16-01).
 */
import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { theta } from "@/components/chart/wheel-geometry";
import { orthographic } from "@/lib/globe";
import { HOUSES, PAIRS } from "@/lib/houses";
import { LAND_110M } from "@/lib/land-110m";
import type { Progress } from "@/lib/progress";
import { chartOf, type Birth } from "@/site/lib/chart";
import mira from "../../../fixtures/sample-people/mira.json";
import {
  PAIR_S, STAGE, STORY_BODIES, STORY_END_S, STORY_STEPS_S, ascendantAt, frameAt, storySteps, type StoryFrame, type StoryInput,
} from "./build-story";

const BIRTH: Birth = {
  birthDate: mira.birthDate, birthTime: mira.birthTime, latitude: mira.latitude, longitude: mira.longitude,
  timezone: mira.timezone, timezoneOffset: mira.timezoneOffset,
};
const KNOWN: StoryInput = {
  chart: chartOf(BIRTH),
  birth: { lat: mira.latitude, lon: mira.longitude, place: "Lisbon, Portugal", date: mira.birthDate, time: mira.birthTime },
};
const BLIND: StoryInput = {
  chart: chartOf({ ...BIRTH, birthTime: "12:00", birthTimeWindowMinutes: 720 }),
  birth: { ...KNOWN.birth, time: null },
};
const WRITING: Progress = { real: 30, shown: 31, label: "Writing your report", next: 40, door: false, complete: false, failed: false };
const DOOR: Progress = { ...WRITING, real: 70, shown: 70, door: true };

const [, S2, S3, S4, S5] = STORY_STEPS_S;
const { cx: CX, cy: CY } = STAGE;
const norm360 = (d: number) => ((d % 360) + 360) % 360;
const apart = (a: number, b: number) => Math.min(norm360(a - b), norm360(b - a));
/** The screen angle a mark sits at around the stage's centre, counter-clockwise from east as `theta` counts. */
const angleOf = (p: { x: number; y: number }) => norm360((Math.atan2(CY - p.y, p.x - CX) * 180) / Math.PI);
const times = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
const texts = (f: StoryFrame) => f.detail.map((d) => d.text);

describe("the five steps", () => {
  it("plays steps 1 to 4 in about 20 s, then writes with the houses, about 7 s a pair", () => {
    expect([...STORY_STEPS_S]).toEqual([0, 4.5, 9.5, 14.5, 20]);
    expect(PAIR_S * PAIRS.length).toBeGreaterThanOrEqual(40);
    expect(PAIR_S * PAIRS.length).toBeLessThanOrEqual(45);
    STORY_STEPS_S.forEach((start, i) => {
      expect(frameAt(start, KNOWN, WRITING).step).toBe(i + 1);
      expect(frameAt(start, KNOWN, WRITING).counter).toBe(`Step ${i + 1} of 5`);
      if (i > 0) expect(frameAt(start - 0.01, KNOWN, WRITING).step).toBe(i);
    });
  });

  it("says what the artifact says, step by step, from Mira's chart", () => {
    expect(storySteps(KNOWN, WRITING)).toEqual([
      { counter: "Step 1 of 5", title: "Where you were born", subtitle: "Your place puts you on the Earth.", detail: ["38.72° N · 9.14° W", "Lisbon, Portugal"] },
      { counter: "Step 2 of 5", title: "The sky on your birth day", subtitle: "Each planet runs on its own path. We stop them on your birth date.", detail: ["14 Mar 1991"] },
      { counter: "Step 3 of 5", title: "How the planets face each other", subtitle: "Lines join planets at set angles. The closest pair:", detail: ["Jupiter opposition Saturn · 0.2° from exact"] },
      { counter: "Step 4 of 5", title: "Your birth time sets the horizon", subtitle: "Above the line is the sky you could see. Below it is under the Earth.", detail: ["07:40", "Rising: 12°07′ Aries"] },
      { counter: "Step 5 of 5", title: "Your houses, two at a time", subtitle: "Each house faces its opposite. Your report writes meanwhile.", detail: ["Six pairs, and you know all twelve."] },
    ]);
    const placed = frameAt(S3 + 1.9, KNOWN, WRITING);
    expect(placed.title).toBe("Where each planet stood");
    expect(placed.subtitle).toBe("Each one lands on its exact degree.");
    expect(texts(placed)).toEqual(["Sun 23°13′ Pisces · Moon 28°40′ Aquarius"]);
    expect(frameAt(S4 + 1, KNOWN, WRITING).subtitle).toBe("The Earth turns once a day. The time says how far it had turned.");
  });

  it("opens step 5's subtitle with Start reading once the door opens, whatever is playing", () => {
    expect(frameAt(S5 + 30, KNOWN, DOOR).subtitle).toBe("Start reading now. We'll finish the last chapters while you read.");
    expect(frameAt(S2 + 1, KNOWN, DOOR).subtitle).toBe(frameAt(S2 + 1, KNOWN, WRITING).subtitle);
  });
});

describe("step 1: where you were born", () => {
  it("turns Mira's globe to centre on 38.72° N, 9.14° W, where the brass point lands", () => {
    const start = frameAt(0.1, KNOWN, WRITING);
    expect(apart(start.globe!.lon0, mira.longitude)).toBeGreaterThan(45);
    const f = frameAt(S2 - 0.1, KNOWN, WRITING);
    expect(f.globe!.lat0).toBe(mira.latitude);
    expect(f.globe!.lon0).toBe(mira.longitude);
    expect(texts(f)).toEqual(["38.72° N · 9.14° W", "Lisbon, Portugal"]);
    expect(f.pin!.x).toBeCloseTo(CX, 9);
    expect(f.pin!.y).toBeCloseTo(CY, 9);
    const lisbon = orthographic({ lat0: f.globe!.lat0, lon0: f.globe!.lon0, r: f.globe!.r })(mira.latitude, mira.longitude);
    expect(lisbon.front).toBe(true);
    expect(f.globe!.land).toMatch(/^M/);
  });
});

describe("step 2: the sky on the birth day", () => {
  it("runs each body on its own ring to its degree as the date counts up to the birth", () => {
    const running = frameAt(S2 + 2.2, KNOWN, WRITING);
    expect(texts(running)[0]).not.toBe("14 Mar 1991");
    expect(running.orbits.map((o) => o.key)).toEqual(running.bodies.map((b) => b.key));
    const stopped = frameAt(S3 - 0.1, KNOWN, WRITING);
    expect(texts(stopped)).toEqual(["14 Mar 1991"]);
    for (const b of stopped.bodies) expect(b.lon).toBe(KNOWN.chart.planets[b.key].absoluteDegree);
  });
});

describe("step 3: where each planet stood, and the lines", () => {
  it("draws the lines closest orb first and names the closest pair", () => {
    const f = frameAt(S4 - 0.1, KNOWN, WRITING);
    const orbs = f.aspects.map((a) => a.orb);
    expect(orbs).toEqual([...orbs].sort((a, b) => a - b));
    expect(f.aspects.every((a) => a.type !== "conjunction")).toBe(true);
    const first = frameAt(S3 + 2.3, KNOWN, WRITING);
    expect(first.aspects).toHaveLength(1);
    expect([first.aspects[0].a, first.aspects[0].type, first.aspects[0].b]).toEqual(["jupiter", "opposition", "saturn"]);
  });
});

describe("step 4: the birth time sets the horizon", () => {
  it("ends Mira's horizon on Rising 12°07′ Aries as the clock reaches 07:40, the angles locked in brass", () => {
    const f = frameAt(S5 - 0.01, KNOWN, WRITING);
    expect(f.frame).toBe(KNOWN.chart.angles!.ascendant.absoluteDegree);
    expect(f.minute).toBe(7 * 60 + 40);
    expect(f.detail.map((d) => [d.text, d.tone])).toEqual([["07:40", "paper"], ["Rising: 12°07′ Aries", "brass"]]);
    expect(f.horizon!.y1).toBe(CY);
    expect(f.horizon!.y2).toBe(CY);
    expect(f.veil!.opacity).toBeGreaterThan(0);
    const asc = f.angles.find((a) => a.key === "ascendant")!;
    expect(asc.x).toBeCloseTo(CX - 158, 9);
    expect(asc.y).toBeCloseTo(CY, 9);
    expect(f.angles.find((a) => a.key === "midheaven")!.lon).toBe(KNOWN.chart.angles!.midheaven.absoluteDegree);
  });

  it("turns the sky from midnight under the line on the engine's Ascendant for that day", () => {
    for (const minute of [0, 60, 135, 240, 330, 400, 459]) {
      const clock = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const engine = chartOf({ ...BIRTH, birthTime: clock }).angles!.ascendant.absoluteDegree;
      expect(apart(ascendantAt(KNOWN, minute)!, engine), clock).toBeLessThan(0.03);
    }
    for (const t of times(S4 + 0.8, S4 + 4.4, 0.3)) {
      const f = frameAt(t, KNOWN, WRITING);
      expect(f.frame).toBe(ascendantAt(KNOWN, f.minute!));
      expect(texts(f)[0]).toBe(`${String(Math.floor(f.minute! / 60)).padStart(2, "0")}:${String(Math.floor(f.minute! % 60)).padStart(2, "0")}`);
    }
    expect(frameAt(S3, KNOWN, WRITING).frame).toBe(ascendantAt(KNOWN, 0));
  });

  it("follows the clocks on a day they went forward, as the engine reads the zone", () => {
    const spring: Birth = { birthDate: "2023-03-26", birthTime: "04:30", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London", timezoneOffset: 1 };
    const input: StoryInput = { chart: chartOf(spring), birth: { lat: spring.latitude, lon: spring.longitude, place: "London", date: spring.birthDate, time: spring.birthTime } };
    for (const clock of ["00:00", "00:40", "02:00", "03:15", "04:29"]) {
      const minute = Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
      const engine = chartOf({ ...spring, birthTime: clock }).angles!.ascendant.absoluteDegree;
      expect(apart(ascendantAt(input, minute)!, engine), clock).toBeLessThan(0.03);
    }
  });
});

describe("step 5: the houses, two at a time, while the report writes", () => {
  it("brings the six pairs from houses.ts, about 7 s each, then holds all six", () => {
    PAIRS.forEach(([n, side, otherSide], i) => {
      const f = frameAt(S5 + 1 + i * PAIR_S + PAIR_S / 2, KNOWN, WRITING);
      const [mine, opposite] = [HOUSES[n - 1], HOUSES[n + 5]];
      expect(texts(f)).toEqual([`${n} ${mine.object} · ${mine.word} ⟷ ${opposite.word} · ${opposite.object} ${n + 6}`, `${side} · ${otherSide}`]);
      expect(f.houses.filter((h) => h.now).map((h) => h.n).sort((a, b) => a - b)).toEqual([n, n + 6]);
      expect(f.pairDots).toEqual(PAIRS.map((_, j) => j <= i));
    });
    expect(texts(frameAt(S5 + 1 + PAIR_S / 2, KNOWN, WRITING))).toEqual(["1 Mirror · Self ⟷ Partnership · Handshake 7", "me · the other person"]);
    const held = frameAt(STORY_END_S, KNOWN, WRITING);
    expect(texts(held)).toEqual(["Six pairs, and you know all twelve."]);
    expect(held.houses).toHaveLength(12);
    expect(held.pairLines).toHaveLength(6);
    expect(held.houses.every((h) => !h.now)).toBe(true);
  });

  it("puts each house on its whole sign, the 1st on the rising sign", () => {
    const held = frameAt(STORY_END_S, KNOWN, WRITING);
    const first = Math.floor(KNOWN.chart.angles!.ascendant.absoluteDegree / 30);
    for (const h of held.houses) {
      const middle = ((first + h.n - 1) % 12) * 30 + 15;
      expect(apart(angleOf({ x: h.label.x, y: h.label.y - 3 }), 180 + middle - held.frame)).toBeLessThan(0.01);
      expect(h.word).toBe(HOUSES[h.n - 1].word.toUpperCase());
    }
  });

  it("holds the chart at the engine's degrees, equal to the hero's to 0.01°", () => {
    const held = frameAt(STORY_END_S, KNOWN, WRITING);
    const { chart } = KNOWN;
    const asc = chart.angles!.ascendant.absoluteDegree;
    expect(held.bodies.map((b) => b.key)).toEqual(STORY_BODIES.filter((b) => chart.planets[b]));
    const ascMark = held.angles.find((a) => a.key === "ascendant")!;
    for (const b of held.bodies) {
      const degree = chart.planets[b.key].absoluteDegree;
      expect(Math.abs(b.lon - degree), b.key).toBeLessThanOrEqual(0.01);
      expect(apart(angleOf(b), 180 + degree - held.frame), b.key).toBeLessThanOrEqual(0.01);
      // The hero frames its plate on the rising sign's cusp; the arc from the Ascendant to each body is the same.
      const fromAsc = norm360(angleOf(b) - angleOf(ascMark));
      expect(apart(fromAsc, theta(degree, asc) - theta(asc, asc)), b.key).toBeLessThanOrEqual(0.01);
    }
    expect(ascMark.lon).toBe(asc);
    expect(held.angles.find((a) => a.key === "midheaven")!.lon).toBe(chart.angles!.midheaven.absoluteDegree);
    const later = frameAt(STORY_END_S + 120, KNOWN, WRITING);
    expect({ ...later, t: held.t }).toEqual(held);
  });
});

describe("with no birth time", () => {
  it("draws no horizon, angle or house at any moment", () => {
    for (const t of times(0, STORY_END_S + 5, 0.25)) {
      const f = frameAt(t, BLIND, WRITING);
      expect(f.known).toBe(false);
      expect(f.horizon).toBeNull();
      expect(f.veil).toBeNull();
      expect(f.angles).toEqual([]);
      expect(f.houses).toEqual([]);
      expect(f.pairLines).toEqual([]);
      expect(f.pairDots).toEqual([]);
      expect(f.frame).toBe(0);
      expect(f.minute).toBeNull();
    }
  });

  it("says why in one line at steps 4 and 5, and shows the Moon as its day's arc", () => {
    const band = BLIND.chart.planets.moon.band!;
    expect(texts(frameAt(S3 + 1.9, BLIND, WRITING))).toEqual(["Sun 23°24′ Pisces · Moon somewhere in a 13° stretch"]);
    const four = frameAt(S5 - 0.1, BLIND, WRITING);
    expect(four.title).toBe("No birth time, so no horizon");
    expect(four.subtitle).toBe("The Moon moves 13° in a day. We show the stretch it could be in.");
    expect(texts(four)).toEqual(["Moon 24°35′ Aquarius to 7°27′ Pisces"]);
    expect([four.moonArc!.from, four.moonArc!.to]).toEqual([band.fromDegree, band.toDegree]);
    expect(four.bodies.some((b) => b.key === "moon")).toBe(false);
    const five = frameAt(S5 + 10, BLIND, WRITING);
    expect(five.title).toBe("Now writing your report");
    expect(five.subtitle).toBe("No birth time, so no houses. While it writes, a few things worth knowing.");
    expect(five.didYouKnow).toBe(1);
    expect(texts(five)).toEqual([]);
    expect(frameAt(S5 + 10, KNOWN, WRITING).didYouKnow).toBe(0);
  });

  it("names a closest pair the missing time cannot move, and draws no line to the Moon", () => {
    const f = frameAt(S4 - 0.1, BLIND, WRITING);
    expect(texts(f)).toEqual(["Jupiter opposition Saturn · 0.2° from exact"]);
    expect(f.aspects.some((a) => a.a === "moon" || a.b === "moon")).toBe(false);
  });
});

describe("the coastline", () => {
  it("is Natural Earth's whole outline, under 60 KB", () => {
    expect(statSync(new URL("./land-110m.ts", import.meta.url)).size).toBeLessThan(60_000);
    for (const ring of LAND_110M) {
      expect(ring[0]).toEqual(ring[ring.length - 1]);
      for (const [lon, lat] of ring) {
        expect(Math.abs(lon)).toBeLessThanOrEqual(180);
        expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      }
    }
    const reaches = (lon0: number, lon1: number, lat0: number, lat1: number) =>
      LAND_110M.some((ring) => ring.some(([lon, lat]) => lon >= lon0 && lon <= lon1 && lat >= lat0 && lat <= lat1));
    expect(reaches(113, 154, -40, -10)).toBe(true);
    expect(reaches(166, 179, -47, -34)).toBe(true);
    expect(reaches(-180, 180, -90, -62)).toBe(true);
  });
});

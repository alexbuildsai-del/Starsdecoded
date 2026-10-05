/**
 * The dial at its edges (R16-06, readings 17 and 18): frames built over a month's end, a leap day and a year's end; a
 * range of nothing, a fraction or a negative; a chart missing a point; the geometry kept inside the plate; Play's
 * timings against what the spec says they feel like; the slider's keys at both ends; and the date words checked against
 * an independent calendar for two whole years. `dial.test.ts` holds the frames to the doctrine on Mira, Audrey and a
 * chart with no birth time.
 */
import { describe, expect, it } from "vitest";
import { DOCTRINE, calculateNatalChart, headlineOf, toneOf, type NatalChartData, type SkyBody } from "@workspace/engine";
import mira from "../../../fixtures/sample-people/mira.json";
import audrey from "../../../fixtures/charts/audrey-hepburn.json";
import {
  DIAL, DIAL_ORDER, bandSegments, beatMs, clampDay, dayWords, dialAngle, dialAt, framesFor, frameText, keyDay, leavesTrail,
  playStart, playStep, strongerTone, trackRadii, trailPath, type DialFrame, type DialNatal,
} from "./dial";
import { longDay } from "./timeline-view";

function natalOf(chart: NatalChartData): DialNatal {
  return {
    points: Object.entries(chart.planets).map(([body, p]) => ({ body, lon: p.absoluteDegree })),
    angles: chart.angles
      ? { ascendant: chart.angles.ascendant.absoluteDegree, midheaven: chart.angles.midheaven.absoluteDegree }
      : null,
  };
}

const miraNatal = natalOf(calculateNatalChart(mira.birthDate, mira.birthTime, mira.latitude, mira.longitude, mira.timezone));
const audreyNatal = natalOf(calculateNatalChart(audrey.birthDate, audrey.birthTime, audrey.latitude, audrey.longitude, audrey.timezone));
const HERO: SkyBody[] = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const TONE_RANK = { intense: 0, mixed: 1, easy: 2 } as const;

describe("framesFor over calendar edges", () => {
  it("steps one UTC day at a time over a month's end, a leap day and a year's end", () => {
    const dates = (from: string, n: number) => framesFor(miraNatal, from, n, ["saturn"]).map((f) => f.date);
    expect(dates("2027-12-29", 5)).toEqual(["2027-12-29", "2027-12-30", "2027-12-31", "2028-01-01", "2028-01-02"]);
    expect(dates("2028-02-27", 4)).toEqual(["2028-02-27", "2028-02-28", "2028-02-29", "2028-03-01"]);
    expect(dates("2027-02-27", 3)).toEqual(["2027-02-27", "2027-02-28", "2027-03-01"]);
    expect(dates("2026-10-30", 3)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });

  it("takes an instant as its UTC day, whatever the zone it is written in", () => {
    const [late] = framesFor(miraNatal, new Date("2026-10-05T23:30:00-05:00"), 1, ["saturn"]);
    expect(late.date).toBe("2026-10-06");
    const [early] = framesFor(miraNatal, new Date("2026-10-06T00:30:00+05:00"), 1, ["saturn"]);
    expect(early.date).toBe("2026-10-05");
    const [stamp] = framesFor(miraNatal, "2026-10-05T23:59:59Z", 1, ["saturn"]);
    expect(stamp.date).toBe("2026-10-05");
  });

  it("gives nothing for no days, a negative number of days or a number that is not one; a fraction of days counts whole days", () => {
    for (const days of [0, -1, -100, Number.NaN, 0.9]) expect(framesFor(miraNatal, "2026-10-05", days, HERO), String(days)).toEqual([]);
    expect(framesFor(miraNatal, "2026-10-05", 2.9, HERO).map((f) => f.date)).toEqual(["2026-10-05", "2026-10-06"]);
  });

  it("is the same frame on any call, and a longer range starts with the shorter one's frames", () => {
    const week = framesFor(miraNatal, "2026-10-05", 7, HERO);
    expect(framesFor(miraNatal, "2026-10-05", 7, HERO)).toEqual(week);
    expect(framesFor(miraNatal, "2026-10-05", 30, HERO).slice(0, 7)).toEqual(week);
    expect(framesFor(miraNatal, "2026-10-08", 4, HERO)).toEqual(week.slice(3));
  });
});

describe("framesFor with the bodies it is given", () => {
  it("draws a body it is given with no track as a place alone: no contact, no tone, never a trail", () => {
    const frames = framesFor(miraNatal, "2026-10-05", 3, ["moon", "sun", "north_node"]);
    for (const frame of frames) {
      expect(frame.contacts).toEqual([]);
      expect(frame.headlines).toEqual([]);
      expect(frame.bodies.map((b) => b.body)).toEqual(["moon", "sun", "north_node"]);
      for (const b of frame.bodies) {
        expect(b.tone).toBeNull();
        expect(b.lon).toBeGreaterThanOrEqual(0);
        expect(b.lon).toBeLessThanOrEqual(360);
      }
    }
    expect(["moon", "sun", "north_node", "mercury", "venus"].filter(leavesTrail)).toEqual([]);
    expect(frames[0].bodies.find((b) => b.body === "north_node")!.retrograde).toBe(true);
    expect(frames[0].bodies.find((b) => b.body === "sun")!.retrograde).toBe(false);
  });

  it("with no bodies has frames of days and nothing on them", () => {
    const frames = framesFor(miraNatal, "2026-10-05", 4, []);
    expect(frames.map((f) => f.date)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"]);
    expect(frames.every((f) => f.bodies.length === 0 && f.contacts.length === 0)).toBe(true);
  });

  it("keeps each body in the order it was given, and lists a contact only for a body that was given", () => {
    const frames = framesFor(miraNatal, "2026-10-05", 5, ["pluto", "mars", "saturn"]);
    for (const frame of frames) {
      expect(frame.bodies.map((b) => b.body)).toEqual(["pluto", "mars", "saturn"]);
      expect(frame.contacts.every((c) => ["pluto", "mars", "saturn"].includes(c.body))).toBe(true);
    }
  });

  it("times a contact only to a point the chart gives: a body missing from its points is no target", () => {
    const without = (body: string): DialNatal => ({ ...miraNatal, points: miraNatal.points.filter((p) => p.body !== body) });
    const all = framesFor(miraNatal, "2026-10-05", 30, HERO).flatMap((f) => f.contacts);
    expect(all.some((c) => c.target === "saturn")).toBe(true);
    const lacking = framesFor(without("saturn"), "2026-10-05", 30, HERO).flatMap((f) => f.contacts);
    expect(lacking.some((c) => c.target === "saturn")).toBe(false);
    expect(lacking.some((c) => c.target === "jupiter")).toBe(true);
    const bare = framesFor({ points: [], angles: null }, "2026-10-05", 30, HERO);
    expect(bare.every((f) => f.contacts.length === 0 && f.headlines.length === 0)).toBe(true);
    const anglesOnly = framesFor({ points: [], angles: miraNatal.angles }, "2026-10-05", 60, HERO).flatMap((f) => f.contacts);
    expect(anglesOnly.every((c) => c.target === "ascendant" || c.target === "midheaven")).toBe(true);
    expect(anglesOnly.length).toBeGreaterThan(0);
  });

  it("with a horizon draws the Moon, Ascendant and Midheaven as targets, and without one draws none of the three", () => {
    const withHorizon = framesFor(audreyNatal, "2026-01-01", 365, HERO).flatMap((f) => f.contacts.map((c) => c.target));
    expect(new Set(withHorizon).has("moon") || new Set(withHorizon).has("ascendant") || new Set(withHorizon).has("midheaven")).toBe(true);
    const blind: DialNatal = { points: audreyNatal.points, angles: null };
    const without = new Set(framesFor(blind, "2026-01-01", 365, HERO).flatMap((f) => f.contacts.map((c) => c.target)));
    for (const timed of ["moon", "ascendant", "midheaven"] as const) expect(without.has(timed), timed).toBe(false);
  });
});

describe("a frame's own promises, over a year of Audrey Hepburn's chart", () => {
  const year = framesFor(audreyNatal, "2026-01-01", 365, DIAL_ORDER);

  it("lists contacts strongest tone first, then the slowest planet, then the doctrine's order of points, each once", () => {
    const slowest = ["pluto", "neptune", "uranus", "saturn", "jupiter", "mars"];
    let busiest = 0;
    for (const frame of year) {
      const seen = new Set(frame.contacts.map((c) => `${c.body}.${c.aspect}.${c.target}`));
      expect(seen.size, frame.date).toBe(frame.contacts.length);
      busiest = Math.max(busiest, frame.contacts.length);
      const keyOf = (c: DialFrame["contacts"][number]) => [
        TONE_RANK[toneOf({ kind: "contact", body: c.body, aspect: c.aspect })],
        slowest.indexOf(c.body),
        DOCTRINE.targets.indexOf(c.target),
      ];
      for (let i = 1; i < frame.contacts.length; i++) {
        const a = keyOf(frame.contacts[i - 1]);
        const b = keyOf(frame.contacts[i]);
        const order = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
        expect(order, `${frame.date}: ${JSON.stringify(frame.contacts[i - 1])} before ${JSON.stringify(frame.contacts[i])}`).toBeLessThanOrEqual(0);
      }
    }
    expect(busiest).toBeGreaterThan(1);
  });

  it("words the day from its contacts in that order, three lines at most, never the same line twice, none on a quiet day", () => {
    for (const frame of year) {
      expect(frame.headlines.length).toBeLessThanOrEqual(3);
      expect(new Set(frame.headlines).size).toBe(frame.headlines.length);
      expect(frame.headlines.length === 0).toBe(frame.contacts.length === 0);
      expect(frame.headlines).toEqual(
        [...new Set(frame.contacts.map((c) => headlineOf({ kind: "contact", ...c })))].slice(0, 3),
      );
    }
  });

  it("fills a body with a tone exactly when it has a contact that day, and never a body that has none", () => {
    for (const frame of year) {
      for (const b of frame.bodies) {
        const has = frame.contacts.some((c) => c.body === b.body);
        expect(b.tone !== null, `${frame.date} ${b.body}`).toBe(has);
      }
    }
  });

  it("keeps every place on the circle, to the hundredth, and a retrograde flag only for a planet that turns", () => {
    for (const frame of year) {
      for (const b of frame.bodies) {
        expect(b.lon).toBeGreaterThanOrEqual(0);
        expect(b.lon).toBeLessThanOrEqual(360);
        expect(Math.abs(b.lon * 100 - Math.round(b.lon * 100))).toBeLessThan(1e-6);
      }
    }
    const turned = new Set(year.flatMap((f) => f.bodies.filter((b) => b.retrograde).map((b) => b.body)));
    for (const body of ["mercury", "venus", "jupiter", "saturn", "uranus", "neptune", "pluto"]) expect(turned.has(body as SkyBody), body).toBe(true);
    expect([...turned].every((b) => (DIAL_ORDER as readonly string[]).includes(b))).toBe(true);
  });

  it("moves each body the way it should between days: forward a little, or back a little when retrograde", () => {
    const top: Record<string, number> = { mercury: 2.4, venus: 1.4, mars: 0.9, jupiter: 0.3, saturn: 0.15, uranus: 0.08, neptune: 0.05, pluto: 0.05 };
    year.slice(1).forEach((frame, i) => {
      for (const b of frame.bodies) {
        const before = year[i].bodies.find((x) => x.body === b.body)!;
        const moved = ((b.lon - before.lon + 540) % 360) - 180;
        expect(Math.abs(moved), `${frame.date} ${b.body}`).toBeLessThanOrEqual(top[b.body] + 0.02);
        if (b.retrograde && before.retrograde && Math.abs(moved) > 0.02) expect(moved, `${frame.date} ${b.body}`).toBeLessThan(0);
        if (!b.retrograde && !before.retrograde && Math.abs(moved) > 0.02) expect(moved, `${frame.date} ${b.body}`).toBeGreaterThan(0);
      }
    });
  });
});

describe("strongerTone", () => {
  it("is symmetric, takes the stronger, and keeps a tone against none", () => {
    const tones = ["intense", "mixed", "easy", null] as const;
    for (const a of tones) {
      for (const b of tones) {
        expect(strongerTone(a, b), `${a} ${b}`).toBe(strongerTone(b, a));
        if (a && b) expect(TONE_RANK[strongerTone(a, b)!]).toBe(Math.min(TONE_RANK[a], TONE_RANK[b]));
      }
      expect(strongerTone(a, null)).toBe(a);
      expect(strongerTone(a, a)).toBe(a);
    }
  });
});

describe("the geometry stays inside the plate", () => {
  it("puts every body of every track, every house label and every natal point inside the 500 square, whatever the Ascendant", () => {
    for (let lon = 0; lon < 360; lon += 7.3) {
      for (let east = 0; east < 360; east += 41.7) {
        for (const r of [DIAL.trackOuter, DIAL.trackInner, DIAL.band, DIAL.point, DIAL.pointLabel]) {
          const p = dialAt(lon, r, east);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(DIAL.size);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(DIAL.size);
          expect(Math.hypot(p.x - DIAL.centre, p.y - DIAL.centre)).toBeCloseTo(r, 1);
        }
      }
    }
    expect(dialAt(10, 0, 3)).toEqual({ x: DIAL.centre, y: DIAL.centre });
  });

  it("keeps the focus ring just outside the square's tracks, the tracks outside the band, the band outside the points", () => {
    expect(DIAL.ring).toBeGreaterThan(DIAL.trackOuter);
    expect(DIAL.ring).toBeLessThanOrEqual(DIAL.centre + 3);
    expect(DIAL.trackOuter).toBeGreaterThan(DIAL.trackInner);
    expect(DIAL.trackInner).toBeGreaterThan(DIAL.bandOuter);
    expect(DIAL.bandOuter).toBeGreaterThan(DIAL.band);
    expect(DIAL.band).toBeGreaterThan(DIAL.bandInner);
    expect(DIAL.bandInner).toBeGreaterThan(DIAL.point);
    expect(DIAL.point).toBeGreaterThan(DIAL.pointLabel);
    expect(DIAL.centre * 2).toBe(DIAL.size);
  });

  it("puts a longitude at the same angle however far round it is written, and the Ascendant's opposite on the right", () => {
    expect(dialAngle(10 + 360, 10)).toBe(dialAngle(10, 10));
    expect(dialAngle(-350, 10)).toBeCloseTo(dialAngle(10, 10) + 0, 9);
    expect(dialAngle(190, 10)).toBe(0);
    expect(dialAngle(5, 10)).toBe(175);
    for (const lon of [-720, -1, 0, 1, 359.99, 360, 1e6]) {
      const a = dialAngle(lon, 33.3);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(360);
    }
  });

  it("gives tracks that never leave the ring kept for them, however many bodies and in whatever order they come", () => {
    for (const bodies of [["mars"], ["pluto", "mars"], ["pluto", "saturn", "mars"], [...DIAL_ORDER].reverse(), [...DIAL_ORDER, "moon", "mars"]]) {
      const radii = trackRadii(bodies);
      const values = Object.values(radii);
      expect(values.length).toBe(new Set(bodies.filter((b) => (DIAL_ORDER as readonly string[]).includes(b))).size);
      for (const r of values) {
        expect(r).toBeGreaterThanOrEqual(DIAL.trackInner);
        expect(r).toBeLessThanOrEqual(DIAL.trackOuter);
      }
      expect(new Set(values).size).toBe(values.length);
    }
    expect(trackRadii(["pluto", "mars"])).toEqual({ mars: DIAL.trackOuter - DIAL.trackStep, pluto: DIAL.trackOuter });
    expect(trackRadii([])).toEqual({});
  });
});

describe("the band", () => {
  it("starts its houses at the rising sign's edge, wherever in the sign the Ascendant is, wraps past 360 and below 0", () => {
    expect(bandSegments(0)[0].from).toBe(0);
    expect(bandSegments(29.999)[0].from).toBe(0);
    expect(bandSegments(30)[0].from).toBe(30);
    expect(bandSegments(359.999)[0].from).toBe(330);
    expect(bandSegments(360)[0].from).toBe(0);
    expect(bandSegments(-0.01)[0].from).toBe(330);
    expect(bandSegments(725)[0].from).toBe(0);
    for (const ascendant of [0, 12.12, 170, 299.9, null]) {
      const band = bandSegments(ascendant);
      expect(band).toHaveLength(12);
      expect(new Set(band.map((s) => s.from)).size).toBe(12);
      expect(band.every((s) => s.from % 30 === 0 && s.from >= 0 && s.from < 360)).toBe(true);
      expect(new Set(band.map((s) => s.label)).size).toBe(12);
      expect(band.every((s) => s.label === s.label.toUpperCase() && s.label.length > 0)).toBe(true);
    }
  });

  it("goes round the zodiac in order: each segment 30° on from the one before", () => {
    for (const ascendant of [12.12, 281, null]) {
      const band = bandSegments(ascendant);
      band.slice(1).forEach((s, i) => expect(s.from).toBe((band[i].from + 30) % 360));
    }
    expect(bandSegments(null).map((s) => s.label).join(" ")).toBe("ARIES TAURUS GEMINI CANCER LEO VIRGO LIBRA SCORPIO SAGITTARIUS CAPRICORN AQUARIUS PISCES");
  });
});

describe("trailPath", () => {
  const frames: DialFrame[] = [200, 201, 202, 203, 204].map((lon, i) => ({
    date: `2026-10-0${i + 1}`,
    bodies: [{ body: "saturn", lon, retrograde: false, tone: null }],
    contacts: [],
    headlines: [],
  }));

  it("keeps every point of the path on its track, whatever the Ascendant", () => {
    for (const east of [0, 77, 190.5]) {
      const path = trailPath(frames, "saturn", 196, east, 0, 4);
      const points = [...path.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      expect(points).toHaveLength(5);
      for (const [x, y] of points) expect(Math.hypot(x - DIAL.centre, y - DIAL.centre)).toBeCloseTo(196, 0);
    }
  });

  it("has no path for a single frame, a reversed span or a span outside the frames, and clips a span that overruns them", () => {
    expect(trailPath(frames, "saturn", 196, 0, 2, 2)).toBe("");
    expect(trailPath(frames, "saturn", 196, 0, 4, 1)).toBe("");
    expect(trailPath(frames, "saturn", 196, 0, 9, 12)).toBe("");
    expect(trailPath(frames, "saturn", 196, 0, -9, -2)).toBe("");
    expect(trailPath([], "saturn", 196, 0, 0, 4)).toBe("");
    expect(trailPath(frames, "saturn", 196, 0, -3, 99)).toBe(trailPath(frames, "saturn", 196, 0, 0, 4));
    expect(trailPath(frames, "saturn", 196, 0, 1, 2).split("L")).toHaveLength(2);
  });

  it("steps over a frame that has no such body and still joins the rest", () => {
    const gap = [frames[0], { ...frames[1], bodies: [] }, frames[2]];
    expect(trailPath(gap, "saturn", 196, 0, 0, 2).split("L")).toHaveLength(2);
  });
});

describe("Play", () => {
  const last = (frames: number) => frames - 1;

  it("takes about three seconds over a week, a few over a month and about eleven over six months, a day a beat", () => {
    const seconds = (frames: number) => {
      let day = 0;
      let ms = 0;
      while (day < last(frames)) {
        day = playStep(day, last(frames), false);
        ms += beatMs(frames, false);
      }
      return ms / 1000;
    };
    expect(seconds(7)).toBeGreaterThanOrEqual(2.2);
    expect(seconds(7)).toBeLessThanOrEqual(3.5);
    expect(seconds(30)).toBeGreaterThanOrEqual(3.5);
    expect(seconds(30)).toBeLessThanOrEqual(5.5);
    expect(seconds(182)).toBeGreaterThanOrEqual(10);
    expect(seconds(182)).toBeLessThanOrEqual(12);
  });

  it("with reduced motion steps a week a beat and still lands on the last day, over every length of range", () => {
    for (const frames of [1, 2, 7, 8, 30, 31, 182]) {
      let day = 0;
      let beats = 0;
      while (day < last(frames) && beats < 1000) {
        const next = playStep(day, last(frames), true);
        expect(next).toBeGreaterThan(day);
        expect(next - day).toBeLessThanOrEqual(7);
        day = next;
        beats++;
      }
      expect(day).toBe(last(frames));
      expect(beats).toBe(Math.ceil(last(frames) / 7));
    }
  });

  it("stops at the end: a step from the last day stays on it, and a day past the end is the end", () => {
    expect(playStep(181, 181, false)).toBe(181);
    expect(playStep(181, 181, true)).toBe(181);
    expect(playStep(500, 181, false)).toBe(181);
    expect(playStep(-4, 181, false)).toBe(1);
    expect(playStep(Number.NaN, 181, false)).toBe(1);
    expect(playStep(0, 0, false)).toBe(0);
    expect(playStep(3, -5, true)).toBe(0);
  });

  it("starts from where the dial stands, and again from the first day only at the end or on a day that is not one", () => {
    expect(playStart(0, 181)).toBe(0);
    expect(playStart(1, 181)).toBe(1);
    expect(playStart(180, 181)).toBe(180);
    expect(playStart(181, 181)).toBe(0);
    expect(playStart(999, 181)).toBe(0);
    expect(playStart(-5, 181)).toBe(0);
    expect(playStart(Number.NaN, 181)).toBe(0);
    expect(playStart(0, 0)).toBe(0);
  });

  it("beats at the edges of its ranges: 10 frames is a week's beat, 11 a month's, 45 a month's, 46 six months'", () => {
    expect([0, 1, 7, 10].map((n) => beatMs(n, false))).toEqual([420, 420, 420, 420]);
    expect([11, 30, 45].map((n) => beatMs(n, false))).toEqual([150, 150, 150]);
    expect([46, 182, 1000].map((n) => beatMs(n, false))).toEqual([60, 60, 60]);
    for (const n of [1, 7, 30, 182]) expect(beatMs(n, true)).toBe(400);
  });
});

describe("the slider's keys", () => {
  it("never leave the range, from either end, and the paging keys go a week", () => {
    expect(keyDay("ArrowRight", 181, 181)).toBe(181);
    expect(keyDay("ArrowLeft", 0, 181)).toBe(0);
    expect(keyDay("ArrowUp", 181, 181)).toBe(181);
    expect(keyDay("ArrowDown", 0, 181)).toBe(0);
    expect(keyDay("PageUp", 0, 181)).toBe(7);
    expect(keyDay("PageDown", 181, 181)).toBe(174);
    expect(keyDay("PageUp", 175, 181)).toBe(181);
    expect(keyDay("PageDown", 6, 181)).toBe(0);
    expect(keyDay("Home", 0, 181)).toBe(0);
    expect(keyDay("End", 181, 181)).toBe(181);
    expect(keyDay("End", 3, 0)).toBe(0);
    for (const key of ["ArrowRight", "ArrowLeft", "PageUp", "PageDown", "End", "Home"]) expect(keyDay(key, 3, 0), key).toBe(0);
  });

  it("answers no other key, so Tab, Escape, Enter, Space and the letters keep their own meaning, and a key's case matters", () => {
    for (const key of ["Tab", "Escape", "Enter", " ", "Space", "a", "p", "+", "-", "arrowright", "ARROWRIGHT", "Right", "Left", "", "Shift", "Control", "Meta", "Alt"]) {
      expect(keyDay(key, 5, 181), JSON.stringify(key)).toBeNull();
    }
  });

  it("clamps a day that is not one before it moves", () => {
    expect(keyDay("ArrowRight", Number.NaN, 181)).toBe(1);
    expect(keyDay("ArrowRight", -10, 181)).toBe(1);
    expect(keyDay("ArrowLeft", 500, 181)).toBe(180);
    expect(clampDay(-0.4, 6)).toBe(0);
    expect(clampDay(6.4, 6)).toBe(6);
    expect(clampDay(5.5, 6)).toBe(6);
    expect(clampDay(3, -1)).toBe(0);
  });
});

describe("the dial's words checked against an independent calendar", () => {
  const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });
  const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
  const days = (year: number) => Array.from({ length: 366 }, (_, i) => new Date(Date.UTC(year, 0, 1 + i))).filter((d) => d.getUTCFullYear() === year);

  it("names every day of 2027 and 2028 as the calendar does, in each order, with the leap day in", () => {
    for (const year of [2027, 2028]) {
      const all = days(year);
      expect(all.length).toBe(year === 2028 ? 366 : 365);
      for (const d of all) {
        const iso = d.toISOString().slice(0, 10);
        const weekday = WEEKDAY.format(d);
        const month = MONTH.format(d);
        const n = d.getUTCDate();
        expect(dayWords(iso, "dmy"), iso).toBe(`${weekday} ${n} ${month} ${year}`);
        expect(dayWords(iso, "mdy"), iso).toBe(`${weekday}, ${month} ${n}, ${year}`);
        expect(dayWords(iso, "ymd"), iso).toBe(`${weekday}, ${month} ${n}, ${year}`);
        expect(dayWords(iso, "dmy").startsWith(longDay(iso, "dmy")), `${iso}: the dial and Timeline's cells name a day alike`).toBe(true);
        expect(dayWords(iso, "mdy").startsWith(longDay(iso, "mdy")), iso).toBe(true);
      }
    }
  });

  it("puts no clock time and no zone in a day's words, and says a quiet day plainly", () => {
    for (const order of ["dmy", "mdy", "ymd"] as const) {
      expect(dayWords("2026-10-05", order)).not.toMatch(/\d:\d|UTC|GMT|[ap]m/i);
      expect(frameText({ date: "2026-10-05", bodies: [], contacts: [], headlines: [] }, order)).toMatch(/A quiet day\.$/);
    }
  });

  it("reads one headline, then two, each ending in a full stop, after the date", () => {
    const base: DialFrame = { date: "2027-04-04", bodies: [], contacts: [], headlines: ["Room to dream"] };
    expect(frameText(base, "mdy")).toBe("Sunday, April 4, 2027. Room to dream.");
    expect(frameText({ ...base, headlines: ["Room to dream", "Big ideas", "More room to grow"] }, "dmy")).toBe("Sunday 4 April 2027. Room to dream. Big ideas. More room to grow.");
  });
});

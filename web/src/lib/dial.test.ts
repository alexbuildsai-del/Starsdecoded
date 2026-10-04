/**
 * The dial's frames are checked against the doctrine's own events on Mira's chart (the site's sample account), Audrey
 * Hepburn's and Marie Curie's with no birth time, every chart computed here through the real engine; its geometry,
 * Play and words against the promises the dial makes (reading 18).
 */
import { describe, expect, it } from "vitest";
import {
  calculateNatalChart, headlineOf, inEffect, longitudeAt, skyEvents, speedAt, toneOf,
  type NatalChartData, type SkyBody, type Tone,
} from "@workspace/engine";
import mira from "../../../fixtures/sample-people/mira.json";
import audrey from "../../../fixtures/charts/audrey-hepburn.json";
import curieUnknown from "../../../fixtures/charts/marie-curie-unknown.json";
import {
  DIAL, DIAL_ORDER, bandSegments, beatMs, clampDay, dayWords, dialAngle, dialAt, framesFor, frameText, keyDay, playStart,
  playStep, strongerTone, trackRadii, trailPath, type DialFrame, type DialNatal,
} from "./dial";

const DAY = 86_400_000;
const HERO: SkyBody[] = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

function natalOf(chart: NatalChartData): DialNatal {
  return {
    points: Object.entries(chart.planets).map(([body, p]) => ({ body, lon: p.absoluteDegree })),
    angles: chart.angles
      ? { ascendant: chart.angles.ascendant.absoluteDegree, midheaven: chart.angles.midheaven.absoluteDegree }
      : null,
  };
}

const miraChart = calculateNatalChart(mira.birthDate, mira.birthTime, mira.latitude, mira.longitude, mira.timezone);
const miraNatal = natalOf(miraChart);
const curieBlind = calculateNatalChart(
  curieUnknown.birthDate, curieUnknown.birthTime, curieUnknown.latitude, curieUnknown.longitude,
  curieUnknown.timezoneOffset, curieUnknown.birthTimeWindowMinutes,
);
const FIRST = Date.UTC(2026, 9, 5);
const hero = framesFor(miraNatal, "2026-10-05", 182, HERO);

const key = (c: { body: string; aspect: string; target: string }) => `${c.body}.${c.aspect}.${c.target}`;
const strongest = (tones: Tone[]): Tone | null =>
  tones.includes("intense") ? "intense" : tones.includes("mixed") ? "mixed" : tones.includes("easy") ? "easy" : null;

describe("framesFor", () => {
  it("gives one frame a day, each body where the engine puts it at that day's noon", () => {
    expect(hero).toHaveLength(182);
    hero.forEach((frame, i) => {
      const noon = new Date(FIRST + i * DAY + DAY / 2);
      expect(frame.date).toBe(noon.toISOString().slice(0, 10));
      expect(frame.bodies.map((b) => b.body)).toEqual(HERO);
      for (const b of frame.bodies) {
        expect(Math.abs(b.lon - longitudeAt(b.body, noon))).toBeLessThan(0.006);
        expect(b.retrograde).toBe(speedAt(b.body, noon) < 0);
      }
    });
    expect(hero[0].date).toBe("2026-10-05");
    expect(hero[181].date).toBe("2027-04-04");
  });

  it("holds exactly the doctrine's contacts in effect each day, gaps between passes included", () => {
    const agrees = (chart: NatalChartData, frames: DialFrame[], first: number) => {
      const events = skyEvents(chart, new Date(first), new Date(first + frames.length * DAY))
        .filter((e) => e.kind === "contact");
      frames.forEach((frame, i) => {
        const expected = inEffect(events, new Date(first + i * DAY)).map(key).sort();
        expect(frame.contacts.map(key).sort()).toEqual(expected);
      });
    };
    agrees(miraChart, hero, FIRST);
    const audreyChart = calculateNatalChart(
      audrey.birthDate, audrey.birthTime, audrey.latitude, audrey.longitude, audrey.timezone,
    );
    const start = Date.UTC(2026, 0, 1);
    agrees(audreyChart, framesFor(natalOf(audreyChart), "2026-01-01", 365, DIAL_ORDER), start);
    agrees(curieBlind, framesFor(natalOf(curieBlind), "2026-01-01", 365, DIAL_ORDER), start);
  });

  it("fills each body with its strongest tone, and words the day strongest first, three lines at most", () => {
    const toneIn = (c: DialFrame["contacts"][number]) => toneOf({ kind: "contact", body: c.body, aspect: c.aspect });
    for (const frame of hero) {
      for (const b of frame.bodies) {
        expect(b.tone).toBe(strongest(frame.contacts.filter((c) => c.body === b.body).map(toneIn)));
      }
      const ranks = frame.contacts.map((c) => ["intense", "mixed", "easy"].indexOf(toneIn(c)));
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      const lines = [...new Set(frame.contacts.map((c) => headlineOf({ kind: "contact", ...c })))];
      expect(frame.headlines).toEqual(lines.slice(0, 3));
    }
  });

  it("finds Saturn on Mira's Ascendant in her snapshot week, the page's first example", () => {
    const week = hero.slice(0, 7);
    for (const frame of week) {
      expect(frame.contacts).toContainEqual({ body: "saturn", target: "ascendant", aspect: "conjunction" });
      expect(frame.headlines).toContain("Taking yourself more seriously");
      expect(frame.bodies.find((b) => b.body === "saturn")?.tone).toBe("intense");
    }
  });

  it("times nothing to an Ascendant, a Midheaven or a natal Moon without a birth time", () => {
    const natal = natalOf(curieBlind);
    expect(natal.angles).toBeNull();
    const frames = framesFor(natal, "2026-01-01", 365, DIAL_ORDER);
    const targets = new Set(frames.flatMap((f) => f.contacts.map((c) => c.target)));
    expect(targets.size).toBeGreaterThan(0);
    for (const timed of ["ascendant", "midheaven", "moon"] as const) expect(targets.has(timed)).toBe(false);
  });

  it("draws a contact only from a body on the dial, and none from Mercury or Venus", () => {
    const inner = framesFor(miraNatal, "2026-10-05", 30, ["mercury", "venus"]);
    expect(inner.every((f) => f.contacts.length === 0 && f.headlines.length === 0)).toBe(true);
    const saturn = framesFor(miraNatal, "2026-10-05", 30, ["saturn"]);
    expect(saturn.every((f) => f.contacts.every((c) => c.body === "saturn"))).toBe(true);
  });

  it("takes the first day as a date or an instant, and keeps through JSON as the page carries it", () => {
    const [byInstant] = framesFor(miraNatal, new Date("2026-10-05T21:30:00Z"), 1, HERO);
    expect(byInstant).toEqual(hero[0]);
    expect(JSON.parse(JSON.stringify(hero.slice(0, 7)))).toEqual(hero.slice(0, 7));
    expect(framesFor(miraNatal, "2026-10-05", 0, HERO)).toEqual([]);
  });
});

describe("the dial's geometry", () => {
  it("puts the Ascendant due east on the left, and 0° Aries there without a horizon", () => {
    expect(dialAngle(12.12, 12.12)).toBe(180);
    expect(dialAt(12.12, DIAL.point, 12.12)).toEqual({ x: DIAL.centre - DIAL.point, y: DIAL.centre });
    expect(dialAngle(0, 0)).toBe(180);
  });

  it("runs counter-clockwise, the IC side below the horizon and the Midheaven's above", () => {
    expect(dialAt(12.12 + 90, 100, 12.12).y).toBeGreaterThan(DIAL.centre);
    expect(dialAt(12.12 - 90, 100, 12.12).y).toBeLessThan(DIAL.centre);
  });

  it("rounds every point to the hundredth, so the prerender and the browser agree", () => {
    const p = dialAt(123.456789, 196, 11.11);
    expect(Math.round(p.x * 100) / 100).toBe(p.x);
    expect(Math.round(p.y * 100) / 100).toBe(p.y);
  });

  it("gives each body its own track, slowest outermost", () => {
    expect(trackRadii(["pluto", "mars", "jupiter", "saturn", "uranus", "neptune"]))
      .toEqual({ mars: 168, jupiter: 182, saturn: 196, uranus: 210, neptune: 224, pluto: 238 });
    const eight = trackRadii(DIAL_ORDER);
    expect(eight.mercury).toBe(DIAL.trackInner);
    expect(eight.pluto).toBe(DIAL.trackOuter);
    const radii = DIAL_ORDER.map((b) => eight[b]);
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
    expect(trackRadii(["saturn"])).toEqual({ saturn: DIAL.trackOuter });
    expect(trackRadii(["moon", "north_node"])).toEqual({});
  });

  it("names every house in the band by its word, from the rising sign, never by a bare number", () => {
    const aries = bandSegments(12.12);
    expect(aries).toHaveLength(12);
    expect(aries[0]).toEqual({ from: 0, label: "SELF" });
    expect(aries[6]).toEqual({ from: 180, label: "PARTNERSHIP" });
    expect(aries.every((s) => !/\d/.test(s.label))).toBe(true);
    const virgo = bandSegments(170);
    expect(virgo[0]).toEqual({ from: 150, label: "SELF" });
    expect(virgo[11]).toEqual({ from: 120, label: "SOLITUDE" });
  });

  it("holds the twelve signs from 0° Aries without a horizon", () => {
    const signs = bandSegments(null);
    expect(signs[0]).toEqual({ from: 0, label: "ARIES" });
    expect(signs[11]).toEqual({ from: 330, label: "PISCES" });
  });

  it("traces a body's way across the frames given, doubling back on a retrograde", () => {
    const frames: DialFrame[] = [10, 11, 12, 11.5, 11].map((lon, i) => ({
      date: `2026-10-0${i + 1}`,
      bodies: [{ body: "mars", lon, retrograde: i > 2, tone: null }],
      contacts: [],
      headlines: [],
    }));
    const path = trailPath(frames, "mars", 168, 0, 0, 4);
    expect(path.startsWith("M")).toBe(true);
    expect(path.split("L")).toHaveLength(5);
    expect(trailPath(frames, "mars", 168, 0, 2, 2)).toBe("");
    expect(trailPath(frames, "venus", 168, 0, 0, 4)).toBe("");
    expect(trailPath(frames, "mars", 168, 0, 0, 99).split("L")).toHaveLength(5);
  });
});

describe("Play and the keys", () => {
  it("starts where the dial stands, or again from the first day at the end", () => {
    expect(playStart(40, 181)).toBe(40);
    expect(playStart(181, 181)).toBe(0);
  });

  it("steps a day a beat, a week with reduced motion, and stops at the range's end", () => {
    expect(playStep(0, 181, false)).toBe(1);
    expect(playStep(0, 181, true)).toBe(7);
    expect(playStep(180, 181, false)).toBe(181);
    expect(playStep(178, 181, true)).toBe(181);
    const beats = (reduced: boolean) => {
      let day = 0;
      let n = 0;
      while (day < 181) {
        day = playStep(day, 181, reduced);
        n++;
      }
      return n;
    };
    expect(beats(false)).toBe(181);
    expect(beats(true)).toBe(26);
  });

  it("beats slower over a short range", () => {
    expect(beatMs(7, false)).toBe(420);
    expect(beatMs(30, false)).toBe(150);
    expect(beatMs(182, false)).toBe(60);
    expect(beatMs(182, true)).toBe(400);
  });

  it("answers the slider's keys as a range input does, inside the range", () => {
    expect(keyDay("ArrowRight", 5, 181)).toBe(6);
    expect(keyDay("ArrowUp", 5, 181)).toBe(6);
    expect(keyDay("ArrowLeft", 5, 181)).toBe(4);
    expect(keyDay("ArrowDown", 0, 181)).toBe(0);
    expect(keyDay("PageUp", 178, 181)).toBe(181);
    expect(keyDay("PageDown", 3, 181)).toBe(0);
    expect(keyDay("Home", 90, 181)).toBe(0);
    expect(keyDay("End", 90, 181)).toBe(181);
    expect(keyDay("Enter", 90, 181)).toBeNull();
    expect(keyDay("a", 90, 181)).toBeNull();
  });

  it("keeps any day inside the frames", () => {
    expect(clampDay(Number.NaN, 6)).toBe(0);
    expect(clampDay(-3, 6)).toBe(0);
    expect(clampDay(9, 6)).toBe(6);
    expect(clampDay(2.6, 6)).toBe(3);
    expect(clampDay(4, 0)).toBe(0);
  });
});

describe("the dial's words", () => {
  it("says the date in the reader's order with the site's English names, and no clock time", () => {
    expect(dayWords("2026-10-05", "dmy")).toBe("Monday 5 October 2026");
    expect(dayWords("2026-10-05", "mdy")).toBe("Monday, October 5, 2026");
    expect(dayWords("2027-04-04", "ymd")).toBe("Sunday, April 4, 2027");
  });

  it("reads a day as its date and what touches the chart, or a quiet day", () => {
    const quiet: DialFrame = { date: "2026-10-05", bodies: [], contacts: [], headlines: [] };
    expect(frameText(quiet, "dmy")).toBe("Monday 5 October 2026. A quiet day.");
    const busy = { ...quiet, headlines: ["Taking yourself more seriously", "Big changes to your routines"] };
    expect(frameText(busy, "dmy")).toBe("Monday 5 October 2026. Taking yourself more seriously. Big changes to your routines.");
    expect(frameText(undefined, "dmy")).toBe("");
  });

  it("takes the stronger of two tones", () => {
    expect(strongerTone(null, "easy")).toBe("easy");
    expect(strongerTone("easy", "intense")).toBe("intense");
    expect(strongerTone("mixed", "easy")).toBe("mixed");
    expect(strongerTone(null, null)).toBeNull();
  });
});

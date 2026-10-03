/**
 * The home page's and /sky's skies are the engine's: the rewind's frames are
 * engine charts and its last is the birth chart itself, its date counts on the
 * birth place's calendar, a day with no time keeps the Moon's whole arc and no
 * horizon, and /sky's table lists what the wheel draws.
 */
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import type { GeocodeResult } from "@/lib/places";
import { SAMPLE, sampleChart } from "@/site/data/sample";
import {
  BODIES,
  birthDateProblem,
  birthSky,
  bodiesAt,
  countAt,
  countLine,
  countWord,
  draftOf,
  ease,
  houseParts,
  hudLines,
  keyCount,
  moonDay,
  placementLine,
  placementRows,
  plainLine,
  planRewind,
  positionParts,
  prepareRewind,
  resultLines,
  rewindAt,
  rewindFrame,
  risingLine,
  sampleSky,
  skyNow,
  summaryLine,
  visitorPlace,
  wheelLabel,
  type PreparedRewind,
  type Sky,
  type SkyBirth,
} from "./sky";
import audrey from "../../../../fixtures/charts/audrey-hepburn.json";
import curie from "../../../../fixtures/charts/marie-curie.json";
import curieUnknown from "../../../../fixtures/charts/marie-curie-unknown.json";

const place = (p: { latitude: number; longitude: number; timezoneOffset: number; timezone?: string }, city: string): GeocodeResult => ({
  name: city, city, region: "", country: "", latitude: p.latitude, longitude: p.longitude,
  timezoneOffset: p.timezoneOffset, timezone: p.timezone ?? null, placeType: "city",
});

const HEPBURN: SkyBirth = { date: audrey.birthDate, time: audrey.birthTime, place: place(audrey, "Ixelles") };
const CURIE: SkyBirth = { date: curie.birthDate, time: curie.birthTime, place: place(curie, "Warsaw") };
const CURIE_NO_TIME: SkyBirth = { date: curieUnknown.birthDate, time: null, place: place(curieUnknown, "Warsaw") };
const NOW = skyNow(new Date("2026-09-30T12:34:00Z"), "Europe/Brussels");

/** The gap between two longitudes the short way round, 0 to 180. */
const within = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

const prepared = (from: Sky, to: Sky, count: number) => new Promise<PreparedRewind>((done) => prepareRewind(from, to, count, done));

describe("the rewind", () => {
  it("ends on the birth minute's chart to the hundredth: Audrey Hepburn", async () => {
    const target = birthSky(HEPBURN);
    expect(target.chart).toEqual(sampleChart());
    const { plan, keys } = await prepared(NOW, target, 12);
    const drawn = bodiesAt(keys, 1);
    for (const body of BODIES) expect(within(drawn[body], target.chart.planets[body].absoluteDegree)).toBeLessThanOrEqual(0.01);
    // The engine, asked at the rewind's last minute on her clock, gives the same chart the frames end on.
    const last = rewindFrame(plan, 1);
    expect(last.at.toISOString()).toBe("1929-05-04T02:00:00.000Z");
    for (const body of BODIES) expect(within(last.longitudes[body], target.chart.planets[body].absoluteDegree)).toBeLessThanOrEqual(0.01);
    expect(placementLine(target.chart, "sun")).toBe("13.12° Taurus · 4th (home)");
    expect(placementLine(target.chart, "moon")).toBe("6.45° Pisces · 2nd (money)");
    expect(risingLine(target.chart)).toBe("28.62° Aquarius");
    expect(plainLine(target.chart)).toBe("Sun in Taurus, Moon in Pisces, Aquarius rising.");
  });

  it("ends on the birth chart where the place gave an offset and no zone: Marie Curie", () => {
    const target = birthSky(CURIE);
    const plan = planRewind(NOW, target);
    const last = rewindFrame(plan, 1);
    for (const body of BODIES) expect(within(last.longitudes[body], target.chart.planets[body].absoluteDegree)).toBeLessThanOrEqual(0.01);
    expect(target.chart.angles?.ascendant.sign).toBe("Capricorn");
  });

  it("starts on the sky it lifted and turns the band twice back onto the birth's Ascendant", () => {
    const target = birthSky(HEPBURN);
    const plan = planRewind(NOW, target);
    const first = rewindFrame(plan, 0);
    expect(first.at.getTime()).toBe(NOW.at.getTime());
    for (const body of BODIES) expect(within(first.longitudes[body], NOW.chart.planets[body].absoluteDegree)).toBeLessThanOrEqual(0.01);
    expect(plan.turn).toBeLessThanOrEqual(-540);
    expect(plan.turn).toBeGreaterThan(-900);
    expect(within(plan.frame + plan.turn, target.chart.angles!.ascendant.absoluteDegree)).toBeLessThan(1e-9);
    expect(planRewind(target, NOW).turn).toBeGreaterThanOrEqual(540);
  });

  it("draws the engine's own frames, worked out ahead, and glides the short way between them", async () => {
    const target = birthSky(HEPBURN);
    const { plan, keys } = await prepared(NOW, target, 12);
    expect(keys.map((k) => k.u)).toEqual(Array.from({ length: 12 }, (_, i) => i / 11));
    expect(bodiesAt(keys, 0)).toEqual(keys[0].longitudes);
    for (const body of BODIES) expect(within(keys[0].longitudes[body], NOW.chart.planets[body].absoluteDegree)).toBeLessThanOrEqual(0.01);
    const k = 7;
    const engine = rewindFrame(plan, keys[k].u).longitudes;
    for (const body of BODIES) expect(bodiesAt(keys, keys[k].u)[body]).toBeCloseTo(engine[body], 9);
    const mid = bodiesAt(keys, (keys[k].u + keys[k + 1].u) / 2);
    for (const body of BODIES) {
      const whole = within(keys[k].longitudes[body], keys[k + 1].longitudes[body]);
      expect(within(mid[body], keys[k].longitudes[body])).toBeCloseTo(whole / 2, 6);
      expect(within(mid[body], keys[k + 1].longitudes[body])).toBeCloseTo(whole / 2, 6);
    }
  });

  it("readies as many frames as one chart's cost fits into the lift, from 12 to 32", () => {
    expect(keyCount(30)).toBe(25);
    expect(keyCount(120)).toBe(12);
    expect(keyCount(4)).toBe(32);
  });

  it("moves the sky's time and the band's turn on the one easing", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    for (let x = 0.05; x < 1; x += 0.05) expect(ease(x)).toBeGreaterThan(ease(x - 0.05));
    const plan = planRewind(NOW, birthSky(HEPBURN));
    const half = rewindAt(plan, 0.5);
    const span = plan.to.getTime() - plan.from.getTime();
    expect(half.at.getTime()).toBe(plan.from.getTime() + Math.round(span * ease(0.5)));
    expect(half.frame).toBeCloseTo(plan.frame + plan.turn * ease(0.5), 9);
  });
});

describe("the counting date", () => {
  it("counts from today back to the birth day, never forward on the way", () => {
    const plan = planRewind(NOW, birthSky(HEPBURN));
    const counts = Array.from({ length: 101 }, (_, i) => countAt(plan, i / 100));
    expect(counts[0]).toBe("2026 · 09 · 30");
    expect(counts[100]).toBe("1929 · 05 · 04");
    for (let i = 1; i < counts.length; i++) expect(counts[i] <= counts[i - 1]).toBe(true);
    expect(rewindFrame(plan, 0.5).count).toBe(counts[50]);
  });

  it("reads the birth place's calendar, not UTC's", () => {
    const tokyo: SkyBirth = { date: "1990-01-01", time: "00:30", place: { ...place({ latitude: 35.68, longitude: 139.69, timezoneOffset: 9, timezone: "Asia/Tokyo" }, "Tokyo") } };
    const target = birthSky(tokyo);
    expect(target.at.toISOString()).toBe("1989-12-31T15:30:00.000Z");
    expect(countAt(planRewind(NOW, target), 1)).toBe("1990 · 01 · 01");
    expect(countLine("1929-05-04")).toBe("1929 · 05 · 04");
  });
});

describe("a birth day with no time", () => {
  it("has no horizon or houses, and its Moon is the arc of the whole day", () => {
    const sky = birthSky(CURIE_NO_TIME);
    expect(sky.chart.angles).toBeUndefined();
    expect(sky.chart.houses).toBeUndefined();
    const day = moonDay(sky.chart);
    const at = (time: string) => calculateNatalChart(CURIE_NO_TIME.date, time, curie.latitude, curie.longitude, curie.timezoneOffset, 0).planets.moon.absoluteDegree;
    expect(day).not.toBeNull();
    expect(day!.from).toBeCloseTo(at("00:00"), 2);
    expect(day!.to).toBeCloseTo(at("23:59"), 2);
    const span = (day!.to - day!.from + 360) % 360;
    expect(span).toBeGreaterThan(10);
    expect(span).toBeLessThan(16);
    expect(placementLine(sky.chart, "moon")).toMatch(/^\d+\.\d\d° \w+ to \d+\.\d\d° \w+$/);
    expect(risingLine(sky.chart)).toBeNull();
    expect(moonDay(birthSky(HEPBURN).chart)).toBeNull();
  });

  it("is drawn at noon on the birth place's clock, and says the Moon's signs for the whole day", () => {
    const sky = birthSky(CURIE_NO_TIME);
    expect(sky.at.toISOString()).toBe("1867-11-07T10:36:00.000Z");
    expect(plainLine(sky.chart)).toMatch(/^Sun in \w+, Moon in \w+( or \w+)?\.$/);
    expect(hudLines(sky).bl).toBe("Tropical · no horizon without a time");
    expect(summaryLine(CURIE_NO_TIME)).toBe("7 Nov 1867 · Time unknown · Warsaw");
  });
});

describe("the sky now", () => {
  it("is over the city the visitor's zone names, on that city's clock", () => {
    expect(NOW.place.city).toBe("Brussels");
    expect(NOW.at.toISOString()).toBe("2026-09-30T12:34:00.000Z");
    expect(NOW.chart.angles).toBeDefined();
    const hud = hudLines(NOW);
    expect(hud.tl).toBe("Live · 30 SEP 2026 · 14:34");
    expect(hud.tr).toBe("Over Brussels · 50.83°N 4.33°E");
    expect(hud.bl).toBe("Whole sign · tropical");
    expect(hud.br).toMatch(/^SUN \d+\.\d° (ABOVE|BELOW) THE HORIZON$/);
    expect(wheelLabel(NOW)).toMatch(/^The sky now over Brussels, drawn as a birth chart: Sun in \w+, Moon in \w+, \w+ rising\.$/);
  });

  it("gives a kept birth its day and minute on the left and its place on the right", () => {
    const sky = birthSky(HEPBURN);
    expect(hudLines(sky)).toEqual({
      tl: "Your chart · 4 May 1929 · 03:00",
      tr: "Ixelles · 50.83°N 4.37°E",
      bl: "Whole sign · tropical",
      br: "SUN 16.6° BELOW THE HORIZON",
    });
    expect(wheelLabel(sky)).toBe("Your birth chart: Sun in Taurus, Moon in Pisces, Aquarius rising.");
  });

  it("starts the form on that city, with the offset in force today", () => {
    const here = visitorPlace(new Date("2026-09-30T12:00:00Z"), "Europe/Brussels");
    expect(here).toMatchObject({ name: "Brussels", region: "Europe", country: "", timezone: "Europe/Brussels", timezoneOffset: 2, latitude: 50.83, longitude: 4.33 });
    expect(visitorPlace(new Date("2026-01-15T12:00:00Z"), "Etc/Unknown")).toMatchObject({ city: "London", timezoneOffset: 0 });
  });
});

describe("/sky's worked example", () => {
  const example = sampleSky(SAMPLE.name, SAMPLE.place, SAMPLE.birth, sampleChart());

  it("is the sample's own chart at the minute the engine gives her birth", () => {
    const engine = calculateNatalChart(audrey.birthDate, audrey.birthTime, audrey.latitude, audrey.longitude, audrey.timezone, 0);
    expect(example.at.toISOString()).toBe(engine.datetimeUtc);
    expect(example.chart).toBe(sampleChart());
    expect(example.place).toMatchObject({ city: "Ixelles", region: "Brussels", timezone: "Europe/Brussels" });
    expect(example.birth).toMatchObject({ date: "1929-05-04", time: "03:00" });
  });

  it("names her as a sample in the corners, to a screen reader and over the table", () => {
    expect(hudLines(example)).toEqual({
      tl: "Sample · Audrey Hepburn · 4 May 1929 · 03:00",
      tr: "Ixelles · 50.83°N 4.37°E",
      bl: "Whole sign · tropical",
      br: "SUN 16.6° BELOW THE HORIZON",
    });
    expect(wheelLabel(example)).toBe("Audrey Hepburn's birth chart, a sample: Sun in Taurus, Moon in Pisces, Aquarius rising.");
    expect(resultLines(example)).toEqual({
      eyebrow: "Sample chart",
      title: "Sun in Taurus, Moon in Pisces, Aquarius rising.",
      summary: "Audrey Hepburn · 4 May 1929 · 03:00 · Ixelles",
      caption: "Where each planet was",
    });
  });

  it("rewinds to a birth from where it stands, as the sky now does", async () => {
    const target = birthSky(CURIE);
    const { keys } = await prepared(example, target, 12);
    for (const body of BODIES) expect(within(keys[0].longitudes[body], example.chart.planets[body].absoluteDegree)).toBeLessThanOrEqual(0.01);
    expect(planRewind(example, target).turn).toBeLessThanOrEqual(-540);
  });
});

describe("the times printed on a 12-hour clock (MB-178)", () => {
  const example = sampleSky(SAMPLE.name, SAMPLE.place, SAMPLE.birth, sampleChart());

  it("say a birth's minute in the reader's words, the 24-hour clock being the prerender's", () => {
    expect(summaryLine(HEPBURN, 12)).toBe("4 May 1929 · 3\u00a0am · Ixelles");
    expect(summaryLine(HEPBURN, 24)).toBe("4 May 1929 · 03:00 · Ixelles");
    expect(summaryLine(HEPBURN)).toBe(summaryLine(HEPBURN, 24));
    expect(summaryLine({ ...HEPBURN, time: "15:00" }, 12)).toBe("4 May 1929 · 3\u00a0pm · Ixelles");
    expect(summaryLine(CURIE_NO_TIME, 12)).toBe("7 Nov 1867 · Time unknown · Warsaw");
    expect(resultLines(example, 12).summary).toBe("Audrey Hepburn · 4 May 1929 · 3\u00a0am · Ixelles");
  });

  it("say the corners' minute in the reader's words, the sky now's on its city's clock", () => {
    expect(hudLines(NOW, 12).tl).toBe("Live · 30 SEP 2026 · 2:34\u00a0pm");
    expect(hudLines(birthSky(HEPBURN), 12).tl).toBe("Your chart · 4 May 1929 · 3\u00a0am");
    expect(hudLines(example, 12).tl).toBe("Sample · Audrey Hepburn · 4 May 1929 · 3\u00a0am");
    expect(hudLines(birthSky(CURIE_NO_TIME), 12).tl).toBe("Your chart · 7 Nov 1867 · Time unknown");
    expect(hudLines(example, 24)).toEqual(hudLines(example));
  });
});

describe("/sky's placements", () => {
  it("lists the ten bodies the wheel draws, then Rising in the 1st and the Midheaven in its whole-sign house", () => {
    const rows = placementRows(sampleChart());
    expect(rows.map((r) => r.label)).toEqual([
      "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Rising", "Midheaven",
    ]);
    expect(rows[0]).toEqual({ key: "sun", label: "Sun", angle: false, position: ["13.12°", "Taurus"], house: 4 });
    expect(rows[1]).toMatchObject({ position: ["6.45°", "Pisces"], house: 2 });
    expect(rows[10]).toEqual({ key: "ascendant", label: "Rising", angle: true, position: ["28.62°", "Aquarius"], house: 1 });
    expect(rows[11]).toEqual({ key: "midheaven", label: "Midheaven", angle: true, position: ["16.97°", "Sagittarius"], house: 11 });
    for (const row of rows.slice(0, 10)) {
      expect(`${row.position.join(" ")} · ${houseParts(row.house!).join(" ")}`).toBe(placementLine(sampleChart(), row.key));
    }
    expect(houseParts(4)).toEqual(["4th", "(home)"]);
  });

  it("gives a day with no time no houses and no angles, and the Moon's range across the day", () => {
    const chart = birthSky(CURIE_NO_TIME).chart;
    const rows = placementRows(chart);
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.house === null && !r.angle)).toBe(true);
    const moon = positionParts(chart, "moon");
    expect(moon).toHaveLength(2);
    expect(moon[0]).toMatch(/^\d+\.\d\d° \w+$/);
    expect(moon[1]).toMatch(/^to \d+\.\d\d° \w+$/);
    expect(moon.join(" ")).toBe(placementLine(chart, "moon"));
  });

  it("heads the sky now with its city and a birth with its day, minute and place", () => {
    expect(resultLines(NOW)).toEqual({
      eyebrow: "The sky right now",
      title: "Where the planets are over Brussels right now",
      summary: "50.83°N 4.33°E · Whole sign · tropical",
      caption: "Where each planet is now",
    });
    expect(resultLines(birthSky(CURIE_NO_TIME))).toMatchObject({ eyebrow: "Your birth chart", summary: "7 Nov 1867 · Time unknown · Warsaw" });
  });

  it("says a count as a sentence does", () => {
    expect(countWord(10)).toBe("ten");
    expect(countWord(13)).toBe("13");
  });
});

describe("the form", () => {
  it("takes a real day from 1900 to today and says so otherwise", () => {
    expect(birthDateProblem("1990-05-17", "2026-09-30")).toBeNull();
    expect(birthDateProblem("1900-01-01", "2026-09-30")).toBeNull();
    for (const bad of ["", "1899-12-31", "2026-10-01", "1990-02-31", "17/05/1990"]) {
      expect(birthDateProblem(bad, "2026-09-30")).toBe("Enter a birth date from 1900 to today.");
    }
  });

  it("carries the time as the birth form's answer: a blank time is its I don't know", () => {
    expect(draftOf(HEPBURN)).toEqual({ birthDate: "1929-05-04", time: { mode: "known", time: "03:00", part: "afternoon", kind: "part" }, place: HEPBURN.place });
    expect(draftOf(CURIE_NO_TIME).time.mode).toBe("unknown");
  });
});

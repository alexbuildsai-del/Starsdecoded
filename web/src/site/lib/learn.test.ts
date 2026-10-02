/**
 * The Learn pages say only what the zodiac's order and the engine give them:
 * the signs a rising sign puts in each house, the sample's houses and her
 * day to the minute, and a whole day's rising signs, each checked against the
 * engine itself (R-3.1, ADR-98).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import { SIGN_ORDER, norm360 } from "@/components/chart/wheel-geometry";
import { ORDINALS, houseWord } from "@/lib/evidence-glossary";
import { degreeLine } from "@/lib/sky-now";
import { SAMPLE_PEOPLE } from "@/site/data/people";
import { SAMPLE, sampleChart } from "@/site/data/sample";
import { chartOf, type Birth } from "@/site/lib/chart";
import {
  MINUTES_IN_DAY, chartLine, clockOf, dayStats, houseSigns, litHouses, minuteOf, moveLine, pickLine, riseWindow,
  ringLabel, risingIndex, sampleDayLine, spanAt, sweepDay,
} from "./learn";

/** The engine's rising sign at one minute of a birth's day, charted as a birth at that minute on the local clock. */
function risingAt(at: Birth, minute: number): string {
  const chart = calculateNatalChart(at.birthDate, clockOf(minute), at.latitude, at.longitude, at.timezone ?? at.timezoneOffset);
  const sign = chart.angles?.ascendant.sign;
  if (!sign) throw new Error(`No horizon at ${clockOf(minute)} on ${at.birthDate}`);
  return sign;
}

describe("whole-sign houses on the bare ring", () => {
  it("picking Leo puts Taurus in the 10th", () => {
    const leo = SIGN_ORDER.indexOf("Leo");
    expect(houseSigns(leo)[9]).toBe("Taurus");
    expect(pickLine(leo)).toBe("Leo rising: Leo is the 1st house (self), Virgo the 2nd (money) and Taurus the 10th (career).");
  });

  it("puts the rising sign in the 1st house and each of the twelve signs in one house, in the zodiac's order", () => {
    SIGN_ORDER.forEach((sign, rising) => {
      const signs = houseSigns(rising);
      expect(signs[0]).toBe(sign);
      expect(new Set(signs).size).toBe(12);
      signs.forEach((s, h) => expect(SIGN_ORDER.indexOf(s as (typeof SIGN_ORDER)[number])).toBe((rising + h) % 12));
    });
  });

  it("gives the ring a text equivalent naming every house with its word and its sign", () => {
    const label = ringLabel(0);
    houseSigns(0).forEach((sign, i) => expect(label).toContain(`${ORDINALS[i]} (${houseWord(i + 1)}) ${sign}`));
  });
});

describe("the sample's houses", () => {
  it("are said from her computed chart: her rising sign as the 1st house and her Sun's house counted from it", () => {
    const chart = sampleChart();
    const asc = chart.angles?.ascendant.sign;
    const sun = chart.planets.sun;
    if (!asc || !sun.house) throw new Error("The sample's birth time is known, so her chart has a horizon");
    const line = chartLine(SAMPLE.name, chart);
    expect(line).toContain(`When ${SAMPLE.name} was born, ${asc} was rising, so ${asc} is her 1st house (self)`);
    expect(line).toContain(`Her Sun is in ${sun.sign}`);
    expect(line).toContain(`${ORDINALS[sun.house - 1]} house (${houseWord(sun.house)}).`);
    expect(risingIndex(chart)).toBe(SIGN_ORDER.indexOf(asc as (typeof SIGN_ORDER)[number]));
    expect(litHouses(chart)).toEqual(sun.house === 1 ? [1] : [1, sun.house]);
  });

  it("change with the birth: another person's chart gives that chart's signs", () => {
    const mira = SAMPLE_PEOPLE[0];
    const chart = mira.chart;
    const line = chartLine(mira.name, chart) ?? "";
    expect(line).toContain(`${chart.angles?.ascendant.sign} was rising`);
    expect(line).toContain(`Her Sun is in ${chart.planets.sun.sign}`);
  });
});

describe("the sample's day", () => {
  it("gives her rising sign's window as the engine's own holdsFrom and holdsTo for her birth, the pair the horizon preview returns", () => {
    const b = SAMPLE.birth;
    const held = calculateNatalChart(b.birthDate, b.birthTime, b.latitude, b.longitude, b.timezone ?? b.timezoneOffset, 0).horizon.ascendant;
    const birth = minuteOf(b.birthTime);
    const w = riseWindow(b);
    expect(w).toEqual({
      sign: held.value,
      next: expect.any(String),
      from: held.holdsFrom,
      to: held.holdsTo,
      since: birth - minuteOf(held.holdsFrom),
      left: minuteOf(held.holdsTo) - birth,
    });
  });

  it("stays within the engine's two-minute step of a minute-by-minute sweep, and names the sign that follows", () => {
    const b = SAMPLE.birth;
    const birth = minuteOf(b.birthTime);
    const sign = risingAt(b, birth);
    let first = birth;
    while (first > 0 && risingAt(b, first - 1) === sign) first--;
    let after = birth + 1;
    while (after < MINUTES_IN_DAY && risingAt(b, after) === sign) after++;

    const w = riseWindow(b);
    if (!w?.from || !w.to) throw new Error("Her window lies inside her birth day");
    expect(w.sign).toBe(sign);
    expect(w.next).toBe(risingAt(b, after));
    expect(Math.abs(minuteOf(w.from) - first)).toBeLessThanOrEqual(2);
    expect(Math.abs(minuteOf(w.to) - after)).toBeLessThanOrEqual(2);
  }, 60_000);

  it("reads a window that runs to the day's end as open, not as a time", () => {
    const b = { ...SAMPLE.birth, birthTime: clockOf(MINUTES_IN_DAY - 2) };
    const w = riseWindow(b);
    expect(w?.to).toBeNull();
    expect(w?.left).toBeNull();
  });

  it("is said in words from that window, with her recorded time", () => {
    const w = riseWindow(SAMPLE.birth);
    if (!w?.from || !w.to || !w.next) throw new Error("Her window lies inside her birth day");
    const line = sampleDayLine(SAMPLE.name, "Brussels", SAMPLE.birth, w);
    expect(line).toContain(`${w.sign} was rising from ${w.from} to ${w.to}.`);
    expect(line).toContain(`Her birth record says ${SAMPLE.birth.birthTime}`);
    expect(line).toContain(w.left !== null && w.left <= 15 ? `before ${w.next} began to rise` : w.sign);
  });
});

describe("a whole day's rising signs", () => {
  const days: Birth[] = [SAMPLE.birth, SAMPLE_PEOPLE[0].birth, { ...SAMPLE_PEOPLE[2].birth, birthDate: "2026-06-21" }];

  it("change sign on the very minute the engine does, and follow the zodiac round without a gap", () => {
    for (const at of days) {
      const day = sweepDay(at);
      expect(day.spans[0].from).toBeNull();
      expect(day.spans[day.spans.length - 1].to).toBeNull();
      day.spans.forEach((span, i) => {
        if (i === 0 || span.from === null) return;
        const before = day.spans[i - 1];
        expect(before.to).toBe(span.from);
        expect(risingAt(at, span.from), `${at.birthDate} ${clockOf(span.from)}`).toBe(span.sign);
        expect(risingAt(at, span.from - 1), `${at.birthDate} ${clockOf(span.from - 1)}`).toBe(before.sign);
        expect(SIGN_ORDER.indexOf(span.sign as (typeof SIGN_ORDER)[number])).toBe((SIGN_ORDER.indexOf(before.sign as (typeof SIGN_ORDER)[number]) + 1) % 12);
      });
    }
  }, 60_000);

  it("give the readout beside the wheel, each value from the chart at that minute", () => {
    const at = days[2];
    const day = sweepDay(at);
    for (const minute of [0, 305, 720, 1435]) {
      const time = clockOf(minute);
      const chart = chartOf({ ...at, birthTime: time });
      const rows = Object.fromEntries(dayStats(day, chart, time).map((r) => [r.label, r]));
      const asc = chart.angles?.ascendant;
      if (!asc) throw new Error("A chart at an exact minute has a horizon");
      expect(rows.Rising.value).toBe(degreeLine(asc));
      expect(spanAt(day, time)?.sign).toBe(asc.sign);
      expect(rows.Rising.note.startsWith(asc.sign)).toBe(true);
      expect(rows.Houses.value).toBe(`${asc.sign} is the 1st house (self)`);
      expect(rows.Moon.value).toBe(degreeLine(chart.planets.moon));
      expect(rows.Sun.value).toBe(degreeLine(chart.planets.sun));
    }
    expect(moveLine(day.moon, 1)).toContain(`${norm360(day.moon.toDegree - day.moon.fromDegree).toFixed(1)}°`);
  }, 60_000);
});

describe("the code that writes the two pages", () => {
  const SOURCES = ["./learn.ts", "../components/HouseRing.tsx", "../pages/LearnHousesPage.tsx", "../pages/LearnBirthTimePage.tsx"];

  it("types no sign, degree or clock time: each comes from the zodiac's order or the engine", () => {
    for (const path of SOURCES) {
      // Comments may show what a line reads like; only the code is checked.
      const code = readFileSync(new URL(path, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const sign of SIGN_ORDER) expect(code, `${path} types ${sign}`).not.toContain(sign);
      expect(code, `${path} types a clock time`).not.toMatch(/\b\d{1,2}:\d{2}\b/);
      expect(code, `${path} types a degree`).not.toMatch(/\d+\.\d+°/);
    }
  });
});

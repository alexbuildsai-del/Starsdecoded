/**
 * Life's pieces at their edges (R16-07, readings 4 and 19, ADR-209): the day a cycle turns from ahead to now to behind,
 * the years a chip rounds to, the head a compact card makes of four ages and of five, passes across a year's end, the
 * ring at a quarter, a half and past a whole turn, the wave's marks on an empty or a short line, and the ring's target
 * read from an age alone checked against the engine's own angle for every cycle on every fixture, since Mira's page
 * has no angle to give it.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ageAt, calculateNatalChart, lifeCycles, natalLongitudes, type CycleId } from "@workspace/engine";
import {
  WAVE_UNTIL, cycleAges, cycleBody, cycleChip, cycleDates, cycleDay, cycleFact, cycleKind, cycleMark, cycleWhen, lookBack,
  passList, ringArc, ringPoint, ringTarget, waveMarks, wavePath, waveSentence, waveTicks, waveX, waveY, wavesLabel,
  type CycleView, type WaveLine,
} from "./life-view";

const seen = (text: string | null) => (text ?? "").replace(/ /g, " ");
const TODAY = "2026-10-05";
const DAY = 86_400_000;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

const CYCLE: CycleView = {
  key: "cycle.saturn-return.20380702", id: "saturn-return", name: "Saturn return", word: "A reset", age: 47,
  exact: ["2038-07-02"], start: "2038-06-23", end: "2038-07-11", repeats: true, today: TODAY, progress: 0.5, last: null,
};

describe("when a cycle is ahead, now or behind", () => {
  it("turns on its window's first and last day: the first day is now, the day after the last is behind", () => {
    const window = { start: "2026-11-01", end: "2026-11-20" };
    expect(cycleWhen(window, "2026-10-31")).toBe("ahead");
    expect(cycleWhen(window, "2026-11-01")).toBe("now");
    expect(cycleWhen(window, "2026-11-20")).toBe("now");
    expect(cycleWhen(window, "2026-11-21")).toBe("past");
    expect(cycleWhen({ start: "2026-11-01", end: "2026-11-01" }, "2026-11-01")).toBe("now");
  });

  it("chips each state: behind you, happening now, within a year, and in a year or years, rounded to the nearest", () => {
    const ahead = (days: number) => cycleChip({ exact: [addDays(TODAY, days)], start: addDays(TODAY, days - 5), end: addDays(TODAY, days + 5) }, TODAY);
    expect(ahead(6)).toBe("Within a year");
    expect(ahead(364)).toBe("Within a year");
    expect(ahead(366)).toBe("In 1 year");
    expect(ahead(500)).toBe("In 1 year");
    expect(ahead(600)).toBe("In 2 years");
    expect(ahead(365 * 12)).toBe("In 12 years");
    expect(ahead(365 * 40)).toBe("In 40 years");
    expect(cycleChip({ exact: [], start: addDays(TODAY, 800), end: addDays(TODAY, 830) }, TODAY)).toBe("In 2 years");
    expect(cycleChip({ exact: ["2020-01-01"], start: "2019-12-01", end: "2020-02-01" }, TODAY)).toBe("Behind you");
    expect(cycleChip({ exact: [TODAY], start: addDays(TODAY, -3), end: addDays(TODAY, 3) }, TODAY)).toBe("Happening now");
    expect(cycleChip({ exact: ["2026-10-04"], start: "2026-09-01", end: "2026-10-04" }, TODAY)).toBe("Behind you");
    expect(cycleChip({ exact: ["2026-10-06"], start: "2026-10-06", end: "2026-10-30" }, TODAY)).toBe("Within a year");
  });

  it("dates a cycle by its first pass or, with none, its window's start", () => {
    expect(cycleDay({ exact: ["2035-08-16", "2035-12-28"], start: "2035-07-21" })).toBe("2035-08-16");
    expect(cycleDay({ exact: [], start: "2035-07-21" })).toBe("2035-07-21");
  });
});

describe("the compact card's head", () => {
  const head = (ages: number[] | undefined, repeats = true, age = ages?.[0] ?? 29) => cycleAges({ age, ages, repeats });

  it("lists up to four ages and counts a longer run by how often, rounded, from the first", () => {
    expect(head([29])).toBe("At 29");
    expect(head([29, 58])).toBe("At 29 and 58");
    expect(head([18, 37, 55])).toBe("At 18, 37 and 55");
    expect(head([18, 37, 55, 74])).toBe("At 18, 37, 55 and 74");
    expect(head([9, 27, 46, 65, 83])).toBe("About every 19 years, from 9");
    expect(head([11, 23, 35, 47, 59, 71, 83])).toBe("About every 12 years, from 11");
    expect(head([5, 6, 7, 8, 9])).toBe("About every 1 years, from 5");
  });

  it("falls back to the card's own age with no ages or an empty list, and says once for a cycle that comes once, whatever ages came", () => {
    expect(head(undefined, true, 44)).toBe("At 44");
    expect(head([], true, 44)).toBe("At 44");
    expect(head([44, 99], false, 44)).toBe("Once, at 44");
    expect(head(undefined, false, 41)).toBe("Once, at 41");
  });
});

describe("passes and dates", () => {
  it("shares a year between passes in it, keeps a year for each across years, and lists none as nothing", () => {
    expect(passList([], "dmy")).toBe("");
    expect(seen(passList(["2035-03-01", "2035-07-10", "2035-12-31"], "dmy"))).toBe("1 Mar, 10 Jul and 31 Dec 2035");
    expect(seen(passList(["2035-03-01", "2035-07-10", "2035-12-31"], "mdy"))).toBe("Mar 1, Jul 10 and Dec 31, 2035");
    expect(seen(passList(["2035-03-01", "2035-07-10", "2035-12-31"], "ymd"))).toBe("2035 Mar 1, Jul 10 and Dec 31");
    expect(seen(passList(["2035-12-31", "2036-01-01"], "dmy"))).toBe("31 Dec 2035 and 1 Jan 2036");
    expect(seen(passList(["2035-08-16", "2035-12-28", "2036-06-02"], "dmy"))).toBe("16 Aug 2035, 28 Dec 2035 and 2 Jun 2036");
  });

  it("gives a cycle with passes its passes, one with none its window, and the age after either, in every order", () => {
    const never = { exact: [] as string[], start: "2035-07-21", end: "2036-06-27", age: 44 };
    expect(seen(cycleDates(never, "dmy"))).toBe("21 Jul 2035 to 27 Jun 2036");
    expect(seen(cycleDates(never, "mdy"))).toBe("Jul 21, 2035 to Jun 27, 2036");
    expect(seen(cycleFact(never, "ymd"))).toBe("2035 Jul 21 to 2036 Jun 27 · age 44");
    expect(seen(cycleFact(CYCLE, "dmy"))).toBe("2 Jul 2038 · age 47");
  });
});

describe("the look-back", () => {
  it("is a month and a year and never a season, whatever the order or the month", () => {
    for (let m = 1; m <= 12; m++) {
      const day = `2021-${String(m).padStart(2, "0")}-15`;
      const line = seen(lookBack({ ...CYCLE, exact: [day], start: day, end: "2021-12-31" }, TODAY, "dmy"));
      expect(line).toMatch(/^Think back to [A-Z][a-z]+ 2021, when you were 47\.$/);
      expect(line).not.toMatch(/spring|summer|autumn|fall|winter/i);
    }
  });

  it("turns on the cycle's last day: until it closes it looks to the time before, and from the next day to itself", () => {
    const withLast = { ...CYCLE, exact: ["2026-10-05"], start: "2026-09-20", end: "2026-10-05", last: { on: "2014-06-10", age: 35 } };
    expect(seen(lookBack(withLast, "2026-10-05", "dmy"))).toBe("Think back to June 2014, the last time it happened. You were 35.");
    expect(seen(lookBack(withLast, "2026-10-06", "dmy"))).toBe("Think back to October 2026, when you were 47.");
    expect(lookBack({ ...withLast, last: null }, "2026-10-05", "dmy")).toBeNull();
    expect(seen(lookBack({ ...withLast, last: null }, "2026-10-06", "dmy"))).toBe("Think back to October 2026, when you were 47.");
  });

  it("has none for a cycle that comes once, however far behind, ahead or under way", () => {
    for (const today of ["1999-01-01", "2038-07-02", "2099-01-01"]) {
      expect(lookBack({ ...CYCLE, repeats: false, last: { on: "2014-06-10", age: 35 } }, today, "dmy")).toBeNull();
    }
  });

  it("looks back for an ahead cycle that has an earlier one, in the reader's order", () => {
    const ahead = { ...CYCLE, last: { on: "2009-01-19", age: 18 } };
    expect(seen(lookBack(ahead, TODAY, "ymd"))).toBe("Think back to 2009 January, the last time it happened. You were 18.");
  });
});

describe("the ring", () => {
  it("puts any fraction on the circle, and a whole turn back where it began", () => {
    for (const f of [0, 0.1, 0.25, 0.5, 0.9, 1, 1.5, -0.25]) {
      const [x, y] = ringPoint(f, 50, 40);
      expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(40, 1);
    }
    expect(ringPoint(1, 50, 40)).toEqual(ringPoint(0, 50, 40));
    expect(ringPoint(1.25, 50, 40)).toEqual(ringPoint(0.25, 50, 40));
    expect(ringPoint(0, 50, 0)).toEqual([50, 50]);
  });

  it("draws the long way only past half, nothing for none or less, and the whole circle for a whole turn or more", () => {
    expect(ringArc(0.5, 50, 40)).toBe("M10 50A40 40 0 0 0 90 50");
    expect(ringArc(0.5001, 50, 40)).toMatch(/A40 40 0 1 0/);
    expect(ringArc(0.4999, 50, 40)).toMatch(/A40 40 0 0 0/);
    expect(ringArc(-1, 50, 40)).toBe("");
    expect(ringArc(0, 50, 40)).toBe("");
    expect(ringArc(1, 50, 40)).toBe(ringArc(5, 50, 40));
    expect(ringArc(1, 50, 40).match(/A/g)).toHaveLength(2);
    expect(ringArc(0.001, 50, 40)).toMatch(/^M10 50A40 40 0 0 0 /);
  });

  it("marks a quarter, a half or three quarters from the engine's angle, however many turns it has made, and none for a return", () => {
    const target = (id: CycleId, angle: number) => ringTarget({ id, age: 30, angle });
    expect(target("saturn-square", 90)).toBe(0.25);
    expect(target("saturn-square", 270)).toBe(0.75);
    expect(target("saturn-square", 450)).toBe(0.25);
    expect(target("saturn-square", 630)).toBe(0.75);
    expect(target("jupiter-opposition", 180)).toBe(0.5);
    expect(target("jupiter-opposition", 900)).toBe(0.5);
    for (const angle of [0, 360, 720, 1080, -360]) expect(target("jupiter-return", angle), String(angle)).toBeNull();
    expect(target("saturn-square", -90)).toBe(0.75);
  });

  it("reads each id as its kind and its body, including the nodes", () => {
    const ids = ["jupiter-return", "jupiter-opposition", "saturn-return", "saturn-opposition", "saturn-square", "node-return", "node-opposition", "uranus-return", "uranus-opposition", "uranus-square", "neptune-square", "pluto-square"] as const;
    expect(ids.map(cycleKind)).toEqual(["return", "opposition", "return", "opposition", "square", "return", "opposition", "return", "opposition", "square", "square", "square"]);
    expect(ids.map(cycleBody)).toEqual(["jupiter", "jupiter", "saturn", "saturn", "saturn", "north_node", "north_node", "uranus", "uranus", "uranus", "neptune", "pluto"]);
  });
});

describe("the ring's target from an age alone, against the engine's angle for every cycle on every fixture", () => {
  const fixtures = ["charts", "sample-people"].flatMap((folder) =>
    readdirSync(new URL(`../../../fixtures/${folder}/`, import.meta.url))
      .filter((file) => file.endsWith(".json"))
      .map((file) => `${folder}/${file}`),
  );

  it("names the same quarter, half or none for every cycle the engine finds", () => {
    expect(fixtures.length).toBeGreaterThan(5);
    let squares = 0;
    for (const file of fixtures) {
      const f = JSON.parse(readFileSync(new URL(`../../../fixtures/${file}`, import.meta.url), "utf8"));
      const chart = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);
      const birth = new Date(chart.datetimeUtc);
      for (const cycle of lifeCycles(natalLongitudes(chart), birth)) {
        const fromAngle = ringTarget({ id: cycle.id, age: cycle.age, angle: cycle.angle });
        const fromAge = ringTarget({ id: cycle.id, age: cycle.age });
        expect(fromAge, `${file} ${cycle.key} at ${cycle.age} (${cycle.angle}°)`).toBe(fromAngle);
        if (cycleKind(cycle.id) === "square") squares++;
      }
    }
    expect(squares).toBeGreaterThan(20);
  });
});

describe("a cycle's mark on its wave is its card's age", () => {
  it("counts a birthday from the hour of birth as the engine does, for any birth, including a leap day", () => {
    const births = ["1991-03-14T07:40:00.000Z", "2000-02-29T12:00:00.000Z", "1988-12-31T23:59:00.000Z", "1950-01-01T00:00:00.000Z"];
    for (const born of births) {
      for (const years of [3, 29, 58, 89]) {
        const b = new Date(born);
        for (const delta of [-2, -1, 0, 1, 200, 300 * 86_400]) {
          const day = new Date(b.getTime());
          day.setUTCFullYear(b.getUTCFullYear() + years);
          const at = new Date(day.getTime() + delta * 1000);
          const mark = cycleMark("saturn-return", at, b);
          expect(Math.floor(mark.age), `${born} + ${years}y ${delta}s`).toBe(ageAt(b, at));
          expect(mark.age).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("is zero at birth and counts a fraction of the year after", () => {
    const born = "1991-03-14T07:40:00.000Z";
    expect(cycleMark("saturn-return", born, born).age).toBe(0);
    expect(cycleMark("jupiter-opposition", "1991-09-14T07:40:00.000Z", born).age).toBeCloseTo(0.5, 1);
    expect(cycleMark("saturn-square", "1991-09-14T07:40:00.000Z", born).kind).toBe("square");
  });
});

describe("the waves", () => {
  const flat = (body: string, distance: number): WaveLine => ({ body, points: Array.from({ length: 1081 }, (_, m) => ({ age: m / 12, distance })) });

  it("has no marks for a line with no points, a body the doctrine has no cycle for, or too few points to see a turn in", () => {
    expect(waveMarks({ body: "saturn", points: [] })).toEqual([]);
    expect(waveMarks({ body: "saturn", points: [{ age: 0, distance: 0 }] })).toEqual([]);
    expect(waveMarks({ body: "saturn", points: [{ age: 0, distance: 0 }, { age: 1 / 12, distance: 4 }, { age: 2 / 12, distance: 8 }] })).toEqual([]);
    expect(waveMarks({ body: "mars", points: flat("mars", 10).points })).toEqual([]);
    expect(waveMarks(flat("saturn", 0))).toEqual([]);
    expect(waveMarks(flat("saturn", 45))).toEqual([]);
    expect(waveSentence({ body: "saturn", points: [] })).toBe("");
  });

  it("says where today falls even with no marks, and speaks of the nodes as they", () => {
    expect(wavesLabel([], 35.9)).toBe("You are 35 now.");
    expect(wavesLabel([{ body: "saturn", points: [] }], 0)).toBe("You are 0 now.");
    expect(wavesLabel([{ body: "saturn", points: [] }], 89.99)).toBe("You are 89 now.");
  });

  it("clips what it draws to birth to 90: a point past 90 draws nothing and is not marked", () => {
    const past: WaveLine = { body: "saturn", points: [{ age: 89, distance: 10 }, { age: 90, distance: 20 }, { age: 91, distance: 30 }, { age: 92, distance: 40 }] };
    expect(wavePath(past.points).split("L")).toHaveLength(2);
    expect(wavePath([])).toBe("");
    expect(waveX(WAVE_UNTIL + 10)).toBe(100);
    expect(waveX(-5)).toBe(0);
    expect(waveY(-10)).toBe(waveY(0));
    expect(waveY(200)).toBe(waveY(180));
    expect(waveY(0)).toBeLessThan(100);
    expect(waveY(180)).toBeGreaterThan(0);
  });

  it("draws every point of a full life inside its 1000 by 100 box", () => {
    const line = flat("saturn", 90);
    const points = [...wavePath(line.points).matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(points).toHaveLength(1081);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1000);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it("keeps its age ticks clear of today's label at both ends of a life", () => {
    expect(waveTicks(-5)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(waveTicks(8)).toEqual([0, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(waveTicks(18)).toEqual([0, 10, 30, 40, 50, 60, 70, 80, 90]);
    expect(waveTicks(90)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80]);
    expect(waveTicks(45)).toEqual([0, 10, 20, 30, 60, 70, 80, 90]);
    for (const today of [0, 7.9, 8, 33, 61.5, 89.9]) {
      for (const tick of waveTicks(today)) expect(Math.abs(tick - today)).toBeGreaterThanOrEqual(8);
    }
  });
});

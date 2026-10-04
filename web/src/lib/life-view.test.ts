/**
 * Life's pieces (R16-07): a cycle card's ages, dates, status and look-back in
 * the reader's order (readings 4, 19), the ring's geometry, and the waves'
 * marks. The marks are checked on a planet moving evenly, then with a yearly
 * wobble that makes it pass each point three times, and last against the
 * engine's own cycles for Mira's birth date (fixtures/sample-people/mira.json),
 * so a mark on a wave is where the doctrine puts a cycle.
 */
import { describe, expect, it } from "vitest";
import { lifeCycles, noonLongitudes, noonOf, waves } from "@workspace/engine";
import {
  cycleAges,
  cycleBody,
  cycleChip,
  cycleDates,
  cycleFact,
  cycleMark,
  cycleWhen,
  lookBack,
  passList,
  ringArc,
  ringPoint,
  ringTarget,
  waveMarks,
  wavePath,
  waveSentence,
  waveTicks,
  waveX,
  waveY,
  wavesLabel,
  type CycleView,
  type WaveLine,
} from "./life-view";

const seen = (text: string | null) => (text ?? "").replace(/\u00a0/g, " ");
const TODAY = "2026-10-05";

// Mira's first Saturn return, one pass, at 29.
const SATURN_RETURN: CycleView = {
  key: "cycle.saturn-return.20210119",
  id: "saturn-return",
  name: "Saturn return",
  word: "A reset",
  age: 29,
  exact: ["2021-01-19"],
  start: "2020-04-26",
  end: "2021-02-04",
  repeats: true,
  today: TODAY,
  progress: 0.19,
  angle: 360,
  last: null,
  ages: [29, 58, 88],
};

// Her next Jupiter return, with the one before it to look back to.
const JUPITER_RETURN: CycleView = {
  key: "cycle.jupiter-return.20380702",
  id: "jupiter-return",
  name: "Jupiter return",
  word: "A fresh start",
  age: 47,
  exact: ["2038-07-02"],
  start: "2038-06-23",
  end: "2038-07-11",
  repeats: true,
  today: TODAY,
  progress: 0.04,
  last: { on: "2026-07-18", age: 35 },
  ages: [11, 23, 35, 47, 59, 71, 83],
};

// Uranus opposite its place at birth: once in a life, three passes across two years.
const URANUS_OPPOSITION: CycleView = {
  key: "cycle.uranus-opposition.20350816",
  id: "uranus-opposition",
  name: "Uranus opposition",
  word: "A midlife change",
  age: 44,
  exact: ["2035-08-16", "2035-12-28", "2036-06-02"],
  start: "2035-07-21",
  end: "2036-06-27",
  repeats: false,
  today: TODAY,
  progress: 0.41,
  last: null,
};

describe("a cycle's status", () => {
  it("is behind the reader once its window closes, happening while it's open, and ahead before", () => {
    expect(cycleWhen(SATURN_RETURN, TODAY)).toBe("past");
    expect(cycleWhen(SATURN_RETURN, "2020-12-01")).toBe("now");
    expect(cycleWhen(SATURN_RETURN, "2020-04-26")).toBe("now");
    expect(cycleWhen(SATURN_RETURN, "2020-04-25")).toBe("ahead");
  });

  it("counts the years to its first exact pass", () => {
    expect(cycleChip(SATURN_RETURN, TODAY)).toBe("Behind you");
    expect(cycleChip(SATURN_RETURN, "2020-12-01")).toBe("Happening now");
    expect(cycleChip(SATURN_RETURN, "2020-03-01")).toBe("Within a year");
    expect(cycleChip(SATURN_RETURN, "2019-12-01")).toBe("In 1 year");
    expect(cycleChip(JUPITER_RETURN, TODAY)).toBe("In 12 years");
  });
});

describe("a cycle's ages and dates", () => {
  it("heads a compact card with the ages it comes at, an even run of them by how often, or once", () => {
    expect(cycleAges(SATURN_RETURN)).toBe("At 29, 58 and 88");
    expect(seen(cycleAges(JUPITER_RETURN))).toBe("About every 12 years, from 11");
    expect(cycleAges(URANUS_OPPOSITION)).toBe("Once, at 44");
    expect(cycleAges({ ...SATURN_RETURN, ages: undefined })).toBe("At 29");
  });

  it("keeps the first age on the line with its 'from', so a narrow card never leaves it alone", () => {
    expect(cycleAges(JUPITER_RETURN)).toBe("About every 12 years, from 11");
    expect(cycleAges(JUPITER_RETURN)).not.toContain("from 11");
  });

  it("gives passes in one year that year once, and passes across years their own", () => {
    expect(seen(passList(["2021-01-19"], "dmy"))).toBe("19 Jan 2021");
    expect(seen(passList(["2035-08-16", "2035-12-28"], "dmy"))).toBe("16 Aug and 28 Dec 2035");
    expect(seen(passList(["2035-08-16", "2035-12-28"], "mdy"))).toBe("Aug 16 and Dec 28, 2035");
    expect(seen(passList(["2035-08-16", "2035-12-28"], "ymd"))).toBe("2035 Aug 16 and Dec 28");
    expect(seen(cycleDates(URANUS_OPPOSITION, "dmy"))).toBe("16 Aug 2035, 28 Dec 2035 and 2 Jun 2036");
  });

  it("falls back to its window when it never is exact, and puts the age after the dates", () => {
    expect(seen(cycleDates({ ...SATURN_RETURN, exact: [] }, "dmy"))).toBe("26 Apr 2020 to 4 Feb 2021");
    expect(seen(cycleFact(SATURN_RETURN, "dmy"))).toBe("19 Jan 2021 · age 29");
    expect(seen(cycleFact(SATURN_RETURN, "mdy"))).toBe("Jan 19, 2021 · age 29");
  });
});

describe("the look-back", () => {
  it("names the month and year of a cycle behind the reader, never a season (reading 19)", () => {
    expect(seen(lookBack(SATURN_RETURN, TODAY, "dmy"))).toBe("Think back to January 2021, when you were 29.");
    expect(seen(lookBack(SATURN_RETURN, TODAY, "ymd"))).toBe("Think back to 2021 January, when you were 29.");
  });

  it("looks back from a cycle to come, or one under way, to the time before", () => {
    expect(seen(lookBack(JUPITER_RETURN, TODAY, "dmy"))).toBe("Think back to July 2026, the last time it happened. You were 35.");
    const second = { ...SATURN_RETURN, age: 58, exact: ["2050-02-27"], start: "2049-05-07", end: "2050-03-14", last: { on: "2021-01-19", age: 29 } };
    expect(seen(lookBack(second, "2049-12-01", "mdy"))).toBe("Think back to January 2021, the last time it happened. You were 29.");
  });

  it("has none for a cycle that comes once, or one with nothing before it", () => {
    expect(lookBack(URANUS_OPPOSITION, TODAY, "dmy")).toBeNull();
    expect(lookBack({ ...URANUS_OPPOSITION, end: "2026-01-01" }, TODAY, "dmy")).toBeNull();
    expect(lookBack({ ...JUPITER_RETURN, last: null }, TODAY, "dmy")).toBeNull();
  });
});

describe("the ring", () => {
  it("starts at the left, where the mark's brass point sits, and runs anticlockwise like the zodiac", () => {
    expect(ringPoint(0, 50, 40)).toEqual([10, 50]);
    expect(ringPoint(0.25, 50, 40)).toEqual([50, 90]);
    expect(ringPoint(0.5, 50, 40)).toEqual([90, 50]);
    expect(ringPoint(0.75, 50, 40)).toEqual([50, 10]);
  });

  it("draws the arc it has come round, the long way past halfway, and a whole turn in two halves", () => {
    expect(ringArc(0, 50, 40)).toBe("");
    expect(ringArc(0.25, 50, 40)).toBe("M10 50A40 40 0 0 0 50 90");
    expect(ringArc(0.75, 50, 40)).toBe("M10 50A40 40 0 1 0 50 10");
    expect(ringArc(1, 50, 40)).toBe("M10 50A40 40 0 1 0 90 50A40 40 0 1 0 10 50");
    expect(ringArc(1.4, 50, 40)).toBe(ringArc(1, 50, 40));
  });

  it("marks where a cycle falls on the round: none for a return, which is the birth point", () => {
    expect(ringTarget(SATURN_RETURN)).toBeNull();
    expect(ringTarget({ id: "saturn-square", age: 7, angle: 90 })).toBe(0.25);
    expect(ringTarget({ id: "saturn-square", age: 22, angle: 270 })).toBe(0.75);
    expect(ringTarget({ id: "saturn-opposition", age: 44, angle: 540 })).toBe(0.5);
    expect(ringTarget({ id: "jupiter-return", age: 23, angle: 720 })).toBeNull();
  });

  it("knows each cycle's body by the engine's name for it", () => {
    expect((["node-return", "node-opposition", "saturn-square", "jupiter-return", "pluto-square"] as const).map(cycleBody)).toEqual([
      "north_node", "north_node", "saturn", "jupiter", "pluto",
    ]);
  });

  it("tells an opening square from a closing one by the age when no angle came with it", () => {
    expect(ringTarget({ id: "saturn-square", age: 7 })).toBe(0.25);
    expect(ringTarget({ id: "saturn-square", age: 22 })).toBe(0.75);
    expect(ringTarget({ id: "saturn-square", age: 36 })).toBe(0.25);
    expect(ringTarget({ id: "uranus-square", age: 63 })).toBe(0.75);
    expect(ringTarget({ id: "pluto-square", age: 45 })).toBe(0.25);
    expect(ringTarget({ id: "node-opposition", age: 9 })).toBe(0.5);
    expect(ringTarget({ id: "node-return", age: 18 })).toBeNull();
  });
});

/** A wave sampled monthly to 90, from a planet's travel since birth in degrees at each age. */
function waveOf(body: string, travel: (age: number) => number): WaveLine {
  const points = [];
  for (let m = 0; m <= 1080; m++) {
    const age = m / 12;
    const d = ((travel(age) % 360) + 360) % 360;
    points.push({ age, distance: Math.round((d > 180 ? 360 - d : d) * 100) / 100 });
  }
  return { body, points };
}

const SATURN_YEAR = 29.457;
const even = (age: number) => (360 * age) / SATURN_YEAR;
// A yearly wobble faster than Saturn's own motion makes it stand still and turn back once a year, as Saturn does.
const wobbling = (age: number) => even(age) + 6 * Math.sin(2 * Math.PI * age);
const floors = (line: WaveLine, kind: string) => waveMarks(line).filter((m) => m.kind === kind).map((m) => Math.floor(m.age));

describe("the waves", () => {
  it("lays age across and distance down: birth on the left, a return at the bottom, opposite at the top", () => {
    expect([waveX(0), waveX(45), waveX(90), waveX(120)]).toEqual([0, 50, 100, 100]);
    expect([waveY(180), waveY(90), waveY(0)]).toEqual([4, 50, 96]);
    const path = wavePath(waveOf("saturn", even).points);
    expect(path.startsWith("M0.0 96.0L")).toBe(true);
    expect(path.split("L")).toHaveLength(1081);
  });

  it("marks Saturn's returns, oppositions and quarter turns where the line meets them", () => {
    const line = waveOf("saturn", even);
    expect(floors(line, "return")).toEqual([29, 58, 88]);
    expect(floors(line, "opposition")).toEqual([14, 44, 73]);
    expect(floors(line, "square")).toEqual([7, 22, 36, 51, 66, 81]);
  });

  it("makes one mark of a passage a retrograde splits into three", () => {
    const line = waveOf("saturn", wobbling);
    expect(floors(line, "return")).toHaveLength(3);
    expect(floors(line, "opposition")).toHaveLength(3);
    expect(floors(line, "square")).toHaveLength(6);
  });

  it("marks only the cycles the doctrine names for each body", () => {
    expect(new Set(waveMarks(waveOf("jupiter", (a) => (360 * a) / 11.862)).map((m) => m.kind))).toEqual(new Set(["return", "opposition"]));
    expect(new Set(waveMarks(waveOf("neptune", (a) => (360 * a) / 164.79)).map((m) => m.kind))).toEqual(new Set(["square"]));
    expect(waveMarks(waveOf("venus", (a) => 360 * a))).toEqual([]);
  });

  it("says the marks in words, each age once, the nodes as more than one", () => {
    expect(waveSentence(waveOf("saturn", even))).toBe(
      "At 29, 58 and 88, Saturn comes back to where it was when you were born. At 14, 44 and 73, it is opposite that place. " +
        "At 7, 22, 36, 51, 66 and 81, it is a quarter turn from that place.",
    );
    expect(waveSentence(waveOf("north_node", (a) => (360 * a) / 18.613))).toMatch(
      /^At 18, 37, 55 and 74, the Moon's nodes come back to where they were when you were born\. At 9, 27, 46, 65 and 83, they are opposite that place\.$/,
    );
    expect(waveSentence(waveOf("neptune", (a) => (360 * a) / 164.79))).toBe(
      "At 41, Neptune is a quarter turn from where it was when you were born.",
    );
    expect(wavesLabel([waveOf("neptune", (a) => (360 * a) / 164.79)], 35.56)).toMatch(/You are 35 now\.$/);
  });

  it("labels every ten years along the top, leaving room for today's mark", () => {
    expect(waveTicks(35.56)).toEqual([0, 10, 20, 50, 60, 70, 80, 90]);
    expect(waveTicks(0)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(waveTicks(88)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80]);
  });

  it("uses the marks a line carries, in age order, over any found in its points", () => {
    const marks = [
      { age: 58.65, kind: "return" as const },
      { age: 29.85, kind: "return" as const },
      { age: 93, kind: "return" as const },
    ];
    expect(waveMarks({ ...waveOf("saturn", even), marks })).toEqual([marks[1], marks[0]]);
    expect(waveSentence({ ...waveOf("saturn", even), marks })).toBe("At 29 and 58, Saturn comes back to where it was when you were born.");
  });

  it("dates a cycle's mark by the engine's birthdays, so its whole years are the card's age", () => {
    const born = "1991-03-14T12:00:00.000Z";
    expect(cycleMark("saturn-return", "2021-01-19T05:00:00.000Z", born).age).toBeCloseTo(29.85, 2);
    expect(Math.floor(cycleMark("saturn-return", "2021-03-14T06:00:00.000Z", born).age)).toBe(29);
    expect(Math.floor(cycleMark("saturn-return", "2021-03-14T12:00:00.000Z", born).age)).toBe(30);
    expect(cycleMark("uranus-opposition", new Date("2035-08-16T00:00:00Z"), new Date(born)).kind).toBe("opposition");
  });

  // The wave ends at 90, so a passage astride it can show on one side and not the other: the check stops short of it.
  it("finds each of Mira's cycles on her waves within a year, and prints the engine's own ages from its dates", () => {
    const birth = noonOf("1991-03-14");
    const natal = noonLongitudes("1991-03-14");
    const all = lifeCycles(natal, birth);
    const lines = waves(natal, birth);
    expect(lines.map((line) => line.body)).toEqual(["jupiter", "saturn", "north_node", "uranus", "neptune", "pluto"]);
    for (const line of lines) {
      const theirs = all.filter((c) => c.body === line.body);
      const dated = theirs.map((c) => cycleMark(c.id, c.window.exact[0] ?? c.window.start, birth));
      const found = waveMarks(line).filter((m) => m.age < 89);
      const near = dated.filter((m) => m.age < 89);
      expect(found.length, line.body).toBe(near.length);
      for (const mark of found) {
        expect(near.some((m) => m.kind === mark.kind && Math.abs(m.age - mark.age) < 1), `${line.body} ${mark.kind} at ${mark.age}`).toBe(true);
      }
      const printed = waveMarks({ ...line, marks: dated }).map((m) => Math.floor(m.age));
      expect(printed, line.body).toEqual(theirs.filter((c) => c.age <= 90).map((c) => c.age).sort((a, b) => a - b));
    }
  }, 60_000);
});

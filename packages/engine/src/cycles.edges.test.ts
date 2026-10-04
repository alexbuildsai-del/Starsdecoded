/**
 * Life's cycles at their edges (R16-03, readings 5, 6, 21; ADR-208, 209): the span a search covers and what it leaves
 * out, a chart with a body missing, what a retrograde's passes must add up to, the finder's date parser, and the waves
 * at their shortest. `cycles.test.ts` holds every fixture to the orb and the age; `cycles.horizons.test.ts` pins five
 * birth dates to JPL Horizons.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { calculateNatalChart } from "./chartCalculation.js";
import {
  CYCLE_BODIES,
  KNOWN_AGES,
  ageAt,
  lifeCycles,
  natalLongitudes,
  noonLongitudes,
  noonOf,
  roundProgress,
  waves,
  type CycleId,
  type LifeCycle,
} from "./cycles.js";
import { CYCLE_WORDS } from "./plainWords.js";

interface Fixture {
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes?: number;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
}

const FIXTURES = ["charts", "sample-people"].flatMap((folder) =>
  readdirSync(new URL(`../../../fixtures/${folder}/`, import.meta.url))
    .filter((file) => file.endsWith(".json"))
    .map((file) => `${folder}/${file.slice(0, -".json".length)}`),
);

const lives = new Map<string, { birth: Date; natal: ReturnType<typeof natalLongitudes>; cycles: LifeCycle[] }>();
function lifeOf(name: string) {
  let life = lives.get(name);
  if (!life) {
    const f = JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;
    const chart = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);
    const natal = natalLongitudes(chart);
    const birth = new Date(chart.datetimeUtc);
    life = { birth, natal, cycles: lifeCycles(natal, birth) };
    lives.set(name, life);
  }
  return life;
}

const IDS = Object.keys(CYCLE_WORDS) as CycleId[];
const MIRA = lifeOf("sample-people/mira");

test("every kind of cycle the doctrine names turns up for somebody, and no other kind does", () => {
  const seen = new Set<string>();
  for (const name of FIXTURES) for (const cycle of lifeOf(name).cycles) seen.add(cycle.id);
  assert.deepEqual([...seen].sort(), [...IDS].sort());
});

test("a search that stops before the first window opens finds nothing: untilAge 0, a fraction of a year, a negative age", () => {
  for (const untilAge of [0, 0.25, 0.5, -1, -90]) assert.deepEqual(lifeCycles(MIRA.natal, MIRA.birth, { untilAge }), [], String(untilAge));
});

test("a longer search only adds later cycles: the first N years' cycles are the start of the whole life's", () => {
  const all = MIRA.cycles;
  let previous = 0;
  for (const untilAge of [15, 30, 45, 60, 75, 90]) {
    const some = lifeCycles(MIRA.natal, MIRA.birth, { untilAge });
    assert.ok(some.length >= previous, `${untilAge}: never fewer than a shorter search`);
    assert.deepEqual(some, all.slice(0, some.length), `${untilAge}: the same cycles in the same order`);
    previous = some.length;
  }
  assert.deepEqual(lifeCycles(MIRA.natal, MIRA.birth, { untilAge: 90 }), all, "90 is the default");
  assert.deepEqual(lifeCycles(MIRA.natal, MIRA.birth, { untilAge: 120 }).slice(0, all.length), all, "a longer life keeps the first 90 years");
});

test("a body the chart has no place for makes no cycle: no node, no Moon needed, an empty chart none", () => {
  const { natal, birth } = MIRA;
  assert.deepEqual(lifeCycles({}, birth), []);
  const noNode = { ...natal };
  delete noNode.north_node;
  const ids = new Set(lifeCycles(noNode, birth).map((c) => c.id));
  assert.ok(![...ids].some((id) => id.startsWith("node-")));
  assert.ok(ids.has("saturn-return") && ids.has("uranus-opposition"));
  // The inner planets and the Moon are not cycle bodies, so their places change nothing.
  const outer = Object.fromEntries(CYCLE_BODIES.map((b) => [b, natal[b]]));
  assert.deepEqual(lifeCycles(outer, birth), MIRA.cycles);
  assert.deepEqual(lifeCycles({ saturn: natal.saturn }, birth).map((c) => c.body), MIRA.cycles.filter((c) => c.body === "saturn").map((c) => c.body));
});

test("ids in any order, with repeats, give the same cycles in the same order as a search for them together", () => {
  const forward = lifeCycles(MIRA.natal, MIRA.birth, { ids: ["saturn-return", "uranus-square", "node-opposition"] });
  const backward = lifeCycles(MIRA.natal, MIRA.birth, { ids: ["node-opposition", "uranus-square", "saturn-return", "saturn-return"] });
  assert.deepEqual(backward, forward);
  assert.deepEqual(forward.map((c) => c.window.start.getTime()), [...forward.map((c) => c.window.start.getTime())].sort((a, b) => a - b), "oldest first");
  assert.deepEqual(forward, MIRA.cycles.filter((c) => ["saturn-return", "uranus-square", "node-opposition"].includes(c.id)));
});

test("a retrograde splits a passage into an odd number of passes, one for the node, and a passage is one cycle with its passes inside", () => {
  let three = 0;
  for (const name of FIXTURES) {
    for (const cycle of lifeCycles(lifeOf(name).natal, lifeOf(name).birth)) {
      const what = `${name} ${cycle.key}`;
      // A body that comes from one side of a point and ends on the other crosses it an odd number of times.
      assert.ok(cycle.passes % 2 === 1, `${what}: ${cycle.passes} passes`);
      if (cycle.body === "north_node") assert.equal(cycle.passes, 1, `${what}: the mean node never turns`);
      if (cycle.passes === 3) three++;
      assert.deepEqual(
        cycle.window.exact.map((d) => d.getTime()),
        [...cycle.window.exact.map((d) => d.getTime())].sort((a, b) => a - b),
        what,
      );
      assert.ok(cycle.window.exact.every((d) => d >= cycle.window.start && d <= cycle.window.end), what);
    }
  }
  assert.ok(three > 0, "some cycle on some fixture is a three-pass one");
});

test("keys are unique across a life, an age is whole years that never goes down for one kind, and Saturn's first return is near 29", () => {
  for (const name of FIXTURES) {
    const { cycles } = lifeOf(name);
    assert.equal(new Set(cycles.map((c) => c.key)).size, cycles.length, `${name}: keys`);
    for (const id of IDS) {
      const ages = cycles.filter((c) => c.id === id).map((c) => c.age);
      assert.deepEqual(ages, [...ages].sort((a, b) => a - b), `${name} ${id}`);
      assert.ok(ages.every(Number.isInteger), `${name} ${id}`);
    }
    const first = cycles.find((c) => c.id === "saturn-return")!;
    assert.ok(first.age >= 27 && first.age <= 31, `${name}: Saturn returns at ${first.age}`);
    assert.ok(cycles.every((c) => c.age >= 0 && c.age <= 91), name);
  }
});

test("the finder's date is a calendar date and only that: leap days by the real rule, no padding, no time, no other digits", () => {
  assert.equal(noonOf("2000-02-29").toISOString(), "2000-02-29T12:00:00.000Z", "2000 was a leap year");
  assert.equal(noonOf("2024-02-29").toISOString(), "2024-02-29T12:00:00.000Z");
  assert.equal(noonOf("1999-12-31").toISOString(), "1999-12-31T12:00:00.000Z");
  assert.equal(noonOf("0050-06-01").getUTCFullYear(), 50, "a year under 100 is not read as 19xx");
  for (const bad of [
    "1900-02-29", "2100-02-29", "2023-02-29", "1991-00-10", "1991-01-00", "1991-01-32", "1991-12-32", "1991-13-01", "1991-06-31",
    "", " ", "1991-03-14 ", " 1991-03-14", "1991-03-14\n", "1991-03-14T12:00:00Z", "1991-03-14T12:00", "91-03-14", "1991-3-14", "1991-03-4",
    "1991/03/14", "14-03-1991", "1991.03.14", "19910314", "+1991-03-14", "-1991-03-14", "１９９１-03-14", "abcd-ef-gh", "null", "undefined",
  ]) {
    assert.throws(() => noonOf(bad), RangeError, JSON.stringify(bad));
  }
  assert.throws(() => noonLongitudes("1991-02-30"), RangeError);
});

test("midday on any birth date gives six finite places in 0 to 360, the same on every call, for a date before 1950 too", () => {
  for (const ymd of ["1900-01-01", "1943-05-17", "1949-12-31", "2000-02-29", "2024-12-31"]) {
    const a = noonLongitudes(ymd);
    assert.deepEqual(Object.keys(a), [...CYCLE_BODIES], ymd);
    for (const body of CYCLE_BODIES) {
      assert.ok(Number.isFinite(a[body]) && a[body]! >= 0 && a[body]! < 360, `${ymd} ${body} ${a[body]}`);
    }
    assert.deepEqual(noonLongitudes(ymd), a);
    assert.ok(!("moon" in a) && !("sun" in a), "the fast bodies would not hold to the month");
  }
});

test("the finder gives a person born before 1950 the same four kinds of cycle, with Saturn's first return near 29", () => {
  const ids = KNOWN_AGES.map((a) => a.id);
  const cycles = lifeCycles(noonLongitudes("1943-05-17"), noonOf("1943-05-17"), { ids });
  assert.deepEqual([...new Set(cycles.map((c) => c.id))].sort(), [...ids].sort());
  const saturn = cycles.find((c) => c.id === "saturn-return")!;
  assert.ok(saturn.age >= 27 && saturn.age <= 31, String(saturn.age));
  assert.ok(cycles.every((c) => c.key.startsWith(`cycle.${c.id}.`)));
});

test("roundProgress stays in 0 to 1 over a whole life, and the node, which never turns, only ever gains", () => {
  const { natal, birth } = MIRA;
  for (const body of CYCLE_BODIES) {
    for (let year = 0; year <= 90; year += 3) {
      const progress = roundProgress(body, natal[body]!, new Date(birth.getTime() + year * 365.2425 * 86_400_000));
      assert.ok(progress >= 0 && progress < 1, `${body} at ${year}: ${progress}`);
    }
  }
  const node = [0, 2, 4, 6, 8, 10, 12, 14].map((year) => roundProgress("north_node", natal.north_node!, new Date(birth.getTime() + year * 365.2425 * 86_400_000)));
  node.forEach((p, i) => i > 0 && assert.ok(p > node[i - 1], `the node at ${i * 2} years`));
});

test("ageAt counts whole years, never rounds up a day short of a birthday, and is negative before birth", () => {
  const born = new Date("1991-03-14T07:40:00Z");
  assert.equal(ageAt(born, new Date("1991-03-14T07:39:59Z")), -1);
  assert.equal(ageAt(born, new Date("1992-03-14T07:39:59.999Z")), 0);
  assert.equal(ageAt(born, new Date("1992-03-14T07:40:00Z")), 1);
  assert.equal(ageAt(born, new Date("2081-03-14T07:40:00Z")), 90);
  assert.equal(ageAt(born, new Date("2081-03-14T07:39:59Z")), 89);
  assert.equal(ageAt(new Date("2000-12-31T23:59:00Z"), new Date("2001-01-01T00:00:00Z")), 0, "a new calendar year is not a birthday");
});

test("waves at their shortest and in the middle: a life of no length is a point at nought, half a year is seven months", () => {
  const { natal, birth } = MIRA;
  const none = waves(natal, birth, 0);
  assert.deepEqual(none.map((w) => w.body), [...CYCLE_BODIES]);
  for (const w of none) assert.deepEqual(w.points, [{ age: 0, distance: 0 }], w.body);
  const half = waves(natal, birth, 0.5);
  for (const w of half) {
    assert.equal(w.points.length, 7, w.body);
    assert.equal(w.points[6].age, 0.5);
    w.points.forEach((p, i) => assert.equal(p.age, Math.round((i / 12) * 1000) / 1000));
  }
  const full = waves(natal, birth);
  for (const w of full) {
    assert.equal(w.points.at(-1)!.age, 90, w.body);
    assert.ok(w.points.every((p) => Math.abs(p.distance * 100 - Math.round(p.distance * 100)) < 1e-6), `${w.body}: two decimals`);
  }
  assert.deepEqual(waves(natal, birth, 90), full, "90 is the default");
});

test("a wave is left out for a body the chart has no place for, and the Sun, Moon and inner planets are never waves", () => {
  const { natal, birth } = MIRA;
  const withoutSaturn = { ...natal };
  delete withoutSaturn.saturn;
  assert.deepEqual(waves(withoutSaturn, birth, 1).map((w) => w.body), CYCLE_BODIES.filter((b) => b !== "saturn"));
  assert.deepEqual(waves({}, birth, 1), []);
  assert.deepEqual(waves({ sun: 10, moon: 20, mercury: 30 }, birth, 1), []);
});

test("a wave's distance never leaves 0 to 180 and moves less than a body can in a month", () => {
  const top: Record<string, number> = { jupiter: 8, saturn: 4.5, north_node: 2, uranus: 2.2, neptune: 1.4, pluto: 1.5 };
  for (const w of waves(MIRA.natal, MIRA.birth)) {
    w.points.forEach((p, i) => {
      assert.ok(p.distance >= 0 && p.distance <= 180, `${w.body} ${i}`);
      if (i > 0) assert.ok(Math.abs(p.distance - w.points[i - 1].distance) <= top[w.body], `${w.body} jumps ${Math.abs(p.distance - w.points[i - 1].distance).toFixed(1)}° in a month at ${i}`);
    });
  }
});

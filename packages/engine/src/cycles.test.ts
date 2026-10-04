/**
 * Life's cycles on every fixture, birth to 90, held to what must be true of any chart: each exact pass on its point,
 * each window opening and closing at the orb, every passage counted once at the age its body's round gives, and the
 * finder's midday answer against the full chart's. No date the engine computes is typed here: the dates themselves
 * are pinned to NASA JPL Horizons in cycles.horizons.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { calculateNatalChart, hasHorizon, type NatalChartData } from "./chartCalculation.js";
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
  type NatalLongitudes,
} from "./cycles.js";
import { DOCTRINE } from "./doctrine.js";
import { longitudeAt, type SkyBody } from "./transits.js";

interface Fixture {
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes?: number;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
}

const DAY_MS = 86_400_000;
const YEAR_MS = 365.2425 * DAY_MS;
const FINDER_IDS = KNOWN_AGES.map((age) => age.id);
const FIXTURES = ["charts", "sample-people"].flatMap((folder) =>
  readdirSync(new URL(`../../../fixtures/${folder}/`, import.meta.url))
    .filter((file) => file.endsWith(".json"))
    .map((file) => `${folder}/${file.slice(0, -".json".length)}`),
);

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;

interface Life {
  chart: NatalChartData;
  natal: NatalLongitudes;
  birth: Date;
  cycles: LifeCycle[];
}

const lives = new Map<string, Life>();
function lifeOf(name: string): Life {
  let life = lives.get(name);
  if (!life) {
    const f = fixture(name);
    const chart = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);
    const natal = natalLongitudes(chart);
    const birth = new Date(chart.datetimeUtc);
    life = { chart, natal, birth, cycles: lifeCycles(natal, birth) };
    lives.set(name, life);
  }
  return life;
}

const arc = (deg: number): number => ((((deg + 180) % 360) + 360) % 360) - 180;
const kindOf = (id: CycleId) => (id.endsWith("-return") ? "return" : id.endsWith("-opposition") ? "opposition" : "square");
const orbOf = (body: SkyBody): number => (body === "north_node" ? 1 : DOCTRINE.orbs[body as keyof typeof DOCTRINE.orbs]);
const pointOf = (life: Life, cycle: LifeCycle): number =>
  life.natal[cycle.body]! + (cycle.body === "north_node" ? -1 : 1) * cycle.angle;
const yearsTo = (birth: Date, at: Date): number => (at.getTime() - birth.getTime()) / YEAR_MS;
const firstOf = (cycle: LifeCycle): Date => cycle.window.exact[0] ?? cycle.window.start;

// First in the file, so the finder's first answer is timed before anything else has warmed the engine.
test("the finder's four cycles from a birth date take under 250 ms, the fastest of three", () => {
  const ms: number[] = [];
  for (let run = 0; run < 3; run++) {
    const t = performance.now();
    lifeCycles(noonLongitudes("1991-03-14"), noonOf("1991-03-14"), { ids: FINDER_IDS });
    ms.push(performance.now() - t);
  }
  assert.ok(Math.min(...ms) < 250, `runs took ${ms.map((m) => m.toFixed(0)).join(", ")} ms`);
});

test("every exact pass stands on its point, and every window opens and closes at the orb, for every fixture", () => {
  for (const name of FIXTURES) {
    const life = lifeOf(name);
    assert.ok(life.cycles.length > 0, name);
    for (const cycle of life.cycles) {
      const { start, end, exact } = cycle.window;
      const point = pointOf(life, cycle);
      const what = `${name} ${cycle.key}`;
      assert.ok(cycle.passes >= 1 && cycle.passes === exact.length, `${what}: passes`);
      const times = [start, ...exact, end].map((d) => d.getTime());
      assert.ok(times.every((t, i) => i === 0 || t >= times[i - 1]), `${what}: in order`);
      for (const at of exact) assert.ok(Math.abs(arc(longitudeAt(cycle.body, at) - point)) < 0.001, `${what}: exact on ${at.toISOString()}`);
      for (const at of [start, end]) {
        const off = Math.abs(arc(longitudeAt(cycle.body, at) - point));
        assert.ok(Math.abs(off - orbOf(cycle.body)) < 0.001, `${what}: ${off}° at an edge, not the orb`);
      }
    }
  }
});

test("each key names the first exact day, each age is whole years to it, and each kind sits at its own angle", () => {
  const once = new Set<CycleId>(["uranus-return", "uranus-opposition", "neptune-square", "pluto-square"]);
  for (const name of FIXTURES) {
    const life = lifeOf(name);
    const limit = new Date(life.birth.getTime());
    limit.setUTCFullYear(limit.getUTCFullYear() + 90);
    life.cycles.forEach((cycle, i) => {
      const what = `${name} ${cycle.key}`;
      const day = firstOf(cycle).toISOString().slice(0, 10).replace(/-/g, "");
      assert.equal(cycle.key, `cycle.${cycle.id}.${day}`, what);
      assert.match(cycle.key, /^[a-z0-9.-]{1,80}$/, what);
      assert.equal(cycle.age, ageAt(life.birth, firstOf(cycle)), what);
      assert.ok(cycle.id.startsWith(cycle.body === "north_node" ? "node-" : `${cycle.body}-`), what);
      assert.equal(cycle.repeats, !once.has(cycle.id), what);
      const kind = kindOf(cycle.id);
      const turn = cycle.angle % 360;
      assert.ok(kind === "return" ? turn === 0 && cycle.angle >= 360 : kind === "opposition" ? turn === 180 : turn === 90 || turn === 270, what);
      assert.ok(cycle.window.start.getTime() <= limit.getTime(), `${what}: opens after 90`);
      if (i > 0) assert.ok(cycle.window.start >= life.cycles[i - 1].window.start, `${what}: out of order`);
    });
  }
});

test("every passage is counted once, at the age its body's round gives", () => {
  const period: Record<string, number> = { jupiter: 11.86, saturn: 29.46, north_node: 18.61 };
  for (const name of FIXTURES) {
    const life = lifeOf(name);
    const of = (id: CycleId) => life.cycles.filter((cycle) => cycle.id === id);
    for (const id of new Set(life.cycles.map((cycle) => cycle.id))) {
      const step = kindOf(id) === "square" ? 180 : 360;
      const first = kindOf(id) === "return" ? 360 : kindOf(id) === "opposition" ? 180 : 90;
      assert.deepEqual(of(id).map((cycle) => cycle.angle), of(id).map((_, n) => first + n * step), `${name} ${id}: a passage missed or split`);
    }
    // A return comes a whole round after the last; Saturn's first at about 29, the node's every 18.6 years exactly.
    for (const [id, body, slack] of [["jupiter-return", "jupiter", 0.75], ["saturn-return", "saturn", 1], ["node-return", "north_node", 0.01]] as const) {
      const ages = of(id).map((cycle) => yearsTo(life.birth, firstOf(cycle)));
      ages.forEach((age, n) => assert.ok(Math.abs(age - (n + 1) * period[body]) <= (n + 1) * slack + 0.5, `${name} ${id} ${n + 1} at ${age.toFixed(2)}`));
    }
    assert.equal(of("uranus-opposition").length, 1, `${name}: the Uranus opposition comes once`);
    const uranus = yearsTo(life.birth, firstOf(of("uranus-opposition")[0]));
    assert.ok(uranus >= 37 && uranus <= 46, `${name}: Uranus opposite at ${uranus.toFixed(1)}, not in the early forties`);
    assert.equal(of("uranus-square").length, 2, `${name}: Uranus squares twice by 90`);
    assert.equal(of("neptune-square").length, 1, `${name}: Neptune squares once by 90`);
  }
});

test("a passage a retrograde splits is one cycle, every pass inside one window", () => {
  const split = FIXTURES.flatMap((name) => lifeOf(name).cycles.filter((cycle) => cycle.passes === 3));
  assert.ok(split.some((cycle) => cycle.id === "saturn-return"), "some fixture has a three-pass Saturn return");
  for (const name of FIXTURES) {
    const { cycles } = lifeOf(name);
    for (const a of cycles) {
      for (const b of cycles) {
        if (a === b || a.id !== b.id) continue;
        assert.ok(a.window.end < b.window.start || b.window.end < a.window.start, `${name}: ${a.key} and ${b.key} overlap`);
      }
    }
  }
});

test("ids limits the search, and untilAge the span, each window still whole past it", () => {
  const { natal, birth, cycles } = lifeOf("sample-people/mira");
  const ids: CycleId[] = ["saturn-return", "node-return"];
  assert.deepEqual(lifeCycles(natal, birth, { ids }), cycles.filter((cycle) => ids.includes(cycle.id)));
  assert.deepEqual(lifeCycles(natal, birth, { ids: [] }), []);
  assert.deepEqual(lifeCycles(natal, birth, { ids: ["saturn-return", "saturn-return"] }), lifeCycles(natal, birth, { ids: ["saturn-return"] }));
  let straddled = 0;
  for (const untilAge of [29, 44, 60]) {
    const limit = new Date(birth.getTime());
    limit.setUTCFullYear(limit.getUTCFullYear() + untilAge);
    const kept = cycles.filter((cycle) => cycle.window.start <= limit);
    assert.deepEqual(lifeCycles(natal, birth, { untilAge }), kept, `until ${untilAge}`);
    straddled += kept.filter((cycle) => cycle.window.end > limit).length;
  }
  assert.ok(straddled > 0, "a window open at one of the limits ran on whole");
});

test("without a birth time the cycles are the same and the natal Moon is left out (R-4.6)", () => {
  const timed = lifeOf("charts/marie-curie");
  const blind = lifeOf("charts/marie-curie-unknown");
  assert.equal(hasHorizon(blind.chart), false);
  assert.deepEqual(blind.cycles, timed.cycles);
  assert.equal(blind.natal.moon, undefined);
  assert.equal(typeof timed.natal.moon, "number");
});

test("natalLongitudes is the chart's own place for every body, to the hundredth it stores", () => {
  for (const name of FIXTURES) {
    const { chart, natal } = lifeOf(name);
    for (const [body, lon] of Object.entries(natal) as Array<[SkyBody, number]>) {
      assert.ok(Math.abs(arc(lon - chart.planets[body].absoluteDegree)) <= 0.006, `${name} ${body}`);
    }
    assert.equal(Object.keys(natal).length, hasHorizon(chart) ? 11 : 10, name);
  }
});

test("the finder, from midday on the birth date, matches the full chart's four cycles to the month for every fixture", () => {
  for (const name of FIXTURES) {
    const full = lifeOf(name).cycles.filter((cycle) => FINDER_IDS.includes(cycle.id));
    const { birthDate } = fixture(name);
    const noon = lifeCycles(noonLongitudes(birthDate), noonOf(birthDate), { ids: FINDER_IDS });
    assert.equal(noon.length, full.length, name);
    noon.forEach((cycle, i) => {
      const what = `${name} ${full[i].key}`;
      assert.equal(cycle.id, full[i].id, what);
      assert.equal(cycle.passes, full[i].passes, what);
      cycle.window.exact.forEach((at, k) => {
        const days = Math.abs(at.getTime() - full[i].window.exact[k].getTime()) / DAY_MS;
        assert.ok(days <= 31, `${what}: pass ${k + 1} is ${days.toFixed(1)} days off`);
      });
    });
  }
});

test("the known ages are the four Life opens on, each with its label", () => {
  assert.deepEqual(KNOWN_AGES, [
    { id: "saturn-return", body: "saturn", label: "29" },
    { id: "jupiter-return", body: "jupiter", label: "every 12" },
    { id: "node-return", body: "north_node", label: "19 · 37" },
    { id: "uranus-opposition", body: "uranus", label: "early 40s" },
  ]);
  const { cycles } = lifeOf("sample-people/mira");
  for (const { id, body } of KNOWN_AGES) assert.ok(cycles.some((cycle) => cycle.id === id && cycle.body === body), id);
});

test("noonOf takes a calendar date only, and noonLongitudes gives the six cycle bodies there", () => {
  assert.equal(noonOf("1991-03-14").toISOString(), "1991-03-14T12:00:00.000Z");
  assert.equal(noonOf("2000-02-29").toISOString(), "2000-02-29T12:00:00.000Z");
  assert.equal(noonOf("0999-12-31").getUTCFullYear(), 999);
  for (const bad of ["1991-02-29", "1991-13-01", "1991-04-31", "1991-3-14", "14/03/1991", ""]) {
    assert.throws(() => noonOf(bad), RangeError, bad);
  }
  const noon = noonLongitudes("1991-03-14");
  assert.deepEqual(Object.keys(noon), [...CYCLE_BODIES]);
  for (const body of CYCLE_BODIES) assert.equal(noon[body], longitudeAt(body, noonOf("1991-03-14")), body);
});

test("roundProgress starts at nought, is half at an opposition, and counts the node backwards", () => {
  const life = lifeOf("sample-people/mira");
  for (const body of CYCLE_BODIES) assert.ok(roundProgress(body, life.natal[body]!, life.birth) < 1e-9, body);
  for (const cycle of life.cycles.filter((c) => kindOf(c.id) === "opposition")) {
    for (const at of cycle.window.exact) assert.ok(Math.abs(roundProgress(cycle.body, life.natal[cycle.body]!, at) - 0.5) < 1e-4, cycle.key);
  }
  // The mean node goes back 19.34° a year, so a year on it is that far round.
  const year = roundProgress("north_node", life.natal.north_node!, new Date(life.birth.getTime() + YEAR_MS));
  assert.ok(Math.abs(year - 19.34 / 360) < 0.0005, String(year));
});

test("ageAt counts a birthday from the hour of birth, and a leap-day birthday on 1 March", () => {
  const born = new Date("1991-03-14T07:40:00Z");
  assert.equal(ageAt(born, new Date("2020-03-14T07:39:00Z")), 28);
  assert.equal(ageAt(born, new Date("2020-03-14T07:40:00Z")), 29);
  assert.equal(ageAt(born, born), 0);
  const leap = new Date("2000-02-29T12:00:00Z");
  assert.equal(ageAt(leap, new Date("2001-02-28T12:00:00Z")), 0);
  assert.equal(ageAt(leap, new Date("2001-03-01T12:00:00Z")), 1);
  assert.equal(ageAt(leap, new Date("2004-02-29T12:00:00Z")), 4);
});

test("waves: each body's monthly distance from its birth place, nought at a return, near 180 at an opposition", () => {
  const life = lifeOf("sample-people/mira");
  const all = waves(life.natal, life.birth);
  assert.deepEqual(all.map((wave) => wave.body), [...CYCLE_BODIES]);
  for (const wave of all) {
    assert.equal(wave.points.length, 90 * 12 + 1, wave.body);
    wave.points.forEach((point, m) => {
      assert.equal(point.age, Math.round((m / 12) * 1000) / 1000, wave.body);
      assert.ok(point.distance >= 0 && point.distance <= 180, wave.body);
    });
    assert.equal(wave.points[0].distance, 0, wave.body);
  }
  const saturn = all.find((wave) => wave.body === "saturn")!.points;
  const at = (cycle: LifeCycle) => saturn[Math.round(yearsTo(life.birth, firstOf(cycle)) * 12)].distance;
  // Saturn moves under 4.2° a month, so the month nearest an exact pass is within about 2° of it.
  for (const cycle of life.cycles.filter((c) => c.id === "saturn-return")) assert.ok(at(cycle) <= 2.5, cycle.key);
  for (const cycle of life.cycles.filter((c) => c.id === "saturn-opposition")) assert.ok(at(cycle) >= 177.5, cycle.key);
  assert.equal(waves(life.natal, life.birth, 30)[0].points.length, 30 * 12 + 1);
  const blind = lifeOf("charts/marie-curie-unknown");
  assert.equal(waves(blind.natal, blind.birth, 1).length, CYCLE_BODIES.length);
});

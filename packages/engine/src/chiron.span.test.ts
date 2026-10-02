/**
 * What chiron.test.ts leaves between its pins: every node, the interpolation across the whole span, the retrograde
 * turns, the span's two ends, and a chart's own instant at those ends (ADR-221, R14-02 reading 4). The checks are
 * properties of a body that moves smoothly and turns about once a year, so they hold whatever the table holds.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHIRON_SPAN, chironAt } from "./chiron.js";
import { CHIRON_TABLE } from "./chironTable.js";
import { calculateNatalChart } from "./chartCalculation.js";

const DAY = 86_400_000;
const FROM = Date.parse(`${CHIRON_SPAN.from}T00:00:00Z`);
const TO = Date.parse(`${CHIRON_SPAN.to}T00:00:00Z`);
const wrap = (degrees: number) => ((((degrees + 540) % 360) + 360) % 360) - 180;
const at = (ms: number) => chironAt(new Date(ms))!;

test("every node of the table is its own instant's longitude, exactly, as a thousandth of a degree", () => {
  // Decoded here from the table's own fields, never through chiron.ts.
  const { first, firstStep, secondDifferences, perDegree, stepDays } = CHIRON_TABLE;
  const values = [first, first + firstStep];
  let step = firstStep;
  for (const second of secondDifferences) {
    step += second;
    values.push(values[values.length - 1] + step);
  }
  const turn = 360 * perDegree;
  let checked = 0;
  values.forEach((value, k) => {
    const ms = FROM + k * stepDays * DAY;
    if (ms > TO) return;
    assert.equal(chironAt(new Date(ms))!.lon, (((value % turn) + turn) % turn) / perDegree, `node ${k}`);
    checked++;
  });
  assert.ok(checked > 12_000, `${checked} nodes inside the span`);
});

test("the unwrapped table never jumps: a step of ten days is a fraction of a degree, so no node was wrapped twice", () => {
  const { firstStep, secondDifferences, perDegree } = CHIRON_TABLE;
  let step = firstStep;
  let worst = Math.abs(firstStep);
  for (const second of secondDifferences) {
    step += second;
    worst = Math.max(worst, Math.abs(step));
  }
  assert.ok(worst / perDegree < 1.5, `the largest step in ten days is ${worst / perDegree} degrees`);
});

test("longitude stays in [0, 360) and speed is finite at every day from the first to the last of the span", () => {
  for (let ms = FROM; ms <= TO; ms += DAY) {
    const { lon, speed } = at(ms);
    assert.ok(lon >= 0 && lon < 360, `${new Date(ms).toISOString()}: lon ${lon}`);
    assert.ok(Number.isFinite(speed), `${new Date(ms).toISOString()}: speed ${speed}`);
  }
});

test("the cubic is continuous across every node, in longitude to a billionth of a degree and in speed to a thousandth", () => {
  const nodes = CHIRON_TABLE.secondDifferences.length + 2;
  for (let k = 1; k < nodes - 1; k++) {
    const ms = FROM + k * CHIRON_TABLE.stepDays * DAY;
    if (ms > TO) break;
    const before = at(ms - 1);
    const here = at(ms);
    assert.ok(Math.abs(wrap(here.lon - before.lon)) < 1e-6, `longitude jumps at node ${k}`);
    assert.ok(Math.abs(here.speed - before.speed) < 0.002, `speed jumps at node ${k}: ${before.speed} to ${here.speed}`);
  }
});

test("the speed is the longitude's own rate: a day's movement agrees with it at every day, retrograde or not", () => {
  for (let ms = FROM + DAY; ms < TO - DAY; ms += DAY) {
    const moved = wrap(at(ms + DAY / 2).lon - at(ms - DAY / 2).lon);
    const { speed } = at(ms);
    assert.ok(Math.abs(moved - speed) < 0.002, `${new Date(ms).toISOString()}: moved ${moved}, speed ${speed}`);
    assert.ok(Math.abs(moved) < 0.2, `${new Date(ms).toISOString()}: ${moved} degrees in a day`);
  }
});

test("Chiron turns about twice a year: each retrograde lasts four to six months, and at a turn it all but stands still", () => {
  let previous = at(FROM).speed;
  let retrogradeFrom: number | null = previous < 0 ? FROM : null;
  const lengths: number[] = [];
  let turns = 0;
  for (let ms = FROM + DAY; ms <= TO; ms += DAY) {
    const { speed } = at(ms);
    if (Math.sign(speed) !== Math.sign(previous)) {
      turns++;
      assert.ok(Math.abs(speed) < 0.01 && Math.abs(previous) < 0.01, `${new Date(ms).toISOString()}: turns at ${previous} then ${speed}`);
      if (speed < 0) retrogradeFrom = ms;
      else if (retrogradeFrom !== null) {
        lengths.push((ms - retrogradeFrom) / DAY);
        retrogradeFrom = null;
      }
    }
    previous = speed;
  }
  assert.ok(turns >= 680 && turns <= 700, `${turns} turns in 350 years`);
  assert.ok(lengths.length >= 335 && lengths.length <= 350, `${lengths.length} retrograde periods`);
  for (const days of lengths) assert.ok(days >= 100 && days <= 200, `a retrograde of ${days} days`);
});

test("a chart's retrograde flag is the table's own sign of the speed, on the day either side of a station too", () => {
  let station: number | null = null;
  for (let ms = Date.parse("1990-01-01T00:00:00Z"); ms < Date.parse("1991-01-01T00:00:00Z"); ms += DAY) {
    if (Math.sign(at(ms).speed) !== Math.sign(at(ms - DAY).speed)) {
      station = ms;
      break;
    }
  }
  assert.ok(station !== null, "1990 holds a station");
  for (let offset = -20; offset <= 20; offset++) {
    const ms = station! + offset * DAY;
    const date = new Date(ms).toISOString().slice(0, 10);
    const chart = calculateNatalChart(date, "00:00", 51.4779, 0, 0);
    assert.equal(chart.planets.chiron.retrograde, at(ms).speed < 0, date);
    // The chart rounds the speed to a thousandth, which never turns a retrograde Chiron direct nor the reverse.
    if (chart.planets.chiron.retrograde) assert.ok(chart.planets.chiron.speed <= 0, date);
    else assert.ok(chart.planets.chiron.speed >= 0, date);
  }
});

test("the first and last instants of the span are as smooth as any other: no extrapolation at either end", () => {
  assert.ok(Math.abs(wrap(at(FROM + DAY).lon - at(FROM).lon)) < 0.2);
  assert.ok(Math.abs(wrap(at(TO).lon - at(TO - DAY).lon)) < 0.2);
  assert.ok(Math.abs(at(FROM).speed - at(FROM + 1).speed) < 0.001);
  assert.ok(Math.abs(at(TO).speed - at(TO - 1).speed) < 0.001);
  assert.ok(Math.abs(wrap(at(FROM + 1).lon - at(FROM).lon)) < 1e-5, "one millisecond moves it no further than its speed says");
});

test("a Date past what a Date can hold, or no date at all, has no Chiron", () => {
  assert.equal(chironAt(new Date(8.64e15 + 1)), null);
  assert.equal(chironAt(new Date("not a date")), null);
  assert.equal(chironAt(new Date(-8.64e15)), null);
});

// The instant that matters is the birth's own, in UT: a local midnight an hour east of Greenwich is the evening before.
test("a chart takes the span at its UT instant, not the birth's calendar day", () => {
  const has = (date: string, time: string, offset: number) => "chiron" in calculateNatalChart(date, time, 51.4779, 0, offset).planets;
  assert.equal(has("1800-01-01", "00:30", 1), false, "23:30 UT on 1799-12-31");
  assert.equal(has("1799-12-31", "23:30", -1), true, "00:30 UT on 1800-01-01");
  assert.equal(has("1800-01-01", "00:00", 0), true, "the span's first instant");
  assert.equal(has("1799-12-31", "23:59", 0), false);
  assert.equal(has("2149-12-31", "23:59", 0), true);
  assert.equal(has("2149-12-31", "23:00", -1), true, "00:00 UT on 2150-01-01, the span's last instant");
  assert.equal(has("2150-01-01", "00:01", 0), false);
});

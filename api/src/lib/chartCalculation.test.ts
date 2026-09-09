/**
 * Ephemeris regression tests. The pinned values were verified independently
 * against Meeus (Astronomical Algorithms) during the September 2026 engine
 * audit, so a change here means the engine drifted, not the test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNatalChart } from "./chartCalculation.js";
import { chartFromFixture } from "./testFixtures.js";

const near = (actual: number, expected: number, tol: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: expected ${expected} ± ${tol}, got ${actual}`);

test("March 2000 equinox: Sun at 0° Aries", () => {
  const c = calculateNatalChart("2000-03-20", "07:35", 0, 0, 0);
  const lon = c.planets.sun.absoluteDegree % 360;
  near(Math.min(lon, 360 - lon), 0, 0.05, "Sun longitude");
});

test("Marie Curie, Warsaw 1867-11-07 12:00 LMT: angles and nodes match Meeus", () => {
  const c = chartFromFixture("marie-curie");
  assert.equal(c.angles.ascendant.sign, "Capricorn");
  near(c.angles.ascendant.degree, 12.1, 0.15, "Ascendant degree");
  assert.equal(c.angles.midheaven.sign, "Scorpio");
  near(c.angles.midheaven.degree, 18.6, 0.15, "MC degree");
  assert.equal(c.planets.north_node.sign, "Virgo");
  near(c.planets.north_node.degree, 11.0, 0.15, "North Node degree");
  assert.equal(c.planets.sun.sign, "Scorpio");
  near(c.planets.sun.degree, 14.5, 0.15, "Sun degree");
  assert.equal(c.planets.moon.sign, "Pisces");
  near(c.planets.moon.degree, 16.5, 0.3, "Moon degree");
});

test("Marie Curie: whole-sign houses from Capricorn rising", () => {
  const c = chartFromFixture("marie-curie");
  assert.equal(c.houses["1"].sign, "Capricorn");
  assert.equal(c.houses["10"].sign, "Libra");
  assert.equal(c.houses["11"].sign, "Scorpio");
  for (const p of ["sun", "venus", "mars", "saturn"]) {
    assert.equal(c.planets[p].house, 11, `${p} should be in the 11th`);
  }
  assert.equal(c.planets.moon.house, 3);
  assert.equal(c.planets.north_node.house, 9);
});

test("Synthetic day and night fixtures put the Sun where expected", () => {
  const day = chartFromFixture("day-angular");
  const night = chartFromFixture("night-angular");
  assert.equal(day.planets.sun.house, 10);
  assert.equal(night.planets.sun.house, 4);
  assert.ok(day.sunAltitude > 40, `day altitude ${day.sunAltitude}`);
  assert.ok(night.sunAltitude < -40, `night altitude ${night.sunAltitude}`);
});

test("Sun altitude: Marie Curie at noon in November in Warsaw is about 20 degrees up", () => {
  const c = chartFromFixture("marie-curie");
  assert.ok(c.sunAltitude > 15 && c.sunAltitude < 25, `altitude ${c.sunAltitude}`);
  assert.equal(c.chartVersion, 2);
});

test("Whole-sign houses are latitude-independent: Reykjavik has twelve 30° houses", () => {
  const c = chartFromFixture("high-latitude");
  for (let i = 1; i <= 12; i++) assert.equal(c.houses[String(i)].degree, 0);
  const first = c.houses["1"].sign;
  assert.equal(c.angles.ascendant.sign, first);
});

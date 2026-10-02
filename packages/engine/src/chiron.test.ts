/**
 * Chiron against NASA JPL Horizons itself (ADR-221). The longitudes and speeds below are Horizons's own
 * answers, fetched 2026-10-02 (COMMAND 2060, CENTER 500@399, QUANTITIES 31, UT), never the engine's output
 * copied back, so a failure means the table or its reading moved, not the sky.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHIRON_SPAN, chironAt } from "./chiron.js";
import { CHIRON_TABLE } from "./chironTable.js";

const at = (iso: string) => new Date(iso);
const near = (actual: number, expected: number, tol: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: expected ${expected} ± ${tol}, got ${actual}`);

test("the five Horizons instants, within 0.05°", () => {
  const pins: Array<[string, number]> = [
    ["1929-05-04T02:00:00Z", 40.0382],
    ["1867-11-07T10:36:00Z", 352.3275],
    ["1987-12-30T04:30:00Z", 85.2601],
    ["1990-01-01T12:00:00Z", 103.8132],
    ["2025-06-15T00:00:00Z", 26.2791],
  ];
  for (const [iso, lon] of pins) near(chironAt(at(iso))!.lon, lon, 0.05, iso);
});

test("a node's own instant gives Horizons's value to the table's thousandth, exactly", () => {
  assert.equal(chironAt(at("1800-01-01T00:00:00Z"))!.lon, 231.261);
  assert.equal(chironAt(at("1964-04-11T00:00:00Z"))!.lon, 346.67);
  assert.equal(chironAt(at("2149-12-27T00:00:00Z"))!.lon, 247.761);
});

test("the table starts on the span's first day, every 10 days, and its last node lies past the span's end", () => {
  assert.equal(CHIRON_TABLE.start, CHIRON_SPAN.from);
  assert.equal(CHIRON_TABLE.stepDays, 10);
  const nodes = CHIRON_TABLE.secondDifferences.length + 2;
  const last = Date.parse(`${CHIRON_TABLE.start}T00:00:00Z`) + (nodes - 1) * CHIRON_TABLE.stepDays * 86_400_000;
  assert.equal(new Date(last).toISOString().slice(0, 10), "2150-01-06");
  assert.ok(last >= Date.parse(`${CHIRON_SPAN.to}T00:00:00Z`));
});

test("between nodes the cubic holds Horizons to a thousandth of a degree, at its worst midpoint too", () => {
  // 2093-03-30 is the midpoint where the cubic strays furthest from Horizons across the whole table.
  near(chironAt(at("2093-03-30T00:00:00Z"))!.lon, 126.0052389, 0.001, "2093-03-30");
  near(chironAt(at("1929-05-10T00:00:00Z"))!.lon, 40.4194113, 0.001, "1929-05-10");
});

test("speed comes from the table, signed: retrograde in January 1990, direct in June 2025", () => {
  const retrograde = chironAt(at("1990-01-01T12:00:00Z"))!;
  near(retrograde.speed, -0.068473, 0.001, "1990-01-01 speed");
  const direct = chironAt(at("2025-06-15T00:00:00Z"))!;
  near(direct.speed, 0.037055, 0.001, "2025-06-15 speed");
});

test("outside 1800 to 2150 there is no Chiron, and both ends of the span have one", () => {
  assert.deepEqual(CHIRON_SPAN, { from: "1800-01-01", to: "2150-01-01" });
  assert.equal(chironAt(at("1799-12-31T23:59:59.999Z")), null);
  assert.ok(chironAt(at("1800-01-01T00:00:00Z")));
  assert.ok(chironAt(at("2150-01-01T00:00:00Z")));
  assert.equal(chironAt(at("2150-01-01T00:00:00.001Z")), null);
  assert.equal(chironAt(at("1799-06-15T12:00:00Z")), null);
  assert.equal(chironAt(at("2151-06-15T12:00:00Z")), null);
  assert.equal(chironAt(new Date(Number.NaN)), null);
});

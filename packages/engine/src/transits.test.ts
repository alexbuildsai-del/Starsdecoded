/**
 * The sky search on its own terms (ADR-208, 251): a chart's own places, every instant to the minute, windows whole
 * whatever range finds them, and passes a retrograde splits kept as one passage. transits.horizons.test.ts holds the
 * same functions to NASA JPL Horizons.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as AstronomyModule from "astronomy-engine";
import { calculateNatalChart, hasHorizon, type NatalChartData } from "./chartCalculation.js";
import {
  SKY_BODIES,
  eclipses,
  exactHits,
  inOrb,
  ingresses,
  longitudeAt,
  speedAt,
  stations,
  type SkyBody,
} from "./transits.js";

const Astronomy: typeof AstronomyModule =
  (AstronomyModule as unknown as { default?: typeof AstronomyModule }).default ?? AstronomyModule;

interface Fixture {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
  birthTimeWindowMinutes?: number;
}

const FIXTURES = new URL("../../../fixtures/", import.meta.url);

function fixtures(): Array<[string, Fixture]> {
  return ["charts", "sample-people"].flatMap((dir) =>
    readdirSync(new URL(`${dir}/`, FIXTURES))
      .filter((file) => file.endsWith(".json"))
      .map((file): [string, Fixture] => [
        `${dir}/${file.slice(0, -5)}`,
        JSON.parse(readFileSync(new URL(`${dir}/${file}`, FIXTURES), "utf8")) as Fixture,
      ]),
  );
}

function chartOf(f: Fixture): NatalChartData {
  const zone = f.timezone ?? f.timezoneOffset;
  return calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, zone, f.birthTimeWindowMinutes ?? 0);
}

const DAY_MS = 86_400_000;
const at = (iso: string): Date => new Date(iso);
const later = (d: Date, days: number): Date => new Date(d.getTime() + days * DAY_MS);
const arc = (deg: number): number => ((((deg + 180) % 360) + 360) % 360) - 180;
const dayOf = (d: Date): string => d.toISOString().slice(0, 10);
const isos = (list: Date[]): string[] => list.map((d) => d.toISOString());
/** How far a body is from a point at an instant, against how far it moves in a minute there. */
const minutesOff = (body: SkyBody, target: number, when: Date): number =>
  Math.abs(arc(longitudeAt(body, when) - target)) / (Math.abs(speedAt(body, when)) / 1440);

test("every body of every fixture is where its chart puts it at birth, within 0.01°, the mean node too", () => {
  const all = fixtures();
  assert.ok(all.length >= 20, `${all.length} fixtures`);
  for (const [name, f] of all) {
    const chart = chartOf(f);
    const birth = new Date(chart.datetimeUtc);
    for (const body of SKY_BODIES) {
      const off = Math.abs(arc(longitudeAt(body, birth) - chart.planets[body].absoluteDegree));
      assert.ok(off <= 0.01, `${name} ${body}: ${off.toFixed(4)}° from its chart`);
    }
  }
});

test("a place needs no horizon: both blind charts have every body where the search puts it", () => {
  assert.equal(longitudeAt.length, 2, "a body and an instant, never a place");
  for (const name of ["charts/marie-curie-unknown", "sample-people/noor"]) {
    const f = fixtures().find(([n]) => n === name)?.[1];
    assert.ok(f, name);
    const chart = chartOf(f);
    assert.equal(hasHorizon(chart), false, `${name} is blind`);
    for (const body of SKY_BODIES) {
      const off = Math.abs(arc(longitudeAt(body, new Date(chart.datetimeUtc)) - chart.planets[body].absoluteDegree));
      assert.ok(off <= 0.01, `${name} ${body}`);
    }
  }
});

test("speed is the chart's, in degrees a day, and below zero exactly while retrograde", () => {
  for (const [name, f] of fixtures()) {
    const chart = chartOf(f);
    const birth = new Date(chart.datetimeUtc);
    for (const body of SKY_BODIES) {
      const placed = chart.planets[body];
      const speed = speedAt(body, birth);
      assert.ok(Math.abs(speed - placed.speed) <= 0.01, `${name} ${body}: ${speed} against ${placed.speed}`);
      // Within a few hours of a turn the chart's day-long sample and this one may disagree on the sign.
      if (Math.abs(placed.speed) >= 0.001) assert.equal(speed < 0, placed.retrograde, `${name} ${body} retrograde`);
    }
  }
});

test("an exact hit is a daily scan bisected to the minute: the Sun at 2026's equinoxes and solstices", () => {
  const seasons = Astronomy.Seasons(2026);
  const expected = [seasons.mar_equinox, seasons.jun_solstice, seasons.sep_equinox, seasons.dec_solstice];
  [0, 90, 180, 270].forEach((point, k) => {
    const hits = exactHits("sun", point, at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z"));
    assert.equal(hits.length, 1, `the Sun reaches ${point}° once`);
    assert.equal(hits[0].getUTCSeconds(), 0, "a whole minute");
    assert.ok(Math.abs(hits[0].getTime() - expected[k].date.getTime()) <= 60_000, `${point}°: ${hits[0].toISOString()}`);
    assert.ok(minutesOff("sun", point, hits[0]) <= 1, `${point}° to the minute`);
  });
});

test("a point a retrograde crosses three times gives three hits, the middle one going backwards", () => {
  const hits = exactHits("mercury", 345, at("2026-02-01T00:00:00Z"), at("2026-04-30T00:00:00Z"));
  assert.deepEqual(hits.map(dayOf), ["2026-02-16", "2026-03-09", "2026-04-02"]);
  assert.deepEqual(hits.map((h) => speedAt("mercury", h) < 0), [false, true, false]);
  for (const hit of hits) assert.ok(minutesOff("mercury", 345, hit) <= 1, hit.toISOString());
});

test("two searches over different ranges find a hit at the same minute", () => {
  const wide = exactHits("mercury", 345, at("2025-12-01T00:00:00Z"), at("2026-12-01T00:00:00Z"));
  const narrow = exactHits("mercury", 345, at("2026-03-09T05:17:00Z"), at("2026-03-09T23:00:00Z"));
  assert.equal(narrow.length, 1);
  assert.ok(isos(wide).includes(narrow[0].toISOString()));
  assert.deepEqual(exactHits("mercury", 345, at("2026-03-09T07:40:00Z"), at("2026-03-10T00:00:00Z")), []);
});

test("a passage a retrograde splits is one window, whole whatever range finds it", () => {
  // Pluto lingers at 303.73° for nearly three years: five exact passes, and stretches outside the orb between them.
  const ranges: Array<[string, string]> = [
    ["2025-03-01T00:00:00Z", "2025-03-02T00:00:00Z"],
    ["2026-06-01T00:00:00Z", "2026-06-02T00:00:00Z"],
    ["2027-11-30T00:00:00Z", "2027-12-01T00:00:00Z"],
  ];
  const found = ranges.map(([a, b]) => inOrb("pluto", 303.73, 1.5, at(a), at(b)));
  for (const windows of found) assert.equal(windows.length, 1);
  const [window] = found[0];
  for (const [other] of found.slice(1)) {
    assert.equal(other.start.toISOString(), window.start.toISOString());
    assert.equal(other.end.toISOString(), window.end.toISOString());
    assert.deepEqual(isos(other.exact), isos(window.exact));
  }
  assert.equal(window.exact.length, 5);
  assert.ok(window.start < window.exact[0] && window.exact[4] < window.end);
  // The middle range falls where Pluto stands outside the orb, between two passes of the same passage.
  assert.ok(Math.abs(arc(longitudeAt("pluto", at("2026-06-01T00:00:00Z")) - 303.73)) > 1.5);
  for (const edge of [window.start, window.end]) {
    assert.ok(Math.abs(Math.abs(arc(longitudeAt("pluto", edge) - 303.73)) - 1.5) < 0.001, `${edge.toISOString()} on the edge`);
  }
  assert.ok(Math.abs(arc(longitudeAt("pluto", later(window.start, -1)) - 303.73)) > 1.5, "outside the day before");
  assert.ok(Math.abs(arc(longitudeAt("pluto", later(window.end, 1)) - 303.73)) > 1.5, "outside the day after");
  for (let k = 1; k < window.exact.length; k++) {
    assert.equal(stations("pluto", window.exact[k - 1], window.exact[k]).length, 1, "it turned between two passes");
  }
});

test("passages with no turn between them stay apart", () => {
  const windows = inOrb("jupiter", 123.97, 2, at("2026-01-01T00:00:00Z"), at("2040-01-01T00:00:00Z"));
  assert.deepEqual(windows.map((w) => dayOf(w.exact[0]).slice(0, 7)), ["2026-07", "2038-07"]);
  for (const w of windows) assert.equal(w.exact.length, 1);
});

test("a body that crosses the whole orb within a day still has its window", () => {
  const windows = inOrb("moon", 0, 3, at("2026-10-01T00:00:00Z"), at("2026-10-31T00:00:00Z"));
  assert.equal(windows.length, 1);
  const [w] = windows;
  assert.equal(w.exact.length, 1);
  assert.ok(w.start < w.exact[0] && w.exact[0] < w.end);
  assert.ok(w.end.getTime() - w.start.getTime() < DAY_MS / 2, "the Moon covers six degrees in half a day");
  assert.ok(minutesOff("moon", 0, w.exact[0]) <= 1);
});

test("an orb is over 0 and at most 30 degrees, and a range that ends before it starts finds nothing", () => {
  for (const orb of [0, -1, 31, Number.NaN]) {
    assert.throws(() => inOrb("saturn", 10, orb, at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z")), RangeError);
  }
  const from = at("2027-01-01T00:00:00Z");
  const to = at("2026-01-01T00:00:00Z");
  assert.deepEqual(exactHits("sun", 0, from, to), []);
  assert.deepEqual(inOrb("sun", 0, 1, from, to), []);
  assert.deepEqual(stations("mercury", from, to), []);
  assert.deepEqual(ingresses("sun", from, to), []);
  assert.deepEqual(eclipses(from, to), []);
});

test("Mercury turns six times in 2026, back and forth, standing still at each", () => {
  const turns = stations("mercury", at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z"));
  assert.deepEqual(
    turns.map((s) => `${s.turns} ${dayOf(s.at)}`),
    [
      "retrograde 2026-02-26",
      "direct 2026-03-20",
      "retrograde 2026-06-29",
      "direct 2026-07-23",
      "retrograde 2026-10-24",
      "direct 2026-11-13",
    ],
  );
  for (const s of turns) {
    assert.equal(s.body, "mercury");
    assert.equal(s.at.getUTCSeconds(), 0);
    assert.ok(Math.abs(speedAt("mercury", s.at)) < 0.001, `${s.at.toISOString()} stands still`);
    assert.equal(speedAt("mercury", later(s.at, 1)) < 0, s.turns === "retrograde");
    assert.equal(speedAt("mercury", later(s.at, -1)) < 0, s.turns === "direct");
    assert.equal(s.lon, longitudeAt("mercury", s.at));
  }
});

test("the Sun, the Moon and the mean node never turn", () => {
  for (const body of ["sun", "moon", "north_node"] as const) {
    assert.deepEqual(stations(body, at("2026-01-01T00:00:00Z"), at("2028-01-01T00:00:00Z")), []);
  }
});

test("Saturn moves into Aries, back into Pisces retrograde, then into Aries again", () => {
  const moves = ingresses("saturn", at("2025-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z"));
  assert.deepEqual(
    moves.map((m) => [m.sign, m.retrograde, dayOf(m.at)]),
    [
      ["Aries", false, "2025-05-25"],
      ["Pisces", true, "2025-09-01"],
      ["Aries", false, "2026-02-14"],
    ],
  );
  for (const m of moves) {
    assert.ok(minutesOff("saturn", 0, m.at) <= 1, `${m.at.toISOString()} on the cusp`);
    assert.equal(Math.floor(longitudeAt("saturn", later(m.at, 1)) / 30), m.sign === "Aries" ? 0 : 11);
  }
});

test("the mean node enters every sign moving back, and the Moon every sign moving on", () => {
  const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];
  const node = ingresses("north_node", at("2026-01-01T00:00:00Z"), at("2046-01-01T00:00:00Z"));
  assert.equal(node.length, 13);
  node.forEach((m, k) => {
    assert.equal(m.retrograde, true);
    if (k > 0) assert.equal(SIGNS.indexOf(m.sign), (SIGNS.indexOf(node[k - 1].sign) + 11) % 12);
  });
  const moon = ingresses("moon", at("2026-10-01T00:00:00Z"), at("2026-11-01T00:00:00Z"));
  assert.ok(moon.length >= 13 && moon.length <= 14, `${moon.length} moves`);
  moon.forEach((m, k) => {
    assert.equal(m.retrograde, false);
    assert.ok(minutesOff("moon", SIGNS.indexOf(m.sign) * 30, m.at) <= 1);
    if (k > 0) assert.equal(SIGNS.indexOf(m.sign), (SIGNS.indexOf(moon[k - 1].sign) + 1) % 12);
  });
});

test("2026 has two solar and two lunar eclipses, each at the place of the body eclipsed", () => {
  const found = eclipses(at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z"));
  assert.deepEqual(
    found.map((e) => [e.kind, dayOf(e.at)]),
    [
      ["solar", "2026-02-17"],
      ["lunar", "2026-03-03"],
      ["solar", "2026-08-12"],
      ["lunar", "2026-08-28"],
    ],
  );
  for (const e of found) {
    const sun = longitudeAt("sun", e.at);
    const moon = longitudeAt("moon", e.at);
    assert.ok(Math.abs(arc(e.lon - (e.kind === "solar" ? sun : moon))) < 0.01, `${e.kind} ${dayOf(e.at)} where it is eclipsed`);
    assert.ok(Math.abs(arc(moon - sun - (e.kind === "solar" ? 0 : 180))) < 1, "new or full Moon");
  }
});

test("the search uses no Node API, so the browser bundles it", () => {
  const source = readFileSync(new URL("./transits.ts", import.meta.url), "utf8");
  const imports = [...source.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ["astronomy-engine"]);
  assert.doesNotMatch(source, /from "node:|\b(process|Buffer|require)\b/);
});

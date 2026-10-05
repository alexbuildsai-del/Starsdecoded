/**
 * The sky search at the edges of a range and of its numbers (R16-01, readings 5 and 6): an instant exactly at a range's
 * first or last moment, the minute after it, a target written a turn off, the orb's limits, a station or ingress or
 * eclipse on a range's ends, and places across four centuries. `transits.test.ts` holds the search to the chart and the
 * calendar; `transits.horizons.test.ts` holds it to JPL Horizons.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { eclipses, exactHits, ingresses, inOrb, longitudeAt, speedAt, stations, SKY_BODIES } from "./transits.js";

const at = (iso: string) => new Date(iso);
const MINUTE = 60_000;
const DAY = 86_400_000;
const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);

test("every body is on the circle at any instant from 1700 to 2300, and the Sun and Moon always move on while the node always moves back", () => {
  for (const iso of ["1700-06-15T00:00:00Z", "1850-01-01T12:00:00Z", "1900-01-01T00:00:00Z", "1969-07-20T20:17:00Z", "2000-01-01T12:00:00Z", "2026-10-05T12:00:00Z", "2150-12-31T23:59:00Z", "2299-03-01T00:00:00Z"]) {
    for (const body of SKY_BODIES) {
      const lon = longitudeAt(body, at(iso));
      assert.ok(Number.isFinite(lon) && lon >= 0 && lon < 360, `${body} ${iso}: ${lon}`);
      const speed = speedAt(body, at(iso));
      assert.ok(Number.isFinite(speed), `${body} ${iso}`);
      if (body === "sun") assert.ok(speed > 0.9 && speed < 1.07, `sun ${speed}`);
      if (body === "moon") assert.ok(speed > 11 && speed < 16, `moon ${speed}`);
      if (body === "north_node") assert.ok(speed < -0.04 && speed > -0.07, `node ${speed}`);
    }
  }
});

test("a place is the same on every call and at the same instant however the Date was made", () => {
  const a = longitudeAt("saturn", at("2026-10-05T12:00:00Z"));
  assert.equal(longitudeAt("saturn", new Date(Date.UTC(2026, 9, 5, 12))), a);
  assert.equal(longitudeAt("saturn", at("2026-10-05T14:00:00+02:00")), a);
});

test("a range includes a hit at its first instant and at its last, and loses it the minute beyond", () => {
  const [hit] = exactHits("mercury", 345, at("2026-03-01T00:00:00Z"), at("2026-03-20T00:00:00Z"));
  assert.ok(hit);
  assert.deepEqual(exactHits("mercury", 345, hit, hit), [hit], "a range of that one instant");
  assert.deepEqual(exactHits("mercury", 345, hit, plus(hit, DAY)), [hit], "starting on it");
  assert.deepEqual(exactHits("mercury", 345, plus(hit, -DAY), hit), [hit], "ending on it");
  assert.deepEqual(exactHits("mercury", 345, plus(hit, MINUTE), plus(hit, DAY)), [], "starting a minute after");
  assert.deepEqual(exactHits("mercury", 345, plus(hit, -DAY), plus(hit, -MINUTE)), [], "ending a minute before");
});

test("a target written a turn off, or below nought, is the same point", () => {
  const range = [at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z")] as const;
  const base = exactHits("sun", 10, ...range);
  assert.equal(base.length, 1);
  for (const target of [370, -350, 730, 10 - 360 * 3]) assert.deepEqual(exactHits("sun", target, ...range), base, String(target));
  const window = inOrb("jupiter", 124, 2, at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z"));
  assert.deepEqual(inOrb("jupiter", 124 - 360, 2, at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z")), window);
  assert.deepEqual(inOrb("jupiter", 124 + 720, 2, at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z")), window);
});

test("a point at 0° Aries is crossed once a year by the Sun from either side of the seam, and 359.99° and 0.01° are one window", () => {
  const hits = exactHits("sun", 0, at("2026-01-01T00:00:00Z"), at("2028-01-01T00:00:00Z"));
  assert.deepEqual(hits.map((h) => h.getUTCFullYear()), [2026, 2027]);
  const [w] = inOrb("sun", 0, 2, at("2026-03-20T00:00:00Z"), at("2026-03-21T00:00:00Z"));
  assert.ok(w.start < w.exact[0] && w.exact[0] < w.end);
  assert.ok(Math.abs(w.end.getTime() - w.exact[0].getTime() - (w.exact[0].getTime() - w.start.getTime())) < DAY / 8, "the Sun is about as long on one side as the other");
  assert.equal(inOrb("sun", 359.99, 2, at("2026-03-20T00:00:00Z"), at("2026-03-21T00:00:00Z")).length, 1);
});

test("the orb is any size above nought up to 30: a hair's breadth and the widest are both a window with the pass inside", () => {
  for (const orb of [0.001, 0.5, 30]) {
    const found = inOrb("saturn", 5, orb, at("2026-01-01T00:00:00Z"), at("2040-01-01T00:00:00Z"));
    assert.ok(found.length >= 1, `orb ${orb}`);
    for (const w of found) {
      assert.ok(w.start <= w.end, `orb ${orb}`);
      for (const pass of w.exact) assert.ok(pass >= w.start && pass <= w.end, `orb ${orb}`);
    }
  }
  for (const orb of [0, -0.0001, 30.0001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(() => inOrb("saturn", 5, orb, at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z")), RangeError, String(orb));
  }
});

test("a window is returned by any range that touches it by an instant, and by none that misses it by a minute", () => {
  const [w] = inOrb("mars", 100, 1, at("2026-01-01T00:00:00Z"), at("2027-06-01T00:00:00Z"));
  assert.ok(w);
  for (const [from, to, found] of [
    [w.start, w.start, 1],
    [plus(w.start, -DAY), w.start, 1],
    [plus(w.start, -DAY), plus(w.start, -MINUTE), 0],
    [w.end, plus(w.end, DAY), 1],
    [plus(w.end, MINUTE), plus(w.end, DAY), 0],
    [plus(w.start, MINUTE), plus(w.end, -MINUTE), 1],
  ] as const) {
    const windows = inOrb("mars", 100, 1, from, to);
    assert.equal(windows.filter((x) => x.start.getTime() === w.start.getTime()).length, found, `${from.toISOString()} to ${to.toISOString()}`);
    for (const x of windows.filter((y) => y.start.getTime() === w.start.getTime())) {
      assert.equal(x.end.getTime(), w.end.getTime(), "whole whatever the range");
      assert.deepEqual(x.exact.map(Number), w.exact.map(Number));
    }
  }
});

test("a window's instants are whole minutes, in order, with its passes between its ends", () => {
  // Each target is a place its body passes in these years, picked from the body's own place a few years in.
  const passing = (body: "saturn" | "pluto" | "mars" | "north_node", years: number) => longitudeAt(body, new Date(Date.UTC(2026 + years, 0, 1)));
  for (const [body, target, orb] of [["saturn", passing("saturn", 3), 2], ["pluto", 303.73, 1.5], ["mars", passing("mars", 2), 1], ["north_node", passing("north_node", 4), 1]] as const) {
    const found = inOrb(body, target, orb, at("2026-01-01T00:00:00Z"), at("2034-01-01T00:00:00Z"));
    assert.ok(found.length >= 1, body);
    for (const w of found) {
      for (const d of [w.start, w.end, ...w.exact]) assert.equal(d.getTime() % MINUTE, 0, `${body}: ${d.toISOString()} is a whole minute`);
      const all = [w.start, ...w.exact, w.end].map(Number);
      assert.deepEqual(all, [...all].sort((a, b) => a - b), body);
    }
    found.slice(1).forEach((w, i) => assert.ok(found[i].end < w.start, `${body}: windows apart and in order`));
  }
});

test("a station and an ingress are in a range that ends or starts on their minute, and out of one that stops a minute short", () => {
  const [turn] = stations("mercury", at("2026-01-01T00:00:00Z"), at("2026-04-01T00:00:00Z"));
  assert.equal(turn.turns, "retrograde");
  assert.equal(stations("mercury", turn.at, turn.at).length, 1);
  assert.equal(stations("mercury", turn.at, plus(turn.at, 10 * DAY)).length, 1);
  assert.equal(stations("mercury", plus(turn.at, -10 * DAY), turn.at).length, 1);
  assert.equal(stations("mercury", plus(turn.at, MINUTE), plus(turn.at, 10 * DAY)).length, 0);
  assert.equal(stations("mercury", plus(turn.at, -10 * DAY), plus(turn.at, -MINUTE)).length, 0);
  const [move] = ingresses("sun", at("2026-01-01T00:00:00Z"), at("2026-02-01T00:00:00Z"));
  assert.equal(move.sign, "Aquarius");
  assert.equal(ingresses("sun", move.at, move.at).length, 1);
  assert.equal(ingresses("sun", move.at, plus(move.at, 5 * DAY)).length, 1);
  assert.equal(ingresses("sun", plus(move.at, -5 * DAY), move.at).length, 1);
  assert.equal(ingresses("sun", plus(move.at, MINUTE), plus(move.at, 5 * DAY)).length, 0);
  assert.equal(ingresses("sun", plus(move.at, -5 * DAY), plus(move.at, -MINUTE)).length, 0);
});

test("an eclipse is in a range of the one instant it is reported at, whichever way its seconds rounded to the minute", () => {
  const found = eclipses(at("2026-01-01T00:00:00Z"), at("2031-01-01T00:00:00Z"));
  assert.ok(found.length >= 18);
  for (const e of found) {
    assert.equal(eclipses(e.at, e.at).length, 1, `${e.kind} reported at ${e.at.toISOString()} is not in a range of that instant`);
    assert.equal(eclipses(plus(e.at, -DAY), e.at).filter((x) => x.at.getTime() === e.at.getTime()).length, 1, `${e.at.toISOString()}: a range that ends on it`);
    assert.equal(eclipses(e.at, plus(e.at, DAY)).filter((x) => x.at.getTime() === e.at.getTime()).length, 1, `${e.at.toISOString()}: a range that starts on it`);
    assert.equal(eclipses(plus(e.at, MINUTE), plus(e.at, 3 * DAY)).filter((x) => x.at.getTime() === e.at.getTime()).length, 0);
    assert.equal(eclipses(plus(e.at, -3 * DAY), plus(e.at, -MINUTE)).filter((x) => x.at.getTime() === e.at.getTime()).length, 0);
  }
});

test("the turns of each planet alternate, retrograde then direct, and each is on the planet's own place", () => {
  for (const body of ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const) {
    const turns = stations(body, at("2026-01-01T00:00:00Z"), at("2029-01-01T00:00:00Z"));
    assert.ok(turns.length >= 2, body);
    turns.forEach((s, i) => {
      if (i > 0) assert.notEqual(s.turns, turns[i - 1].turns, `${body}: two ${s.turns} turns in a row`);
      if (i > 0) assert.ok(s.at > turns[i - 1].at);
      assert.equal(s.lon, longitudeAt(body, s.at));
      assert.equal(s.at.getTime() % MINUTE, 0);
    });
  }
});

test("each body's ingresses follow the signs in order, the Sun a sign a month and a move back marked retrograde", () => {
  const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const sun = ingresses("sun", at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z"));
  assert.equal(sun.length, 12);
  sun.forEach((m, i) => {
    assert.equal(m.retrograde, false);
    if (i > 0) assert.equal(SIGNS.indexOf(m.sign), (SIGNS.indexOf(sun[i - 1].sign) + 1) % 12);
    if (i > 0) assert.ok(m.at.getTime() - sun[i - 1].at.getTime() > 28 * DAY && m.at.getTime() - sun[i - 1].at.getTime() < 32 * DAY);
  });
  for (const body of ["mars", "jupiter", "saturn", "uranus", "pluto"] as const) {
    const moves = ingresses(body, at("2020-01-01T00:00:00Z"), at("2040-01-01T00:00:00Z"));
    moves.forEach((m, i) => {
      if (i === 0) return;
      const before = SIGNS.indexOf(moves[i - 1].sign);
      assert.equal(SIGNS.indexOf(m.sign), m.retrograde ? (before + 11) % 12 : (before + 1) % 12, `${body} ${m.at.toISOString()}`);
    });
  }
});

test("eclipses alternate between a new Moon and a full one, and sit at the longitude of the body eclipsed", () => {
  const found = eclipses(at("2026-01-01T00:00:00Z"), at("2031-01-01T00:00:00Z"));
  assert.ok(found.length >= 18 && found.length <= 24, `${found.length} eclipses in five years`);
  found.forEach((e, i) => {
    assert.ok(Math.abs(e.lon - longitudeAt(e.kind === "solar" ? "sun" : "moon", e.at)) < 0.01, "the place at the greatest moment, to the minute it is reported at");
    assert.ok(e.lon >= 0 && e.lon < 360);
    assert.equal(e.at.getTime() % MINUTE, 0);
    if (i > 0) assert.ok(e.at > found[i - 1].at);
    const sun = longitudeAt("sun", e.at);
    const moon = longitudeAt("moon", e.at);
    const apart = Math.abs(((moon - sun + 540) % 360) - 180);
    assert.ok(e.kind === "solar" ? apart < 2 : apart > 178, `${e.kind} at ${e.at.toISOString()}: Moon ${apart.toFixed(1)}° from the Sun`);
  });
  assert.equal(new Set(found.map((e) => e.kind)).size, 2);
});

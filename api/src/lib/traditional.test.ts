import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "./testFixtures.js";
import { calculateNatalChart } from "./chartCalculation.js";
import {
  DOMICILE, EXALTATION, TRADITIONAL_PLANETS,
  angularity, deriveTraditional, essentialDignity, houseRulers, lots, sect, sectPayload, wholeSignHouse,
} from "./traditional.js";

const norm = (d: number) => ((d % 360) + 360) % 360;

test("sect: Marie Curie at noon is a day chart with the classical assignments", () => {
  const s = sect(chartFromFixture("marie-curie"));
  const { sunAltitude, marginal, ...rest } = s;
  assert.deepEqual(rest, {
    sect: "day", light: "sun",
    beneficOfSect: "jupiter", beneficContrary: "venus",
    maleficOfSect: "saturn", maleficContrary: "mars",
  });
  assert.ok(sunAltitude > 0);
  assert.equal(marginal, false);
});

test("sect: synthetic fixtures", () => {
  assert.equal(sect(chartFromFixture("day-angular")).sect, "day");
  assert.equal(sect(chartFromFixture("night-angular")).sect, "night");
  assert.equal(sect(chartFromFixture("night-angular")).maleficContrary, "saturn");
});

test("sect: marginal within 5 degrees of the horizon, still committed to one sect", () => {
  // Walk the morning of 1990-06-21 in Paris minute by minute to the first
  // instant the Sun's centre is above the horizon, then test both sides.
  let riseMinute = -1;
  for (let m = 0; m < 12 * 60; m++) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0"), mm = String(m % 60).padStart(2, "0");
    const c = calculateNatalChart("1990-06-21", `${hh}:${mm}`, 48.8566, 2.3522, 2);
    if (c.sunAltitude > 0) { riseMinute = m; break; }
  }
  assert.ok(riseMinute > 0, "sunrise not found");
  const at = (m: number) => calculateNatalChart("1990-06-21", `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, 48.8566, 2.3522, 2);
  const justAfter = sect(at(riseMinute));
  const justBefore = sect(at(riseMinute - 5));
  assert.equal(justAfter.sect, "day");
  assert.equal(justAfter.marginal, true);
  assert.equal(justBefore.sect, "night");
  assert.equal(justBefore.marginal, true);
  const midMorning = sect(at(riseMinute + 180));
  assert.equal(midMorning.sect, "day");
  assert.equal(midMorning.marginal, false);
});

test("sect payload uses the brief's six keys", () => {
  const p = sectPayload(sect(chartFromFixture("marie-curie")));
  assert.deepEqual(p, {
    sect: "day", sect_light: "sun", benefic_of_sect: "jupiter", benefic_out_of_sect: "venus",
    malefic_of_sect: "saturn", malefic_out_of_sect: "mars",
  });
});

test("dignity: every traditional planet is in domicile in its own signs", () => {
  for (const [sign, planet] of Object.entries(DOMICILE)) {
    assert.equal(essentialDignity(planet, sign), "domicile", `${planet} in ${sign}`);
  }
});

test("dignity: the seven exaltations and their falls", () => {
  for (const planet of TRADITIONAL_PLANETS) {
    const { sign } = EXALTATION[planet];
    // Mercury is exalted in Virgo, which it also rules; domicile wins.
    const expected = planet === "mercury" ? "domicile" : "exaltation";
    assert.equal(essentialDignity(planet, sign), expected, `${planet} in ${sign}`);
  }
  assert.equal(essentialDignity("sun", "libra"), "fall");
  assert.equal(essentialDignity("saturn", "aries"), "fall");
  assert.equal(essentialDignity("mars", "cancer"), "fall");
});

test("dignity: detriment is opposite domicile; peregrine otherwise; outers are null", () => {
  assert.equal(essentialDignity("venus", "scorpio"), "detriment");
  assert.equal(essentialDignity("mars", "libra"), "detriment");
  assert.equal(essentialDignity("sun", "scorpio"), "peregrine");
  assert.equal(essentialDignity("pluto", "scorpio"), null);
  assert.equal(essentialDignity("north_node", "virgo"), null);
});

test("Marie Curie: Mars in domicile, Venus in detriment, both in the 11th", () => {
  const t = deriveTraditional(chartFromFixture("marie-curie"));
  const by = Object.fromEntries(t.planets.map((p) => [p.planet, p]));
  assert.equal(by.mars.dignity, "domicile");
  assert.equal(by.venus.dignity, "detriment");
  assert.equal(by.mars.house, 11);
  assert.equal(by.mars.inSect, false);     // day chart: Mars contrary to sect
  assert.equal(by.saturn.inSect, true);
  assert.equal(by.sun.inSect, null);
});

test("house rulers: Marie Curie's 10th is Libra, ruled by Venus sitting in Scorpio in the 11th", () => {
  const r = houseRulers(chartFromFixture("marie-curie"));
  assert.equal(r.length, 12);
  const tenth = r[9];
  assert.equal(tenth.house, 10);
  assert.equal(tenth.sign, "libra");
  assert.equal(tenth.ruler, "venus");
  assert.equal(tenth.rulerSign, "scorpio");
  assert.equal(tenth.rulerHouse, 11);
  assert.equal(tenth.rulerDignity, "detriment");
  const eleventh = r[10];
  assert.equal(eleventh.ruler, "mars");
  assert.equal(eleventh.inOwnHouse, true);
  const chartRuler = deriveTraditional(chartFromFixture("marie-curie")).chartRuler;
  assert.equal(chartRuler.ruler, "saturn");
});

test("house rulers never use modern rulers", () => {
  for (const name of ["marie-curie", "oprah-winfrey", "high-latitude"]) {
    for (const r of houseRulers(chartFromFixture(name))) {
      assert.ok((TRADITIONAL_PLANETS as readonly string[]).includes(r.ruler), `${name} house ${r.house}`);
    }
  }
});

test("lots: Fortune and Spirit are equidistant from the Ascendant in opposite directions", () => {
  for (const name of ["marie-curie", "oprah-winfrey", "day-angular", "night-angular", "high-latitude"]) {
    const c = chartFromFixture(name);
    const { fortune, spirit } = lots(c);
    const asc = c.angles.ascendant.absoluteDegree;
    const df = norm(fortune.longitude - asc);
    const ds = norm(asc - spirit.longitude);
    assert.ok(Math.abs(df - ds) < 0.05, `${name}: ${df} vs ${ds}`);
  }
});

test("lots: day formula for Marie Curie", () => {
  const c = chartFromFixture("marie-curie");
  const asc = c.angles.ascendant.absoluteDegree;
  const sun = c.planets.sun.absoluteDegree;
  const moon = c.planets.moon.absoluteDegree;
  const { fortune, spirit } = lots(c);
  assert.ok(Math.abs(norm(fortune.longitude - norm(asc + moon - sun))) < 0.05);
  assert.ok(Math.abs(norm(spirit.longitude - norm(asc + sun - moon))) < 0.05);
  assert.equal(fortune.house, wholeSignHouse(fortune.longitude, asc));
});

test("angularity", () => {
  assert.equal(angularity(1), "angular");
  assert.equal(angularity(10), "angular");
  assert.equal(angularity(2), "succedent");
  assert.equal(angularity(11), "succedent");
  assert.equal(angularity(3), "cadent");
  assert.equal(angularity(12), "cadent");
});

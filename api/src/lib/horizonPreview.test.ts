import { test } from "node:test";
import assert from "node:assert/strict";
import { previewHorizon, validatePreviewInput } from "./horizonPreview.js";

const WARSAW = { birthDate: "1867-11-07", latitude: 52.2297, longitude: 21.0122, timezone: "Europe/Warsaw" };

test("exact: 12:00 reads Capricorn, holding from 11:12 to 12:58", () => {
  const h = previewHorizon({ ...WARSAW, birthTime: "12:00", birthTimeWindowMinutes: 0 });
  assert.equal(h.status, "known");
  assert.equal(h.ascendant.value, "Capricorn");
  assert.equal(h.ascendant.holdsFrom, "11:12");
  assert.equal(h.ascendant.holdsTo, "12:58");
  assert.equal(h.ascendant.holds, true);
});

test("around noon, give or take an hour: Sagittarius, Capricorn or Aquarius, flips at 11:12 and 12:58", () => {
  const h = previewHorizon({ ...WARSAW, birthTime: "12:00", birthTimeWindowMinutes: 60 });
  assert.equal(h.status, "unknown");
  assert.deepEqual(h.ascendant.values, ["Sagittarius", "Capricorn", "Aquarius"]);
  assert.deepEqual(h.ascendant.flipsAt, ["11:12", "12:58"]);
});

test("Afternoon: six rising signs, flips at 12:58, 14:06, 14:56, 15:46 and 16:54", () => {
  const h = previewHorizon({ ...WARSAW, birthTime: "15:00", birthTimeWindowMinutes: 180 });
  assert.equal(h.ascendant.values.length, 6);
  assert.deepEqual(h.ascendant.values, ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini"]);
  assert.deepEqual(h.ascendant.flipsAt, ["12:58", "14:06", "14:56", "15:46", "16:54"]);
  assert.equal(h.status, "unknown");
});

test("a numeric offset is accepted when no zone is given, and the response is the engine's own horizon", () => {
  const zoned = previewHorizon({ ...WARSAW, birthTime: "12:00", birthTimeWindowMinutes: 0 });
  const numeric = previewHorizon({ ...WARSAW, timezone: undefined, timezoneOffset: 1.4, birthTime: "12:00", birthTimeWindowMinutes: 0 });
  assert.deepEqual(zoned, numeric);
  assert.ok(Object.keys(zoned).every((k) => ["status", "ascendant", "midheaven", "sect", "moonSign", "sunSign"].includes(k)));
});

test("validation names the field that is wrong", () => {
  const ok = { ...WARSAW, birthTime: "12:00", birthTimeWindowMinutes: 0 };
  assert.equal(validatePreviewInput(ok), null);
  assert.match(validatePreviewInput({ ...ok, birthDate: "7 Nov 1867" })!, /birthDate/);
  assert.match(validatePreviewInput({ ...ok, birthTime: "25:00" })!, /birthTime/);
  assert.match(validatePreviewInput({ ...ok, birthTimeWindowMinutes: 900 })!, /birthTimeWindowMinutes/);
  assert.match(validatePreviewInput({ ...ok, latitude: 120 })!, /latitude/);
  assert.match(validatePreviewInput({ ...ok, timezone: "Mars/Olympus" })!, /timezone/);
  assert.match(validatePreviewInput({ ...ok, timezone: undefined })!, /timezone or timezoneOffset/);
});

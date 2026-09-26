import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cityName, localParts, placeForZone, skyAt, skyNow } from "./skyNow.js";

const hepburn = JSON.parse(readFileSync(new URL("../../../fixtures/charts/audrey-hepburn.json", import.meta.url), "utf8")) as {
  birthDate: string; birthTime: string; latitude: number; longitude: number; timezone: string; timezoneOffset: number;
};

test("the visitor's city is the zone's own where tzdb lists one", () => {
  assert.deepEqual(placeForZone("Europe/Amsterdam"), { city: "Amsterdam", zone: "Europe/Amsterdam", lat: 52.37, lon: 4.9 });
});

test("an old zone name finds the city it names today", () => {
  const place = placeForZone("Asia/Calcutta");
  assert.equal(place.city, "Kolkata");
  assert.equal(place.zone, "Asia/Kolkata");
});

test("a zone that names no city is London", () => {
  assert.equal(placeForZone("Etc/UTC").city, "London");
  assert.equal(placeForZone(undefined).city, "London");
  assert.equal(cityName("America/Argentina/Buenos_Aires"), "Buenos Aires");
});

test("the wall clock is read across a summer-time change", () => {
  assert.equal(localParts(new Date("2026-03-29T00:59:00Z"), "Europe/Brussels").time, "01:59");
  assert.equal(localParts(new Date("2026-03-29T01:00:00Z"), "Europe/Brussels").time, "03:00");
});

test("the sky at a moment is the engine's chart, to the hundredth of the Audrey Hepburn fixture", () => {
  const [year, month, day] = hepburn.birthDate.split("-").map(Number);
  const [hour, minute] = hepburn.birthTime.split(":").map(Number);
  const at = new Date(Date.UTC(year, month - 1, day, hour - hepburn.timezoneOffset, minute));
  const chart = skyAt(at, { city: "Ixelles", zone: hepburn.timezone, lat: hepburn.latitude, lon: hepburn.longitude });
  assert.equal(chart.planets.sun.sign, "Taurus");
  assert.equal(chart.planets.sun.degree.toFixed(2), "13.12");
  assert.equal(chart.planets.moon.sign, "Pisces");
  assert.equal(chart.planets.moon.degree.toFixed(2), "6.45");
  assert.equal(chart.angles?.ascendant.sign, "Aquarius");
  assert.equal(chart.angles?.ascendant.degree.toFixed(2), "28.62");
});

test("one city's sky is computed once a minute", () => {
  const first = skyNow("Europe/Brussels", new Date("2026-09-26T18:00:10Z"));
  assert.equal(skyNow("Europe/Brussels", new Date("2026-09-26T18:00:50Z")), first);
  assert.equal(first.at.toISOString(), "2026-09-26T18:00:00.000Z");
  assert.notEqual(skyNow("Europe/Brussels", new Date("2026-09-26T18:01:00Z")), first);
});

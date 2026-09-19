import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNatalChart } from "./chartCalculation.js";
import { chartFromFixture } from "./testFixtures.js";
import { computeOverlays, findOverlay, notableOverlays } from "./overlays.js";

const curie = () => chartFromFixture("marie-curie");
const winfrey = () => chartFromFixture("oprah-winfrey");

test("overlays run both directions on the Curie-Winfrey pair, ten bodies each way", () => {
  const ov = computeOverlays(curie(), winfrey());
  assert.equal(ov.filter((o) => o.of === "A" && o.inHouseOf === "B").length, 10);
  assert.equal(ov.filter((o) => o.of === "B" && o.inHouseOf === "A").length, 10);
  // Curie's Scorpio Sun against Winfrey's Sagittarius rising: the 12th. Winfrey's Aquarius Sun against Capricorn rising: the 2nd.
  assert.equal(findOverlay(ov, "sun", "A", "B")?.house, 12);
  assert.equal(findOverlay(ov, "sun", "B", "A")?.house, 2);
  assert.equal(findOverlay(ov, "moon", "A", "B")?.house, 4);
  assert.equal(findOverlay(ov, "moon", "B", "A")?.house, 12);
  assert.ok(ov.every((o) => o.house >= 1 && o.house <= 12));
});

test("notable: three or more of one person's bodies in one house of the other, or a luminary there", () => {
  const notable = notableOverlays(computeOverlays(curie(), winfrey()));
  const key = (n: { of: string; inHouseOf: string; house: number }) => `${n.of}>${n.inHouseOf}:${n.house}`;
  const byKey = new Map(notable.map((n) => [key(n), n]));
  // Curie's Scorpio stellium lands whole in Winfrey's 12th; Winfrey's Aquarius three in Curie's 2nd.
  assert.equal(byKey.get("A>B:12")?.reason, "cluster");
  assert.deepEqual(byKey.get("A>B:12")?.planets, ["sun", "venus", "mars", "saturn"]);
  assert.equal(byKey.get("B>A:2")?.reason, "cluster");
  // Each Moon alone in the other's house is a card by the luminary rule.
  assert.equal(byKey.get("A>B:4")?.reason, "luminary");
  assert.deepEqual(byKey.get("A>B:4")?.planets, ["moon"]);
  assert.equal(byKey.get("B>A:12")?.reason, "luminary");
  assert.equal(notable.length, 4);
  // Two bodies with no luminary are not notable.
  assert.equal(byKey.has("B>A:11"), false);
});

test("a blind host has no houses, so nothing overlays onto it and the other direction still reads", () => {
  const blind = calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720);
  const ov = computeOverlays(blind, winfrey());
  assert.equal(ov.filter((o) => o.inHouseOf === "A").length, 0);
  assert.equal(ov.filter((o) => o.inHouseOf === "B").length, 10);
  assert.equal(computeOverlays(blind, blind).length, 0);
});

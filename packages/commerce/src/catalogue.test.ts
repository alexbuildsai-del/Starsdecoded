import { test } from "node:test";
import assert from "node:assert/strict";
import { BUNDLES, bundleById, formatEuro, type BundleId } from "./catalogue";

test("catalogue: the three bundles are the Owner's names, lines, credits and prices, in the order shown (ADR-142)", () => {
  assert.deepEqual(BUNDLES, [
    { id: "solo", name: "Single", line: "1 credit · one report", credits: 1, cents: 2400 },
    { id: "couple", name: "Couple", line: "3 credits · a report each and how you get along", credits: 3, cents: 4800 },
    { id: "family", name: "Family & friends", line: "5 credits · for the people close to you", credits: 5, cents: 7200 },
  ]);
});

test("catalogue: each line states the credits its row grants and carries no price (R-6.3)", () => {
  for (const { id, line, credits } of BUNDLES) {
    assert.ok(line.startsWith(`${credits} credit${credits === 1 ? "" : "s"} · `), id);
    assert.ok(!line.includes("€"), id);
  }
});

test("catalogue: per credit the prices are €24, €16 and €14.40, and Single is never the cheaper credit", () => {
  assert.deepEqual(
    BUNDLES.map((bundle) => formatEuro(bundle.cents / bundle.credits)),
    ["€24", "€16", "€14.40"],
  );
  const [single, ...others] = BUNDLES;
  for (const bundle of others) assert.ok(bundle.cents / bundle.credits < single.cents / single.credits, bundle.id);
});

test("catalogue: bundleById returns each row and refuses an id the catalogue lacks", () => {
  for (const bundle of BUNDLES) assert.equal(bundleById(bundle.id), bundle);
  assert.throws(() => bundleById("duo" as BundleId), /duo/);
});

test("catalogue: formatEuro drops the cents of a whole euro and keeps two digits otherwise", () => {
  const cases: [number, string][] = [
    [2400, "€24"],
    [4800, "€48"],
    [7200, "€72"],
    [1440, "€14.40"],
    [1600, "€16"],
    [2450, "€24.50"],
    [1999, "€19.99"],
    [100, "€1"],
    [5, "€0.05"],
    [0, "€0"],
  ];
  for (const [cents, label] of cases) assert.equal(formatEuro(cents), label, String(cents));
});

test("catalogue: formatEuro refuses anything but whole, non-negative cents", () => {
  for (const bad of [12.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => formatEuro(bad), RangeError, String(bad));
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import * as commerce from "./index";
import {
  BUNDLES,
  CAMPAIGN_ITEMS,
  CREDIT_LINE,
  MAX_CAMPAIGN_OFF,
  PLANS,
  bundleById,
  formatEuro,
  itemById,
  renewalLine,
  type BundleId,
  type CatalogueItemId,
} from "./catalogue";

test("catalogue: the three bundles are the Owner's names, lines, credits, prices and example mixes, in the order shown (ADR-142, 168, 169, 170)", () => {
  assert.deepEqual(BUNDLES, [
    {
      id: "solo",
      lookupKey: "single",
      name: "Single",
      line: "1 credit · a Personal report or a Compatibility report",
      credits: 1,
      cents: 2400,
      fullCents: 2400,
      launch: false,
      mixes: ["1 Personal report", "1 Compatibility report"],
    },
    {
      id: "couple",
      lookupKey: "couple",
      name: "Couple",
      line: "3 credits · a report each and how you get along",
      credits: 3,
      cents: 5400,
      fullCents: 7200,
      launch: true,
      mixes: ["2 Personal reports", "1 Compatibility report"],
    },
    {
      id: "family",
      lookupKey: "family",
      name: "Family & friends",
      line: "5 credits · for the people close to you",
      credits: 5,
      cents: 7200,
      fullCents: 12000,
      launch: true,
      mixes: ["3 Personal reports", "2 Compatibility reports"],
    },
  ]);
});

test("catalogue: each line states the credits its row grants and carries no price (R-6.3)", () => {
  for (const { id, line, credits } of BUNDLES) {
    assert.ok(line.startsWith(`${credits} credit${credits === 1 ? "" : "s"} · `), id);
    assert.ok(!line.includes("€"), id);
  }
});

test("catalogue: per credit the prices are €24, €18 and €14.40, and Single is never the cheaper credit", () => {
  assert.deepEqual(
    BUNDLES.map((bundle) => formatEuro(bundle.cents / bundle.credits)),
    ["€24", "€18", "€14.40"],
  );
  const [single, ...others] = BUNDLES;
  for (const bundle of others) assert.ok(bundle.cents / bundle.credits < single.cents / single.credits, bundle.id);
});

test("catalogue: each Singles total is the credits at Single's price, so the launch price saves €18 and €48 against it (ADR-169)", () => {
  const single = bundleById("solo");
  for (const bundle of BUNDLES) assert.equal(bundle.fullCents, bundle.credits * single.cents, bundle.id);
  assert.deepEqual(
    BUNDLES.map((bundle) => formatEuro(bundle.fullCents)),
    ["€24", "€72", "€120"],
  );
  assert.deepEqual(
    BUNDLES.filter((bundle) => bundle.launch).map((bundle) => formatEuro(bundle.fullCents - bundle.cents)),
    ["€18", "€48"],
  );
});

test("catalogue: the launch price is on Couple and Family & friends only, under their Singles total, and Single is never discounted (R-6.7, ADR-146)", () => {
  assert.deepEqual(
    BUNDLES.filter((bundle) => bundle.launch).map((bundle) => bundle.id),
    ["couple", "family"],
  );
  for (const bundle of BUNDLES.filter((row) => row.launch)) assert.ok(bundle.cents < bundle.fullCents, bundle.id);
  const single = bundleById("solo");
  assert.equal(single.launch, false);
  assert.equal(single.cents, single.fullCents);
});

test("catalogue: a bundle holds no end date and no earlier price until the Owner sets one (ADR-169)", () => {
  for (const bundle of BUNDLES) {
    assert.deepEqual(
      Object.keys(bundle).sort(),
      ["cents", "credits", "fullCents", "id", "launch", "line", "lookupKey", "mixes", "name"],
      `${bundle.id} gained a field: an end date or a "was" price needs the Owner's word`,
    );
  }
});

test("catalogue: each example mix is a count and a report's name, and the bundle's credits are what the mixes use (ADR-170)", () => {
  for (const { id, credits, mixes } of BUNDLES) {
    const kinds: string[] = [];
    const counts = mixes.map((mix) => {
      const match = /^(\d+) (Personal|Compatibility) report(s?)$/.exec(mix);
      assert.ok(match, `${id}: "${mix}" is a count and a report's name`);
      const count = Number(match[1]);
      assert.equal(match[3] === "s", count !== 1, `${id}: "${mix}" is plural exactly when its count is not 1`);
      kinds.push(match[2]);
      return count;
    });
    assert.deepEqual(kinds, ["Personal", "Compatibility"], `${id} offers both kinds of report`);
    if (credits === 1) {
      for (const count of counts) assert.equal(count, credits, `${id}: each alternative is the one credit`);
    } else {
      assert.equal(
        counts.reduce((sum, count) => sum + count, 0),
        credits,
        `${id}: the mixes add up to the credits`,
      );
    }
  }
});

test("catalogue: the one credit line names no price and the package root exports it with the bundles (ADR-170, R-6.3)", () => {
  assert.equal(CREDIT_LINE, "1 credit = 1 report of either kind.");
  assert.ok(!CREDIT_LINE.includes("€"));
  assert.equal(commerce.CREDIT_LINE, CREDIT_LINE);
  assert.equal(commerce.BUNDLES, BUNDLES);
});

test("catalogue: bundleById returns each row and refuses an id the catalogue lacks", () => {
  for (const bundle of BUNDLES) assert.equal(bundleById(bundle.id), bundle);
  assert.throws(() => bundleById("duo" as BundleId), /duo/);
});

test("catalogue: formatEuro drops the cents of a whole euro and keeps two digits otherwise", () => {
  const cases: [number, string][] = [
    [2400, "€24"],
    [5400, "€54"],
    [7200, "€72"],
    [12000, "€120"],
    [1800, "€18"],
    [1440, "€14.40"],
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

test("catalogue: each bundle's lookup key is the one Stripe finds it by, and Single's is not 'solo' (ADR-277)", () => {
  assert.deepEqual(
    BUNDLES.map((bundle) => [bundle.id, bundle.lookupKey]),
    [
      ["solo", "single"],
      ["couple", "couple"],
      ["family", "family"],
    ],
  );
});

test("catalogue: Timeline has a monthly and a yearly plan at the Owner's prices, the year with one credit to give (ADR-277)", () => {
  assert.deepEqual(PLANS, [
    { id: "timeline_month", lookupKey: "timeline_month", name: "Timeline", interval: "month", cents: 999, creditsToGive: 0 },
    { id: "timeline_year", lookupKey: "timeline_year", name: "Timeline", interval: "year", cents: 6999, creditsToGive: 1 },
  ]);
  assert.deepEqual(
    PLANS.map((plan) => formatEuro(plan.cents)),
    ["€9.99", "€69.99"],
  );
  for (const plan of PLANS) assert.equal(plan.lookupKey, plan.id);
});

test("catalogue: every lookup key in the catalogue is unique", () => {
  const keys = [...BUNDLES.map((bundle) => bundle.lookupKey), ...PLANS.map((plan) => plan.lookupKey)];
  assert.equal(new Set(keys).size, keys.length);
});

test("catalogue: itemById returns a bundle or a plan and refuses an id the catalogue lacks", () => {
  for (const bundle of BUNDLES) assert.equal(itemById(bundle.id), bundle);
  for (const plan of PLANS) assert.equal(itemById(plan.id), plan);
  assert.throws(() => itemById("duo" as CatalogueItemId), /duo/);
});

test("catalogue: each plan's renewal line says its interval and where to stop it, in plain words", () => {
  const [month, year] = PLANS;
  assert.equal(renewalLine(month), "It renews each month. You can stop it any time on your Account page.");
  assert.equal(renewalLine(year), "It renews each year. You can stop it any time on your Account page.");
});

test("catalogue: a campaign may price Couple and Family & friends, never Single and never a plan, and by at most a quarter off (MB-149)", () => {
  assert.deepEqual(CAMPAIGN_ITEMS, ["couple", "family"]);
  for (const plan of PLANS) assert.ok(!(CAMPAIGN_ITEMS as readonly string[]).includes(plan.id), plan.id);
  assert.ok(!(CAMPAIGN_ITEMS as readonly string[]).includes("solo"));
  assert.equal(MAX_CAMPAIGN_OFF, 0.25);
});

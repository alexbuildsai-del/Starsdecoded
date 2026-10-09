/**
 * The shared step list (R17-24), the one list of the Owner's flow that both walks run. Pinned: unique ids in the
 * plan's order, a reason on every local step and on no other, reads that name a stored step listed earlier, the
 * staging walk's map equal to the steps that are not local, and, with no seed yet, a deploy's walk running only the
 * steps that need no stored report (reading 11).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { SeedStep } from "../lib/qaPair.js";
import { STAGING_STEP_IDS, STEPS, STEP_IDS, mapProblem, seedsFor, type StoredStepId } from "./steps.js";

// The staging walk's map loads the QA pair's module, which reads the database's settings; nothing here queries it.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { STAGING_STEPS } = await import("../lib/qaWalk/steps.js");

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
// A stored step the seed holds no report for would wait for good on every deploy, so typecheck holds the two together.
const everyStoredStepHasASeed: Same<StoredStepId, SeedStep> = true;

test("the ids are unique and in the order the Owner walks them", () => {
  assert.equal(new Set(STEP_IDS).size, STEP_IDS.length);
  assert.deepEqual(STEP_IDS, [
    "sign-in", "buy", "own-report", "gift", "gift-claimed", "idris-report", "no-credit", "share", "share-back", "hanna-gift",
    "hanna-claims", "hanna-report", "pair", "pair-shared", "refund", "tomas-report", "tomas-pair", "tomas-sends", "tomas-claims",
    "timeline", "timeline-setup", "timeline-ends",
  ]);
  for (const step of STEPS) assert.ok(step.label.trim().length > 0, `${step.id} has no label`);
});

test("every local step says why staging skips it, and no other step has a reason", () => {
  for (const step of STEPS) {
    const reason = "reason" in step ? step.reason : undefined;
    if (step.staging === "local") assert.ok(reason && reason.trim().length > 0, `${step.id} is local with no reason`);
    else assert.equal(reason, undefined, `${step.id} is ${step.staging} and carries a reason`);
  }
  assert.deepEqual(
    STEPS.filter((step) => step.staging === "local").map((step) => step.id),
    ["hanna-gift", "hanna-claims", "hanna-report", "tomas-report", "tomas-pair", "tomas-sends", "tomas-claims", "timeline-setup"],
  );
});

test("a step reads only the reports of stored steps listed before it", () => {
  assert.equal(everyStoredStepHasASeed, true);
  for (const [at, step] of STEPS.entries()) {
    for (const read of "reads" in step ? step.reads : []) {
      const source = STEPS.findIndex((candidate) => candidate.id === read);
      assert.ok(source >= 0 && source < at, `${step.id} reads ${read}, which is not listed before it`);
      assert.equal(STEPS[source].staging, "stored", `${step.id} reads ${read}, which writes no report`);
    }
  }
});

test("the staging walk runs every step that is not local, in the list's order", () => {
  assert.deepEqual(
    STAGING_STEP_IDS,
    STEP_IDS.filter((id) => STEPS.find((step) => step.id === id)?.staging !== "local"),
  );
  assert.equal(STAGING_STEP_IDS.length, 14);
});

test("the staging walk's map has exactly the steps that are not local", () => {
  assert.equal(mapProblem(STAGING_STEPS, STAGING_STEP_IDS), null);
  assert.deepEqual(Object.keys(STAGING_STEPS).sort(), [...STAGING_STEP_IDS].sort());
});

test("a map that lacks a step, or has one the list doesn't, is refused with both named", () => {
  const map = Object.fromEntries(STEP_IDS.map((id) => [id, null]));
  assert.equal(mapProblem(map, STEP_IDS), null);
  const { refund: _refund, ...lacking } = map;
  assert.equal(mapProblem(lacking, STEP_IDS), "the walk and the step list differ: the walk has no refund");
  assert.equal(
    mapProblem({ ...lacking, "an-extra-step": null }, STEP_IDS),
    "the walk and the step list differ: the walk has no refund; the list has no an-extra-step",
  );
});

test("with no seed yet, a deploy's walk runs the sign-in, the buy, the gift, its claim and the refund, and the rest of staging's wait with the seed", () => {
  const ready = STAGING_STEP_IDS.filter((id) => seedsFor(id).length === 0);
  assert.deepEqual(ready, ["sign-in", "buy", "gift", "gift-claimed", "refund"]);
  assert.deepEqual(seedsFor("no-credit"), ["idris-report"]);
  assert.deepEqual(seedsFor("own-report"), ["own-report"]);
  assert.deepEqual(seedsFor("share"), ["own-report"]);
  assert.deepEqual(seedsFor("share-back"), ["idris-report"]);
  assert.deepEqual(seedsFor("pair"), ["pair", "own-report", "idris-report"]);
  assert.deepEqual(seedsFor("pair-shared"), ["pair", "own-report", "idris-report"]);
  assert.deepEqual(seedsFor("timeline"), ["own-report"]);
  assert.deepEqual(seedsFor("timeline-ends"), ["own-report"]);
});

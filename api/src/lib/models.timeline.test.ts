/**
 * Timeline's two model jobs (R16-22, MB-190 provisional): readings and Ask are catalogue ids with a price, run at the
 * standard tier whatever a caller asks (Flex is the lab's discount, never a reader's wait), and added without moving
 * any job that was there.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MODELS, completionCap, effortFor, flexOffered, isModelId, priceOf, tierFor } from "./models.js";

test("each new job names a model the catalogue prices, by an id the type guard accepts", () => {
  for (const job of ["timelineReading", "ask"] as const) {
    assert.ok(job in MODELS, job);
    assert.ok(isModelId(MODELS[job]), `${job}: ${MODELS[job]}`);
    assert.ok(priceOf(MODELS[job]), `${job} is priced`);
  }
  assert.equal(isModelId("gpt-6-unreleased"), false);
  assert.equal(isModelId("constructor"), false);
  assert.equal(isModelId(""), false);
});

test("a reader's call never runs on Flex, even where the model offers it and a caller asks", () => {
  for (const job of ["timelineReading", "ask"] as const) {
    const model = MODELS[job];
    assert.equal(tierFor(model, "flex"), flexOffered(model) ? "flex" : "standard", `${job}`);
    assert.equal(tierFor(model, undefined), "standard", `${job} asked for nothing`);
    assert.equal(tierFor(model, "standard"), "standard");
  }
  assert.equal(flexOffered(MODELS.ask), false, "Ask's model has no Flex tier, so a slow queue can never hold a reader's message");
});

test("the new jobs reason at none and keep their visible cap, as every other job does", () => {
  for (const job of ["timelineReading", "ask"] as const) {
    assert.equal(effortFor(MODELS[job]), "none", job);
    assert.equal(completionCap(MODELS[job], 1_000), 1_000, job);
    assert.equal(completionCap(MODELS[job], 700), 700, job);
  }
});

test("the jobs before these two are where ADR-184 left them", () => {
  assert.equal(MODELS.foundation, "gpt-6-sol");
  assert.equal(MODELS.sections, "gpt-6-luna");
  assert.equal(MODELS.studyNotes, "gpt-6-luna");
  assert.equal(Object.keys(MODELS).length, 8);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE, MODELS, SECTION_MODELS, modelFor, priceOf } from "./models.js";

test("every job points at a model the catalogue prices", () => {
  for (const [job, model] of Object.entries(MODELS)) {
    assert.ok(priceOf(model), `${job} points at unpriced ${model}`);
  }
});

test("every price is positive and cached input is cheaper than fresh", () => {
  for (const [model, p] of Object.entries(CATALOGUE)) {
    assert.ok(p.input > 0 && p.cachedInput > 0 && p.output > 0, `${model} has a non-positive price`);
    assert.ok(p.cachedInput < p.input, `${model} prices cached input at or above fresh`);
    assert.ok(p.output > p.input, `${model} prices output at or below input`);
  }
});

test("a section with no override uses the sections default, prefix or not", () => {
  assert.equal(modelFor("natal:overview"), MODELS.sections);
  assert.equal(modelFor("overview"), MODELS.sections);
});

test("an override wins for that section only", () => {
  const original = SECTION_MODELS.superpowers;
  try {
    SECTION_MODELS.superpowers = "gpt-5-mini";
    assert.equal(modelFor("natal:superpowers"), "gpt-5-mini");
    assert.equal(modelFor("natal:overview"), MODELS.sections);
  } finally {
    if (original === undefined) delete SECTION_MODELS.superpowers;
    else SECTION_MODELS.superpowers = original;
  }
});

test("an override names a catalogued model", () => {
  for (const [id, model] of Object.entries(SECTION_MODELS)) {
    if (model) assert.ok(priceOf(model), `${id} overrides to unpriced ${model}`);
  }
});

test("an uncatalogued model has no price, so stored runs naming one stay honest", () => {
  assert.equal(priceOf("gpt-6-unreleased"), undefined);
});

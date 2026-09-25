import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE, MODELS, SECTION_MODELS, effortFor, isModelId, modelFor, priceOf, tierFor, type ModelId } from "./models.js";

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

test("every entry pins its reasoning effort and says whether Flex is offered (ADR-74, ADR-77)", () => {
  for (const [model, p] of Object.entries(CATALOGUE)) {
    assert.ok(["none", "minimal", "low", "medium", "high"].includes(p.reasoningEffort), `${model} pins no effort`);
    assert.equal(typeof p.flex, "boolean", `${model} does not say whether Flex is offered`);
  }
  assert.equal(effortFor("gpt-5.2"), "none");
  assert.equal(effortFor("gpt-6-sol"), "none");
  assert.equal(effortFor("gpt-6-luna"), "none");
  assert.equal(effortFor("gpt-5-mini"), "minimal", "mini rejects none");
  assert.equal(effortFor("gpt-5-nano"), "minimal");
});

test("the GPT-6 candidates enter at ADR-74's press prices, provisional until MB-70 checks them", () => {
  assert.deepEqual([CATALOGUE["gpt-6-sol"].input, CATALOGUE["gpt-6-sol"].cachedInput, CATALOGUE["gpt-6-sol"].output], [2.0, 0.2, 10.0]);
  assert.deepEqual([CATALOGUE["gpt-6-luna"].input, CATALOGUE["gpt-6-luna"].cachedInput, CATALOGUE["gpt-6-luna"].output], [0.1, 0.01, 0.5]);
  assert.equal(CATALOGUE["gpt-6-sol"].checked, "");
  assert.equal(CATALOGUE["gpt-6-luna"].checked, "");
  assert.equal(CATALOGUE["gpt-5.2"].checked, "2026-09-16");
});

test("the jobs still run on gpt-5.2: MODELS and SECTION_MODELS did not move", () => {
  assert.deepEqual(MODELS, { foundation: "gpt-5.2", sections: "gpt-5.2", scenes: "gpt-5.2", synastry: "gpt-5.2", vocabulary: "gpt-5.2", qa: "gpt-5.2", studyNotes: "gpt-6-luna" });
  assert.deepEqual(SECTION_MODELS, {});
});

test("a lab tier resolves to Flex only where the model offers it", () => {
  assert.equal(tierFor("gpt-5.2", "flex"), "standard");
  assert.equal(tierFor("gpt-5.2", "standard"), "standard");
  assert.equal(tierFor("gpt-5.2", undefined), "standard");
  assert.equal(isModelId("gpt-6-luna"), true);
  assert.equal(isModelId("gpt-6-unreleased"), false);
});

test("an id outside the catalogue does not compile", () => {
  // @ts-expect-error a model with no price on record is not a ModelId
  const outside: ModelId = "gpt-6-unreleased";
  assert.equal(priceOf(outside), undefined);
});

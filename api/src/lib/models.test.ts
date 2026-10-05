import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE, MODELS, SECTION_MODELS, completionCap, effortFor, isModelId, modelFor, priceOf, qaAgentModel, thinkingAllowance, tierFor, type ModelId } from "./models.js";

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
  assert.equal(effortFor("gpt-6.1-sol"), "low", "6.1 Sol accepts nothing below low");
});

test("gpt-6.1-sol enters at the press prices of 2026-09-29 with Flex, provisional until MB-70 checks it", () => {
  const p = CATALOGUE["gpt-6.1-sol"];
  assert.deepEqual([p.input, p.cachedInput, p.output], [2.0, 0.1, 10.0]);
  assert.equal(p.checked, "");
  assert.equal(tierFor("gpt-6.1-sol", "flex"), "flex");
  assert.equal(tierFor("gpt-6.1-sol", "standard"), "standard");
});

test("a model that thinks gets room above the visible cap and an allowance in estimates; one at none or minimal gets neither", () => {
  assert.equal(completionCap("gpt-6.1-sol", 4_000), 12_000);
  assert.equal(thinkingAllowance("gpt-6.1-sol"), 1_000);
  for (const model of ["gpt-5.2", "gpt-6-sol", "gpt-6-luna", "gpt-5-mini", "gpt-5-nano"] as const) {
    assert.equal(completionCap(model, 4_000), 4_000, `${model} keeps its cap`);
    assert.equal(thinkingAllowance(model), 0, `${model} adds no thinking`);
  }
  assert.equal(thinkingAllowance("gpt-6-unreleased"), 0);
});

test("the GPT-6 writers keep ADR-74's press prices, provisional until MB-70 checks them (ADR-165)", () => {
  assert.deepEqual([CATALOGUE["gpt-6-sol"].input, CATALOGUE["gpt-6-sol"].cachedInput, CATALOGUE["gpt-6-sol"].output], [2.0, 0.2, 10.0]);
  assert.deepEqual([CATALOGUE["gpt-6-luna"].input, CATALOGUE["gpt-6-luna"].cachedInput, CATALOGUE["gpt-6-luna"].output], [0.1, 0.01, 0.5]);
  assert.equal(CATALOGUE["gpt-6-sol"].checked, "");
  assert.equal(CATALOGUE["gpt-6-luna"].checked, "");
  assert.equal(CATALOGUE["gpt-5.2"].checked, "2026-09-16");
});

test("production runs mix B (ADR-184): Sol on both foundations, the QA agent and the vocabulary, Luna on every other prose call but Ask's", () => {
  // No `scenes` job: p3 writes one fixed scene a chapter inside the chapter's own call (ADR-176).
  assert.deepEqual(MODELS, {
    foundation: "gpt-6-sol", sections: "gpt-6-luna", synastry: "gpt-6-luna", vocabulary: "gpt-6-sol", qa: "gpt-6-sol", studyNotes: "gpt-6-luna",
    timelineReading: "gpt-6-luna", ask: "gpt-5.2",
  });
  assert.deepEqual(SECTION_MODELS, {});
  assert.equal(modelFor("natal:triad"), "gpt-6-luna");
  assert.equal(modelFor("houses"), "gpt-6-luna");
});

test("Timeline's jobs (MB-190): readings on Luna, both of Ask's calls on gpt-5.2, the model its cap was costed on", () => {
  assert.equal(MODELS.timelineReading, "gpt-6-luna");
  assert.equal(MODELS.ask, "gpt-5.2");
  assert.equal(CATALOGUE[MODELS.ask].checked, "2026-09-16", "Ask's price is one checked on OpenAI's page");
});

test("every job runs at effort none, so no call gets thinking room and no estimate adds thinking", () => {
  for (const [job, model] of Object.entries(MODELS)) {
    assert.equal(effortFor(model), "none", `${job} runs ${model} at ${effortFor(model)}`);
    assert.equal(completionCap(model, 4_000), 4_000, `${job} keeps its visible cap`);
    assert.equal(thinkingAllowance(model), 0, `${job} adds no thinking to an estimate`);
  }
});

test("the catalogue keeps gpt-5.2, the lab's control, and every price as entered", () => {
  const prices = Object.fromEntries(Object.entries(CATALOGUE).map(([id, p]) => [id, [p.input, p.cachedInput, p.output]]));
  assert.deepEqual(prices, {
    "gpt-5.2": [1.75, 0.175, 14.0],
    "gpt-5-mini": [0.25, 0.025, 2.0],
    "gpt-5-nano": [0.05, 0.005, 0.4],
    "gpt-6-sol": [2.0, 0.2, 10.0],
    "gpt-6-luna": [0.1, 0.01, 0.5],
    "gpt-6.1-sol": [2.0, 0.1, 10.0],
  });
});

test("QA_AGENT_MODEL still overrides the QA agent's Sol, with a catalogued id only", () => {
  assert.equal(qaAgentModel({}), "gpt-6-sol");
  assert.equal(qaAgentModel({ QA_AGENT_MODEL: "gpt-5.2" }), "gpt-5.2", "the way back if Sol takes no screenshots");
  assert.equal(qaAgentModel({ QA_AGENT_MODEL: " gpt-6-luna " }), "gpt-6-luna");
  assert.equal(qaAgentModel({ QA_AGENT_MODEL: "gpt-6-unreleased" }), "gpt-6-sol");
  assert.equal(qaAgentModel({ QA_AGENT_MODEL: "" }), "gpt-6-sol");
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

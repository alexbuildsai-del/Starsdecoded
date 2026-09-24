/**
 * The lab's engine hook without the model (ADR-52, ADR-74, ADR-77): the
 * pinned effort rides on every call, the tier only on request, Flex is
 * refused where the catalogue says no, and an out-of-credit 429 throws
 * without a retry.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel, type FakeRequest } from "./testModel.js";

const { openai } = await import("@workspace/integrations-openai-ai-server");
const { callStructured, generateInterpretation, writeSection, OutOfCreditError, SectionError } = await import("./aiInterpretation.js");
const { CATALOGUE, MODELS } = await import("./models.js");
const { z } = await import("zod/v4");

type PinnedRequest = FakeRequest & { model: string; reasoning_effort?: string; service_tier?: string };

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const seen: PinnedRequest[] = [];
const target = openai.chat.completions as unknown as { create: (req: PinnedRequest) => Promise<unknown> };
const canned = target.create;
target.create = async (req: PinnedRequest) => { seen.push(req); return canned(req); };

const chart = chartFromFixture("marie-curie");

test("the customer path sends the pinned effort on every call and never a service tier", async () => {
  seen.length = 0;
  await generateInterpretation(chart, "Marie Curie");
  assert.ok(seen.length >= 12);
  for (const req of seen) {
    assert.equal(req.reasoning_effort, CATALOGUE[MODELS.sections].reasoningEffort);
    assert.equal(req.service_tier, undefined);
  }
});

test("writeSection writes a foundation with no foundation argument, and a section against one", async () => {
  seen.length = 0;
  const foundation = await writeSection("natal:foundation", chart, "Marie Curie", undefined, { model: "gpt-5.2" });
  assert.equal(seen[0].model, "gpt-5.2");
  assert.equal(foundation.usage.section, "natal:foundation");
  const career = await writeSection("natal:career", chart, "Marie Curie", JSON.stringify(foundation.data), { model: "gpt-5-mini" });
  assert.equal(seen[1].model, "gpt-5-mini");
  assert.equal(seen[1].reasoning_effort, "minimal", "mini rejects none, so it pins minimal");
  assert.match(seen[1].messages[1].content, /FOUNDATION \(internal editorial handoff/);
  const claims = (career.data as { claims: Array<{ evidence: Array<{ label: string }> }> }).claims;
  assert.ok(claims[0].evidence[0].label, "claims come back in their stored, labelled form");
  await assert.rejects(() => writeSection("natal:career", chart, "Marie Curie", undefined, { model: "gpt-5.2" }), /needs a foundation/);
});

test("Flex is refused where the catalogue says the model does not offer it, and sent only where it does", async () => {
  seen.length = 0;
  await assert.rejects(
    () => writeSection("natal:foundation", chart, "Marie Curie", undefined, { model: "gpt-5.2", serviceTier: "flex" }),
    (err: unknown) => err instanceof SectionError && /Flex/.test(err.message),
  );
  assert.equal(seen.length, 0, "refused before any call");
  const entry = CATALOGUE["gpt-5-nano"] as { flex: boolean };
  const was = entry.flex;
  entry.flex = true;
  try {
    const out = await writeSection("natal:foundation", chart, "Marie Curie", undefined, { model: "gpt-5-nano", serviceTier: "flex" });
    assert.equal(seen[0].service_tier, "flex");
    assert.equal(out.usage.serviceTier, "flex");
    await writeSection("natal:foundation", chart, "Marie Curie", undefined, { model: "gpt-5-nano" });
    assert.equal(seen[1].service_tier, undefined, "standard sends no tier");
  } finally {
    entry.flex = was;
  }
});

test("an insufficient_quota 429 throws OutOfCreditError after one call, with no retry", async () => {
  const before = target.create;
  let calls = 0;
  target.create = async () => {
    calls++;
    throw Object.assign(new Error("429 You have no credits remaining"), { status: 429, code: "insufficient_quota" });
  };
  try {
    await assert.rejects(
      () => callStructured({ usageKey: "natal:career", model: "gpt-5.2", system: "s", user: "u", schema: z.object({ a: z.string() }), maxTokens: 100 }),
      (err: unknown) => err instanceof OutOfCreditError && err.key === "natal:career",
    );
    assert.equal(calls, 1);
  } finally {
    target.create = before;
  }
});

test("a rate-limit 429 that is not out of credit is not turned into OutOfCreditError", async () => {
  const before = target.create;
  target.create = async () => { throw Object.assign(new Error("Rate limit reached"), { status: 429, code: "rate_limit_exceeded" }); };
  try {
    await assert.rejects(
      () => callStructured({ usageKey: "natal:career", model: "gpt-5.2", system: "s", user: "u", schema: z.object({ a: z.string() }), maxTokens: 100 }),
      (err: unknown) => !(err instanceof OutOfCreditError) && /Rate limit/.test((err as Error).message),
    );
  } finally {
    target.create = before;
  }
});

test.after(() => fake.restore());

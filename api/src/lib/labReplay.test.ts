/**
 * The replay job against memory (MB-49): the budget refusal at
 * LAB_BUDGET_USD=0, the stop at the first out-of-credit failure, the
 * foundation written first and handed to the sections after it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { InsertLabRun } from "@workspace/db";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";

const { OutOfCreditError, generateInterpretation, writeSection } = await import("./aiInterpretation.js");
const { BudgetError, FALLBACK_SHAPE, budgetUsd, estimateReplayUsd, runReplayJob, startReplay } = await import("./labReplay.js");
type ReplayBase = import("./labReplay.js").ReplayBase;
type ReplayStore = import("./labReplay.js").ReplayStore;

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const chart = chartFromFixture("marie-curie");
const stored = await generateInterpretation(chart, "Marie Curie");

const base: ReplayBase = {
  fixture: "marie-curie", label: "r06", baseRunKey: "marie-curie.r06", baseReportId: null, chart, subjectName: "Marie Curie",
  foundation: stored.foundation, shapes: {}, rowIds: {},
};

function memoryStore(spent = 0): ReplayStore & { rows: Map<string, InsertLabRun> } {
  const rows = new Map<string, InsertLabRun>();
  return {
    rows,
    async loadBase() { return base; },
    async spentUsd() { return spent; },
    async insert(list) { for (const r of list) rows.set(r.id, r); },
    async update(id, patch) { rows.set(id, { ...rows.get(id)!, ...patch }); },
  };
}

test("LAB_BUDGET_USD reads with a default of 15 and refuses at 0 before any row is queued", async () => {
  assert.equal(budgetUsd({}), 15);
  assert.equal(budgetUsd({ LAB_BUDGET_USD: "3.5" }), 3.5);
  assert.equal(budgetUsd({ LAB_BUDGET_USD: "nonsense" }), 15);
  const store = memoryStore(0);
  await assert.rejects(
    () => startReplay({ baseRunKey: "marie-curie.r06", model: "gpt-5.2", sections: ["career"] }, store, null, { LAB_BUDGET_USD: "0" }),
    (err: unknown) => err instanceof BudgetError && err.budgetUsd === 0 && err.spentUsd === 0 && err.estimateUsd > 0,
  );
  assert.equal(store.rows.size, 0);
  const est = estimateReplayUsd(base, "gpt-5.2", ["career"]);
  assert.ok(est > 0.01 && est < 0.05, `a career replay prices near the R05 mean, got ${est}`);
  assert.equal(estimateReplayUsd(base, "gpt-5.2", ["career"], "flex"), est, "gpt-5.2 offers no Flex, so the tier resolves to standard");
  assert.deepEqual(Object.keys(FALLBACK_SHAPE), ["inputTokens", "cachedInputTokens", "outputTokens"]);
});

test("a replay writes the foundation first and the sections against it, one done row per section, with no credit and no report", async () => {
  const store = memoryStore(0);
  const started = await startReplay({ baseRunKey: "marie-curie.r06", model: "gpt-5-mini", sections: ["career", "foundation", "money"], serviceTier: "flex" }, store, null, { LAB_BUDGET_USD: "15" });
  assert.match(started.runKey, /^replay:/);
  assert.deepEqual(started.rows.map((r) => r.section), ["foundation", "career", "money"]);
  assert.equal(started.rows[0].serviceTier, "standard", "mini offers no Flex until MB-70");
  assert.equal(started.rows[0].reasoningEffort, "minimal");
  const seen: Array<{ key: string; foundation: string | undefined }> = [];
  await runReplayJob(started, { baseRunKey: "marie-curie.r06", model: "gpt-5-mini", sections: ["career", "foundation", "money"] }, store, {
    write: async (key, c, name, foundationJson, options) => { seen.push({ key, foundation: foundationJson }); return writeSection(key, c, name, foundationJson, options); },
  });
  assert.equal(seen[0].key, "natal:foundation");
  assert.equal(seen[0].foundation, undefined);
  assert.ok(seen[1].foundation?.includes("chartThesis"), "the sections write against the foundation just written");
  const rows = [...store.rows.values()];
  assert.ok(rows.every((r) => r.status === "done"), rows.map((r) => `${r.section}:${r.status}:${r.error}`).join(" "));
  const career = rows.find((r) => r.section === "career")!;
  assert.ok(career.words! > 0);
  assert.equal(typeof career.costUsd, "number");
  assert.deepEqual(career.faults, []);
  assert.equal(career.source, "replay");
});

test("out of credit stops the job after one section and names it on every row still queued", async () => {
  const store = memoryStore(0);
  const started = await startReplay({ baseRunKey: "marie-curie.r06", model: "gpt-5.2", sections: ["career", "money", "mind"] }, store, null, { LAB_BUDGET_USD: "15" });
  let calls = 0;
  await runReplayJob(started, { baseRunKey: "marie-curie.r06", model: "gpt-5.2", sections: ["career", "money", "mind"], retryOnce: true }, store, {
    write: async () => { calls++; throw new OutOfCreditError("natal:career", "429 You have no credits remaining"); },
  });
  assert.equal(calls, 1, "no retry, no second section");
  const rows = started.rows.map((r) => store.rows.get(r.id)!);
  assert.ok(rows.every((r) => r.status === "failed"));
  assert.match(rows[0].error!, /out of credit/);
  assert.match(rows[1].error!, /^stopped: /);
  assert.match(rows[2].error!, /^stopped: /);
});

test("any other failure fails its own row, after one more try when asked, and the job goes on", async () => {
  const store = memoryStore(0);
  const started = await startReplay({ baseRunKey: "marie-curie.r06", model: "gpt-5.2", sections: ["career", "money"] }, store, null, { LAB_BUDGET_USD: "15" });
  let calls = 0;
  await runReplayJob(started, { baseRunKey: "marie-curie.r06", model: "gpt-5.2", sections: ["career", "money"], retryOnce: true }, store, {
    write: async (key, c, name, f, o) => { calls++; if (key === "natal:career") throw new Error("simulated outage"); return writeSection(key, c, name, f, o); },
  });
  assert.equal(calls, 3, "career twice, money once");
  const [career, money] = started.rows.map((r) => store.rows.get(r.id)!);
  assert.equal(career.status, "failed");
  assert.equal(career.error, "simulated outage");
  assert.equal(money.status, "done");
});

test.after(() => fake.restore());

import { test } from "node:test";
import assert from "node:assert/strict";
import { planPromptSync, type PromptSyncRow } from "./promptSync.js";

const at = new Date("2026-09-10T10:00:00Z");

function row(promptKey: string, overrides: Partial<PromptSyncRow> = {}): PromptSyncRow {
  return {
    promptKey,
    category: "natal",
    subcategory: "section",
    systemPrompt: "system",
    userPrompt: "user",
    updatedAt: at,
    ...overrides,
  };
}

test("a key only on the source is inserted", () => {
  const plan = planPromptSync([row("a"), row("b")], [row("a")]);
  assert.deepEqual(plan.upserts.map((r) => r.promptKey), ["b"]);
  assert.deepEqual(plan.deletes, []);
  assert.equal(plan.unchanged, 1);
});

test("changed text is upserted", () => {
  const plan = planPromptSync([row("a", { userPrompt: "new" })], [row("a")]);
  assert.deepEqual(plan.upserts.map((r) => r.promptKey), ["a"]);
  assert.equal(plan.unchanged, 0);
});

test("a newer updatedAt alone is enough to rewrite the row", () => {
  const later = new Date(at.getTime() + 1000);
  const plan = planPromptSync([row("a", { updatedAt: later })], [row("a")]);
  assert.equal(plan.upserts.length, 1);
});

test("an identical row is left alone", () => {
  const plan = planPromptSync([row("a")], [row("a")]);
  assert.deepEqual(plan.upserts, []);
  assert.deepEqual(plan.deletes, []);
  assert.equal(plan.unchanged, 1);
});

test("a key removed on the source is deleted on the target", () => {
  const plan = planPromptSync([row("a")], [row("a"), row("stale")]);
  assert.deepEqual(plan.deletes, ["stale"]);
});

test("an empty target receives every source row", () => {
  const plan = planPromptSync([row("a"), row("b")], []);
  assert.deepEqual(plan.upserts.map((r) => r.promptKey), ["a", "b"]);
  assert.deepEqual(plan.deletes, []);
  assert.equal(plan.unchanged, 0);
});

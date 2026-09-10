import { test } from "node:test";
import assert from "node:assert/strict";
import { planPromptSync, sameDatabase, type PromptSyncRow } from "./promptSync.js";

const pooler = "aws-0-eu-central-1.pooler.supabase.com:5432";

test("two Supabase projects behind one pooler host are different databases", () => {
  assert.equal(
    sameDatabase(`postgresql://postgres.stagingref:a@${pooler}/postgres`, `postgresql://postgres.prodref:b@${pooler}/postgres`),
    false,
  );
});

test("the same project with a different password is the same database", () => {
  assert.equal(
    sameDatabase(`postgresql://postgres.prodref:a@${pooler}/postgres`, `postgresql://postgres.prodref:b@${pooler}/postgres`),
    true,
  );
});

test("an identical string is the same database even when it does not parse", () => {
  assert.equal(sameDatabase("not a url", "not a url"), true);
  assert.equal(sameDatabase("not a url", "another"), false);
});

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

import { test } from "node:test";
import assert from "node:assert/strict";
import { readAppEnv, readCommitSha, readPromptsReadOnly } from "./appEnv.js";

test("APP_ENV wins over the Railway environment name", () => {
  assert.equal(readAppEnv({ APP_ENV: "staging", RAILWAY_ENVIRONMENT_NAME: "production" }), "staging");
});

test("falls back to the Railway environment name", () => {
  assert.equal(readAppEnv({ RAILWAY_ENVIRONMENT_NAME: "production" }), "production");
});

test("unknown values resolve to development", () => {
  assert.equal(readAppEnv({ APP_ENV: "prod" }), "development");
  assert.equal(readAppEnv({ RAILWAY_ENVIRONMENT_NAME: "pr-42" }), "development");
  assert.equal(readAppEnv({}), "development");
});

test("commit sha is null when Railway did not inject one", () => {
  assert.equal(readCommitSha({}), null);
  assert.equal(readCommitSha({ RAILWAY_GIT_COMMIT_SHA: "" }), null);
  assert.equal(readCommitSha({ RAILWAY_GIT_COMMIT_SHA: "abc123" }), "abc123");
});

test("prompts are read-only only on the literal string true", () => {
  assert.equal(readPromptsReadOnly({ PROMPTS_READ_ONLY: "true" }), true);
  assert.equal(readPromptsReadOnly({ PROMPTS_READ_ONLY: "1" }), false);
  assert.equal(readPromptsReadOnly({}), false);
});

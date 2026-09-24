import { test } from "node:test";
import assert from "node:assert/strict";
import { bearerMatches, labActor } from "./labGuard.js";

const TOKEN = "a-random-secret-of-thirty-two-chars!";

test("the bearer path admits the exact token and nothing near it", () => {
  assert.equal(bearerMatches(`Bearer ${TOKEN}`, TOKEN), true);
  assert.equal(bearerMatches(`bearer ${TOKEN}`, TOKEN), true);
  assert.equal(bearerMatches(`Bearer ${TOKEN}x`, TOKEN), false);
  assert.equal(bearerMatches(`Bearer ${TOKEN.slice(1)}`, TOKEN), false);
  assert.equal(bearerMatches(TOKEN, TOKEN), false, "the scheme is required");
  assert.equal(bearerMatches(undefined, TOKEN), false);
});

test("without LAB_TOKEN set, or with a short one, the bearer door is shut", () => {
  assert.equal(bearerMatches("Bearer anything", undefined), false);
  assert.equal(bearerMatches("Bearer short", "short"), false);
});

test("the actor is the Clerk admin first, the token second, and nobody else", () => {
  const env = { ADMIN_USER_ID: "user_admin", LAB_TOKEN: TOKEN };
  assert.deepEqual(labActor({ userId: "user_admin", authorization: undefined }, env), { kind: "admin", userId: "user_admin" });
  assert.deepEqual(labActor({ userId: "user_other", authorization: `Bearer ${TOKEN}` }, env), { kind: "token" });
  assert.equal(labActor({ userId: "user_other", authorization: undefined }, env), null);
  assert.equal(labActor({ userId: null, authorization: `Bearer ${TOKEN}` }, { ADMIN_USER_ID: "user_admin" }), null, "no LAB_TOKEN, no bearer path");
});

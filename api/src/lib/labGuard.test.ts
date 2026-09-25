import { test } from "node:test";
import assert from "node:assert/strict";
import { labActor } from "./labGuard.js";

test("the actor is the Clerk admin and nobody else; a bearer header opens nothing (ADR-86)", () => {
  const env = { ADMIN_USER_ID: "user_admin" };
  assert.deepEqual(labActor({ userId: "user_admin" }, env), { kind: "admin", userId: "user_admin" });
  assert.equal(labActor({ userId: "user_other" }, env), null);
  assert.equal(labActor({ userId: null, authorization: "Bearer a-random-secret-of-thirty-two-chars!" }, env), null);
  assert.equal(labActor({ userId: "user_admin" }, {}), null, "no ADMIN_USER_ID, no admin");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { CreateProfileBody } from "@workspace/api-zod";
import { VALIDATION_LINE, validationFailure } from "./validation.js";

test("a failed body answers one plain line, with the issues apart from it", () => {
  const parsed = CreateProfileBody.safeParse({ name: " ", birthDate: 3 });
  assert.ok(!parsed.success);
  const body = validationFailure(parsed.error);
  assert.equal(body.error, "validation_error");
  assert.equal(body.message, VALIDATION_LINE);
  assert.ok(!body.message.includes("["), "the message is not a stringified issue array");
  assert.ok(body.issues.length > 0);
  assert.ok(body.issues.every((issue) => typeof issue.path === "string" && typeof issue.message === "string"));
});

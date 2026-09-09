import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldDeleteProfile } from "./deletion.js";

test("an orphaned profile is deleted with its last report", () => {
  assert.equal(shouldDeleteProfile({ otherReportCount: 0, relationshipParticipantCount: 0 }), true);
});

test("a profile with a second report survives", () => {
  assert.equal(shouldDeleteProfile({ otherReportCount: 1, relationshipParticipantCount: 0 }), false);
});

test("a profile in a relationship survives", () => {
  assert.equal(shouldDeleteProfile({ otherReportCount: 0, relationshipParticipantCount: 1 }), false);
});

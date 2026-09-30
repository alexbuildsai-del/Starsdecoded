import { test } from "node:test";
import assert from "node:assert/strict";
import { skyNow } from "./skyNow.js";

test("one city's sky is computed once a minute", () => {
  const first = skyNow("Europe/Brussels", new Date("2026-09-26T18:00:10Z"));
  assert.equal(skyNow("Europe/Brussels", new Date("2026-09-26T18:00:50Z")), first);
  assert.equal(first.at.toISOString(), "2026-09-26T18:00:00.000Z");
  assert.notEqual(skyNow("Europe/Brussels", new Date("2026-09-26T18:01:00Z")), first);
});

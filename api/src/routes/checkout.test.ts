import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { bundleKindForCount } = await import("./checkout.js");

test("checkout: a test count buys the bundle of the same size", () => {
  assert.equal(bundleKindForCount(1), "solo");
  assert.equal(bundleKindForCount(3), "couple");
  assert.equal(bundleKindForCount(5), "family");
});

test("checkout: a count no bundle defines matches nothing", () => {
  assert.equal(bundleKindForCount(2), undefined);
  assert.equal(bundleKindForCount(0), undefined);
});

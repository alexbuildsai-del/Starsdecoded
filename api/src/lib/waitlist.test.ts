import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter, clientKey, normaliseEmail, tag } from "./waitlist.js";

test("an address is stored one way whatever its case or spacing", () => {
  assert.equal(normaliseEmail("  Ada.Lovelace@Example.COM "), "ada.lovelace@example.com");
});

test("campaign tags keep their words and lose the rest", () => {
  assert.equal(tag("chatgpt.com"), "chatgpt.com");
  assert.equal(tag("spring launch"), "spring launch");
  assert.equal(tag("<script>x</script>"), "scriptxscript");
  assert.equal(tag("   "), null);
  assert.equal(tag(undefined), null);
  assert.equal(tag("hero-form", 4), "hero");
});

test("the client is the address Vercel forwards, else the socket's", () => {
  assert.equal(clientKey({ "x-vercel-forwarded-for": "203.0.113.7, 76.76.21.1" }, "76.76.21.1"), "203.0.113.7");
  assert.equal(clientKey({}, "198.51.100.2"), "198.51.100.2");
  assert.equal(clientKey({}, undefined), "unknown");
});

test("the limiter admits the limit in a window, then frees as it slides", () => {
  const limiter = new RateLimiter(2, 1000);
  assert.equal(limiter.take("a", 0), true);
  assert.equal(limiter.take("a", 100), true);
  assert.equal(limiter.take("a", 200), false);
  assert.equal(limiter.take("b", 200), true);
  assert.equal(limiter.take("a", 1001), true);
});

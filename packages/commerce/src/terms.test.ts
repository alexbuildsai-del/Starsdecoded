import { test } from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_TICK, REFUND_RULES } from "./terms";

test("terms: the checkout tick is R-6.6's sentence, byte for byte", () => {
  assert.equal(
    CHECKOUT_TICK,
    "Write each report as soon as I use a credit on it. I understand I can't cancel or get a refund for a credit once it's used.",
  );
  assert.match(CHECKOUT_TICK, /^[\x20-\x7e]+$/, "plain ASCII, so a curly apostrophe cannot slip in");
});

test("terms: there are three refund rules, each a whole sentence that reads on its own (ADR-143)", () => {
  assert.equal(REFUND_RULES.length, 3);
  for (const rule of REFUND_RULES) {
    assert.match(rule, /^[A-Z].*[.]$/, rule);
    assert.doesNotMatch(rule, /[;!–—]/, `house punctuation: ${rule}`);
  }
});

test("terms: the first rule keeps the 14 days, the second the automatic return, the third the discretion", () => {
  assert.match(REFUND_RULES[0], /14 days/);
  assert.match(REFUND_RULES[0], /haven't used/);
  assert.match(REFUND_RULES[1], /fails/);
  assert.match(REFUND_RULES[1], /automatically/);
  assert.match(REFUND_RULES[2], /may refund anyone/);
});

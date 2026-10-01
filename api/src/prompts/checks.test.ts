/**
 * The check vocabulary (ADR-81): every annex row has a rule, every rule a
 * class, and the helpers tell a block from the rest. chk-39 counts rule 13's
 * words on every structured call and only ever warns (ADR-185).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, block, blocking, buffered, clean, fixed, needsRepair, registerChecks, registerHits, repair, warned, type Check } from "./checks.js";
import { STYLE_CONTRACT } from "./system.js";

test("every annex row 1 to 39 has a rule, and the engine's four have row 0", () => {
  const rows = new Set(Object.values(RULES).map((r) => r.row));
  for (let n = 1; n <= 39; n++) assert.ok(rows.has(n), `row ${n} has no rule`);
  for (const id of ["chk-00-json", "chk-00-schema", "chk-00-truncated", "chk-00-refused"]) assert.equal(RULES[id].cls, "block");
  assert.equal(RULES["chk-21a"].cls, "block");
  assert.equal(RULES["chk-21b"].cls, "warn");
  // Still blocking after R08: rows 15, 18, 21a, 22, 24, 25, 30, 36.
  for (const id of ["chk-15", "chk-18", "chk-22", "chk-24", "chk-25", "chk-30", "chk-36"]) assert.equal(RULES[id].cls, "block", id);
  for (const id of ["chk-10", "chk-23", "chk-32"]) assert.equal(RULES[id].cls, "buffer", id);
  assert.equal(RULES["chk-09"].cls, "repair");
  assert.deepEqual(RULES["chk-39"], { row: 39, cls: "warn" });
});

test("helpers: only a block blocks, a repair asks for the claims call, clean carries no checks", () => {
  const checks = [fixed("chk-01", "cut"), warned("chk-19", "word"), buffered("chk-23", "13 words"), repair("chk-09", "two claims")];
  assert.deepEqual(blocking(checks), []);
  assert.equal(needsRepair(checks), true);
  assert.deepEqual(blocking([...checks, block("chk-18", "a score")]).map((c) => c.rule), ["chk-18"]);
  assert.deepEqual(clean({ a: 1 }), { output: { a: 1 }, checks: [] });
});

test("chk-39: one warn per list, every prose field read, claims skipped, no reader text in the message", () => {
  const section = {
    headline: "Good vibes and a red flag",
    text: "You are predisposed to wait. Your vibe is calm energy. You have the energy to finish what you start.",
    items: [{ action: "Say no once a week", why: "so you stop feeling toxic about it" }],
    claims: [{ quote: "You are predisposed to wait.", evidence: [] }],
  };
  assert.deepEqual(registerChecks(section), [
    warned("chk-39", "register too high: predisposed"),
    warned("chk-39", "register too low: vibe ×2, red flag, energy, toxic"),
  ]);
  const hits = registerHits(section);
  assert.equal(hits.length, 6, "the claim's quote is not counted again");
  assert.deepEqual(hits.find((h) => h.word === "predisposed"), { list: "high", word: "predisposed", sentence: "You are predisposed to wait." });
  assert.equal(hits.find((h) => h.word === "energy")!.sentence, "Your vibe is calm energy.");
  for (const c of registerChecks(section)) assert.doesNotMatch(c.message, /wait|calm|finish|feeling/);
});

test("chk-39 finds every listed word and its forms, and leaves the plain neighbours alone", () => {
  const words = (text: string) => registerHits({ text }).map((h) => h.word);
  assert.deepEqual(words("You are oriented toward the group, orientated to rules, and you hate a paradigm."), ["oriented to", "oriented to", "paradigm"]);
  assert.deepEqual(words("A predisposition, two proclivities and a false dichotomy."), ["predisposed", "proclivity", "dichotomy"]);
  assert.deepEqual(words("Lowkey, the vibing stops when red flags and main-character moments start. It feels toxic."), ["vibe", "toxic", "red flag", "lowkey", "main character"]);
  assert.deepEqual(words("You are disoriented, vibrant and intoxicated by a low-key evening."), []);
});

test("chk-39 counts energy as a mood and never as stamina", () => {
  const counted = (text: string) => registerHits({ text }).length;
  for (const mood of [
    "The energy in the room changes when you arrive.",
    "You give off big-sister energy.",
    "You match their energy too quickly.",
    "You run on fire and cardinal energy.",
    "You protect your energy at parties.",
    "The energy between you is easy.",
    "Then the energy shifts.",
  ]) assert.equal(counted(mood), 1, mood);
  for (const stamina of [
    "You have the energy to finish what you start.",
    "You burn off nervous energy by cleaning.",
    "Your energy dips by Thursday.",
    "You do not waste creative energy on small things.",
    "The energy bill is the one you pay.",
  ]) assert.equal(counted(stamina), 0, stamina);
});

test("rule 13's own model sentence passes the count", () => {
  const model = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("13."))!.match(/Model: "([^"]+)"$/)![1];
  assert.deepEqual(registerChecks({ text: model }), []);
});

test("chk-39 on a structured call: logged as a warn on the accepted attempt, the reply stands, no retry", async () => {
  const { installFakeModel } = await import("../lib/testModel.js");
  const { callStructured } = await import("../lib/aiInterpretation.js");
  const { MODELS } = await import("../lib/models.js");
  const { z } = await import("zod/v4");
  const text = "You lowkey hate a red flag. You are predisposed to wait it out.";
  const fake = installFakeModel({ natal_career: { text } });
  const logged: Array<{ checks: Check[]; final: boolean }> = [];
  try {
    const out = await callStructured({
      usageKey: "natal:career", model: MODELS.sections, system: "s", user: "u", schema: z.object({ text: z.string() }), maxTokens: 500,
      onChecks: (checks, event) => { logged.push({ checks, final: event.final }); },
    });
    assert.deepEqual(fake.calls, ["natal_career"], "a register word never buys a retry");
    assert.deepEqual(out.data, { text });
    const expected = [warned("chk-39", "register too high: predisposed"), warned("chk-39", "register too low: red flag, lowkey")];
    assert.deepEqual(out.checks, expected);
    assert.deepEqual(logged, [{ checks: expected, final: true }]);
  } finally {
    fake.restore();
  }
});

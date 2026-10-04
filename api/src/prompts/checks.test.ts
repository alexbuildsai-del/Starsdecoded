/**
 * The check vocabulary (ADR-81): every annex row has a rule, every rule a
 * class, and the helpers tell a block from the rest. chk-39 counts rule 13's
 * words on every structured call and only ever warns (ADR-185). chk-43 counts
 * the sentences that miss the writer's rule (ADR-257) and only ever warns.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, block, blocking, buffered, clean, fixed, needsRepair, plainChecks, plainCount, plainHits, registerChecks, registerHits, repair, warned, type Check } from "./checks.js";
import { SHARED_SYSTEM, SIMPLE_WORDS, STYLE_CONTRACT } from "./system.js";
import { PAIR_SYSTEM } from "./pair/index.js";
import { PROMPT_DEFAULTS } from "../lib/promptDefaults.js";

test("every annex row 1 to 43 has a rule, and the engine's four have row 0", () => {
  const rows = new Set(Object.values(RULES).map((r) => r.row));
  for (let n = 1; n <= 43; n++) assert.ok(rows.has(n), `row ${n} has no rule`);
  for (const id of ["chk-00-json", "chk-00-schema", "chk-00-truncated", "chk-00-refused"]) assert.equal(RULES[id].cls, "block");
  assert.equal(RULES["chk-21a"].cls, "block");
  assert.equal(RULES["chk-21b"].cls, "warn");
  // Still blocking after R08: rows 15, 18, 21a, 22, 24, 25, 30, 36.
  for (const id of ["chk-15", "chk-18", "chk-22", "chk-24", "chk-25", "chk-30", "chk-36"]) assert.equal(RULES[id].cls, "block", id);
  for (const id of ["chk-10", "chk-23", "chk-32"]) assert.equal(RULES[id].cls, "buffer", id);
  assert.equal(RULES["chk-09"].cls, "repair");
  assert.deepEqual(RULES["chk-39"], { row: 39, cls: "warn" });
  assert.deepEqual(RULES["chk-43"], { row: 43, cls: "warn" });
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

const RULE = "Simple words, everywhere. Write the way you'd talk to a friend across a table: everyday words, one idea per sentence, a reading level of grade 6 to 8. No metaphor or poetic phrase the reader has to decode, and no drama. If a sentence sounds deep, rewrite it until it sounds normal.";

test("the writer's rule is the spec's word for word, opens the contract, and every natal and pair system prompt carries it", () => {
  assert.equal(SIMPLE_WORDS, RULE);
  assert.equal(STYLE_CONTRACT.split("\n\n")[1], RULE, "after the contract's first line, before rule 1");
  for (const system of [SHARED_SYSTEM, PAIR_SYSTEM]) assert.equal(system.split(RULE).length, 2);
  const systems = PROMPT_DEFAULTS.filter((p) => p.systemPrompt !== null);
  assert.ok(systems.some((p) => p.key === "natal:foundation:system") && systems.some((p) => p.key === "pair:foundation:system"));
  for (const p of systems) assert.ok(p.systemPrompt!.includes(RULE), p.key);
});

const ideas = (text: string) => plainHits({ text }).hits.filter((h) => h.kind === "two ideas").map((h) => h.word);
const figures = (text: string) => plainHits({ text }).hits.filter((h) => h.kind === "metaphor").map((h) => h.word);

test("chk-43 finds two clauses in one sentence the way the audit split them, and leaves lists and labels alone", () => {
  for (const [text, word] of [
    ["Your report is on your dashboard, so you can tap anyone to see their chart.", "so"],
    ["It shows what you can try, and it never gives you a score.", "and"],
    ["There's no rising sign, and your Moon is somewhere in that range.", null],
    ["Lots of people only know roughly, and some don't know at all.", null],
    ["You keep composure in public, then pay the bill in private.", "then"],
    ["You open the path early, set a direction, and then improve your position.", "then"],
    ["You notice what is inefficient and you correct it immediately.", "and"],
    ["You want help but you won't ask for it.", "but"],
    ["You need solitude to reset, yet too much of it makes coming back harder.", "yet"],
    ["You call it closeness, while your actual desire goes quiet.", "while"],
    ["You can bet bigger than the facts warrant, or you can wait too long.", "or"],
    ["One pressure point repeats: you carry public responsibility alone.", "colon"],
  ] as const) assert.deepEqual(ideas(text), word ? [word] : [], text);
  for (const one of [
    "You keep a list for everything, even the weekend.",
    "You find out you were depleted after the work is finished.",
    "so you stop agreeing before you have thought about it",
    "You keep your keys, your phone, and your wallet in one place.",
    "You want to be recognised as yourself, not as a symbol, a role, or someone else's projection.",
    "Recognition matters, but only if it reflects actual competence.",
    "Behaviour check: You rewrite a message twice before sending it.",
    "Example: you will turn down a prestigious role if it would take over your home life.",
    "When you are tired, you go quiet.",
    "You have one rule: finish what you start.",
    RULE,
  ]) assert.deepEqual(ideas(one), [], one);
});

test("chk-43 finds a simile or a listed figure, and leaves the verb like, such as, a real room and plain words alone", () => {
  for (const [text, word] of [
    ["You plan your fun like a project.", "simile"],
    ["Your words land like a verdict.", "verdict"],
    ["You treat rest like a reward you have to earn.", "simile"],
    ["You need room to think before you answer.", "room to"],
    ["You read the room before you speak.", "read the room"],
    ["You get steadier by leaving room for quiet.", "make room"],
    ["Your growth edge is asking for help.", "growing edge"],
    ["What roots you now is a home that is simple.", "roots you"],
    ["Home can feel like a permeable space.", "permeable"],
    ["You carry the emotional weight alone.", "weight"],
    ["Private anger becomes fuel when you give it an outlet.", "fuel"],
  ] as const) assert.deepEqual(figures(text), [word], text);
  for (const plain of [
    "You like a plan before a trip.",
    "You'd like a quiet night after a busy week.",
    "Keep one friend outside the partnership, like a book club friend.",
    "You need a quiet room to work in.",
    "You need time to think before you answer.",
    "You watch your weight when work gets busy.",
    "You hold the door for people.",
  ]) assert.deepEqual(figures(plain), [], plain);
});

test("chk-43: one warn per kind with its count and the list's words, copied text and one-word fields skipped, no reader text in the message", () => {
  const section = {
    headline: "Quiet at work",
    text: "You plan the week on Sunday, and you stick to it. You read the room before you speak. You keep a list for everything. You plan your fun like a project, so you can relax.",
    items: [{ for: "A", action: "Say no once a week", why: "so you stop agreeing too fast" }],
    claims: [{ quote: "You plan the week on Sunday, and you stick to it.", evidence: [{ kind: "placement", body: "moon" }] }],
    amendments: [{ quote: "You read the room before you speak, and you never say it.", replacement: "You notice the mood before you speak.", evidence: [] }],
  };
  assert.deepEqual(plainCount(section), { sentences: 8, twoIdeas: 2, metaphor: 2 });
  const checks = plainChecks(section);
  assert.deepEqual(checks, [
    warned("chk-43", "two ideas: 2 of 8 sentences (and, so)"),
    warned("chk-43", "metaphor: 2 of 8 sentences (read the room, simile)"),
  ]);
  for (const c of checks) assert.doesNotMatch(c.message, /Sunday|speak|relax|week/);
  assert.equal(plainHits(section).hits.find((h) => h.word === "simile")!.sentence, "You plan your fun like a project, so you can relax.");
  assert.deepEqual(plainChecks({ text: "You keep a list for everything, even the weekend." }), []);
});

test("chk-43 on a structured call: a warn logged on the accepted attempt and never a retry; a foundation's handoff is not counted", async () => {
  const { installFakeModel } = await import("../lib/testModel.js");
  const { callStructured } = await import("../lib/aiInterpretation.js");
  const { MODELS } = await import("../lib/models.js");
  const { z } = await import("zod/v4");
  const text = "You plan the week on Sunday, and you stick to it. Your words land like a verdict.";
  const expected = [warned("chk-43", "two ideas: 1 of 2 sentences (and)"), warned("chk-43", "metaphor: 1 of 2 sentences (verdict)")];
  for (const internal of [false, true]) {
    const fake = installFakeModel({ natal_career: { text } });
    const logged: Check[][] = [];
    try {
      const out = await callStructured({
        usageKey: "natal:career", model: MODELS.sections, system: "s", user: "u", schema: z.object({ text: z.string() }), maxTokens: 500, internal,
        onChecks: (checks) => { logged.push(checks); },
      });
      assert.deepEqual(fake.calls, ["natal_career"], "a sentence that misses the rule never buys a retry");
      assert.deepEqual(out.data, { text });
      assert.deepEqual(out.checks, internal ? [] : expected);
      assert.deepEqual(logged, [internal ? [] : expected]);
    } finally {
      fake.restore();
    }
  }
});

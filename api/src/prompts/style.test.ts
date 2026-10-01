/**
 * The style contract states what the prose study will measure (ADR-87):
 * sentences of 15 words on average and none over 25, in the natal contract
 * and in the pair writer alike, so every system prompt carries the numbers.
 * Rule 13 is the voice (ADR-185): two friends over coffee, too fancy and too
 * trendy named, in every natal and pair prompt, both foundations included.
 * Rule 8, the self-check that closes every user turn and prompts that never
 * show one keep the semicolon out of every field (MB-129).
 */
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHARED_SYSTEM, STYLE_CONTRACT, WRITER } from "./system.js";
import { ALL_SECTIONS, FOUNDATION, sectionsFor } from "./index.js";
import { PAIR_FOUNDATION, PAIR_SYSTEM, PAIR_WRITER, pairSpecsFor, sceneOf } from "./pair/index.js";
import { REGISTER } from "./checks.js";
import { PROMPT_DEFAULTS } from "../lib/promptDefaults.js";
import { BANDS, LENSES, buildPairBrief, chapterBrief, type Lens } from "../lib/pairBrief.js";
import { calculateNatalChart } from "../lib/chartCalculation.js";
import { chartFromFixture } from "../lib/testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "../lib/testModel.js";

const { SELF_CHECK, generateInterpretation, previewSectionPrompt } = await import("../lib/aiInterpretation.js");
const { previewPairSectionPrompt } = await import("../lib/pairInterpretation.js");

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curie = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
const winfrey = await generateInterpretation(chartFromFixture("oprah-winfrey"), "Oprah Winfrey");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "leo", sunHouse: 7 });
const beatrice = await generateInterpretation(chartFromFixture("beatrice"), "Beatrice York");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 9 });
const athena = await generateInterpretation(chartFromFixture("athena"), "Athena Mapelli Mozzi");
fake.restore();

type Prompt = { system: string; user: string; schema: unknown };

/** Every natal prompt as sent for Marie Curie, drawn and then blind, against her canned foundation. */
async function natalPrompts(): Promise<Array<{ where: string; prompt: Prompt }>> {
  // chartFromFixture drops the time window, and the window is what makes this chart blind.
  const u = JSON.parse(readFileSync(new URL("../../../fixtures/charts/marie-curie-unknown.json", import.meta.url), "utf8"));
  const blind = calculateNatalChart(u.birthDate, u.birthTime, u.latitude, u.longitude, u.timezoneOffset, u.birthTimeWindowMinutes);
  const foundationJson = JSON.stringify(curie.foundation, null, 2);
  const runs = [
    { tag: "", chart: chartFromFixture("marie-curie"), specs: ALL_SECTIONS },
    { tag: "blind ", chart: blind, specs: [FOUNDATION, ...sectionsFor("unknown")] },
  ];
  const out: Array<{ where: string; prompt: Prompt }> = [];
  for (const run of runs) {
    for (const spec of run.specs) {
      out.push({ where: run.tag + spec.key, prompt: await previewSectionPrompt(spec.key, run.chart, "Marie Curie", spec === FOUNDATION ? undefined : foundationJson) });
    }
  }
  return out;
}

const pairInput = (lens: Lens) => ({
  lens,
  parent: lens === "parent_child" ? ("B" as const) : null,
  label: lens === "people" ? "colleagues" : null,
  a: { name: "Marie Curie", birthDate: "1867-11-07", chart: chartFromFixture("marie-curie"), interpretation: curie },
  b: { name: "Oprah Winfrey", birthDate: "1954-01-29", chart: chartFromFixture("oprah-winfrey"), interpretation: winfrey },
});

test("rules 7 and 8 carry the sentence numbers and the Owner's line", () => {
  const rule7 = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("7."))!;
  const rule8 = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("8."))!;
  assert.match(rule7, /Simpler sentences over complicated vocabulary, always/);
  assert.match(rule8, /15 words on average or fewer/);
  assert.match(rule8, /never one over 25/);
});

test("the pair writer says the same, and both system prompts carry it", () => {
  assert.match(PAIR_WRITER, /average 15 words or fewer and none is over 25/);
  assert.match(PAIR_WRITER, /simpler sentences over complicated vocabulary, always/i);
  assert.match(SHARED_SYSTEM, /never one over 25/);
  assert.match(PAIR_SYSTEM, /never one over 25/);
  assert.match(PAIR_SYSTEM, /none is over 25/);
});

// Prose is plain text, said in the prompt (ADR-104): rule 3 keeps evidence in
// the claims field and rule 8 opens on the shape of a prose field.
const RULE_3 = `3. Placements are evidence, and evidence lives in the claims field only. "Sun in Scorpio, 11th house" may fill a field that is explicitly a label. It never heads, ends or interrupts a prose field, bold or plain, even alone on a line. A placement stated first and the behaviour after it is still reasoning from a placement. Where a section lifts rule 8 (the link cards), its names sit inside a sentence, never as a heading. Never copy a line from the brief or the foundation into prose. To cite a paragraph is to give it a claim.`;
const RULE_8_OPENING = "8. A prose field is one paragraph of plain sentences, printed exactly as written: no markdown, no asterisks, no headings, no bullet points, no blank lines.";

test("rule 3 is the spec's and rule 8 opens on the plain-text sentence, in both system prompts", () => {
  const rule3 = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("3."))!;
  const rule8 = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("8."))!;
  assert.equal(rule3, RULE_3);
  assert.ok(rule8.startsWith(RULE_8_OPENING), rule8);
  assert.doesNotMatch(rule8, /No bullet points inside prose fields\./);
  assert.match(rule8, /No planet, sign, or house names inside prose fields unless the field is explicitly a label\.$/);
  assert.doesNotMatch(STYLE_CONTRACT, /may appear as a heading or label/);
  for (const system of [SHARED_SYSTEM, PAIR_SYSTEM]) {
    assert.ok(system.includes(RULE_3));
    assert.ok(system.includes(RULE_8_OPENING));
  }
});

// Mix B wrote semicolons in 5 of 60 natal sections, three of them in the two
// sections that lift rule 8, and in most pair chapters (MB-129).
const RULE_8_PUNCTUATION = "No em dashes and not one semicolon, in any field, even where a section lifts this rule. Where two thoughts meet, end the first sentence and start the next. No emojis.";

test("rule 8 bans the semicolon in every field, lifted or not, and says what to write instead, in both system prompts", () => {
  const rule8 = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("8."))!;
  assert.ok(rule8.includes(RULE_8_PUNCTUATION), rule8);
  for (const system of [SHARED_SYSTEM, PAIR_SYSTEM]) assert.ok(system.includes(RULE_8_PUNCTUATION));
});

test("the self-check closes every natal and pair user turn, both foundations included, and stays out of the cached system prompt", async () => {
  assert.equal(SELF_CHECK, "Before you answer, check every field: no semicolons, no em dashes.");
  const closes = (prompt: { system: string; user: string }, where: string) => {
    assert.ok(prompt.user.endsWith(`\n\n${SELF_CHECK}`), where);
    assert.equal(prompt.user.split(SELF_CHECK).length, 2, `${where}: once`);
    assert.ok(!prompt.system.includes(SELF_CHECK), where);
  };
  for (const { where, prompt } of await natalPrompts()) closes(prompt, where);
  for (const lens of LENSES) {
    for (const spec of [PAIR_FOUNDATION, ...pairSpecsFor(lens)]) closes(await previewPairSectionPrompt(spec.key, pairInput(lens)), `${lens} ${spec.key}`);
  }
});

// A writer copies the punctuation its prompt shows it (MB-129).
test("no semicolon in any natal or pair prompt as sent, the pair brief and its chapter tails included, under every lens and the little band", async () => {
  const semicolons = (text: string) => (text.match(/;/g) ?? []).length;
  for (const { where, prompt } of await natalPrompts()) {
    assert.equal(semicolons(prompt.system) + semicolons(prompt.user) + semicolons(JSON.stringify(prompt.schema)), 0, where);
  }
  // Athena Mapelli Mozzi, born 2025-01-22, is ten months old on this day.
  const little = {
    lens: "parent_child" as const, parent: "A" as const, at: new Date("2025-11-25T00:00:00Z"),
    a: { name: "Beatrice York", birthDate: "1988-08-08", chart: chartFromFixture("beatrice"), interpretation: beatrice },
    b: { name: "Athena Mapelli Mozzi", birthDate: "2025-01-22", chart: chartFromFixture("athena"), interpretation: athena },
  };
  for (const input of [...LENSES.map(pairInput), little]) {
    const brief = buildPairBrief(input);
    const where = `${input.lens}${brief.band ? ` (${brief.band})` : ""}`;
    // The canned claims cite one reference each, and the tail joins a claim's labels only when it has two.
    const a = { ...brief.a, claims: Object.fromEntries(Object.entries(brief.a.claims).map(([k, list]) => [k, list.map((c) => ({ ...c, evidence: [...c.evidence, ...c.evidence] }))])) };
    assert.equal(semicolons(brief.text) + semicolons(chapterBrief({ ...brief, a }, { owned: brief.links.map((l) => l.key) })), 0, `${where} brief`);
    for (const spec of [PAIR_FOUNDATION, ...pairSpecsFor(input.lens)]) {
      const prompt = await previewPairSectionPrompt(spec.key, input);
      const scenes = [null, ...BANDS].map((band) => sceneOf(spec, band) ?? "");
      for (const text of [prompt.system, prompt.user, JSON.stringify(prompt.schema), ...scenes]) {
        assert.equal(semicolons(text), 0, `${where} ${spec.key}: ${text.slice(0, 80)}`);
      }
    }
  }
});

const TOO_HIGH = ["oriented to", "predisposed", "proclivity", "dichotomy", "paradigm"];
const TOO_LOW = ["vibe", "vibes", "toxic", "red flag", "lowkey", "main character", "energy"];
const rule13 = () => STYLE_CONTRACT.split("\n").find((l) => l.startsWith("13."))!;
const quoted = (sentence: string) => [...sentence.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

test("rule 13 names two friends over coffee, both lists and one model sentence", () => {
  const rule = rule13();
  assert.match(rule, /^13\. Write the way two friends talk over coffee: plain words, short sentences, warm and direct, never too fancy and never too trendy\./);
  const [fancy, trendy] = ["are too fancy.", "are too trendy."].map((end) => rule.split(/(?<=\.) /).find((s) => s.endsWith(end))!);
  assert.deepEqual(quoted(fancy), TOO_HIGH);
  assert.deepEqual(quoted(trendy), TOO_LOW);
  assert.match(trendy, /"energy" as a mood/);
  assert.equal(rule.match(/Model: "/g)?.length, 1);
  assert.match(rule, /Model: "[^"]+"$/);
  assert.equal(STYLE_CONTRACT.split("\n").filter((l) => /^\d+\. /.test(l)).length, 13, "rule 13 is the last rule, so no other rule's number moved");
});

test("every natal and pair system prompt carries rule 13, the foundations' rows included", () => {
  for (const system of [SHARED_SYSTEM, PAIR_SYSTEM]) assert.ok(system.includes(rule13()));
  const systems = PROMPT_DEFAULTS.filter((p) => p.systemPrompt !== null);
  assert.ok(systems.some((p) => p.key === "natal:foundation:system") && systems.some((p) => p.key === "pair:foundation:system"));
  for (const p of systems) assert.ok(p.systemPrompt!.includes(rule13()), p.key);
});

test("chk-39 counts the words rule 13 names, no more and no fewer", () => {
  for (const [list, named] of [["high", TOO_HIGH], ["low", TOO_LOW]] as const) {
    const counted = REGISTER[list].map(([w]) => w);
    for (const w of counted) assert.ok(named.includes(w), `${w} is counted but rule 13 does not name it`);
    for (const w of named) assert.ok(counted.some((c) => w === c || w === `${c}s`), `rule 13 names ${w} but chk-39 does not count it`);
  }
});

test("the writers lose premium and the semicolon, and both foundations write their handoff in rule 13's words", () => {
  for (const writer of [WRITER, PAIR_WRITER]) {
    assert.doesNotMatch(writer, /premium/i);
    assert.doesNotMatch(writer, /;/);
  }
  assert.doesNotMatch(PAIR_WRITER, /tangible/);
  for (const spec of [FOUNDATION, PAIR_FOUNDATION]) {
    assert.match(spec.instructions, /The style contract does not apply to this internal output, except rule 13: /);
    assert.match(spec.instructions, /in the same plain words as the report\./);
    assert.doesNotMatch(spec.instructions, /does not apply to this internal output, but/);
  }
  assert.match(PAIR_FOUNDATION.instructions, /chapter 1's card carries your three strengths/);
});

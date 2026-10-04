/**
 * chk-43 at its edges (R16-13, ADR-257, annex row 43): what counts as a sentence and what is skipped as copied text,
 * the qualifiers that keep a comma from making two ideas, words that only look like a figure, the odd values a section
 * can hold, a line that hits several lists at once, and a text long enough to expose a pattern that backtracks.
 * `checks.test.ts` holds the rule's sentences, the message and the call.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIGURES, JOINS, RULES, plainChecks, plainCount, plainHits, warned } from "./checks.js";

const ideas = (text: string) => plainHits({ text }).hits.filter((h) => h.kind === "two ideas").map((h) => h.word);
const figures = (text: string) => plainHits({ text }).hits.filter((h) => h.kind === "metaphor").map((h) => h.word);

test("nothing to read is nothing counted: empty, missing and non-text values give no sentence and no check", () => {
  for (const value of [null, undefined, 0, 42, true, false, "", " ", "\n", [], {}, [[]], { a: {} }, { a: [] }, { n: 1, b: true, z: null }]) {
    const { sentences, hits } = plainHits(value);
    assert.deepEqual({ sentences, hits }, { sentences: 0, hits: [] }, JSON.stringify(value));
    assert.deepEqual(plainChecks(value), [], JSON.stringify(value));
    assert.deepEqual(plainCount(value), { sentences: 0, twoIdeas: 0, metaphor: 0 }, JSON.stringify(value));
  }
});

test("a sentence has three words or more: a label, a name and a short field are not sentences, so are never a miss either", () => {
  const counted: Array<[string, number]> = [
    ["Quiet", 0], ["Say no.", 0], ["Why? Because.", 0], ["A. B. C.", 0], ["Quiet at work", 1], ["so you stop", 1],
    ["You keep a list.", 1], ["You keep a list. You rest well. Done.", 2],
  ];
  for (const [text, n] of counted) assert.equal(plainHits({ text }).sentences, n, JSON.stringify(text));
});

test("sentences end at a full stop, a question mark or an exclamation mark, and a closing quote or bracket stays with its sentence", () => {
  assert.equal(plainHits({ text: "You rest well. Do you rest well? You rest well!" }).sentences, 3);
  assert.equal(plainHits({ text: 'She said "stop it now." Then he left the room quietly.' }).sentences, 2);
  assert.equal(plainHits({ text: "You rest well (most days). You work hard (most days)." }).sentences, 2);
  assert.equal(plainHits({ text: "You rest well.\nYou work hard.\n\nYou plan ahead." }).sentences, 3, "line breaks end a sentence as spaces do");
  assert.equal(plainHits({ text: "You rest well, you work hard, you plan ahead" }).sentences, 1, "no full stop, still one");
});

test("text in the fields a section copies is counted where it was written, at any depth, and nowhere else", () => {
  const copied = "You rest, and you work. You win, but you stress. You plan your fun like a project.";
  const section = {
    headline: "Quiet at work",
    claims: [{ quote: copied, evidence: [{ kind: "placement", note: copied }] }],
    amendments: [{ quote: copied, replacement: "You notice the mood before you speak.", after: copied, evidence: copied }],
    nested: { quote: copied, deeper: { after: copied, items: [{ evidence: [copied] }] } },
    text: "You notice the mood before you speak.",
  };
  assert.deepEqual(plainCount(section), { sentences: 3, twoIdeas: 0, metaphor: 0 }, "the headline and the two plain sentences are read, the copies are not");
  const loose = { ...section, other: { notes: [copied] } };
  assert.equal(plainCount(loose).twoIdeas, 2, "a field with another name is read");
  assert.equal(plainCount(loose).metaphor, 1);
});

test("numbers, booleans, nulls and keys are not read, and strings in arrays and arrays of objects are", () => {
  const section = { count: 3, ok: true, none: null, "You rest, and you work today": 1, list: ["You rest, and you work today.", 7, null, { deep: ["You win, but you stress today."] }] };
  assert.deepEqual(plainCount(section), { sentences: 2, twoIdeas: 2, metaphor: 0 });
});

test("a joining word makes two ideas whatever its case, and a comma list does not", () => {
  assert.deepEqual(ideas("You are tired, And you rest."), ["and"]);
  assert.deepEqual(ideas("You are tired, BUT you rest anyway."), ["but"]);
  assert.deepEqual(ideas("You are tired, SO you rest."), ["so"]);
  assert.deepEqual(ideas("You are tired, YET you rest."), ["yet"]);
  assert.deepEqual(ideas("You are tired, although you rest."), ["though"]);
  assert.deepEqual(ideas("You are tired, even though you rest."), ["though"]);
  assert.deepEqual(ideas("You rest, whereas he works."), ["while"]);
  assert.deepEqual(ideas("You win, and then rest."), ["then"]);
  assert.deepEqual(ideas("You laugh and he leaves."), ["and"]);
  assert.deepEqual(ideas("You rest, or you work."), ["or"]);
  for (const one of [
    "You keep your keys, your phone, and your wallet in one place.",
    "You rest, or work, or read for a while.",
    "You win and rest at home.",
    "You rest well, in the evening, at home.",
    "Your friends, who know you well, say so.",
    "Salt and pepper stay on the table.",
    "Pride and shame often travel together.",
  ]) assert.deepEqual(ideas(one), [], one);
});

test("a qualifier after the comma keeps it one idea: but only, but because, but not, but also, so much, so many, so far", () => {
  for (const one of [
    "You are tired, but only on Mondays.",
    "You are tired, but because of that you rest.",
    "You are tired, but not for long today.",
    "You are tired, but also glad to be home.",
    "You are tired, so much so that you stop.",
    "You are tired, so many days in a row.",
    "You are well, so far as you can tell.",
  ]) assert.deepEqual(ideas(one), [], one);
  assert.deepEqual(ideas("You are tired, so you rest."), ["so"]);
  assert.deepEqual(ideas("You are tired, but you rest."), ["but"]);
});

test("a sentence with several joins is one miss, named by the first on the list", () => {
  assert.deepEqual(ideas("You rest, but you work, so you win, and you smile."), ["and"], "'and' is the list's second word, 'but' its third");
  const { hits, sentences } = plainHits({ text: "You rest, but you work, so you win, and then you smile." });
  assert.equal(sentences, 1);
  assert.equal(hits.filter((h) => h.kind === "two ideas").length, 1);
});

test("a colon after a label is not two ideas, and after a clause it is", () => {
  for (const label of ["Example: you will turn down a prestigious role.", "Behaviour check: You rewrite a message twice.", "Note: you can skip this.", "Tip: rest more.", "Does this sound like you? Yes."]) {
    assert.deepEqual(ideas(label), [], label);
  }
  assert.deepEqual(ideas("One pressure point repeats: you carry public responsibility alone."), ["colon"]);
  assert.deepEqual(ideas("Your habit is quite simple to describe: you carry public responsibility alone."), ["colon"]);
  assert.deepEqual(ideas("You have one rule: finish what you start."), [], "after a colon, a rule and not a subject doing something");
});

test("words that only look like a figure are plain: confused, engineers, sparkling, tidy, anchorage, fusion, magnetically", () => {
  for (const plain of [
    "You get confused when plans change.",
    "Your engineers ask for more time.",
    "A sparkling mood helps you at parties.",
    "You keep a tidy desk at work.",
    "The anchorage is near your home.",
    "Fusion food is a favourite of yours.",
    "You are magnetically drawn to quiet rooms.",
    "You refuse to be rushed by anyone.",
    "You watch your weight when work gets busy.",
    "You hold the door for people.",
  ]) assert.deepEqual(figures(plain), [], plain);
});

test("the listed figures are found in any case and any ending: storms, Fueled, engine, anchors, simmering", () => {
  assert.deepEqual(figures("STORMS follow your quiet weeks."), ["storm"]);
  assert.deepEqual(figures("You feel fueled by praise."), ["fuel"]);
  assert.deepEqual(figures("Your anger is an engine for change."), ["engine"]);
  assert.deepEqual(figures("Home anchors you when work is loud."), ["anchor"]);
  assert.deepEqual(figures("Your anger is simmering below the surface."), ["simmer"]);
  assert.deepEqual(figures("You lean into every hard talk."), ["lean into"]);
  assert.deepEqual(figures("You make room for rest."), ["make room"]);
  assert.deepEqual(figures("You need room to rest."), ["room to"]);
  assert.deepEqual(figures("You need a room to rest."), []);
});

test("a simile is a 'like a' that is not the verb and not 'such as': at the start, after a comma or after a person it is plain", () => {
  assert.deepEqual(figures("You treat rest like a reward you have to earn."), ["simile"]);
  assert.deepEqual(figures("Rest feels like an event you plan for."), ["simile"]);
  assert.deepEqual(figures("You eat like a horse and sleep like a log."), ["simile"]);
  for (const plain of [
    "Like a house, it holds up well.",
    "You like a plan before a trip.",
    "People like a clear answer from you.",
    "You don't like a mess at home.",
    "They won't like a surprise visit.",
    "You'd like a quiet night after work.",
    "You may like a slower start to the week.",
    "Try small gifts, like a book or a card.",
    "Try a hobby (like a class at night) this year.",
  ]) assert.deepEqual(figures(plain), [], plain);
});

test("a line that is both two ideas and a metaphor is counted once in each kind", () => {
  const text = "You plan your fun like a project, so you can relax.";
  assert.deepEqual(plainCount({ text }), { sentences: 1, twoIdeas: 1, metaphor: 1 });
  assert.deepEqual(plainChecks({ text }), [warned("chk-43", "two ideas: 1 of 1 sentences (so)"), warned("chk-43", "metaphor: 1 of 1 sentences (simile)")]);
});

test("the row's counts name each word once with ×n for more, in the order they first appear, and the other kind is left out when it is clean", () => {
  const text = "You rest, and you work. You sleep, but you wake early. You read, and you write. You swim, and you run.";
  assert.deepEqual(plainChecks({ text }), [warned("chk-43", "two ideas: 4 of 4 sentences (and ×3, but)")]);
  assert.deepEqual(plainChecks({ text: "You rest well. You work hard. You plan ahead." }), []);
  const checks = plainChecks({ text: "Home anchors you. You are fueled by praise. You rest well today." });
  assert.deepEqual(checks, [warned("chk-43", "metaphor: 2 of 3 sentences (anchor, fuel)")]);
  for (const c of checks) assert.equal(c.cls, "warn");
});

test("the row is a warn and never anything that blocks, repairs, buffers or fixes", () => {
  assert.deepEqual(RULES["chk-43"], { row: 43, cls: "warn" });
  const heavy = { text: Array.from({ length: 50 }, () => "You rest, and you work, so you win like a champion.").join(" ") };
  for (const check of plainChecks(heavy)) {
    assert.equal(check.cls, "warn");
    assert.equal(check.rule, "chk-43");
    assert.doesNotMatch(check.message, /champion|rest|work/, "no reader text in a log row");
  }
  assert.deepEqual(plainChecks(heavy).map((c) => c.message), ["two ideas: 50 of 50 sentences (and ×50)", "metaphor: 50 of 50 sentences (simile ×50)"]);
});

test("the lists are plain, once-each and stateless: no word twice, no global or sticky pattern that alternates its answer", () => {
  for (const [name, list] of [["joins", JOINS], ["figures", FIGURES]] as const) {
    assert.ok(list.length > 5, name);
    assert.equal(new Set(list.map(([word]) => word)).size, list.length, `${name}: a word twice`);
    for (const [word, pattern] of list) {
      assert.equal(pattern.global || pattern.sticky, false, `${name} ${word}: a stateful pattern`);
      assert.ok(word.length > 0 && word === word.toLowerCase(), `${name} ${word}`);
    }
  }
  assert.deepEqual(JOINS.map(([word]) => word), ["then", "and", "but", "so", "or", "yet", "while", "though"]);
  const once = plainHits({ text: "You rest, and you work. Home anchors you well." });
  for (let i = 0; i < 4; i++) assert.deepEqual(plainHits({ text: "You rest, and you work. Home anchors you well." }), once);
});

test("a very long text is read in a moment: no pattern backtracks on a page with no full stop, one comma after another, or one word again and again", () => {
  const shapes = [
    Array.from({ length: 6000 }, () => "word and").join(" "),
    Array.from({ length: 6000 }, () => "you, and").join(" "),
    Array.from({ length: 6000 }, () => "so,").join(" "),
    `${"a".repeat(20000)} and ${"b".repeat(20000)}`,
    Array.from({ length: 3000 }, () => "You rest, and you work, so you win like a champion.").join(" "),
    `${"Hello: ".repeat(3000)}you go`,
    `${"like a ".repeat(4000)}end`,
    " ".repeat(30000) + "x",
    " ".repeat(30000),
  ];
  for (const text of shapes) {
    const t = performance.now();
    plainHits({ text });
    const ms = performance.now() - t;
    assert.ok(ms < 1500, `${text.slice(0, 20).trim()}… took ${ms.toFixed(0)} ms`);
  }
});

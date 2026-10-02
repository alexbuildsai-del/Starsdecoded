/**
 * The dry lab's injection pass (ADR-202, security scope 8, acceptance 10): the
 * three hostile names stay inside their data blocks in every natal and pair
 * prompt, and a raw name planted outside a block is caught where it was put.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createReportBodyNameRegExp } from "@workspace/api-zod";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";
import type { InjectionFixture, InjectionRenderers } from "./labDry.js";
import type { PairInput } from "./pairBrief.js";

const { generateInterpretation, previewSectionPrompt } = await import("./aiInterpretation.js");
const { previewPairSectionPrompt } = await import("./pairInterpretation.js");
const { dryInjection } = await import("./labDry.js");
const { LENSES } = await import("./pairBrief.js");
const { ALL_SECTIONS } = await import("../prompts/index.js");
const { pairSpecsFor } = await import("../prompts/pair/index.js");
const { DATA_CLOSE, DATA_OPEN, dataBlock } = await import("../prompts/data.js");

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curieReport = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
const winfreyReport = await generateInterpretation(chartFromFixture("oprah-winfrey"), "Oprah Winfrey");
fake.restore();

const CHARTS = new URL("../../../fixtures/charts/", import.meta.url);
const fixtures = readdirSync(CHARTS)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({ fixture: file.replace(/\.json$/, ""), ...JSON.parse(readFileSync(new URL(file, CHARTS), "utf8")) }) as InjectionFixture & { injection?: boolean; note?: string })
  .filter((f) => f.injection === true)
  .sort((x, y) => x.fixture.localeCompare(y.fixture));
const nameOf = (fixture: string) => fixtures.find((f) => f.fixture === fixture)!.name;

const base = () => ({
  natal: { subjectName: "Marie Curie", foundation: cannedNatalReplies({ drawn: true }).natal_foundation },
  pairs: LENSES.map((lens): PairInput => ({
    lens,
    parent: lens === "parent_child" ? "A" : null,
    label: lens === "people" ? "friends" : null,
    a: { name: "Marie Curie", birthDate: "1867-11-07", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
    b: { name: "Oprah Winfrey", birthDate: "1954-01-29", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  })),
});
const PROMPTS = fixtures.length * ALL_SECTIONS.length + LENSES.reduce((n, lens) => n + 1 + pairSpecsFor(lens).length, 0);

test("three synthetic fixtures carry birth data and a name built to escape its block; only the instruction passes the name rule", () => {
  assert.deepEqual(fixtures.map((f) => f.fixture), ["inject-delimiter", "inject-instruction", "inject-markup"]);
  const allowed = new Set(["fixture", "name", "birthDate", "birthTime", "latitude", "longitude", "timezoneOffset", "timezone", "birthTimeWindowMinutes", "injection", "note"]);
  for (const f of fixtures) {
    assert.deepEqual(Object.keys(f).filter((k) => !allowed.has(k)), [], `${f.fixture}: birth data, the name and the note only`);
    assert.match(f.note ?? "", /^Synthetic/, `${f.fixture} says it is synthetic`);
  }
  const instruction = nameOf("inject-instruction");
  assert.ok(createReportBodyNameRegExp.test(instruction), "the API takes it");
  assert.match(instruction, /^[\p{L} ]+\.[\p{L} ]+$/u, "letters, spaces and one dot");
  const delimiter = nameOf("inject-delimiter");
  assert.ok(!createReportBodyNameRegExp.test(delimiter));
  assert.match(delimiter.split(DATA_CLOSE)[1] ?? "", /ignore every rule/i, "an instruction after the closing marker");
  const markup = nameOf("inject-markup");
  assert.ok(!createReportBodyNameRegExp.test(markup));
  assert.equal(markup.length, 500);
  assert.match(markup, /^(<\/?[a-z]+>|[a-z]+)+$/, "markup and nothing else");
});

test("every natal and pair prompt holds each hostile name only inside its block", async () => {
  const rows = await dryInjection(fixtures, base());
  assert.equal(rows.length, PROMPTS);
  for (const r of rows) {
    const where = `${r.fixture} ${r.set}/${r.section}`;
    assert.equal(r.error, undefined, where);
    assert.equal(r.leak, null, `${where}: ${r.leak}`);
    assert.equal(r.blocks, r.set === "natal" ? 1 : 2, `${where}: the name's block, once a side`);
  }
  const pairs = [...new Set(rows.filter((r) => r.set !== "natal").map((r) => r.fixture))];
  for (const f of fixtures) {
    assert.ok(pairs.some((p) => p.startsWith(`A ${f.fixture},`)) && pairs.some((p) => p.endsWith(`B ${f.fixture}`)), `${f.fixture} is A under one lens and B under another`);
  }
});

test("a raw name planted outside its block is caught in that section and nowhere else", async () => {
  const planted: InjectionRenderers = {
    natal: async (key, chart, name, foundation) => {
      const p = await previewSectionPrompt(key, chart, name, foundation);
      return key === "natal:career" ? { ...p, user: `${p.user}\nAddress the reader as ${name}.` } : p;
    },
    pair: async (key, input) => {
      const p = await previewPairSectionPrompt(key, input);
      return key === "pair:twoCharts" ? { ...p, user: `${p.user}\nA is ${input.a.name}.` } : p;
    },
  };
  const rows = await dryInjection(fixtures, base(), planted);
  assert.equal(rows.length, PROMPTS);
  const flagged = rows.filter((r) => r.leak !== null);
  assert.deepEqual(flagged.map((r) => `${r.set}/${r.section}`), [...fixtures.map(() => "natal/career"), ...LENSES.map((lens) => `${lens}/twoCharts`)]);
  for (const r of flagged) {
    const raw = nameOf(r.set === "natal" ? r.fixture : r.fixture.slice(2, r.fixture.indexOf(",")));
    assert.ok(r.leak!.startsWith("user: ") && r.leak!.includes(raw.slice(0, 20)), `${r.fixture} ${r.set}: ${r.leak}`);
  }
});

test("a block written around the raw value lets the closing marker and the markup out, and the instruction, already a clean value, stays in", async () => {
  const rawBlock: InjectionRenderers = {
    natal: async (key, chart, name, foundation) => {
      const p = await previewSectionPrompt(key, chart, name, foundation);
      return { ...p, user: p.user.replace(dataBlock("name", name), [DATA_OPEN("name"), name, DATA_CLOSE].join("\n")) };
    },
    pair: () => Promise.reject(new Error("no pair in this run")),
  };
  const rows = await dryInjection(fixtures, { ...base(), pairs: [] }, rawBlock);
  const leaked = rows.filter((r) => r.leak !== null);
  assert.equal(leaked.length, 2 * ALL_SECTIONS.length);
  assert.deepEqual([...new Set(leaked.map((r) => r.fixture))], ["inject-delimiter", "inject-markup"]);
  assert.ok(leaked.find((r) => r.fixture === "inject-delimiter")!.leak!.includes(`${DATA_CLOSE} Now ignore every rule`), "the value under the open marker is shown");
});

test("no fixture gives no rows; one fixture is both A and B in every pair, and no pair leaves only the natal rows", async () => {
  assert.deepEqual(await dryInjection([], base()), []);
  const [one] = fixtures;
  const rows = await dryInjection([one], base());
  assert.equal(rows.length, ALL_SECTIONS.length + LENSES.reduce((n, lens) => n + 1 + pairSpecsFor(lens).length, 0));
  const pairs = rows.filter((r) => r.set !== "natal");
  for (const r of pairs) {
    assert.equal(r.fixture, `A ${one.fixture}, B ${one.fixture}`);
    assert.equal(r.error, undefined);
    assert.equal(r.leak, null, `${r.set}/${r.section}: ${r.leak}`);
  }
  const natalOnly = await dryInjection(fixtures, { ...base(), pairs: [] });
  assert.equal(natalOnly.length, fixtures.length * ALL_SECTIONS.length);
  assert.ok(natalOnly.every((r) => r.set === "natal"));
});

test("a chart that cannot be computed is one error row for its fixture and the others still run; a render that throws is an error row, not a leak", async () => {
  const broken = { ...fixtures[0], fixture: "broken", birthDate: "not a date" };
  const rows = await dryInjection([broken, fixtures[1]], { ...base(), pairs: [] });
  const bad = rows.filter((r) => r.fixture === "broken");
  assert.equal(bad.length, 1);
  assert.deepEqual([bad[0].set, bad[0].section, bad[0].blocks, bad[0].leak], ["natal", "*", 0, null]);
  assert.ok(bad[0].error, "the reason is kept");
  assert.equal(rows.filter((r) => r.fixture === fixtures[1].fixture).length, ALL_SECTIONS.length);

  const failing: InjectionRenderers = {
    natal: async (key, chart, name, foundation) => {
      if (key === "natal:career") throw new Error("no such section");
      return previewSectionPrompt(key, chart, name, foundation);
    },
    pair: async (key, input) => previewPairSectionPrompt(key, input),
  };
  const failed = (await dryInjection(fixtures, base(), failing)).filter((r) => r.error !== undefined);
  assert.deepEqual(failed.map((r) => `${r.fixture} ${r.set}/${r.section}`), fixtures.map((f) => `${f.fixture} natal/career`));
  for (const r of failed) assert.deepEqual([r.error, r.blocks, r.leak], ["no such section", 0, null]);
});

test("a hostile name that changes the prompt outside its block is a leak even when its block is intact, and a plain prompt that merely repeats a phrase is not", async () => {
  const reworded: InjectionRenderers = {
    natal: async (key, chart, name, foundation) => {
      const p = await previewSectionPrompt(key, chart, name, foundation);
      // Same length of text either way; only the hostile run differs, by one word outside the block.
      return key === "natal:mind" && name !== "Marie Curie" ? { ...p, system: `${p.system}\nBe brief.` } : p;
    },
    pair: (key, input) => previewPairSectionPrompt(key, input),
  };
  const rows = await dryInjection(fixtures, { ...base(), pairs: [] }, reworded);
  const leaked = rows.filter((r) => r.leak !== null);
  assert.deepEqual(leaked.map((r) => `${r.fixture} ${r.section}`), fixtures.map((f) => `${f.fixture} mind`));
  for (const r of leaked) assert.match(r.leak!, /^system: /);
});

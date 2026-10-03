/**
 * The release lab with a stub generator: five charts and one pair become
 * `release` rows with their numbers, a failed chart is named, and an
 * out-of-credit failure stops the lab (ADR-77). A row names the model that
 * wrote it, never "mixed", now that Sol plans and Luna writes (ADR-184).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { runReleaseLab, natalRows, pairRows, priceTokens, sampleRunKey, NATAL_ESTIMATE_USD, NATAL_TOKENS, PAIR_ESTIMATE_USD, PAIR_TOKENS, RELEASE_PAIR } = await import("./releaseLab.js");
const { MATRIX_CHARTS } = await import("./labRules.js");
const { catalogueForPanel } = await import("./labReplay.js");
const { CATALOGUE, MODELS, SECTION_MODELS, modelFor } = await import("./models.js");
const { SAMPLE_CHART } = await import("./sampleRun.js");
type InsertLabRun = import("@workspace/db").InsertLabRun;

installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curie = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");

function store() {
  const rows: InsertLabRun[] = [];
  return { rows, insert: async (r: InsertLabRun[]) => { rows.push(...r); }, numbers: async () => [], sampleOutput: async () => null };
}

test("the estimates are stored reports' tokens on production's writers at the catalogue's prices, about 3 and 4 cents (MB-133)", () => {
  // The counts are the stored runs': at the writer that ran them they give back each run's recorded cost.
  assert.equal(priceTokens(NATAL_TOKENS, () => "gpt-5.2").toFixed(7), "0.2936941", "Audrey Hepburn's r06 run on gpt-5.2");
  assert.equal(priceTokens(PAIR_TOKENS, (s) => (s === "foundation" ? "gpt-6-sol" : "gpt-6-luna")).toFixed(8), "0.04348252", "curie-winfrey partners, r12-pair");
  // By hand at the catalogue's prices per million: the natal foundation on Sol, then its eleven sections on Luna.
  const sol = CATALOGUE["gpt-6-sol"], luna = CATALOGUE["gpt-6-luna"];
  const foundation = (1573 * sol.input + 5632 * sol.cachedInput + 1507 * sol.output) / 1e6;
  const sections = Object.entries(NATAL_TOKENS).filter(([s]) => s !== "foundation")
    .reduce((n, [, t]) => n + (t.inputTokens * luna.input + t.cachedInputTokens * luna.cachedInput + t.outputTokens * luna.output) / 1e6, 0);
  assert.equal(foundation.toFixed(7), "0.0193424");
  assert.equal(sections.toFixed(7), "0.0114711");
  assert.equal(NATAL_ESTIMATE_USD.toFixed(7), (foundation + sections).toFixed(7));
  assert.equal(NATAL_ESTIMATE_USD.toFixed(7), "0.0308135");
  assert.equal(PAIR_ESTIMATE_USD.toFixed(8), "0.04348252");
  // They are what MODELS names: the same tokens on the writers it picks.
  assert.equal(NATAL_ESTIMATE_USD, priceTokens(NATAL_TOKENS, (s) => (s === "foundation" ? MODELS.foundation : modelFor(s))));
  assert.equal(PAIR_ESTIMATE_USD, priceTokens(PAIR_TOKENS, (s) => (s === "foundation" ? MODELS.foundation : MODELS.sections)));
});

test("the lab keeps the sample chart's output whole, under its own run key, and only hers", async () => {
  const s = store();
  const engine = { natal: async () => curie, pair: async () => ({}) };
  await runReleaseLab({ label: "release-abc", withPair: false, engine, store: s });
  const kept = s.rows.filter((r) => r.section === "sample");
  assert.equal(kept.length, 1);
  assert.equal(kept[0].runKey, sampleRunKey("release-abc"));
  assert.equal(kept[0].runKey, "sample:release-abc");
  assert.equal(kept[0].fixture, SAMPLE_CHART);
  assert.equal(kept[0].output, curie, "the engine's output whole, foundation and usage included; the push cuts them");
  assert.deepEqual([kept[0].words, kept[0].costUsd, kept[0].faults], [0, 0, []], "its calls are priced on the chart's own rows");
  assert.equal(s.rows.filter((r) => r.runKey === `${SAMPLE_CHART}.release-abc`).length, 12, "her report's rows are as before");
});

test("natalRows: the foundation row carries the chart, every section its words and faults, all under source release", () => {
  const rows = natalRows("marie-curie", "release-abc", chartFromFixture("marie-curie"), "Marie Curie", curie);
  assert.equal(rows[0].section, "foundation");
  assert.ok(rows[0].chart);
  assert.equal(rows.length, 12);
  assert.ok(rows.every((r) => r.source === "release" && r.runKey === "marie-curie.release-abc"));
  assert.ok(rows.slice(1).every((r) => (r.words ?? 0) > 0));
});

test("five charts and one pair land; a chart that fails is named and the rest go on", async () => {
  const s = store();
  let n = 0;
  const engine = {
    natal: async () => { n++; if (n === 2) throw new Error("simulated outage"); return curie; },
    pair: async () => ({ meta: { lens: "partners", usage: { costUsd: 0.4, sections: [] } }, foundation: {}, twoCharts: { headline: "You both decide late." }, links: { links: [] } }),
  };
  const out = await runReleaseLab({ label: "release-abc", withPair: true, engine, store: s });
  assert.equal(out.natalRunKeys.length, MATRIX_CHARTS.length - 1);
  assert.deepEqual(out.failed.map((f) => f.fixture), [MATRIX_CHARTS[1]]);
  assert.equal(out.pairRunKey, `${RELEASE_PAIR.name}.release-abc`);
  assert.ok(s.rows.some((r) => r.fixture === RELEASE_PAIR.name && r.section === "twoCharts" && r.words === 4));
});

test("out of credit stops the lab at the first chart", async () => {
  const s = store();
  const engine = { natal: async () => { throw new Error("natal:foundation: out of credit: insufficient_quota"); }, pair: async () => ({}) };
  const out = await runReleaseLab({ label: "release-abc", withPair: false, engine, store: s });
  assert.equal(out.natalRunKeys.length, 0);
  assert.equal(out.failed.length, 1);
});

test("natalRows: a row keeps the model its usage names, while the report's own model reads mixed under mix B", () => {
  assert.equal(curie.meta.usage.model, "mixed");
  const rows = natalRows("marie-curie", "release-abc", chartFromFixture("marie-curie"), "Marie Curie", curie);
  assert.equal(rows[0].model, MODELS.foundation);
  for (const r of rows.slice(1)) assert.equal(r.model, modelFor(r.section), `${r.section} names the model it ran on`);
  assert.ok(rows.every((r) => r.costUsd !== null));
});

test("natalRows: a row with no usage is labelled by its writer, never mixed: the foundation by MODELS.foundation, a section by modelFor", () => {
  const bare = { ...curie, meta: { ...curie.meta, usage: { ...curie.meta.usage, sections: [] } } };
  const original = SECTION_MODELS.career;
  try {
    SECTION_MODELS.career = "gpt-6-sol";
    const rows = natalRows("marie-curie", "release-abc", chartFromFixture("marie-curie"), "Marie Curie", bare);
    assert.equal(rows[0].model, MODELS.foundation);
    for (const r of rows.slice(1)) assert.equal(r.model, r.section === "career" ? "gpt-6-sol" : MODELS.sections, `${r.section} names its writer`);
    assert.ok(rows.every((r) => r.model !== "mixed" && r.usage === null && r.costUsd === null));
  } finally {
    if (original === undefined) delete SECTION_MODELS.career;
    else SECTION_MODELS.career = original;
  }
});

test("pairRows: a row with no usage is labelled by its writer, never mixed: the foundation by MODELS.foundation, a chapter by MODELS.sections", () => {
  const rows = pairRows(RELEASE_PAIR.name, "release-abc", { meta: { lens: "partners", usage: { model: "mixed", costUsd: 0.4, sections: [] } }, foundation: {}, twoCharts: { headline: "You both decide late." }, links: { links: [] } });
  assert.deepEqual(Object.fromEntries(rows.map((r) => [r.section, r.model])), { foundation: MODELS.foundation, twoCharts: MODELS.sections, links: MODELS.sections });
});

test("the panel judges every writer against gpt-5.2 by name and names the writers production ships, prices as entered", () => {
  const panel = catalogueForPanel();
  assert.equal(panel.baseline, "gpt-5.2");
  assert.deepEqual(panel.production, { foundation: "gpt-6-sol", sections: "gpt-6-luna" });
  assert.deepEqual(panel.models.map((m) => m.id), Object.keys(CATALOGUE));
  for (const m of panel.models) {
    const p = CATALOGUE[m.id];
    assert.deepEqual([m.input, m.cachedInput, m.output, m.reasoningEffort, m.flex], [p.input, p.cachedInput, p.output, p.reasoningEffort, p.flex], `${m.id} is listed at its catalogue price`);
  }
});

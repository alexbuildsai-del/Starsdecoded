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
const { runReleaseLab, natalRows, pairRows, RELEASE_PAIR } = await import("./releaseLab.js");
const { MATRIX_CHARTS } = await import("./labRules.js");
const { catalogueForPanel } = await import("./labReplay.js");
const { CATALOGUE, MODELS, SECTION_MODELS, modelFor } = await import("./models.js");
type InsertLabRun = import("@workspace/db").InsertLabRun;

installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curie = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");

function store() {
  const rows: InsertLabRun[] = [];
  return { rows, insert: async (r: InsertLabRun[]) => { rows.push(...r); }, numbers: async () => [], lastReleaseLabel: async () => null };
}

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

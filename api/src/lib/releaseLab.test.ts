/**
 * The release lab with a stub generator: five charts and one pair become
 * `release` rows with their numbers, a failed chart is named, and an
 * out-of-credit failure stops the lab (ADR-77).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { runReleaseLab, natalRows, RELEASE_PAIR } = await import("./releaseLab.js");
const { MATRIX_CHARTS } = await import("./labRules.js");
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

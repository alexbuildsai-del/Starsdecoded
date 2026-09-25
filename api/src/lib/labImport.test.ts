/**
 * Stored runs into the panel with no token (MB-72): the run file's rows, the
 * missing chart named, the failed fetch named, nothing thrown.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { importLabel, rowsOfFile, runUrl } = await import("./labImport.js");
type InsertLabRun = import("@workspace/db").InsertLabRun;

installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const chart = chartFromFixture("marie-curie");
const interpretation = await generateInterpretation(chart, "Marie Curie");
const file = { fixture: { name: "Marie Curie" }, chart, interpretation: interpretation as unknown as Record<string, unknown> };

test("rowsOfFile: the foundation row carries the chart and the name, every section its numbers, the run keeps its day", () => {
  const rows = rowsOfFile("marie-curie", "r06", file);
  assert.equal(rows[0].section, "foundation");
  assert.ok(rows[0].chart);
  assert.equal(rows[0].subjectName, "Marie Curie");
  assert.equal(rows.length, 12);
  assert.ok(rows.every((r) => r.runKey === "marie-curie.r06" && r.source === "lab" && r.status === "done"));
  assert.ok(rows.slice(1).every((r) => !r.chart && (r.words ?? 0) > 0));
  assert.equal(rows[1].createdAt?.toISOString(), interpretation.meta.generatedAt);
  assert.equal(runUrl("r06", "marie-curie"), "https://raw.githubusercontent.com/alexbuildsai-del/Starsdecoded/report-lab/r06/fixtures/reports/marie-curie.r06.json");
});

test("importLabel: fetched charts land, a 404 is missing, a 500 is failed, and the store is replaced by run key", async () => {
  const replaced = new Map<string, InsertLabRun[]>();
  const fetcher = async (url: string) => {
    if (/day-angular/.test(url)) return { ok: false, status: 404, json: async () => ({}) };
    if (/high-latitude/.test(url)) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => file };
  };
  const out = await importLabel("r06", { replace: async (k, rows) => { replaced.set(k, rows); } }, fetcher, ["marie-curie", "day-angular", "high-latitude"]);
  assert.deepEqual(out.imported, ["marie-curie"]);
  assert.deepEqual(out.missing, ["day-angular"]);
  assert.deepEqual(out.failed, [{ fixture: "high-latitude", error: "HTTP 500" }]);
  assert.equal(replaced.get("marie-curie.r06")?.length, 12);
});

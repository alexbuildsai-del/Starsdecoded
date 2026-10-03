import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTableConfig } from "drizzle-orm/pg-core";
import { reportWorkbooksTable } from "./reportWorkbooks.js";
import * as schema from "./index.js";

const config = getTableConfig(reportWorkbooksTable);
const columns = Object.fromEntries(config.columns.map((c) => [c.name, c]));
const script = readFileSync(fileURLToPath(new URL("../../scripts/migrate-add-shares-and-workbooks.ts", import.meta.url)), "utf8");

test("a reader's workbook is one row per report and reader, under the key Postgres would name", () => {
  assert.equal(config.name, "report_workbooks");
  assert.deepEqual(Object.keys(columns).sort(), ["reader", "report_id", "updated_at", "workbook"]);
  for (const c of Object.values(columns)) assert.ok(c.notNull, `${c.name} may be null`);
  assert.equal(columns.report_id!.getSQLType(), "text");
  assert.equal(columns.reader!.getSQLType(), "text");
  assert.equal(columns.workbook!.getSQLType(), "jsonb");
  assert.deepEqual(columns.workbook!.default, {});
  assert.equal(columns.updated_at!.getSQLType(), "timestamp");
  assert.ok(columns.updated_at!.hasDefault, "a row stamps itself");
  assert.equal(config.primaryKeys.length, 1);
  const key = config.primaryKeys[0]!;
  assert.equal(key.getName(), "report_workbooks_pkey");
  assert.deepEqual(key.columns.map((c) => c.name), ["report_id", "reader"]);
});

test("a workbook goes with its report", () => {
  assert.equal(config.foreignKeys.length, 1);
  const fk = config.foreignKeys[0]!;
  assert.equal(fk.getName(), "report_workbooks_report_id_reports_id_fk");
  assert.deepEqual(fk.reference().columns.map((c) => c.name), ["report_id"]);
  assert.equal(getTableConfig(fk.reference().foreignTable).name, "reports");
  assert.equal(fk.onDelete, "cascade");
});

test("the schema index exports the table, so the API and the push both see it", () => {
  assert.equal(schema.reportWorkbooksTable, reportWorkbooksTable);
});

test("the script makes the schema's own table, key and reference by name, so neither it nor the push finds drift", () => {
  assert.match(script, /CREATE TABLE IF NOT EXISTS report_workbooks \(/);
  for (const column of config.columns) assert.match(script, new RegExp(`\\b${column.name}\\s+${column.getSQLType()} NOT NULL\\b`), column.name);
  assert.match(script, /workbook\s+jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
  assert.match(script, /CONSTRAINT report_workbooks_pkey PRIMARY KEY \(report_id, reader\)/);
  assert.match(script, /CONSTRAINT report_workbooks_report_id_reports_id_fk\s+FOREIGN KEY \(report_id\) REFERENCES reports\(id\) ON DELETE CASCADE/);
});

test("the backfill copies each report's ticks to its holder once, whichever of the push and the script made the table (reading 8)", () => {
  assert.doesNotMatch(script, /tableExists\(client, "report_workbooks"\)/, "the push usually makes the table first, so the backfill cannot wait on the script making it");
  assert.match(script, /INSERT INTO report_workbooks \(report_id, reader, workbook\)/);
  assert.match(script, /COALESCE\(CASE WHEN r\.type = 'natal' THEN p\.user_id ELSE rel\.user_id END, 'session:' \|\| r\.session_id\)/);
  assert.match(script, /LEFT JOIN profiles p ON p\.id = r\.profile_id/);
  assert.match(script, /LEFT JOIN relationships rel ON rel\.id = r\.relationship_id/);
  assert.match(script, /r\.workbook <> '\{\}'::jsonb/);
  assert.match(script, /NOT EXISTS \(SELECT 1 FROM report_workbooks w WHERE w\.report_id = r\.id\)/);
  assert.match(script, /ON CONFLICT DO NOTHING/);
});

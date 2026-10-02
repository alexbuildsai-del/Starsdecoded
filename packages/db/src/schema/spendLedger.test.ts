import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTableConfig } from "drizzle-orm/pg-core";
import { spendLedgerTable } from "./spendLedger.js";
import * as schema from "./index.js";

const config = getTableConfig(spendLedgerTable);

test("the table is spend_ledger, one row per UTC day and kind, under the key Postgres would name", () => {
  assert.equal(config.name, "spend_ledger");
  assert.equal(config.primaryKeys.length, 1);
  const key = config.primaryKeys[0]!;
  assert.equal(key.getName(), "spend_ledger_pkey");
  assert.deepEqual(key.columns.map((c) => c.name), ["day", "kind"]);
});

test("every column is required, and the figures are the cost, the calls and when the row last moved", () => {
  const columns = Object.fromEntries(config.columns.map((c) => [c.name, c]));
  assert.deepEqual(Object.keys(columns).sort(), ["calls", "cost_usd", "day", "kind", "updated_at"]);
  for (const c of Object.values(columns)) assert.ok(c.notNull, `${c.name} may be null`);
  assert.equal(columns.day!.getSQLType(), "date");
  assert.equal(columns.cost_usd!.getSQLType(), "double precision");
  assert.equal(columns.calls!.getSQLType(), "integer");
  assert.equal(columns.updated_at!.getSQLType(), "timestamp");
  assert.ok(columns.updated_at!.hasDefault, "a row stamps itself");
});

test("the schema index exports the table, so the API and the push both see it", () => {
  assert.equal(schema.spendLedgerTable, spendLedgerTable);
});

test("the migration script creates the schema's own table, key name included, and skips an existing one", () => {
  const script = readFileSync(fileURLToPath(new URL("../../scripts/migrate-add-spend-ledger.ts", import.meta.url)), "utf8");
  assert.match(script, /CREATE TABLE IF NOT EXISTS spend_ledger/);
  assert.match(script, /CONSTRAINT spend_ledger_pkey PRIMARY KEY \(day, kind\)/);
  assert.match(script, /tableExists\(client, "spend_ledger"\)/);
  for (const column of config.columns) assert.match(script, new RegExp(`\\b${column.name}\\s+${column.getSQLType()}\\b`), column.name);
  assert.doesNotMatch(script, /DROP\s|TRUNCATE|DELETE\s/i);
});

test("bootstrap runs the migration once", () => {
  const bootstrap = readFileSync(fileURLToPath(new URL("../../../../scripts/bootstrap-db.sh", import.meta.url)), "utf8");
  assert.equal(bootstrap.split("migrate-add-spend-ledger").length, 2);
});

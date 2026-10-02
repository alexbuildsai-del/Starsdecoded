import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTableConfig } from "drizzle-orm/pg-core";
import { cspViolationsTable } from "./cspViolations.js";
import * as schema from "./index.js";

const config = getTableConfig(cspViolationsTable);

test("the table is csp_violations, one row per day, directive and blocked value, under the key Postgres would name", () => {
  assert.equal(config.name, "csp_violations");
  assert.equal(config.primaryKeys.length, 1);
  const key = config.primaryKeys[0]!;
  assert.equal(key.getName(), "csp_violations_pkey");
  assert.deepEqual(key.columns.map((c) => c.name), ["day", "directive", "blocked"]);
});

test("every column is required, and the count and the last time seen are the only figures kept", () => {
  const columns = Object.fromEntries(config.columns.map((c) => [c.name, c]));
  assert.deepEqual(Object.keys(columns).sort(), ["blocked", "count", "day", "directive", "last_seen"]);
  for (const c of Object.values(columns)) assert.ok(c.notNull, `${c.name} may be null`);
  assert.equal(columns.day!.getSQLType(), "date");
  assert.equal(columns.count!.getSQLType(), "integer");
  assert.equal(columns.last_seen!.getSQLType(), "timestamp");
  assert.ok(columns.last_seen!.hasDefault, "a row stamps itself");
});

test("the schema index exports the table, so the API and the push both see it", () => {
  assert.equal(schema.cspViolationsTable, cspViolationsTable);
});

test("the migration script creates the schema's own table, key name included, and skips an existing one", () => {
  const script = readFileSync(fileURLToPath(new URL("../../scripts/migrate-add-csp-violations.ts", import.meta.url)), "utf8");
  assert.match(script, /CREATE TABLE IF NOT EXISTS csp_violations/);
  assert.match(script, /CONSTRAINT csp_violations_pkey PRIMARY KEY \(day, directive, blocked\)/);
  assert.match(script, /tableExists\(client, "csp_violations"\)/);
  for (const column of config.columns) assert.match(script, new RegExp(`\\b${column.name}\\s+${column.getSQLType().split(" ")[0]}`), column.name);
  assert.doesNotMatch(script, /DROP\s|TRUNCATE|DELETE\s/i);
});

test("bootstrap runs the migration once", () => {
  const bootstrap = readFileSync(fileURLToPath(new URL("../../../../scripts/bootstrap-db.sh", import.meta.url)), "utf8");
  assert.equal(bootstrap.split("migrate-add-csp-violations").length, 2);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { is, SQL } from "drizzle-orm";
import { getTableConfig, PgDialect, PgTable, type IndexedColumn, type PgColumn } from "drizzle-orm/pg-core";
import { ASK_ROLES, TIMELINE_READING_STATUSES, askMessagesTable, timelineReadingsTable } from "./timeline.js";
import { GENERATION_FAILURE_KINDS, generationFailuresTable } from "./generationFailures.js";
import { SPEND_KINDS, spendLedgerTable } from "./spendLedger.js";
import * as schema from "./index.js";

type TableConfig = ReturnType<typeof getTableConfig>;

const readings = getTableConfig(timelineReadingsTable);
const messages = getTableConfig(askMessagesTable);
const script = readFileSync(fileURLToPath(new URL("../../scripts/migrate-add-timeline.ts", import.meta.url)), "utf8");
const bootstrap = readFileSync(fileURLToPath(new URL("../../../../scripts/bootstrap-db.sh", import.meta.url)), "utf8");
const dialect = new PgDialect();

const columnsOf = (config: TableConfig) => Object.fromEntries(config.columns.map((c) => [c.name, c]));
const indexesOf = (config: TableConfig) =>
  config.indexes
    .map(({ config: index }) => ({
      name: index.name,
      unique: index.unique,
      columns: index.columns.map((c) => (c as IndexedColumn).name),
      where: index.where ? dialect.sqlToQuery(index.where).sql : null,
    }))
    .sort((a, b) => a.name!.localeCompare(b.name!));

/** A column as the script must spell it: its type, then the key, NOT NULL and the default the schema gives it. */
function ddlOf(column: PgColumn): string {
  const fallback = column.default === undefined ? "" : ` DEFAULT ${is(column.default, SQL) ? dialect.sqlToQuery(column.default).sql : String(column.default)}`;
  return `${column.getSQLType()}${column.primary ? " PRIMARY KEY" : ""}${column.notNull ? " NOT NULL" : ""}${fallback}`;
}

/** The script's column lines for one table, name to the rest of the line with its spacing evened out. */
function scriptColumns(table: string): Record<string, string> {
  const block = script.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n\\s*\\);`));
  assert.ok(block, `no CREATE TABLE for ${table}`);
  const lines = block[1]!.split("\n").map((l) => l.trim().replace(/,$/, "")).filter(Boolean);
  return Object.fromEntries(lines.map((l) => {
    const [name, ...rest] = l.split(/\s+/);
    return [name!, rest.join(" ")];
  }));
}

test("a reading is one row per profile and event: whose, which event, on what basis, how far along, what was written and by which model", () => {
  const columns = columnsOf(readings);
  assert.equal(readings.name, "timeline_readings");
  assert.deepEqual(Object.keys(columns).sort(), ["basis", "created_at", "event_key", "id", "model", "profile_id", "reading", "status", "updated_at", "user_id"]);
  assert.ok(columns.id!.primary, "id is the key");
  for (const name of ["id", "user_id", "profile_id", "event_key", "basis", "status", "created_at", "updated_at"]) assert.ok(columns[name]!.notNull, `${name} may be null`);
  for (const name of ["reading", "model"]) assert.ok(!columns[name]!.notNull, `${name} is required while a reading is still writing`);
  for (const name of ["id", "user_id", "profile_id", "event_key", "basis", "status", "model"]) assert.equal(columns[name]!.getSQLType(), "text", name);
  assert.equal(columns.reading!.getSQLType(), "jsonb");
  for (const name of ["created_at", "updated_at"]) {
    assert.equal(columns[name]!.getSQLType(), "timestamp with time zone", name);
    assert.ok(columns[name]!.hasDefault, `${name} stamps itself`);
  }
  assert.deepEqual([...TIMELINE_READING_STATUSES], ["writing", "ready", "failed"]);
  assert.deepEqual(columns.status!.enumValues, [...TIMELINE_READING_STATUSES]);
  assert.equal(readings.foreignKeys.length, 0, "the API removes readings with the report; no cascade does");
  assert.equal(readings.checks.length, 0, "a status is plain text");
});

test("one reading per profile and event, and a reader's readings are found by user", () => {
  assert.deepEqual(indexesOf(readings), [
    { name: "timeline_readings_profile_id_event_key_idx", unique: true, columns: ["profile_id", "event_key"], where: null },
    { name: "timeline_readings_user_id_idx", unique: false, columns: ["user_id"], where: null },
  ]);
});

test("an Ask message is the reader's or Ask's, its body as sent or written, stamped when, and found by user and time", () => {
  const columns = columnsOf(messages);
  assert.equal(messages.name, "ask_messages");
  assert.deepEqual(Object.keys(columns).sort(), ["body", "created_at", "id", "role", "user_id"]);
  assert.ok(columns.id!.primary, "id is the key");
  for (const c of Object.values(columns)) assert.ok(c.notNull, `${c.name} may be null`);
  for (const name of ["id", "user_id", "role"]) assert.equal(columns[name]!.getSQLType(), "text", name);
  assert.equal(columns.body!.getSQLType(), "jsonb");
  assert.equal(columns.created_at!.getSQLType(), "timestamp with time zone");
  assert.ok(columns.created_at!.hasDefault, "a message stamps itself");
  assert.deepEqual([...ASK_ROLES], ["reader", "ask"]);
  assert.deepEqual(columns.role!.enumValues, [...ASK_ROLES]);
  assert.equal(messages.foreignKeys.length, 0);
  assert.equal(messages.checks.length, 0, "a role is plain text");
  assert.deepEqual(indexesOf(messages), [
    { name: "ask_messages_user_id_created_at_idx", unique: false, columns: ["user_id", "created_at"], where: null },
  ]);
});

test("the schema index exports both tables, so the API and the push both see them", () => {
  assert.equal(schema.timelineReadingsTable, timelineReadingsTable);
  assert.equal(schema.askMessagesTable, askMessagesTable);
});

test("no subscriptions table until billing: the admin is Timeline's one source (reading 3)", () => {
  const tables = Object.values(schema).filter((v): v is PgTable => is(v, PgTable)).map((t) => getTableConfig(t).name);
  assert.ok(tables.includes("timeline_readings") && tables.includes("ask_messages"));
  assert.deepEqual(tables.filter((name) => /subscri/i.test(name)), []);
  assert.doesNotMatch(script, /CREATE TABLE IF NOT EXISTS \w*subscri/i);
});

test("the failure log and the spend ledger take Timeline's and Ask's kinds as plain text, with no DDL", () => {
  assert.deepEqual([...GENERATION_FAILURE_KINDS], ["natal", "pair", "lab", "timeline", "ask"]);
  assert.deepEqual([...SPEND_KINDS], ["natal", "pair", "horizon", "synastry", "timeline", "ask"]);
  for (const table of [generationFailuresTable, spendLedgerTable]) {
    const config = getTableConfig(table);
    const kind = config.columns.find((c) => c.name === "kind");
    assert.equal(kind?.getSQLType(), "text", config.name);
    assert.equal(kind?.enumValues, undefined, `${config.name}.kind names no list a new kind must join`);
    assert.equal(config.checks.length, 0, config.name);
  }
});

test("the script makes the schema's own tables and indexes, every name and column as drizzle has it, so neither it nor the push finds drift", () => {
  for (const config of [readings, messages]) {
    const written = scriptColumns(config.name);
    assert.deepEqual(Object.keys(written).sort(), config.columns.map((c) => c.name).sort(), config.name);
    for (const column of config.columns) assert.equal(written[column.name], ddlOf(column), `${config.name}.${column.name}`);
    for (const { config: index } of config.indexes) {
      const on = index.columns.map((c) => (c as IndexedColumn).name).join(", ");
      const statement = `CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${index.name} ON ${config.name} (${on})\``;
      assert.ok(script.includes(statement), statement);
    }
  }
});

test("the script only ever adds: every CREATE is IF NOT EXISTS, and nothing is dropped, emptied or rewritten", () => {
  const adds = script.match(/CREATE (UNIQUE )?(TABLE|INDEX)|ADD COLUMN/g) ?? [];
  const guarded = script.match(/(CREATE (UNIQUE )?(TABLE|INDEX)|ADD COLUMN) IF NOT EXISTS/g) ?? [];
  assert.equal(adds.length, 5, "two tables and three indexes");
  assert.equal(guarded.length, adds.length);
  assert.doesNotMatch(script, /\bDROP\s|\bTRUNCATE\b|\bDELETE\s+FROM\b|\bUPDATE\s+\w+\s+SET\b|\bALTER\s+TABLE\b/i);
});

test("bootstrap runs the script once, as step 3n: after the push and 3m, before the prompt steps", () => {
  assert.equal(bootstrap.split("migrate-add-timeline").length, 2);
  const at = (needle: string) => {
    const i = bootstrap.indexOf(needle);
    assert.ok(i >= 0, needle);
    return i;
  };
  const step = at("==> 3n/7");
  const run = at("migrate-add-timeline");
  assert.ok(at("run push") < step, "after the push");
  assert.ok(at("migrate-add-shares-and-workbooks") < step, "after 3m");
  assert.ok(step < run && run < at("==> 4/7"), "inside 3n");
});

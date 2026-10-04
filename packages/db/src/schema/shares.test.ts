import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTableConfig, PgDialect, type IndexedColumn } from "drizzle-orm/pg-core";
import { profileSharesTable } from "./shares.js";
import { INVITE_KINDS, inviteTokensTable } from "./inviteTokens.js";
import * as schema from "./index.js";

const config = getTableConfig(profileSharesTable);
const columns = Object.fromEntries(config.columns.map((c) => [c.name, c]));
const script = readFileSync(fileURLToPath(new URL("../../scripts/migrate-add-shares-and-workbooks.ts", import.meta.url)), "utf8");
const bootstrap = readFileSync(fileURLToPath(new URL("../../../../scripts/bootstrap-db.sh", import.meta.url)), "utf8");

test("a share is a grant row: whose profile, shared by whom, read by whom, made by which invite, until stopped", () => {
  assert.equal(config.name, "profile_shares");
  assert.deepEqual(Object.keys(columns).sort(), ["created_at", "id", "invite_id", "owner_user_id", "profile_id", "reader_user_id", "revoked_at"]);
  assert.ok(columns.id!.primary, "id is the key");
  for (const name of ["id", "profile_id", "owner_user_id", "reader_user_id", "created_at"]) assert.ok(columns[name]!.notNull, `${name} may be null`);
  for (const name of ["invite_id", "revoked_at"]) assert.ok(!columns[name]!.notNull, `${name} is required`);
  for (const name of ["id", "profile_id", "owner_user_id", "reader_user_id", "invite_id"]) assert.equal(columns[name]!.getSQLType(), "text", name);
  for (const name of ["created_at", "revoked_at"]) assert.equal(columns[name]!.getSQLType(), "timestamp", name);
  assert.ok(columns.created_at!.hasDefault, "a grant stamps itself");
  assert.ok(!columns.revoked_at!.hasDefault, "a grant starts live");
});

test("a grant goes with its profile and outlives the invite that made it", () => {
  const keys = config.foreignKeys
    .map((fk) => ({ name: fk.getName(), from: fk.reference().columns.map((c) => c.name), to: getTableConfig(fk.reference().foreignTable).name, onDelete: fk.onDelete }))
    .sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(keys, [
    { name: "profile_shares_invite_id_invite_tokens_id_fk", from: ["invite_id"], to: "invite_tokens", onDelete: "set null" },
    { name: "profile_shares_profile_id_profiles_id_fk", from: ["profile_id"], to: "profiles", onDelete: "cascade" },
  ]);
});

test("one live grant per profile and reader, so a stopped share never blocks sharing again; readers and owners are looked up", () => {
  const dialect = new PgDialect();
  const indexes = config.indexes
    .map(({ config: index }) => ({
      name: index.name,
      unique: index.unique,
      columns: index.columns.map((c) => (c as IndexedColumn).name),
      where: index.where ? dialect.sqlToQuery(index.where).sql : null,
    }))
    .sort((a, b) => a.name!.localeCompare(b.name!));
  assert.deepEqual(indexes, [
    { name: "profile_shares_owner_user_id_idx", unique: false, columns: ["owner_user_id"], where: null },
    { name: "profile_shares_profile_id_reader_user_id_idx", unique: true, columns: ["profile_id", "reader_user_id"], where: '"profile_shares"."revoked_at" IS NULL' },
    { name: "profile_shares_reader_user_id_idx", unique: false, columns: ["reader_user_id"], where: null },
  ]);
});

test("a share is an invite kind of its own, and a send can be stamped handed back", () => {
  assert.deepEqual([...INVITE_KINDS], ["send", "gift", "share"]);
  const handedBack = getTableConfig(inviteTokensTable).columns.find((c) => c.name === "handed_back_at");
  assert.ok(handedBack, "invite_tokens.handed_back_at is missing");
  assert.equal(handedBack.getSQLType(), "timestamp");
  assert.ok(!handedBack.notNull && !handedBack.hasDefault, "only a handback stamps it");
});

test("the schema index exports the table, so the API and the push both see it", () => {
  assert.equal(schema.profileSharesTable, profileSharesTable);
});

test("the script makes the grant table and the stamp by the schema's own names, so neither it nor the push finds drift", () => {
  assert.match(script, /CREATE TABLE IF NOT EXISTS profile_shares \(/);
  for (const column of config.columns) assert.match(script, new RegExp(`\\b${column.name}\\s+${column.getSQLType()}\\b`), column.name);
  for (const fk of config.foreignKeys) {
    const from = fk.reference().columns[0]!.name;
    const to = getTableConfig(fk.reference().foreignTable).name;
    const pattern = `CONSTRAINT ${fk.getName()}\\s+FOREIGN KEY \\(${from}\\) REFERENCES ${to}\\(id\\) ON DELETE ${fk.onDelete!.toUpperCase()}`;
    assert.match(script, new RegExp(pattern), fk.getName());
  }
  for (const { config: index } of config.indexes) {
    const on = index.columns.map((c) => (c as IndexedColumn).name).join(", ");
    const statement = `CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${index.name} ON profile_shares (${on})${index.where ? " WHERE revoked_at IS NULL" : ""}\``;
    assert.ok(script.includes(statement), statement);
  }
  assert.match(script, /ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS handed_back_at timestamp`/);
});

test("the script only ever adds: every CREATE and ADD COLUMN is IF NOT EXISTS, and nothing is dropped, emptied or rewritten", () => {
  const adds = script.match(/CREATE (UNIQUE )?(TABLE|INDEX)|ADD COLUMN/g) ?? [];
  const guarded = script.match(/(CREATE (UNIQUE )?(TABLE|INDEX)|ADD COLUMN) IF NOT EXISTS/g) ?? [];
  assert.ok(adds.length > 0);
  assert.equal(guarded.length, adds.length);
  assert.doesNotMatch(script, /\bDROP\s|\bTRUNCATE\b|\bDELETE\s+FROM\b|\bUPDATE\s+\w+\s+SET\b/i);
});

test("bootstrap runs the script once, as step 3m: after the push and 3l, before the prompt steps", () => {
  assert.equal(bootstrap.split("migrate-add-shares-and-workbooks").length, 2);
  const at = (needle: string) => {
    const i = bootstrap.indexOf(needle);
    assert.ok(i >= 0, needle);
    return i;
  };
  const step = at("==> 3m/7");
  const run = at("migrate-add-shares-and-workbooks");
  assert.ok(at("run push") < step, "after the push");
  assert.ok(at("==> 3l/7") < step, "after 3l");
  assert.ok(step < run && run < at("==> 4/7"), "inside 3m");
});

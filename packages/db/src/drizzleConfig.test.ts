import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

// drizzle-kit loads its config as CommonJS, where __dirname exists; under tsx
// the file is an ES module, so the test lends it one.
const packageDir = fileURLToPath(new URL("..", import.meta.url));
Object.assign(globalThis, { __dirname: packageDir });
process.env.DATABASE_URL = "postgres://postgres@127.0.0.1:5432/postgres";
delete process.env.DATABASE_SSL;
const { pushCredentials, default: config } = await import("../drizzle.config.js");

const pooler = "aws-0-eu-central-1.pooler.supabase.com";
const NO_CHAIN_CHECK = { rejectUnauthorized: false };

test("without DATABASE_SSL push gets the url as given, sslmode and all", () => {
  const url = `postgresql://postgres.prodref:a@${pooler}:5432/postgres?sslmode=require`;
  for (const databaseSsl of [undefined, "", "disable"]) assert.deepEqual(pushCredentials(url, databaseSsl), { url });
});

test("with DATABASE_SSL=require push gets the pool's TLS without chain checks, even where the url says sslmode=require", () => {
  assert.deepEqual(pushCredentials(`postgresql://postgres.prodref:p%40ss%2Fw@${pooler}:6543/postgres?sslmode=require`, "require"), {
    host: pooler,
    port: 6543,
    user: "postgres.prodref",
    password: "p@ss/w",
    database: "postgres",
    ssl: NO_CHAIN_CHECK,
  });
});

test("a url without a port, a password or a database leaves pg its defaults: 5432 and the user's own database", () => {
  assert.deepEqual(pushCredentials("postgres://postgres@127.0.0.1", "require"), {
    host: "127.0.0.1",
    user: "postgres",
    database: "postgres",
    ssl: NO_CHAIN_CHECK,
  });
  assert.deepEqual(pushCredentials("postgres://reader@[::1]:5433/stars", "require"), {
    host: "::1",
    port: 5433,
    user: "reader",
    database: "stars",
    ssl: NO_CHAIN_CHECK,
  });
});

test("the config push reads takes its credentials from the environment and its schema from the package", () => {
  assert.equal(config.dialect, "postgresql");
  assert.deepEqual(config.dbCredentials, { url: "postgres://postgres@127.0.0.1:5432/postgres" });
  assert.equal(config.schema, path.join(packageDir, "src/schema/index.ts"));
});

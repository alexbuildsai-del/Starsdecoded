import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// bootstrap-db.sh runs against a stand-in pnpm, so no database is reached:
// push answers as each case says, migrate passes, and the first step after
// the push exits 42, which shows the deploy went past step 2 and stops it there.
const BOOTSTRAP = fileURLToPath(new URL("../../../scripts/bootstrap-db.sh", import.meta.url));
const dir = mkdtempSync(path.join(tmpdir(), "bootstrap-db-"));
after(() => rmSync(dir, { recursive: true, force: true }));

writeFileSync(
  path.join(dir, "pnpm"),
  `#!/bin/bash
printf '%s\\n' "$*" >> "$STUB_LOG"
case "$*" in
  "--filter @workspace/db run migrate") exit 0 ;;
  "--filter @workspace/db run push")
    printf '%s\\n' "$PUSH_STDOUT"
    if [ -n "$PUSH_STDERR" ]; then printf '%s\\n' "$PUSH_STDERR" >&2; fi
    exit "$PUSH_STATUS" ;;
  *) exit 42 ;;
esac
`,
  { mode: 0o755 },
);

const PULLED = [
  "> @workspace/db@0.0.0 push /app/packages/db",
  "> drizzle-kit push --config ./drizzle.config.ts",
  "",
  "Reading config file '/app/packages/db/drizzle.config.ts'",
  "Using 'pg' driver for database querying",
  "[✓] Pulling schema from database...",
].join("\n");

// What drizzle-kit 0.31 printed on a scratch database when push met two rows its
// unique index forbids (MB-123), and then it exited 0.
const UNIQUE_OVER_DUPLICATES = [
  'error: could not create unique index "profiles_user_id_is_self_idx"',
  "    at /app/node_modules/.pnpm/pg-pool@3.14.0_pg@8.23.0/node_modules/pg-pool/index.js:45:11",
  "    at async pgPush (/app/node_modules/.pnpm/drizzle-kit@0.31.11/node_modules/drizzle-kit/bin.cjs:82768:13) {",
  "  severity: 'ERROR',",
  "  code: '23505',",
  "  constraint: 'profiles_user_id_is_self_idx'",
  "}",
].join("\n");

let run = 0;
function bootstrap(push: { stdout: string; stderr?: string; status: number }) {
  const log = path.join(dir, `calls-${++run}.log`);
  const result = spawnSync("bash", [BOOTSTRAP], {
    encoding: "utf8",
    env: {
      PATH: `${dir}:${process.env.PATH}`,
      HOME: process.env.HOME ?? dir,
      DATABASE_URL: "postgres://stub@127.0.0.1:1/none",
      STUB_LOG: log,
      PUSH_STDOUT: push.stdout,
      PUSH_STDERR: push.stderr ?? "",
      PUSH_STATUS: String(push.status),
    },
  });
  const calls = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [];
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, calls };
}

test("a push that prints an error and exits 0 stops the deploy at step 2, naming the error (MB-123)", () => {
  const out = bootstrap({ stdout: PULLED, stderr: UNIQUE_OVER_DUPLICATES, status: 0 });
  assert.equal(out.status, 1);
  assert.match(out.stderr, /bootstrap-db: schema push FAILED: error: could not create unique index "profiles_user_id_is_self_idx"/);
  assert.deepEqual(out.calls, ["--filter @workspace/db run migrate", "--filter @workspace/db run push"]);
  assert.ok(out.stdout.includes(UNIQUE_OVER_DUPLICATES), "push's own output still reaches the deploy log");
});

test("a push that exits non-zero stops the deploy at step 2, even with no error line", () => {
  const out = bootstrap({ stdout: PULLED, status: 3 });
  assert.equal(out.status, 1);
  assert.match(out.stderr, /bootstrap-db: schema push FAILED: exit status 3/);
  assert.deepEqual(out.calls, ["--filter @workspace/db run migrate", "--filter @workspace/db run push"]);
});

test("a clean push goes on to step 3, its output in the deploy log", () => {
  for (const done of ["[✓] Changes applied", "[i] No changes detected"]) {
    const out = bootstrap({ stdout: `${PULLED}\n${done}`, status: 0 });
    assert.equal(out.status, 42, out.stderr);
    assert.equal(out.calls[2], "--filter @workspace/db exec tsx scripts/migrate-add-invites.ts");
    assert.ok(out.stdout.includes(done));
    assert.doesNotMatch(out.stderr, /FAILED/);
  }
});

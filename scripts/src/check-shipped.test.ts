import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXCEPTIONS, checkShipped, withoutComments } from "../check-shipped.js";

// ADR-192: each fault is planted in a scratch tree and read back with its file and line.

const SCRIPT = fileURLToPath(new URL("../check-shipped.ts", import.meta.url));

function scratch(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "check-shipped-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}

function findings(files: Record<string, string>) {
  const root = scratch(files);
  try {
    return checkShipped(root).findings.map((f) => `${f.file}:${f.line}:${f.rule}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("console.log, localhost and 127.0.0.1 fail with file and line", () => {
  assert.deepEqual(findings({ "api/src/lib/x.ts": "export const a = 1;\n\nconsole.log(a);\n" }), ["api/src/lib/x.ts:3:console-log"]);
  assert.deepEqual(findings({ "web/src/y.tsx": "const a = 1;\nconst u = `http://localhost:5173`;\n" }), ["web/src/y.tsx:2:localhost"]);
  assert.deepEqual(findings({ "packages/p/src/z.ts": 'const h = "127.0.0.1";\n' }), ["packages/p/src/z.ts:1:localhost"]);
});

test("a TODO needs an MB-NN ref on its line", () => {
  assert.deepEqual(findings({ "api/src/a.ts": "// TODO later\n// TODO MB-12 later\n/* TODO: x */\n" }), ["api/src/a.ts:1:todo", "api/src/a.ts:3:todo"]);
});

test('"Astra" fails by word, so a place name passes', () => {
  assert.deepEqual(findings({ "web/src/a.ts": 'export const t = "Astra";\nexport const z = "Europe/Astrakhan";\n' }), ["web/src/a.ts:1:astra"]);
});

test("web importing api/ fails by package name, path and specifier", () => {
  assert.deepEqual(
    findings({
      "web/src/lib/a.ts": 'import x from "@workspace/api-server";\nimport y from "../../../api/src/lib/names";\nexport { z } from "api/src/z";\nimport ok from "@workspace/engine";\n',
      "api/src/lib/names.ts": "export default 1;\n",
    }),
    ["web/src/lib/a.ts:1:web-imports-api", "web/src/lib/a.ts:2:web-imports-api", "web/src/lib/a.ts:3:web-imports-api"],
  );
  assert.deepEqual(findings({ "api/src/a.ts": 'import x from "../../web/src/a";\n' }), []);
});

test("console.log and localhost in a comment pass; a // inside a string or template does not hide code", () => {
  assert.deepEqual(
    findings({
      "api/src/a.ts": [
        "// console.log(x) and localhost in a note",
        "/**",
        " * console.log('doc example')",
        " */",
        'const url = "http://x"; console.log(url);',
        "const t = `//${1}`; console.log(t);",
        "run(); // console.log(a) after code",
      ].join("\n"),
    }),
    ["api/src/a.ts:5:console-log", "api/src/a.ts:6:console-log"],
  );
});

test("tests, test helpers, the walk, fixtures, generated files and tooling are not shipped code", () => {
  const bad = "console.log(1); // TODO x\n";
  assert.deepEqual(
    findings({
      "api/src/lib/a.test.ts": bad,
      "api/src/lib/testModel.ts": bad,
      "api/src/walk/loop.walk.ts": bad,
      "api/src/fixtures/a.ts": bad,
      "packages/api-zod/src/generated/api.ts": bad,
      "scripts/src/tool.ts": bad,
      "web/scripts/csp.mjs": bad,
    }),
    [],
  );
  assert.deepEqual(findings({ "api/src/lib/testament.ts": "console.log(1);\n" }), ["api/src/lib/testament.ts:1:console-log"]);
});

test("the exceptions are a table, honoured per file and rule and counted by line", () => {
  const ex = EXCEPTIONS.find((e) => e.rule === "localhost")!;
  assert.ok(EXCEPTIONS.every((e) => e.file && e.rule && e.reason && e.lines >= 1));
  assert.deepEqual(findings({ [ex.file]: 'const a = "http://localhost:5173";\n' }), []);
  assert.deepEqual(findings({ [ex.file]: 'const a = "http://localhost:5173";\nconst b = "http://localhost:1";\n' }), [`${ex.file}:2:localhost`]);
  assert.deepEqual(findings({ [ex.file]: "console.log(1);\n" }), [`${ex.file}:1:console-log`]);
});

test("withoutComments keeps every line where it was", () => {
  const text = "a // x\n/* y\nz */ b\n";
  const out = withoutComments(text, "a.ts");
  assert.equal(out.split("\n").length, text.split("\n").length);
  assert.equal(out.trim().replace(/\s+/g, " "), "a b");
});

test("the command exits 1 naming file and line for a console.log planted in api/src/lib/", () => {
  const root = scratch({ "api/src/lib/planted.ts": "export const a = 1;\nconsole.log(a);\n" });
  try {
    const r = spawnSync(process.execPath, ["--import", "tsx", SCRIPT, root], { encoding: "utf8", cwd: dirname(SCRIPT) });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /api\/src\/lib\/planted\.ts:2: console-log/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

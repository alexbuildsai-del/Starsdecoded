import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { analyze, format } from "../check-callers.js";

// Lessons R14 to R19: a changed shared export with a caller outside the card's files. The fixture is a throwaway git
// repo with a workspace package, a barrel, a deep importer and a bystander.

function repo(files: Record<string, string>): { root: string; write: (name: string, text: string) => void; done: () => void } {
  const root = mkdtempSync(join(tmpdir(), "check-callers-"));
  const write = (name: string, text: string): void => {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), text);
  };
  for (const [name, text] of Object.entries(files)) write(name, text);
  const git = (...args: string[]): void => void execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: root, stdio: "ignore" });
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { root, write, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("an edited export lists its importers through a barrel and a workspace package, not the files in the diff", () => {
  const r = repo({
    "packages/lib/package.json": JSON.stringify({ name: "@workspace/lib", exports: { ".": "./src/index.ts" } }),
    "packages/lib/src/index.ts": 'export * from "./price.js";\n',
    "packages/lib/src/price.ts": "export function priceOf(id: string): number {\n  return id.length;\n}\nexport const OTHER = 1;\n",
    "api/src/route.ts": 'import { priceOf } from "@workspace/lib";\nexport const r = priceOf("a");\n',
    "web/src/page.tsx": 'import * as lib from "@workspace/lib";\nexport const p = lib.priceOf("b");\n',
    "web/src/unrelated.ts": 'import { OTHER } from "@workspace/lib";\nexport const o = OTHER;\n',
  });
  try {
    r.write("packages/lib/src/price.ts", "export function priceOf(id: string, cents = false): number {\n  return id.length;\n}\nexport const OTHER = 1;\n");
    const report = analyze(r.root, "main");
    const price = report.symbols.find((s) => s.name === "priceOf");
    assert.deepEqual(price?.callers.map((c) => c.file), ["api/src/route.ts", "web/src/page.tsx"]);
    assert.equal(report.symbols.some((s) => s.name === "OTHER"), false);
    assert.match(format(report, false), /priceOf\s+packages\/lib\/src\/price\.ts\s+api\/src\/route\.ts:1/);
  } finally {
    r.done();
  }
});

test("a removed export still lists its importers, and an untouched tree says so", () => {
  const r = repo({
    "api/src/a.ts": "export const A = 1;\nexport const B = 2;\n",
    "api/src/b.ts": 'import { B } from "./a.js";\nexport const c = B;\n',
  });
  try {
    assert.match(format(analyze(r.root, "main"), false), /no shared exports changed/);
    r.write("api/src/a.ts", "export const A = 1;\n");
    const report = analyze(r.root, "main");
    assert.deepEqual(report.symbols.map((s) => [s.name, s.removed, s.callers.map((c) => c.file)]), [["B", true, ["api/src/b.ts"]]]);
  } finally {
    r.done();
  }
});

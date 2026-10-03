import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// MB-172: 43 files of the ui kit sat in web/src/components/ui with nothing importing them, and every install fetched the
// dev libraries only they imported. A ui file nothing reaches is deleted with what only it imports, so the folder holds
// what the site uses and the kit cannot grow back unnoticed.

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const UI = "web/src/components/ui/";
const CODE = /\.[cm]?[jt]sx?$/;
// Installed packages and build output import nothing of ours; dot directories hold tooling and worktree copies.
const SKIPPED = new Set(["node_modules", "dist", "dist-ssr", "build", "coverage"]);
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mts", ".mjs", ".cts", ".cjs"];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith(".") || SKIPPED.has(entry.name) ? [] : walk(path);
    return entry.isFile() && CODE.test(entry.name) ? [path] : [];
  });
}

/**
 * Every workspace's code, tests and e2e included, because any file importing a ui file keeps it. Repo-relative with
 * forward slashes, so a failure reads the same on every machine.
 */
function codeFiles(): string[] {
  return walk(ROOT).map((file) => relative(ROOT, file).split(sep).join("/"));
}

/** TypeScript's own pre-processor, so a multi-line or dynamic import is not missed and a commented-out one keeps nothing. */
function specifiers(text: string): string[] {
  return ts.preProcessFile(text, true, true).importedFiles.map((file) => file.fileName);
}

function resolveImport(importer: string, specifier: string, files: ReadonlySet<string>): string | undefined {
  let base: string;
  if (specifier.startsWith("@/")) {
    // The web's alias (web/tsconfig.json, vite.config.ts); in another workspace it would name that workspace's folders.
    if (!importer.startsWith("web/")) return undefined;
    base = posix.join("web/src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = posix.join(posix.dirname(importer), specifier);
  } else {
    return undefined;
  }
  const stem = base.replace(/\.[cm]?jsx?$/, "");
  const candidates = [base, ...EXTENSIONS.map((ext) => stem + ext), ...EXTENSIONS.map((ext) => `${base}/index${ext}`)];
  return candidates.find((candidate) => files.has(candidate));
}

/** A ui file only unreached ui files import is as dead as one nothing imports, so reach starts outside the folder. */
function unreached(imports: ReadonlyMap<string, readonly string[]>): string[] {
  const reached = new Set<string>();
  const queue = [...imports.keys()].filter((file) => !file.startsWith(UI));
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    for (const target of imports.get(file) ?? []) {
      if (!target.startsWith(UI) || reached.has(target)) continue;
      reached.add(target);
      queue.push(target);
    }
  }
  return [...imports.keys()].filter((file) => file.startsWith(UI) && !reached.has(file)).sort();
}

function importGraph(files: readonly string[]): Map<string, string[]> {
  const known = new Set(files);
  return new Map(
    files.map((file) => [
      file,
      specifiers(readFileSync(join(ROOT, file), "utf8")).flatMap((specifier) => resolveImport(file, specifier, known) ?? []),
    ]),
  );
}

test("a ui file nothing imports is found, and so is one only such a file imports", () => {
  const imports = new Map<string, string[]>([
    ["web/src/pages/Home.tsx", ["web/src/components/ui/dialog.tsx", "web/src/lib/utils.ts"]],
    ["web/src/lib/utils.ts", []],
    ["web/src/lib/toast.test.ts", ["web/src/components/ui/toast.tsx"]],
    ["web/src/components/ui/dialog.tsx", ["web/src/components/ui/button.tsx", "web/src/lib/utils.ts"]],
    ["web/src/components/ui/button.tsx", []],
    ["web/src/components/ui/toast.tsx", []],
    ["web/src/components/ui/command.tsx", ["web/src/components/ui/dialog.tsx", "web/src/components/ui/kbd.tsx"]],
    ["web/src/components/ui/kbd.tsx", ["web/src/components/ui/command.tsx"]],
  ]);
  assert.deepEqual(unreached(imports), ["web/src/components/ui/command.tsx", "web/src/components/ui/kbd.tsx"]);
});

test("every way of importing is read, and an import in a comment is not", () => {
  const text = [
    'import { Button } from "@/components/ui/button";',
    "import {",
    "  Dialog,",
    '} from "@/components/ui/dialog";',
    'import type { ToastProps } from "@/components/ui/toast";',
    'export { Label } from "../ui/label";',
    'import "./side-effect";',
    "const Note = () => <p>Don't import it here, it's prose</p>;",
    'const Page = lazy(() => import("@/pages/AdminLabPage"));',
    'const legacy = require("./legacy.cjs");',
    '// import { Sheet } from "@/components/ui/sheet";',
    '/* import("@/components/ui/select") */',
  ].join("\n");
  assert.deepEqual(specifiers(text), [
    "@/components/ui/button",
    "@/components/ui/dialog",
    "@/components/ui/toast",
    "../ui/label",
    "./side-effect",
    "@/pages/AdminLabPage",
    "./legacy.cjs",
  ]);
});

test("a specifier resolves through the web's alias or a relative path to the file it names", () => {
  const files = new Set(["web/src/components/ui/button.tsx", "web/src/components/chart/index.ts", "api/src/app.ts"]);
  const button = "web/src/components/ui/button.tsx";
  assert.equal(resolveImport("web/src/pages/Home.tsx", "@/components/ui/button", files), button);
  assert.equal(resolveImport("web/src/components/ui/dialog.tsx", "./button", files), button);
  assert.equal(resolveImport("web/src/pages/Home.tsx", "../components/ui/button.tsx", files), button);
  assert.equal(resolveImport("web/src/pages/Home.tsx", "../components/ui/button.js", files), button);
  assert.equal(resolveImport("web/scripts/prerender.mjs", "../src/components/ui/button", files), button);
  assert.equal(resolveImport("web/src/pages/Home.tsx", "@/components/chart", files), "web/src/components/chart/index.ts");
  assert.equal(resolveImport("api/src/app.ts", "@/components/ui/button", files), undefined);
  assert.equal(resolveImport("web/src/pages/Home.tsx", "@radix-ui/react-dialog", files), undefined);
});

test("the scan reads the web, its tests, and every other workspace", () => {
  const files = codeFiles();
  // A wrong root would read nothing and pass, so the files that must be read are named.
  for (const expected of ["web/src/App.tsx", "web/vite.config.ts", "api/src/app.ts", "e2e/playwright.config.ts", "scripts/check-shipped.ts"]) {
    assert.ok(files.includes(expected), `${expected} is read`);
  }
  assert.ok(files.some((file) => file.startsWith(UI)), `${UI} holds files`);
  assert.ok(files.some((file) => file.startsWith("web/src/") && /\.test\.tsx?$/.test(file)), "the web's tests are read");
  assert.ok(!files.some((file) => file.split("/").includes("node_modules")), "installed packages are not read");
});

test("every web/src/components/ui file is imported", () => {
  const dead = unreached(importGraph(codeFiles()));
  assert.deepEqual(
    dead,
    [],
    `Nothing imports ${dead.length} ${UI} file(s) (MB-172). Delete each, with what only it imports, and take each library only` +
      ` it imported out of web/package.json:\n${dead.join("\n")}`,
  );
});

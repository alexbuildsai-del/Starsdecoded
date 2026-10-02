import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { duplicates, variants } from "../check-single-copies.js";

const TWO_COPIES = `lockfileVersion: '9.0'

packages:

  '@tanstack/react-query@5.103.2':
    resolution: {integrity: sha512-x}

snapshots:

  '@tanstack/query-core@5.103.2': {}

  '@tanstack/react-query@5.103.2(react@19.2.8)':
    dependencies:
      react: 19.2.8

  '@tanstack/react-query@5.103.2(react@19.3.0)':
    dependencies:
      react: 19.3.0

  react-dom@19.3.0(react@19.3.0):
    dependencies:
      react: 19.3.0

  react@19.2.8: {}

  react@19.3.0: {}
`;

test("the lockfile that broke the dashboard names both copies of react-query and of react", () => {
  assert.deepEqual(duplicates(TWO_COPIES), [
    "react: 19.2.8, 19.3.0",
    "@tanstack/react-query: 5.103.2(react@19.2.8), 5.103.2(react@19.3.0)",
  ]);
});

test("the packages section and look-alike names are not counted", () => {
  const found = variants(TWO_COPIES);
  assert.deepEqual(found.get("react-dom"), ["19.3.0(react@19.3.0)"]);
  assert.equal(found.get("@tanstack/react-query")?.length, 2);
});

test("the repository's own lockfile holds one copy of each", () => {
  const lock = readFileSync(fileURLToPath(new URL("../../pnpm-lock.yaml", import.meta.url)), "utf8");
  assert.deepEqual(duplicates(lock), []);
});

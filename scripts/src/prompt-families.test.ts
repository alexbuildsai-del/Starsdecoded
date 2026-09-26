import { test } from "node:test";
import assert from "node:assert/strict";
import { promptFamilies } from "./prompt-families.js";

test("three families: natal on the natal version, pair on the pair version, every :system row on the natal version", () => {
  const families = promptFamilies("v7", "p2");
  assert.deepEqual(families, [
    { key: "__prompt_version", like: "natal:%", version: "v7", label: "natal" },
    { key: "__pair_prompt_version", like: "pair:%", version: "p2", label: "pair" },
    { key: "__system_prompt_version", like: "%:system", version: "v7", label: "system" },
  ]);
});

// The patterns as Postgres reads them: `%` any run, `_` one character.
const like = (pattern: string, key: string): boolean =>
  new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`).test(key);

test("a natal bump clears natal rows and every :system row, and a pair :user override survives it", () => {
  const [natal, pair, system] = promptFamilies("v7", "p2");
  const rows = ["natal:overview:system", "natal:overview:user", "pair:links:system", "pair:links:user", "__prompt_version", "__pair_prompt_version"];
  const cleared = (family: { like: string }) => rows.filter((r) => like(family.like, r));
  assert.deepEqual(cleared(natal), ["natal:overview:system", "natal:overview:user"]);
  assert.deepEqual(cleared(pair), ["pair:links:system", "pair:links:user"]);
  assert.deepEqual(cleared(system), ["natal:overview:system", "pair:links:system"]);
  const afterNatalBump = rows.filter((r) => !like(natal.like, r) && !like(system.like, r));
  assert.deepEqual(afterNatalBump, ["pair:links:user", "__prompt_version", "__pair_prompt_version"]);
});

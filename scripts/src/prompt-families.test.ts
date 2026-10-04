import { test } from "node:test";
import assert from "node:assert/strict";
import { promptFamilies } from "./prompt-families.js";

const VERSIONS = { natal: "v7", pair: "p2", timeline: "t1", ask: "a1" };

test("five families: each on its own version, and every :system row on the natal version", () => {
  assert.deepEqual(promptFamilies(VERSIONS), [
    { key: "__prompt_version", like: "natal:%", version: "v7", label: "natal" },
    { key: "__pair_prompt_version", like: "pair:%", version: "p2", label: "pair" },
    { key: "__timeline_prompt_version", like: "timeline:%", version: "t1", label: "timeline" },
    { key: "__ask_prompt_version", like: "ask:%", version: "a1", label: "ask" },
    { key: "__system_prompt_version", like: "%:system", version: "v7", label: "system" },
  ]);
});

// The patterns as Postgres reads them: `%` any run, `_` one character.
const like = (pattern: string, key: string): boolean =>
  new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`).test(key);

const ROWS = [
  "natal:overview:system", "natal:overview:user",
  "pair:links:system", "pair:links:user",
  "timeline:reading:system", "timeline:reading:user",
  "ask:plan:system", "ask:plan:user", "ask:answer:system", "ask:answer:user",
  "__prompt_version", "__pair_prompt_version", "__timeline_prompt_version", "__ask_prompt_version", "__system_prompt_version",
];

const cleared = (family: { like: string }) => ROWS.filter((r) => like(family.like, r));

test("each family clears its own rows and no version row", () => {
  const [natal, pair, timeline, ask] = promptFamilies(VERSIONS);
  assert.deepEqual(cleared(natal), ["natal:overview:system", "natal:overview:user"]);
  assert.deepEqual(cleared(pair), ["pair:links:system", "pair:links:user"]);
  assert.deepEqual(cleared(timeline), ["timeline:reading:system", "timeline:reading:user"]);
  assert.deepEqual(cleared(ask), ["ask:plan:system", "ask:plan:user", "ask:answer:system", "ask:answer:user"]);
});

test("a natal bump clears every :system row, Timeline's and Ask's included, since each carries the style contract, and every other :user override survives it", () => {
  const families = promptFamilies(VERSIONS);
  const natal = families.find((f) => f.label === "natal")!;
  const system = families.find((f) => f.label === "system")!;
  assert.deepEqual(cleared(system), ["natal:overview:system", "pair:links:system", "timeline:reading:system", "ask:plan:system", "ask:answer:system"]);
  const afterNatalBump = ROWS.filter((r) => !like(natal.like, r) && !like(system.like, r));
  assert.deepEqual(afterNatalBump, [
    "pair:links:user", "timeline:reading:user", "ask:plan:user", "ask:answer:user",
    "__prompt_version", "__pair_prompt_version", "__timeline_prompt_version", "__ask_prompt_version", "__system_prompt_version",
  ]);
});

test("a timeline or an ask bump leaves the natal, pair and system families alone", () => {
  const moved = promptFamilies({ ...VERSIONS, timeline: "t2", ask: "a2" });
  const before = promptFamilies(VERSIONS);
  const changed = moved.filter((f, i) => f.version !== before[i].version).map((f) => f.label);
  assert.deepEqual(changed, ["timeline", "ask"]);
});

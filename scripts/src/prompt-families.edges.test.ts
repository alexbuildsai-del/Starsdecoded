/**
 * The override families beside their callers (R16-22, R-7.3, ADR-104): each family has its own key and namespace, a
 * version flows only to its own row, and the bootstrap's step reads all four versions from where they live.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { promptFamilies } from "./prompt-families.js";

const V = { natal: "v7", pair: "p2", timeline: "t1", ask: "a1" };
const families = promptFamilies(V);
const like = (pattern: string, key: string): boolean =>
  new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`).test(key);
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("each family has a key and a label of its own, and the version rows are all `__` keys", () => {
  assert.equal(new Set(families.map((f) => f.key)).size, families.length);
  assert.equal(new Set(families.map((f) => f.label)).size, families.length);
  assert.deepEqual(families.map((f) => f.label), ["natal", "pair", "timeline", "ask", "system"]);
  for (const f of families) assert.match(f.key, /^__([a-z]+_)?prompt_version$/, f.key);
});

test("a family's pattern reaches its own namespace and no other, and no version row", () => {
  const namespaces = families.filter((f) => f.label !== "system");
  for (const f of namespaces) {
    assert.equal(f.like, `${f.label}:%`);
    for (const other of namespaces) {
      if (other === f) continue;
      assert.equal(like(f.like, `${other.label}:x:system`), false, `${f.label} must not reach ${other.label}`);
      assert.equal(like(f.like, `${other.label}:x:user`), false);
    }
    for (const row of families.map((x) => x.key)) assert.equal(like(f.like, row), false, `${f.label} must not clear ${row}`);
  }
  const system = families.find((f) => f.label === "system")!;
  for (const row of families.map((x) => x.key)) assert.equal(like(system.like, row), false, `the system family must not clear ${row}`);
  assert.equal(like(system.like, "ask:answer:user"), false);
  assert.equal(like(system.like, "timeline:reading:user"), false);
  assert.equal(like(system.like, "timeline:reading:system"), true);
});

test("each version flows to its own family only, and the system family follows the natal one", () => {
  for (const [name, bump] of [["natal", { natal: "v8" }], ["pair", { pair: "p3" }], ["timeline", { timeline: "t2" }], ["ask", { ask: "a2" }]] as const) {
    const moved = promptFamilies({ ...V, ...bump }).filter((f, i) => f.version !== families[i].version).map((f) => f.label);
    assert.deepEqual(moved, name === "natal" ? ["natal", "system"] : [name], name);
  }
});

test("a version is passed through as given, empty or odd as it is, and the family does not invent one", () => {
  const odd = promptFamilies({ natal: "", pair: " p ", timeline: "t1\n", ask: "ÄÖ" });
  assert.deepEqual(odd.map((f) => f.version), ["", " p ", "t1\n", "ÄÖ", ""]);
});

test("the function holds no state: two calls give equal, separate lists", () => {
  const a = promptFamilies(V);
  const b = promptFamilies(V);
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
  a[0].version = "changed";
  assert.equal(promptFamilies(V)[0].version, "v7");
});

test("the reset script reads each family's version from the module that owns it, and nothing is left unwired", () => {
  const script = read("./reset-stale-prompt-overrides.ts");
  assert.match(script, /import \{ PROMPT_VERSION \} from "\.\.\/\.\.\/api\/src\/lib\/aiInterpretation\.js"/);
  assert.match(script, /import \{ PAIR_PROMPT_VERSION \} from "\.\.\/\.\.\/api\/src\/prompts\/pair\/index\.js"/);
  assert.match(script, /import \{ TIMELINE_PROMPT_VERSION \} from "\.\.\/\.\.\/api\/src\/prompts\/timeline\/index\.js"/);
  assert.match(script, /import \{ ASK_PROMPT_VERSION \} from "\.\.\/\.\.\/api\/src\/prompts\/ask\/index\.js"/);
  assert.match(script, /natal: PROMPT_VERSION, pair: PAIR_PROMPT_VERSION, timeline: TIMELINE_PROMPT_VERSION, ask: ASK_PROMPT_VERSION/);
  assert.doesNotMatch(script, /promptFamilies\(PROMPT_VERSION, PAIR_PROMPT_VERSION\)/, "the old two-argument call is gone");
});

test("the bootstrap's prompt step runs the reset script and says all four families", () => {
  const bootstrap = read("../bootstrap-db.sh");
  const step = bootstrap.slice(bootstrap.indexOf("==> 6/7"), bootstrap.indexOf("==> 7/7"));
  assert.match(step, /pnpm --filter @workspace\/scripts run prompts:reset-stale/);
  for (const family of ["natal", "pair", "timeline", "ask"]) assert.match(step, new RegExp(family), family);
  assert.match(step, /all four families/);
});

test("the version constants the families follow are the ones Timeline and Ask state", async () => {
  process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
  const { TIMELINE_PROMPT_VERSION } = await import("../../api/src/prompts/timeline/index.js");
  const { ASK_PROMPT_VERSION } = await import("../../api/src/prompts/ask/index.js");
  assert.equal(TIMELINE_PROMPT_VERSION, "t1");
  assert.equal(ASK_PROMPT_VERSION, "a1");
  assert.match(TIMELINE_PROMPT_VERSION, /^t\d+$/);
  assert.match(ASK_PROMPT_VERSION, /^a\d+$/);
});

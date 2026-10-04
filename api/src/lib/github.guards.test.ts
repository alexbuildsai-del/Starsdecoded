/**
 * The release token's reach, tested on the two patterns themselves (R16-05, ADR-247, ADR-250): a sample branch writes
 * /sample's run (one JSON file in its folder) and Mira's week at its one path, and nothing else. `github.test.ts` drives
 * the same guards through `commitFile`; here each pattern is held to its two allowed shapes by name, with the paths a
 * careless or hostile release id, file name or merge could produce.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BRAIN_PATHS, COMPARE_FILE_CAP, PAIR_BRAIN_PATHS, RELEASE_BRANCH, SAMPLE_FILE, SAMPLE_REF, brainDiff, githubApi } from "./github.js";

const SAMPLE_DIR = "web/src/site/data/sample/";
const MIRA = "web/src/site/data/timeline/mira-week.json";
const RELEASE_ID = "0b9e7c1a-2f4d-4e8a-9c3b-5d6e7f8a9b0c";

test("SAMPLE_FILE admits a JSON file in /sample's folder and Mira's week, and no other path", () => {
  for (const path of [
    `${SAMPLE_DIR}audrey-hepburn.${RELEASE_ID}.json`,
    `${SAMPLE_DIR}a.json`,
    `${SAMPLE_DIR}0.json`,
    `${SAMPLE_DIR}audrey-hepburn.r1.json`,
    `${SAMPLE_DIR}Audrey.JSON-x.json`,
    MIRA,
  ]) {
    assert.ok(SAMPLE_FILE.test(path), path);
  }
});

test("SAMPLE_FILE refuses every path that is neither shape: other folders, other types, climbing, hidden, doubled and padded paths", () => {
  const refused = [
    "",
    "/",
    "web",
    "web/src/site/data/sample/",
    "web/src/site/data/sample",
    "web/src/site/data/sample.json",
    "web/src/site/data/sample.ts",
    "web/src/site/data/timeline/",
    "web/src/site/data/timeline/mira-week",
    // The folder's own shape, broken one way each.
    `${SAMPLE_DIR}x.ts`,
    `${SAMPLE_DIR}x.json.ts`,
    `${SAMPLE_DIR}x.JSON`,
    `${SAMPLE_DIR}x.jsonl`,
    `${SAMPLE_DIR}x.json5`,
    `${SAMPLE_DIR}.json`,
    `${SAMPLE_DIR}.hidden.json`,
    `${SAMPLE_DIR}-x.json`,
    `${SAMPLE_DIR}x_y.json`,
    `${SAMPLE_DIR}x y.json`,
    `${SAMPLE_DIR} x.json`,
    `${SAMPLE_DIR}x.json `,
    `${SAMPLE_DIR}x.json\n`,
    `${SAMPLE_DIR}x.json\0`,
    `${SAMPLE_DIR}x.json%00`,
    `${SAMPLE_DIR}x\0.json`,
    `${SAMPLE_DIR}é.json`,
    `${SAMPLE_DIR}x.json/y.json`,
    `${SAMPLE_DIR}a/b.json`,
    `${SAMPLE_DIR}../x.json`,
    `${SAMPLE_DIR}../../../.github/workflows/x.json`,
    `${SAMPLE_DIR}..%2fx.json`,
    `${SAMPLE_DIR}%2e%2e.json`,
    `${SAMPLE_DIR}x\\y.json`,
    `${SAMPLE_DIR}/x.json`,
    `/${SAMPLE_DIR}x.json`,
    `./${SAMPLE_DIR}x.json`,
    `${SAMPLE_DIR}./x.json`,
    `web/src/site/data/./sample/x.json`,
    `web/src/site/data/sample/../sample/x.json`,
    `web//src/site/data/sample/x.json`,
    `WEB/src/site/data/sample/x.json`,
    `web/src/site/data/Sample/x.json`,
    `web/src/site/data/samples/x.json`,
    `web/src/site/data/sample-x/x.json`,
    `xweb/src/site/data/sample/x.json`,
    `prefix/web/src/site/data/sample/x.json`,
    // Mira's one path, broken one way each.
    `${MIRA}\n`,
    `${MIRA} `,
    ` ${MIRA}`,
    `/${MIRA}`,
    `./${MIRA}`,
    `${MIRA}.json`,
    `${MIRA}.ts`,
    `${MIRA}/x.json`,
    `${MIRA}\0`,
    "web/src/site/data/timeline/mira-week.JSON",
    "web/src/site/data/timeline/Mira-week.json",
    "web/src/site/data/timeline/mira-weeks.json",
    "web/src/site/data/timeline/mira-week-2.json",
    "web/src/site/data/timeline/amira-week.json",
    "web/src/site/data/timeline/mira_week.json",
    "web/src/site/data/timeline/mira.json",
    "web/src/site/data/timeline/mira.ts",
    "web/src/site/data/timeline/mira.test.ts",
    "web/src/site/data/timeline/x.json",
    "web/src/site/data/timeline/sub/mira-week.json",
    "web/src/site/data/timeline/../timeline/mira-week.json",
    "web/src/site/data/timelines/mira-week.json",
    "web/src/site/data/timeline/%2e%2e/mira-week.json",
    "web/src/site/data/mira-week.json",
    "web/src/site/timeline/mira-week.json",
    "web/src/site/data/timeline\\mira-week.json",
    // What the token must never touch: the workflows, the code, the config, the fixtures, the secrets.
    ".github/workflows/promote.yml",
    ".github/workflows/release.json",
    ".github/CODEOWNERS",
    "package.json",
    "pnpm-lock.yaml",
    "vercel.json",
    "web/package.json",
    "api/src/lib/github.ts",
    "api/src/lib/models.ts",
    "api/src/prompts/system.ts",
    "packages/engine/src/doctrine.ts",
    "web/src/site/data/sample.ts",
    "fixtures/sample-people/mira.json",
    "fixtures/charts/audrey-hepburn.json",
    "docs/rounds/R16-plan.md",
    ".env",
    ".gitignore",
  ];
  for (const path of refused) assert.equal(SAMPLE_FILE.test(path), false, JSON.stringify(path));
});

test("SAMPLE_FILE keeps no state between calls: a path tested twice gets the same answer", () => {
  // A global or sticky pattern remembers where the last match ended; a guard that does so lets a second path through.
  assert.equal(SAMPLE_FILE.global || SAMPLE_FILE.sticky, false);
  assert.equal(SAMPLE_REF.global || SAMPLE_REF.sticky, false);
  for (let i = 0; i < 3; i++) {
    assert.equal(SAMPLE_FILE.test(MIRA), true);
    assert.equal(SAMPLE_FILE.test(".github/workflows/promote.yml"), false);
    assert.equal(SAMPLE_REF.test(`refs/heads/sample/${RELEASE_ID}`), true);
    assert.equal(SAMPLE_REF.test("refs/heads/production"), false);
  }
});

test("SAMPLE_REF admits sample/<release-id> and nothing else a push could name", () => {
  for (const ref of [`refs/heads/sample/${RELEASE_ID}`, "refs/heads/sample/a", "refs/heads/sample/0", "refs/heads/sample/R16-final", "refs/heads/sample/a-b-c"]) {
    assert.ok(SAMPLE_REF.test(ref), ref);
  }
  for (const ref of [
    "",
    "refs/heads/sample/",
    "refs/heads/sample",
    "refs/heads/sample/-x",
    "refs/heads/sample/x/y",
    "refs/heads/sample/x.lock",
    "refs/heads/sample/x.",
    "refs/heads/sample/x..y",
    "refs/heads/sample/x_y",
    "refs/heads/sample/x y",
    "refs/heads/sample/x\n",
    "refs/heads/sample/x~1",
    "refs/heads/sample/x^",
    "refs/heads/sample/x:y",
    "refs/heads/sample/x?",
    "refs/heads/sample/x*",
    "refs/heads/sample/x[0]",
    "refs/heads/sample/x@{1}",
    "refs/heads/sample/x\\y",
    "refs/heads/sample/é",
    "refs/heads/sample/%2e%2e",
    "refs/heads/sample/../main",
    "refs/heads/Sample/x",
    "refs/heads/samples/x",
    "refs/heads/production",
    "refs/heads/main",
    "refs/heads/staging",
    "refs/heads/round/R16",
    "refs/tags/sample/x",
    "refs/tags/v1",
    "refs/remotes/origin/sample/x",
    "refs/heads/x/sample/y",
    "heads/sample/x",
    "sample/x",
  ]) {
    assert.equal(SAMPLE_REF.test(ref), false, JSON.stringify(ref));
  }
});

test("the ref is checked before any path, and a path before any request, so the first refusal names the ref", async () => {
  let sent = 0;
  const api = githubApi((async () => { sent += 1; return Response.json({ sha: "x" }); }) as unknown as typeof fetch);
  await assert.rejects(
    () => api.commitFile({ branch: "main", parent: "def", files: [{ path: ".github/workflows/promote.yml", content: "x" }], message: "m" }, "tok"),
    /^Error: refused to write refs\/heads\/main: /,
  );
  await assert.rejects(
    () => api.commitFile({ branch: "main", parent: "def", files: [], message: "m" }, "tok"),
    /^Error: refused to write refs\/heads\/main: the release token creates sample\/<release-id> branches alone/,
  );
  assert.equal(sent, 0);
});

test("a commit can carry more than one /sample run beside Mira's week, each a blob, but never the same path twice", async () => {
  const calls: string[] = [];
  let blobs = 0;
  const fetcher = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("https://api.github.com/repos/alexbuildsai-del/Starsdecoded/", "");
    calls.push(`${method} ${path}`);
    if (method === "GET") return Response.json({ sha: "def", tree: { sha: "tree-of-def" } });
    return Response.json({ sha: path === "git/blobs" ? `blob-${++blobs}` : `${path}-sha` }, { status: 201 });
  }) as unknown as typeof fetch;
  const api = githubApi(fetcher);
  const files = [`${SAMPLE_DIR}a.json`, `${SAMPLE_DIR}b.json`, MIRA].map((path) => ({ path, content: "{}\n" }));
  assert.equal(await api.commitFile({ branch: `sample/${RELEASE_ID}`, parent: "def", files, message: "m" }, "tok"), "git/commits-sha");
  assert.equal(calls.filter((c) => c === "POST git/blobs").length, 3);
  assert.equal(calls.filter((c) => c === "POST git/refs").length, 1, "one branch");
  assert.equal(calls.filter((c) => c === "POST git/commits").length, 1, "one commit");
  calls.length = 0;
  await assert.rejects(
    () => api.commitFile({ branch: `sample/${RELEASE_ID}`, parent: "def", files: [files[0], files[1], files[0]], message: "m" }, "tok"),
    /^Error: refused to write .*a\.json twice in one commit$/,
  );
  assert.deepEqual(calls, [], "the repeat is found before the first request");
});

test("a file's content travels as UTF-8 text exactly as given, accents and line breaks included", async () => {
  const bodies: unknown[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "GET") return Response.json({ sha: "def", tree: { sha: "t" } });
    if (url.endsWith("/git/blobs")) bodies.push(JSON.parse(String(init?.body)));
    return Response.json({ sha: "s" }, { status: 201 });
  }) as unknown as typeof fetch;
  const content = '{"name":"Zoë — “quoted”","line":"a\\nb"}\r\n';
  await githubApi(fetcher).commitFile({ branch: `sample/${RELEASE_ID}`, parent: "def", files: [{ path: MIRA, content }], message: "m" }, "tok");
  assert.deepEqual(bodies, [{ content, encoding: "utf-8" }]);
});

test("fastForward moves production alone: any other name, case or padding is refused before a request", async () => {
  let sent = 0;
  const api = githubApi((async () => { sent += 1; return Response.json({}); }) as unknown as typeof fetch);
  assert.equal(RELEASE_BRANCH, "production");
  for (const branch of ["", " production", "production ", "production\n", "Production", "PRODUCTION", "refs/heads/production", "heads/production", "production/x", "production-2", "main", "sample/x"]) {
    await assert.rejects(() => api.fastForward(branch, "def", "tok"), /^Error: refused to move /, JSON.stringify(branch));
  }
  assert.equal(sent, 0);
  await api.fastForward("production", "def", "tok");
  assert.equal(sent, 1);
});

test("brainDiff: a directory is a prefix to the slash, a file is itself, and the engine and the prompts are the brain", () => {
  const brain = (...files: string[]) => brainDiff(files).brainChanged;
  assert.equal(brain("packages/engine/src/transits.ts"), true, "the engine's sky search is the brain (CLAUDE.md)");
  assert.equal(brain("packages/engine/src/doctrine.ts", "packages/engine/src/plainWords.ts"), true);
  assert.equal(brain("api/src/prompts/checks.ts"), true);
  assert.equal(brain("api/src/prompts/sections/superpowers.ts"), true);
  assert.equal(brain("api/src/lib/aiInterpretation.ts"), true);
  assert.equal(brain("packages/engine-extras/x.ts"), false, "a sibling folder that starts with the same letters");
  assert.equal(brain("packages/engine"), false, "the folder's own name is not a file in it");
  assert.equal(brain("api/src/prompts-old/x.ts"), false);
  assert.equal(brain("api/src/lib/models.tsx"), false);
  assert.equal(brain("api/src/lib/aiInterpretation.ts.bak"), false);
  assert.equal(brain("web/src/lib/dial.ts", "web/src/site/data/timeline/mira.ts", "web/src/site/data/timeline/mira-week.json", "api/src/lib/sampleRun.ts", "api/src/lib/github.ts", "api/src/lib/release.ts"), false, "the page's data and the release's own code are not the brain");
  assert.equal(brain("API/SRC/PROMPTS/system.ts"), false, "paths are case sensitive");
  assert.deepEqual(brainDiff([]), { brainChanged: false, pairChanged: false, files: [] });
  const mixed = brainDiff(["README.md", "packages/engine/src/cycles.ts", "web/x.ts", "api/src/prompts/system.ts", "api/src/prompts/system.ts"]);
  assert.deepEqual(mixed.files, ["packages/engine/src/cycles.ts", "api/src/prompts/system.ts", "api/src/prompts/system.ts"], "in the order given");
});

test("brainDiff: the pair brain is a change that adds one pair to the lab, and the lists agree with it", () => {
  assert.equal(brainDiff(["api/src/prompts/pair/index.ts"]).pairChanged, true);
  assert.equal(brainDiff(["api/src/prompts/pair/index.ts"]).brainChanged, true, "pair prompts sit under the prompts folder");
  assert.equal(brainDiff(["api/src/lib/pairInterpretation.ts"]).pairChanged, true);
  assert.equal(brainDiff(["api/src/prompts/system.ts"]).pairChanged, false, "the natal prompts alone add no pair");
  assert.equal(brainDiff(["api/src/prompts/pairs.ts"]).pairChanged, false, "a file whose name only starts with pair");
  assert.equal(brainDiff(["api/src/prompts/pair"]).pairChanged, false);
  for (const path of PAIR_BRAIN_PATHS.filter((p) => !p.endsWith("/"))) assert.equal(brainDiff([path]).pairChanged, true, path);
  assert.ok(BRAIN_PATHS.includes("packages/engine/"));
});

test("changedFiles: an empty diff is a list of nothing, not an unknown one; one file under the cap is the list", async () => {
  const listing = (files: unknown) => githubApi((async () => new Response(JSON.stringify({ files }), { status: 200 })) as unknown as typeof fetch);
  assert.deepEqual(await listing([]).changedFiles("abc", "def"), []);
  assert.deepEqual(await listing([{ filename: "a.ts" }]).changedFiles("abc", "def"), ["a.ts"]);
  assert.equal(await listing(Array.from({ length: COMPARE_FILE_CAP + 1 }, (_, i) => ({ filename: `f${i}` }))).changedFiles("abc", "def"), null, "past the cap is still unknown");
  assert.equal(await listing(undefined).changedFiles("abc", "def"), null);
});

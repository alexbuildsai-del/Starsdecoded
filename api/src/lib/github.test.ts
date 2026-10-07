import { test } from "node:test";
import assert from "node:assert/strict";
import { inspect } from "node:util";
import { COMPARE_FILE_CAP, brainDiff, githubApi } from "./github.js";

const SAMPLE_PATH = "web/src/site/data/sample/audrey-hepburn.0b9e7c1a-2f4d-4e8a-9c3b-5d6e7f8a9b0c.json";
const SAMPLE_BRANCH = "sample/0b9e7c1a-2f4d-4e8a-9c3b-5d6e7f8a9b0c";
const MIRA_PATH = "web/src/site/data/timeline/mira-week.json";

/** GitHub's Git data API, stubbed: each call is kept with its body and authorization, so a test reads exactly what left. */
function gitData() {
  const calls: Array<{ method: string; path: string; body: unknown; authorization: string | undefined }> = [];
  let blobs = 0;
  const fetcher = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("https://api.github.com/repos/alexbuildsai-del/Starsdecoded/", "");
    calls.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined, authorization: (init?.headers as Record<string, string> | undefined)?.authorization });
    if (method === "GET" && path === "git/commits/def") return Response.json({ sha: "def", tree: { sha: "tree-of-def" } });
    if (method === "POST" && path === "git/blobs") return Response.json({ sha: `blob-${++blobs}` }, { status: 201 });
    if (method === "POST" && path === "git/trees") return Response.json({ sha: "tree-2" }, { status: 201 });
    if (method === "POST" && path === "git/commits") return Response.json({ sha: "commit-3" }, { status: 201 });
    if (method === "POST" && path === "git/refs") return Response.json({ ref: "refs/heads/x", object: { sha: "commit-3" } }, { status: 201 });
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

test("brainDiff: the brain paths and the pair brain within them", () => {
  assert.deepEqual(brainDiff(["web/src/App.tsx", "docs/INDEX.md"]), { brainChanged: false, pairChanged: false, files: [] });
  const natal = brainDiff(["api/src/prompts/system.ts", "api/src/lib/models.ts", "web/x.ts"]);
  assert.equal(natal.brainChanged, true);
  assert.equal(natal.pairChanged, false);
  assert.deepEqual(natal.files, ["api/src/prompts/system.ts", "api/src/lib/models.ts"]);
  assert.equal(brainDiff(["api/src/prompts/pair/shapes.ts"]).pairChanged, true);
  assert.equal(brainDiff(["api/src/lib/pairBrief.ts"]).brainChanged, true, "the pair brief is the brain too: the Release runs its lab only when the brain changed");
  assert.equal(brainDiff(["api/src/lib/pairBrief.ts"]).pairChanged, true);
});

test("the fast-forward is a PATCH on the ref with the token and never forced; a refusal names the status", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (/branches\/production/.test(url)) return new Response(JSON.stringify({ commit: { sha: "abc" } }), { status: 200 });
    if (/branches\/nothing/.test(url)) return new Response("", { status: 404 });
    if (/compare/.test(url)) return new Response(JSON.stringify({ files: [{ filename: "api/src/prompts/system.ts" }] }), { status: 200 });
    if (init?.method === "PATCH" && /refs\/heads\/production/.test(url)) return new Response(JSON.stringify({}), { status: 200 });
    return new Response("nope", { status: 422 });
  }) as unknown as typeof fetch;
  const api = githubApi(fetcher);
  assert.equal(await api.branchHead("production"), "abc");
  assert.equal(await api.branchHead("nothing"), null);
  assert.deepEqual(await api.changedFiles("abc", "def"), ["api/src/prompts/system.ts"]);
  await api.fastForward("production", "def", "tok");
  const patch = calls.find((c) => c.init?.method === "PATCH")!;
  assert.match(patch.url, /git\/refs\/heads\/production$/);
  assert.deepEqual(JSON.parse(String(patch.init?.body)), { sha: "def", force: false });
  assert.equal((patch.init?.headers as Record<string, string>).authorization, "Bearer tok");
  const refusing = githubApi((async () => new Response("Update is not a fast forward", { status: 422 })) as unknown as typeof fetch);
  await assert.rejects(() => refusing.fastForward("production", "def", "tok"), /^Error: GitHub 422 fast-forwarding production: Update is not a fast forward$/);
});

test("commitFile: one file on a new sample branch from the released commit, through the Git data API, the token in the authorization header alone", async () => {
  const { calls, fetcher } = gitData();
  const token = "github_pat_11ABCDEFG0123456789_secret";
  const sha = await githubApi(fetcher).commitFile({ branch: SAMPLE_BRANCH, parent: "def", files: [{ path: SAMPLE_PATH, content: "{\n  \"meta\": {}\n}\n" }], message: "/sample: a run" }, token);
  assert.equal(sha, "commit-3");
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ["GET git/commits/def", "POST git/blobs", "POST git/trees", "POST git/commits", "POST git/refs"]);
  assert.deepEqual(calls[1].body, { content: "{\n  \"meta\": {}\n}\n", encoding: "utf-8" });
  assert.deepEqual(calls[2].body, { base_tree: "tree-of-def", tree: [{ path: SAMPLE_PATH, mode: "100644", type: "blob", sha: "blob-1" }] }, "the released tree plus one file");
  assert.deepEqual(calls[3].body, { message: "/sample: a run", tree: "tree-2", parents: ["def"] });
  assert.deepEqual(calls[4].body, { ref: `refs/heads/${SAMPLE_BRANCH}`, sha: "commit-3" }, "a new ref is created, never an existing one moved");
  assert.ok(calls.every((c) => c.authorization === `Bearer ${token}`));
  assert.ok(calls.every((c) => !JSON.stringify(c.body ?? null).includes(token)), "the token is in no body");
});

test("commitFile: /sample's run and Mira's week as one commit on one new branch, a blob each and one tree holding both", async () => {
  const { calls, fetcher } = gitData();
  const files = [{ path: SAMPLE_PATH, content: "{\"meta\":{}}\n" }, { path: MIRA_PATH, content: "{\"week\":\"2026-10-12\"}\n" }];
  assert.equal(await githubApi(fetcher).commitFile({ branch: SAMPLE_BRANCH, parent: "def", files, message: "both" }, "tok"), "commit-3");
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ["GET git/commits/def", "POST git/blobs", "POST git/blobs", "POST git/trees", "POST git/commits", "POST git/refs"]);
  assert.deepEqual(calls.slice(1, 3).map((c) => c.body), files.map((f) => ({ content: f.content, encoding: "utf-8" })));
  assert.deepEqual(calls[3].body, {
    base_tree: "tree-of-def",
    tree: [{ path: SAMPLE_PATH, mode: "100644", type: "blob", sha: "blob-1" }, { path: MIRA_PATH, mode: "100644", type: "blob", sha: "blob-2" }],
  }, "the released tree plus both files");
  assert.deepEqual(calls[4].body, { message: "both", tree: "tree-2", parents: ["def"] }, "one commit");
  assert.deepEqual(calls[5].body, { ref: `refs/heads/${SAMPLE_BRANCH}`, sha: "commit-3" }, "one branch");
});

test("a commit with no file, a path twice, or one refused path beside an admitted one sends nothing", async () => {
  let sent = 0;
  const api = githubApi((async () => { sent += 1; return Response.json({ sha: "x", tree: { sha: "t" } }, { status: 201 }); }) as unknown as typeof fetch);
  const write = (files: { path: string; content: string }[]) => api.commitFile({ branch: SAMPLE_BRANCH, parent: "def", files, message: "m" }, "tok");
  await assert.rejects(() => write([]), new RegExp(`^Error: refused to write refs/heads/${SAMPLE_BRANCH}: a commit with no file$`));
  await assert.rejects(() => write([{ path: MIRA_PATH, content: "{}" }, { path: MIRA_PATH, content: "{}" }]), new RegExp(`^Error: refused to write ${MIRA_PATH} twice in one commit$`));
  await assert.rejects(() => write([{ path: SAMPLE_PATH, content: "{}" }, { path: ".github/workflows/promote.yml", content: "x" }]), /^Error: refused to write \.github\/workflows\/promote\.yml: /);
  await assert.rejects(() => write([{ path: "web/src/site/data/timeline/mira.ts", content: "x" }, { path: MIRA_PATH, content: "{}" }]), /^Error: refused to write web\/src\/site\/data\/timeline\/mira\.ts: /);
  assert.equal(sent, 0, "every path is checked before the first request");
});

test("the token writes no ref outside refs/heads/sample/, no file but /sample's folder and Mira's week, and moves no branch but production; a refusal sends nothing", async () => {
  let sent = 0;
  const api = githubApi((async () => { sent += 1; return Response.json({ sha: "x", tree: { sha: "t" } }, { status: 201 }); }) as unknown as typeof fetch);
  const branches = ["main", "production", "staging", "sample", "sample/", "sample/a/b", "sample/../main", "sample/x y", "sample/-x", "sample/.x", "samples/x", "refs/heads/sample/x", "heads/sample/x", "tags/v1", "x/sample/y"];
  for (const branch of branches) {
    await assert.rejects(() => api.commitFile({ branch, parent: "def", files: [{ path: SAMPLE_PATH, content: "{}" }], message: "m" }, "tok"), /^Error: refused to write refs\/heads\//, branch);
  }
  const paths = [
    "web/src/site/data/sample.ts", "web/src/site/data/sample/x.ts", "web/src/site/data/sample/../sample.ts", "web/src/site/data/sample/a/b.json", ".github/workflows/promote.yml", "api/src/lib/models.ts", `/${SAMPLE_PATH}`,
    "web/src/site/data/timeline/mira.ts", "web/src/site/data/timeline/x.json", "web/src/site/data/timeline/sub/mira-week.json", "web/src/site/data/timeline/../sample.ts", `/${MIRA_PATH}`, "fixtures/sample-people/mira.json",
  ];
  for (const path of paths) {
    await assert.rejects(() => api.commitFile({ branch: SAMPLE_BRANCH, parent: "def", files: [{ path, content: "{}" }], message: "m" }, "tok"), /^Error: refused to write /, path);
  }
  for (const branch of ["main", "staging", "sample/r1", "production/x", "Production", "other"]) {
    await assert.rejects(() => api.fastForward(branch, "def", "tok"), /^Error: refused to move /, branch);
  }
  assert.equal(sent, 0, "no request leaves for a refused write");
});

test("the token's value is in no error, whatever GitHub or the network echoes back, and no error carries the request", async () => {
  const token = "github_pat_11ABCDEFG0123456789_secret";
  const echoing = (async (_url: string, init?: RequestInit) => new Response(`Bad credentials for ${JSON.stringify(init?.headers)}`, { status: 401 })) as unknown as typeof fetch;
  const down = (async (_url: string, init?: RequestInit) => { throw Object.assign(new Error(`connect ECONNREFUSED, sent ${(init?.headers as Record<string, string>).authorization}`), { request: init }); }) as unknown as typeof fetch;
  const midway = (async (url: string, init?: RequestInit) => (/git\/trees$/.test(url) ? new Response(`tree refused, token=${token}`, { status: 422 }) : gitData().fetcher(url, init))) as unknown as typeof fetch;
  for (const fetcher of [echoing, down, midway]) {
    const api = githubApi(fetcher);
    for (const attempt of [() => api.fastForward("production", "def", token), () => api.commitFile({ branch: SAMPLE_BRANCH, parent: "def", files: [{ path: SAMPLE_PATH, content: "{}" }], message: "m" }, token)]) {
      const err = await attempt().then(() => null, (e: unknown) => e);
      assert.ok(err instanceof Error, "the write fails");
      assert.match(err.message, /^GitHub (\d{3}|did not answer) /);
      assert.ok(!inspect(err, { depth: 10 }).includes(token), `no trace of the token in ${err.message}`);
      assert.equal(err.cause, undefined, "the network's error, which may carry the request, is not kept");
    }
  }
});

test("changedFiles: a list at GitHub's cap, or none at all, is unknown, not brain-free", async () => {
  const listing = (n: number) => (async () => new Response(JSON.stringify({ files: Array.from({ length: n }, (_, i) => ({ filename: `.claude/f${i}.md` })) }), { status: 200 })) as unknown as typeof fetch;
  assert.equal(await githubApi(listing(COMPARE_FILE_CAP)).changedFiles("abc", "def"), null);
  assert.equal((await githubApi(listing(COMPARE_FILE_CAP - 1)).changedFiles("abc", "def"))?.length, COMPARE_FILE_CAP - 1);
  const unlisted = (async () => new Response(JSON.stringify({ status: "ahead" }), { status: 200 })) as unknown as typeof fetch;
  assert.equal(await githubApi(unlisted).changedFiles("abc", "def"), null);
});

test("a release's own branch is accepted at its edges: one character, a release id, letters in either case", async () => {
  for (const branch of ["sample/a", "sample/0", "sample/R15-final", SAMPLE_BRANCH]) {
    const { calls, fetcher } = gitData();
    assert.equal(await githubApi(fetcher).commitFile({ branch, parent: "def", files: [{ path: SAMPLE_PATH, content: "{}" }], message: "m" }, "tok"), "commit-3", branch);
    assert.deepEqual(calls.at(-1)!.body, { ref: `refs/heads/${branch}`, sha: "commit-3" });
  }
  for (const path of ["web/src/site/data/sample/a.json", "web/src/site/data/sample/audrey-hepburn.r1.json", MIRA_PATH]) {
    const { fetcher } = gitData();
    assert.equal(await githubApi(fetcher).commitFile({ branch: SAMPLE_BRANCH, parent: "def", files: [{ path, content: "{}" }], message: "m" }, "tok"), "commit-3", path);
  }
});

test("a ref or a path that only ends like an allowed one is refused: a trailing line break, an underscore, an encoded dot, a second json, a near miss of Mira's week", async () => {
  let sent = 0;
  const api = githubApi((async () => { sent += 1; return Response.json({ sha: "x" }); }) as unknown as typeof fetch);
  for (const branch of [`${SAMPLE_BRANCH}\n`, "sample/x\nmain", "sample/x_y", "sample/%2e%2e", "sample/x:main", "sample/x~1", "SAMPLE/x", "", " sample/x"]) {
    await assert.rejects(() => api.commitFile({ branch, parent: "def", files: [{ path: SAMPLE_PATH, content: "{}" }], message: "m" }, "tok"), /^Error: refused to write refs\/heads\//, JSON.stringify(branch));
  }
  const miraLike = [
    `${MIRA_PATH}\n`, `${MIRA_PATH}.ts`, "web/src/site/data/timeline/mira-week.JSON", "web/src/site/data/timeline/mira-week.json/x.json", "web/src/site/data/timeline/mira-weeks.json",
    "web/src/site/data/timeline/amira-week.json", "web/src/site/data/timeline/mira_week.json", "web/src/site/data/timelines/mira-week.json", "web/src/site/data/timeline/%2e%2e/mira-week.json", ` ${MIRA_PATH}`,
  ];
  for (const path of [`${SAMPLE_PATH}\n`, "web/src/site/data/sample/x.json.ts", "web/src/site/data/sample/x.JSON", "web/src/site/data/sample/.json", "web/src/site/data/sample/%2e%2e.json", "web/src/site/data/sample/x y.json", "web/src/site/data/sample/x.json/y.json", "web/src/site/data/samples/x.json", ...miraLike]) {
    await assert.rejects(() => api.commitFile({ branch: SAMPLE_BRANCH, parent: "def", files: [{ path, content: "{}" }], message: "m" }, "tok"), /^Error: refused to write /, JSON.stringify(path));
  }
  assert.equal(sent, 0, "a refusal sends nothing, the token included");
});

test("a branch that exists already is GitHub's 422 on the ref, never moved: no PATCH and no force are ever sent", async () => {
  const { calls, fetcher: base } = gitData();
  const fetcher = (async (url: string, init?: RequestInit) => (/git\/refs$/.test(url) ? new Response("Reference already exists", { status: 422 }) : base(url, init))) as unknown as typeof fetch;
  await assert.rejects(
    () => githubApi(fetcher).commitFile({ branch: SAMPLE_BRANCH, parent: "def", files: [{ path: SAMPLE_PATH, content: "{}" }], message: "m" }, "tok"),
    new RegExp(`^Error: GitHub 422 creating ${SAMPLE_BRANCH}: Reference already exists$`),
  );
  assert.ok(calls.every((c) => c.method !== "PATCH"));
  assert.ok(calls.every((c) => !JSON.stringify(c.body ?? null).includes("force")));
});

test("an answer with no sha stops the write before the next request, and no ref is made from a missing object", async () => {
  for (const [step, path] of [["reading def", "git/commits/def"], ["writing the tree", "git/trees"], ["writing the commit", "git/commits"], [`writing ${SAMPLE_PATH}`, "git/blobs"]] as const) {
    const { calls, fetcher: base } = gitData();
    const fetcher = (async (url: string, init?: RequestInit) => (url.endsWith(`/${path}`) ? (calls.push({ method: init?.method ?? "GET", path, body: undefined, authorization: undefined }), Response.json({}, { status: 201 })) : base(url, init))) as unknown as typeof fetch;
    await assert.rejects(
      () => githubApi(fetcher).commitFile({ branch: SAMPLE_BRANCH, parent: "def", files: [{ path: SAMPLE_PATH, content: "{}" }], message: "m" }, "tok"),
      new RegExp(`^Error: GitHub answered with no sha ${step.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`),
      step,
    );
    assert.ok(!calls.some((c) => c.method === "POST" && c.path === "git/refs"), `${step}: no ref`);
  }
});

test("the token is cut from an echo however long the answer, before the 200-character cut, and from a non-Error the network throws", async () => {
  const token = "github_pat_11ABCDEFG0123456789_secret";
  const long = (async () => new Response(`${"x".repeat(180)}${token}${token}`, { status: 500 })) as unknown as typeof fetch;
  const thrown = (async () => { throw `socket hang up with ${token}`; }) as unknown as typeof fetch;
  for (const fetcher of [long, thrown]) {
    const err = await githubApi(fetcher).fastForward("production", "def", token).then(() => null, (e: unknown) => e);
    assert.ok(err instanceof Error);
    assert.ok(!err.message.includes(token), err.message);
    assert.ok(!err.message.includes(token.slice(0, 20)), "not even the token's head survives the cut");
  }
});

test("the public reads send no token and name the status they failed on", async () => {
  const seen: Array<RequestInit | undefined> = [];
  const fetcher = (async (_url: string, init?: RequestInit) => { seen.push(init); return new Response("", { status: 503 }); }) as unknown as typeof fetch;
  await assert.rejects(() => githubApi(fetcher).branchHead("production"), /^Error: GitHub 503 reading production$/);
  await assert.rejects(() => githubApi(fetcher).changedFiles("abc", "def"), /^Error: GitHub 503 comparing abc\.\.\.def$/);
  assert.ok(seen.every((init) => !("authorization" in ((init?.headers as Record<string, string>) ?? {}))));
});

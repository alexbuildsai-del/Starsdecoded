import { test } from "node:test";
import assert from "node:assert/strict";
import { inspect } from "node:util";
import { COMPARE_FILE_CAP, brainDiff, githubApi } from "./github.js";

const SAMPLE_PATH = "web/src/site/data/sample/audrey-hepburn.0b9e7c1a-2f4d-4e8a-9c3b-5d6e7f8a9b0c.json";
const SAMPLE_BRANCH = "sample/0b9e7c1a-2f4d-4e8a-9c3b-5d6e7f8a9b0c";

/** GitHub's Git data API, stubbed: each call is kept with its body and authorization, so a test reads exactly what left. */
function gitData() {
  const calls: Array<{ method: string; path: string; body: unknown; authorization: string | undefined }> = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("https://api.github.com/repos/alexbuildsai-del/Starsdecoded/", "");
    calls.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined, authorization: (init?.headers as Record<string, string> | undefined)?.authorization });
    if (method === "GET" && path === "git/commits/def") return Response.json({ sha: "def", tree: { sha: "tree-of-def" } });
    if (method === "POST" && path === "git/blobs") return Response.json({ sha: "blob-1" }, { status: 201 });
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
  assert.equal(brainDiff(["api/src/lib/pairBrief.ts"]).brainChanged, false, "the pair brief is the pair brain, not the natal brain");
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
  const sha = await githubApi(fetcher).commitFile({ branch: SAMPLE_BRANCH, parent: "def", path: SAMPLE_PATH, content: "{\n  \"meta\": {}\n}\n", message: "/sample: a run" }, token);
  assert.equal(sha, "commit-3");
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ["GET git/commits/def", "POST git/blobs", "POST git/trees", "POST git/commits", "POST git/refs"]);
  assert.deepEqual(calls[1].body, { content: "{\n  \"meta\": {}\n}\n", encoding: "utf-8" });
  assert.deepEqual(calls[2].body, { base_tree: "tree-of-def", tree: [{ path: SAMPLE_PATH, mode: "100644", type: "blob", sha: "blob-1" }] }, "the released tree plus one file");
  assert.deepEqual(calls[3].body, { message: "/sample: a run", tree: "tree-2", parents: ["def"] });
  assert.deepEqual(calls[4].body, { ref: `refs/heads/${SAMPLE_BRANCH}`, sha: "commit-3" }, "a new ref is created, never an existing one moved");
  assert.ok(calls.every((c) => c.authorization === `Bearer ${token}`));
  assert.ok(calls.every((c) => !JSON.stringify(c.body ?? null).includes(token)), "the token is in no body");
});

test("the token writes no ref outside refs/heads/sample/, no file outside /sample's folder and moves no branch but production; a refusal sends nothing", async () => {
  let sent = 0;
  const api = githubApi((async () => { sent += 1; return Response.json({ sha: "x", tree: { sha: "t" } }, { status: 201 }); }) as unknown as typeof fetch);
  const branches = ["main", "production", "staging", "sample", "sample/", "sample/a/b", "sample/../main", "sample/x y", "sample/-x", "sample/.x", "samples/x", "refs/heads/sample/x", "heads/sample/x", "tags/v1", "x/sample/y"];
  for (const branch of branches) {
    await assert.rejects(() => api.commitFile({ branch, parent: "def", path: SAMPLE_PATH, content: "{}", message: "m" }, "tok"), /^Error: refused to write refs\/heads\//, branch);
  }
  const paths = ["web/src/site/data/sample.ts", "web/src/site/data/sample/x.ts", "web/src/site/data/sample/../sample.ts", "web/src/site/data/sample/a/b.json", ".github/workflows/promote.yml", "api/src/lib/models.ts", `/${SAMPLE_PATH}`];
  for (const path of paths) {
    await assert.rejects(() => api.commitFile({ branch: SAMPLE_BRANCH, parent: "def", path, content: "{}", message: "m" }, "tok"), /^Error: refused to write /, path);
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
    for (const attempt of [() => api.fastForward("production", "def", token), () => api.commitFile({ branch: SAMPLE_BRANCH, parent: "def", path: SAMPLE_PATH, content: "{}", message: "m" }, token)]) {
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

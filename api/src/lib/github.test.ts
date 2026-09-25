import { test } from "node:test";
import assert from "node:assert/strict";
import { brainDiff, githubApi } from "./github.js";

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
  await assert.rejects(() => api.fastForward("other", "def", "tok"), /GitHub 422/);
});

/**
 * The Release rehearsal (acceptance 8): a stub lab and a stub QA verdict,
 * no spend. A seeded fault stops at the gate, a sev-1 stops at QA, a clean
 * run calls the mocked fast-forward; without the token it stops `passed`
 * and names MB-75; a non-staging environment is refused at preflight.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { preflight, runRelease, startRelease, estimateUsd } = await import("./release.js");
const { MATRIX_CHARTS } = await import("./labRules.js");
const { SECTION_IDS } = await import("../prompts/index.js");
type ReleaseDeps = import("./release.js").ReleaseDeps;
type ReleaseStore = import("./release.js").ReleaseStore;
type LabRelease = import("@workspace/db").LabRelease;
type RunNumbers = import("./labRules.js").RunNumbers;

function memoryStore(): ReleaseStore & { rows: Map<string, LabRelease> } {
  const rows = new Map<string, LabRelease>();
  return {
    rows,
    async insert(row) { rows.set(row.id, { ...row, createdAt: new Date(), updatedAt: new Date() } as LabRelease); },
    async update(id, patch) { rows.set(id, { ...rows.get(id)!, ...patch, updatedAt: new Date() } as LabRelease); },
    async get(id) { return rows.get(id) ?? null; },
    async list() { return [...rows.values()]; },
    async running() { return [...rows.values()].find((r) => r.status === "running") ?? null; },
  };
}

const numbers = (label: string, words = 420): RunNumbers[] =>
  MATRIX_CHARTS.flatMap((fixture) => ["foundation", ...SECTION_IDS].map((section) => ({ fixture, label, section, words: section === "foundation" ? 0 : words, costUsd: 0.025, faults: [], status: "done" })));

function deps(over: Partial<ReleaseDeps> & { token?: string; forwarded?: string[]; qaStatus?: "pass" | "fail" | "unconfigured" } = {}): ReleaseDeps & { forwarded: string[] } {
  const forwarded = over.forwarded ?? [];
  const labels: Record<string, RunNumbers[]> = { r06: numbers("r06") };
  const env: NodeJS.ProcessEnv = { APP_ENV: "staging", RAILWAY_GIT_COMMIT_SHA: "abcdef1234567890", OPENAI_API_KEY: "x", PATH: "", ...(over.token ? { GITHUB_RELEASE_TOKEN: over.token } : {}) };
  return {
    forwarded,
    github: {
      branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"),
      changedFiles: async () => ["api/src/prompts/system.ts", "api/src/prompts/pair/shapes.ts"],
      fastForward: async (_branch, sha, token) => { forwarded.push(`${sha}:${token}`); },
    },
    lab: async ({ label, withPair }) => { labels[label] = numbers(label); return { label, natalRunKeys: MATRIX_CHARTS.map((c) => `${c}.${label}`), pairRunKey: withPair ? `curie-hepburn.${label}` : null, costUsd: 1.4, failed: [] }; },
    labStore: { insert: async () => undefined, numbers: async (label) => (labels[label] ?? []).map((r) => ({ ...r, faults: [...r.faults] })), lastReleaseLabel: async () => null },
    qa: async () => (over.qaStatus === "fail"
      ? { status: "fail", findings: [{ sev: 1, where: "Buyer at /", title: "the landing page names Astra", detail: "found Astra" }], costUsd: 0.02 }
      : over.qaStatus === "unconfigured" ? { status: "unconfigured", findings: [], costUsd: 0, reason: "no browser" }
        : { status: "pass", findings: [{ sev: 3, where: "Skeptic at /legal/terms", title: "a console error", detail: "x" }], costUsd: 0.02 }),
    store: memoryStore(),
    spentUsd: async () => 1,
    env,
    webOrigin: "https://staging.test",
    ...over,
  };
}

test("preflight: heads, the brain diff, the estimate and which keys are present, never values", async () => {
  const d = deps({ token: "secret-token" });
  const pre = await preflight(d);
  assert.equal(pre.sha, "abcdef1234567890");
  assert.equal(pre.productionSha, "0000000000000000");
  assert.equal(pre.brainChanged, true);
  assert.equal(pre.pairChanged, true);
  assert.deepEqual(pre.files, ["api/src/prompts/system.ts", "api/src/prompts/pair/shapes.ts"]);
  assert.equal(pre.estimateUsd, estimateUsd(true, true));
  assert.deepEqual(pre.keys, { openai: true, githubReleaseToken: true, browser: false });
  assert.deepEqual(pre.problems, []);
  assert.ok(!JSON.stringify(pre).includes("secret-token"), "a key's value never leaves the server");
  const prod = await preflight(deps({ env: { APP_ENV: "production", RAILWAY_GIT_COMMIT_SHA: "abcdef1234567890" } }));
  assert.ok(prod.problems.some((p) => /staging only/.test(p)));
  await assert.rejects(() => startRelease(deps({ env: { APP_ENV: "production", RAILWAY_GIT_COMMIT_SHA: "abcdef1234567890" } })), /staging only/);
});

test("a clean run: lab, gate, QA, then the fast-forward with the token; the record holds every step", async () => {
  const d = deps({ token: "tok" });
  const done = await startRelease(d, { wait: true });
  assert.equal(done.status, "forwarded");
  const steps = done.steps as Array<{ name: string; status: string }>;
  assert.deepEqual(steps.map((s) => [s.name, s.status]), [["lab", "passed"], ["gate", "passed"], ["qa", "passed"], ["forward", "passed"]]);
  assert.ok(d.forwarded.includes("abcdef1234567890:tok"));
  assert.equal((done.qa as { status: string }).status, "pass");
});

test("a seeded fault stops at the gate; nothing is forwarded", async () => {
  const d = deps({ token: "tok" });
  const done = await startRelease(d, { seedFault: true, wait: true });
  assert.equal(done.status, "failed");
  const steps = done.steps as Array<{ name: string; status: string; detail: string | null }>;
  assert.equal(steps[1].status, "failed");
  assert.match(steps[1].detail ?? "", /new fault char:em-dash/);
  assert.deepEqual(steps.slice(2).map((s) => s.status), ["skipped", "skipped"]);
  assert.deepEqual(d.forwarded, []);
});

test("a QA sev-1 stops the release; nothing is forwarded", async () => {
  const d = deps({ token: "tok", qaStatus: "fail" });
  const done = await startRelease(d, { wait: true });
  assert.equal(done.status, "failed");
  assert.match(done.error ?? "", /1 sev-1 finding/);
  assert.deepEqual(d.forwarded, []);
});

test("without GITHUB_RELEASE_TOKEN a clean run stops passed and names MB-75; an unconfigured QA agent is a skipped step, not a failure", async () => {
  const d = deps({ qaStatus: "unconfigured" });
  const done = await startRelease(d, { wait: true });
  assert.equal(done.status, "passed");
  const steps = done.steps as Array<{ name: string; status: string; detail: string | null }>;
  assert.equal(steps[2].status, "skipped");
  assert.equal(steps[3].status, "stopped");
  assert.match(steps[3].detail ?? "", /MB-75/);
  assert.deepEqual(d.forwarded, []);
});

test("an unchanged brain skips the lab and the gate and still runs QA; a second release while one runs is refused", async () => {
  const d = deps({ token: "tok", github: { branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"), changedFiles: async () => ["web/src/App.tsx"], fastForward: async () => undefined } });
  await d.store.insert({ id: "running-one", sha: "abcdef1234567890", productionSha: null, brainChanged: false, pairChanged: false, status: "running", steps: [], qa: null, error: null });
  await assert.rejects(() => startRelease(d), /still running/);
  await d.store.update("running-one", { status: "stopped" });
  const done = await startRelease(d, { wait: true });
  void runRelease;
  const steps = done.steps as Array<{ name: string; status: string }>;
  assert.deepEqual(steps.map((s) => s.status), ["skipped", "skipped", "passed", "passed"]);
});

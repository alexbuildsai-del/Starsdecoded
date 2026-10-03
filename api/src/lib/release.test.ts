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
type FileCommit = import("./github.js").FileCommit;

/** What the lab keeps for /sample, in the shape the engine writes it: a foundation and usage the push must cut. */
const sampleOutput = (label: string) => ({
  meta: { reportType: "natal", promptVersion: "v9", generatedAt: "2026-10-03T09:00:00.000Z", model: "mixed", usage: { costUsd: 0.03, sections: [] } },
  foundation: { chartThesis: "internal" },
  overview: { headline: `written under ${label}` },
});
type Step = { name: string; status: string; detail: string | null };
const stepOf = (done: LabRelease, name: string) => (done.steps as Step[]).find((s) => s.name === name)!;

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

function deps(over: Partial<ReleaseDeps> & { token?: string; forwarded?: string[]; qaStatus?: "pass" | "fail" | "unconfigured" } = {}): ReleaseDeps & { forwarded: string[]; pushed: Array<FileCommit & { token: string }> } {
  const forwarded = over.forwarded ?? [];
  const pushed: Array<FileCommit & { token: string }> = [];
  const labels: Record<string, RunNumbers[]> = { r06: numbers("r06") };
  const samples: Record<string, unknown> = {};
  const env: NodeJS.ProcessEnv = { APP_ENV: "staging", RAILWAY_GIT_COMMIT_SHA: "abcdef1234567890", OPENAI_API_KEY: "x", PATH: "", ...(over.token ? { GITHUB_RELEASE_TOKEN: over.token } : {}) };
  return {
    forwarded,
    pushed,
    github: {
      branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"),
      changedFiles: async () => ["api/src/prompts/system.ts", "api/src/prompts/pair/shapes.ts"],
      fastForward: async (_branch, sha, token) => { forwarded.push(`${sha}:${token}`); },
      commitFile: async (input, token) => { pushed.push({ ...input, token }); return "c0ffee"; },
    },
    lab: async ({ label, withPair }) => { labels[label] = numbers(label); samples[label] = sampleOutput(label); return { label, natalRunKeys: MATRIX_CHARTS.map((c) => `${c}.${label}`), pairRunKey: withPair ? `curie-hepburn.${label}` : null, costUsd: 1.4, failed: [] }; },
    labStore: { insert: async () => undefined, numbers: async (label) => (labels[label] ?? []).map((r) => ({ ...r, faults: [...r.faults] })), sampleOutput: async (label) => samples[label] ?? null },
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

test("preflight: a diff too large for GitHub to list runs the full lab, natal and pair", async () => {
  const pre = await preflight(deps({ github: { branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"), changedFiles: async () => null, fastForward: async () => undefined, commitFile: async () => "c0ffee" } }));
  assert.equal(pre.brainChanged, true);
  assert.equal(pre.pairChanged, true);
  assert.deepEqual(pre.files, []);
  assert.equal(pre.estimateUsd, estimateUsd(true, true));
});

test("an unchanged brain skips the lab and the gate and still runs QA; a second release while one runs is refused", async () => {
  const d = deps({ token: "tok", github: { branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"), changedFiles: async () => ["web/src/App.tsx"], fastForward: async () => undefined, commitFile: async () => "c0ffee" } });
  await d.store.insert({ id: "running-one", sha: "abcdef1234567890", productionSha: null, brainChanged: false, pairChanged: false, status: "running", steps: [], qa: null, error: null });
  await assert.rejects(() => startRelease(d), /still running/);
  await d.store.update("running-one", { status: "stopped" });
  const done = await startRelease(d, { wait: true });
  void runRelease;
  const steps = done.steps as Array<{ name: string; status: string }>;
  assert.deepEqual(steps.map((s) => s.status), ["skipped", "skipped", "passed", "passed"]);
});

test("the gate weighs the run against what production runs: its release's lab, else r06, never a failed release", async () => {
  const shippedRuns = numbers("release-0000000");
  const failedRuns = numbers("release-fffffff").map((r) => ({ ...r, costUsd: 0.0001 }));
  const store = (withShipped: boolean): ReleaseDeps["labStore"] => {
    const labels: Record<string, RunNumbers[]> = { r06: numbers("r06"), "release-fffffff": failedRuns, ...(withShipped ? { "release-0000000": shippedRuns } : {}) };
    return { insert: async () => undefined, numbers: async (label) => (labels[label] ?? []).map((r) => ({ ...r, faults: [...r.faults] })), sampleOutput: async () => null };
  };
  const lab: ReleaseDeps["lab"] = async ({ label }) => ({ label, natalRunKeys: MATRIX_CHARTS.map((c) => `${c}.${label}`), pairRunKey: null, costUsd: 1.4, failed: [] });
  for (const [withShipped, reference] of [[true, "release-0000000"], [false, "r06"]] as const) {
    const s = store(withShipped);
    const d = deps({ token: "tok", labStore: { ...s, numbers: async (label) => (label.startsWith("release-abcdef1") ? numbers(label) : s.numbers(label)) }, lab });
    const done = await startRelease(d, { wait: true });
    const gate = (done.steps as Array<{ name: string; status: string; detail: string | null }>).find((x) => x.name === "gate")!;
    assert.equal(gate.status, "passed");
    assert.match(gate.detail ?? "", new RegExp(`^against ${reference}:`));
  }
});

test("a retry with the brain unchanged reuses the newest passed lab, writes no report and pushes that lab's /sample run; a brain change writes new ones", async () => {
  const PAIR = "curie-hepburn";
  const earlierRuns = [...numbers("release-1111111"), ...["foundation", "partners01"].map((section) => ({ fixture: PAIR, label: "release-1111111", section, words: 0, costUsd: 0.01, faults: [], status: "done" }))];
  for (const [changed, reuses] of [[["web/src/App.tsx", "api/src/lib/release.ts"], true], [["api/src/prompts/system.ts"], false]] as const) {
    let wrote = 0;
    const pushed: FileCommit[] = [];
    const d = deps({
      token: "tok",
      github: { branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"), changedFiles: async (base) => (base === "1111111aaaaaaaaa" ? [...changed] : ["api/src/prompts/system.ts", "api/src/prompts/pair/shapes.ts"]), fastForward: async () => undefined, commitFile: async (input) => { pushed.push(input); return "c0ffee"; } },
      labStore: { insert: async () => undefined, numbers: async (label) => (label === "release-1111111" ? earlierRuns : numbers(label)), sampleOutput: async (label) => sampleOutput(label) },
      lab: async ({ label, withPair }) => { wrote += 1; return { label, natalRunKeys: MATRIX_CHARTS.map((c) => `${c}.${label}`), pairRunKey: withPair ? `${PAIR}.${label}` : null, costUsd: 1.4, failed: [] }; },
    });
    await d.store.insert({ id: "earlier", sha: "1111111aaaaaaaaa", productionSha: "0000000000000000", brainChanged: true, pairChanged: true, status: "failed", steps: [{ name: "lab", status: "passed", detail: null, startedAt: null, endedAt: null }], qa: null, error: "gate" });
    const done = await startRelease(d, { wait: true });
    const lab = stepOf(done, "lab");
    assert.equal(lab.status, "passed");
    assert.equal(wrote, reuses ? 0 : 1);
    if (reuses) assert.match(lab.detail ?? "", /^reused release-1111111/);
    const from = reuses ? "release-1111111" : "release-abcdef1";
    assert.equal(pushed.length, 1);
    assert.equal(JSON.parse(pushed[0].content).overview.headline, `written under ${from}`, "the run this release's reports came from");
    assert.match(stepOf(done, "forward").detail ?? "", new RegExp(`; /sample: pushed .* from ${from}$`));
  }
});

test("the estimate before the button is what mix B costs: about 25 cents with both brains changed, 20 with the natal brain alone (MB-133)", () => {
  assert.equal(estimateUsd(true, true).toFixed(4), "0.2476", "five natal reports at 3.1 cents, the pair at 4.3, QA's 5");
  assert.equal(estimateUsd(true, false).toFixed(4), "0.2041");
  assert.equal(estimateUsd(false, false), 0.05, "no lab: the QA reading alone");
  assert.equal(estimateUsd(false, true), 0.05);
});

test("a passing release pushes /sample's run from its lab on sample/<release-id> from the released commit; the outcome is a line in forward's detail", async () => {
  const d = deps({ token: "tok" });
  const done = await startRelease(d, { wait: true });
  assert.equal(done.status, "forwarded");
  assert.equal(d.pushed.length, 1, "one file");
  const [push] = d.pushed;
  assert.equal(push.branch, `sample/${done.id}`);
  assert.equal(push.path, `web/src/site/data/sample/audrey-hepburn.${done.id}.json`);
  assert.equal(push.parent, "abcdef1234567890", "from the released sha");
  assert.equal(push.token, "tok");
  const file = JSON.parse(push.content);
  assert.equal("foundation" in file, false, "no foundation");
  assert.equal("usage" in file.meta, false, "no usage");
  assert.equal(file.overview.headline, "written under release-abcdef1");
  const forward = stepOf(done, "forward");
  assert.equal(forward.status, "passed");
  assert.equal(forward.detail, `production fast-forwarded to abcdef1; /sample: pushed web/src/site/data/sample/audrey-hepburn.${done.id}.json on sample/${done.id}, from release-abcdef1`);
});

test("/sample's skips and failures are a line in forward's detail, never a failed release, and the token is in none of them", async () => {
  const token = "github_pat_11ABCDEFG0123456789_secret";
  const noToken = await startRelease(deps(), { wait: true });
  assert.equal(noToken.status, "passed");
  assert.equal(stepOf(noToken, "forward").status, "stopped");
  assert.match(stepOf(noToken, "forward").detail ?? "", /MB-75.*; \/sample: skipped, no GITHUB_RELEASE_TOKEN to push it with$/);

  const unchanged = deps({ token, github: { branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"), changedFiles: async () => ["web/src/App.tsx"], fastForward: async () => undefined, commitFile: async () => { throw new Error("no push expected"); } } });
  const same = await startRelease(unchanged, { wait: true });
  assert.equal(same.status, "forwarded");
  assert.equal(stepOf(same, "forward").detail, "production fast-forwarded to abcdef1; /sample: skipped, no lab ran for this release (the brain is unchanged), so there is no new run");

  const kept = deps({ token, labStore: { insert: async () => undefined, numbers: async (label) => numbers(label), sampleOutput: async () => null } });
  const none = await startRelease(kept, { wait: true });
  assert.equal(none.status, "forwarded");
  assert.match(stepOf(none, "forward").detail ?? "", /; \/sample: skipped, release-abcdef1 kept no audrey-hepburn run$/);

  const refusing = deps({ token });
  refusing.github.commitFile = async (input, t) => { throw new Error(`GitHub 422 creating ${input.branch}: Reference already exists (${t})`); };
  const refused = await startRelease(refusing, { wait: true });
  assert.equal(refused.status, "forwarded", "production moved; /sample's failure fails nothing");
  assert.equal(refused.error, null);
  assert.match(stepOf(refused, "forward").detail ?? "", /; \/sample: not pushed, GitHub 422 creating sample\/.*: Reference already exists \(\[token\]\)$/);

  const stuck = deps({ token });
  stuck.github.fastForward = async () => { throw new Error("GitHub 422 fast-forwarding production: Update is not a fast forward"); };
  const unmoved = await startRelease(stuck, { wait: true });
  assert.equal(unmoved.status, "passed");
  assert.equal(stepOf(unmoved, "forward").status, "failed");
  assert.equal(stepOf(unmoved, "forward").detail, "GitHub 422 fast-forwarding production: Update is not a fast forward; /sample: skipped, production did not move");
  assert.equal(stuck.pushed.length, 0);

  for (const done of [noToken, same, none, refused, unmoved]) assert.ok(!JSON.stringify(done).includes(token), "the token is in no record");
});

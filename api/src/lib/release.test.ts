/**
 * The Release rehearsal (acceptance 8): a stub lab, a stub QA verdict and a
 * stub walk, no spend. A seeded fault stops at the gate, a sev-1 stops at
 * QA, a failed walk stops at the walk, a clean run calls the mocked
 * fast-forward; without the token it stops `passed` and names MB-75; a
 * non-staging environment is refused at preflight. The walk's free dry
 * render runs for real, with a model client that fails if called.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
// The dry render reads the prompts as shipped: no database here to hold an override.
process.env.PROMPT_DEFAULTS_ONLY = "1";
process.env.LOG_LEVEL ??= "silent";
const { openai } = await import("@workspace/integrations-openai-ai-server");
const modelCalls: unknown[] = [];
(openai.chat.completions as unknown as { create: unknown }).create = async (req: unknown) => {
  modelCalls.push(req);
  throw new Error("the release rehearsal called the model");
};
const { preflight, runRelease, startRelease, estimateUsd, dryRenderWalk, walkOnce, WALK_ESTIMATE_USD } = await import("./release.js");
const { MATRIX_CHARTS } = await import("./labRules.js");
const { SECTION_IDS } = await import("../prompts/index.js");
const { setFailureSink } = await import("./failureLog.js");
const { lastSync, syncProductsOnStart } = await import("./stripeSync.js");
type ReleaseDeps = import("./release.js").ReleaseDeps;
type ReleaseStore = import("./release.js").ReleaseStore;
type WalkDeps = import("./release.js").WalkDeps;
type WalkVerdict = import("./release.js").WalkVerdict;
type QaWalkRecord = import("./release.js").QaWalkRecord;
type QaWalkRow = import("@workspace/db").QaWalkRow;
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

const MIRA_PATH = "web/src/site/data/timeline/mira-week.json";
/** A Wednesday: the week moves to the Monday after it. */
const FORWARDED_AT = new Date("2026-10-07T10:00:00Z");
const NEXT_MONDAY = "2026-10-12";
/** Mira's week as the stub engine writes it, so a test reads which Monday it was asked for. */
const miraText = (monday: string) => `{"week":"${monday}"}\n`;
const fileOf = (push: FileCommit, path: string) => push.files.find((f) => f.path === path);

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

const PAIR = {
  mira: { userId: "user_standin_mira", email: "qa-a+clerk_test@mystarsdecoded.com", name: "Mira Costa" },
  idris: { userId: "user_standin_idris", email: "qa-b+clerk_test@mystarsdecoded.com", name: "Idris Costa" },
};
const STORED = new Set(["own-report", "idris-report", "pair"]);

/** A Release's walk that passed: a live step, a stored step it wrote, and a step that stays local. */
const PASSED: WalkVerdict = {
  status: "pass",
  steps: [
    { id: "sign-in", label: "Mira arrives signed out, then signs in", status: "pass", ms: 800 },
    { id: "own-report", label: "Mira writes her Personal report; a credit is taken before it's written", status: "pass", ms: 95_000 },
    { id: "tomas-report", label: "Mira, out of credits, buys a Couple from the birth form and writes Tomás's Personal report", status: "local", ms: 0 },
  ],
  findings: [],
};

function memoryWalks(): QaWalkRecord & { rows: QaWalkRow[] } {
  const rows: QaWalkRow[] = [];
  return {
    rows,
    async latest() { return [...rows].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ?? null; },
    async walked(sha) { return rows.some((r) => r.sha === sha); },
    async begin({ sha, mode, startedAt }, oncePerCommit) {
      if (oncePerCommit && rows.some((r) => r.sha === sha)) return null;
      const id = `walk-${rows.length + 1}`;
      rows.push({ id, sha, mode, status: "running", steps: [], findings: [], startedAt, finishedAt: null });
      return id;
    },
    async finish(id, verdict, at) { Object.assign(rows.find((r) => r.id === id)!, { status: verdict.status, steps: verdict.steps, findings: verdict.findings, finishedAt: at }); },
    async settle() { return 0; },
  };
}

/** The walk's seams as stand-ins that say what was asked of them; the seed keeps each stored step that passed. */
function walkDeps(verdict: WalkVerdict = PASSED, calls: string[] = [], record = memoryWalks()): WalkDeps & { record: ReturnType<typeof memoryWalks> } {
  return {
    ensurePair: async () => { calls.push("ensure"); return PAIR; },
    resetPair: async () => { calls.push("reset"); },
    walk: async ({ mode }) => { calls.push(`walk ${mode}`); return verdict; },
    storeSeed: async () => { calls.push("store the seed"); return verdict.steps.filter((s) => STORED.has(s.id) && s.status === "pass").length; },
    dry: async () => { calls.push("dry render"); return []; },
    record,
    now: () => new Date(),
    limitMs: 60_000,
  };
}

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
    mira: { week: async (monday) => miraText(monday), current: async () => null },
    now: () => FORWARDED_AT,
    walk: walkDeps(),
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

test("a clean run: lab, gate, QA, the walk, then the fast-forward with the token; the record holds every step", async () => {
  const d = deps({ token: "tok" });
  const done = await startRelease(d, { wait: true });
  assert.equal(done.status, "forwarded");
  const steps = done.steps as Array<{ name: string; status: string }>;
  assert.deepEqual(steps.map((s) => [s.name, s.status]), [["lab", "passed"], ["gate", "passed"], ["qa", "passed"], ["walk", "passed"], ["forward", "passed"]]);
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
  assert.deepEqual(steps.slice(2).map((s) => s.status), ["skipped", "skipped", "skipped"]);
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
  assert.equal(stepOf(done, "qa").status, "skipped");
  assert.equal(stepOf(done, "walk").status, "passed");
  assert.equal(stepOf(done, "forward").status, "stopped");
  assert.match(stepOf(done, "forward").detail ?? "", /MB-75/);
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
  assert.deepEqual(steps.map((s) => s.status), ["skipped", "skipped", "passed", "passed", "passed"]);
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
    const run = fileOf(pushed[0], `web/src/site/data/sample/audrey-hepburn.${done.id}.json`)!;
    assert.equal(JSON.parse(run.content).overview.headline, `written under ${from}`, "the run this release's reports came from");
    assert.match(stepOf(done, "forward").detail ?? "", new RegExp(`; /sample: pushed .* from ${from}; Mira's week: pushed ${MIRA_PATH} `));
  }
});

test("the estimate before the button is what mix B costs, the walk's three reports always in it: about 35 cents with both brains changed, 31 with the natal brain alone (MB-133)", () => {
  assert.equal(WALK_ESTIMATE_USD.toFixed(4), "0.1051", "Mira's and Idris's Personal reports at 3.1 cents, their parent and child report at 4.35");
  assert.equal(estimateUsd(true, true).toFixed(4), "0.3527", "five natal reports at 3.1 cents, the pair at 4.3, QA's 5, the walk's 10.5");
  assert.equal(estimateUsd(true, false).toFixed(4), "0.3092");
  assert.equal(estimateUsd(false, false), 0.05 + WALK_ESTIMATE_USD, "no lab: the QA reading and the walk");
  assert.equal(estimateUsd(false, true), estimateUsd(false, false));
});

test("a passing release pushes /sample's run from its lab and Mira's week as one commit on sample/<release-id> from the released commit; a line for each in forward's detail", async () => {
  const d = deps({ token: "tok" });
  const done = await startRelease(d, { wait: true });
  assert.equal(done.status, "forwarded");
  assert.equal(d.pushed.length, 1, "one commit");
  const [push] = d.pushed;
  assert.equal(push.branch, `sample/${done.id}`);
  assert.deepEqual(push.files.map((f) => f.path), [`web/src/site/data/sample/audrey-hepburn.${done.id}.json`, MIRA_PATH]);
  assert.equal(push.parent, "abcdef1234567890", "from the released sha");
  assert.equal(push.token, "tok");
  const file = JSON.parse(push.files[0].content);
  assert.equal("foundation" in file, false, "no foundation");
  assert.equal("usage" in file.meta, false, "no usage");
  assert.equal(file.overview.headline, "written under release-abcdef1");
  assert.equal(fileOf(push, MIRA_PATH)!.content, miraText(NEXT_MONDAY), "the week moves to the Monday after the release");
  const forward = stepOf(done, "forward");
  assert.equal(forward.status, "passed");
  assert.equal(forward.detail, `production fast-forwarded to abcdef1; /sample: pushed web/src/site/data/sample/audrey-hepburn.${done.id}.json on sample/${done.id}, from release-abcdef1; Mira's week: pushed ${MIRA_PATH} on sample/${done.id}, the week of ${NEXT_MONDAY}`);
});

test("Mira's week moves on every forwarded release, a lab or not; the same week is not pushed again, and a week that fails to compute is a line", async () => {
  const unchangedBrain = () => deps({ token: "tok", github: { branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"), changedFiles: async () => ["web/src/App.tsx"], fastForward: async () => undefined, commitFile: async () => "c0ffee" } });

  const noLab = unchangedBrain();
  const pushed: FileCommit[] = [];
  noLab.github.commitFile = async (input) => { pushed.push(input); return "c0ffee"; };
  const moved = await startRelease(noLab, { wait: true });
  assert.equal(moved.status, "forwarded");
  assert.deepEqual(pushed.map((p) => p.files.map((f) => f.path)), [[MIRA_PATH]], "Mira's week alone when no lab ran");
  assert.match(pushed[0].message, /^Mira's week from release /);
  assert.equal(stepOf(moved, "forward").detail, `production fast-forwarded to abcdef1; /sample: skipped, no lab ran for this release (the brain is unchanged), so there is no new run; Mira's week: pushed ${MIRA_PATH} on sample/${moved.id}, the week of ${NEXT_MONDAY}`);

  const same = unchangedBrain();
  same.mira = { week: async (monday) => miraText(monday), current: async () => miraText(NEXT_MONDAY) };
  same.github.commitFile = async () => { throw new Error("no push expected"); };
  const kept = await startRelease(same, { wait: true });
  assert.equal(kept.status, "forwarded");
  assert.equal(stepOf(kept, "forward").detail, `production fast-forwarded to abcdef1; /sample: skipped, no lab ran for this release (the brain is unchanged), so there is no new run; Mira's week: unchanged, the week of ${NEXT_MONDAY} is already on abcdef1`);

  const broken = deps({ token: "tok" });
  broken.mira = { week: async () => { throw new Error("no fixtures/sample-people/mira.json beside the process"); }, current: async () => null };
  const half = await startRelease(broken, { wait: true });
  assert.equal(half.status, "forwarded", "production moved; the week's failure fails nothing");
  assert.deepEqual(broken.pushed.map((p) => p.files.map((f) => f.path)), [[`web/src/site/data/sample/audrey-hepburn.${half.id}.json`]], "/sample's run goes alone");
  assert.match(stepOf(half, "forward").detail ?? "", /; \/sample: pushed .*; Mira's week: not pushed, no fixtures\/sample-people\/mira\.json beside the process$/);
});

test("/sample's and Mira's skips and failures are a line in forward's detail, never a failed release, and the token is in none of them", async () => {
  const token = "github_pat_11ABCDEFG0123456789_secret";
  const asked: string[] = [];
  const quiet = deps();
  quiet.mira = { week: async (monday) => { asked.push(monday); return miraText(monday); }, current: async () => null };
  const noToken = await startRelease(quiet, { wait: true });
  assert.equal(noToken.status, "passed");
  assert.equal(stepOf(noToken, "forward").status, "stopped");
  assert.match(stepOf(noToken, "forward").detail ?? "", /MB-75.*; \/sample: skipped, no GITHUB_RELEASE_TOKEN to push it with; Mira's week: skipped, no GITHUB_RELEASE_TOKEN to push it with$/);
  assert.deepEqual(asked, [], "no week is computed for a push that cannot happen");

  const kept = deps({ token, labStore: { insert: async () => undefined, numbers: async (label) => numbers(label), sampleOutput: async () => null } });
  const none = await startRelease(kept, { wait: true });
  assert.equal(none.status, "forwarded");
  assert.match(stepOf(none, "forward").detail ?? "", new RegExp(`; /sample: skipped, release-abcdef1 kept no audrey-hepburn run; Mira's week: pushed ${MIRA_PATH} `));
  assert.deepEqual(kept.pushed.map((p) => p.files.map((f) => f.path)), [[MIRA_PATH]]);

  const refusing = deps({ token });
  refusing.github.commitFile = async (input, t) => { throw new Error(`GitHub 422 creating ${input.branch}: Reference already exists (${t})`); };
  const refused = await startRelease(refusing, { wait: true });
  assert.equal(refused.status, "forwarded", "production moved; the push's failure fails nothing");
  assert.equal(refused.error, null);
  assert.match(stepOf(refused, "forward").detail ?? "", /; \/sample: not pushed, GitHub 422 creating sample\/.*: Reference already exists \(\[token\]\); Mira's week: not pushed, GitHub 422 creating sample\/.*: Reference already exists \(\[token\]\)$/);

  const stuck = deps({ token });
  stuck.github.fastForward = async () => { throw new Error("GitHub 422 fast-forwarding production: Update is not a fast forward"); };
  const unmoved = await startRelease(stuck, { wait: true });
  assert.equal(unmoved.status, "passed");
  assert.equal(stepOf(unmoved, "forward").status, "failed");
  assert.equal(stepOf(unmoved, "forward").detail, "GitHub 422 fast-forwarding production: Update is not a fast forward; /sample: skipped, production did not move; Mira's week: skipped, production did not move");
  assert.equal(stuck.pushed.length, 0);

  for (const done of [noToken, none, refused, unmoved]) assert.ok(!JSON.stringify(done).includes(token), "the token is in no record");
});

test("production's move is on the record before the sample branch's push starts, so a push that hangs or a restart never hides it", async () => {
  const d = deps({ token: "tok" });
  const seen: Array<{ status: string; forward: Step }> = [];
  d.github.commitFile = async (input) => {
    const row = (await d.store.get(input.branch.replace(/^sample\//, "")))!;
    seen.push({ status: row.status, forward: { ...stepOf(row, "forward") } });
    return "c0ffee";
  };
  const done = await startRelease(d, { wait: true });
  assert.equal(seen.length, 1, "one push");
  assert.equal(seen[0].status, "forwarded");
  assert.equal(seen[0].forward.status, "passed");
  assert.equal(seen[0].forward.detail, "production fast-forwarded to abcdef1");
  assert.equal(d.forwarded.length, 1);
  assert.equal(done.status, "forwarded");
});

test("a failed lab, a red gate or a QA sev-1 pushes no /sample run and no week, and never reaches the token", async () => {
  for (const over of [{ qaStatus: "fail" as const }, { lab: (async () => { throw new Error("lab broke"); }) as ReleaseDeps["lab"] }]) {
    const d = deps({ token: "tok", ...over });
    const done = await startRelease(d, { wait: true });
    assert.equal(done.status, "failed");
    assert.equal(d.pushed.length, 0);
    assert.equal(d.forwarded.length, 0);
  }
  const gated = deps({ token: "tok" });
  const red = await startRelease(gated, { wait: true, seedFault: true });
  assert.equal(red.status, "failed");
  assert.equal(stepOf(red, "gate").status, "failed");
  assert.equal(gated.pushed.length, 0);
  assert.equal(gated.forwarded.length, 0);
});

const BRAIN_UNCHANGED: ReleaseDeps["github"] = {
  branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"),
  changedFiles: async () => ["web/src/App.tsx"],
  fastForward: async () => undefined,
  commitFile: async () => "c0ffee",
};

test("the walk runs after the QA agent: the free render first, then the pair made ready, reset and walked in release mode, and its reports kept as the seed", async () => {
  const calls: string[] = [];
  const walk = walkDeps(PASSED, calls);
  const done = await startRelease(deps({ token: "tok", walk }), { wait: true });
  assert.equal(done.status, "forwarded");
  assert.deepEqual((done.steps as Step[]).map((s) => s.name), ["lab", "gate", "qa", "walk", "forward"]);
  assert.deepEqual(calls, ["dry render", "ensure", "reset", "walk release", "store the seed"]);
  assert.deepEqual([stepOf(done, "walk").status, stepOf(done, "walk").detail], ["passed", "2 steps passed; the seed kept 1 report(s)"]);
  assert.deepEqual(walk.record.rows.map((r) => [r.sha, r.mode, r.status]), [["abcdef1234567890", "release", "pass"]]);
  assert.deepEqual(modelCalls, []);
});

test("a failed walk fails the Release (ADR-272): nothing is forwarded, a failed write leaves a generation_failures row, and what it finished still becomes the seed", async () => {
  const failures: Array<Record<string, unknown>> = [];
  const restore = setFailureSink(async (rows) => {
    for (const r of rows) failures.push({ kind: r.kind, section: r.section, ruleId: r.ruleId, class: r.class, message: r.message, final: r.final });
  });
  try {
    const calls: string[] = [];
    const failed: WalkVerdict = {
      status: "fail",
      steps: [
        { id: "own-report", label: "Mira writes her Personal report; a credit is taken before it's written", status: "pass", ms: 90_000 },
        { id: "idris-report", label: "Idris writes his Personal report with the gifted credit", status: "fail", reason: "the report failed after one try", ms: 120_000 },
        { id: "share", label: "Mira shares her report with Idris; he reads it from the link", status: "not_run", ms: 0 },
      ],
      findings: [{ step: "idris-report", title: "Idris's report failed", detail: "It read failed after one try." }],
    };
    const d = deps({ token: "tok", walk: walkDeps(failed, calls) });
    const done = await startRelease(d, { wait: true });
    const line = "failed at Idris writes his Personal report with the gifted credit: the report failed after one try; the seed kept 1 report(s)";
    assert.equal(done.status, "failed");
    assert.deepEqual([stepOf(done, "walk").status, stepOf(done, "walk").detail, done.error], ["failed", line, line]);
    assert.equal(stepOf(done, "forward").status, "skipped");
    assert.deepEqual([d.forwarded, d.pushed], [[], []]);
    assert.deepEqual(failures, [{ kind: "natal", section: "qa-walk:idris-report", ruleId: "qa-walk-write", class: "block", message: "the report failed after one try", final: true }]);
    assert.ok(calls.includes("store the seed"));
  } finally {
    restore();
  }
});

test("a prompt that won't render, or a walk the lab budget can't hold, fails the step before anything is written", async () => {
  const calls: string[] = [];
  const unrendered = { ...walkDeps(PASSED, calls), dry: async () => { calls.push("dry render"); return ["mira career: Unknown section natal:career"]; } };
  const refused = await startRelease(deps({ token: "tok", walk: unrendered }), { wait: true });
  assert.equal(refused.status, "failed");
  assert.equal(stepOf(refused, "walk").detail, "nothing was written: 1 prompt(s) failed the free render, mira career: Unknown section natal:career");
  assert.deepEqual(calls.splice(0), ["dry render"]);

  // The lab's own spend lands between the preflight and the walk.
  let asked = 0;
  const spent = await startRelease(deps({ token: "tok", github: BRAIN_UNCHANGED, walk: walkDeps(PASSED, calls), spentUsd: async () => (++asked === 1 ? 1 : 14.99) }), { wait: true });
  assert.equal(spent.status, "failed");
  assert.match(stepOf(spent, "walk").detail ?? "", /^lab budget: \$14\.9900 spent this month plus about \$0\.1051 would pass \$15\.00/);
  assert.deepEqual(calls, []);
  assert.deepEqual(modelCalls, []);
});

test("a host with no browser skips the walk, as it skips the QA agent, and the Release goes on with the seed as it was", async () => {
  const calls: string[] = [];
  const none: WalkVerdict = { status: "unconfigured", steps: [], findings: [{ step: null, title: "No browser", detail: "Chromium is not on this host." }] };
  const done = await startRelease(deps({ token: "tok", walk: walkDeps(none, calls) }), { wait: true });
  assert.equal(done.status, "forwarded");
  assert.deepEqual([stepOf(done, "walk").status, stepOf(done, "walk").detail], ["skipped", "No browser. Chromium is not on this host."]);
  assert.ok(!calls.includes("store the seed"));
});

test("without a walk in its deps a run skips the step and names no walk, as a rehearsal built before the walk does", async () => {
  const done = await startRelease(deps({ token: "tok", walk: undefined }), { wait: true });
  assert.equal(done.status, "forwarded");
  assert.deepEqual([stepOf(done, "walk").status, stepOf(done, "walk").detail], ["skipped", "this run has no staging walk"]);
  assert.equal((await preflight(deps({ walk: undefined }))).qaWalk, null);
});

test("preflight carries the newest walk, a failed one by its step's label, and the start's sync problem only while there is one", async () => {
  const record = memoryWalks();
  const d = deps({ walk: walkDeps(PASSED, [], record) });
  assert.equal((await preflight(d)).qaWalk, null, "no walk yet");

  const began = new Date("2026-10-05T12:00:00.000Z");
  const id = (await record.begin({ sha: "abcdef1234567890", mode: "deploy", startedAt: began }, false))!;
  assert.deepEqual((await preflight(d)).qaWalk, { status: "running", step: null, at: "2026-10-05T12:00:00.000Z" }, "a running walk, by when it began");
  await record.finish(id, {
    status: "fail",
    steps: [
      { id: "gift", label: "Mira gifts Idris a report; the email goes out and a credit is held", status: "pass", ms: 4_000 },
      { id: "gift-claimed", label: "Idris claims the gift from its link; the credit moves to him", status: "fail", reason: "the link said it was used", ms: 2_000 },
    ],
    findings: [],
  }, new Date("2026-10-05T12:09:00.000Z"));
  assert.deepEqual((await preflight(d)).qaWalk, { status: "fail", step: "Idris claims the gift from its link; the credit moves to him", at: "2026-10-05T12:09:00.000Z" });

  for (const status of ["pass", "unseeded", "unconfigured"] as const) {
    const later = (await record.begin({ sha: `${status}-sha`, mode: "deploy", startedAt: new Date(began.getTime() + 3_600_000 * (record.rows.length + 1)) }, false))!;
    await record.finish(later, { status, steps: [], findings: [] }, new Date(began.getTime() + 3_600_000 * (record.rows.length + 1)));
    const line = (await preflight(d)).qaWalk!;
    assert.deepEqual([line.status, line.step], [status, null], status);
  }

  assert.equal(lastSync(), null);
  assert.equal((await preflight(d)).stripeSync, null, "no sync has run in this process");
  await syncProductsOnStart({ client: null, env: {} });
  const pre = await preflight(d);
  assert.equal(pre.stripeSync, lastSync()!.problem);
  assert.match(pre.stripeSync ?? "", /^skipped, /);
});

test("the two walks take turns: a Release's walk waits for a deploy's to end before it resets the pair", async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const calls: string[] = [];
  const record = memoryWalks();
  const deploy: WalkDeps = { ...walkDeps(PASSED, calls, record), walk: async ({ mode }) => { calls.push(`walk ${mode}`); await held; calls.push(`end ${mode}`); return PASSED; } };
  const first = walkOnce("deploy", "1111111aaaaaaaaa", deploy);
  const second = walkOnce("release", "2222222bbbbbbbbb", walkDeps(PASSED, calls, record));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(calls, ["ensure", "reset", "walk deploy"], "the Release's walk waits, its pair untouched");
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(calls, ["ensure", "reset", "walk deploy", "end deploy", "ensure", "reset", "walk release", "store the seed"]);
  assert.deepEqual([a?.seed, b?.seed], [null, { kept: 1 }], "only a Release's walk keeps a seed");
});

test("the free dry render of the walk's three reports renders every prompt on the sample people's computed charts, and calls no model", async () => {
  assert.deepEqual(await dryRenderWalk(), []);
  assert.deepEqual(modelCalls, []);
});

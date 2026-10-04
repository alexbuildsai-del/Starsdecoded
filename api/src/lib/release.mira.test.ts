/**
 * Mira's week in the Release (R16-05, ADR-250, reading 22), on the rehearsal's stubs: the week is asked for only once
 * production has moved and only with a token, on every forwarded release a lab or not, for the Monday after the day it
 * moved; its failure, its slowness and its being already on the commit change nothing about the release; and no stopped
 * release ever asks for it. `release.test.ts` drives the whole flow; these are the cases it does not reach.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { startRelease } = await import("./release.js");
const { MATRIX_CHARTS } = await import("./labRules.js");
const { SECTION_IDS } = await import("../prompts/index.js");
type ReleaseDeps = import("./release.js").ReleaseDeps;
type ReleaseStore = import("./release.js").ReleaseStore;
type LabRelease = import("@workspace/db").LabRelease;
type RunNumbers = import("./labRules.js").RunNumbers;
type FileCommit = import("./github.js").FileCommit;

const MIRA_PATH = "web/src/site/data/timeline/mira-week.json";
const miraText = (monday: string) => `{"week":"${monday}"}\n`;
type Step = { name: string; status: string; detail: string | null };
const stepOf = (done: LabRelease, name: string) => (done.steps as Step[]).find((s) => s.name === name)!;

function memoryStore(): ReleaseStore {
  const rows = new Map<string, LabRelease>();
  return {
    async insert(row) { rows.set(row.id, { ...row, createdAt: new Date(), updatedAt: new Date() } as LabRelease); },
    async update(id, patch) { rows.set(id, { ...rows.get(id)!, ...patch, updatedAt: new Date() } as LabRelease); },
    async get(id) { return rows.get(id) ?? null; },
    async list() { return [...rows.values()]; },
    async running() { return [...rows.values()].find((r) => r.status === "running") ?? null; },
  };
}

const numbers = (label: string): RunNumbers[] =>
  MATRIX_CHARTS.flatMap((fixture) => ["foundation", ...SECTION_IDS].map((section) => ({ fixture, label, section, words: section === "foundation" ? 0 : 420, costUsd: 0.025, faults: [], status: "done" })));

const BRAIN_UNCHANGED = ["web/src/App.tsx"];

/** A release rehearsal that keeps what Mira's source was asked and what was committed. */
function rehearsal(options: { token?: string; qa?: "pass" | "fail" | "unconfigured"; at?: Date; changed?: string[]; mira?: Partial<ReleaseDeps["mira"]>; fastForward?: ReleaseDeps["github"]["fastForward"] } = {}) {
  const asked: string[] = [];
  const read: string[] = [];
  const pushed: FileCommit[] = [];
  const store = memoryStore();
  const at = options.at ?? new Date("2026-10-07T10:00:00Z");
  const deps: ReleaseDeps = {
    github: {
      branchHead: async (b) => (b === "main" ? "abcdef1234567890" : "0000000000000000"),
      changedFiles: async () => options.changed ?? BRAIN_UNCHANGED,
      fastForward: options.fastForward ?? (async () => undefined),
      commitFile: async (input) => { pushed.push(input); return "c0ffee"; },
    },
    lab: async ({ label }) => ({ label, natalRunKeys: MATRIX_CHARTS.map((c) => `${c}.${label}`), pairRunKey: null, costUsd: 1, failed: [] }),
    labStore: {
      insert: async () => undefined,
      numbers: async (label) => numbers(label),
      sampleOutput: async (label) => ({ meta: { reportType: "natal", usage: {} }, foundation: {}, overview: { headline: label } }),
    },
    qa: async () => (options.qa === "fail"
      ? { status: "fail", findings: [{ sev: 1, where: "Buyer at /", title: "wrong", detail: "x" }], costUsd: 0 }
      : options.qa === "unconfigured" ? { status: "unconfigured", findings: [], costUsd: 0, reason: "no browser" }
        : { status: "pass", findings: [], costUsd: 0 }),
    store,
    spentUsd: async () => 0,
    env: { APP_ENV: "staging", RAILWAY_GIT_COMMIT_SHA: "abcdef1234567890", OPENAI_API_KEY: "x", PATH: "", ...(options.token ? { GITHUB_RELEASE_TOKEN: options.token } : {}) },
    webOrigin: "https://staging.test",
    mira: {
      week: async (monday) => { asked.push(monday); return miraText(monday); },
      current: async () => { read.push("current"); return null; },
      ...options.mira,
    },
    now: () => at,
  };
  return { deps, asked, read, pushed, store };
}

test("the week asked for is the Monday after the day production moved, whatever day that is, and the release's own time decides", async () => {
  const days: Array<[string, string]> = [
    ["2026-10-05T00:00:00Z", "2026-10-12"],
    ["2026-10-06T12:00:00Z", "2026-10-12"],
    ["2026-10-11T23:59:59Z", "2026-10-12"],
    ["2026-10-12T00:00:00Z", "2026-10-19"],
    ["2026-12-31T08:00:00Z", "2027-01-04"],
  ];
  for (const [at, monday] of days) {
    const r = rehearsal({ token: "tok", at: new Date(at) });
    const done = await startRelease(r.deps, { wait: true });
    assert.equal(done.status, "forwarded", at);
    assert.deepEqual(r.asked, [monday], at);
    assert.equal(r.pushed[0].files.find((f) => f.path === MIRA_PATH)!.content, miraText(monday), at);
    assert.match(r.pushed[0].message, new RegExp(`the week of ${monday}`), at);
  }
});

test("the week is asked for once, and its current file read once, however the release went", async () => {
  const r = rehearsal({ token: "tok" });
  await startRelease(r.deps, { wait: true });
  assert.equal(r.asked.length, 1);
  assert.equal(r.read.length, 1);
  assert.equal(r.pushed.length, 1, "one commit");
});

test("a release that stops asks for no week and pushes nothing: no token, a red QA, a lab that breaks, a fast-forward GitHub refuses", async () => {
  const noToken = rehearsal({});
  assert.equal((await startRelease(noToken.deps, { wait: true })).status, "passed");
  const red = rehearsal({ token: "tok", qa: "fail" });
  assert.equal((await startRelease(red.deps, { wait: true })).status, "failed");
  const broken = rehearsal({ token: "tok", changed: ["api/src/prompts/system.ts"] });
  broken.deps.lab = async () => { throw new Error("lab broke"); };
  assert.equal((await startRelease(broken.deps, { wait: true })).status, "failed");
  const refused = rehearsal({ token: "tok", fastForward: async () => { throw new Error("GitHub 422 fast-forwarding production: Update is not a fast forward"); } });
  const stuck = await startRelease(refused.deps, { wait: true });
  assert.equal(stuck.status, "passed");
  assert.match(stepOf(stuck, "forward").detail ?? "", /Mira's week: skipped, production did not move$/);
  for (const r of [noToken, red, broken, refused]) {
    assert.deepEqual(r.asked, []);
    assert.deepEqual(r.read, []);
    assert.deepEqual(r.pushed, []);
  }
});

test("a token-less release names the week as skipped for the token, after the run's own line", async () => {
  const unchanged = await startRelease(rehearsal({}).deps, { wait: true });
  assert.match(stepOf(unchanged, "forward").detail ?? "", /MB-75.*; \/sample: skipped, no lab ran for this release \(the brain is unchanged\), so there is no new run; Mira's week: skipped, no GITHUB_RELEASE_TOKEN to push it with$/);
  const changed = await startRelease(rehearsal({ changed: ["api/src/prompts/system.ts"] }).deps, { wait: true });
  assert.match(stepOf(changed, "forward").detail ?? "", /MB-75.*; \/sample: skipped, no GITHUB_RELEASE_TOKEN to push it with; Mira's week: skipped, no GITHUB_RELEASE_TOKEN to push it with$/);
});

test("a QA agent that is not configured still lets the week move: the step is skipped, the release forwarded, the week pushed", async () => {
  const r = rehearsal({ token: "tok", qa: "unconfigured" });
  const done = await startRelease(r.deps, { wait: true });
  assert.equal(stepOf(done, "qa").status, "skipped");
  assert.equal(done.status, "forwarded");
  assert.deepEqual(r.pushed.map((p) => p.files.map((f) => f.path)), [[MIRA_PATH]]);
});

test("production's move is on the record before the week is computed, so a slow or hung engine never hides it", async () => {
  let seen: { status: string; detail: string | null } | null = null;
  const r = rehearsal({ token: "tok" });
  r.deps.mira = {
    week: async (monday) => {
      const rows = await r.store.list();
      const row = rows.find((x) => x.status === "forwarded");
      seen = row ? { status: row.status, detail: stepOf(row, "forward").detail } : null;
      return miraText(monday);
    },
    current: async () => null,
  };
  await startRelease(r.deps, { wait: true });
  assert.deepEqual(seen, { status: "forwarded", detail: "production fast-forwarded to abcdef1" });
});

test("a week that cannot be computed, one that cannot be read back and one that throws a string each leave a forwarded release with a line", async () => {
  const cases: Array<[string, Partial<ReleaseDeps["mira"]>, RegExp]> = [
    ["computing", { week: async () => { throw new Error("engine broke"); } }, /Mira's week: not pushed, engine broke$/],
    ["a string", { week: async () => { throw "plain string"; } }, /Mira's week: not pushed, plain string$/],
    ["reading", { current: async () => { throw new Error("EACCES"); } }, /Mira's week: pushed web\/src\/site\/data\/timeline\/mira-week\.json on sample\/.*, the week of 2026-10-12$/],
  ];
  for (const [what, mira, line] of cases) {
    const r = rehearsal({ token: "tok", mira });
    const done = await startRelease(r.deps, { wait: true });
    assert.equal(done.status, "forwarded", what);
    assert.equal(done.error, null, what);
    assert.equal(stepOf(done, "forward").status, "passed", what);
    assert.match(stepOf(done, "forward").detail ?? "", line, what);
  }
});

test("the same week already on the commit is not pushed again, whatever else the release did", async () => {
  const same = rehearsal({ token: "tok", mira: { current: async () => miraText("2026-10-12") } });
  const done = await startRelease(same.deps, { wait: true });
  assert.equal(done.status, "forwarded");
  assert.deepEqual(same.pushed, []);
  assert.match(stepOf(done, "forward").detail ?? "", /Mira's week: unchanged, the week of 2026-10-12 is already on abcdef1$/);
  const brain = rehearsal({ token: "tok", changed: ["api/src/prompts/system.ts"], mira: { current: async () => miraText("2026-10-12") } });
  const withRun = await startRelease(brain.deps, { wait: true });
  assert.deepEqual(brain.pushed.map((p) => p.files.map((f) => f.path)), [[`web/src/site/data/sample/audrey-hepburn.${withRun.id}.json`]], "the run alone");
});

test("the token reaches the commit and no record, and the pushed files are the two the sample branch may hold", async () => {
  const token = "github_pat_11ABCDEFG0123456789_secret";
  const r = rehearsal({ token, changed: ["api/src/prompts/system.ts"] });
  r.deps.github.commitFile = async (input, t) => { assert.equal(t, token); r.pushed.push(input); throw new Error(`GitHub 422 ${t}`); };
  const done = await startRelease(r.deps, { wait: true });
  assert.equal(done.status, "forwarded");
  assert.ok(!JSON.stringify(done).includes(token));
  assert.match(stepOf(done, "forward").detail ?? "", /\/sample: not pushed, GitHub 422 \[token\]; Mira's week: not pushed, GitHub 422 \[token\]$/);
  assert.deepEqual(r.pushed[0].files.map((f) => f.path), [`web/src/site/data/sample/audrey-hepburn.${done.id}.json`, MIRA_PATH]);
  assert.equal(r.pushed[0].parent, "abcdef1234567890");
  assert.equal(r.pushed[0].branch, `sample/${done.id}`);
});

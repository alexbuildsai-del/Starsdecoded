/**
 * The release (ADR-86, R-4.4): one admin action on staging runs, in order,
 * the release lab when the brain changed since production's commit, the
 * gate, the QA agent, and the fast-forward of `production` with the token
 * Railway holds. Every step is written to `lab_releases` as it ends, so a
 * restart finds the record and not a memory. Without the token the release
 * stops at `passed` and names MB-75; the Promote workflow then reads the
 * public verdict (MB-79). The pieces are injected so the whole flow is
 * rehearsed in a test with a stub lab and a stub verdict, no spend.
 */
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db, labReleasesTable, type InsertLabRelease, type LabRelease } from "@workspace/db";
import { readAppEnv, readCommitSha } from "./appEnv.js";
import { brainDiff, githubApi, type GithubApi } from "./github.js";
import { MATRIX_CHARTS, gateProblems } from "./labRules.js";
import { budgetUsd, checkBudget, dbStore, monthStart } from "./labReplay.js";
import { NATAL_ESTIMATE_USD, PAIR_ESTIMATE_USD, dbReleaseStore, runReleaseLab, type ReleaseLabOutcome, type ReleaseLabStore } from "./releaseLab.js";
import { findChromium } from "./qaAgent/browser.js";
import { runQaAgent, type QaVerdict } from "./qaAgent/index.js";
import { logger } from "./logger.js";

export type StepName = "lab" | "gate" | "qa" | "forward";
export type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped" | "stopped";

export interface ReleaseStep {
  name: StepName;
  status: StepStatus;
  detail: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface Preflight {
  /** The commit staging is running, which is what a release ships. */
  sha: string | null;
  mainHead: string | null;
  productionSha: string | null;
  brainChanged: boolean;
  pairChanged: boolean;
  files: string[];
  estimateUsd: number;
  spentUsd: number;
  budgetUsd: number;
  overBudget: boolean;
  /** Which keys are present, never their values. */
  keys: { openai: boolean; githubReleaseToken: boolean; browser: boolean };
  env: string;
  stagingOnly: boolean;
  problems: string[];
}

export interface ReleaseStore {
  insert(row: InsertLabRelease): Promise<void>;
  update(id: string, patch: Partial<InsertLabRelease>): Promise<void>;
  get(id: string): Promise<LabRelease | null>;
  list(): Promise<LabRelease[]>;
  running(): Promise<LabRelease | null>;
}

export const dbReleaseRecordStore: ReleaseStore = {
  async insert(row) { await db.insert(labReleasesTable).values(row); },
  async update(id, patch) { await db.update(labReleasesTable).set({ ...patch, updatedAt: new Date() }).where(eq(labReleasesTable.id, id)); },
  async get(id) { const [r] = await db.select().from(labReleasesTable).where(eq(labReleasesTable.id, id)).limit(1); return r ?? null; },
  async list() { return db.select().from(labReleasesTable).orderBy(desc(labReleasesTable.createdAt)).limit(30); },
  async running() { const [r] = await db.select().from(labReleasesTable).where(eq(labReleasesTable.status, "running")).limit(1); return r ?? null; },
};

export interface ReleaseDeps {
  github: GithubApi;
  lab: (input: { label: string; withPair: boolean; signal?: AbortSignal }) => Promise<ReleaseLabOutcome>;
  labStore: ReleaseLabStore;
  qa: (input: { webOrigin: string; natalRunKey: string | null; pairRunKey: string | null; signal?: AbortSignal; label: string }) => Promise<QaVerdict>;
  store: ReleaseStore;
  spentUsd: () => Promise<number>;
  env: NodeJS.ProcessEnv;
  webOrigin: string;
}

export function liveDeps(env: NodeJS.ProcessEnv = process.env): ReleaseDeps {
  return {
    github: githubApi(),
    lab: (input) => runReleaseLab(input),
    labStore: dbReleaseStore,
    qa: (input) => runQaAgent(input),
    store: dbReleaseRecordStore,
    spentUsd: () => dbStore.spentUsd(monthStart()),
    env,
    webOrigin: env.PUBLIC_APP_URL ?? "https://starsdecoded-staging.vercel.app",
  };
}

export const STEPS: StepName[] = ["lab", "gate", "qa", "forward"];

function freshSteps(): ReleaseStep[] {
  return STEPS.map((name) => ({ name, status: "pending", detail: null, startedAt: null, endedAt: null }));
}

/** The estimate the Release view shows before the button: the lab's price when the brain changed, the QA reading's few cents always. */
export function estimateUsd(brainChanged: boolean, pairChanged: boolean): number {
  return (brainChanged ? MATRIX_CHARTS.length * NATAL_ESTIMATE_USD + (pairChanged ? PAIR_ESTIMATE_USD : 0) : 0) + 0.05;
}

export async function preflight(deps: ReleaseDeps): Promise<Preflight> {
  const env = deps.env;
  const sha = readCommitSha(env);
  const appEnv = readAppEnv(env);
  const problems: string[] = [];
  let mainHead: string | null = null, productionSha: string | null = null, files: string[] = [];
  try {
    [mainHead, productionSha] = await Promise.all([deps.github.branchHead("main"), deps.github.branchHead("production")]);
    // With no production branch yet, everything is new: the full lab runs.
    files = productionSha && sha ? await deps.github.changedFiles(productionSha, sha) : [];
  } catch (err) {
    problems.push(`GitHub did not answer: ${err instanceof Error ? err.message : String(err)}`);
  }
  const diff = brainDiff(files);
  const brainChanged = !productionSha || diff.brainChanged;
  const pairChanged = !productionSha || diff.pairChanged;
  const estimate = estimateUsd(brainChanged, pairChanged);
  const spentUsd = await deps.spentUsd();
  const budget = budgetUsd(env);
  if (!sha) problems.push("this process does not know its commit (RAILWAY_GIT_COMMIT_SHA); a release ships a known commit");
  if (sha && mainHead && sha !== mainHead) problems.push(`staging runs ${sha.slice(0, 7)} but main is at ${mainHead.slice(0, 7)}; wait for the deploy`);
  if (appEnv !== "staging") problems.push(`releases start from staging only; this is ${appEnv}`);
  if (spentUsd + estimate > budget) problems.push(`the lab budget would be passed: $${spentUsd.toFixed(2)} spent plus about $${estimate.toFixed(2)} over $${budget.toFixed(2)}`);
  return {
    sha, mainHead, productionSha, brainChanged, pairChanged, files: diff.files, estimateUsd: estimate, spentUsd, budgetUsd: budget,
    overBudget: spentUsd + estimate > budget,
    keys: { openai: Boolean(env.OPENAI_API_KEY || env.AI_INTEGRATIONS_OPENAI_API_KEY), githubReleaseToken: Boolean(env.GITHUB_RELEASE_TOKEN), browser: findChromium(env) !== null },
    env: appEnv, stagingOnly: appEnv === "staging", problems,
  };
}

export class ReleaseRefused extends Error {
  constructor(message: string, public readonly status = 409) { super(message); this.name = "ReleaseRefused"; }
}

/** Starts a release: refuses when preflight has a problem or one is already running; returns the row, the steps run in the background unless `wait` is asked. */
export async function startRelease(deps: ReleaseDeps, options: { seedFault?: boolean; wait?: boolean } = {}): Promise<LabRelease> {
  const pre = await preflight(deps);
  if (pre.problems.length) throw new ReleaseRefused(pre.problems.join("; "), 409);
  const running = await deps.store.running();
  if (running) throw new ReleaseRefused(`release ${running.id} is still running`, 409);
  const id = randomUUID();
  const row: InsertLabRelease = {
    id, sha: pre.sha!, productionSha: pre.productionSha, brainChanged: pre.brainChanged, pairChanged: pre.pairChanged,
    status: "running", steps: freshSteps() as unknown as object, qa: null, error: null,
  };
  await deps.store.insert(row);
  if (options.wait) return runRelease(id, deps, options);
  void runRelease(id, deps, options).catch((err) => logger.error({ err, id }, "release run crashed"));
  return { ...row, createdAt: new Date(), updatedAt: new Date() } as LabRelease;
}

async function stepDone(deps: ReleaseDeps, id: string, steps: ReleaseStep[], name: StepName, status: StepStatus, detail: string | null): Promise<void> {
  const step = steps.find((s) => s.name === name)!;
  step.status = status;
  step.detail = detail;
  step.endedAt = new Date().toISOString();
  await deps.store.update(id, { steps: steps as unknown as object });
}

async function stepStart(deps: ReleaseDeps, id: string, steps: ReleaseStep[], name: StepName): Promise<void> {
  const step = steps.find((s) => s.name === name)!;
  step.status = "running";
  step.startedAt = new Date().toISOString();
  await deps.store.update(id, { steps: steps as unknown as object });
}

/**
 * The steps in order. A failed lab, a red gate or a QA sev-1 stops the
 * release as `failed`; a clean run fast-forwards when the token is there
 * and otherwise stops `passed`, naming MB-75.
 */
export async function runRelease(id: string, deps: ReleaseDeps, options: { seedFault?: boolean } = {}): Promise<LabRelease> {
  const row = await deps.store.get(id);
  if (!row) throw new Error(`no release ${id}`);
  const steps = (row.steps as ReleaseStep[] | null)?.length ? (row.steps as ReleaseStep[]) : freshSteps();
  const label = `release-${row.sha.slice(0, 7)}`;
  const fail = async (name: StepName, detail: string) => {
    await stepDone(deps, id, steps, name, "failed", detail);
    for (const s of steps) if (s.status === "pending") s.status = "skipped";
    await deps.store.update(id, { status: "failed", error: detail, steps: steps as unknown as object });
    return (await deps.store.get(id))!;
  };

  let natalRunKey: string | null = null, pairRunKey: string | null = null;
  if (row.brainChanged) {
    await stepStart(deps, id, steps, "lab");
    try {
      checkBudget(await deps.spentUsd(), estimateUsd(true, row.pairChanged), budgetUsd(deps.env));
      const outcome = await deps.lab({ label, withPair: row.pairChanged });
      natalRunKey = outcome.natalRunKeys[0] ?? null;
      pairRunKey = outcome.pairRunKey;
      const detail = `${outcome.natalRunKeys.length} chart(s)${outcome.pairRunKey ? " and one pair" : ""}, $${outcome.costUsd.toFixed(4)}${outcome.failed.length ? `; failed: ${outcome.failed.map((f) => `${f.fixture} (${f.error.slice(0, 80)})`).join(", ")}` : ""}`;
      if (outcome.natalRunKeys.length < MATRIX_CHARTS.length) return fail("lab", detail);
      await stepDone(deps, id, steps, "lab", "passed", detail);
    } catch (err) {
      return fail("lab", err instanceof Error ? err.message : String(err));
    }

    await stepStart(deps, id, steps, "gate");
    try {
      const reference = (await deps.labStore.lastReleaseLabel(label)) ?? "r06";
      const [ref, cand] = await Promise.all([deps.labStore.numbers(reference), deps.labStore.numbers(label)]);
      // The rehearsal's seeded fault: one contract fault the reference lacks, so the gate must refuse (acceptance 8).
      if (options.seedFault) cand.filter((r) => r.section === "career").forEach((r) => r.faults.push("char:em-dash"));
      const problems = gateProblems(ref, cand);
      if (problems.length) return fail("gate", `against ${reference}: ${problems.join("; ")}`);
      await stepDone(deps, id, steps, "gate", "passed", `against ${reference}: no new fault, every total in band, cost within tolerance`);
    } catch (err) {
      return fail("gate", err instanceof Error ? err.message : String(err));
    }
  } else {
    await stepDone(deps, id, steps, "lab", "skipped", "the brain is unchanged since production");
    await stepDone(deps, id, steps, "gate", "skipped", "no lab, no gate");
  }

  await stepStart(deps, id, steps, "qa");
  let verdict: QaVerdict;
  try {
    verdict = await deps.qa({ webOrigin: deps.webOrigin, natalRunKey, pairRunKey, label });
  } catch (err) {
    verdict = { status: "fail", findings: [{ sev: 1, where: "the QA agent", title: "the agent threw", detail: err instanceof Error ? err.message : String(err) }], costUsd: 0 };
  }
  await deps.store.update(id, { qa: verdict as unknown as object });
  if (verdict.status === "fail") return fail("qa", `${verdict.findings.filter((f) => f.sev === 1).length} sev-1 finding(s): ${verdict.findings.filter((f) => f.sev === 1).map((f) => f.title).join("; ")}`);
  await stepDone(deps, id, steps, "qa", verdict.status === "unconfigured" ? "skipped" : "passed", verdict.status === "unconfigured" ? (verdict.reason ?? "unconfigured") : `${verdict.findings.length} finding(s), none sev-1, $${verdict.costUsd.toFixed(4)}`);

  const token = deps.env.GITHUB_RELEASE_TOKEN;
  if (!token) {
    await stepDone(deps, id, steps, "forward", "stopped", "GITHUB_RELEASE_TOKEN is not on Railway staging (MB-75); dispatch Promote with this release id");
    await deps.store.update(id, { status: "passed" });
    return (await deps.store.get(id))!;
  }
  await stepStart(deps, id, steps, "forward");
  try {
    await deps.github.fastForward("production", row.sha, token);
    await stepDone(deps, id, steps, "forward", "passed", `production fast-forwarded to ${row.sha.slice(0, 7)}`);
    await deps.store.update(id, { status: "forwarded" });
  } catch (err) {
    await stepDone(deps, id, steps, "forward", "failed", err instanceof Error ? err.message : String(err));
    await deps.store.update(id, { status: "passed", error: err instanceof Error ? err.message : String(err) });
  }
  return (await deps.store.get(id))!;
}

/** On boot: a release the last process left running was cut by the restart; the record says so instead of spinning for ever. */
export async function settleInterrupted(store: ReleaseStore = dbReleaseRecordStore): Promise<void> {
  const running = await store.running();
  if (running) await store.update(running.id, { status: "stopped", error: "the process restarted while this release was running" });
}

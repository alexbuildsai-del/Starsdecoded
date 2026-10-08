/**
 * The release (ADR-86, R-4.4): one admin action on staging runs, in order,
 * the release lab when the brain changed since production's commit, the
 * gate, the QA agent, the staging walk as the QA pair (ADR-315), and the
 * fast-forward of `production` with the token Railway holds, then /sample's
 * run and Mira's week on a branch of their own (ADR-247, ADR-250). Every
 * step is written to `lab_releases` as it ends, so a restart finds the
 * record and not a memory. Without the token the release stops at `passed`
 * and names MB-75; the Promote workflow then reads the public verdict
 * (MB-79). The pieces are injected so the whole flow is rehearsed in a test
 * with a stub lab, a stub verdict, a stub walk, a stub GitHub and a stub
 * week, no spend. The walk's runner and its `qa_walks` record live here too,
 * since the deploy trigger in routes/qa.ts walks with the same ones.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import {
  db,
  labReleasesTable,
  qaWalksTable,
  type GenerationFailureKind,
  type InsertLabRelease,
  type LabRelease,
  type QaWalkMode,
  type QaWalkRow,
  type QaWalkStatus,
} from "@workspace/db";
import { readAppEnv, readCommitSha } from "./appEnv.js";
import type { ReportInterpretation } from "./aiInterpretation.js";
import { recordChecks } from "./failureLog.js";
import { RELEASE_BRANCH, brainDiff, githubApi, type GithubApi } from "./github.js";
import { dryNatal, dryPair } from "./labDry.js";
import { MATRIX_CHARTS, gateProblems } from "./labRules.js";
import { budgetUsd, checkBudget, dbStore, monthStart } from "./labReplay.js";
import {
  NATAL_ESTIMATE_USD, PAIR_ESTIMATE_USD, RELEASE_PAIR, chartOf, dbReleaseStore, fixturesDir, runReleaseLab,
  type ChartFixture, type ReleaseLabOutcome, type ReleaseLabStore,
} from "./releaseLab.js";
import { liveMira, pushSample, type MiraSource } from "./sampleRun.js";
import { ensureQaPair, qaPairStopping, resetQaPair, storeQaSeed, type QaPair, type SeedStep } from "./qaPair.js";
import { lastSync } from "./stripeSync.js";
import { findChromium } from "./qaAgent/browser.js";
import { runQaAgent, type QaVerdict } from "./qaAgent/index.js";
import { logger } from "./logger.js";

export type StepName = "lab" | "gate" | "qa" | "walk" | "forward";
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
  /** The newest staging walk: its status, the label of the step it failed at, and when it ended, or began while it runs. */
  qaWalk: { status: QaWalkStatus; step: string | null; at: string } | null;
  /** The start's product sync, only while it holds a problem (reading 14). */
  stripeSync: string | null;
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

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** What a walk answers, the staging walk's pinned shape: steps in the list's order, and what it found. */
export type WalkStepStatus = "pass" | "fail" | "stored" | "local" | "not_run";

export interface WalkStep {
  id: string;
  label: string;
  status: WalkStepStatus;
  reason?: string;
  ms: number;
}

export interface WalkFinding {
  /** Null for what stopped the walk outside any one step. */
  step: string | null;
  title: string;
  detail: string;
}

export interface WalkVerdict {
  status: QaWalkStatus;
  steps: WalkStep[];
  findings: WalkFinding[];
}

/** One row a walk (ADR-279): the deploy trigger, the Release and /api/qa/latest all go through it. */
export interface QaWalkRecord {
  /** The newest walk, finished or still running. */
  latest(): Promise<QaWalkRow | null>;
  /** Whether this commit has a walk already, of either mode. */
  walked(sha: string): Promise<boolean>;
  /** The new running row's id; with `oncePerCommit`, null when the commit has one already. */
  begin(walk: { sha: string; mode: QaWalkMode; startedAt: Date }, oncePerCommit: boolean): Promise<string | null>;
  finish(id: string, verdict: WalkVerdict, at: Date): Promise<void>;
  /** Every row still running that began before `before` was cut off by a restart: settled failed. Answers how many. */
  settle(before: Date, at: Date): Promise<number>;
}

export const CUT_OFF: WalkFinding = { step: null, title: "The walk did not finish", detail: "The server restarted while it was running." };

export const dbQaWalkRecord: QaWalkRecord = {
  async latest() {
    const [row] = await db.select().from(qaWalksTable).orderBy(desc(qaWalksTable.startedAt)).limit(1);
    return row ?? null;
  },
  async walked(sha) {
    const [row] = await db.select({ id: qaWalksTable.id }).from(qaWalksTable).where(eq(qaWalksTable.sha, sha)).limit(1);
    return Boolean(row);
  },
  async begin({ sha, mode, startedAt }, oncePerCommit) {
    const row = { id: randomUUID(), sha, mode, status: "running" as const, steps: [], findings: [], startedAt };
    if (!oncePerCommit) {
      await db.insert(qaWalksTable).values(row);
      return row.id;
    }
    return db.transaction(async (tx) => {
      // A redeploy of one commit starts beside the process it replaces, so the two take turns here and one walks it.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`qa-walk:${sha}`}, 0))`);
      const [seen] = await tx.select({ id: qaWalksTable.id }).from(qaWalksTable).where(eq(qaWalksTable.sha, sha)).limit(1);
      if (seen) return null;
      await tx.insert(qaWalksTable).values(row);
      return row.id;
    });
  },
  async finish(id, verdict, at) {
    // A walk that ended can't still be running; a row left so would never settle once its process lives on.
    const status = verdict.status === "running" ? "fail" : verdict.status;
    await db.update(qaWalksTable).set({ status, steps: verdict.steps, findings: verdict.findings, finishedAt: at }).where(eq(qaWalksTable.id, id));
  },
  async settle(before, at) {
    const settled = await db
      .update(qaWalksTable)
      .set({ status: "fail", findings: [CUT_OFF], finishedAt: at })
      .where(and(eq(qaWalksTable.status, "running"), lt(qaWalksTable.startedAt, before)))
      .returning({ id: qaWalksTable.id });
    return settled.length;
  },
};

/** Mira's and Idris's Personal reports and their parent and child report, one try each: about ten and a half cents. */
export const WALK_ESTIMATE_USD = 2 * NATAL_ESTIMATE_USD + PAIR_ESTIMATE_USD;

/** Far longer than a walk takes: past it the walk is stopped, so neither a Release nor a row waits on it for good. */
export const WALK_LIMIT_MS = 60 * 60_000;

export interface WalkDeps {
  ensurePair: () => Promise<QaPair>;
  resetPair: (pair: QaPair) => Promise<void>;
  /** The walk itself, the one part that drives a browser. */
  walk: (input: { mode: QaWalkMode; signal?: AbortSignal }) => Promise<WalkVerdict>;
  storeSeed: (pair: QaPair) => Promise<number>;
  /** A line for each prompt of a Release walk's three reports that failed to render; none when every one did. */
  dry: () => Promise<string[]>;
  record: QaWalkRecord;
  now: () => Date;
  limitMs: number;
  /** True once this process has begun to stop: from then on no walk starts (qaPair.ts, banQaPairAtStop). */
  stopping: () => boolean;
}

const NO_TEXT_YET = {} as ReportInterpretation;

/**
 * The free dry render before a Release's walk spends (ADR-76): every prompt of Mira's, Idris's and their parent and
 * child report, on charts computed from the sample people's birth data (R-3.1), rendered as the engine would send it
 * and never sent. No Personal report exists before the walk writes it, so the pair renders over the charts alone, which
 * is where a template or a schema breaks. Answers a line for each prompt that failed.
 */
export async function dryRenderWalk(): Promise<string[]> {
  const dir = fixturesDir();
  if (!dir) return ["no fixtures directory beside the process"];
  const person = (id: string) => JSON.parse(readFileSync(join(dir, "sample-people", `${id}.json`), "utf8")) as ChartFixture;
  const [mira, idris] = [person("mira"), person("idris")];
  const [miraChart, idrisChart] = [chartOf(mira), chartOf(idris)];
  const rows = [
    ...(await dryNatal({ fixture: "mira", chart: miraChart, subjectName: mira.name, foundation: undefined, shapes: {} })),
    ...(await dryNatal({ fixture: "idris", chart: idrisChart, subjectName: idris.name, foundation: undefined, shapes: {} })),
    ...(await dryPair("mira-idris", {
      lens: "parent_child",
      // Mira is A and the child, Idris B and the parent, as qaPair.ts seeds the pair.
      parent: "B",
      a: { name: mira.name, birthDate: mira.birthDate, chart: miraChart, interpretation: NO_TEXT_YET },
      b: { name: idris.name, birthDate: idris.birthDate, chart: idrisChart, interpretation: NO_TEXT_YET },
    })),
  ];
  return rows.filter((r) => r.error || !r.schemaOk).map((r) => `${r.fixture} ${r.section}: ${r.error ?? "its schema is not strict"}`);
}

export function liveWalkDeps(): WalkDeps {
  return {
    ensurePair: ensureQaPair,
    resetPair: resetQaPair,
    // Loaded as a walk starts, so the browser's and Clerk's testing kits stay out of every start and test that never walks.
    walk: async (input) => (await import("./qaWalk/index.js")).runQaWalk(input),
    storeSeed: storeQaSeed,
    dry: dryRenderWalk,
    record: dbQaWalkRecord,
    now: () => new Date(),
    limitMs: WALK_LIMIT_MS,
    stopping: qaPairStopping,
  };
}

// Both walks reset the same two accounts first, so in one process they take turns: a Release's walk waits for a
// deploy's to end, and a deploy's for a Release's.
let turn: Promise<unknown> = Promise.resolve();

function inTurn<T>(task: () => Promise<T>): Promise<T> {
  const run = turn.then(task);
  turn = run.catch(() => undefined);
  return run;
}

function stopped(title: string, detail: string): WalkVerdict {
  return { status: "fail", steps: [], findings: [{ step: null, title, detail }] };
}

async function limited(deps: WalkDeps, mode: QaWalkMode): Promise<WalkVerdict> {
  const stop = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<WalkVerdict>((resolve) => {
    timer = setTimeout(() => {
      stop.abort();
      resolve(stopped("The walk took too long", `It ran for over ${Math.round(deps.limitMs / 60_000)} minutes and was stopped.`));
    }, deps.limitMs);
  });
  try {
    return await Promise.race([
      deps.walk({ mode, signal: stop.signal }).catch((err: unknown) => stopped("The walk stopped with an error", messageOf(err))),
      late,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** A Release walk's writes are its stored steps (reading 11); each that failed is a row on the Failures tab (ADR-81). */
const WRITE_KINDS = new Map<string, GenerationFailureKind>([
  ["own-report", "natal"],
  ["idris-report", "natal"],
  ["pair", "pair"],
] satisfies Array<[SeedStep, GenerationFailureKind]>);

async function recordFailedWrites(walkId: string, verdict: WalkVerdict): Promise<void> {
  for (const step of verdict.steps) {
    const kind = WRITE_KINDS.get(step.id);
    if (!kind || step.status !== "fail") continue;
    await recordChecks({
      kind, section: `qa-walk:${step.id}`, model: "qa-walk", writeId: walkId, reportId: null, attempt: 1, final: true,
      checks: [{ rule: "qa-walk-write", cls: "block", message: step.reason ?? `${step.label} failed` }],
    });
  }
}

export interface WalkRun {
  id: string;
  verdict: WalkVerdict;
  /** A Release's walk only: how many of its reports the seed kept, or why it kept none. */
  seed: { kept: number } | { error: string } | null;
}

/**
 * One walk from the pair's reset state, its row written as it starts and its verdict as it ends. A Release's walk then
 * keeps each report it finished as the seed and leaves a failure row for each write that failed; a deploy's walk stores
 * and writes nothing (ADR-315). Answers null, having started nothing, when `oncePerCommit` finds the commit walked
 * already or this process has begun to stop.
 */
export function walkOnce(mode: QaWalkMode, sha: string, deps: WalkDeps, options: { oncePerCommit?: boolean } = {}): Promise<WalkRun | null> {
  return inTurn(async () => {
    // Asked as the turn comes: a walk can wait out another's whole run, and the stop can come meanwhile.
    if (deps.stopping()) return null;
    const id = await deps.record.begin({ sha, mode, startedAt: deps.now() }, options.oncePerCommit ?? false);
    if (!id) return null;
    let pair: QaPair;
    try {
      pair = await deps.ensurePair();
      await deps.resetPair(pair);
    } catch (err) {
      const verdict = stopped("The QA accounts could not be set up", messageOf(err));
      await deps.record.finish(id, verdict, deps.now());
      return { id, verdict, seed: null };
    }
    const verdict = await limited(deps, mode);
    await deps.record.finish(id, verdict, deps.now());
    if (mode !== "release" || verdict.status === "unconfigured") return { id, verdict, seed: null };
    const seed = await deps.storeSeed(pair).then((kept) => ({ kept }), (err: unknown) => ({ error: messageOf(err) }));
    await recordFailedWrites(id, verdict);
    return { id, verdict, seed };
  });
}

export interface ReleaseDeps {
  github: GithubApi;
  lab: (input: { label: string; withPair: boolean; signal?: AbortSignal }) => Promise<ReleaseLabOutcome>;
  labStore: ReleaseLabStore;
  qa: (input: { webOrigin: string; natalRunKey: string | null; pairRunKey: string | null; signal?: AbortSignal; label: string }) => Promise<QaVerdict>;
  store: ReleaseStore;
  spentUsd: () => Promise<number>;
  env: NodeJS.ProcessEnv;
  webOrigin: string;
  mira: MiraSource;
  /** When production moves: Mira's week moves to the Monday after it. */
  now: () => Date;
  /** The staging walk (ADR-315). Without it the walk step is skipped and the preflight names no walk. */
  walk?: WalkDeps;
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
    mira: liveMira,
    now: () => new Date(),
    walk: liveWalkDeps(),
  };
}

export const STEPS: StepName[] = ["lab", "gate", "qa", "walk", "forward"];

function freshSteps(): ReleaseStep[] {
  return STEPS.map((name) => ({ name, status: "pending", detail: null, startedAt: null, endedAt: null }));
}

/**
 * The estimate the Release view shows before the button: the lab's price when the brain changed, and always the QA
 * reading's few cents and the walk's three reports.
 */
export function estimateUsd(brainChanged: boolean, pairChanged: boolean): number {
  return (brainChanged ? MATRIX_CHARTS.length * NATAL_ESTIMATE_USD + (pairChanged ? PAIR_ESTIMATE_USD : 0) : 0) + 0.05 + WALK_ESTIMATE_USD;
}

/** A failed walk names the step it failed at by the step list's label, which the Release view prints as it is. */
function walkLine(row: QaWalkRow | null): Preflight["qaWalk"] {
  if (!row) return null;
  const steps = Array.isArray(row.steps) ? (row.steps as WalkStep[]) : [];
  const failed = row.status === "fail" ? steps.find((s) => s.status === "fail") : undefined;
  return { status: row.status, step: failed?.label ?? null, at: (row.finishedAt ?? row.startedAt).toISOString() };
}

export async function preflight(deps: ReleaseDeps): Promise<Preflight> {
  const env = deps.env;
  const sha = readCommitSha(env);
  const appEnv = readAppEnv(env);
  const problems: string[] = [];
  let mainHead: string | null = null, productionSha: string | null = null, files: string[] | null = [];
  try {
    [mainHead, productionSha] = await Promise.all([deps.github.branchHead("main"), deps.github.branchHead("production")]);
    // With no production branch yet, everything is new: the full lab runs.
    files = productionSha && sha ? await deps.github.changedFiles(productionSha, sha) : [];
  } catch (err) {
    problems.push(`GitHub did not answer: ${err instanceof Error ? err.message : String(err)}`);
  }
  const diff = brainDiff(files ?? []);
  // A diff GitHub cannot list in full may hide brain files, so it runs the full lab like a first release.
  const brainChanged = !productionSha || files === null || diff.brainChanged;
  const pairChanged = !productionSha || files === null || diff.pairChanged;
  const estimate = estimateUsd(brainChanged, pairChanged);
  const spentUsd = await deps.spentUsd();
  const budget = budgetUsd(env);
  if (!sha) problems.push("this process does not know its commit (RAILWAY_GIT_COMMIT_SHA); a release ships a known commit");
  if (sha && mainHead && sha !== mainHead) problems.push(`staging runs ${sha.slice(0, 7)} but main is at ${mainHead.slice(0, 7)}; wait for the deploy`);
  if (appEnv !== "staging") problems.push(`releases start from staging only; this is ${appEnv}`);
  if (spentUsd + estimate > budget) problems.push(`the lab budget would be passed: $${spentUsd.toFixed(2)} spent plus about $${estimate.toFixed(2)} over $${budget.toFixed(2)}`);
  // The line informs and never blocks, so a walk the database can't read is no line rather than no preflight.
  const qaWalk = deps.walk
    ? await deps.walk.record.latest().then(walkLine, (err: unknown) => {
        logger.warn({ err }, "release preflight: the last QA walk could not be read");
        return null;
      })
    : null;
  return {
    sha, mainHead, productionSha, brainChanged, pairChanged, files: diff.files, estimateUsd: estimate, spentUsd, budgetUsd: budget,
    overBudget: spentUsd + estimate > budget,
    keys: { openai: Boolean(env.OPENAI_API_KEY || env.AI_INTEGRATIONS_OPENAI_API_KEY), githubReleaseToken: Boolean(env.GITHUB_RELEASE_TOKEN), browser: findChromium(env) !== null },
    env: appEnv, stagingOnly: appEnv === "staging", problems,
    qaWalk, stripeSync: lastSync()?.problem ?? null,
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
 * The newest earlier release whose lab passed, when no brain file differs between its commit and this one: its reports
 * are the ones this commit would write, so a retry after a fix outside the brain pays for no new reports (the Owner,
 * 2026-10-02). Only the newest is asked about, so a retry costs GitHub one compare at most.
 */
export async function reusableLab(deps: ReleaseDeps, row: LabRelease): Promise<{ label: string; sha: string; withPair: boolean } | null> {
  const earlier = (await deps.store.list())
    .filter((r) => r.id !== row.id && (r.steps as ReleaseStep[] | null)?.some((s) => s.name === "lab" && s.status === "passed"))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (!earlier) return null;
  const label = `release-${earlier.sha.slice(0, 7)}`;
  const fixtures = new Set((await deps.labStore.numbers(label)).map((r) => r.fixture));
  if (!MATRIX_CHARTS.every((c) => fixtures.has(c))) return null;
  const withPair = fixtures.has(RELEASE_PAIR.name);
  if (row.pairChanged && !withPair) return null;
  if (earlier.sha !== row.sha) {
    const files = await deps.github.changedFiles(earlier.sha, row.sha);
    if (files === null) return null;
    const diff = brainDiff(files);
    if (diff.brainChanged || diff.pairChanged) return null;
  }
  return { label, sha: earlier.sha, withPair };
}

interface WalkStepOutcome {
  status: "passed" | "skipped" | "failed";
  detail: string;
}

function failedAt(verdict: WalkVerdict): string {
  const step = verdict.steps.find((s) => s.status === "fail");
  if (step) return `failed at ${step.label}${step.reason ? `: ${step.reason}` : ""}`;
  const found = verdict.findings[0];
  return found ? `${found.title}. ${found.detail}` : `the walk answered ${verdict.status}`;
}

/**
 * The Release's walk (ADR-315): inside the lab budget and after the free dry render, the walk writes the three reports
 * for real, one try each, and the reports it finished become the seed. Only a pass passes; a host with no browser skips
 * the step, as it skips the QA agent's.
 */
async function releaseWalk(deps: ReleaseDeps, walk: WalkDeps, sha: string): Promise<WalkStepOutcome> {
  checkBudget(await deps.spentUsd(), WALK_ESTIMATE_USD, budgetUsd(deps.env));
  const unrendered = await walk.dry();
  if (unrendered.length) {
    return { status: "failed", detail: `nothing was written: ${unrendered.length} prompt(s) failed the free render, ${unrendered.slice(0, 3).join("; ")}` };
  }
  const run = await walkOnce("release", sha, walk);
  if (!run) return { status: "failed", detail: walk.stopping() ? "the walk did not start: the API is stopping" : "the walk did not start" };
  const { verdict, seed } = run;
  const kept = !seed ? "" : "kept" in seed ? `; the seed kept ${seed.kept} report(s)` : `; the seed was not kept: ${seed.error}`;
  if (verdict.status === "pass") return { status: "passed", detail: `${verdict.steps.filter((s) => s.status === "pass").length} steps passed${kept}` };
  if (verdict.status === "unconfigured") {
    const why = verdict.findings[0];
    return { status: "skipped", detail: why ? `${why.title}. ${why.detail}` : "no browser on this host" };
  }
  return { status: "failed", detail: `${failedAt(verdict)}${kept}` };
}

/**
 * The steps in order. A failed lab, a red gate, a QA sev-1 or a failed
 * walk stops the release as `failed` (ADR-272); a clean run fast-forwards
 * when the token is there and otherwise stops `passed`, naming MB-75. Once
 * production has moved, /sample's run and Mira's week are pushed, and each
 * one's outcome, a skip included, is a line in the forward step's detail,
 * never a failed release (readings 14 and 22).
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

  let natalRunKey: string | null = null, pairRunKey: string | null = null, labLabel = label;
  if (row.brainChanged) {
    await stepStart(deps, id, steps, "lab");
    const reused = await reusableLab(deps, row).catch(() => null);
    if (reused) {
      labLabel = reused.label;
      natalRunKey = `${MATRIX_CHARTS[0]}.${reused.label}`;
      pairRunKey = reused.withPair ? `${RELEASE_PAIR.name}.${reused.label}` : null;
      await stepDone(deps, id, steps, "lab", "passed", `reused ${reused.label}: the brain is unchanged since ${reused.sha.slice(0, 7)}, so no report was written`);
    } else try {
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
      // What production runs is the baseline: the lab of the release that shipped it, or r06 before any has. A failed
      // release's run never is, or the gate would weigh one noisy run against another.
      const shipped = row.productionSha ? `release-${row.productionSha.slice(0, 7)}` : null;
      const reference = shipped && (await deps.labStore.numbers(shipped)).length ? shipped : "r06";
      const [ref, cand] = await Promise.all([deps.labStore.numbers(reference), deps.labStore.numbers(labLabel)]);
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

  if (!deps.walk) {
    await stepDone(deps, id, steps, "walk", "skipped", "this run has no staging walk");
  } else {
    await stepStart(deps, id, steps, "walk");
    let walked: WalkStepOutcome;
    try {
      walked = await releaseWalk(deps, deps.walk, row.sha);
    } catch (err) {
      walked = { status: "failed", detail: messageOf(err) };
    }
    if (walked.status === "failed") return fail("walk", walked.detail);
    await stepDone(deps, id, steps, "walk", walked.status, walked.detail);
  }

  const token = deps.env.GITHUB_RELEASE_TOKEN;
  // The run this release's reports came from: its own lab's or the reused one's; with no lab there is no new run.
  // Mira's week moves on every forwarded release, a lab or not.
  const sample = () => pushSample({
    releaseId: id, sha: row.sha, label: row.brainChanged ? labLabel : null, token,
    github: deps.github, read: (from) => deps.labStore.sampleOutput(from), at: deps.now(), mira: deps.mira,
  });
  if (!token) {
    await stepDone(deps, id, steps, "forward", "stopped", `GITHUB_RELEASE_TOKEN is not on Railway staging (MB-75); dispatch Promote with this release id; ${await sample()}`);
    await deps.store.update(id, { status: "passed" });
    return (await deps.store.get(id))!;
  }
  await stepStart(deps, id, steps, "forward");
  try {
    await deps.github.fastForward(RELEASE_BRANCH, row.sha, token);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await stepDone(deps, id, steps, "forward", "failed", `${message}; /sample: skipped, production did not move; Mira's week: skipped, production did not move`);
    await deps.store.update(id, { status: "passed", error: message });
    return (await deps.store.get(id))!;
  }
  const moved = `production fast-forwarded to ${row.sha.slice(0, 7)}`;
  // Production's move is recorded before the sample branch's push starts, so a slow GitHub or a restart cannot hide that it moved.
  await stepDone(deps, id, steps, "forward", "passed", moved);
  await deps.store.update(id, { status: "forwarded" });
  await stepDone(deps, id, steps, "forward", "passed", `${moved}; ${await sample()}`);
  return (await deps.store.get(id))!;
}

/** On boot: a release the last process left running was cut by the restart; the record says so instead of spinning for ever. */
export async function settleInterrupted(store: ReleaseStore = dbReleaseRecordStore): Promise<void> {
  const running = await store.running();
  if (running) await store.update(running.id, { status: "stopped", error: "the process restarted while this release was running" });
}

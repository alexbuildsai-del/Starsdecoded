/**
 * Run the fixtures (B-30, ADR-290): the release lab's five matrix charts and its pair, written from the Lab page on
 * staging with no gate after them. Hard credits shut the anonymous campaigns report-lab.yml ran through the public
 * API, so the runs that measure the brain are written here, through the customer's own generators, as a Release's
 * lab writes them (ADR-86). A press is priced against LAB_BUDGET_USD before any call (ADR-77). Each report's rows
 * reach `lab_runs` as soon as it is written, every section at what its own calls cost, so the month's spend grows
 * report by report while the run goes, never from a total added at its end (R13-09's lesson); a report that fails
 * hands back no usage, so its calls stay off the sum, as a Release's do. Nothing here seeds the QA pair (ADR-315),
 * writes a `reports` row or moves a credit.
 */
import { readAppEnv } from "./appEnv.js";
import type { LabActor } from "./labGuard.js";
import { MATRIX_CHARTS } from "./labRules.js";
import { budgetUsd, checkBudget, dbStore, monthStart } from "./labReplay.js";
import {
  NATAL_ESTIMATE_USD, PAIR_ESTIMATE_USD, RELEASE_PAIR, dbReleaseStore, liveReleaseEngine, runReleaseLab, sampleRunKey,
  type ReleaseLabEngine, type ReleaseLabOutcome, type ReleaseLabStore,
} from "./releaseLab.js";
import { logger } from "./logger.js";

/** One press on production's writers, priced as the release lab prices itself: the five charts and their pair, about 20 ¢. */
export const FIXTURES_ESTIMATE_USD = MATRIX_CHARTS.length * NATAL_ESTIMATE_USD + PAIR_ESTIMATE_USD;

/** A run key is `<fixture>.<label>` and holds one row a section, so every press needs a label of its own: its start, to the second. */
export function fixturesLabel(at: Date): string {
  const iso = at.toISOString();
  return `fixtures-${iso.slice(0, 10)}-${iso.slice(11, 19).replace(/:/g, "")}`;
}

export interface FixturesRunning {
  label: string;
  startedAt: string;
  /** The run keys whose rows are already in `lab_runs`, in the order they landed. */
  landed: string[];
}

export interface FixturesOutcome extends ReleaseLabOutcome {
  startedAt: string;
  endedAt: string;
}

export interface FixturesState {
  running: FixturesRunning | null;
  last: FixturesOutcome | null;
}

export interface FixturesDeps {
  engine: ReleaseLabEngine;
  store: ReleaseLabStore;
  spentUsd: () => Promise<number>;
  env: NodeJS.ProcessEnv;
  now: () => Date;
  state: FixturesState;
}

// One process serves staging's API, so memory holds the run going and the last one. A restart ends the run; the
// reports it finished are already in lab_runs, and nothing starts again on its own.
const liveState: FixturesState = { running: null, last: null };

export function liveFixturesDeps(env: NodeJS.ProcessEnv = process.env): FixturesDeps {
  return { engine: liveReleaseEngine, store: dbReleaseStore, spentUsd: () => dbStore.spentUsd(monthStart()), env, now: () => new Date(), state: liveState };
}

export class FixturesRefused extends Error {
  constructor(message: string, public readonly status = 409) {
    super(message);
    this.name = "FixturesRefused";
  }
}

export interface FixturesStarted {
  label: string;
  charts: string[];
  pair: string;
  estimateUsd: number;
  spentUsd: number;
  budgetUsd: number;
  /** Settles once every report has landed or failed, and never rejects; the route answers long before it. */
  done: Promise<FixturesOutcome>;
}

/**
 * The release lab's rows as the fixtures keep them. A chart is a lab run, as the campaigns' imported runs were, so
 * Compare, the dry, the spot and the sessions take its label as a base. The pair keeps the release lab's source:
 * every reader of a `lab` row takes it for a natal run with its chart. /sample's whole copy is the Release's alone
 * (ADR-247).
 */
function fixturesStore(inner: ReleaseLabStore, running: FixturesRunning): ReleaseLabStore {
  return {
    ...inner,
    async insert(rows) {
      const kept = rows
        .filter((r) => r.runKey !== sampleRunKey(running.label))
        .map((r) => (r.fixture === RELEASE_PAIR.name ? r : { ...r, source: "lab" }));
      await inner.insert(kept);
      if (kept[0]) running.landed.push(kept[0].runKey);
    },
  };
}

/**
 * One press of Run the fixtures: the matrix only, whatever the request holds. Refused for anyone but the admin, off
 * staging, while a run is going, and when the month's spend plus the estimate would pass the budget, each before any
 * call; then the five charts and their pair are written in the background, one report after another.
 */
export async function runFixtures(actor: LabActor | null, deps: FixturesDeps = liveFixturesDeps()): Promise<FixturesStarted> {
  // Only the admin's press spends here: a deploy, a start or a job has no actor (ADR-315).
  if (actor?.kind !== "admin") throw new FixturesRefused("Only the admin can run the fixtures.", 403);
  const env = readAppEnv(deps.env);
  if (env !== "staging") throw new FixturesRefused(`The fixtures run on staging only. This is ${env}.`);
  const { state } = deps;
  if (state.running) throw new FixturesRefused(`A fixtures run is still going: ${state.running.label}.`);
  const at = deps.now();
  const running: FixturesRunning = { label: fixturesLabel(at), startedAt: at.toISOString(), landed: [] };
  // Held before the spend is read, so a second press that lands while this one is priced is refused too.
  state.running = running;
  let spentUsd: number;
  let budget: number;
  try {
    spentUsd = await deps.spentUsd();
    budget = budgetUsd(deps.env);
    checkBudget(spentUsd, FIXTURES_ESTIMATE_USD, budget);
  } catch (err) {
    state.running = null;
    throw err;
  }
  logger.info({ label: running.label, estimateUsd: FIXTURES_ESTIMATE_USD, spentUsd }, "fixtures started");
  const done = runReleaseLab({ label: running.label, withPair: true, engine: deps.engine, store: fixturesStore(deps.store, running), charts: MATRIX_CHARTS })
    .catch((err): ReleaseLabOutcome => ({
      label: running.label, natalRunKeys: [], pairRunKey: null, costUsd: 0,
      failed: [{ fixture: "*", error: err instanceof Error ? err.message : String(err) }],
    }))
    .then((outcome) => {
      const last: FixturesOutcome = { ...outcome, startedAt: running.startedAt, endedAt: deps.now().toISOString() };
      state.last = last;
      state.running = null;
      logger.info({ label: last.label, costUsd: last.costUsd, landed: running.landed.length, failed: last.failed.map((f) => f.fixture) }, "fixtures done");
      return last;
    });
  return { label: running.label, charts: [...MATRIX_CHARTS], pair: RELEASE_PAIR.name, estimateUsd: FIXTURES_ESTIMATE_USD, spentUsd, budgetUsd: budget, done };
}

export interface FixturesStatus {
  charts: string[];
  pair: string;
  estimateUsd: number;
  spentUsd: number;
  budgetUsd: number;
  overBudget: boolean;
  env: string;
  stagingOnly: boolean;
  running: FixturesRunning | null;
  last: FixturesOutcome | null;
}

/** What the Runs view shows before the press: the price against the month's spend, and the run going or the last one. */
export async function fixturesStatus(deps: FixturesDeps = liveFixturesDeps()): Promise<FixturesStatus> {
  const spentUsd = await deps.spentUsd();
  const budget = budgetUsd(deps.env);
  const env = readAppEnv(deps.env);
  const { running, last } = deps.state;
  return {
    charts: [...MATRIX_CHARTS], pair: RELEASE_PAIR.name, estimateUsd: FIXTURES_ESTIMATE_USD, spentUsd, budgetUsd: budget,
    overBudget: spentUsd + FIXTURES_ESTIMATE_USD > budget, env, stagingOnly: env === "staging",
    running: running ? { ...running, landed: [...running.landed] } : null, last,
  };
}

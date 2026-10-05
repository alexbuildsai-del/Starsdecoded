/**
 * Run the fixtures on a stub engine (B-30): priced before any call, refused off staging and for anyone but the admin,
 * one press at a time, the release lab's five charts and their pair and nothing else, each report's rows stored with
 * its calls' cost the moment it lands. The model is a fake that fails if anything calls it, so no test here spends.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { FIXTURES_ESTIMATE_USD, FixturesRefused, fixturesLabel, fixturesStatus, runFixtures } = await import("./labFixtures.js");
const { BudgetError } = await import("./labReplay.js");
const { MATRIX_CHARTS } = await import("./labRules.js");
const { NATAL_ESTIMATE_USD, PAIR_ESTIMATE_USD, RELEASE_PAIR } = await import("./releaseLab.js");
type FixturesDeps = import("./labFixtures.js").FixturesDeps;
type InsertLabRun = import("@workspace/db").InsertLabRun;
type ReleaseLabEngine = import("./releaseLab.js").ReleaseLabEngine;

const canned = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curie = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
canned.restore();
// From here the model answers nothing: a call that got past the stub engine fails, and `model.calls` names it.
const model = installFakeModel({});

const [foundationUsage, sectionUsage] = curie.meta.usage.sections;
const pairReport = {
  meta: { lens: "partners", usage: { model: "mixed", costUsd: 0.04, sections: [{ ...foundationUsage, section: "pair:foundation" }, { ...sectionUsage, section: "pair:twoCharts" }] } },
  foundation: { thesis: "Two slow deciders." },
  twoCharts: { headline: "You both decide late." },
  links: { links: [] },
};

const admin = { kind: "admin", userId: "user_admin" } as const;

function deps(over: Partial<FixturesDeps> = {}) {
  const rows: InsertLabRun[] = [];
  const batches: InsertLabRun[][] = [];
  const written: string[] = [];
  const spendReads: number[] = [];
  const engine: ReleaseLabEngine = {
    natal: async (_chart, name) => { written.push(name); return curie; },
    pair: async (input) => { written.push(`${input.a.name} & ${input.b.name} (${input.lens})`); return pairReport; },
  };
  const d: FixturesDeps = {
    engine,
    store: { insert: async (r) => { batches.push(r); rows.push(...r); }, numbers: async () => [], sampleOutput: async () => null },
    spentUsd: async () => { spendReads.push(1); return 1; },
    env: { APP_ENV: "staging", LAB_BUDGET_USD: "15" },
    now: () => new Date("2026-10-05T14:32:07.481Z"),
    state: { running: null, last: null },
    ...over,
  };
  return { d, rows, batches, written, spendReads };
}

test("a press is priced as the release lab prices its five charts and their pair: about 20 cents on production's writers", () => {
  assert.equal(FIXTURES_ESTIMATE_USD, MATRIX_CHARTS.length * NATAL_ESTIMATE_USD + PAIR_ESTIMATE_USD);
  assert.equal(Math.round(FIXTURES_ESTIMATE_USD * 100), 20);
  assert.equal(fixturesLabel(new Date("2026-10-05T14:32:07.481Z")), "fixtures-2026-10-05-143207", "a label of its own, to the second");
});

test("refused before the spend is read or a report is written: for anyone but the admin, and anywhere but staging", async () => {
  for (const [actor, env, status, line] of [
    [null, { APP_ENV: "staging" }, 403, /Only the admin/],
    [admin, { APP_ENV: "production" }, 409, /staging only\. This is production/],
    [admin, {}, 409, /staging only\. This is development/],
  ] as const) {
    const { d, rows, written, spendReads } = deps({ env });
    await assert.rejects(runFixtures(actor, d), (err: unknown) => err instanceof FixturesRefused && err.status === status && line.test(err.message));
    assert.deepEqual([spendReads.length, written.length, rows.length, d.state.running], [0, 0, 0, null]);
  }
  const railway = deps({ env: { RAILWAY_ENVIRONMENT_NAME: "staging" } });
  await (await runFixtures(admin, railway.d)).done;
  assert.equal(railway.written.length, MATRIX_CHARTS.length + 1, "staging named by Railway alone is staging");
});

test("priced first: a press that would pass LAB_BUDGET_USD is refused before any call, and frees the button for the next", async () => {
  const { d, rows, written } = deps({ spentUsd: async () => 14.9 });
  await assert.rejects(runFixtures(admin, d), (err: unknown) => err instanceof BudgetError && err.estimateUsd === FIXTURES_ESTIMATE_USD && err.budgetUsd === 15);
  assert.deepEqual([written.length, rows.length, d.state.running], [0, 0, null]);
  const status = await fixturesStatus(d);
  assert.deepEqual([status.overBudget, status.running, status.last], [true, null, null]);

  d.spentUsd = async () => 15 - FIXTURES_ESTIMATE_USD;
  const started = await runFixtures(admin, d);
  assert.deepEqual([started.spentUsd + started.estimateUsd, started.budgetUsd], [15, 15], "up to the budget itself is allowed");
  await started.done;
});

test("the matrix only: the five charts in order, then their pair, each report's rows stored with its calls' cost as it lands", async () => {
  const { d, rows, batches, written } = deps();
  const storedBefore: number[] = [];
  const stub = d.engine;
  d.engine = { natal: async (chart, name) => { storedBefore.push(rows.length); return stub.natal(chart, name); }, pair: stub.pair };
  const started = await runFixtures(admin, d);
  assert.equal(started.label, "fixtures-2026-10-05-143207");
  assert.deepEqual([started.charts, started.pair, started.estimateUsd], [[...MATRIX_CHARTS], RELEASE_PAIR.name, FIXTURES_ESTIMATE_USD]);
  const out = await started.done;

  assert.deepEqual(batches.map((b) => b[0].fixture), [...MATRIX_CHARTS, RELEASE_PAIR.name], "one batch a report, the pair last");
  assert.deepEqual(storedBefore, [0, 12, 24, 36, 48], "each chart is written after the one before it is already stored");
  assert.equal(written.at(-1), "Marie Curie & Audrey Hepburn (partners)");
  assert.ok(rows.every((r) => r.label === started.label && r.runKey === `${r.fixture}.${started.label}`), "no sample row and no other key");
  assert.ok(!rows.some((r) => r.section === "sample" || /qa-seed/.test(r.runKey)), "no /sample copy and no QA pair seed");

  const natal = rows.filter((r) => r.fixture !== RELEASE_PAIR.name);
  assert.equal(natal.length, MATRIX_CHARTS.length * 12);
  assert.ok(natal.every((r) => r.source === "lab"), "a chart is a lab run, a base for Compare, the dry, the spot and the sessions");
  assert.ok(natal.every((r) => typeof r.costUsd === "number" && r.costUsd > 0), "every section carries what its calls cost");
  const pair = rows.filter((r) => r.fixture === RELEASE_PAIR.name);
  assert.deepEqual(pair.map((r) => [r.section, r.source, typeof r.costUsd]), [["foundation", "release", "number"], ["twoCharts", "release", "number"], ["links", "release", "object"]]);
  assert.ok(natal.filter((r) => r.section === "foundation").every((r) => r.chart && r.subjectName), "each foundation row carries its chart and name");

  assert.deepEqual(out.natalRunKeys, MATRIX_CHARTS.map((c) => `${c}.${started.label}`));
  assert.equal(out.pairRunKey, `${RELEASE_PAIR.name}.${started.label}`);
  assert.equal(out.costUsd.toFixed(6), (MATRIX_CHARTS.length * (curie.meta.usage.costUsd ?? 0) + 0.04).toFixed(6));
  assert.deepEqual(out.failed, []);
  const status = await fixturesStatus(d);
  assert.deepEqual([status.running, status.last?.label, status.stagingOnly], [null, started.label, true]);
  assert.equal(model.calls.length, 0, "the stub engine wrote every report");
});

test("one press at a time: a second press, at once or while the first writes, is refused, and the next starts after it ends", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const { d, batches } = deps();
  const stub = d.engine;
  d.engine = { natal: async (chart, name) => { await gate; return stub.natal(chart, name); }, pair: stub.pair };

  const [first, second] = await Promise.allSettled([runFixtures(admin, d), runFixtures(admin, d)]);
  assert.equal(first.status, "fulfilled");
  assert.ok(second.status === "rejected" && second.reason instanceof FixturesRefused && /still going: fixtures-2026-10-05-143207\.$/.test(second.reason.message));
  await assert.rejects(runFixtures(admin, d), FixturesRefused);
  const going = await fixturesStatus(d);
  assert.deepEqual([going.running?.label, going.running?.landed], ["fixtures-2026-10-05-143207", []]);

  release();
  const started = (first as PromiseFulfilledResult<Awaited<ReturnType<typeof runFixtures>>>).value;
  const out = await started.done;
  assert.equal(batches.length, MATRIX_CHARTS.length + 1, "the refused presses wrote nothing");
  assert.deepEqual((await fixturesStatus(d)).last?.natalRunKeys, out.natalRunKeys);

  d.now = () => new Date("2026-10-05T14:40:00Z");
  const next = await runFixtures(admin, d);
  assert.equal(next.label, "fixtures-2026-10-05-144000");
  await next.done;
});

test("a chart that fails is named in the last run while the rest land, and the button is free again", async () => {
  const { d, batches } = deps();
  const stub = d.engine;
  d.engine = { natal: async (chart, name) => { if (name === "Marie Curie") throw new Error("natal:career: failed validation after 3 attempts: x"); return stub.natal(chart, name); }, pair: stub.pair };
  const out = await (await runFixtures(admin, d)).done;
  assert.deepEqual(out.failed.map((f) => f.fixture), ["marie-curie", RELEASE_PAIR.name], "the pair needs both of its charts");
  assert.equal(batches.length, MATRIX_CHARTS.length - 1);
  assert.equal(d.state.running, null);
  assert.deepEqual((await fixturesStatus(d)).last?.failed, out.failed);
});

test("the press sits behind the lab guard, and the admin's press off staging is refused before the spend is read", async (t) => {
  const saved = { ADMIN_USER_ID: process.env.ADMIN_USER_ID, APP_ENV: process.env.APP_ENV, RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME };
  const { default: express } = await import("express");
  const { default: adminLab } = await import("../routes/adminLab.js");
  const app = express();
  app.use((req, _res, next) => { req.userId = req.header("x-user") || null; next(); });
  app.use(express.json());
  app.use("/api", adminLab);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const press = async (user: string) => {
    const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/lab/fixtures`, {
      method: "POST", headers: { "content-type": "application/json", "x-user": user }, body: "{}",
    });
    return { status: res.status, body: (await res.json()) as { error: string; message: string } };
  };

  delete process.env.ADMIN_USER_ID;
  const disabled = await press("user_admin");
  assert.deepEqual([disabled.status, disabled.body.error], [503, "admin_disabled"]);
  process.env.ADMIN_USER_ID = "user_admin";
  delete process.env.APP_ENV;
  delete process.env.RAILWAY_ENVIRONMENT_NAME;
  const stranger = await press("user_someone");
  assert.deepEqual([stranger.status, stranger.body.error], [403, "forbidden"]);
  const local = await press("user_admin");
  assert.deepEqual([local.status, local.body.error], [409, "fixtures_refused"]);
  assert.match(local.body.message, /staging only\. This is development/);
  assert.equal(model.calls.length, 0);
});

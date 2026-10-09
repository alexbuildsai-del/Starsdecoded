/**
 * The staging walk after a deploy, and its public verdict (ADR-279, 315; readings 11, 17), with a model client that
 * fails if called: nothing on a deploy's path writes a report, so it never is. Off staging nothing waits, walks or
 * writes, and the verdict answers 404. On a scratch Postgres named by WALK_DATABASE_URL: once the web serves the
 * commit, the pair is made ready, reset and walked in deploy mode, one row a commit; a walk a restart cut off is
 * settled at the next start; a site that never shows the commit is a failed row; nothing rejects; GET /api/qa/latest
 * answers the newest verdict ahead of the session, with what is private masked; and the walk itself, run under the
 * trigger, resets nothing, so a deploy's walk resets the pair once (B-39). The walk's pictures (ADR-360): kept one a
 * step in place of the last walk's, listed in the verdict's `shots`, and served by GET /api/qa/latest/shots/{step} as
 * image/jpeg on staging alone, by a route that writes nothing and logs the step alone. Without a database those skip,
 * saying why. The pair and the browser are stand-ins at the walk's seams: qaPair.test.ts makes and resets the real pair
 * on the same database at the same time, where one account alone holds each part, and the walk's own tests drive its
 * page.
 */
import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere, so a query past a refusal fails loudly.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
// Nothing listens there, so even a call that slipped past the stub below would reach no one.
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV = "test";
// The app builds Clerk's middleware behind the route; a key pair that names no instance lets it load.
process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from("clerk.example.com$").toString("base64")}`;
process.env.CLERK_SECRET_KEY = "test-secret-never-sent";
process.env.CLERK_TELEMETRY_DISABLED = "1";
delete process.env.RAILWAY_ENVIRONMENT_NAME;
process.env.APP_ENV = "staging";

const { openai } = await import("@workspace/integrations-openai-ai-server");
const modelCalls: unknown[] = [];
(openai.chat.completions as unknown as { create: unknown }).create = async (req: unknown) => {
  modelCalls.push(req);
  throw new Error("the staging walk called the model");
};

const { qaAfterDeploy } = await import("./qa.js");
const { CUT_OFF, dbQaWalkRecord, walkOnce } = await import("../lib/release.js");
const { GIVE_UP_MS, untilWebServes } = await import("../lib/indexNow.js");
const { logger } = await import("../lib/logger.js");
const { default: app } = await import("../app.js");
const { pool } = await import("@workspace/db");

type WalkDeps = import("../lib/release.js").WalkDeps;
type WalkVerdict = import("../lib/release.js").WalkVerdict;
type QaWalkRecord = import("../lib/release.js").QaWalkRecord;
type QaDeployDeps = import("./qa.js").QaDeployDeps;
type WalkStripe = import("../lib/qaWalk/steps.js").WalkStripe;

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the walk's rows are written and read on a scratch Postgres";

const q = (text: string, params: unknown[] = []) => pool.query(text, params);
const sha = () => randomBytes(20).toString("hex");
const short = (commit: string) => commit.slice(0, 7);
const WEB = "https://staging.test";
const staging = (commit: string): NodeJS.ProcessEnv => ({ APP_ENV: "staging", RAILWAY_GIT_COMMIT_SHA: commit, PUBLIC_APP_URL: WEB });
const quiet = () => undefined;

// Only this file writes qa_walks and qa_shots, so it starts and ends with both empty.
if (SCRATCH) {
  before(async () => {
    await q("delete from qa_walks");
    await q("delete from qa_shots");
  });
  after(async () => {
    await q("delete from qa_walks");
    await q("delete from qa_shots");
    await pool.end();
  });
}

const PAIR = {
  mira: { userId: "user_standin_mira", email: "qa-a+clerk_test@mystarsdecoded.com", name: "Mira Costa" },
  idris: { userId: "user_standin_idris", email: "qa-b+clerk_test@mystarsdecoded.com", name: "Idris Costa" },
};

/** A first deploy's walk: the live steps pass, and the seed's steps wait for the first Release (reading 11). */
const UNSEEDED: WalkVerdict = {
  status: "unseeded",
  steps: [
    { id: "sign-in", label: "Mira arrives signed out, then signs in", status: "pass", ms: 900 },
    { id: "own-report", label: "Mira writes her Personal report; a credit is taken before it's written", status: "not_run", reason: "waiting for the first Release to write it", ms: 0 },
  ],
  findings: [],
};

/** The walk's seams as stand-ins that say what was asked of them, over the real record. */
function standIns(over: Partial<WalkDeps> = {}) {
  const calls: string[] = [];
  const walk: WalkDeps = {
    ensurePair: async () => {
      calls.push("ensure");
      return PAIR;
    },
    resetPair: async (pair) => {
      calls.push(`reset ${pair.mira.name}, ${pair.idris.name}`);
    },
    walk: async ({ mode }) => {
      calls.push(`walk ${mode}`);
      return UNSEEDED;
    },
    storeSeed: async () => {
      calls.push("store the seed");
      return 0;
    },
    dry: async () => {
      calls.push("dry render");
      return [];
    },
    record: dbQaWalkRecord,
    now: () => new Date(),
    limitMs: 60_000,
    stopping: () => false,
    ...over,
  };
  return { calls, walk };
}

/** The real wait, over a stand-in site whose home page names `serving`, on a clock that moves only when it sleeps. */
function webServing(serving: string, fetched: string[] = []): QaDeployDeps["webServes"] {
  let at = 0;
  return (origin, commit) =>
    untilWebServes(origin, commit, {
      fetcher: (async (url: string | URL | Request) => {
        fetched.push(String(url));
        return new Response(`<!doctype html><html><head><meta name="commit" content="${serving}" /></head></html>`, { status: 200 });
      }) as typeof fetch,
      sleep: async (ms) => {
        at += ms;
      },
      now: () => at,
    });
}

const down = async (): Promise<never> => {
  throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
};
const downRecord: QaWalkRecord = { latest: down, walked: down, begin: down, finish: down, settle: down };

const rowsOf = async (commit: string) =>
  (await q("select id, sha, mode, status, steps, findings, started_at, finished_at from qa_walks where sha = $1 order by started_at", [commit])).rows;

async function serve() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base, close };
}

test("off staging nothing waits, walks or writes, and the verdict and its pictures answer 404 to everyone with no cookie", async (t) => {
  const elsewhere: NodeJS.ProcessEnv[] = [{ APP_ENV: "production" }, { APP_ENV: "production", RAILWAY_ENVIRONMENT_NAME: "staging" }, { APP_ENV: "development" }, {}];
  for (const env of elsewhere) {
    const fetched: string[] = [];
    const lines: string[] = [];
    const { calls, walk } = standIns({ record: downRecord });
    const outcome = await qaAfterDeploy({ env: { ...env, RAILWAY_GIT_COMMIT_SHA: sha() }, walk, webServes: webServing(sha(), fetched), log: (_level, line) => lines.push(line) });
    assert.equal(outcome, null, JSON.stringify(env));
    assert.deepEqual({ calls, fetched, lines }, { calls: [], fetched: [], lines: [] }, JSON.stringify(env));
  }

  const { base, close } = await serve();
  t.after(close);
  try {
    for (const appEnv of ["production", "development"]) {
      process.env.APP_ENV = appEnv;
      // Both answer before a row is read, so this holds with no database at all.
      for (const path of ["/api/qa/latest", "/api/qa/latest/shots/sign-in"]) {
        const res = await fetch(`${base}${path}`);
        assert.equal(res.status, 404, `${appEnv} ${path}`);
        assert.deepEqual(await res.json(), { error: "not_found" });
        assert.equal(res.headers.get("set-cookie"), null, `${appEnv} ${path}`);
      }
    }
  } finally {
    process.env.APP_ENV = "staging";
  }
  assert.deepEqual(modelCalls, []);
});

test("a record that is down is one warn line, never a rejection, and nothing walks", async () => {
  const lines: Array<[string, string]> = [];
  const { calls, walk } = standIns({ record: downRecord });
  const outcome = await qaAfterDeploy({ env: staging(sha()), walk, webServes: webServing(sha()), log: (level, line) => lines.push([level, line]) });
  assert.deepEqual(outcome, { kind: "failed", reason: "connect ECONNREFUSED 127.0.0.1:5432" });
  assert.deepEqual(lines, [["warn", "QA walk: not walked, connect ECONNREFUSED 127.0.0.1:5432"]]);
  assert.deepEqual(calls, []);
});

test("a process that has begun to stop starts no walk, before the wait for the web, after it, or as a waiting walk's turn comes: nothing is made ready, reset or walked, and no row begins", async () => {
  const STOPPED = { kind: "skipped", reason: "this process is stopping" };

  // Stopping from the first: nothing is read or waited on, so even a record that is down is never asked.
  const fetched: string[] = [];
  const lines: Array<[string, string]> = [];
  const early = standIns({ record: downRecord, stopping: () => true });
  const commit = sha();
  assert.deepEqual(await qaAfterDeploy({ env: staging(commit), walk: early.walk, webServes: webServing(commit, fetched), log: (level, line) => lines.push([level, line]) }), STOPPED);
  assert.deepEqual({ calls: early.calls, fetched, lines }, { calls: [], fetched: [], lines: [["info", "QA walk: skipped, this process is stopping"]] });

  // The stop comes while the web is waited for: no row begins, not even a site that never showed the commit leaves one.
  let stopping = false;
  const begun: string[] = [];
  const record: QaWalkRecord = {
    ...downRecord,
    settle: async () => 0,
    walked: async () => false,
    begin: async ({ sha: walked }) => {
      begun.push(walked);
      return `walk-${begun.length}`;
    },
    finish: async () => undefined,
  };
  const waited = standIns({ record, stopping: () => stopping });
  for (const live of [true, false]) {
    stopping = false;
    const during = sha();
    const stopsWhileWaiting: QaDeployDeps["webServes"] = async () => {
      stopping = true;
      return { live, seen: live ? during : null };
    };
    assert.deepEqual(await qaAfterDeploy({ env: staging(during), walk: waited.walk, webServes: stopsWhileWaiting, log: quiet }), STOPPED, `live: ${live}`);
  }
  assert.deepEqual({ calls: waited.calls, begun }, { calls: [], begun: [] });

  // A deploy's walk waiting its turn behind another when the stop comes starts nothing once its turn comes.
  stopping = false;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = standIns({
    record,
    stopping: () => stopping,
    walk: async () => {
      await held;
      return UNSEEDED;
    },
  });
  const firstCommit = sha();
  const firstRun = walkOnce("deploy", firstCommit, first.walk, { oncePerCommit: true });
  const second = standIns({ record, stopping: () => stopping });
  const secondCommit = sha();
  const waiting = qaAfterDeploy({ env: staging(secondCommit), walk: second.walk, webServes: async () => ({ live: true, seen: secondCommit }), log: quiet });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(second.calls, [], "it waits its turn");
  stopping = true;
  release();
  assert.deepEqual(await waiting, STOPPED);
  assert.equal((await firstRun)?.verdict.status, "unseeded");
  assert.deepEqual(second.calls, [], "nothing made ready, reset or walked");
  assert.deepEqual(begun, [firstCommit], "and no row but the first walk's");
  assert.deepEqual(modelCalls, []);
});

test("after a deploy, once the web serves the commit, the pair is made ready, reset and walked in deploy mode, one row a commit, and the model is never called", { skip: NO_DB }, async () => {
  const commit = sha();
  const fetched: string[] = [];
  const lines: string[] = [];
  const signals: AbortSignal[] = [];
  const { calls, walk } = standIns({
    walk: async ({ mode, signal }) => {
      calls.push(`walk ${mode}`);
      if (signal) signals.push(signal);
      return UNSEEDED;
    },
  });
  const deps: Partial<QaDeployDeps> = { env: staging(commit), walk, webServes: webServing(commit, fetched), log: (_level, line) => lines.push(line) };

  const outcome = await qaAfterDeploy(deps);
  assert.deepEqual(outcome, { kind: "walked", commit, status: "unseeded" });
  assert.deepEqual(calls, ["ensure", "reset Mira Costa, Idris Costa", "walk deploy"], "a deploy's walk renders, writes and stores nothing");
  assert.deepEqual(fetched, [`${WEB}/`], "staging's home page, read until it names the commit");
  assert.equal(signals.length, 1);
  assert.equal(signals[0].aborted, false);
  const [row, ...more] = await rowsOf(commit);
  assert.equal(more.length, 0);
  assert.deepEqual(
    { mode: row.mode, status: row.status, steps: row.steps, findings: row.findings },
    { mode: "deploy", status: "unseeded", steps: UNSEEDED.steps, findings: [] },
  );
  assert.ok(row.finished_at >= row.started_at);
  assert.deepEqual(lines, [`QA walk: unseeded for ${short(commit)}`]);

  const again = await qaAfterDeploy(deps);
  assert.deepEqual(again, { kind: "skipped", reason: `${short(commit)} has its walk already` });
  assert.equal(calls.length, 3, "a restart of the same commit walks nothing");
  assert.equal(fetched.length, 1, "and waits on nothing");
  assert.equal((await rowsOf(commit)).length, 1);
  assert.deepEqual(modelCalls, []);
});

test("a deploy's walk resets the pair once: the trigger puts it back at the walk's start, and the walk itself only holds it", { skip: NO_DB }, async () => {
  const { runQaWalk } = await import("../lib/qaWalk/index.js");
  const commit = sha();
  const never = async (): Promise<never> => {
    throw new Error("Stripe is never reached once the browser fails");
  };
  const noStripe: WalkStripe = { makeClock: never, makeCustomer: never, advance: never, deleteClock: never, refund: never, subscriptionOf: never, cancelAtPeriodEnd: never };
  const { calls, walk } = standIns({
    walk: (input) =>
      runQaWalk({
        ...input,
        deps: {
          env: { APP_ENV: "staging" },
          browser: {
            open: async () => {
              calls.push("walk: browser");
              throw new Error("no browser in this test");
            },
          },
          stripe: noStripe,
          pair: {
            ensure: async () => {
              calls.push("walk: ensure");
              return PAIR;
            },
            open: async () => {
              calls.push("walk: open");
              return {
                ticket: never,
                wrote: () => undefined,
                close: async () => {
                  calls.push("walk: close");
                },
              };
            },
            place: async () => null,
          },
        },
      }),
  });

  const outcome = await qaAfterDeploy({ env: staging(commit), walk, webServes: webServing(commit), log: quiet });
  assert.deepEqual(outcome, { kind: "walked", commit, status: "fail" });
  assert.deepEqual(calls, ["ensure", "reset Mira Costa, Idris Costa", "walk: ensure", "walk: open", "walk: browser", "walk: close"]);
  const [row] = await rowsOf(commit);
  assert.match(row.steps.find((step: { id: string }) => step.id === "sign-in")?.reason ?? "", /no browser in this test/);
  assert.deepEqual(modelCalls, []);
});

test("a walk a restart cut off is settled at the next start and its commit not walked again; a walk this process began runs on", { skip: NO_DB }, async () => {
  const bootedAt = new Date();
  const cut = sha();
  await dbQaWalkRecord.begin({ sha: cut, mode: "deploy", startedAt: new Date(bootedAt.getTime() - 5 * 60_000) }, false);
  const ours = sha();
  const oursId = await dbQaWalkRecord.begin({ sha: ours, mode: "release", startedAt: new Date(bootedAt.getTime() + 1) }, false);
  const lines: string[] = [];
  const { calls, walk } = standIns();

  const outcome = await qaAfterDeploy({ env: staging(cut), walk, webServes: webServing(cut), bootedAt, log: (_level, line) => lines.push(line) });
  assert.deepEqual(outcome, { kind: "skipped", reason: `${short(cut)} has its walk already` });
  assert.deepEqual(calls, []);
  const [settled, ...more] = await rowsOf(cut);
  assert.equal(more.length, 0);
  assert.equal(settled.status, "fail");
  assert.deepEqual(settled.findings, [CUT_OFF]);
  assert.ok(settled.finished_at instanceof Date);
  assert.equal((await rowsOf(ours))[0].status, "running", "a walk begun since this process started is its own");
  assert.deepEqual(lines, ["QA walk: 1 walk(s) a restart cut off now read failed", `QA walk: skipped, ${short(cut)} has its walk already`]);
  await dbQaWalkRecord.finish(oursId!, UNSEEDED, new Date());
  assert.deepEqual(modelCalls, []);
});

test("a site that never shows the commit is a failed row after twenty minutes, and nothing walks", { skip: NO_DB }, async () => {
  const commit = sha();
  const older = sha();
  const fetched: string[] = [];
  const { calls, walk } = standIns();

  const outcome = await qaAfterDeploy({ env: staging(commit), walk, webServes: webServing(older, fetched), log: quiet });
  assert.deepEqual(outcome, { kind: "gave_up", commit, seen: older });
  assert.deepEqual(calls, []);
  assert.ok(fetched.length > 1, "it kept asking while the twenty minutes ran");
  const [row, ...more] = await rowsOf(commit);
  assert.equal(more.length, 0);
  assert.deepEqual(
    { mode: row.mode, status: row.status, steps: row.steps, findings: row.findings },
    {
      mode: "deploy",
      status: "fail",
      steps: [],
      findings: [{ step: null, title: "The site never showed this commit", detail: `After ${GIVE_UP_MS / 60_000} minutes the site still showed ${short(older)}.` }],
    },
  );
});

test("nothing rejects: accounts that can't be set up, a walk that throws and one that runs past its limit each leave a failed row", { skip: NO_DB }, async () => {
  let aborted = false;
  const cases: Array<[string, Partial<WalkDeps>, string, RegExp]> = [
    ["setup", { ensurePair: async () => { throw new Error("Clerk answered 503"); } }, "The QA accounts could not be set up", /^Clerk answered 503$/],
    ["throws", { walk: async () => { throw new Error("the browser closed"); } }, "The walk stopped with an error", /^the browser closed$/],
    [
      "hangs",
      {
        walk: ({ signal }) => {
          signal?.addEventListener("abort", () => { aborted = true; });
          return new Promise<never>(() => undefined);
        },
        limitMs: 20,
      },
      "The walk took too long",
      /^It ran for over \d+ minutes and was stopped\.$/,
    ],
  ];
  for (const [what, over, title, detail] of cases) {
    const commit = sha();
    const { walk } = standIns(over);
    const outcome = await qaAfterDeploy({ env: staging(commit), walk, webServes: webServing(commit), log: quiet });
    assert.deepEqual(outcome, { kind: "walked", commit, status: "fail" }, what);
    const [row] = await rowsOf(commit);
    assert.deepEqual({ status: row.status, steps: row.steps }, { status: "fail", steps: [] }, what);
    assert.equal(row.findings.length, 1, what);
    assert.deepEqual([row.findings[0].step, row.findings[0].title], [null, title], what);
    assert.match(row.findings[0].detail, detail, what);
  }
  assert.equal(aborted, true, "the walk past its limit is told to stop");
  assert.deepEqual(modelCalls, []);
});

test("GET /api/qa/latest answers the newest verdict ahead of the session, its own fields only, with what is private masked", { skip: NO_DB }, async (t) => {
  const { base, close } = await serve();
  t.after(close);
  const commit = sha();
  const startedAt = new Date();
  const id = (await dbQaWalkRecord.begin({ sha: commit, mode: "release", startedAt }, false))!;
  await dbQaWalkRecord.begin({ sha: sha(), mode: "deploy", startedAt: new Date(startedAt.getTime() - 3_600_000) }, false);

  const running = await fetch(`${base}/api/qa/latest`);
  assert.equal(running.status, 200);
  assert.deepEqual(await running.json(), { sha: commit, mode: "release", status: "running", startedAt: startedAt.toISOString(), finishedAt: null, steps: [], findings: [], shots: [] });

  const leaky =
    "qa-b+clerk_test@mystarsdecoded.com opened https://starsdecoded-staging.vercel.app/claim?token=AbCdEfGhIjKlMnOpQrStUvWx.0123456789abcdefghijABCDEFGHIJ0123456789abc" +
    " as user_2NNEqL2nrIRdJ194ndJqAHwEfxC in session 1b4e28ba-2fa1-11d2-883f-0016d3cca427 with pi_3PxYzAbCdEfGhIjK1a2b3c4d_secret_ZyXwVuTsRqPoNmLk";
  const finishedAt = new Date(startedAt.getTime() + 61_000);
  await dbQaWalkRecord.finish(
    id,
    {
      status: "fail",
      steps: [
        { id: "gift", label: "Mira gifts Idris a report; the email goes out and a credit is held", status: "pass", ms: 4100 },
        { id: "gift-claimed", label: "Idris claims the gift from its link; the credit moves to him", status: "fail", reason: leaky, ms: 2300, email: "qa-b+clerk_test@mystarsdecoded.com" } as WalkVerdict["steps"][number],
      ],
      findings: [{ step: "gift-claimed", title: "The claim page said the link was used", detail: leaky, clerkId: "user_2NNEqL2nrIRdJ194ndJqAHwEfxC" } as WalkVerdict["findings"][number]],
    },
    finishedAt,
  );

  const res = await fetch(`${base}/api/qa/latest`, { headers: { cookie: "sd_session_id=11111111-1111-4111-8111-111111111111" } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("set-cookie"), null, "ahead of the session: no cookie set or renewed");
  assert.equal(res.headers.get("cache-control"), "no-store");
  type Answer = { sha: string; mode: string; status: string; startedAt: string; finishedAt: string | null; steps: Array<Record<string, unknown>>; findings: Array<Record<string, unknown>>; shots: string[] };
  const body = (await res.json()) as Answer;
  assert.deepEqual(Object.keys(body), ["sha", "mode", "status", "startedAt", "finishedAt", "steps", "findings", "shots"]);
  assert.deepEqual(body.shots, [], "this walk kept no picture");
  assert.deepEqual([body.sha, body.mode, body.status, body.startedAt, body.finishedAt], [commit, "release", "fail", startedAt.toISOString(), finishedAt.toISOString()]);
  assert.deepEqual(body.steps.map((s: object) => Object.keys(s)), [["id", "label", "status", "ms"], ["id", "label", "status", "reason", "ms"]]);
  assert.deepEqual(body.findings.map((f: object) => Object.keys(f)), [["step", "title", "detail"]]);
  const masked = "[email] opened [link] as [id] in session [id] with [id]";
  assert.equal(body.steps[1].reason, masked);
  assert.equal(body.findings[0].detail, masked);
  assert.equal(body.steps[1].label, "Idris claims the gift from its link; the credit moves to him");
  const all = JSON.stringify(body);
  for (const kept of ["clerk_test", "@", "token", "http", "user_2", "1b4e28ba", "_secret_"]) assert.ok(!all.includes(kept), kept);
  assert.deepEqual(modelCalls, []);
});

test("the walk's pictures: one a step in place of the last walk's, listed in shots beside their verdict, served as image/jpeg with no-store; any other step, a replaced picture and production answer 404; reading writes nothing, and a failure logs the step alone", { skip: NO_DB }, async (t) => {
  const { dbWalkShots } = await import("../lib/qaWalk/index.js");
  const { base, close } = await serve();
  t.after(close);
  const jpeg = (mark: string) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(mark), Buffer.from([0xff, 0xd9])]);
  const line = (id: string, status: WalkVerdict["steps"][number]["status"], shot?: string) => ({ id, label: `the ${id} step`, status, ms: 100, ...(shot ? { shot } : {}) });
  const kept = async () => (await q("select step, walk_id, encode(jpeg, 'hex') as jpeg, taken_at from qa_shots order by step")).rows;
  const walks = async () => (await q("select id, status, steps, findings, started_at, finished_at from qa_walks order by started_at, id")).rows;

  // The last walk pictured three steps, Timeline's among them.
  const [lastWalk, newWalk] = [randomUUID(), randomUUID()];
  const lastAt = new Date(Date.now() - 3_600_000);
  const lastRow = (await dbQaWalkRecord.begin({ sha: sha(), mode: "deploy", startedAt: lastAt }, false))!;
  for (const id of ["sign-in", "buy", "timeline"] as const) await dbWalkShots.keep(id, lastWalk, jpeg(`last ${id}`), lastAt);
  await dbQaWalkRecord.finish(lastRow, { status: "pass", steps: ["sign-in", "buy", "timeline"].map((id) => line(id, "pass", lastWalk)), findings: [] }, lastAt);
  assert.deepEqual((await kept()).map((row) => [row.step, row.walk_id]), [["buy", lastWalk], ["sign-in", lastWalk], ["timeline", lastWalk]]);

  // The newest walk stopped at buy: its first picture cleared every one of the last walk's, and its own two are kept.
  const startedAt = new Date();
  const newRow = (await dbQaWalkRecord.begin({ sha: sha(), mode: "deploy", startedAt }, false))!;
  await dbWalkShots.keep("sign-in", newWalk, jpeg("new sign-in"), startedAt);
  await dbWalkShots.keep("buy", newWalk, jpeg("new buy"), startedAt);
  await dbQaWalkRecord.finish(newRow, { status: "fail", steps: [line("sign-in", "pass", newWalk), line("buy", "fail", newWalk), line("own-report", "not_run")], findings: [] }, new Date());
  const rows = await kept();
  assert.deepEqual(
    rows.map((row) => [row.step, row.walk_id, row.jpeg]),
    [["buy", newWalk, jpeg("new buy").toString("hex")], ["sign-in", newWalk, jpeg("new sign-in").toString("hex")]],
  );
  const rowsOfWalks = await walks();

  const verdict = (await (await fetch(`${base}/api/qa/latest`)).json()) as { status: string; shots: string[] };
  assert.equal(verdict.status, "fail");
  assert.deepEqual(verdict.shots, ["sign-in", "buy"]);
  assert.ok(!JSON.stringify(verdict).includes(newWalk), "the walk's id stays on the server");

  const res = await fetch(`${base}/api/qa/latest/shots/buy`, { headers: { cookie: "sd_session_id=11111111-1111-4111-8111-111111111111" } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/jpeg");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("set-cookie"), null, "ahead of the session: no cookie set or renewed");
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), jpeg("new buy"));

  // A step the newest walk didn't picture, one whose picture that walk replaced, a local step and a name no step has.
  for (const step of ["own-report", "timeline", "tomas-report", "no-such-step", "BUY"]) {
    const none = await fetch(`${base}/api/qa/latest/shots/${step}`);
    assert.equal(none.status, 404, step);
    assert.deepEqual(await none.json(), { error: "not_found" }, step);
    assert.equal(none.headers.get("cache-control"), "no-store", step);
  }

  process.env.APP_ENV = "production";
  try {
    const hidden = await fetch(`${base}/api/qa/latest/shots/buy`);
    assert.equal(hidden.status, 404);
    assert.deepEqual(await hidden.json(), { error: "not_found" });
  } finally {
    process.env.APP_ENV = "staging";
  }
  assert.deepEqual(await kept(), rows, "reading a picture writes no picture");
  assert.deepEqual(await walks(), rowsOfWalks, "nor any walk");

  // A read that fails logs the step and nothing else: no error, address or account.
  const latest = mock.method(dbQaWalkRecord, "latest", async () => {
    throw new Error("connect ECONNREFUSED for qa-b+clerk_test@mystarsdecoded.com as user_2NNEqL2nrIRdJ194ndJqAHwEfxC");
  });
  const errors = mock.method(logger, "error", () => undefined);
  try {
    const failed = await fetch(`${base}/api/qa/latest/shots/sign-in`);
    assert.equal(failed.status, 500);
    assert.deepEqual(await failed.json(), { error: "internal_error" });
    const said = errors.mock.calls.map((call) => call.arguments as unknown[]).filter((args) => args[1] === "qa walk picture failed");
    assert.deepEqual(said, [[{ step: "sign-in" }, "qa walk picture failed"]]);
  } finally {
    errors.mock.restore();
    latest.mock.restore();
  }

  // A walk now running is the newest verdict: it lists no picture yet, and the last walk's aren't served beside it.
  await dbQaWalkRecord.begin({ sha: sha(), mode: "deploy", startedAt: new Date(startedAt.getTime() + 1_000) }, false);
  assert.deepEqual(((await (await fetch(`${base}/api/qa/latest`)).json()) as { shots: string[] }).shots, []);
  assert.equal((await fetch(`${base}/api/qa/latest/shots/buy`)).status, 404);
  assert.deepEqual(modelCalls, []);
});

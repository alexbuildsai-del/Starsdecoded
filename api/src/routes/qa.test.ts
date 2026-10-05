/**
 * The staging walk after a deploy, and its public verdict (ADR-279, 315; readings 11, 17), with a model client that
 * fails if called: nothing on a deploy's path writes a report, so it never is. Off staging nothing waits, walks or
 * writes, and the verdict answers 404. On a scratch Postgres named by WALK_DATABASE_URL: once the web serves the
 * commit, the pair is made ready, reset and walked in deploy mode, one row a commit; a walk a restart cut off is
 * settled at the next start; a site that never shows the commit is a failed row; nothing rejects; GET /api/qa/latest
 * answers the newest verdict ahead of the session, with what is private masked. Without a database those skip, saying
 * why. The pair and the browser are stand-ins at the walk's seams: qaPair.test.ts makes and resets the real pair on the
 * same database at the same time, where one account alone holds each part, and the walk's own tests drive its page.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
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
const { CUT_OFF, dbQaWalkRecord } = await import("../lib/release.js");
const { GIVE_UP_MS, untilWebServes } = await import("../lib/indexNow.js");
const { default: app } = await import("../app.js");
const { pool } = await import("@workspace/db");

type WalkDeps = import("../lib/release.js").WalkDeps;
type WalkVerdict = import("../lib/release.js").WalkVerdict;
type QaWalkRecord = import("../lib/release.js").QaWalkRecord;
type QaDeployDeps = import("./qa.js").QaDeployDeps;

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the walk's rows are written and read on a scratch Postgres";

const q = (text: string, params: unknown[] = []) => pool.query(text, params);
const sha = () => randomBytes(20).toString("hex");
const short = (commit: string) => commit.slice(0, 7);
const WEB = "https://staging.test";
const staging = (commit: string): NodeJS.ProcessEnv => ({ APP_ENV: "staging", RAILWAY_GIT_COMMIT_SHA: commit, PUBLIC_APP_URL: WEB });
const quiet = () => undefined;

// Only this file writes qa_walks, so it starts and ends with the table empty.
if (SCRATCH) {
  before(async () => {
    await q("delete from qa_walks");
  });
  after(async () => {
    await q("delete from qa_walks");
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

test("off staging nothing waits, walks or writes, and the verdict answers 404 to everyone with no cookie", async (t) => {
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
      const res = await fetch(`${base}/api/qa/latest`);
      assert.equal(res.status, 404, appEnv);
      assert.deepEqual(await res.json(), { error: "not_found" });
      assert.equal(res.headers.get("set-cookie"), null, appEnv);
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
  assert.deepEqual(await running.json(), { sha: commit, mode: "release", status: "running", startedAt: startedAt.toISOString(), finishedAt: null, steps: [], findings: [] });

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
  type Answer = { sha: string; mode: string; status: string; startedAt: string; finishedAt: string | null; steps: Array<Record<string, unknown>>; findings: Array<Record<string, unknown>> };
  const body = (await res.json()) as Answer;
  assert.deepEqual(Object.keys(body), ["sha", "mode", "status", "startedAt", "finishedAt", "steps", "findings"]);
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

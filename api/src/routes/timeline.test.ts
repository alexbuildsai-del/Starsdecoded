/**
 * Timeline's and Ask's routes through the real router, in process (MB-49): the access answer, the one access check in
 * front of every other route, Now and ahead's count, a reading's count and the breaker that an open writing nothing
 * skips, Timeline's own pause line, an account's new readings a day, Ask's answers, GET /home's week or teaser, and
 * deleting one's own Personal report.
 * The decisions run with no database; the routes' reads run on a scratch Postgres when WALK_DATABASE_URL names a
 * bootstrapped one, and skip, saying why, without it. The model is the test stub, so nothing here calls a real one.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express, type RequestHandler } from "express";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere, and a read there fails at once.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
// A path that ever reached past the stub would meet a closed port, never the network.
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";
// A paused day looks up the admin's address; with no key Clerk refuses before it sends anything.
delete process.env.CLERK_SECRET_KEY;
delete process.env.DAILY_SPEND_CAP_USD;

/** Each run's own ids, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const user = (tag: string) => `user_r1629_${run}_${tag}`;
const ADMIN = user("admin");
process.env.ADMIN_USER_ID = ADMIN;

const { installFakeModel } = await import("../lib/testModel.js");
const { setSpendSink } = await import("../lib/spendLedger.js");
const { logger } = await import("../lib/logger.js");
const { LIMITS, LIMIT_LINES } = await import("../lib/limits.js");
const { PAUSED_LINE, TIMELINE_PAUSED_LINE, utcDay } = await import("../lib/spendCap.js");
const { NO_TIMELINE_LINE } = await import("../lib/timelineAccess.js");
const { ASK_CHOICE_GONE_LINE, ASK_EMPTY_LINE, monthOf } = await import("../lib/ask.js");
const { chartForProfile } = await import("../lib/profiles.js");
const T = await import("../lib/timeline.js");
const RD = await import("../lib/timelineReadings.js");
const E = await import("@workspace/engine");
const { capLine } = await import("../prompts/ask/index.js");
const Z = await import("@workspace/api-zod");
const { default: router, asking, nowAndAhead, openingReading } = await import("./index.js");
const TL = await import("./timeline.js");
const AK = await import("./ask.js");

type ReaderChart = import("../lib/timeline.js").ReaderChart;
type ReadingState = import("../lib/timeline.js").ReadingState;
type SkyEvent = import("@workspace/engine").SkyEvent;
type FakeRequest = import("../lib/testModel.js").FakeRequest;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MIRA_BIRTH = JSON.parse(readFileSync(join(ROOT, "fixtures", "sample-people", "mira.json"), "utf8"));
const BIRTH = {
  birthDate: MIRA_BIRTH.birthDate as string,
  birthTime: MIRA_BIRTH.birthTime as string,
  birthTimeWindowMinutes: 0,
  latitude: MIRA_BIRTH.latitude as number,
  longitude: MIRA_BIRTH.longitude as number,
  timezoneOffset: MIRA_BIRTH.timezoneOffset as number,
  timezone: MIRA_BIRTH.timezone as string,
};

/** Mira's own chart as Timeline reads it, computed here from her committed fixture (reading 2). */
function miraReader(): ReaderChart {
  const profile = { id: "PMIRA", userId: "user_mira", sessionId: "s-mira", claimedByUserId: null, isSelf: true, claimedAsSelf: false, ...BIRTH, chartData: null };
  const report = { id: "RMIRA", status: "complete", sessionId: "s-mira", createdAt: new Date("2026-09-01T09:00:00Z") };
  return T.readerOf("user_mira", { report, profile }, chartForProfile(profile));
}
const MIRA = miraReader();

/** Fits any event: no date, degree, life event or order, so a write lands at its first try. */
const CLEAN = {
  line: "You think harder about what you take on and why.",
  body: "Astrology reads this stretch as a time when the sky presses on a part of your chart you already know well. Your report describes how you work through things in depth before you commit. This time meets that habit. You may find that old plans feel heavier to carry. You may also find that the plans you still believe in feel clearer. Some days the pressure feels like a weight. Other days it feels like a firm hand on your back. People around you may see you as more serious than usual. You may feel the gap between how calm you look and how you feel inside.",
};
const ANSWER = "Your report says you like to see the whole picture before you choose.";
const plans: FakeRequest[] = [];
const fake = installFakeModel({
  timeline_reading: CLEAN,
  ask_plan: (req: FakeRequest) => {
    plans.push(req);
    return { intent: "answer", tools: [], question: "", choices: [] };
  },
  ask_answer: { text: ANSWER, cards: [] },
});
setSpendSink(async () => {});
const calls = (name: string) => fake.calls.filter((c) => c === name).length;

/** Where the session and sign-in middleware stand in app.ts. */
const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || `s-r1629-${run}`;
  req.log = logger;
  next();
};

async function listen(app: Express) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close };
}

const app = express();
app.use(express.json());
app.use(viewer);
app.use("/api", router);
const served = await listen(app);

interface Answer {
  status: number;
  // Read field by field, or through the contract's own parsers.
  body: any;
  retryAfter: string | null;
}

async function fetched(base: string, method: string, path: string, who: string | null, body?: unknown): Promise<Answer> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (who) headers["x-user"] = who;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, retryAfter: res.headers.get("retry-after") };
}

const call = (method: string, path: string, who: string | null, body?: unknown) => fetched(served.base, method, `/api${path}`, who, body);
const open = (who: string, key: string) => call("POST", `/timeline/readings/${encodeURIComponent(key)}`, who, {});

const SATURN_ON_ASC = "contact.saturn.conjunction.ascendant.20260530";
/** Every Timeline and Ask route the access check stands in front of. */
const GUARDED: ReadonlyArray<readonly [string, string, unknown?]> = [
  ["GET", "/timeline/now?range=week"],
  ["GET", "/timeline/life"],
  ["POST", `/timeline/readings/${SATURN_ON_ASC}`, {}],
  ["GET", "/ask"],
  ["POST", "/ask", { text: "What does Saturn mean for me?" }],
];

test("the access answer: Ask's count and the source only with access, a Personal report only once it is finished (ADR-262, 263)", () => {
  const usage = { used: 3, left: 47, cap: 50, resetsOn: "2026-11-01" };
  const answers = [
    [TL.accessAnswer({ access: true, source: "admin" }, { finished: true }, usage), { access: true, source: "admin", hasPersonalReport: true, ask: usage }],
    [TL.accessAnswer({ access: true, source: "admin" }, null, usage), { access: true, source: "admin", hasPersonalReport: false, ask: usage }],
    [TL.accessAnswer({ access: false, source: null }, { finished: true }, usage), { access: false, source: null, hasPersonalReport: true, ask: null }],
    [TL.accessAnswer({ access: false, source: null }, { finished: false }, null), { access: false, source: null, hasPersonalReport: false, ask: null }],
  ] as const;
  for (const [got, want] of answers) {
    assert.deepEqual(got, want);
    Z.GetTimelineAccessResponse.parse(got);
  }
});

test("a reading's key as the views mint it, and which opens start a write: none kept, one that failed, one whose write died", () => {
  for (const key of [SATURN_ON_ASC, "retrograde.venus.-.-.20261003", "eclipse.sun.-.-.20260217", "cycle.saturn-return.20200101", "contact.north_node.conjunction.sun.20270101", "a".repeat(80)]) {
    assert.ok(TL.isReadingKey(key), key);
  }
  for (const key of ["", "Contact.saturn.-.-.20260530", "contact saturn", "../etc/passwd", "contact/saturn", "a".repeat(81), 42, null, undefined, [SATURN_ON_ASC]]) {
    assert.ok(!TL.isReadingKey(key), String(key));
  }
  const states: Array<[ReadingState | undefined, boolean]> = [
    [undefined, true],
    ["none", true],
    [{ status: "failed", line: "We couldn't write this reading. Try again in a few minutes." }, true],
    ["writing", false],
    [{ status: "writing" }, false],
    [{ status: "ready", line: CLEAN.line }, false],
  ];
  for (const [state, writes] of states) assert.equal(TL.writesOnOpen(state), writes, JSON.stringify(state));
});

test("an open's answer: a reading as it stands is 200, none 404, and the day's cap 429 in a limit's body with its wait for Retry-After (MB-219)", () => {
  const reading = { key: SATURN_ON_ASC, line: CLEAN.line, body: CLEAN.body, buildsOn: { kind: "house" as const, house: 1 }, writtenAt: new Date("2026-10-05T09:00:00Z") };
  for (const opened of [
    { status: "ready" as const, reading, line: null },
    { status: "writing" as const, reading: null, line: null },
    { status: "failed" as const, reading: null, line: RD.READING_FAILED_LINE },
  ]) {
    assert.deepEqual(TL.readingAnswerOf(opened), { status: 200, body: opened, retryAfter: null }, opened.status);
    Z.OpenTimelineReadingResponse.parse(opened);
  }
  assert.deepEqual(TL.readingAnswerOf({ status: "unknown", reading: null, line: null }), {
    status: 404, body: { error: "not_found", message: TL.NO_READING_LINE }, retryAfter: null,
  });
  assert.deepEqual(TL.readingAnswerOf({ status: "capped", reading: null, line: RD.READINGS_CAP_LINE, retryAfterSeconds: 3600 }), {
    status: 429, body: { error: "rate_limited", message: RD.READINGS_CAP_LINE, retryAfterSeconds: 3600 }, retryAfter: 3600,
  });
  assert.notEqual(RD.READINGS_CAP_LINE, LIMIT_LINES.timelineReading, "the day's line, never the minute's");
});

test("the six-month queue gets the contacts with no reading yet, never another kind, nor one kept, writing or failed (reading 7)", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const bare = T.nowView(MIRA, "six-months", "Europe/Lisbon", new Map(), now);
  const contacts = bare.events.filter((e) => e.kind === "contact").map((e) => e.key);
  assert.ok(contacts.length > 3, `Mira's six months hold ${contacts.length} contacts`);
  assert.deepEqual(TL.toQueue(bare), contacts);
  const [ready, writing, failed] = contacts;
  const statuses = new Map<string, ReadingState>([
    [ready, { status: "ready", line: CLEAN.line }],
    [writing, "writing"],
    [failed, { status: "failed", line: "We couldn't write this reading. Try again in a few minutes." }],
  ]);
  assert.deepEqual(TL.toQueue(T.nowView(MIRA, "six-months", "Europe/Lisbon", statuses, now)), contacts.slice(3));
});

test("Ask's answers: the thread 200, the month's cap 429 with its day, a body Ask cannot take 400, no chart to read 409", () => {
  const thread = { messages: [], usage: { used: 1, left: 49, cap: 50, resetsOn: "2026-11-01" } };
  const cap = { error: "ask_cap" as const, message: capLine("2026-11-01"), resetsOn: "2026-11-01" };
  assert.deepEqual(AK.askAnswerOf({ kind: "thread", thread }), { status: 200, body: thread });
  assert.deepEqual(AK.askAnswerOf({ kind: "cap", cap }), { status: 429, body: cap });
  for (const [error, message] of [["validation_error", ASK_EMPTY_LINE], ["choice_not_offered", ASK_CHOICE_GONE_LINE]] as const) {
    assert.deepEqual(AK.askAnswerOf({ kind: "invalid", error, message }), { status: 400, body: { error, message } });
  }
  assert.deepEqual(AK.askAnswerOf({ kind: "no_personal_report" }), { status: 409, body: { error: "no_personal_report", message: TL.NO_PERSONAL_REPORT_LINE } });
  Z.SendAskMessageResponse.parse(thread);
});

test("a message's body: its three fields, each only when it is a string, so Ask words what is missing itself", () => {
  const none = { text: undefined, choiceId: undefined, reportId: undefined };
  assert.deepEqual(AK.askBodyOf({ text: "Hi", choiceId: "c1", reportId: "r1", extra: "x" }), { text: "Hi", choiceId: "c1", reportId: "r1" });
  assert.deepEqual(AK.askBodyOf({ text: 5, choiceId: ["c1"], reportId: null }), none);
  for (const raw of [null, undefined, "Hi", 42, []]) assert.deepEqual(AK.askBodyOf(raw), none, JSON.stringify(raw));
});

test("signed out: the access answer asks them to sign in, and every other Timeline and Ask route is 403 no_timeline (ADR-262)", async () => {
  const access = await call("GET", "/timeline/access", null);
  assert.equal(access.status, 401);
  assert.deepEqual(access.body, { error: "sign_in_required", message: TL.TIMELINE_SIGN_IN_LINE });
  for (const [method, path, body] of GUARDED) {
    const r = await call(method, path, null, body);
    assert.equal(r.status, 403, `${method} ${path}`);
    assert.deepEqual(r.body, { error: "no_timeline", message: NO_TIMELINE_LINE });
  }
});

test("a reader without Timeline hears 403 on every route ahead of the breaker and the counts, a paused day and more tries than a minute allows included", async (t) => {
  process.env.DAILY_SPEND_CAP_USD = "0";
  t.after(() => {
    delete process.env.DAILY_SPEND_CAP_USD;
  });
  const someone = user("without");
  for (let i = 0; i <= LIMITS.ask.limit; i++) {
    for (const [method, path, body] of GUARDED) {
      const r = await call(method, path, someone, body);
      assert.equal(r.status, 403, `${method} ${path}, try ${i + 1}`);
      assert.equal(r.body.error, "no_timeline");
    }
  }
});

test("before any read: a range Now and ahead does not know is 400, and a key not shaped as one is 404 that counts nothing", async () => {
  for (const path of ["/timeline/now?range=year", "/timeline/now"]) {
    const r = await call("GET", path, ADMIN);
    assert.equal(r.status, 400, path);
    assert.equal(r.body.error, "validation_error");
  }
  for (let i = 0; i <= LIMITS.timelineReading.limit; i++) {
    for (const key of ["NOT A KEY", "a".repeat(81)]) {
      const r = await open(ADMIN, key);
      assert.equal(r.status, 404, `${key}, try ${i + 1}`);
      assert.deepEqual(r.body, { error: "not_found", message: TL.NO_READING_LINE });
    }
  }
});

test("Ask's chain as routes/index.ts stands it: the access check, then 6 a minute with Ask's line, then the breaker", async (t) => {
  const asker = user("chain-ask");
  const paused = user("chain-paused");
  const stub = express();
  stub.use(express.json());
  stub.use(viewer);
  const answered: RequestHandler = (_req, res) => void res.status(200).json({ answered: true });
  stub.post("/ask", asking, answered);
  const { base, close } = await listen(stub);
  t.after(async () => {
    process.env.ADMIN_USER_ID = ADMIN;
    delete process.env.DAILY_SPEND_CAP_USD;
    await close();
  });
  process.env.ADMIN_USER_ID = asker;
  assert.equal((await fetched(base, "POST", "/ask", user("chain-other"), { text: "Hi" })).status, 403);
  for (let i = 0; i < LIMITS.ask.limit; i++) assert.equal((await fetched(base, "POST", "/ask", asker, { text: "Hi" })).status, 200, `message ${i + 1}`);
  const limited = await fetched(base, "POST", "/ask", asker, { text: "Hi" });
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { error: "rate_limited", message: LIMIT_LINES.ask, retryAfterSeconds: Number(limited.retryAfter) });
  process.env.ADMIN_USER_ID = paused;
  process.env.DAILY_SPEND_CAP_USD = "0";
  const answer = await fetched(base, "POST", "/ask", paused, { text: "Hi" });
  assert.equal(answer.status, 503);
  assert.deepEqual(answer.body, { error: "paused", reason: "paused", message: TIMELINE_PAUSED_LINE }, "Timeline's line, never the report's credit line");
  assert.notEqual(TIMELINE_PAUSED_LINE, PAUSED_LINE);
});

test("Now and ahead's chain as routes/index.ts stands it: the access check, then 30 reads a minute with its line, and no breaker", async (t) => {
  const looker = user("chain-now");
  const stub = express();
  stub.use(viewer);
  // Stands in for the view: a range it does not know is its 400, any other read its 200.
  const view: RequestHandler = (req, res) => void res.status(req.query.range === "year" ? 400 : 200).json({ range: req.query.range });
  stub.get("/timeline/now", nowAndAhead, view);
  const { base, close } = await listen(stub);
  t.after(async () => {
    process.env.ADMIN_USER_ID = ADMIN;
    delete process.env.DAILY_SPEND_CAP_USD;
    await close();
  });
  process.env.ADMIN_USER_ID = looker;
  // A paused day: the six months' queue waits behind the breaker itself, so the view still answers.
  process.env.DAILY_SPEND_CAP_USD = "0";
  const get = (who: string, range: string) => fetched(base, "GET", `/timeline/now?range=${range}`, who);
  for (let i = 0; i <= LIMITS.timelineNow.limit; i++) assert.equal((await get(user("chain-now-other"), "week")).status, 403, `try ${i + 1}`);
  for (let i = 0; i < 3; i++) assert.equal((await get(looker, "year")).status, 400, "a range it does not know gives its count back");
  const ranges = ["week", "month", "six-months"];
  for (let i = 0; i < LIMITS.timelineNow.limit; i++) assert.equal((await get(looker, ranges[i % 3])).status, 200, `read ${i + 1}`);
  const limited = await get(looker, "six-months");
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { error: "rate_limited", message: LIMIT_LINES.timelineNow, retryAfterSeconds: Number(limited.retryAfter) });
});

test(
  "a reading's chain when its state cannot be read: the open meets the count, 20 a minute with the reading's line, then the breaker; a key not shaped as one skips both",
  { skip: SCRATCH ? "with a database the state is read; the database tests below open real readings" : false },
  async (t) => {
    const opener = user("chain-read");
    const paused = user("chain-read-paused");
    const stub = express();
    stub.use(express.json());
    stub.use(viewer);
    const written: RequestHandler = (_req, res) => void res.status(200).json({ status: "ready" });
    stub.post("/timeline/readings/:key", openingReading, written);
    const { base, close } = await listen(stub);
    t.after(async () => {
      process.env.ADMIN_USER_ID = ADMIN;
      delete process.env.DAILY_SPEND_CAP_USD;
      await close();
    });
    process.env.ADMIN_USER_ID = opener;
    const post = (who: string, key: string) => fetched(base, "POST", `/timeline/readings/${encodeURIComponent(key)}`, who, {});
    for (let i = 0; i < LIMITS.timelineReading.limit; i++) assert.equal((await post(opener, SATURN_ON_ASC)).status, 200, `open ${i + 1}`);
    const limited = await post(opener, SATURN_ON_ASC);
    assert.equal(limited.status, 429);
    assert.deepEqual(limited.body, { error: "rate_limited", message: LIMIT_LINES.timelineReading, retryAfterSeconds: Number(limited.retryAfter) });
    assert.equal((await post(opener, "NOT A KEY")).status, 404, "past the full count, a key that names nothing goes on to its 404");
    process.env.ADMIN_USER_ID = paused;
    process.env.DAILY_SPEND_CAP_USD = "0";
    const answer = await post(paused, SATURN_ON_ASC);
    assert.equal(answer.status, 503);
    assert.deepEqual(answer.body, { error: "paused", reason: "paused", message: TIMELINE_PAUSED_LINE });
  },
);

// What follows reads and writes on a scratch Postgres.

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the routes' reads and writes run on a scratch Postgres";
const id = (name: string) => `r1629-${run}-${name}`;
const OWNER = user("owner");
const NOBODY = user("nobody");
const LIMITER = user("limiter");
const LOOKER = user("looker");
const ASKER = user("asker");
const CAPPED = user("capped");
const DAILY = user("daily");
const DELETER = user("deleter");
const GIVER = user("giver");
const SUBJECT = user("subject");
const P = {
  admin: id("p-admin"), adminOther: id("p-admin-other"), owner: id("p-owner"), limiter: id("p-limiter"), asker: id("p-asker"),
  capped: id("p-capped"), daily: id("p-daily"), deleter: id("p-deleter"), given: id("p-given"), looker: id("p-looker"),
};
const R = {
  admin: id("r-admin"), adminOther: id("r-admin-other"), owner: id("r-owner"), limiter: id("r-limiter"), asker: id("r-asker"),
  capped: id("r-capped"), daily: id("r-daily"), deleter: id("r-deleter"), given: id("r-given"), looker: id("r-looker"),
};
const USERS = [ADMIN, OWNER, NOBODY, LIMITER, LOOKER, ASKER, CAPPED, DAILY, DELETER, GIVER, SUBJECT];

/** A Personal report's text as a reading reads it: a card for each house. */
const REPORT_TEXT = {
  houses: {
    houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: `Card ${i + 1}. You set the tone in this part of your life before you speak.` })),
  },
};

let seeded: Promise<void> | null = null;

function seed(): Promise<void> {
  seeded ??= (async () => {
    const { db, profilesTable, reportsTable } = await import("@workspace/db");
    const chartData = chartForProfile(BIRTH) as unknown as object;
    const profile = (profileId: string, holder: string, over: Record<string, unknown> = {}) => ({
      id: profileId, sessionId: `s-${holder}`, userId: holder, name: "Mira Costa", birthPlace: "Lisbon, Portugal", ...BIRTH, chartData, ...over,
    });
    await db.insert(profilesTable).values([
      profile(P.admin, ADMIN, { isSelf: true }),
      // A chart the admin wrote for someone else in their life.
      profile(P.adminOther, ADMIN),
      profile(P.owner, OWNER, { isSelf: true }),
      profile(P.limiter, LIMITER, { isSelf: true }),
      profile(P.looker, LOOKER, { isSelf: true }),
      profile(P.asker, ASKER, { isSelf: true }),
      profile(P.capped, CAPPED, { isSelf: true }),
      profile(P.daily, DAILY, { isSelf: true }),
      profile(P.deleter, DELETER, { isSelf: true }),
      // Written by the giver and claimed by its subject as their own (ADR-139).
      profile(P.given, GIVER, { claimedByUserId: SUBJECT, claimedAsSelf: true }),
    ]);
    const report = (reportId: string, profileId: string, holder: string) => ({
      id: reportId, profileId, sessionId: `s-${holder}`, type: "natal", status: "complete", interpretation: REPORT_TEXT,
    });
    await db.insert(reportsTable).values([
      report(R.admin, P.admin, ADMIN),
      report(R.adminOther, P.adminOther, ADMIN),
      report(R.owner, P.owner, OWNER),
      report(R.limiter, P.limiter, LIMITER),
      report(R.looker, P.looker, LOOKER),
      report(R.asker, P.asker, ASKER),
      report(R.capped, P.capped, CAPPED),
      report(R.daily, P.daily, DAILY),
      report(R.deleter, P.deleter, DELETER),
      report(R.given, P.given, GIVER),
    ]);
  })();
  return seeded;
}

async function rowsFor(profileId: string) {
  const { db, timelineReadingsTable: t } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  return db.select().from(t).where(eq(t.profileId, profileId));
}

async function threadOf(userId: string) {
  const { db, askMessagesTable: m } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  return db.select().from(m).where(eq(m.userId, userId));
}

/** Kept readings and messages to forget, as rows, so a delete is seen to take them. */
async function keep(userId: string, profileId: string, keys: string[], messages: number): Promise<void> {
  const { db, timelineReadingsTable, askMessagesTable } = await import("@workspace/db");
  if (keys.length) {
    await db.insert(timelineReadingsTable).values(keys.map((eventKey) => ({
      id: randomUUID(), userId, profileId, eventKey, basis: "kept", status: "ready" as const, reading: { line: CLEAN.line, body: CLEAN.body, buildsOn: null, writtenAt: new Date().toISOString() },
    })));
  }
  if (messages) {
    await db.insert(askMessagesTable).values(Array.from({ length: messages }, (_, i) => ({ id: randomUUID(), userId, role: "reader" as const, body: { text: `Earlier ${i}` } })));
  }
}

/** Until the queue's writes have landed: at least `count` rows on the profile, none still writing. */
async function settled(profileId: string, count: number) {
  for (let i = 0; i < 400; i++) {
    const rows = await rowsFor(profileId);
    if (rows.length >= count && rows.every((r) => r.status !== "writing")) return rows;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`the queue left ${profileId}'s readings writing`);
}

const byDay = (a: string, b: string) => a.slice(-8).localeCompare(b.slice(-8)) || a.localeCompare(b);

/** The reader's day in a zone, read on both sides of a call, so a midnight passing during it is no failure. */
async function dayAround<V>(zone: string, during: () => Promise<V>): Promise<{ days: string[]; value: V }> {
  const before = T.dayIn(new Date(), zone);
  const value = await during();
  return { days: [before, T.dayIn(new Date(), zone)], value };
}

after(async () => {
  await served.close();
  fake.restore();
  const { db, pool, askMessagesTable, profilesTable, reportsTable, timelineReadingsTable } = await import("@workspace/db");
  if (SCRATCH && seeded) {
    const { inArray } = await import("drizzle-orm");
    await db.delete(timelineReadingsTable).where(inArray(timelineReadingsTable.profileId, Object.values(P)));
    await db.delete(askMessagesTable).where(inArray(askMessagesTable.userId, USERS));
    await db.delete(reportsTable).where(inArray(reportsTable.profileId, Object.values(P)));
    await db.delete(profilesTable).where(inArray(profilesTable.id, Object.values(P)));
  }
  await pool.end();
});

test("db, the access answer: every signed-in reader, whether they have Timeline and a finished Personal report, and Ask's count only with access", { skip: NO_DB }, async () => {
  await seed();
  const resetsOn = monthOf(new Date()).resetsOn;
  const admin = await call("GET", "/timeline/access", ADMIN);
  assert.equal(admin.status, 200);
  assert.deepEqual(Z.GetTimelineAccessResponse.parse(admin.body), { access: true, source: "admin", hasPersonalReport: true, ask: { used: 0, left: 50, cap: 50, resetsOn } });
  assert.deepEqual((await call("GET", "/timeline/access", OWNER)).body, { access: false, source: null, hasPersonalReport: true, ask: null });
  assert.deepEqual((await call("GET", "/timeline/access", NOBODY)).body, { access: false, source: null, hasPersonalReport: false, ask: null });
  for (const [method, path, body] of GUARDED) {
    assert.equal((await call(method, path, OWNER, body)).status, 403, `${method} ${path}: a Personal report is not Timeline`);
  }
});

test("db, Now and ahead: each range in the zone sent, else the birth place's; six months queues the contacts' readings, soonest three, and a card then carries its reading's line", { skip: NO_DB }, async () => {
  await seed();
  const week = await call("GET", "/timeline/now?range=week&tz=Asia/Tokyo", ADMIN);
  assert.equal(week.status, 200);
  const tokyo = Z.GetTimelineNowResponse.parse(week.body);
  assert.deepEqual([tokyo.range, tokyo.zone, tokyo.days.length], ["week", "Asia/Tokyo", 7]);
  const month = Z.GetTimelineNowResponse.parse((await call("GET", "/timeline/now?range=month&tz=Not/AZone", ADMIN)).body);
  assert.deepEqual([month.zone, month.days.length], ["Europe/Lisbon", 30]);
  assert.equal((await rowsFor(P.admin)).length, 0, "a week and a month queue nothing");

  const before = calls("timeline_reading");
  const six = Z.GetTimelineNowResponse.parse((await call("GET", "/timeline/now?range=six-months", ADMIN)).body);
  assert.equal(six.days.length, 182);
  const soonest = TL.toQueue(six).sort(byDay).slice(0, 3);
  assert.equal(soonest.length, 3);
  const rows = await settled(P.admin, 3);
  assert.deepEqual(rows.map((r) => r.eventKey).sort(), [...soonest].sort());
  assert.ok(rows.every((r) => r.status === "ready"));
  assert.equal(calls("timeline_reading") - before, 3);

  const again = Z.GetTimelineNowResponse.parse((await call("GET", "/timeline/now?range=six-months", ADMIN)).body);
  for (const key of soonest) {
    const event = again.events.find((e) => e.key === key);
    assert.deepEqual([event?.reading, event?.line], ["ready", CLEAN.line], key);
  }
  // That read queued the next three; they land before anything else is counted.
  await settled(P.admin, Math.min(6, TL.toQueue(six).length));
});

test("db, Life: every cycle with its reading's state, and a reading opened twice is written once; a key nothing on the chart carries is 404 and writes nothing", { skip: NO_DB }, async () => {
  await seed();
  const life = await call("GET", "/timeline/life?tz=Asia/Tokyo", ADMIN);
  assert.equal(life.status, 200);
  const cycles = Z.GetTimelineLifeResponse.parse(life.body).cycles;
  assert.ok(cycles.length > LIMITS.timelineReading.limit + 1, `${cycles.length} cycles`);
  assert.ok(cycles.every((c) => c.reading === "none"));

  const key = cycles.find((c) => c.id === "saturn-return")!.key;
  const before = calls("timeline_reading");
  const first = await open(ADMIN, key);
  assert.equal(first.status, 200);
  const opened = Z.OpenTimelineReadingResponse.parse(first.body);
  assert.deepEqual([opened.status, opened.reading?.key, opened.reading?.line, opened.line], ["ready", key, CLEAN.line, null]);
  const second = await open(ADMIN, key);
  assert.deepEqual(second.body, first.body);
  assert.equal(calls("timeline_reading") - before, 1, "two opens, one write");
  const read = Z.GetTimelineLifeResponse.parse((await call("GET", "/timeline/life", ADMIN)).body);
  assert.equal(read.cycles.find((c) => c.key === key)?.reading, "ready");

  const kept = (await rowsFor(P.admin)).length;
  for (const unknown of ["cycle.saturn-return.19000101", "contact.mars.square.sun.20261399", "contact.mars.square.sun.18000101"]) {
    const r = await open(ADMIN, unknown);
    assert.equal(r.status, 404, unknown);
    assert.deepEqual(r.body, { error: "not_found", message: TL.NO_READING_LINE });
  }
  assert.equal((await rowsFor(P.admin)).length, kept);
  assert.equal(calls("timeline_reading") - before, 1);
});

test("db, a reading's count: 20 new ones a minute, then its line; opening one kept or still being written counts nothing and still opens", { skip: NO_DB }, async (t) => {
  await seed();
  process.env.ADMIN_USER_ID = LIMITER;
  t.after(() => {
    process.env.ADMIN_USER_ID = ADMIN;
  });
  const keys = Z.GetTimelineLifeResponse.parse((await call("GET", "/timeline/life", LIMITER)).body).cycles.map((c) => c.key);
  for (const key of keys.slice(0, LIMITS.timelineReading.limit)) {
    const r = await open(LIMITER, key);
    assert.deepEqual([r.status, r.body.status], [200, "ready"], key);
  }
  const limited = await open(LIMITER, keys[LIMITS.timelineReading.limit]);
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { error: "rate_limited", message: LIMIT_LINES.timelineReading, retryAfterSeconds: Number(limited.retryAfter) });
  assert.equal((await rowsFor(P.limiter)).length, LIMITS.timelineReading.limit, "the refused open wrote nothing");

  for (const key of keys.slice(0, 3)) {
    const again = await open(LIMITER, key);
    assert.deepEqual([again.status, again.body.status], [200, "ready"], `${key} reopened past a full count`);
  }
  const { db, timelineReadingsTable: tr } = await import("@workspace/db");
  const { and, eq } = await import("drizzle-orm");
  const writing = keys[3];
  await db.update(tr).set({ status: "writing", reading: null, updatedAt: new Date() }).where(and(eq(tr.profileId, P.limiter), eq(tr.eventKey, writing)));
  const asked = await open(LIMITER, writing);
  assert.deepEqual([asked.status, asked.body], [200, { status: "writing", reading: null, line: null }], "the sheet asking again while it is written");
});

test("db, an account's new readings a UTC day through the router: past 40 the next is 429 with Timeline's line and the wait to midnight, and gives the minute's count back; a kept one opens; a key a year out is 404 (MB-219)", { skip: NO_DB }, async (t) => {
  await seed();
  process.env.ADMIN_USER_ID = DAILY;
  t.after(() => {
    process.env.ADMIN_USER_ID = ADMIN;
  });
  const day = utcDay();
  const reader = await T.readerChart({ userId: DAILY, sessionId: `s-${DAILY}` });
  assert.ok(reader);
  const keys = T.lifeView(reader, null, new Map()).cycles.map((c) => c.key);
  // The day's 40 open in process: through the router, the minute's count would stop them at 20.
  for (const key of keys.slice(0, RD.NEW_READINGS_A_DAY)) assert.equal((await RD.openReading(reader, key)).status, "ready", key);
  const before = calls("timeline_reading");
  // Each refusal gives its count back, so a minute's worth and one more all hear the day's line, never the minute's.
  for (let i = 0; i <= LIMITS.timelineReading.limit; i++) {
    const refused = await open(DAILY, keys[RD.NEW_READINGS_A_DAY]);
    if (utcDay() !== day) return t.skip("UTC midnight passed during the test, so the day's count started again");
    assert.equal(refused.status, 429, `try ${i + 1}`);
    assert.deepEqual(refused.body, { error: "rate_limited", message: RD.READINGS_CAP_LINE, retryAfterSeconds: Number(refused.retryAfter) }, `try ${i + 1}`);
    assert.ok(refused.body.retryAfterSeconds > 0 && refused.body.retryAfterSeconds <= 86_400);
  }
  assert.equal(calls("timeline_reading"), before);
  assert.ok(!(await rowsFor(P.daily)).some((r) => r.eventKey === keys[RD.NEW_READINGS_A_DAY]), "no row for a refused one");

  const kept = await open(DAILY, keys[0]);
  assert.deepEqual([kept.status, kept.body.status, kept.body.reading?.line], [200, "ready", CLEAN.line], "a kept reading opens on a capped day");
  const DAY_MS = 86_400_000;
  const startOf = (e: SkyEvent) => (e.kind === "contact" ? e.window.start : e.kind === "retrograde" ? e.start : e.eclipse.at).getTime();
  const yearAhead = Date.now() + 365 * DAY_MS;
  const yearOut = E.skyEvents(reader.chart, new Date(yearAhead), new Date(yearAhead + 30 * DAY_MS)).filter(E.readsAs).find((e) => startOf(e) >= yearAhead);
  assert.ok(yearOut, "a real event on her chart a year out");
  const far = await open(DAILY, yearOut.key);
  assert.deepEqual([far.status, far.body], [404, { error: "not_found", message: TL.NO_READING_LINE }], "a key a year out");
  assert.equal(calls("timeline_reading"), before);
});

test("db, Now and ahead's count through the router: 30 reads a minute, then its line; a range it does not know gives its count back, and Life, which writes nothing, has none", { skip: NO_DB }, async (t) => {
  await seed();
  process.env.ADMIN_USER_ID = LOOKER;
  t.after(() => {
    process.env.ADMIN_USER_ID = ADMIN;
  });
  for (let i = 0; i < 3; i++) assert.equal((await call("GET", "/timeline/now?range=year", LOOKER)).status, 400);
  for (let i = 0; i < LIMITS.timelineNow.limit; i++) {
    assert.equal((await call("GET", "/timeline/now?range=week", LOOKER)).status, 200, `read ${i + 1}`);
  }
  const limited = await call("GET", "/timeline/now?range=week", LOOKER);
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { error: "rate_limited", message: LIMIT_LINES.timelineNow, retryAfterSeconds: Number(limited.retryAfter) });
  assert.equal((await call("GET", "/timeline/life", LOOKER)).status, 200);
});

test("db, a paused day: a kept reading and one still being written open, a new one is 503 with Timeline's pause line and writes nothing", { skip: NO_DB }, async (t) => {
  await seed();
  process.env.DAILY_SPEND_CAP_USD = "0";
  t.after(() => {
    delete process.env.DAILY_SPEND_CAP_USD;
  });
  const ready = (await rowsFor(P.admin)).filter((r) => r.status === "ready").map((r) => r.eventKey);
  assert.ok(ready.length >= 2, `${ready.length} kept readings`);
  const [kept, writing] = ready;
  const opened = await open(ADMIN, kept);
  assert.deepEqual([opened.status, opened.body.status], [200, "ready"]);
  const { db, timelineReadingsTable: tr } = await import("@workspace/db");
  const { and, eq } = await import("drizzle-orm");
  await db.update(tr).set({ status: "writing", reading: null, updatedAt: new Date() }).where(and(eq(tr.profileId, P.admin), eq(tr.eventKey, writing)));
  const asked = await open(ADMIN, writing);
  assert.deepEqual([asked.status, asked.body], [200, { status: "writing", reading: null, line: null }], "the sheet asking again while it is written");
  const life = Z.GetTimelineLifeResponse.parse((await call("GET", "/timeline/life", ADMIN)).body);
  const fresh = life.cycles.find((c) => c.reading === "none")!.key;
  const before = calls("timeline_reading");
  const paused = await open(ADMIN, fresh);
  assert.equal(paused.status, 503);
  assert.deepEqual(paused.body, { error: "paused", reason: "paused", message: TIMELINE_PAUSED_LINE });
  assert.equal(calls("timeline_reading"), before);
  assert.ok(!(await rowsFor(P.admin)).some((r) => r.eventKey === fresh));
});

test("db, the admin with no Personal report of their own: 409 on Now and ahead, Life and both of Ask's, 404 on a reading, and the access answer says so", { skip: NO_DB }, async (t) => {
  await seed();
  process.env.ADMIN_USER_ID = NOBODY;
  t.after(() => {
    process.env.ADMIN_USER_ID = ADMIN;
  });
  for (const [method, path, body] of [["GET", "/timeline/now?range=week"], ["GET", "/timeline/life"], ["GET", "/ask"], ["POST", "/ask", { text: "Hi" }]] as const) {
    const r = await call(method, path, NOBODY, body);
    assert.equal(r.status, 409, `${method} ${path}`);
    assert.deepEqual(r.body, { error: "no_personal_report", message: TL.NO_PERSONAL_REPORT_LINE });
  }
  assert.equal((await open(NOBODY, SATURN_ON_ASC)).status, 404);
  const resetsOn = monthOf(new Date()).resetsOn;
  assert.deepEqual((await call("GET", "/timeline/access", NOBODY)).body, { access: true, source: "admin", hasPersonalReport: false, ask: { used: 0, left: 50, cap: 50, resetsOn } });
});

test("db, Ask: a message answers the thread, which reads back; a body Ask cannot take is 400 with Ask's own line and is not one of the month's 50", { skip: NO_DB }, async () => {
  await seed();
  const sent = await call("POST", "/ask", ADMIN, { text: "What does my chart say about how I decide?" });
  assert.equal(sent.status, 200);
  const thread = Z.SendAskMessageResponse.parse(sent.body);
  assert.deepEqual(thread.messages.map((m) => [m.role, m.role === "ask" ? m.text : ""]), [["reader", ""], ["ask", ANSWER]]);
  assert.equal(thread.usage.used, 1);
  const read = await call("GET", "/ask?tz=Asia/Tokyo", ADMIN);
  assert.equal(read.status, 200);
  assert.deepEqual(Z.GetAskThreadResponse.parse(read.body).messages.map((m) => m.id), thread.messages.map((m) => m.id));
  const refusals = [
    [{}, "validation_error", ASK_EMPTY_LINE],
    [{ text: "Hi", choiceId: "c1" }, "validation_error", ASK_EMPTY_LINE],
    [{ text: "   " }, "validation_error", ASK_EMPTY_LINE],
    [{ choiceId: "never-offered" }, "choice_not_offered", ASK_CHOICE_GONE_LINE],
  ] as const;
  for (const [body, error, message] of refusals) {
    const r = await call("POST", "/ask", ADMIN, body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.deepEqual(r.body, { error, message });
  }
  assert.equal((await call("GET", "/timeline/access", ADMIN)).body.ask.used, 1);
});

test("db, Ask's count: each message's days in the zone it sends, 6 a minute, the 7th hears its line; at the month's 50 the next is 429 ask_cap with its day and gives its minute back", { skip: NO_DB }, async (t) => {
  await seed();
  t.after(() => {
    process.env.ADMIN_USER_ID = ADMIN;
  });
  process.env.ADMIN_USER_ID = ASKER;
  const zones = ["Pacific/Kiritimati", "Pacific/Pago_Pago"];
  for (let i = 0; i < LIMITS.ask.limit; i++) {
    const zone = zones[i % 2];
    plans.length = 0;
    const { days, value } = await dayAround(zone, () => call("POST", `/ask?tz=${encodeURIComponent(zone)}`, ASKER, { text: `Question ${i + 1}` }));
    assert.equal(value.status, 200, `message ${i + 1}`);
    const turn = plans[0]?.messages.find((m) => m.role === "user")?.content ?? "";
    const today = turn.split("\n").find((line) => line.startsWith("TODAY:")) ?? "";
    assert.ok(days.some((day) => today.endsWith(`(${day})`)), `message ${i + 1} reads today as ${zone} does: ${today}`);
  }
  const limited = await call("POST", "/ask", ASKER, { text: "One more" });
  assert.equal(limited.status, 429);
  assert.deepEqual(limited.body, { error: "rate_limited", message: LIMIT_LINES.ask, retryAfterSeconds: Number(limited.retryAfter) });

  process.env.ADMIN_USER_ID = CAPPED;
  const { db, askMessagesTable } = await import("@workspace/db");
  const now = Date.now();
  const start = monthOf(new Date(now)).start.getTime();
  await db.insert(askMessagesTable).values(Array.from({ length: 50 }, (_, i) => ({
    id: randomUUID(), userId: CAPPED, role: "reader" as const, body: { text: `Earlier ${i}` }, createdAt: new Date(Math.max(start, now - (i + 1) * 1000)),
  })));
  const resetsOn = monthOf(new Date(now)).resetsOn;
  for (let i = 0; i <= LIMITS.ask.limit; i++) {
    const capped = await call("POST", "/ask", CAPPED, { text: "Is there more?" });
    assert.equal(capped.status, 429, `try ${i + 1}`);
    assert.deepEqual(capped.body, { error: "ask_cap", message: capLine(resetsOn), resetsOn }, `try ${i + 1}: the cap, never the minute's limit`);
    assert.equal(capped.retryAfter, null);
  }
  assert.deepEqual((await call("GET", "/timeline/access", CAPPED)).body.ask, { used: 50, left: 0, cap: 50, resetsOn });
});

test("db, nothing the reader types reaches a log line, through the route and when Ask's model fails (ADR-201)", { skip: NO_DB }, async () => {
  await seed();
  const marker = `Qz${run}Vx`;
  const lines: string[] = [];
  const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
  const loud = logger as unknown as Record<string, (...args: unknown[]) => void>;
  const kept = levels.map((level) => [level, loud[level]] as const);
  for (const level of levels) {
    loud[level] = (...args: unknown[]) => {
      lines.push(args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}\n${a.stack}` : typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    };
  }
  try {
    assert.equal((await call("POST", "/ask", ADMIN, { text: `My secret is ${marker}. What does Saturn mean for me?` })).status, 200);
    fake.failOn = "ask_plan";
    fake.failWith = () => new Error(`outage while reading ${marker}`);
    assert.equal((await call("POST", "/ask", ADMIN, { text: `Again, ${marker}` })).status, 200, "the fallback line, not a failure");
  } finally {
    fake.failOn = null;
    fake.failWith = undefined;
    for (const [level, fn] of kept) loud[level] = fn;
  }
  assert.ok(lines.length > 0, "the outage was logged");
  assert.ok(!lines.some((l) => l.includes(marker)), "no log line holds the reader's words");
});

test("db, GET /home: Your week for the admin in the zone sent, the teaser for a reader without Timeline who owns a finished Personal report, neither on an empty dashboard or signed out", { skip: NO_DB }, async () => {
  await seed();
  const east = await dayAround("Pacific/Kiritimati", () => call("GET", "/home?tz=Pacific/Kiritimati", ADMIN));
  assert.equal(east.value.status, 200);
  const admin = Z.GetHomeResponse.parse(east.value.body);
  assert.ok(admin.week && !("teaser" in east.value.body), "a subscriber gets Your week and no teaser");
  assert.ok(east.days.includes(admin.week.days[0].date));
  const west = await dayAround("Pacific/Pago_Pago", () => call("GET", "/home?tz=Pacific/Pago_Pago", ADMIN));
  assert.ok(west.days.includes(Z.GetHomeResponse.parse(west.value.body).week!.days[0].date));

  const owner = await call("GET", "/home", OWNER);
  assert.equal(owner.status, 200);
  assert.ok(!("week" in owner.body), "no week without Timeline");
  const reader = await T.readerChart({ userId: OWNER, sessionId: `s-${OWNER}` });
  assert.deepEqual(Z.GetHomeResponse.parse(owner.body).teaser, T.teaserView(reader!));

  const empty = { you: null, several: false, people: [], pairs: [], practising: [] };
  assert.deepEqual((await call("GET", "/home", NOBODY)).body, empty, "never on an empty dashboard");
  const signedOut = await call("GET", "/home", null);
  assert.deepEqual(signedOut.body, empty);
});

test("db, deleting one's own Personal report takes their readings and Ask thread, and nobody else's (MB-191)", { skip: NO_DB }, async () => {
  await seed();
  await keep(DELETER, P.deleter, ["cycle.saturn-return.20200101", SATURN_ON_ASC], 2);
  await keep(OWNER, P.owner, ["cycle.saturn-return.20200101"], 1);
  const deleted = await call("DELETE", `/reports/${R.deleter}`, DELETER);
  assert.equal(deleted.status, 204);
  assert.deepEqual([(await rowsFor(P.deleter)).length, (await threadOf(DELETER)).length], [0, 0]);
  assert.deepEqual([(await rowsFor(P.owner)).length, (await threadOf(OWNER)).length], [1, 1], "another reader's stay");
});

test("db, deleting a report on someone else's chart keeps the reader's own; a giver letting go of a claimed chart keeps its subject's; the subject's own delete takes them", { skip: NO_DB }, async () => {
  await seed();
  const own = [(await rowsFor(P.admin)).length, (await threadOf(ADMIN)).length];
  assert.ok(own[0] > 0 && own[1] > 0);
  assert.equal((await call("DELETE", `/reports/${R.adminOther}`, ADMIN)).status, 204);
  assert.deepEqual([(await rowsFor(P.admin)).length, (await threadOf(ADMIN)).length], own, "the admin's own readings and thread stay");

  await keep(SUBJECT, P.given, ["cycle.saturn-return.20200101"], 1);
  assert.equal((await call("DELETE", `/reports/${R.given}`, GIVER)).status, 204, "the giver lets go");
  assert.deepEqual([(await rowsFor(P.given)).length, (await threadOf(SUBJECT)).length], [1, 1], "the subject keeps theirs");
  assert.equal((await call("DELETE", `/reports/${R.given}`, SUBJECT)).status, 204, "the subject deletes their own");
  assert.deepEqual([(await rowsFor(P.given)).length, (await threadOf(SUBJECT)).length], [0, 0]);
});

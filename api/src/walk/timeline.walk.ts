// R16-34: the Timeline walk. Access, the reader's own chart, the teaser, readings written once, and Ask's cap and
// quotes, end to end on a scratch Postgres beside loop.walk.ts and sharing.walk.ts (Timeline acceptance 3 and 10;
// ADR-262, 263; MB-191, MB-197).
// The model is the in-process stand-in of testModel.ts, and the client is pointed at a local server that refuses besides,
// so nothing leaves the machine. Every chart is computed from a committed fixture at run time. The reader is Mira (born
// 1991): Timeline reads no key far past its reader's birth, so a historical chart would find no reading to open.
//
// `pnpm --filter @workspace/api-server run walk` runs it after sharing.walk.ts against `WALK_DATABASE_URL`; without it,
// it skips. Its first statement truncates every table it touches, so a second run starts where the first did.

if (!process.env.WALK_DATABASE_URL) {
  console.log("timeline walk: skipped (no WALK_DATABASE_URL)");
  process.exit(0);
}
process.env.DATABASE_URL = process.env.WALK_DATABASE_URL;
process.env.OPENAI_API_KEY ??= "sk-dummy-walk-never-sent";
delete process.env.CLERK_SECRET_KEY;
// The admin is the one account with Timeline until billing (MB-197).
const ADMIN_ID = "user_walk_admin";
process.env.ADMIN_USER_ID = ADMIN_ID;

import assert from "node:assert/strict";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import express, { type NextFunction, type Request, type Response } from "express";

type Viewer = { user: string | null; session: string };
type FakeRequest = import("../lib/testModel.js").FakeRequest;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const fixture = (path: string) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

const modelStub = http.createServer((_req, res) => {
  res.writeHead(400, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: { message: "the walk calls no model", type: "invalid_request_error" } }));
});
await new Promise<void>((resolve) => modelStub.listen(0, "127.0.0.1", () => resolve()));
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${(modelStub.address() as AddressInfo).port}/v1`;

// Deferred past the env writes above: @workspace/db throws at import unless DATABASE_URL is set.
const { pool } = await import("@workspace/db");
const zod = await import("@workspace/api-zod");
const { chartForProfile } = await import("../lib/profiles.js");
const { grantShare } = await import("../lib/shares.js");
const { ASK_MONTHLY_CAP } = await import("../lib/ask.js");
const { NO_TIMELINE_LINE } = await import("../lib/timelineAccess.js");
const { installFakeModel } = await import("../lib/testModel.js");
const { db } = await import("@workspace/db");
const { logger } = await import("../lib/logger.js");
const { apiHeaders, originGuard, webOrigins } = await import("../middlewares/origin.js");
const { default: router } = await import("../routes/index.js");

const q = (sql: string, params: unknown[] = []) => pool.query(sql, params);

// app.ts's order, with a stub where the cookie and Clerk middleware stand, as loop.walk.ts mounts it.
const app = express();
app.use(apiHeaders());
app.use(originGuard(webOrigins({})));
app.use(express.json({ limit: "32kb" }));
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || "s-none";
  req.log = logger;
  next();
});
app.use("/api", router);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", () => resolve()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

async function call(who: Viewer, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { "x-session": who.session, "content-type": "application/json" };
  if (who.user) headers["x-user"] = who.user;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  const json = res.headers.get("content-type")?.includes("application/json");
  return { status: res.status, body: text && json ? JSON.parse(text) : text || null };
}

const PARAGRAPH = (who: string) =>
  `${who}, you take your time before you decide, and you like to see the whole picture before you choose. Once you have chosen you move steadily, and you rarely turn back. People learn to trust that pace.`;
function natalText(who: string) {
  return {
    overview: { headline: "Steady first, quick later.", concentration: PARAGRAPH(who), claims: [] },
    relationships: { howYouLove: PARAGRAPH(who), claims: [] },
    houses: { houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: `${PARAGRAPH(who)} House ${i + 1}.` })) },
  };
}

async function person(id: string, path: string, owner: Viewer, name: string) {
  const f = fixture(path);
  const chart = chartForProfile({ ...f, birthTimeWindowMinutes: f.birthTimeWindowMinutes ?? 0 });
  await q(
    `insert into profiles (id, session_id, user_id, is_self, name, birth_date, birth_time, birth_place, latitude, longitude, timezone_offset, timezone, birth_time_window_minutes, chart_data)
     values ($1,$2,$3,true,$4,$5,$6,'fixture',$7,$8,$9,$10,$11,$12)`,
    [id, owner.session, owner.user, name, f.birthDate, f.birthTime, f.latitude, f.longitude, chart.timezoneOffset, f.timezone ?? null, f.birthTimeWindowMinutes ?? 0, JSON.stringify(chart)],
  );
}
async function natal(id: string, profileId: string, session: string, who: string) {
  await q("insert into reports (id, profile_id, session_id, type, status, interpretation) values ($1,$2,$3,'natal','complete',$4)", [
    id, profileId, session, JSON.stringify(natalText(who)),
  ]);
}

type StepResult = { label: string; ok: boolean; error?: string };
const results: StepResult[] = [];
async function step(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ label, ok: true });
  } catch (err) {
    results.push({ label, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

const ADMIN = { user: ADMIN_ID, session: "s-admin" };
const READER = { user: "user_reader", session: "s-reader" };
const EMPTY = { user: "user_empty", session: "s-empty" };
const SHARER = { user: "user_sharer", session: "s-sharer" };
const STRANGER = { user: "user_stranger", session: "s-stranger" };
const ANON = { user: null, session: "s-anon" };

const MIRA = "fixtures/sample-people/mira.json";
const CURIE = "fixtures/charts/marie-curie.json";
const ATHENA = "fixtures/charts/athena.json";
const THE_ROUTES = [
  ["GET", "/timeline/now?range=week"],
  ["GET", "/timeline/life"],
  ["POST", "/timeline/readings/contact.saturn.conjunction.ascendant.20260530"],
  ["GET", "/ask"],
  ["POST", "/ask"],
] as const;
const askBody = { text: "What is going on this week?" };
const rowsOf = async (sql: string, params: unknown[] = []) => (await q(sql, params)).rows;
const countOf = async (sql: string, params: unknown[] = []) => Number((await rowsOf(sql, params))[0].n);
const readHome = async (who: Viewer) => {
  const r = await call(who, "GET", "/home");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return zod.GetHomeResponse.parse(r.body);
};

// What a reading says: no date, degree or order, so it fits whichever event the walk opens.
const READING = {
  line: "You think harder about what you take on and why.",
  body: "Astrology reads this stretch as a time when the sky presses on a part of your chart you already know well. Your report describes how you work through things in depth before you commit. This time meets that habit. You may find that old plans feel heavier to carry. You may also find that the plans you still believe in feel clearer. Some days the pressure feels like a weight. Other days it feels like a firm hand on your back. People around you may see you as more serious than usual. You may feel the gap between how calm you look and how you feel inside.",
};
const ANSWER_TEXT = "Your Personal report says how you take your time before you decide. The card below shows that passage as it is written.";

let setupError: unknown = null;
const fake = installFakeModel({ timeline_reading: READING });
try {
  await q(
    "truncate table users, profiles, reports, relationships, relationship_participants, invite_tokens, bundles, credits, report_revisions, spend_ledger, profile_shares, report_workbooks, generation_failures, timeline_readings, ask_messages cascade",
  );
  for (const who of [ADMIN, READER, EMPTY, SHARER, STRANGER]) {
    await q("insert into users (id, email) values ($1, $2)", [who.user, `${who.user!.replace(/^user_/, "")}@example.com`]);
  }
  await person("P-READER", MIRA, READER, "Rhea");
  await natal("R-READER", "P-READER", READER.session, "Rhea");
  await person("P-SHARER", CURIE, SHARER, "Odile");
  await natal("R-SHARER", "P-SHARER", SHARER.session, "Odile");
  await person("P-STRANGER", ATHENA, STRANGER, "Zelda");
  await natal("R-STRANGER", "P-STRANGER", STRANGER.session, "Zelda");
  const calls = () => fake.calls.length;

  await step("no Timeline: a reader with a Personal report, an empty account and a visitor get 403 no_timeline on every Timeline and Ask route, count nothing, call no model (ADR-262)", async () => {
    for (const who of [READER, EMPTY, ANON]) {
      for (const [method, path] of THE_ROUTES) {
        const r = await call(who, method, path, method === "POST" ? askBody : undefined);
        assert.deepEqual([r.status, r.body.error, r.body.message], [403, "no_timeline", NO_TIMELINE_LINE], `${who.user} ${method} ${path}`);
      }
    }
    assert.equal(calls(), 0);
    assert.equal(await countOf("select count(*) as n from ask_messages"), 0);
    assert.equal(await countOf("select count(*) as n from timeline_readings"), 0);
  });

  await step("GET /timeline/access answers both: a reader without it hears false with no Ask count, a visitor 401 (ADR-262)", async () => {
    const none = await call(READER, "GET", "/timeline/access");
    assert.equal(none.status, 200);
    zod.GetTimelineAccessResponse.parse(none.body);
    assert.deepEqual(none.body, { access: false, source: null, hasPersonalReport: true, ask: null });
    const empty = await call(EMPTY, "GET", "/timeline/access");
    assert.deepEqual(empty.body, { access: false, source: null, hasPersonalReport: false, ask: null });
    assert.equal((await call(ANON, "GET", "/timeline/access")).status, 401);
    const admin = await call(ADMIN, "GET", "/timeline/access");
    assert.equal(admin.status, 200);
    zod.GetTimelineAccessResponse.parse(admin.body);
    assert.deepEqual(admin.body, {
      access: true, source: "admin", hasPersonalReport: false,
      ask: { used: 0, left: ASK_MONTHLY_CAP, cap: ASK_MONTHLY_CAP, resetsOn: admin.body.ask.resetsOn },
    });
  });

  await step("the dashboard: the teaser and no week for a reader without Timeline, neither on an empty dashboard (ADR-212, reading 26)", async () => {
    const home = await readHome(READER);
    assert.ok(home.you, "the reader's own report seats them");
    assert.ok(home.teaser, "a teaser");
    assert.equal(home.week, undefined);
    assert.equal(home.teaser.cycles.length > 0, true);
    for (const who of [EMPTY, ANON]) {
      const empty = await readHome(who);
      assert.equal(empty.teaser, undefined, who.session);
      assert.equal(empty.week, undefined, who.session);
    }
  });

  await step("the admin with no Personal report: 409 no_personal_report on Now, Life and Ask, no reading to open, neither section on the dashboard", async () => {
    for (const [method, path] of [["GET", "/timeline/now?range=week"], ["GET", "/timeline/life"], ["GET", "/ask"], ["POST", "/ask"]] as const) {
      const r = await call(ADMIN, method, path, method === "POST" ? askBody : undefined);
      assert.deepEqual([r.status, r.body.error], [409, "no_personal_report"], `${method} ${path}`);
    }
    const open = await call(ADMIN, "POST", "/timeline/readings/contact.saturn.conjunction.ascendant.20260530");
    assert.deepEqual([open.status, open.body.error], [404, "not_found"]);
    const home = await readHome(ADMIN);
    assert.deepEqual([home.week, home.teaser], [undefined, undefined]);
    assert.equal(calls(), 0);
    assert.equal(await countOf("select count(*) as n from ask_messages"), 0);
  });

  await person("P-ADMIN", MIRA, ADMIN, "Mira");
  await natal("R-ADMIN", "P-ADMIN", ADMIN.session, "Mira");

  let openKeys: string[] = [];
  await step("the admin with a Personal report: Now, Life and the dashboard answer 200, Your week and no teaser (ADR-211, 262)", async () => {
    const now = await call(ADMIN, "GET", "/timeline/now?range=month");
    assert.equal(now.status, 200, JSON.stringify(now.body));
    zod.GetTimelineNowResponse.parse(now.body);
    openKeys = now.body.events.filter((e: any) => e.kind === "contact" && e.reading === "none").map((e: any) => e.key);
    assert.ok(openKeys.length >= 2, `${openKeys.length} contacts in the month to open`);
    const life = await call(ADMIN, "GET", "/timeline/life");
    assert.equal(life.status, 200, JSON.stringify(life.body));
    zod.GetTimelineLifeResponse.parse(life.body);
    const home = await readHome(ADMIN);
    assert.ok(home.week, "Your week");
    assert.equal(home.teaser, undefined);
    assert.equal(home.week!.days.length, 7);
    const access = await call(ADMIN, "GET", "/timeline/access");
    assert.deepEqual([access.body.access, access.body.source, access.body.hasPersonalReport], [true, "admin", true]);
    assert.equal(calls(), 0, "a view writes nothing on its own");
  });

  await step("two opens write one reading: the second finds the first's row, and two at once claim one write (ADR-210)", async () => {
    const [first, second] = openKeys;
    const one = await call(ADMIN, "POST", `/timeline/readings/${first}`);
    assert.equal(one.status, 200, JSON.stringify(one.body));
    zod.OpenTimelineReadingResponse.parse(one.body);
    assert.equal(one.body.status, "ready");
    assert.equal(one.body.reading.line, READING.line);
    const again = await call(ADMIN, "POST", `/timeline/readings/${first}`);
    assert.equal(again.status, 200);
    assert.deepEqual([again.body.status, again.body.reading.line], ["ready", READING.line]);
    assert.equal(await countOf("select count(*) as n from timeline_readings where profile_id = 'P-ADMIN' and event_key = $1", [first]), 1);
    assert.equal(fake.calls.filter((c) => c === "timeline_reading").length, 1);

    const both = await Promise.all([call(ADMIN, "POST", `/timeline/readings/${second}`), call(ADMIN, "POST", `/timeline/readings/${second}`)]);
    assert.deepEqual(both.map((r) => r.status), [200, 200]);
    assert.ok(both.every((r) => ["ready", "writing"].includes(r.body.status)), JSON.stringify(both.map((r) => r.body.status)));
    assert.equal(await countOf("select count(*) as n from timeline_readings where profile_id = 'P-ADMIN' and event_key = $1", [second]), 1);
    assert.equal(fake.calls.filter((c) => c === "timeline_reading").length, 2, "one write for each key");
    const view = await call(ADMIN, "GET", "/timeline/now?range=month");
    const shown = view.body.events.filter((e: any) => e.key === first || e.key === second).map((e: any) => e.reading);
    assert.ok(shown.every((s: unknown) => s === "ready" || (s as any)?.status === "ready" || s === "writing"), JSON.stringify(shown));
  });

  // The model reads the library it is shown; this stand-in plans a quote from the second report in the list and
  // remembers what each call was sent, so the walk can see what the model was and was not given.
  const sent: string[] = [];
  const planQuote = {
    intent: "answer", tools: [{ tool: "quote", report: "r2", section: "overview" }], question: "", choices: [],
  };
  const askWith = (cards: string[]) => {
    fake.replies.ask_plan = (req: FakeRequest) => (sent.push(JSON.stringify(req.messages)), planQuote);
    fake.replies.ask_answer = (req: FakeRequest) => (sent.push(JSON.stringify(req.messages)), { text: ANSWER_TEXT, cards });
  };

  await step("quote refuses an unshared report: the plan names a report the reader cannot read and gets no card, and the model was never sent its words", async () => {
    askWith([]);
    const r = await call(ADMIN, "POST", "/ask", { text: "What does a report of someone else say about me?" });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    zod.SendAskMessageResponse.parse(r.body);
    const reply = r.body.messages.at(-1);
    assert.deepEqual([reply.role, reply.cards], ["ask", []]);
    assert.equal(sent.length > 0, true);
    assert.doesNotMatch(sent.join("\n"), /Zelda|Odile/, "no unshared name reaches the model");
  });

  await step("quote reads a shared report: R15's grant puts the sharer's Personal report in the library, and the card holds its words (ADR-235)", async () => {
    await grantShare(db, { profileId: "P-SHARER", ownerUserId: SHARER.user!, readerUserId: ADMIN.user!, inviteId: null });
    sent.length = 0;
    askWith(["c1"]);
    const r = await call(ADMIN, "POST", "/ask", { text: "What does Odile's report say?" });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const reply = r.body.messages.at(-1);
    assert.equal(reply.cards.length, 1);
    assert.deepEqual(
      [reply.cards[0].kind, reply.cards[0].reportId, reply.cards[0].reportName, reply.cards[0].text],
      ["quote", "R-SHARER", "Odile", PARAGRAPH("Odile")],
    );
    assert.match(sent.join("\n"), /Odile/, "the model is shown the shared report");
    assert.doesNotMatch(sent.join("\n"), /Zelda/);
  });

  await step("Ask's cap: the 51st message of a UTC month answers 429 ask_cap, the count says 0 left, and no model is called (ADR-263, reading 13)", async () => {
    const used = await countOf("select count(*) as n from ask_messages where user_id = $1 and role = 'reader'", [ADMIN.user]);
    assert.equal(used, 2);
    // Messages 3 to 49 as stored rows, so the walk sends only the last two through the route.
    await q(
      `insert into ask_messages (id, user_id, role, body, created_at)
       select $1 || '-' || g, $2, 'reader', '{"text":"filler"}'::jsonb, now() - (g || ' seconds')::interval from generate_series(1, $3) g`,
      [randomUUID(), ADMIN.user, ASK_MONTHLY_CAP - 1 - used],
    );
    askWith([]);
    fake.replies.ask_plan = { intent: "off_topic", tools: [], question: "", choices: [] };
    const fiftieth = await call(ADMIN, "POST", "/ask", { text: "One more." });
    assert.equal(fiftieth.status, 200, JSON.stringify(fiftieth.body));
    assert.deepEqual(fiftieth.body.usage, { used: 50, left: 0, cap: 50, resetsOn: fiftieth.body.usage.resetsOn });
    const before = calls();
    const rows = await countOf("select count(*) as n from ask_messages where user_id = $1", [ADMIN.user]);
    const capped = await call(ADMIN, "POST", "/ask", { text: "And one past the cap." });
    assert.equal(capped.status, 429, JSON.stringify(capped.body));
    assert.equal(capped.body.error, "ask_cap");
    assert.match(capped.body.resetsOn, /^\d{4}-\d{2}-01$/);
    assert.equal(calls(), before, "no model call");
    assert.equal(await countOf("select count(*) as n from ask_messages where user_id = $1", [ADMIN.user]), rows, "nothing stored");
    const access = await call(ADMIN, "GET", "/timeline/access");
    assert.deepEqual(access.body.ask, { used: 50, left: 0, cap: 50, resetsOn: capped.body.resetsOn });
    const thread = await call(ADMIN, "GET", "/ask");
    assert.equal(thread.status, 200);
    assert.equal(thread.body.usage.left, 0);
  });

  await step("deleting the Personal report takes its readings and its Ask thread, and only those (MB-191)", async () => {
    // Another account's rows, which the delete must leave alone.
    await q(
      "insert into timeline_readings (id, user_id, profile_id, event_key, basis, status, reading) values ('kept-reading', $1, 'P-SHARER', 'contact.saturn.square.sun.20261201', 'x', 'failed', null)",
      [SHARER.user],
    );
    await q("insert into ask_messages (id, user_id, role, body) values ('kept-message', $1, 'reader', '{\"text\":\"hi\"}'::jsonb)", [SHARER.user]);
    assert.equal(await countOf("select count(*) as n from timeline_readings where profile_id = 'P-ADMIN'"), 2);
    assert.ok((await countOf("select count(*) as n from ask_messages where user_id = $1", [ADMIN.user])) > 50);

    const gone = await call(ADMIN, "DELETE", "/reports/R-ADMIN");
    assert.equal(gone.status, 204);
    assert.equal(await countOf("select count(*) as n from timeline_readings where profile_id = 'P-ADMIN'"), 0);
    assert.equal(await countOf("select count(*) as n from ask_messages where user_id = $1", [ADMIN.user]), 0);
    assert.equal(await countOf("select count(*) as n from timeline_readings where id = 'kept-reading'"), 1);
    assert.equal(await countOf("select count(*) as n from ask_messages where id = 'kept-message'"), 1);
    const access = await call(ADMIN, "GET", "/timeline/access");
    assert.deepEqual([access.body.hasPersonalReport, access.body.ask.used], [false, 0]);
    assert.equal((await call(ADMIN, "GET", "/ask")).status, 409);
  });
} catch (err) {
  setupError = err;
} finally {
  fake.restore();
  server.close();
  modelStub.close();
  await pool.end();
}

if (setupError) {
  console.error("timeline walk: could not finish setup —", setupError);
  process.exit(1);
}

for (const r of results) console.log(r.ok ? `ok  ${r.label}` : `FAIL ${r.label}: ${r.error}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\ntimeline walk: ${results.length - failed}/${results.length} rules passed; ${fake.calls.length} stubbed model calls.`);
process.exit(failed ? 1 : 0);

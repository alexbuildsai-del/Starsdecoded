/**
 * What a log line may keep (ADR-201, reading 17): the ids of reports, profiles and requests, an error and a section.
 * What it loses: birth data, coordinates, an address, a name, a Clerk id, a cookie and any token, even when a careless
 * line logs a whole request. Every line is read as production writes it, from a buffer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import pinoHttp from "pino-http";
import { DrizzleQueryError } from "drizzle-orm";
import { createLogger, httpSerializers, logPath } from "./logger.js";
import { mintInviteToken } from "./inviteToken.js";

function buffer() {
  const lines: string[] = [];
  return { lines, dest: { write: (s: string) => void lines.push(s) }, text: () => lines.join("") };
}

const PERSON = {
  name: "Marie Curie",
  birthDate: "1867-11-07",
  birthTime: "11:44",
  birthPlace: "Warsaw, Poland",
  latitude: 52.2297,
  longitude: 21.0122,
  timezone: "Europe/Warsaw",
  email: "marie.sklodowska@example.com",
  recipientName: "Pierre",
  note: "For Pierre, at last",
};
const CLERK_ID = "user_2mRbq9ZKXyLwV3pT8nC4dEfGhJk";
const SESSION = "6f1c2d3e-4b5a-4c6d-8e7f-90a1b2c3d4e5";
const BEARER = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzJtUmJxOVoifQ.c2lnbmF0dXJlLW5vdC1yZWFs";
const QUERY_TOKEN = "q7Rk2LmN9pXc4VbZ";
const IP = "203.0.113.7";
const INSERT = 'insert into "profiles" ("name", "birth_date", "birth_time", "birth_place", "latitude", "longitude") values ($1, $2, $3, $4, $5, $6)';

// Made up here; the edge's own value lives only in the Vercel and Railway dashboards.
const EDGE = "edge-value-not-real";
const POSTCODE = "00-950";

const SECRETS = [
  "Marie", "Curie", "sklodowska", "1867-11-07", "11:44", "Warsaw", "52.2297", "21.0122", "Pierre", "@example.com",
  CLERK_ID, SESSION, BEARER, QUERY_TOKEN, IP, EDGE, POSTCODE,
];

/** What a call through our edge also carries: the edge's value, the visitor's address and where Vercel places them. */
const THROUGH_EDGE = {
  "x-edge-proxy-secret": EDGE,
  "x-vercel-forwarded-for": IP,
  "x-vercel-ip-city": "Warsaw",
  "x-vercel-ip-country": "PL",
  "x-vercel-ip-country-region": "14",
  "x-vercel-ip-postal-code": POSTCODE,
  "x-vercel-ip-latitude": String(PERSON.latitude),
  "x-vercel-ip-longitude": String(PERSON.longitude),
};

test("a full request, logged whole by a careless route, holds none of the person, their tokens or their cookie", async (t) => {
  const { token } = mintInviteToken();
  const out = buffer();
  const app = express();
  app.use(pinoHttp({ logger: createLogger({ LOG_LEVEL: "info" }, out.dest), serializers: httpSerializers }));
  app.use(express.json());
  app.post("/api/invites/:token/claim", (req, res) => {
    req.log.info({ body: req.body, headers: req.headers, query: req.query, user: { id: CLERK_ID, email: PERSON.email, firstName: "Marie" } }, "a careless line");
    req.log.warn({ ...req.body, userId: CLERK_ID, sessionId: SESSION, token: req.params.token, reportId: "rep-1", profileId: "prof-1" }, "a flat one");
    const values = [PERSON.name, PERSON.birthDate, PERSON.birthTime, PERSON.birthPlace, PERSON.latitude, PERSON.longitude];
    const err = new DrizzleQueryError(INSERT, values, new Error("connect ECONNREFUSED 127.0.0.1:5432"));
    req.log.error({ err, section: "natal:mind", reportId: "rep-1" }, "a failed query");
    req.log.warn({ id: "rep-1", code: "internal", message: err.message }, "report failed");
    res.status(201).json({ ok: true });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const { port } = server.address() as AddressInfo;
  const res = await fetch(`http://127.0.0.1:${port}/api/invites/${token}/claim?token=${QUERY_TOKEN}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `sd_session_id=${SESSION}`, authorization: `Bearer ${BEARER}`, "x-forwarded-for": IP, ...THROUGH_EDGE },
    body: JSON.stringify(PERSON),
  });
  assert.equal(res.status, 201);
  await res.text();
  for (let i = 0; i < 100 && !out.text().includes("request completed"); i++) await new Promise((resolve) => setTimeout(resolve, 10));

  const text = out.text();
  assert.equal(out.lines.length, 5);
  for (const secret of [...SECRETS, token]) assert.ok(!text.includes(secret), `the log holds ${secret}`);

  const lines = out.lines.map((l) => JSON.parse(l));
  for (const line of lines) assert.deepEqual(line.req, { id: lines[0].req.id, method: "POST", url: "/api/invites/:token/claim" });
  const [careless, flat, failed, reportFailed, completed] = lines;
  assert.equal(careless.body.birthDate, "[Redacted]");
  assert.equal(careless.headers.cookie, "[Redacted]");
  for (const header of Object.keys(THROUGH_EDGE)) assert.equal(careless.headers[header], "[Redacted]", header);
  assert.equal(careless.headers["content-type"], "application/json", "a header that names nobody stays");
  assert.equal(careless.user, "[Redacted]");
  assert.deepEqual([flat.reportId, flat.profileId], ["rep-1", "prof-1"]);
  assert.equal(failed.section, "natal:mind");
  assert.equal(failed.err.type, "DrizzleQueryError");
  assert.equal(failed.err.query, INSERT, "the statement stays, its parameters go");
  assert.match(failed.err.message, /ECONNREFUSED/, "the cause stays");
  assert.match(failed.err.stack, /^Error: Failed query: insert into "profiles"/);
  assert.equal(failed.err.params, undefined);
  assert.equal(reportFailed.message, `Failed query: ${INSERT}`);
  assert.equal(completed.res.statusCode, 201);
});

test("every personal key is censored at the top of a line and one level down; err, a section and the ids stay", () => {
  const out = buffer();
  const log = createLogger({}, out.dest);
  class NamedError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "NamedError";
    }
  }
  const row = { id: "prof-1", user_id: CLERK_ID, session_id: SESSION, birth_date: PERSON.birthDate, birth_place: PERSON.birthPlace, recipient_name: "Pierre" };
  log.warn({
    ...PERSON, to: PERSON.email, userId: CLERK_ID, claimedByUserId: CLERK_ID,
    body: { ...PERSON, to: PERSON.email, userId: CLERK_ID }, profile: row,
    err: new NamedError("the write failed"), error: { name: "validation_error", message: "Invalid `to` field", statusCode: 422 },
    section: "pair:partners02", reportId: "rep-1", profileId: "prof-1", writeId: "w-1",
  }, "every key");

  const line = JSON.parse(out.lines[0]);
  for (const key of [...Object.keys(PERSON), "to", "userId", "claimedByUserId"]) assert.equal(line[key], "[Redacted]", key);
  for (const key of [...Object.keys(PERSON), "to", "userId"]) assert.equal(line.body[key], "[Redacted]", `body.${key}`);
  for (const key of ["user_id", "session_id", "birth_date", "birth_place", "recipient_name"]) assert.equal(line.profile[key], "[Redacted]", `profile.${key}`);
  assert.equal(line.profile.id, "prof-1");
  assert.deepEqual([line.err.type, line.err.name, line.err.message], ["NamedError", "NamedError", "the write failed"]);
  assert.match(line.err.stack, /^NamedError: the write failed/);
  assert.deepEqual(line.error, { name: "validation_error", message: "Invalid `to` field", statusCode: 422 });
  assert.deepEqual([line.section, line.reportId, line.profileId, line.writeId, line.msg], ["pair:partners02", "rep-1", "prof-1", "w-1", "every key"]);
  for (const secret of SECRETS) assert.ok(!out.text().includes(secret), `the line holds ${secret}`);
});

test("an address or a failed query's parameters in free text go too, wherever pino would print them", () => {
  const out = buffer();
  const log = createLogger({}, out.dest);
  const failed = new DrizzleQueryError('update "users" set "email" = $1', [PERSON.email]);
  log.error(failed);
  log.warn({ err: failed.message, detail: `no account for ${PERSON.email}`, error: { message: `bounced: ${PERSON.email}` } }, "free text");
  log.info(`mailed ${PERSON.email}`);
  assert.equal(out.lines.length, 3);
  assert.ok(!out.text().includes("@example.com"), out.text());
  const [first, second, third] = out.lines.map((l) => JSON.parse(l));
  assert.equal(first.msg, 'Failed query: update "users" set "email" = $1');
  assert.deepEqual([second.err, second.detail, second.error.message], ['Failed query: update "users" set "email" = $1', "no account for [email]", "bounced: [email]"]);
  assert.equal(third.msg, "mailed [email]");
});

test("LOG_LEVEL still sets the floor, and info is the default", () => {
  const level = (env: NodeJS.ProcessEnv) => {
    const out = buffer();
    const log = createLogger(env, out.dest);
    log.debug("debug");
    log.info("info");
    log.warn("warn");
    return out.lines.map((l) => JSON.parse(l).msg);
  };
  assert.deepEqual(level({}), ["info", "warn"]);
  assert.deepEqual(level({ LOG_LEVEL: "warn" }), ["warn"]);
  assert.deepEqual(level({ LOG_LEVEL: "debug" }), ["debug", "info", "warn"]);
  assert.deepEqual(level({ LOG_LEVEL: "silent" }), []);
});

test("the request line names a path's token by its parameter and keeps every id", () => {
  const { token } = mintInviteToken();
  assert.equal(logPath(`/api/invites/${token}`), "/api/invites/:token");
  assert.equal(logPath(`/api/invites/${token}/claim?next=%2Fhome`), "/api/invites/:token/claim");
  assert.equal(logPath("/API/Invites/truncated-in-an-email"), "/API/Invites/:token", "routing ignores case, and a broken token is still one");
  assert.equal(logPath("/api/invites"), "/api/invites");
  assert.equal(logPath(`/api/claim/${token}`), "/api/claim/:token", "a token's shape gives it away on any path");
  assert.equal(logPath(`/api/x/${BEARER}/y`), "/api/x/:token/y");
  const report = "0f8fad5b-d9cb-469f-a165-70867728950e";
  assert.equal(logPath(`/api/reports/${report}/status?token=${QUERY_TOKEN}`), `/api/reports/${report}/status`);
  assert.equal(logPath("/api/admin/prompts/natal:system#top"), "/api/admin/prompts/natal:system");
  assert.equal(logPath(undefined), undefined);
});

test("the request line keeps the route and the id and nothing else, whatever the request carried", () => {
  const req = { id: "req-1", method: "POST", url: `/api/reports?email=${PERSON.email}`, headers: { cookie: SESSION, authorization: BEARER }, body: PERSON, query: { token: QUERY_TOKEN } };
  assert.deepEqual(httpSerializers.req(req), { id: "req-1", method: "POST", url: "/api/reports" });
  assert.deepEqual(httpSerializers.res({ statusCode: 429, headers: { "set-cookie": [`sd_session_id=${SESSION}`] } } as { statusCode: number }), { statusCode: 429 });
  assert.equal(httpSerializers.req({}).url, undefined);
});

test("a request, a response and a header block logged under their own keys lose the credential headers and keep the rest", () => {
  const out = buffer();
  createLogger({}, out.dest).info({
    req: { method: "GET", headers: { authorization: `Bearer ${BEARER}`, cookie: `sd_session_id=${SESSION}`, "x-edge-proxy-secret": EDGE, accept: "text/html" } },
    res: { statusCode: 200, headers: { "set-cookie": [`sd_session_id=${SESSION}`], "content-type": "text/html" } },
  }, "whole objects");
  const line = JSON.parse(out.lines[0]);
  assert.deepEqual([line.req.headers.authorization, line.req.headers.cookie, line.req.headers["x-edge-proxy-secret"]], ["[Redacted]", "[Redacted]", "[Redacted]"]);
  assert.equal(line.req.headers.accept, "text/html");
  assert.equal(line.res.headers["set-cookie"], "[Redacted]");
  assert.equal(line.res.headers["content-type"], "text/html");
  assert.ok(!out.text().includes(SESSION) && !out.text().includes(BEARER) && !out.text().includes(EDGE));
});

test("every address in a string goes, whatever its case, and a bare @ handle is not one", () => {
  const out = buffer();
  const log = createLogger({}, out.dest);
  log.warn({ detail: "from Marie.Curie+news@Example.COM to pierre@lab.example.co.uk, cc a_b@x-y.org" }, "see @marie on example.com");
  const line = JSON.parse(out.lines[0]);
  assert.equal(line.detail, "from [email] to [email], cc [email]");
  assert.equal(line.msg, "see @marie on example.com");
});

test("a failed query's parameters go from an error nested in another's cause, and the statement of each stays", () => {
  const out = buffer();
  const inner = new DrizzleQueryError('select * from "profiles" where "email" = $1', [PERSON.email], new Error("deadlock detected"));
  const outer = new Error("write failed", { cause: inner });
  const log = createLogger({}, out.dest);
  log.error({ err: inner, reportId: "rep-1" });
  log.error({ err: outer });
  const [first, second] = out.lines.map((l) => JSON.parse(l));
  assert.equal(first.err.message, 'Failed query: select * from "profiles" where "email" = $1: deadlock detected', "the statement and the cause stay");
  assert.equal(first.reportId, "rep-1");
  assert.equal(second.err.message, 'write failed: Failed query: select * from "profiles" where "email" = $1: deadlock detected', "pino joins a cause's message to its parent's");
  assert.ok(!out.text().includes("@example.com"), out.text());
});

test("a value that is not an error reaches the err key as it is, and an address in it still goes", () => {
  const out = buffer();
  const log = createLogger({}, out.dest);
  log.warn({ err: `provider said no to ${PERSON.email}` }, "string");
  log.warn({ err: undefined, code: 7 }, "nothing");
  log.warn({ err: null }, "null");
  const [str, none, nul] = out.lines.map((l) => JSON.parse(l));
  assert.equal(str.err, "provider said no to [email]");
  assert.equal("err" in none, false);
  assert.equal(none.code, 7);
  assert.equal(nul.err, null);
});

test("only a token's shape or an invite route changes a path: each piece must be 16 characters, and a trailing slash or a bare route is left", () => {
  const piece = (n: number) => "a".repeat(n);
  assert.equal(logPath(`/x/${piece(16)}.${piece(16)}`), "/x/:token", "16 and 16 is a token");
  assert.equal(logPath(`/x/${piece(15)}.${piece(16)}`), `/x/${piece(15)}.${piece(16)}`, "15 and 16 is not");
  assert.equal(logPath(`/x/${piece(16)}.${piece(15)}`), `/x/${piece(16)}.${piece(15)}`, "16 and 15 is not");
  assert.equal(logPath(`/x/${piece(16)}.${piece(16)}.${piece(16)}/`), "/x/:token/", "a JWT's three pieces, and the slash after it");
  assert.equal(logPath("/api/invites/"), "/api/invites/", "no token, nothing to name");
  assert.equal(logPath("/api/invites/abc"), "/api/invites/:token");
  assert.equal(logPath("/assets/index-3f9a7c1b.min.js"), "/assets/index-3f9a7c1b.min.js", "a bundle's name is not a token");
  assert.equal(logPath(""), "");
  assert.equal(logPath("/?token=x"), "/");
});

test("a refusal's words and a section's last reply reach no line: the pair's failed write and the horizon pass keep the section and the prefix", async (t) => {
  // The generator's modules read these at import; nothing here calls the model or the database.
  process.env.OPENAI_API_KEY ??= "test-key-never-sent";
  process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
  const { SectionError } = await import("./aiInterpretation.js");
  const { ReportFailure } = await import("./failureReasons.js");
  const words = `I can't help with ${PERSON.name}, born ${PERSON.birthDate} at ${PERSON.birthTime} in ${PERSON.birthPlace}.\nAsk me something else.`;
  // Refused on the second attempt, as callStructured throws it, after a first reply a check blocked.
  const refused = new SectionError("pair:twoCharts", `model refused: ${words}`, {
    errors: ["strengths.0: 31 words, a card line takes 20 at most", `model refused: ${words}`],
    lastReply: JSON.stringify({ strengths: ["Marie finishes what Pierre starts."] }),
  });
  // As the pair generator hands it to compatibility.ts.
  const failed = new ReportFailure("quality", refused.message, refused);

  const out = buffer();
  const app = express();
  app.use(pinoHttp({ logger: createLogger({ LOG_LEVEL: "info" }, out.dest), serializers: httpSerializers }));
  app.post("/api/compatibility", (req, res) => {
    req.log.error({ err: failed, reportId: "rep-1" }, "Compatibility generation failed");
    res.status(201).json({ id: "rep-1" });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/compatibility`, { method: "POST" });
  assert.equal(res.status, 201);
  await res.text();
  for (let i = 0; i < 100 && !out.text().includes("request completed"); i++) await new Promise((resolve) => setTimeout(resolve, 10));

  const log = createLogger({}, out.dest);
  log.error({ err: refused, reportId: "rep-2" }, "horizon pass failed; previous text and profile restored");
  log.error(refused);
  log.warn({ err: refused.message, section: refused.key }, "failure log: rows not written; muted for a minute");

  const text = out.text();
  for (const secret of [...SECRETS, "can't help", "Ask me", "finishes"]) assert.ok(!text.includes(secret), `the log holds ${secret}`);
  const lines = out.lines.map((l) => JSON.parse(l));
  const line = (msg: string) => lines.find((l) => l.msg === msg);
  const cut = "pair:twoCharts: model refused: …";

  const pair = line("Compatibility generation failed");
  assert.deepEqual([pair.err.type, pair.err.code, pair.err.message, pair.err.stack, pair.reportId], ["ReportFailure", "quality", cut, `ReportFailure: ${cut}`, "rep-1"]);

  const horizon = line("horizon pass failed; previous text and profile restored");
  assert.deepEqual([horizon.err.type, horizon.err.key, horizon.err.message, horizon.reportId], ["SectionError", "pair:twoCharts", cut, "rep-2"]);
  assert.equal(horizon.err.stack, `SectionError: ${cut}`);
  for (const key of ["errors", "aggregateErrors"]) {
    assert.deepEqual(horizon.err[key], ["strengths.0: 31 words, a card line takes 20 at most", "model refused: …"], key);
  }
  assert.equal("lastReply" in horizon.err, false);

  assert.equal(line(cut).err.message, cut, "an error logged alone gives its message as the line's");
  assert.equal(line("failure log: rows not written; muted for a minute").err, cut);
});

test("the edge's header is censored under every key a header block is logged under, at the top of a line and one level down (ADR-224)", () => {
  const out = buffer();
  const log = createLogger({}, out.dest);
  const block = { "x-edge-proxy-secret": EDGE, "x-vercel-forwarded-for": IP, "content-type": "application/json" };
  log.info({ "x-edge-proxy-secret": EDGE }, "at the top");
  log.info({ headers: block, meta: block, rawBlock: block }, "one level down, under three names");
  log.info({ req: { headers: { "x-edge-proxy-secret": EDGE, accept: "text/html" } } }, "a request's own headers");
  log.child({ headers: block }).info("bound to a child");
  log.child({ "x-edge-proxy-secret": EDGE }).warn({ headers: block }, "a child and a line");
  assert.equal(out.lines.length, 5);
  assert.ok(!out.text().includes(EDGE), "the value is in no line");
  assert.ok(!out.text().includes(IP), "nor is the address beside it");
  const [top, level, req, child, both] = out.lines.map((l) => JSON.parse(l));
  assert.equal(top["x-edge-proxy-secret"], "[Redacted]");
  for (const key of ["headers", "meta", "rawBlock"]) {
    assert.equal(level[key]["x-edge-proxy-secret"], "[Redacted]", key);
    assert.equal(level[key]["content-type"], "application/json", `${key} keeps the rest`);
  }
  assert.equal(req.req.headers["x-edge-proxy-secret"], "[Redacted]");
  assert.equal(child.headers["x-edge-proxy-secret"], "[Redacted]");
  assert.deepEqual([both["x-edge-proxy-secret"], both.headers["x-edge-proxy-secret"]], ["[Redacted]", "[Redacted]"]);
});

test("a header block in an error's own fields, in a list or two levels down never prints the edge's value (R14-14: the secret is never in a log line)", () => {
  const block = { "x-edge-proxy-secret": EDGE, "content-type": "application/json" };
  const withHeaders = Object.assign(new Error("upstream said no"), { headers: block });
  const shapes: Record<string, unknown> = {
    "an error carrying a header block": { err: withHeaders },
    "an error under `error`": { error: withHeaders },
    "an error carrying a request": { err: Object.assign(new Error("failed"), { request: { headers: block } }) },
    "a list of header blocks": { headers: [block] },
    "a header block two levels down": { ctx: { req: { headers: block } } },
    "a response's headers": { res: { statusCode: 500, headers: block } },
    "the raw header list of a request": { rawHeaders: ["x-edge-proxy-secret", EDGE, "content-type", "application/json"] },
  };
  const leaked = Object.entries(shapes).filter(([, fields]) => {
    const out = buffer();
    createLogger({}, out.dest).error(fields as object, "a failure");
    return out.text().includes(EDGE);
  }).map(([shape]) => shape);
  assert.deepEqual(leaked, [], "these shapes print the value");
});

test("set, the edge's value goes wherever pino would print it, under any name, in free text, a key, a child or an error, and the rest of the line stays", () => {
  const out = buffer();
  const log = createLogger({ EDGE_PROXY_SECRET: EDGE }, out.dest);
  const failed = Object.assign(new Error(`upstream refused ${EDGE}`), { sent: { "x-custom": EDGE } });
  log.child({ bound: `edge=${EDGE}` }).warn(
    { detail: `Bearer ${EDGE} sent`, deep: { a: { b: { c: [`one ${EDGE} two`, EDGE] } } }, [`k-${EDGE}`]: "a key", err: failed, reportId: "rep-1" },
    `calling with ${EDGE}`,
  );
  log.info("%s was the header", EDGE);
  assert.equal(out.lines.length, 2);
  assert.ok(!out.text().includes(EDGE), out.text());
  for (const text of out.lines) assert.ok(text.endsWith("}\n"), "one line each, as pino ends it");
  const [line, formatted] = out.lines.map((l) => JSON.parse(l));
  assert.equal(line.bound, "edge=[Redacted]");
  assert.equal(line.detail, "Bearer [Redacted] sent");
  assert.deepEqual(line.deep, { a: { b: { c: ["one [Redacted] two", "[Redacted]"] } } });
  assert.equal(line["k-[Redacted]"], "a key");
  assert.deepEqual([line.err.type, line.err.message, line.err.sent], ["Error", "upstream refused [Redacted]", { "x-custom": "[Redacted]" }]);
  assert.match(line.err.stack, /^Error: upstream refused \[Redacted\]\n {4}at /);
  assert.deepEqual([line.level, line.reportId, line.msg], [40, "rep-1", "calling with [Redacted]"]);
  assert.equal(formatted.msg, "[Redacted] was the header");
});

test("set, pino-http's own lines lose the value too, under a key nobody named and in the raw header list", async (t) => {
  const out = buffer();
  const app = express();
  app.use(pinoHttp({ logger: createLogger({ EDGE_PROXY_SECRET: EDGE }, out.dest), serializers: httpSerializers }));
  app.get("/api/healthz", (req, res) => {
    req.log.info({ seen: req.headers["x-edge-proxy-secret"], raw: req.rawHeaders }, "a careless line");
    res.json({ ok: true });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/healthz`;
  const res = await fetch(url, { headers: { "x-edge-proxy-secret": EDGE, accept: "application/json" } });
  assert.equal(res.status, 200);
  await res.text();
  for (let i = 0; i < 100 && !out.text().includes("request completed"); i++) await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(out.lines.length, 2);
  assert.ok(!out.text().includes(EDGE), out.text());
  const careless = JSON.parse(out.lines[0]);
  assert.equal(careless.seen, "[Redacted]");
  assert.equal(careless.raw[careless.raw.indexOf("x-edge-proxy-secret") + 1], "[Redacted]");
  assert.equal(careless.raw[careless.raw.indexOf("accept") + 1], "application/json", "the rest of the list stays");
  assert.deepEqual(careless.req, { id: careless.req.id, method: "GET", url: "/api/healthz" });
});

test("unset, the header's name in any case still censors what it names: a block, a raw list and a list of pairs", () => {
  const out = buffer();
  createLogger({}, out.dest).warn({
    upstream: { request: { headers: { "X-Edge-Proxy-Secret": EDGE, accept: "text/html" } } },
    raw: ["X-EDGE-PROXY-SECRET", EDGE, "Accept", "text/html"],
    pairs: [["x-edge-proxy-secret", EDGE], ["accept", "text/html"]],
  }, "by name");
  assert.ok(!out.text().includes(EDGE), out.text());
  const line = JSON.parse(out.lines[0]);
  assert.deepEqual(line.upstream.request.headers, { "X-Edge-Proxy-Secret": "[Redacted]", accept: "text/html" });
  assert.deepEqual(line.raw, ["X-EDGE-PROXY-SECRET", "[Redacted]", "Accept", "text/html"]);
  assert.deepEqual(line.pairs, [["x-edge-proxy-secret", "[Redacted]"], ["accept", "text/html"]]);
  assert.equal(line.msg, "by name");
});

test("the value is read trimmed when the logger is made and found as JSON writes it; a blank one is none, and a line with neither the value nor the name goes out as pino wrote it", () => {
  const out = buffer();
  createLogger({ EDGE_PROXY_SECRET: ` ${EDGE}\n` }, out.dest).info({ seen: EDGE }, "trimmed");
  const quoted = 'edge"value\\not-real';
  createLogger({ EDGE_PROXY_SECRET: quoted }, out.dest).info({ seen: quoted, around: `[${quoted}]` }, "quoted");
  // A child's field and the line's own under one name: a line parsed and written again would keep only the second.
  createLogger({ EDGE_PROXY_SECRET: EDGE }, out.dest).child({ section: "natal:mind" }).info({ section: "natal:body", detail: "edge-value-not-ours" }, "clean");
  createLogger({ EDGE_PROXY_SECRET: " \t" }, out.dest).child({ section: "natal:mind" }).info({ section: "natal:body", detail: "two words\tand a tab" }, "blank");
  assert.equal(out.lines.length, 4);
  const [trimmed, escaped, , blank] = out.lines.map((l) => JSON.parse(l));
  assert.equal(trimmed.seen, "[Redacted]");
  assert.deepEqual([escaped.seen, escaped.around], ["[Redacted]", "[[Redacted]]"]);
  assert.ok(!out.text().includes(EDGE) && !out.text().includes(JSON.stringify(quoted).slice(1, -1)), out.text());
  for (const text of out.lines.slice(2)) assert.ok(text.includes('"section":"natal:mind","section":"natal:body"'), text);
  assert.deepEqual([blank.detail, blank.msg], ["two words\tand a tab", "blank"], "a blank value censors no whitespace");
});

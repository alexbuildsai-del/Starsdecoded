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

const SECRETS = [
  "Marie", "Curie", "sklodowska", "1867-11-07", "11:44", "Warsaw", "52.2297", "21.0122", "Pierre", "@example.com",
  CLERK_ID, SESSION, BEARER, QUERY_TOKEN, IP,
];

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
    headers: { "content-type": "application/json", cookie: `sd_session_id=${SESSION}`, authorization: `Bearer ${BEARER}`, "x-forwarded-for": IP },
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
    req: { method: "GET", headers: { authorization: `Bearer ${BEARER}`, cookie: `sd_session_id=${SESSION}`, accept: "text/html" } },
    res: { statusCode: 200, headers: { "set-cookie": [`sd_session_id=${SESSION}`], "content-type": "text/html" } },
  }, "whole objects");
  const line = JSON.parse(out.lines[0]);
  assert.deepEqual([line.req.headers.authorization, line.req.headers.cookie], ["[Redacted]", "[Redacted]"]);
  assert.equal(line.req.headers.accept, "text/html");
  assert.equal(line.res.headers["set-cookie"], "[Redacted]");
  assert.equal(line.res.headers["content-type"], "text/html");
  assert.ok(!out.text().includes(SESSION) && !out.text().includes(BEARER));
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

/**
 * Share my report, Share yours back, Stop sharing and Change address, driven through routes/index.ts as app.ts mounts it.
 * Everything here answers before any query, so no database is reached; the grant, the claim and the old link's end are
 * walked on Postgres (R15-28).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV = "test";
const { default: router } = await import("./index.js");
const { SHARE_LINES, ownReportRefusal } = await import("./shares.js");
const { CHANGE_ADDRESS_LINES, sendChangeRefusal } = await import("./invites.js");
const { GIFT_CHANGE_LINES, giftChangeRefusal } = await import("./gifts.js");
const { logger } = await import("../lib/logger.js");

/** Where the session and sign-in middleware stand in app.ts, as the walk stubs them. */
const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = "s-test";
  req.log = logger;
  next();
};

async function serve() {
  const app = express();
  app.use(express.json());
  app.use(viewer);
  app.use("/api", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const call = async (method: string, path: string, body?: unknown, user?: string) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (user) headers["x-user"] = user;
    const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { call, close };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-03T12:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY_MS);
const ahead = (days: number) => new Date(NOW.getTime() + days * DAY_MS);

test("Share my report: a visitor is asked to sign in, and a malformed address is named before anything is read (ADR-235)", async (t) => {
  const app = await serve();
  t.after(app.close);
  assert.deepEqual(await app.call("POST", "/shares", { email: "sam@example.com" }), {
    status: 401,
    body: { error: "unauthorized", message: SHARE_LINES.signIn },
  });
  for (const body of [{ email: "not-an-email" }, {}, { email: "" }]) {
    assert.deepEqual(await app.call("POST", "/shares", body, "user_alex"), {
      status: 400,
      body: { error: "validation_error", message: SHARE_LINES.invalid },
    }, JSON.stringify(body));
  }
});

test("a visitor has no shares: the list is empty, and Stop sharing and Share yours back find nothing (ADR-235)", async (t) => {
  const app = await serve();
  t.after(app.close);
  assert.deepEqual(await app.call("GET", "/shares"), { status: 200, body: [] });
  assert.deepEqual(await app.call("DELETE", "/shares/share-1"), {
    status: 404,
    body: { error: "not_found", message: SHARE_LINES.stopNotFound },
  });
  assert.deepEqual(await app.call("POST", "/shares/back", { profileId: "p-alex" }), {
    status: 404,
    body: { error: "not_found", message: SHARE_LINES.backNotShared },
  });
  const unnamed = await app.call("POST", "/shares/back", {}, "user_sam");
  assert.equal(unnamed.status, 400);
  assert.equal(unnamed.body.error, "validation_error");
});

test("Change address: a visitor meets the 404 anyone but the sender does, and a malformed address is named (ADR-237)", async (t) => {
  const app = await serve();
  t.after(app.close);
  assert.deepEqual(await app.call("POST", "/invites/i-1/change-address", { email: "sam@example.com" }), {
    status: 404,
    body: { error: "not_found", message: CHANGE_ADDRESS_LINES.notFound },
  });
  assert.deepEqual(await app.call("POST", "/gifts/g-1/change-address", { email: "sam@example.com" }), {
    status: 404,
    body: { error: "not_found", message: "We couldn't find that gift." },
  });
  for (const body of [{ email: "sam@" }, {}]) {
    assert.deepEqual(await app.call("POST", "/invites/i-1/change-address", body, "user_alex"), {
      status: 400,
      body: { error: "validation_error", message: CHANGE_ADDRESS_LINES.invalid },
    });
    assert.deepEqual(await app.call("POST", "/gifts/g-1/change-address", body, "user_alex"), {
      status: 400,
      body: { error: "validation_error", message: GIFT_CHANGE_LINES.invalid },
    });
  }
});

test("only the reader's own finished Personal report is shared: none marked or none written is no_own_report, one still writing is not_ready (reading 3)", () => {
  assert.deepEqual(ownReportRefusal(false, false), { error: "no_own_report", message: SHARE_LINES.noOwnReport });
  assert.deepEqual(ownReportRefusal(true, false), { error: "no_own_report", message: SHARE_LINES.noOwnReport });
  assert.deepEqual(ownReportRefusal(true, true), { error: "not_ready", message: SHARE_LINES.notReady });
});

test("a send's address changes only while it waits: claimed, stopped or past its week, it stays (ADR-237, reading 7)", () => {
  const send = { kind: "send", claimedAt: null, revokedAt: null, createdAt: ago(2), expiresAt: ahead(5) };
  assert.equal(sendChangeRefusal(send, NOW), null);
  assert.equal(sendChangeRefusal({ ...send, claimedAt: ago(1) }, NOW), CHANGE_ADDRESS_LINES.claimed);
  assert.equal(sendChangeRefusal({ ...send, revokedAt: ago(1) }, NOW), CHANGE_ADDRESS_LINES.expired);
  assert.equal(sendChangeRefusal({ ...send, expiresAt: NOW }, NOW), CHANGE_ADDRESS_LINES.expired);
  // An old row whose stored date runs past the week still ends a week after it went out.
  assert.equal(sendChangeRefusal({ ...send, createdAt: ago(7), expiresAt: ahead(20) }, NOW), CHANGE_ADDRESS_LINES.expired);
  assert.equal(sendChangeRefusal({ ...send, createdAt: ago(6.9), expiresAt: ahead(20) }, NOW), null);
});

test("a gift's address changes only while it waits: claimed or returned, it stays (ADR-237, reading 7)", () => {
  const gift = { claimedAt: null, revokedAt: null, expiresAt: ahead(10) };
  assert.equal(giftChangeRefusal(gift, NOW), null);
  assert.equal(giftChangeRefusal({ ...gift, claimedAt: ago(1) }, NOW), GIFT_CHANGE_LINES.claimed);
  assert.equal(giftChangeRefusal({ ...gift, revokedAt: ago(1) }, NOW), GIFT_CHANGE_LINES.returned);
  assert.equal(giftChangeRefusal({ ...gift, expiresAt: NOW }, NOW), GIFT_CHANGE_LINES.returned);
});

test("every new line keeps the house rules: plain sentences under 25 words, no dash, semicolon or exclamation, and a report is never sent", () => {
  const lines = [
    ...Object.values(SHARE_LINES).map((line) => (typeof line === "function" ? line("Sam") : line)),
    SHARE_LINES.backAlready(null),
    ...Object.values(CHANGE_ADDRESS_LINES),
    ...Object.values(GIFT_CHANGE_LINES),
  ];
  for (const line of lines) {
    assert.doesNotMatch(line, /[—–;!]/, line);
    assert.match(line, /^[A-Z].*\.$/, line);
    for (const sentence of line.split(/(?<=\.) /)) assert.ok(sentence.split(/\s+/).length <= 25, line);
    assert.doesNotMatch(line, /\bsen(d|ds|ding|t)\b/i, line);
  }
  assert.equal(SHARE_LINES.backAlready(null), "They can already read your report.");
});

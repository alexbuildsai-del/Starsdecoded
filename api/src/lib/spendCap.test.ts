/**
 * The breaker without a database (MB-49): the cap's parsing, the gate below,
 * at and past the cap with an injected sum, the line a report and Timeline
 * each hear, the admin's notice and its once-a-day rule, and the minute's
 * cache. What the day's sum counts is
 * spendLedger.test.ts's; the live query is proved on a scratch Postgres in
 * the round's walk (R13-08).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
// The pool connects lazily and nothing here queries it; the failure paths log on purpose.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL ??= "silent";
const { PAUSED_LINE, PAUSED_LINES, TIMELINE_PAUSED_LINE, cachedSpend, dailyCapUsd, pausedNotifier, spendGate, utcDay } = await import("./spendCap.js");
type GateDeps = import("./spendCap.js").GateDeps;
type PausedFor = import("./spendCap.js").PausedFor;
type PausedNotice = import("./spendCap.js").PausedNotice;
type SendSpendPausedOptions = import("./mailer.js").SendSpendPausedOptions;

test("the cap: unset, blank or unreadable is 20; 0 and any plain amount are read as written", () => {
  for (const unset of [undefined, "", "   "]) {
    assert.equal(dailyCapUsd({ DAILY_SPEND_CAP_USD: unset }), 20, JSON.stringify(unset));
  }
  assert.equal(dailyCapUsd({}), 20);
  for (const [raw, cap] of [["0", 0], ["0.01", 0.01], ["35", 35], [" 12.5 ", 12.5], [".5", 0.5], ["7.", 7], ["0.00", 0]] as const) {
    assert.equal(dailyCapUsd({ DAILY_SPEND_CAP_USD: raw }), cap, raw);
  }
  for (const unreadable of ["abc", "$50", "50 USD", "1,000", "-5", "1e3", "Infinity", "NaN", "0x10", "5.5.5"]) {
    assert.equal(dailyCapUsd({ DAILY_SPEND_CAP_USD: unreadable }), 20, unreadable);
  }
});

test("utcDay is the calendar day in UTC, whatever the hour", () => {
  assert.equal(utcDay(new Date("2026-10-01T23:59:59.999Z")), "2026-10-01");
  assert.equal(utcDay(new Date("2026-10-02T00:00:00.000Z")), "2026-10-02");
  assert.equal(utcDay(new Date("2026-10-01T23:30:00-02:00")), "2026-10-02");
});

async function gated(deps: GateDeps, pausedFor?: PausedFor) {
  let handled = 0;
  const app = express();
  // The stub stands in for a writing route: reaching it is where a credit would move.
  app.post("/reports", spendGate(pausedFor, deps), (_req, res) => {
    handled += 1;
    res.status(201).json({ id: "r1" });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    post: async () => {
      const res = await fetch(`${base}/reports`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      return { status: res.status, body: await res.json() };
    },
    handled: () => handled,
    close: () => {
      server.closeAllConnections();
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

function gateDeps(capUsd: number, spent: number | Error) {
  const notices: PausedNotice[] = [];
  const deps: GateDeps = {
    capUsd: () => capUsd,
    spentUsd: () => (spent instanceof Error ? Promise.reject(spent) : Promise.resolve(spent)),
    notify: async (n) => {
      notices.push(n);
    },
    now: () => new Date("2026-10-01T15:20:00Z"),
  };
  return { deps, notices };
}

const PAUSED_BODY = { error: "paused", reason: "paused", message: PAUSED_LINE };

test("the gate: below the cap the route runs; at and past it, 503 paused and the route never runs", async () => {
  const cases = [
    { spent: 19.99, status: 201, handled: 1 },
    { spent: 20, status: 503, handled: 0 },
    { spent: 20.01, status: 503, handled: 0 },
    { spent: 64, status: 503, handled: 0 },
  ];
  for (const c of cases) {
    const { deps, notices } = gateDeps(20, c.spent);
    const app = await gated(deps);
    try {
      const res = await app.post();
      assert.equal(res.status, c.status, `spent ${c.spent}`);
      assert.equal(app.handled(), c.handled, `spent ${c.spent}: the route ran ${app.handled()} times`);
      if (c.status === 503) {
        assert.deepEqual(res.body, PAUSED_BODY);
        assert.deepEqual(notices, [{ day: "2026-10-01", spentUsd: c.spent, capUsd: 20 }]);
      } else {
        assert.deepEqual(res.body, { id: "r1" });
        assert.equal(notices.length, 0);
      }
    } finally {
      await app.close();
    }
  }
});

test("the gate: a cap of 0 pauses every generation, even with nothing spent and no sum to read", async () => {
  for (const spent of [0, 3.2, new Error("database down")]) {
    const { deps, notices } = gateDeps(0, spent);
    const app = await gated(deps);
    try {
      const res = await app.post();
      assert.equal(res.status, 503);
      assert.deepEqual(res.body, PAUSED_BODY);
      assert.equal(app.handled(), 0);
      assert.equal(notices[0].capUsd, 0);
      assert.equal(notices[0].spentUsd, spent instanceof Error ? 0 : spent);
    } finally {
      await app.close();
    }
  }
});

test("the gate: a sum that cannot be read lets the request through, since the route meets the same database next", async () => {
  const { deps, notices } = gateDeps(20, new Error("database down"));
  const app = await gated(deps);
  try {
    assert.equal((await app.post()).status, 201);
    assert.equal(app.handled(), 1);
    assert.equal(notices.length, 0);
  } finally {
    await app.close();
  }
});

test("the line: three short sentences, the credit named, no hour or day it could get wrong, no house-rule punctuation", () => {
  assert.equal(PAUSED_LINE, "New reports are paused for now. Your credit hasn't been used. Please try again later.");
  assert.doesNotMatch(PAUSED_LINE, /[—–;!]/);
  assert.doesNotMatch(PAUSED_LINE, /\btoday\b|\btomorrow\b|\bhours?\b|\d/i);
  const words = PAUSED_LINE.split(/\s+/).length;
  assert.ok(words >= 12 && words <= 18, `${words} words`);
});

test("Timeline's line: what can't happen now and what to do, naming no credit or report, and no hour or day", () => {
  assert.equal(TIMELINE_PAUSED_LINE, "Timeline can't write anything new right now. Try again later.");
  assert.deepEqual(PAUSED_LINES, { reports: PAUSED_LINE, timeline: TIMELINE_PAUSED_LINE });
  assert.equal(TIMELINE_PAUSED_LINE.split(/(?<=\.) /).length, 2, "one idea a sentence");
  assert.doesNotMatch(TIMELINE_PAUSED_LINE, /\bcredits?\b|\breports?\b/i, "Timeline spends no credit and writes no report");
  assert.doesNotMatch(TIMELINE_PAUSED_LINE, /[—–;!]/);
  assert.doesNotMatch(TIMELINE_PAUSED_LINE, /\btoday\b|\btomorrow\b|\bhours?\b|\bmidnight\b|\d/i);
});

test("the gate: a Timeline reading or an Ask message on a paused day hears Timeline's line, and below the cap its route runs", async () => {
  for (const [spent, status, handled] of [[20, 503, 0], [19.99, 201, 1]] as const) {
    const { deps, notices } = gateDeps(20, spent);
    const app = await gated(deps, "timeline");
    try {
      const res = await app.post();
      assert.equal(res.status, status, `spent ${spent}`);
      assert.equal(app.handled(), handled);
      if (status === 503) {
        assert.deepEqual(res.body, { error: "paused", reason: "paused", message: TIMELINE_PAUSED_LINE });
        assert.deepEqual(notices, [{ day: "2026-10-01", spentUsd: 20, capUsd: 20 }], "the same breaker, so the admin hears of it the same way");
      }
    } finally {
      await app.close();
    }
  }
});

function notifier(admin: string | null, address: string | null | Error = "owner@example.com", sends = true) {
  const sent: SendSpendPausedOptions[] = [];
  const warnings: Array<{ fields: Record<string, unknown>; message: string }> = [];
  const lookedUp: string[] = [];
  const notify = pausedNotifier({
    adminUserId: () => admin,
    addressOf: async (userId) => {
      lookedUp.push(userId);
      if (address instanceof Error) throw address;
      return address;
    },
    send: async (opts) => {
      sent.push(opts);
      return sends;
    },
    warn: (fields, message) => warnings.push({ fields, message }),
  });
  return { notify, sent, warnings, lookedUp };
}

test("the notice: the admin's address gets the day, the spend and the cap, once per UTC day", async () => {
  const n = notifier("user_admin");
  await Promise.all([
    n.notify({ day: "2026-10-01", spentUsd: 20.43, capUsd: 20 }),
    n.notify({ day: "2026-10-01", spentUsd: 20.43, capUsd: 20 }),
  ]);
  await n.notify({ day: "2026-10-01", spentUsd: 22.1, capUsd: 20 });
  assert.deepEqual(n.lookedUp, ["user_admin"]);
  assert.deepEqual(n.sent, [{ to: "owner@example.com", day: "2026-10-01", spentUsd: 20.43, capUsd: 20 }]);
  assert.equal(n.warnings.length, 1, "one line a day, with its outcome");
  assert.match(n.warnings[0].message, /the admin was emailed/);

  await n.notify({ day: "2026-10-02", spentUsd: 20.05, capUsd: 20 });
  assert.equal(n.sent.length, 2, "a new UTC day mails again");
  assert.deepEqual(n.sent[1], { to: "owner@example.com", day: "2026-10-02", spentUsd: 20.05, capUsd: 20 });
});

test("the notice: with no admin set, one warning a day and no email", async () => {
  const n = notifier(null);
  await n.notify({ day: "2026-10-01", spentUsd: 20.43, capUsd: 20 });
  await n.notify({ day: "2026-10-01", spentUsd: 25, capUsd: 20 });
  assert.equal(n.sent.length, 0);
  assert.equal(n.lookedUp.length, 0);
  assert.equal(n.warnings.length, 1);
  assert.match(n.warnings[0].message, /ADMIN_USER_ID is not set/);
  assert.deepEqual(n.warnings[0].fields, { day: "2026-10-01", spentUsd: 20.43, capUsd: 20 });
});

test("the notice: no address, a failed lookup or a failed send each say so once, and the day is not retried", async () => {
  const none = notifier("user_admin", null);
  await none.notify({ day: "2026-10-01", spentUsd: 21, capUsd: 20 });
  await none.notify({ day: "2026-10-01", spentUsd: 21, capUsd: 20 });
  assert.equal(none.sent.length, 0);
  assert.equal(none.warnings.length, 1);
  assert.match(none.warnings[0].message, /no email address on record/);

  const broken = notifier("user_admin", new Error("clerk down"));
  await broken.notify({ day: "2026-10-01", spentUsd: 21, capUsd: 20 });
  assert.equal(broken.sent.length, 0);
  assert.equal(broken.warnings.length, 1);
  assert.match(broken.warnings[0].message, /could not be read/);

  const unsent = notifier("user_admin", "owner@example.com", false);
  await unsent.notify({ day: "2026-10-01", spentUsd: 21, capUsd: 20 });
  await unsent.notify({ day: "2026-10-01", spentUsd: 21, capUsd: 20 });
  assert.equal(unsent.sent.length, 1);
  assert.equal(unsent.warnings.length, 1);
  assert.match(unsent.warnings[0].message, /did not go out/);
});

test("the sum is read at most once a minute, again when the UTC day turns, and once for callers that arrive together", async () => {
  let clock = Date.parse("2026-10-01T10:00:00Z");
  const reads: string[] = [];
  let next = 1;
  const spent = cachedSpend(async (day) => {
    reads.push(day);
    return next;
  }, () => clock);

  assert.deepEqual(await Promise.all([spent(), spent(), spent()]), [1, 1, 1]);
  assert.equal(reads.length, 1);
  next = 2;
  clock += 59_000;
  assert.equal(await spent(), 1, "within the minute, the held figure");
  clock += 1_000;
  assert.equal(await spent(), 2, "a minute on, read again");
  assert.equal(reads.length, 2);

  next = 0;
  clock = Date.parse("2026-10-02T00:00:05Z");
  assert.equal(await spent(), 0, "a new day never serves yesterday's figure");
  assert.deepEqual(reads, ["2026-10-01", "2026-10-01", "2026-10-02"]);
});

test("a failed read keeps the day's last figure, and with none it rejects", async () => {
  let clock = Date.parse("2026-10-01T10:00:00Z");
  let fail = false;
  const spent = cachedSpend(async () => {
    if (fail) throw new Error("database down");
    return 7.5;
  }, () => clock);
  assert.equal(await spent(), 7.5);
  fail = true;
  clock += 61_000;
  assert.equal(await spent(), 7.5);

  clock = Date.parse("2026-10-02T09:00:00Z");
  await assert.rejects(spent(), /database down/);
});

test("the gate: the walk's case, a cap of one cent and 2 cents spent, pauses; a hair under the cap does not", async () => {
  for (const [spent, status] of [[0.02, 503], [0.01, 503], [0.0099, 201]] as const) {
    const { deps } = gateDeps(0.01, spent);
    const app = await gated(deps);
    try {
      assert.equal((await app.post()).status, status, `spent ${spent}`);
    } finally {
      await app.close();
    }
  }
});

test("the gate: the notice carries the UTC day of the refusal, however late or early in it", async () => {
  for (const [now, day] of [["2026-10-01T23:59:59.999Z", "2026-10-01"], ["2026-10-02T00:00:00.000Z", "2026-10-02"]] as const) {
    const { deps, notices } = gateDeps(20, 21);
    const app = await gated({ ...deps, now: () => new Date(now) });
    try {
      assert.equal((await app.post()).status, 503);
      assert.equal(notices[0].day, day);
    } finally {
      await app.close();
    }
  }
});

test("the gate: a notice that fails never changes the answer, and the body holds no figure or customer data", async () => {
  const { deps } = gateDeps(20, 31.5);
  const app = await gated({ ...deps, notify: () => Promise.reject(new Error("mail down")) });
  try {
    const res = await app.post();
    assert.equal(res.status, 503);
    assert.deepEqual(res.body, PAUSED_BODY);
    assert.doesNotMatch(JSON.stringify(res.body), /31|20|\$|USD/);
  } finally {
    await app.close();
  }
});

test("the notice: the email carries the figures and nothing else, so no customer data can ride in it", async () => {
  const n = notifier("user_admin");
  await n.notify({ day: "2026-10-01", spentUsd: 20.43, capUsd: 20 });
  assert.deepEqual(Object.keys(n.sent[0]).sort(), ["capUsd", "day", "spentUsd", "to"]);
});

test("a failed read with nothing held is not kept: the next caller reads again", async () => {
  const clock = Date.parse("2026-10-01T10:00:00Z");
  let calls = 0;
  const spent = cachedSpend(async () => {
    calls += 1;
    if (calls === 1) throw new Error("database down");
    return 3;
  }, () => clock);
  await assert.rejects(spent(), /database down/);
  assert.equal(await spent(), 3);
  assert.equal(calls, 2);
});

test("a read begun on yesterday is not served to today, and callers that arrive together share it", async () => {
  let clock = Date.parse("2026-10-01T23:59:59Z");
  const reads: Array<{ day: string; release: (usd: number) => void }> = [];
  const spent = cachedSpend((day) => new Promise<number>((resolve) => reads.push({ day, release: resolve })), () => clock);
  const first = spent();
  const second = spent();
  clock = Date.parse("2026-10-02T00:00:01Z");
  const today = spent();
  assert.deepEqual(reads.map((r) => r.day), ["2026-10-01", "2026-10-02"], "the new day starts its own read");
  reads[0].release(9);
  reads[1].release(4);
  assert.equal(await today, 4);
  assert.deepEqual([await first, await second], [9, 9]);
});

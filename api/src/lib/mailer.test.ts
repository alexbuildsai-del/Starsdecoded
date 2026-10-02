import { test } from "node:test";
import assert from "node:assert/strict";
import { createLogger, logger } from "./logger.js";

// Every email's images come from the configured web origin. The module that holds it imports the database package,
// which wants DATABASE_URL set; the pool connects lazily, so nothing here reaches it.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.PUBLIC_APP_URL = "https://mystarsdecoded.com";
const {
  buildReportEmail,
  buildPairEmail,
  buildGiftEmail,
  buildGiftReminderEmail,
  buildSpendPausedEmail,
  buildWaitlistConfirmEmail,
  sendReportEmail,
  sendPairEmail,
  sendGiftEmail,
  sendGiftReminder,
  sendSpendPausedEmail,
  sendWaitlistConfirmEmail,
} = await import("./mailer.js");

// The report engine writes reports; nothing else does. Every email says so
// (credit-loop.md "Two verbs": Emails never say "made").
const FORBIDDEN_VERBS = /\b(made|created)\b/i;
// ADR-139: nothing tells either side they will see the other's reports.
const OVER_PROMISES = /\b(sees what|see what|reads your|will see|their reports)\b/i;
// ADR-170, 181: a report is the Personal report, and one that is written is shared, never sent.
const RETIRED = /natal report|\bsen(d|ds|ding|t)\b/i;

function allBodies(content: { subject: string; html: string; text: string }): string[] {
  return [content.subject, content.html, content.text];
}

test("sendReportEmail: shared in the giver's name, no address, no over-promise", () => {
  const content = buildReportEmail({
    to: "beatrice@example.com",
    giverFirstName: "Alex",
    personFirstName: "Beatrice",
    claimUrl: "https://mystarsdecoded.com/claim?token=abc",
  });
  assert.equal(content.subject, "Alex shared your report with you");
  assert.match(content.html, /Alex<\/strong> shared your report with you\./);
  assert.equal(content.text.split("\n")[0], "Alex shared your report with you.");
  assert.match(content.html, /Claim my report/);
  for (const body of allBodies(content)) {
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
    assert.doesNotMatch(body, OVER_PROMISES);
    assert.doesNotMatch(body, RETIRED);
    assert.ok(!body.includes("beatrice@example.com"), "no address in the body");
  }
});

test("a giver with no first name reads Someone, in the subject too", () => {
  const report = buildReportEmail({
    to: "beatrice@example.com",
    giverFirstName: null,
    personFirstName: "Beatrice",
    claimUrl: "https://mystarsdecoded.com/claim?token=abc",
  });
  assert.equal(report.subject, "Someone shared your report with you");
  const pair = buildPairEmail({
    to: "beatrice@example.com",
    giverFirstName: null,
    otherFirstName: "Beatrice",
    url: "https://mystarsdecoded.com/claim?token=abc",
    granted: false,
  });
  assert.equal(pair.subject, "Someone shared a Compatibility report with you");
});

test("buildPairEmail: shared, naming the other person, never the invitee alone", () => {
  const pending = buildPairEmail({
    to: "beatrice@example.com",
    giverFirstName: "Alex",
    otherFirstName: "Beatrice",
    url: "https://mystarsdecoded.com/claim?token=abc",
    granted: false,
  });
  assert.equal(pending.subject, "Alex shared a Compatibility report with you");
  assert.match(pending.html, />Alex &amp; Beatrice<\/p>/);
  assert.match(pending.html, /Alex<\/strong> shared a Compatibility report with you\./);
  assert.match(pending.text, /\nAlex shared a Compatibility report with you\.\n/);
  assert.match(pending.html, /Claim my report/);
  assert.match(pending.html, /expires in 7 days/);
  assert.doesNotMatch(pending.html, /you and Beatrice/i);

  const granted = buildPairEmail({
    to: "beatrice@example.com",
    giverFirstName: "Alex",
    otherFirstName: "Beatrice",
    url: "https://mystarsdecoded.com/compatibility/xyz",
    granted: true,
  });
  assert.equal(granted.subject, "Alex shared a Compatibility report with you");
  assert.match(granted.html, /Alex<\/strong> shared a Compatibility report with you, so you can read it right away\./);
  assert.match(granted.text, /\nAlex shared a Compatibility report with you, so you can read it right away\.\n/);
  assert.match(granted.html, /Read the report/);
  assert.doesNotMatch(granted.html, /expires in 7 days/);
  for (const body of [...allBodies(pending), ...allBodies(granted)]) {
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
    assert.doesNotMatch(body, OVER_PROMISES);
    assert.doesNotMatch(body, RETIRED);
    assert.ok(!body.includes("beatrice@example.com"));
  }
});

test("buildGiftEmail: a gift is given, in the new name, with the cover and the escaped note", () => {
  const content = buildGiftEmail({
    to: "pierre@example.com",
    giverFirstName: "Alex",
    recipientFirstName: "Pierre",
    note: "Happy birthday, Pierre. <script>alert(1)</script> & congrats",
    claimUrl: "https://mystarsdecoded.com/claim?token=xyz",
  });
  assert.equal(content.subject, "Alex gave you a Personal report");
  assert.match(content.html, /gift-cover\.png/);
  assert.match(content.html, />A gift from Alex<\/p>/);
  assert.match(content.html, /Your Personal report, for Pierre/);
  assert.match(content.text, /^Alex gave you a Personal report\.\n\nYour Personal report, for Pierre\.\n/);
  assert.match(content.html, /Claim my report/);
  assert.ok(!content.html.includes("<script>"), "the note is escaped");
  assert.match(content.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; congrats/);
  for (const body of allBodies(content)) {
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
    assert.doesNotMatch(body, OVER_PROMISES);
    assert.doesNotMatch(body, RETIRED);
    assert.ok(!body.includes("pierre@example.com"));
  }
});

test("buildGiftEmail: no note leaves no empty quote", () => {
  const content = buildGiftEmail({
    to: "pierre@example.com",
    giverFirstName: "Alex",
    recipientFirstName: "Pierre",
    note: null,
    claimUrl: "https://mystarsdecoded.com/claim?token=xyz",
  });
  assert.ok(!content.html.includes("“”"));
});

test("buildGiftReminderEmail: repeats the button, states no countdown", () => {
  const content = buildGiftReminderEmail({
    to: "pierre@example.com",
    giverFirstName: "Alex",
    recipientFirstName: "Pierre",
    claimUrl: "https://mystarsdecoded.com/claim?token=xyz",
  });
  assert.equal(content.subject, "Your gift from Alex is still waiting");
  assert.match(content.html, /Alex<\/strong> gave you a Personal report\. It's still waiting for you, Pierre\./);
  assert.match(content.html, /Claim my report/);
  assert.doesNotMatch(content.html, /\d+ days? left|hurry|last chance/i);
  for (const body of allBodies(content)) {
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
    assert.doesNotMatch(body, OVER_PROMISES);
    assert.doesNotMatch(body, RETIRED);
    assert.ok(!body.includes("pierre@example.com"));
  }
});

const confirmOpts = {
  to: "ada@example.com",
  confirmUrl: "https://mystarsdecoded.com/waitlist?confirm=abc_DEF-123",
  expiresOn: new Date("2026-10-07T09:30:00Z"),
};

test("buildWaitlistConfirmEmail: what confirming does, the button, the link's last day, and nothing else", () => {
  const content = buildWaitlistConfirmEmail(confirmOpts);
  const lede = "Confirm your email and you're on the waitlist. We'll only use it to tell you when Stars Decoded launches.";
  const lastDay = "The link stops working on 7 October.";
  const notYou = "If you didn't ask to join, ignore this email. We'll delete your address after that day.";
  assert.equal(content.subject, "Confirm your email to join the waitlist");
  for (const line of [lede, lastDay, notYou]) {
    assert.ok(content.html.includes(line), `html: ${line}`);
    assert.ok(content.text.includes(line), `text: ${line}`);
  }
  assert.match(content.html, /href="https:\/\/mystarsdecoded\.com\/waitlist\?confirm=abc_DEF-123"[^>]*>Confirm my email<\/a>/);
  assert.match(content.html, /src="https:\/\/mystarsdecoded\.com\/mark-email\.png"/);
  assert.match(content.text, /\nConfirm my email:\nhttps:\/\/mystarsdecoded\.com\/waitlist\?confirm=abc_DEF-123\n/);
  for (const body of allBodies(content)) {
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
    assert.doesNotMatch(body, /€|\boffer\b|\bdiscount\b|\bcredit|\breport\b/i, "it sells nothing");
    assert.doesNotMatch(body, RETIRED);
    assert.ok(!body.includes("ada@example.com"), "no address in the body");
  }
  // The house rules for our own words; the shared shell's sign-off is not ours to change here.
  const ownWords = [content.subject, ...content.text.split("\n").slice(0, -1)].join("\n");
  assert.doesNotMatch(ownWords, /[—–;!]/);
});

test("buildWaitlistConfirmEmail: the last day is the calendar day, in UTC, on which the link stops", () => {
  const day = (iso: string) => buildWaitlistConfirmEmail({ ...confirmOpts, expiresOn: new Date(iso) }).text;
  assert.match(day("2026-12-31T23:30:00Z"), /stops working on 31 December\./);
  assert.match(day("2027-01-01T00:10:00Z"), /stops working on 1 January\./);
});

const pausedOpts = { to: "owner@example.com", day: "2026-10-01", spentUsd: 20.4321, capUsd: 20, appEnv: "production" as const };

test("buildSpendPausedEmail: the environment, the UTC day, the spend and the cap, and nothing about anyone", () => {
  const content = buildSpendPausedEmail(pausedOpts);
  assert.equal(content.subject, "New reports paused on production");
  for (const line of [
    "New reports are paused on production. The writing cost on 1 October (UTC) reached the daily cap.",
    "Spent on 1 October (UTC): $20.43",
    "Daily cap: $20.00",
    "Writing starts again at midnight UTC, or once DAILY_SPEND_CAP_USD is raised in Railway.",
    "Lab runs don't count toward the cap.",
  ]) {
    assert.ok(content.html.includes(line), `html: ${line}`);
    assert.ok(content.text.includes(line), `text: ${line}`);
  }
  for (const body of allBodies(content)) {
    assert.doesNotMatch(body, /@/, "no address, the admin's or anyone's");
    assert.doesNotMatch(body, /\bname\b|\bbirth\b|\breport id\b/i, "no customer data");
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
  }
  const ownWords = [content.subject, ...content.text.split("\n").slice(0, -1)].join("\n");
  assert.doesNotMatch(ownWords, /[—–;!]/);
});

test("buildSpendPausedEmail: a cap of 0 is the off switch, which midnight does not lift", () => {
  const content = buildSpendPausedEmail({ ...pausedOpts, spentUsd: 0, capUsd: 0, appEnv: "staging" });
  assert.equal(content.subject, "New reports paused on staging");
  assert.match(content.text, /^New reports are paused on staging, because DAILY_SPEND_CAP_USD is 0\.\n/);
  assert.match(content.text, /\nDaily cap: \$0\.00\n/);
  assert.match(content.text, /Writing starts again once DAILY_SPEND_CAP_USD is set above 0 in Railway\./);
  assert.doesNotMatch(content.text, /midnight/);
});

test("names are escaped defensively", () => {
  const content = buildReportEmail({
    to: "x@example.com",
    giverFirstName: "A & B",
    personFirstName: "C <D>",
    claimUrl: "https://mystarsdecoded.com/claim?token=abc",
  });
  assert.ok(!content.html.includes("<D>"));
  assert.match(content.html, /A &amp; B/);
  assert.match(content.html, /C &lt;D&gt;/);
});

test("every image comes from the configured web origin, never from the origin a link names", (t) => {
  t.after(() => {
    process.env.PUBLIC_APP_URL = "https://mystarsdecoded.com";
  });
  const elsewhere = "https://evil.example";
  const build = () => [
    buildReportEmail({ to: "x@example.com", giverFirstName: "Alex", personFirstName: "Beatrice", claimUrl: `${elsewhere}/claim?token=a` }),
    buildPairEmail({ to: "x@example.com", giverFirstName: "Alex", otherFirstName: "Beatrice", url: `${elsewhere}/claim?token=a`, granted: false }),
    buildPairEmail({ to: "x@example.com", giverFirstName: "Alex", otherFirstName: "Beatrice", url: `${elsewhere}/compatibility/r-1`, granted: true }),
    buildGiftEmail({ to: "x@example.com", giverFirstName: "Alex", recipientFirstName: "Pierre", note: null, claimUrl: `${elsewhere}/claim?token=a` }),
    buildGiftReminderEmail({ to: "x@example.com", giverFirstName: "Alex", recipientFirstName: "Pierre", claimUrl: `${elsewhere}/claim?token=a` }),
    buildWaitlistConfirmEmail({ ...confirmOpts, confirmUrl: `${elsewhere}/waitlist?confirm=a` }),
  ];
  const images = (html: string) => [...html.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)].map((m) => m[1]);

  for (const web of ["https://mystarsdecoded.com", "https://starsdecoded-staging.vercel.app"]) {
    process.env.PUBLIC_APP_URL = `${web}/`;
    for (const content of build()) {
      const srcs = images(content.html);
      assert.ok(srcs.length > 0, content.subject);
      for (const src of srcs) assert.ok(src.startsWith(`${web}/`), `${content.subject}: ${src}`);
    }
  }
  assert.deepEqual(images(build()[3].html).map((src) => new URL(src).pathname), ["/mark-email.png", "/gift-cover.png"]);
});

// Without RESEND_API_KEY every send logs its failure, which is the line a recipient would ride on.
test("production never hands the logger a recipient; elsewhere the address reaches it and it censors it (ADR-201)", async (t) => {
  const saved = { key: process.env.RESEND_API_KEY, env: process.env.NODE_ENV };
  delete process.env.RESEND_API_KEY;
  t.after(() => {
    if (saved.key !== undefined) process.env.RESEND_API_KEY = saved.key;
    if (saved.env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.env;
  });
  const warn = t.mock.method(logger, "warn", () => {});
  const sendAll = async () => {
    await sendReportEmail({ to: "beatrice@example.com", giverFirstName: "Alex", personFirstName: "Beatrice", claimUrl: "https://mystarsdecoded.com/claim?token=abc" });
    await sendPairEmail({ to: "beatrice@example.com", giverFirstName: "Alex", otherFirstName: "Beatrice", url: "https://mystarsdecoded.com/claim?token=abc", granted: false });
    await sendGiftEmail({ to: "pierre@example.com", giverFirstName: "Alex", recipientFirstName: "Pierre", note: null, claimUrl: "https://mystarsdecoded.com/claim?token=xyz" });
    await sendGiftReminder({ to: "pierre@example.com", giverFirstName: "Alex", recipientFirstName: "Pierre", claimUrl: "https://mystarsdecoded.com/claim?token=xyz" });
    await sendWaitlistConfirmEmail(confirmOpts);
    await sendSpendPausedEmail(pausedOpts);
  };
  const fields = () => warn.mock.calls.map((c) => c.arguments[0] as Record<string, unknown>);

  process.env.NODE_ENV = "production";
  await sendAll();
  assert.equal(warn.mock.calls.length, 6);
  for (const f of fields()) assert.ok(!("to" in f), JSON.stringify(f));

  warn.mock.resetCalls();
  process.env.NODE_ENV = "development";
  await sendAll();
  assert.deepEqual(fields().map((f) => f.to), ["beatrice@example.com", "beatrice@example.com", "pierre@example.com", "pierre@example.com", undefined, undefined]);
  const lines: string[] = [];
  const written = createLogger({ LOG_LEVEL: "info" }, { write: (s: string) => void lines.push(s) });
  for (const c of warn.mock.calls) written.warn(...(c.arguments as [Record<string, unknown>, string]));
  assert.equal(lines.length, 6);
  assert.doesNotMatch(lines.join(""), /@example\.com/);
});

// Emails are stubbed in tests; nothing sends. Without RESEND_API_KEY the
// send functions degrade to false instead of throwing (graceful, as today).
test("send* functions resolve false without RESEND_API_KEY, never throw", async () => {
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    assert.equal(
      await sendReportEmail({
        to: "x@example.com",
        giverFirstName: "Alex",
        personFirstName: "Beatrice",
        claimUrl: "https://mystarsdecoded.com/claim?token=abc",
      }),
      false,
    );
    assert.equal(
      await sendPairEmail({
        to: "x@example.com",
        giverFirstName: "Alex",
        otherFirstName: "Beatrice",
        url: "https://mystarsdecoded.com/claim?token=abc",
        granted: false,
      }),
      false,
    );
    assert.equal(
      await sendGiftEmail({
        to: "x@example.com",
        giverFirstName: "Alex",
        recipientFirstName: "Pierre",
        note: null,
        claimUrl: "https://mystarsdecoded.com/claim?token=abc",
      }),
      false,
    );
    assert.equal(
      await sendGiftReminder({
        to: "x@example.com",
        giverFirstName: "Alex",
        recipientFirstName: "Pierre",
        claimUrl: "https://mystarsdecoded.com/claim?token=abc",
      }),
      false,
    );
    assert.equal(await sendWaitlistConfirmEmail(confirmOpts), false);
    assert.equal(await sendSpendPausedEmail(pausedOpts), false);
  } finally {
    if (saved !== undefined) process.env.RESEND_API_KEY = saved;
  }
});

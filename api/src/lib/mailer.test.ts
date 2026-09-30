import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildReportEmail,
  buildPairEmail,
  buildGiftEmail,
  buildGiftReminderEmail,
  buildWaitlistConfirmEmail,
  sendReportEmail,
  sendPairEmail,
  sendGiftEmail,
  sendGiftReminder,
  sendWaitlistConfirmEmail,
} from "./mailer.js";

// The report engine writes reports; nothing else does. Every email says so
// (credit-loop.md "Two verbs": Emails never say "made").
const FORBIDDEN_VERBS = /\b(made|created)\b/i;
// ADR-139: nothing tells either side they will see the other's reports.
const OVER_PROMISES = /\b(sees what|see what|reads your|will see|their reports)\b/i;

function allBodies(content: { subject: string; html: string; text: string }): string[] {
  return [content.subject, content.html, content.text];
}

test("sendReportEmail: the locked line, no address, no over-promise", () => {
  const content = buildReportEmail({
    to: "beatrice@example.com",
    giverFirstName: "Alex",
    personFirstName: "Beatrice",
    claimUrl: "https://mystarsdecoded.com/claim?token=abc",
  });
  assert.equal(content.subject, "Your Personal natal report is ready");
  assert.match(content.html, /Alex<\/strong> had it written for you\./);
  assert.match(content.text, /Alex had it written for you\./);
  for (const body of allBodies(content)) {
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
    assert.doesNotMatch(body, OVER_PROMISES);
    assert.ok(!body.includes("beatrice@example.com"), "no address in the body");
  }
});

test("buildPairEmail: names the other person, never the invitee alone", () => {
  const pending = buildPairEmail({
    to: "beatrice@example.com",
    giverFirstName: "Alex",
    otherFirstName: "Beatrice",
    url: "https://mystarsdecoded.com/claim?token=abc",
    granted: false,
  });
  assert.equal(pending.subject, "Your Compatibility report is ready");
  assert.match(pending.html, />Alex &amp; Beatrice<\/p>/);
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
  assert.match(granted.html, /Read the report/);
  assert.doesNotMatch(granted.html, /expires in 7 days/);
  for (const body of [...allBodies(pending), ...allBodies(granted)]) {
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
    assert.doesNotMatch(body, OVER_PROMISES);
    assert.ok(!body.includes("beatrice@example.com"));
  }
});

test("buildGiftEmail: the locked copy, the cover, the escaped note", () => {
  const content = buildGiftEmail({
    to: "pierre@example.com",
    giverFirstName: "Alex",
    recipientFirstName: "Pierre",
    note: "Happy birthday, Pierre. <script>alert(1)</script> & congrats",
    claimUrl: "https://mystarsdecoded.com/claim?token=xyz",
  });
  assert.equal(content.subject, "Alex gave you a Personal natal report");
  assert.match(content.html, /gift-cover\.png/);
  assert.match(content.html, />A gift from Alex<\/p>/);
  assert.match(content.html, /Your Personal natal report, for Pierre/);
  assert.match(content.html, /Claim my report/);
  assert.ok(!content.html.includes("<script>"), "the note is escaped");
  assert.match(content.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; congrats/);
  for (const body of allBodies(content)) {
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
    assert.doesNotMatch(body, OVER_PROMISES);
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
  assert.match(content.subject, /still waiting/);
  assert.match(content.html, /Claim my report/);
  assert.doesNotMatch(content.html, /\d+ days? left|hurry|last chance/i);
  for (const body of allBodies(content)) {
    assert.doesNotMatch(body, FORBIDDEN_VERBS);
    assert.doesNotMatch(body, OVER_PROMISES);
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
  const lede = "Confirm your email and you're on the waitlist. We'll only use it to tell you when Stars Decoded opens.";
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
  } finally {
    if (saved !== undefined) process.env.RESEND_API_KEY = saved;
  }
});

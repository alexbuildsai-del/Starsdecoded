// Resend integration — every transactional email Stars Decoded sends: a
// finished report handed to its subject, a Compatibility report sent or
// granted, a gift and its reminder, and the waitlist's confirmation. All but
// the last are written in the giver's name, and none says "made" or
// "created" (credit-loop.md "Two verbs", ADR-128, 135).
// Credentials come straight from the environment (RESEND_API_KEY,
// RESEND_FROM_EMAIL), so any host that can set env vars can send mail.
import { Resend } from "resend";
import { logger } from "./logger.js";

function getResendCredentials(): { apiKey: string; fromEmail: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set — Stars Decoded emails cannot be sent");
  }

  return {
    apiKey,
    fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "Stars Decoded <noreply@mystarsdecoded.com>",
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function originOf(url: string): string {
  return new URL(url).origin;
}

// Mail clients do not render SVG, so every header repeats the same PNG
// export of the mark, served by the web app on the link's own origin.
function markImg(origin: string): string {
  return `<img src="${origin}/mark-email.png" width="28" height="28" alt="" style="vertical-align:middle;margin-right:10px;border:0;">`;
}

function ctaButton(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
    <tr>
      <td style="background:linear-gradient(135deg,#5B6CF6 0%,#7C4DFF 100%);border-radius:8px;padding:14px 32px;text-align:center;">
        <a href="${encodeURI(href)}" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function paddedSection(html: string): string {
  return `<div style="padding:40px;">${html}</div>`;
}

// One frame for every email: the mark and wordmark, the caller's body,
// a plain footer. Keeps the templates below to their own content.
function shell(origin: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Stars Decoded</title>
</head>
<body style="margin:0;padding:0;background:#0D1117;font-family:'Inter',Arial,sans-serif;color:#E6EDF3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#161B22;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0B0F17;padding:32px 40px;text-align:center;">
              ${markImg(origin)}<span style="font-size:26px;letter-spacing:0.02em;color:#fff;font-family:Georgia,serif;vertical-align:middle;">Stars Decoded</span>
            </td>
          </tr>
          <tr>
            <td>${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #21262D;text-align:center;">
              <p style="margin:0;font-size:11px;color:#484F58;">© Stars Decoded</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function textShell(lines: string[]): string {
  return [...lines, "", "— Stars Decoded"].join("\n");
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

async function deliver(
  to: string,
  content: EmailContent,
  logLabel: string,
  { logRecipient = true }: { logRecipient?: boolean } = {},
): Promise<boolean> {
  const who = logRecipient ? { to } : {};
  try {
    const { apiKey, fromEmail } = getResendCredentials();
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (error) {
      logger.warn({ error, ...who }, `[${logLabel}] Resend returned an error`);
      return false;
    }

    logger.info(who, `[${logLabel}] sent successfully via Resend`);
    return true;
  } catch (err) {
    logger.warn({ err, ...who }, `[${logLabel}] failed to send via Resend`);
    return false;
  }
}

// ---- Send to {name}: a finished Personal natal report, theirs to claim ----

export interface SendReportEmailOptions {
  to: string;
  // Nullable: `names.ts`'s `firstNameOf` can resolve to none (ADR-135, MB-85).
  giverFirstName: string | null;
  personFirstName: string;
  claimUrl: string;
}

export function buildReportEmail(opts: SendReportEmailOptions): EmailContent {
  const { personFirstName, claimUrl } = opts;
  const giverFirstName = opts.giverFirstName ?? "Someone";
  const giver = escapeHtml(giverFirstName);
  const person = escapeHtml(personFirstName);
  const origin = originOf(claimUrl);

  // The locked line (credit-loop.md "Two verbs"): never "made" or "created".
  const subject = "Your Personal natal report is ready";
  const html = shell(
    origin,
    paddedSection(
      `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#C9D1D9;">Hi ${person},</p>` +
        `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C9D1D9;"><strong>${giver}</strong> had it written for you.</p>` +
        `<p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#8B949E;">Sign in with this email and it's yours to keep.</p>` +
        `<div style="text-align:center;margin-bottom:32px;">${ctaButton("Claim my report", claimUrl)}</div>` +
        `<p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">This link is private to you and expires in 7 days.</p>`,
    ),
  );
  const text = textShell([
    `Your Personal natal report is ready.`,
    ``,
    `${giverFirstName} had it written for you.`,
    ``,
    `Claim my report:`,
    claimUrl,
    ``,
    `This link is private to you and expires in 7 days.`,
  ]);
  return { subject, html, text };
}

export async function sendReportEmail(opts: SendReportEmailOptions): Promise<boolean> {
  return deliver(opts.to, buildReportEmail(opts), "report-email");
}

// ---- A Compatibility report, sent to its other person or granted at once ----
// MB-103 provisional: pairs are still the provisional reading in the plan.

export interface SendPairEmailOptions {
  to: string;
  // Nullable: both names can come from `firstNameOf`, which may resolve to none.
  giverFirstName: string | null;
  otherFirstName: string | null;
  url: string;
  granted: boolean;
}

export function buildPairEmail(opts: SendPairEmailOptions): EmailContent {
  const { url, granted } = opts;
  const giverFirstName = opts.giverFirstName ?? "Someone";
  const otherFirstName = opts.otherFirstName ?? "Someone";
  const giver = escapeHtml(giverFirstName);
  const other = escapeHtml(otherFirstName);
  const origin = originOf(url);

  // Named by both real people, as the report itself is (dashboard-sky "{A} & {B}");
  // never a "you and {name}" line, which is the MB-85 bug this fixes.
  const lede = granted
    ? `<strong>${giver}</strong> shared it with you, so you can read it right away.`
    : `<strong>${giver}</strong> had it written for you.`;
  const cta = granted ? "Read the report" : "Claim my report";
  const subject = "Your Compatibility report is ready";
  const html = shell(
    origin,
    paddedSection(
      `<p style="margin:0 0 8px;font-size:13px;letter-spacing:0.06em;color:#8B949E;text-transform:uppercase;">${giver} &amp; ${other}</p>` +
        `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C9D1D9;">Your Compatibility report is ready. ${lede}</p>` +
        `<div style="text-align:center;margin-bottom:32px;">${ctaButton(cta, url)}</div>` +
        (granted
          ? ""
          : `<p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">This link is private to you and expires in 7 days.</p>`),
    ),
  );
  const text = textShell(
    [
      `${giverFirstName} & ${otherFirstName}`,
      ``,
      `Your Compatibility report is ready. ${
        granted ? `${giverFirstName} shared it with you, so you can read it right away.` : `${giverFirstName} had it written for you.`
      }`,
      ``,
      `${cta}:`,
      url,
    ].concat(granted ? [] : ["", "This link is private to you and expires in 7 days."]),
  );
  return { subject, html, text };
}

export async function sendPairEmail(opts: SendPairEmailOptions): Promise<boolean> {
  return deliver(opts.to, buildPairEmail(opts), "pair-email");
}

// ---- Gift a report: a credit, not a report, so the email promises only the ----
// ---- claim (ADR-139); the cover is the static web/public/gift-cover.png ----

export interface SendGiftEmailOptions {
  to: string;
  // Nullable: `firstNameOf` can resolve to none (ADR-135, MB-85).
  giverFirstName: string | null;
  recipientFirstName: string;
  note: string | null;
  claimUrl: string;
}

export function buildGiftEmail(opts: SendGiftEmailOptions): EmailContent {
  const { recipientFirstName, note, claimUrl } = opts;
  const giverFirstName = opts.giverFirstName ?? "Someone";
  const giver = escapeHtml(giverFirstName);
  const recipient = escapeHtml(recipientFirstName);
  const origin = originOf(claimUrl);
  const trimmedNote = note?.trim() ?? "";

  // The locked copy (credit-loop.md "Two verbs" and Settled at lock 9).
  const subject = `${giverFirstName} gave you a Personal natal report`;
  const noteHtml = trimmedNote
    ? `<p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#E6EDF3;font-style:italic;">“${escapeHtml(trimmedNote)}”</p>`
    : "";
  const noteText = trimmedNote ? [`"${trimmedNote}"`, ``] : [];
  const html = shell(
    origin,
    `<img src="${origin}/gift-cover.png" width="560" height="347" alt="A gift from ${giver}" style="display:block;width:100%;height:auto;border:0;">` +
      paddedSection(
        `<p style="margin:0 0 12px;font-size:13px;letter-spacing:0.08em;color:#D4B06A;text-transform:uppercase;">A gift from ${giver}</p>` +
          `<p style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#F2F4F9;font-family:Georgia,serif;">Your Personal natal report, for ${recipient}</p>` +
          noteHtml +
          `<div style="text-align:center;margin-bottom:24px;">${ctaButton("Claim my report", claimUrl)}</div>` +
          `<p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">This gift is open for 30 days.</p>`,
      ),
  );
  const text = textShell(
    [`${giverFirstName} gave you a Personal natal report.`, ``, `Your Personal natal report, for ${recipientFirstName}.`, ``]
      .concat(noteText)
      .concat([`Claim my report:`, claimUrl, ``, `This gift is open for 30 days.`]),
  );
  return { subject, html, text };
}

export async function sendGiftEmail(opts: SendGiftEmailOptions): Promise<boolean> {
  return deliver(opts.to, buildGiftEmail(opts), "gift-email");
}

// ---- A gift reminder: the same claim, nothing new, no countdown (ADR-127) ----

export interface SendGiftReminderOptions {
  to: string;
  // Nullable: `firstNameOf` can resolve to none (ADR-135, MB-85).
  giverFirstName: string | null;
  recipientFirstName: string;
  claimUrl: string;
}

export function buildGiftReminderEmail(opts: SendGiftReminderOptions): EmailContent {
  const { recipientFirstName, claimUrl } = opts;
  const giverFirstName = opts.giverFirstName ?? "Someone";
  const giver = escapeHtml(giverFirstName);
  const recipient = escapeHtml(recipientFirstName);
  const origin = originOf(claimUrl);

  const subject = `Your gift from ${giverFirstName} is still waiting`;
  const html = shell(
    origin,
    paddedSection(
      `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C9D1D9;"><strong>${giver}</strong> gave you a Personal natal report. It's still waiting for you, ${recipient}.</p>` +
        `<div style="text-align:center;margin-bottom:32px;">${ctaButton("Claim my report", claimUrl)}</div>` +
        `<p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">This gift is open for 30 days.</p>`,
    ),
  );
  const text = textShell([
    `${giverFirstName} gave you a Personal natal report. It's still waiting for you, ${recipientFirstName}.`,
    ``,
    `Claim my report:`,
    claimUrl,
    ``,
    `This gift is open for 30 days.`,
  ]);
  return { subject, html, text };
}

export async function sendGiftReminder(opts: SendGiftReminderOptions): Promise<boolean> {
  return deliver(opts.to, buildGiftReminderEmail(opts), "gift-reminder");
}

// The waitlist's double opt-in (ADR-145). It says what confirming does and the
// day the link stops working, nothing more, since whoever reads it may never
// have asked to join.

export interface SendWaitlistConfirmOptions {
  to: string;
  confirmUrl: string;
  expiresOn: Date;
}

// The server cannot know the reader's time zone, so the day is UTC's: at most
// a few hours off the moment the link really stops.
function linkDay(at: Date): string {
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}

export function buildWaitlistConfirmEmail(opts: SendWaitlistConfirmOptions): EmailContent {
  const { confirmUrl } = opts;
  const lede = "Confirm your email and you're on the waitlist. We'll only use it to tell you when Stars Decoded launches.";
  const lastDay = `The link stops working on ${linkDay(opts.expiresOn)}.`;
  // "That day" rather than a count of days: the date is the email's only number, so it cannot disagree with the link's life.
  const notYou = "If you didn't ask to join, ignore this email. We'll delete your address after that day.";

  const subject = "Confirm your email to join the waitlist";
  const html = shell(
    originOf(confirmUrl),
    paddedSection(
      `<p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#C9D1D9;">${lede}</p>` +
        `<div style="text-align:center;margin-bottom:32px;">${ctaButton("Confirm my email", confirmUrl)}</div>` +
        `<p style="margin:0 0 8px;font-size:12px;color:#6E7681;text-align:center;">${lastDay}</p>` +
        `<p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">${notYou}</p>`,
    ),
  );
  const text = textShell([lede, ``, `Confirm my email:`, confirmUrl, ``, lastDay, notYou]);
  return { subject, html, text };
}

export async function sendWaitlistConfirmEmail(opts: SendWaitlistConfirmOptions): Promise<boolean> {
  // An address nobody confirms is deleted after seven days (ADR-145); a log line would keep it longer.
  return deliver(opts.to, buildWaitlistConfirmEmail(opts), "waitlist-confirm", { logRecipient: false });
}

// Resend integration — every transactional email Stars Decoded sends: a
// finished report shared with its subject, a reader's own Personal report
// shared with someone, a Compatibility report shared or granted, a gift and
// its reminder, the waitlist's confirmation, and the spend breaker's notice
// to the admin. The first five are written in the giver's name. A written
// report is shared and a
// credit is given: none says "send" for a report, or "made" or "created"
// (ADR-181; credit-loop.md "Two verbs", ADR-128, 135).
// Credentials come straight from the environment (RESEND_API_KEY,
// RESEND_FROM_EMAIL), so any host that can set env vars can send mail.
import { Resend } from "resend";
import { readAppEnv, type AppEnv } from "./appEnv.js";
import { logger } from "./logger.js";
import { publicWebBase } from "./waitlist.js";

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

// Mail clients do not render SVG, so every header repeats the same PNG
// export of the mark, served by the web app. Its origin is the configured
// one, never the link's, so no caller's link can move an image elsewhere.
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
  // Production never hands the logger an address (ADR-201); elsewhere the line still says a recipient was set, though
  // the logger censors the address itself.
  const who = logRecipient && process.env.NODE_ENV !== "production" ? { to } : {};
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

// ---- Share with {name}: a finished Personal report, theirs to claim ----

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
  const origin = publicWebBase();

  // The giver is in the subject so the inbox says who shared it; the verb is ADR-181's,
  // which replaces credit-loop.md's "had it written for you" and still never says "made".
  const subject = `${giverFirstName} shared your report with you`;
  const html = shell(
    origin,
    paddedSection(
      `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#C9D1D9;">Hi ${person},</p>` +
        `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C9D1D9;"><strong>${giver}</strong> shared your report with you.</p>` +
        `<p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#8B949E;">Sign in with this email and it's yours to keep.</p>` +
        `<div style="text-align:center;margin-bottom:32px;">${ctaButton("Claim my report", claimUrl)}</div>` +
        `<p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">This link is private to you and expires in 7 days.</p>`,
    ),
  );
  const text = textShell([
    `${giverFirstName} shared your report with you.`,
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

// ---- Share my report: the sharer's own Personal report, read through a grant (ADR-235) ----

export interface SendShareEmailOptions {
  to: string;
  // Nullable: `names.ts`'s `firstNameOf` can resolve to none (ADR-135, MB-85).
  sharerFirstName: string | null;
  claimUrl: string;
}

export function buildShareEmail(opts: SendShareEmailOptions): EmailContent {
  const { claimUrl } = opts;
  const sharerFirstName = opts.sharerFirstName ?? "Someone";
  const sharer = escapeHtml(sharerFirstName);
  const origin = publicWebBase();

  // The sharer typed only an address, so there is no name to greet. The report stays the
  // sharer's: the claim lets the reader read it, and nothing says it becomes theirs.
  const subject = `${sharerFirstName} shared their Personal report with you`;
  const signIn = "Sign in with this email to read it.";
  const html = shell(
    origin,
    paddedSection(
      `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C9D1D9;"><strong>${sharer}</strong> shared their Personal report with you.</p>` +
        `<p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#8B949E;">${signIn}</p>` +
        `<div style="text-align:center;margin-bottom:32px;">${ctaButton("Read the report", claimUrl)}</div>` +
        `<p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">This link is private to you and expires in 7 days.</p>`,
    ),
  );
  const text = textShell([
    `${sharerFirstName} shared their Personal report with you.`,
    ``,
    signIn,
    ``,
    `Read the report:`,
    claimUrl,
    ``,
    `This link is private to you and expires in 7 days.`,
  ]);
  return { subject, html, text };
}

export async function sendShareEmail(opts: SendShareEmailOptions): Promise<boolean> {
  return deliver(opts.to, buildShareEmail(opts), "share-email");
}

// ---- A Compatibility report, shared with its other person or granted at once ----
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
  const origin = publicWebBase();

  // Named by both real people, as the report itself is (dashboard-sky "{A} & {B}");
  // never a "you and {name}" line, which is the MB-85 bug this fixes. The subject and
  // the first line say the giver shared it, as the report email does (ADR-181).
  const tail = granted ? ", so you can read it right away." : ".";
  const cta = granted ? "Read the report" : "Claim my report";
  const subject = `${giverFirstName} shared a Compatibility report with you`;
  const html = shell(
    origin,
    paddedSection(
      `<p style="margin:0 0 8px;font-size:13px;letter-spacing:0.06em;color:#8B949E;text-transform:uppercase;">${giver} &amp; ${other}</p>` +
        `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C9D1D9;"><strong>${giver}</strong> shared a Compatibility report with you${tail}</p>` +
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
      `${giverFirstName} shared a Compatibility report with you${tail}`,
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
  const origin = publicWebBase();
  const trimmedNote = note?.trim() ?? "";

  // The locked copy (credit-loop.md "Two verbs" and Settled at lock 9), in ADR-170's name.
  const subject = `${giverFirstName} gave you a Personal report`;
  const noteHtml = trimmedNote
    ? `<p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#E6EDF3;font-style:italic;">“${escapeHtml(trimmedNote)}”</p>`
    : "";
  const noteText = trimmedNote ? [`"${trimmedNote}"`, ``] : [];
  const html = shell(
    origin,
    `<img src="${origin}/gift-cover.png" width="560" height="347" alt="A gift from ${giver}" style="display:block;width:100%;height:auto;border:0;">` +
      paddedSection(
        `<p style="margin:0 0 12px;font-size:13px;letter-spacing:0.08em;color:#D4B06A;text-transform:uppercase;">A gift from ${giver}</p>` +
          `<p style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#F2F4F9;font-family:Georgia,serif;">Your Personal report, for ${recipient}</p>` +
          noteHtml +
          `<div style="text-align:center;margin-bottom:24px;">${ctaButton("Claim my report", claimUrl)}</div>` +
          `<p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">This gift is open for 30 days.</p>`,
      ),
  );
  const text = textShell(
    [`${giverFirstName} gave you a Personal report.`, ``, `Your Personal report, for ${recipientFirstName}.`, ``]
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
  const origin = publicWebBase();

  const subject = `Your gift from ${giverFirstName} is still waiting`;
  const html = shell(
    origin,
    paddedSection(
      `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C9D1D9;"><strong>${giver}</strong> gave you a Personal report. It's still waiting for you, ${recipient}.</p>` +
        `<div style="text-align:center;margin-bottom:32px;">${ctaButton("Claim my report", claimUrl)}</div>` +
        `<p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">This gift is open for 30 days.</p>`,
    ),
  );
  const text = textShell([
    `${giverFirstName} gave you a Personal report. It's still waiting for you, ${recipientFirstName}.`,
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
    publicWebBase(),
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

// The breaker's notice to the admin (ADR-199, MB-12's first alert): the day,
// its spend and the cap, and nothing about who wrote what, so no customer
// data leaves in it. Internal, so it skips the customer frame and its mark.

export interface SendSpendPausedOptions {
  to: string;
  /** The UTC day the cap was reached, YYYY-MM-DD. */
  day: string;
  spentUsd: number;
  capUsd: number;
  /** Staging and production mail the same admin, so the email names its own; unset, it is this process's. */
  appEnv?: AppEnv;
}

function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function buildSpendPausedEmail(opts: SendSpendPausedOptions): EmailContent {
  const where = opts.appEnv ?? readAppEnv();
  const on = `${linkDay(new Date(`${opts.day}T00:00:00Z`))} (UTC)`;
  // A cap of 0 is the Owner's off switch, which midnight does not lift.
  const lede = opts.capUsd > 0
    ? `New reports are paused on ${where}. The writing cost on ${on} reached the daily cap.`
    : `New reports are paused on ${where}, because DAILY_SPEND_CAP_USD is 0.`;
  const figures = [`Spent on ${on}: ${usd(opts.spentUsd)}`, `Daily cap: ${usd(opts.capUsd)}`];
  const resume = opts.capUsd > 0
    ? "Writing starts again at midnight UTC, or once DAILY_SPEND_CAP_USD is raised in Railway."
    : "Writing starts again once DAILY_SPEND_CAP_USD is set above 0 in Railway.";
  const lab = "Lab runs don't count toward the cap.";

  const subject = `New reports paused on ${where}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1F2328;">
  <p style="margin:0 0 16px;">${lede}</p>
  <p style="margin:0 0 16px;">${figures.join("<br>")}</p>
  <p style="margin:0 0 16px;">${resume}</p>
  <p style="margin:0;color:#57606A;">${lab}</p>
</body>
</html>`;
  const text = textShell([lede, ``, ...figures, ``, resume, lab]);
  return { subject, html, text };
}

export async function sendSpendPausedEmail(opts: SendSpendPausedOptions): Promise<boolean> {
  // The admin's address stays out of the logs like everyone else's (security scope 6).
  return deliver(opts.to, buildSpendPausedEmail(opts), "spend-paused", { logRecipient: false });
}

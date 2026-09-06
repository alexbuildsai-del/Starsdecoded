// Resend integration — sends transactional invite emails.
// WARNING: Never cache the Resend client; tokens expire.
// Uses the Replit Connectors proxy (conn_resend_*) for API key retrieval.
import { Resend } from "resend";
import { logger } from "./logger.js";

interface ConnectionSettings {
  settings: {
    api_key: string;
    from_email?: string;
  };
}

async function getResendCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Resend connector env vars missing (REPLIT_CONNECTORS_HOSTNAME / REPL_IDENTITY)");
  }

  const connectionSettings: ConnectionSettings | undefined = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    },
  )
    .then((res) => res.json())
    .then((data: { items?: ConnectionSettings[] }) => data.items?.[0]);

  if (!connectionSettings?.settings?.api_key) {
    throw new Error("Resend not connected — API key missing from connector settings");
  }

  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email ?? "Astra <noreply@astra.app>",
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

export interface InviteEmailOptions {
  to: string;
  inviterName: string | null;
  profileName: string;
  relationshipName: string | null;
  claimUrl: string;
}

/**
 * Send an invite email via Resend.
 * Returns true on success, false on failure (graceful degradation — caller still
 * returns 201 and the copy-link UI is always shown as a fallback).
 */
export async function sendInviteEmail(opts: InviteEmailOptions): Promise<boolean> {
  const { to, inviterName, profileName, relationshipName, claimUrl } = opts;

  const from = inviterName ?? "Someone";
  const subject = relationshipName
    ? `${from} created a compatibility report for you on Astra`
    : `${from} shared an astrology profile with you on Astra`;

  const htmlBody = buildInviteHtml({ inviterName, profileName, relationshipName, claimUrl });
  const textBody = buildInviteText({ inviterName, profileName, claimUrl });

  try {
    const { apiKey, fromEmail } = await getResendCredentials();
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      logger.warn({ error, to }, "[invite-email] Resend returned an error");
      return false;
    }

    logger.info({ to, subject }, "[invite-email] sent successfully via Resend");
    return true;
  } catch (err) {
    logger.warn({ err, to }, "[invite-email] failed to send via Resend");
    return false;
  }
}

function buildInviteText(opts: Pick<InviteEmailOptions, "inviterName" | "profileName" | "claimUrl">): string {
  const { inviterName, profileName, claimUrl } = opts;
  const from = inviterName ?? "A friend";
  return [
    `${from} created an Astra chart for ${profileName} and is inviting you to claim it.`,
    ``,
    `Open your report:`,
    claimUrl,
    ``,
    `This link is private to you and expires in 7 days.`,
    ``,
    `— Astra`,
  ].join("\n");
}

function buildInviteHtml(
  opts: Pick<InviteEmailOptions, "inviterName" | "profileName" | "relationshipName" | "claimUrl">,
): string {
  const { inviterName, profileName, relationshipName, claimUrl } = opts;
  const from = escapeHtml(inviterName ?? "A friend");
  const safeName = escapeHtml(profileName);
  const safeUrl = encodeURI(claimUrl);
  const intro = relationshipName
    ? `<strong>${from}</strong> created a compatibility report between you and ${safeName} on Astra.`
    : `<strong>${from}</strong> created an Astra astrology chart for <strong>${safeName}</strong> and is inviting you to claim it.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Astra invite</title>
</head>
<body style="margin:0;padding:0;background:#0D1117;font-family:'Inter',Arial,sans-serif;color:#E6EDF3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#161B22;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#5B6CF6 0%,#7C4DFF 100%);padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:300;letter-spacing:0.05em;color:#fff;font-family:Georgia,serif;">✦ Astra</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C9D1D9;">${intro}</p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#8B949E;">
                Click below to view your chart, see how your birth planets align, and explore your personalised report.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#5B6CF6 0%,#7C4DFF 100%);border-radius:8px;padding:14px 32px;text-align:center;">
                    <a href="${safeUrl}" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">
                      Open my Astra report →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#6E7681;text-align:center;">
                This link is private to you and expires in 7 days.<br/>
                If you weren't expecting this email you can safely ignore it.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #21262D;text-align:center;">
              <p style="margin:0;font-size:11px;color:#484F58;">© Astra — Natal Chart Reports</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

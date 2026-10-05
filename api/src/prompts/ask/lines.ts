/**
 * The lines Ask never leaves to a model (ADR-213): the harm reply, the line for
 * a question it does not take, the line when no answer passed its checks, and
 * the line at the month's cap. Fixed, so they read the same every time and no
 * check can fail them. Written through /ux-copy in simple words (ADR-257).
 */

/** Sent instead of any astrology when a message is about harm, with where to get help today. */
export const HARM_REPLY =
  "Ask can't help with this. If you or someone else is in danger, call your local emergency number now. Please talk to someone today if you're thinking about hurting yourself or if someone is hurting you. A person you trust, a doctor or a helpline in your country can help.";

/** For a question that isn't about the reader's chart, reports or timeline, or that asks for advice Ask never gives. */
export const OFF_TOPIC_LINE =
  "Ask only answers questions about your chart, your reports and your timeline. It doesn't give medical, legal or money advice. Try asking about a date, a planet or something in one of your reports.";

/** When the answer call fails, or its retry still breaks a rule, the reader gets this and never the failed text. */
export const FALLBACK_LINE = "Ask couldn't answer that just now. Please try again in a moment.";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * At the month's cap (reading 13, ADR-263). `resetsOn` is the UTC date the
 * count starts again, as `AskUsage.resetsOn` gives it. No count is written
 * here: the cap is the server's to move (the timeline spec's cap note).
 */
export function capLine(resetsOn: string | Date): string {
  const iso = typeof resetsOn === "string" ? resetsOn : resetsOn.toISOString();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month) throw new RangeError(`capLine needs a YYYY-MM-DD date, got ${iso}`);
  return `You've used all your Ask messages for this month. They come back on ${Number(match[3])} ${month}. Everything else in Timeline still works.`;
}

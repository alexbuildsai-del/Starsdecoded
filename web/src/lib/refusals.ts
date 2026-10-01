/**
 * The API's two refusals as one plain line (ADR-199, 202; security-hardening Screens): a limit reached (429) and a pause
 * (503), shown where each form already shows its errors. The words live in the API's `message`; the page adds only the
 * reader's own clock, which the server cannot know.
 */

type Refusal = { error?: unknown; message?: unknown; retryAfterSeconds?: unknown };

const WINDOWS = /^(.*) within (?:the hour|a day)\.$/s;

function bodyOf(error: unknown): Refusal | null {
  const data = (error as { data?: unknown } | null)?.data;
  return data && typeof data === "object" ? (data as Refusal) : null;
}

function secondsOf(error: unknown, body: Refusal): number | null {
  const given = body.retryAfterSeconds;
  if (typeof given === "number" && Number.isFinite(given) && given > 0) return given;
  const header = (error as { headers?: { get?: (name: string) => string | null } } | null)?.headers?.get?.("Retry-After");
  const parsed = header ? Number(header) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** The hour the limit opens again, in the reader's own time, rounded up to the minute so it is never early. */
export function openingTime(seconds: number, now: Date = new Date()): string {
  const opens = new Date(Math.ceil((now.getTime() + seconds * 1000) / 60_000) * 60_000);
  const clock = opens.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return opens.toDateString() === now.toDateString() ? `at ${clock}` : `tomorrow at ${clock}`;
}

/**
 * The line for a refusal, or null for any other error. A limit's own first sentence is kept and its "within the hour" becomes
 * the time; with no seconds, or a window the page does not restate (a minute), the API's line stands as written.
 */
export function refusalLine(error: unknown, now: Date = new Date()): string | null {
  const body = bodyOf(error);
  if (!body || typeof body.message !== "string" || !body.message) return null;
  if (body.error === "paused") return body.message;
  if (body.error !== "rate_limited") return null;
  const seconds = secondsOf(error, body);
  const split = WINDOWS.exec(body.message);
  return seconds !== null && split ? `${split[1]} ${openingTime(seconds, now)}.` : body.message;
}

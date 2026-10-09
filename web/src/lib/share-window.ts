/**
 * What the Share window says and decides without drawing anything (sharing-and-circle §1, ADR-329): how pasted text
 * becomes addresses, how the people who can read a report are ordered and counted, and the plain lines for a refused
 * share. States come from GET /home only (ADR-341, 390); nothing here keeps a copy of them.
 */
import type { HomeReader } from "@workspace/api-client-react";
import { refusalLine } from "@/lib/refusals";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (text: string): boolean => EMAIL.test(text);

/** Pasted or typed text as one piece per address: split at commas, semicolons and spaces, brackets and quotes shaved off, no repeats. */
export function splitEmails(text: string): string[] {
  const seen = new Set<string>();
  const pieces: string[] = [];
  for (const raw of text.split(/[,;\s]+/)) {
    const piece = raw.replace(/^[<("']+|[>)"'.]+$/g, "");
    if (!piece || seen.has(piece.toLowerCase())) continue;
    seen.add(piece.toLowerCase());
    pieces.push(piece);
  }
  return pieces;
}

/** The addresses in a pasted text that pass the check, and the pieces that do not (they are marked in place, never sent). */
export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const pieces = splitEmails(text);
  return { valid: pieces.filter(isEmail), invalid: pieces.filter((piece) => !isEmail(piece)) };
}

export type ChipState = "ok" | "bad" | "extra";

/**
 * What each chip is, in order. Someone's report goes to that person only and a pair's to its other person (ADR-181,
 * MB-82), so with `single` the first good address is the one and any later good one is an extra, marked in place
 * and never sent.
 */
export function classifyChips(values: readonly string[], single: boolean): ChipState[] {
  let taken = false;
  return values.map((value) => {
    if (!isEmail(value)) return "bad";
    if (single && taken) return "extra";
    taken = true;
    return "ok";
  });
}

/** "thibault@example.com" becomes "Thibault": the name an invited person shows under until they join. */
export function nameFromEmail(email: string): string {
  const name = email.split("@")[0].replace(/[._+-]+/g, " ").trim();
  return name.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase()) || email;
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((part) => Array.from(part)[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/** The footer's count; the owner is not counted (the mock's "1 person can read it · 1 invited"). */
export function footerLine(readers: readonly HomeReader[]): string {
  const reading = readers.filter((r) => r.state === "can-read").length;
  const invited = readers.filter((r) => r.state === "invited").length;
  const head =
    reading === 0 ? "Only you can read it"
    : reading === 1 ? "1 person can read it"
    : `${reading} people can read it`;
  return invited ? `${head} · ${invited} invited` : head;
}

/** Invited people sit at the top under the owner, then the people who already read; each group keeps the server's order. */
export function orderedReaders(readers: readonly HomeReader[]): HomeReader[] {
  return [...readers.filter((r) => r.state === "invited"), ...readers.filter((r) => r.state !== "invited")];
}

export function readerName(reader: HomeReader): string {
  if (reader.name) return reader.name;
  if (reader.email) return nameFromEmail(reader.email);
  return "Someone";
}

/** The grey line under a name: the address an invite went to, or that they can read it. */
export function readerLine(reader: HomeReader): string {
  return reader.state === "invited" ? (reader.email ?? "Waiting to join") : "Can read it";
}

export function sentToast(count: number): string {
  return count === 1 ? "Invite sent" : `Invites sent to ${count} people`;
}

export const SHARE_FALLBACK = "We couldn't share it. Try again in a minute.";

/**
 * The line for a share that did not go, in the API's own words (B-52): a limit's time in the reader's clock, else the
 * message the route sent (a 400 about the reader's own address, a 403 about who may read this one), else a line by code.
 */
export function shareFailureLine(error: unknown): string {
  const limit = refusalLine(error);
  if (limit) return limit;
  const body = (error as { data?: { error?: unknown; message?: unknown } | null } | null)?.data;
  if (typeof body?.message === "string" && body.message) return body.message;
  if (body?.error === "validation_error") return "That email address did not work. Check it and try again.";
  if (body?.error === "not_ready") return "You can share it once it is finished.";
  return SHARE_FALLBACK;
}

/**
 * Copies a link that must first be fetched. The copy starts inside the tap, with the link still coming, because Safari
 * refuses a copy made after an await; where that is not possible the link is handed back to show in a field.
 */
export async function copyLink(getUrl: () => Promise<string>): Promise<{ copied: true } | { copied: false; url: string }> {
  const url = getUrl();
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const blob = url.then((text) => new Blob([text], { type: "text/plain" }));
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return { copied: true };
    }
    await navigator.clipboard.writeText(await url);
    return { copied: true };
  } catch {
    // The link itself may have failed, which is the caller's to show; a refused copy leaves the link to copy by hand.
    return { copied: false, url: await url };
  }
}

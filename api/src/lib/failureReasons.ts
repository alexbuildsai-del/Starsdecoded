/**
 * Why a report failed, as a code the customer can read (ADR-84). The four
 * lines are the whole customer-facing vocabulary of failure; internal text
 * stays in `reports.error_message` and never reaches a response.
 */
import { OutOfCreditError, SectionError } from "./aiInterpretation.js";

export type FailureCode = "provider_unreachable" | "provider_out_of_credit" | "quality" | "internal";

export const FAILURE_CODES: readonly FailureCode[] = ["provider_unreachable", "provider_out_of_credit", "quality", "internal"];

export const FAILURE_LINES: Record<FailureCode, string> = {
  provider_unreachable: "Our writing service didn't answer. Try again in a few minutes.",
  provider_out_of_credit: "We can't write reports right now. We've been alerted. Try again later.",
  quality: "One chapter didn't meet our quality bar after several tries. Try again.",
  internal: "Something went wrong on our side. We've been alerted.",
};

export interface FailureReason {
  code: FailureCode;
  line: string;
}

export function failureReasonOf(code: string | null | undefined): FailureReason | null {
  if (!code) return null;
  const known = (FAILURE_CODES as readonly string[]).includes(code) ? (code as FailureCode) : "internal";
  return { code: known, line: FAILURE_LINES[known] };
}

/** An error that already knows its code: the generators throw one after the round alone fails. */
export class ReportFailure extends Error {
  constructor(public readonly code: FailureCode, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ReportFailure";
  }
}

const NETWORK_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "EPIPE", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"]);
const NETWORK_NAMES = new Set(["APIConnectionError", "APIConnectionTimeoutError", "InternalServerError", "AbortError", "APIUserAbortError"]);

function isUnreachable(err: unknown): boolean {
  const e = err as { status?: number; code?: string; name?: string; message?: string; cause?: unknown } | null;
  if (!e || typeof e !== "object") return false;
  if (typeof e.status === "number" && (e.status >= 500 || e.status === 429 || e.status === 408)) return true;
  if (e.code && NETWORK_CODES.has(e.code)) return true;
  if (e.name && NETWORK_NAMES.has(e.name)) return true;
  if (/fetch failed|network|timed? ?out|socket hang up|ECONNRESET|ECONNREFUSED|aborted/i.test(e.message ?? "")) return true;
  return e.cause ? isUnreachable(e.cause) : false;
}

/** Network, a 5xx or a timeout are the provider not answering; a quota 429 is credit; a section that never passed is quality; the rest is ours. */
export function failureCodeOf(err: unknown): FailureCode {
  if (err instanceof ReportFailure) return err.code;
  if (err instanceof OutOfCreditError) return "provider_out_of_credit";
  if (err instanceof SectionError) return "quality";
  if (isUnreachable(err)) return "provider_unreachable";
  return "internal";
}

/**
 * Which of the Compatibility table's rows a pair reads as (dashboard-sky,
 * Compatibility), and the copy each carries. Pure: the caller already knows
 * whether the two natal reports are ready, whether a pair exists, and
 * whether it is still readable; this only chooses the row.
 */

export type PairRowState =
  | "open"
  | "generate"
  | "get_credits"
  | "their_writing"
  | "generating"
  | "pair_writing"
  | "needs_yours"
  | "closed";

export type PairReportStatus = "pending" | "computing" | "interpreting" | "complete" | "failed";

const WRITING_STATUSES: readonly PairReportStatus[] = ["pending", "computing", "interpreting"];

export interface PairRowInput {
  /** The viewer's own natal report is finished; a pair can never be proposed without it. */
  ownReportReady: boolean;
  /** The other person's natal report is finished. Read only while no pair exists yet. */
  otherReportReady: boolean;
  /** Credits available to spend on Generate. Read only while no pair exists yet. */
  credits: number;
  /** Generate was just pressed, before the pair exists server-side to poll (ADR-130, 131). */
  generating?: boolean;
  /** The pair's own report, once Generate has made one. Absent before that, and a `failed` one clears like it never happened, so trying again is never blocked. */
  pair?: {
    status: PairReportStatus;
    /** False once its sender stops sharing it, or a natal report it reads from is no longer shared (MB-103). */
    readable: boolean;
  };
}

/** One state per row of the table; `closed` is the MB-103 provisional reading. */
export function pairRowState(input: PairRowInput): PairRowState {
  if (input.pair && input.pair.status !== "failed") {
    if (!input.pair.readable) return "closed"; // MB-103 provisional
    if (WRITING_STATUSES.includes(input.pair.status)) return "pair_writing";
    return "open";
  }
  if (input.generating) return "generating";
  if (!input.ownReportReady) return "needs_yours";
  if (!input.otherReportReady) return "their_writing";
  if (input.credits <= 0) return "get_credits";
  return "generate";
}

/**
 * The fixed half of each row's copy, quoted from the locked spec and the
 * artifact. A `{name}` placeholder stands for the other person's first name;
 * the credit count, the button and the pair's title are the card's own job.
 */
export const PAIR_ROW_COPY: Record<PairRowState, string> = {
  open: "",
  generate: "How the two of you work, and why.",
  get_credits: "How the two of you work, and why.",
  their_writing: "Generate opens when {name}'s report is finished.",
  generating: "How the two of you work, and why.",
  pair_writing: "It opens here when it is finished.",
  needs_yours: "Needs your own report first.",
  closed: "No longer shared",
};

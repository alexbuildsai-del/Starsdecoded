/**
 * Which nudge, if any, a card shows: at most one, in the credit loop's table
 * order (credit-loop.md, "The nudges"; ADR-126), plus a gift's suggestion of
 * the reader's own chart once claimed, over Generate my chart (ADR-139,
 * reading 5). Pure: the caller already knows what just finished and what the
 * reader has acted on; this only picks the words and names the control they
 * sit above, since a nudge draws no button of its own and carries no timer
 * or countdown (ADR-127).
 *
 * A shown nudge is remembered by its report id, in the reader's own browser
 * only, never a person's data (MB-43); the privacy draft names that key
 * (MB-33) as `NUDGE_SEEN_KEY`.
 */

export const NUDGE_SEEN_KEY = "sd.nudge.seen";

export interface PersonReportNudge {
  /** The natal report's id: shown once, then remembered in `sd.nudge.seen`. */
  reportId: string;
  /** The other person's first name, as the line names them. */
  name: string;
  /** A compatibility can be generated now: the reader's own report is ready, a credit is free, and no pair exists yet (the Compatibility table's "generate" row). */
  canGeneratePair: boolean;
  /** Send is still open on this report: offered, and not yet joined. */
  canSend: boolean;
}

export interface PairReportNudge {
  /** The compatibility report's id. */
  reportId: string;
  /** The other person's first name. */
  name: string;
  /** Send is still open on this pair: offered, and not yet joined. */
  canSend: boolean;
}

export interface ClaimedGiftNudge {
  /** Who gave the credit, named in the line. */
  giverName: string;
  /** True once the reader has a finished natal report of their own; the suggestion stops there. */
  hasOwnChart: boolean;
}

/**
 * Everything one card might have to nudge about. A person's card carries
 * `personReport` and, once a pair exists, `pairReport`; the reader's own
 * card carries `credits` and, right after a claim, `claimedGift`. A field
 * left out never fires its row; the caller decides which apply to the card
 * it is building (ADR-138's enforcement included: pass `credits` only where
 * zero should mean something).
 */
export interface NudgeCard {
  personReport?: PersonReportNudge;
  pairReport?: PairReportNudge;
  /** Credits left to spend, read only on the card that shows the balance. */
  credits?: number;
  claimedGift?: ClaimedGiftNudge;
}

export interface Nudge {
  /** The fact, quoted from the locked table with the name filled in. */
  line: string;
  /** The next step, printed under it. */
  detail: string;
  /** The control the nudge sits above; `Nudge` draws none of its own. */
  control: "generate_pair" | "send" | "get_credits" | "generate_own";
  /** The report to add to `sd.nudge.seen` once the reader acts; absent for the credits and gift rows, which name no report. */
  reportId?: string;
}

/**
 * At most one row, in the table's order (ADR-126): a person's report ready
 * to pair, else still worth sending; then a finished pair still worth
 * sending; then zero credits; then, only while the reader has no chart of
 * their own, a claimed gift's suggestion (ADR-139). A report already in
 * `seen` never nudges again for that row, but does not block a different row.
 */
export function nudgeFor(card: NudgeCard, seen: ReadonlySet<string>): Nudge | null {
  const person = card.personReport;
  if (person && !seen.has(person.reportId)) {
    if (person.canGeneratePair) {
      return {
        line: `${person.name} is in your orbit`,
        detail: "Read the two of you · 1 credit",
        control: "generate_pair",
        reportId: person.reportId,
      };
    }
    if (person.canSend) {
      return {
        line: `It is about ${person.name}`,
        detail: "Send it to them; it becomes theirs.",
        control: "send",
        reportId: person.reportId,
      };
    }
  }

  const pair = card.pairReport;
  if (pair && pair.canSend && !seen.has(pair.reportId)) {
    return {
      line: `You and ${pair.name}`,
      detail: "Send it to them if you want them to read it.",
      control: "send",
      reportId: pair.reportId,
    };
  }

  if (card.credits !== undefined && card.credits <= 0) {
    return {
      line: "Your orbit has room for more",
      detail: "Credits come in 1, 3 and 5.",
      control: "get_credits",
    };
  }

  const gift = card.claimedGift;
  if (gift && !gift.hasOwnChart) {
    return {
      line: `${gift.giverName} gave you a credit`,
      detail: "Start with your own chart.",
      control: "generate_own",
    };
  }

  return null;
}

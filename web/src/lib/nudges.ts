/**
 * Which nudge, if any, a card shows: at most one, in the credit loop's table
 * order (credit-loop.md, "The nudges"; ADR-126), with Review 01/10's words
 * (ADR-170, 181, 182): the circle, Share with, and one line for a circle that
 * holds only the reader. Then a gift's suggestion of the reader's own report
 * once claimed (ADR-139). Pure: the caller already knows what just finished
 * and what the reader has acted on; this only picks the words and names the
 * control they sit above, since a nudge draws no button of its own and carries
 * no timer or countdown (ADR-127).
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
  /** Share is still open on this report: offered, and not yet joined. */
  canSend: boolean;
}

export interface PairReportNudge {
  /** The compatibility report's id. */
  reportId: string;
  /** The other person's first name. */
  name: string;
  /** Share is still open on this pair: offered, and not yet joined. */
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
 * card carries `alone` and `credits` and, right after a claim, `claimedGift`.
 * A field left out never fires its row; the caller decides which apply to the
 * card it is building (ADR-138's enforcement included: pass `credits` only
 * where zero should mean something).
 */
export interface NudgeCard {
  personReport?: PersonReportNudge;
  pairReport?: PairReportNudge;
  /** The reader's own report is at the centre and nobody else is in their circle yet. */
  alone?: boolean;
  /** Credits left to spend: at zero, the circle's line sits over Get credits rather than Add someone. */
  credits?: number;
  claimedGift?: ClaimedGiftNudge;
}

export interface Nudge {
  /** The fact, with the name filled in. */
  line: string;
  /** The next step, printed under it. */
  detail: string;
  /** The control the nudge sits above; `Nudge` draws none of its own. */
  control: "generate_pair" | "send" | "add_someone" | "get_credits" | "generate_own";
  /** The report to add to `sd.nudge.seen` once the reader acts; absent for the circle and gift rows, which name no report. */
  reportId?: string;
}

/**
 * At most one row, in the table's order (ADR-126): a person's report ready
 * to pair, else still worth sharing; then a finished pair still worth
 * sharing; then a circle with only the reader in it, whatever the balance,
 * since the approved dashboard says it there and nowhere else (Review 01/10);
 * then, only while the reader has no report of their own, a claimed gift's
 * suggestion (ADR-139). A report already in `seen` never nudges again for
 * that row, but does not block a different row.
 */
export function nudgeFor(card: NudgeCard, seen: ReadonlySet<string>): Nudge | null {
  const person = card.personReport;
  if (person && !seen.has(person.reportId)) {
    if (person.canGeneratePair) {
      return {
        line: `${person.name} is in your circle`,
        detail: "Read the two of you · 1 credit",
        control: "generate_pair",
        reportId: person.reportId,
      };
    }
    if (person.canSend) {
      return {
        line: `It is about ${person.name}`,
        detail: "Share it with them. It becomes theirs.",
        control: "send",
        reportId: person.reportId,
      };
    }
  }

  const pair = card.pairReport;
  if (pair && pair.canSend && !seen.has(pair.reportId)) {
    return {
      line: `You and ${pair.name}`,
      detail: "Share it with them if you want them to read it.",
      control: "send",
      reportId: pair.reportId,
    };
  }

  if (card.alone) {
    return {
      line: "Add someone to your circle.",
      detail: "1 credit = 1 report.",
      control: card.credits !== undefined && card.credits <= 0 ? "get_credits" : "add_someone",
    };
  }

  const gift = card.claimedGift;
  if (gift && !gift.hasOwnChart) {
    return {
      line: `${gift.giverName} gave you a credit`,
      detail: "Start with your own Personal report.",
      control: "generate_own",
    };
  }

  return null;
}

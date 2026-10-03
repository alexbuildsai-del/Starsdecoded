/**
 * Which nudge, if any, a card shows: at most one, with Review 01/10's words
 * (ADR-170, 181, 182) for a circle that holds only the reader, then a gift's
 * suggestion of the reader's own report once claimed (ADR-139). The credit
 * loop's rows for a finished person's report and a finished pair (ADR-126),
 * and the note of which ones were seen, left with MB-136: nothing had drawn
 * them since the dashboard became a home (R12).
 * Pure: the caller already knows what the reader has; this only picks the words
 * and names the control they sit above, since a nudge draws no button of its
 * own and carries no timer or countdown (ADR-127).
 */

export interface ClaimedGiftNudge {
  /** Who gave the credit, named in the line. */
  giverName: string;
  /** True once the reader has a finished natal report of their own; the suggestion stops there. */
  hasOwnChart: boolean;
}

/**
 * Everything the reader's own card might have to nudge about: `alone` and
 * `credits` and, right after a claim, `claimedGift`. A field left out never
 * fires its row; the caller decides which apply to the card it is building
 * (ADR-138's enforcement included: pass `credits` only where zero should mean
 * something).
 */
export interface NudgeCard {
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
  control: "add_someone" | "get_credits" | "generate_own";
}

/**
 * At most one row: a circle with only the reader in it, whatever the balance,
 * since the approved dashboard says it there and nowhere else (Review 01/10);
 * then, only while the reader has no report of their own, a claimed gift's
 * suggestion (ADR-139).
 */
export function nudgeFor(card: NudgeCard): Nudge | null {
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

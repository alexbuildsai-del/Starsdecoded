/**
 * The one required tick at checkout, word for word (R-6.6, ADR-143). Directive 2011/83/EU
 * ends a buyer's 14-day right to cancel digital content only if they agree to an immediate
 * start and accept losing it (Art. 16(m)), and the receipt repeats that agreement (Art. 8(7)),
 * so the checkout, the Terms and the receipt all read this one constant.
 */
export const CHECKOUT_TICK =
  "Write each report as soon as I use a credit on it. I understand I can't cancel or get a refund for a credit once it's used.";

/**
 * The plan's own tick, beside the credits one: Timeline starts the moment it is paid, so the
 * same Art. 16(m) agreement is needed for a month or a year (R-6.6).
 */
// MB-225 decided, ADR-361: the plan's tick and the Refunds wording around it stand as R17 built them.
export const PLAN_TICK =
  "Start Timeline as soon as I pay. I give up my right to cancel a month or year once it has started.";

/**
 * ADR-143's three refund rules in the reader's words. The Refunds page prints them as they
 * stand and the receipt repeats them, so each one has to read on its own.
 */
export const REFUND_RULES: readonly [string, string, string] = [
  "If you ask within 14 days of buying, we refund any credit you haven't used and take it off your balance.",
  "If a report fails, Try again is free. If we still can't write it, its credit comes back to your balance. For a Compatibility report, the credit comes back at once.",
  "Beyond that, we may refund anyone who asks, case by case.",
];

/**
 * The one required tick at checkout, word for word (R-6.6, ADR-143). Directive 2011/83/EU
 * ends a buyer's 14-day right to cancel digital content only if they agree to an immediate
 * start and accept losing it (Art. 16(m)), and the receipt repeats that agreement (Art. 8(7)),
 * so the checkout, the Terms and the receipt all read this one constant.
 */
export const CHECKOUT_TICK =
  "Write each report as soon as I use a credit on it. I understand I can't cancel or get a refund for a credit once it's used.";

/**
 * ADR-143's three refund rules in the reader's words. The Refunds page prints them as they
 * stand and the receipt repeats them, so each one has to read on its own.
 */
export const REFUND_RULES: readonly [string, string, string] = [
  "If you ask within 14 days of buying, we refund any credit you haven't used and take it off your balance.",
  "If a report fails, its credit comes back to your balance automatically.",
  "Beyond that, we may refund anyone who asks, case by case.",
];

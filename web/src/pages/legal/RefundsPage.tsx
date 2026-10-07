import { Link } from "wouter";
import { PLANS, PLAN_TICK, REFUND_RULES } from "@workspace/commerce";
import { CONTACT, LegalLayout, LegalSection, MailLink } from "./LegalLayout";

/** "month or year": the plans' periods read from the catalogue, so the page moves with it (R-6.3). */
const PERIODS = PLANS.map((plan) => plan.interval).join(" or ");

// The page says exactly ADR-143's three rules, so they are printed from the constant the receipt repeats.
export default function RefundsPage() {
  return (
    <LegalLayout path="/refunds">
      <LegalSection title="How refunds work">
        <ol className="list-decimal space-y-3 pl-5 marker:text-[var(--sd-muted)]">
          {REFUND_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        {CONTACT ? (
          <p>
            To ask for a refund, write to <MailLink address={CONTACT} />.
          </p>
        ) : null}
        <p>
          <Link href="/terms#credits">What you agree to when you buy credits</Link>
        </p>
      </LegalSection>

      {/* MB-225 decided, ADR-361: what Refunds says of Timeline follows the plan's box as R17 built it. */}
      <LegalSection id="timeline" title="Timeline">
        <p>When you start Timeline, you tick a box that says: “{PLAN_TICK}”</p>
        <p>
          You can stop Timeline any time on your Account page. It stays on until the end of the {PERIODS} you've paid for.
          You aren't charged again.
        </p>
        <p>
          <Link href="/terms#timeline">What you agree to when you start Timeline</Link>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

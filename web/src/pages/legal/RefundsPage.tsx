import { LegalLayout, LegalSection } from "./LegalLayout";

// MB-5 provisional: refund terms belong to the pricing session. MB-31: entity.
export default function RefundsPage() {
  return (
    <LegalLayout kicker="Legal" title="Refunds" updated="9 September 2026">
      <LegalSection title="Digital content, delivered at once">
        <p>
          A report is digital content that is written for you the moment you order it. By
          confirming a purchase you ask us to start immediately and you acknowledge that, once the
          report is delivered, the statutory right to withdraw within 14 days no longer applies.
        </p>
      </LegalSection>

      <LegalSection title="When we refund">
        <p>
          If the report fails to generate, you are refunded in full without asking. If the report is
          delivered but you believe it does not match the birth data you entered, write to
          [CONTACT EMAIL] within 14 days and we will regenerate it or refund it.
        </p>
      </LegalSection>

      <LegalSection title="How">
        <p>
          Refunds go back to the payment method used, issued by [LEGAL ENTITY]. Allow up to ten
          working days for it to appear.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

import { LegalLayout, LegalSection } from "./LegalLayout";

// MB-31 provisional: the contracting entity is a placeholder.
export default function TermsPage() {
  return (
    <LegalLayout kicker="Legal" title="Terms of service" updated="9 September 2026">
      <LegalSection title="The service">
        <p>
          Stars Decoded, operated by [LEGAL ENTITY], [COUNTRY], computes a natal chart from the
          birth data you enter and writes a psychological report from it. The report is a one-time
          digital product. There is no subscription.
        </p>
      </LegalSection>

      <LegalSection title="What the report is and is not">
        <p>
          The report describes patterns, tendencies and growth edges. It does not predict events,
          name dates, promise outcomes or invoke fate. It is not medical, psychological or
          financial advice and is not a diagnosis of anything. Use it as one lens on yourself, not
          as an instruction.
        </p>
      </LegalSection>

      <LegalSection title="Your data and your account">
        <p>
          You may enter birth data for yourself and for people you have a right to describe. When
          you invite someone, they see only what the invitation says. Our privacy policy explains
          what we store and how to delete it.
        </p>
      </LegalSection>

      <LegalSection title="Payment and refunds">
        <p>
          A purchase grants one report. Refunds are described on the refunds page. Prices are
          shown before you pay.
        </p>
      </LegalSection>

      <LegalSection title="Liability and law">
        <p>
          We provide the report as it is. To the extent the law allows, we are not liable for
          decisions you make on the basis of it. These terms are governed by the law of
          [COUNTRY]. Contact: [CONTACT EMAIL].
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

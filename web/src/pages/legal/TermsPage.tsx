import { LegalLayout, LegalSection } from "./LegalLayout";
import { usePageTitle } from "@/lib/page-title";

// MB-31 provisional: the contracting entity is a placeholder.
export default function TermsPage() {
  usePageTitle("Terms");

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
          You may enter birth data for yourself and for people you have a right to describe. Our
          privacy policy explains what we store and how to delete it.
        </p>
      </LegalSection>

      <LegalSection title="Who sees what">
        <p>
          A person's chart and report reach nobody else until that person shares them. Only you
          can approve sharing something about yourself, because it carries your birth details.
          Stop sharing ends that access at once.
        </p>
        <p>
          When you send someone their Personal natal report, it becomes theirs. You keep reading
          it, since you wrote it from details you had, until they choose Stop sharing, which ends
          your access at once.
        </p>
        {/* MB-103 provisional: whether a pair reaches its other person only by its maker's send is still open. */}
        <p>
          A Compatibility report reaches its other person only when one of the two people in it
          sends it. Once sent, it shows both people's birth records and passages from both of
          their Personal natal reports.
        </p>
        <p>
          A gift gives one credit, not a finished report. We hold it for 30 days and return it to
          you if nobody claims it. Once claimed, the credit moves into the recipient's balance to
          spend on any report. You see nothing the recipient writes with it, unless they choose to
          share it with you.
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

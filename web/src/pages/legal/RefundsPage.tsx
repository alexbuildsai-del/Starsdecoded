import { Link } from "wouter";
import { REFUND_RULES } from "@workspace/commerce";
import { CONTACT, LegalLayout, LegalSection, MailLink } from "./LegalLayout";

// The page says exactly ADR-143's three rules, so they are printed from the constant the receipt will repeat.
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
    </LegalLayout>
  );
}

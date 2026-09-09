import { LegalLayout, LegalSection } from "./LegalLayout";

// MB-31 provisional: every detail below is a placeholder.
export default function CompanyPage() {
  return (
    <LegalLayout kicker="Legal" title="Company details" updated="9 September 2026">
      <LegalSection title="Operator">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
          <dt className="font-label text-xs uppercase tracking-wide text-muted-foreground/70 pt-0.5">Entity</dt>
          <dd>[LEGAL ENTITY]</dd>
          <dt className="font-label text-xs uppercase tracking-wide text-muted-foreground/70 pt-0.5">Address</dt>
          <dd>[ADDRESS], [COUNTRY]</dd>
          <dt className="font-label text-xs uppercase tracking-wide text-muted-foreground/70 pt-0.5">Registration</dt>
          <dd>[COMPANY NUMBER]</dd>
          <dt className="font-label text-xs uppercase tracking-wide text-muted-foreground/70 pt-0.5">Contact</dt>
          <dd>[CONTACT EMAIL]</dd>
        </dl>
      </LegalSection>

      <LegalSection title="Method">
        <p>
          Planetary positions are computed locally with astronomy-engine using whole-sign houses.
          Reports are written by a general language model from those positions and a written
          doctrine. See the privacy policy for what leaves our servers.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

import type { ReactNode } from "react";
import { LEGAL_IDENTITY } from "@workspace/commerce";
import { CONTACT, LegalLayout, LegalSection, MailLink } from "./LegalLayout";

// MB-115 provisional: the postal address is kept out of this public repo until the sale needs it, and a missing one is
// left out, never shown as a placeholder (reading 10).
const POSTAL: string | null = LEGAL_IDENTITY.postalAddress?.trim() || null;

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="pt-1 font-label text-kicker uppercase tracking-[.16em] text-muted">{term}</dt>
      <dd className="text-paper">{children}</dd>
    </>
  );
}

export default function CompanyPage() {
  const { name, tradingName, country } = LEGAL_IDENTITY;

  return (
    <LegalLayout path="/company">
      <dl className="mb-14 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-prose leading-[1.6]">
        <Row term="Run by">{name}</Row>
        <Row term="Sells as">A private individual, trading as {tradingName}</Row>
        <Row term="Based in">{country}</Row>
        {CONTACT ? (
          <Row term="Email">
            <MailLink address={CONTACT} />
          </Row>
        ) : null}
        {POSTAL ? <Row term="Postal address">{POSTAL}</Row> : null}
      </dl>

      <LegalSection title={`If ${tradingName} becomes a company`}>
        <p>
          {tradingName} is sold by a private individual, not a company. If that changes, we'll update this page and email
          everyone who has an account.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

import { Link } from "wouter";
import { BUNDLES, CHECKOUT_TICK, LEGAL_IDENTITY } from "@workspace/commerce";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { CONTACT, LegalLayout, LegalSection, MailLink } from "./LegalLayout";

/** "1, 3 or 5": the bundle sizes read from the catalogue, so the terms move with it (R-6.3). */
function orList(items: readonly (string | number)[]): string {
  const words = items.map(String);
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}`;
}

export default function TermsPage() {
  const { name, tradingName, country } = LEGAL_IDENTITY;

  return (
    <LegalLayout path="/terms">
      <LegalSection title="Who we are">
        <p>
          In these terms, “we” means {name}, a private individual based in {country} who trades as {tradingName}.
          {CONTACT ? (
            <>
              {" "}
              You can write to us at <MailLink address={CONTACT} />.
            </>
          ) : null}
        </p>
      </LegalSection>

      <LegalSection title={`What ${PRODUCT} does`}>
        <p>
          {PRODUCT} works out a birth chart from the birth details you enter and writes a report from it. Each report is
          digital content, written for you when you use a credit on it.
        </p>
      </LegalSection>

      <LegalSection title="What a report is and isn't">
        <p>
          The report describes patterns, tendencies and growth edges. It does not predict events, name dates, promise
          outcomes or invoke fate. It is not medical, psychological or financial advice and is not a diagnosis of anything.
          Use it as one lens on yourself, not as an instruction.
        </p>
      </LegalSection>

      <LegalSection id="credits" title="Credits and prices">
        <p>
          You buy credits in bundles of {orList(BUNDLES.map((bundle) => bundle.credits))}. Each report, a {PERSONAL_REPORT} or
          a {COMPATIBILITY_REPORT}, uses one credit. Prices are in euros, include VAT and are shown before you pay. There's no
          subscription.
        </p>
        <p>When you buy credits, you tick a box that says: “{CHECKOUT_TICK}”</p>
        <p>
          EU law usually gives you 14 days to cancel an online purchase. For digital content like a report, that right ends
          once you ask for it to start straight away and accept losing the right. Ticking the box does both for each credit
          you use.
        </p>
        <p>So within 14 days of buying, you can get a refund for any credit you haven't used, but not for one you've used.</p>
        <p>
          <Link href="/refunds">When we refund you</Link>
        </p>
      </LegalSection>

      <LegalSection title="Your account and other people's details">
        <p>You need to be 16 or over to make an account.</p>
        <p>
          Only enter someone else's birth details if they know you're doing it. Enter a child's details only if you're their
          parent or guardian.
        </p>
        <p>
          Our <Link href="/privacy">privacy policy</Link> explains what we keep and how to delete it.
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

      <LegalSection title="Liability and law">
        <p>
          We provide each report as it is. As far as the law allows, we're not liable for decisions you make because of it.
        </p>
        <p>
          These terms are governed by the law of {country}. If you live elsewhere in the EU, you keep the protection your own
          country's consumer law gives you.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

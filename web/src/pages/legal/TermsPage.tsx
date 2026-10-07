import { Link } from "wouter";
import { BUNDLES, CHECKOUT_TICK, LEGAL_IDENTITY, PLANS, PLAN_TICK, type Plan } from "@workspace/commerce";
import { PAYMENTS } from "@/lib/processors";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { CONTACT, LegalLayout, LegalSection, MailLink } from "./LegalLayout";

/** "1, 3 or 5": the bundle sizes read from the catalogue, so the terms move with it (R-6.3). */
function orList(items: readonly (string | number)[]): string {
  const words = items.map(String);
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}`;
}

const PAYMENT_OF: Record<Plan["interval"], string> = { month: "monthly", year: "yearly" };

const credits = (count: number) => `${count} ${count === 1 ? "credit" : "credits"}`;

export default function TermsPage() {
  const { name, tradingName, country } = LEGAL_IDENTITY;
  const giving = PLANS.filter((plan) => plan.creditsToGive > 0);

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
        <p>Timeline shows when the planets reach the points in your own chart, and what that means for you.</p>
      </LegalSection>

      <LegalSection title="What a report is and isn't">
        <p>
          A report describes how you tend to think, work and love, and gives you things to try. It does not predict events,
          put dates on your life, promise outcomes or talk about fate. It is not medical, psychological or financial advice
          and is not a diagnosis of anything. Use it as one lens on yourself, not as an instruction.
        </p>
        <p>The same goes for Timeline. The only dates it shows are for the sky, like your Saturn return.</p>
      </LegalSection>

      <LegalSection id="credits" title="Credits and prices">
        <p>
          You buy credits in bundles of {orList(BUNDLES.map((bundle) => bundle.credits))}. Each report, a {PERSONAL_REPORT} or
          a {COMPATIBILITY_REPORT}, uses one credit. Prices are in euros, include VAT and are shown before you pay.
        </p>
        <p>
          You pay on our own checkout page. {PAYMENTS.name} takes the payment, so your card details go to {PAYMENTS.name} and
          never reach us.
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

      <LegalSection id="timeline" title="Timeline">
        <p>
          Timeline is our one subscription, for people with their own {PERSONAL_REPORT}. You pay for it{" "}
          {orList(PLANS.map((plan) => `each ${plan.interval}`))}, through {PAYMENTS.name} on our checkout page. Its price is
          in euros, includes VAT and is shown before you pay.
        </p>
        {giving.map((plan) => (
          <p key={plan.id}>
            Each {PAYMENT_OF[plan.interval]} payment also adds {credits(plan.creditsToGive)} to your balance.
          </p>
        ))}
        <p>
          Timeline renews until you stop it. You can stop it any time on your Account page. It then stays on until the end
          of the {orList(PLANS.map((plan) => plan.interval))} you've paid for.
        </p>
        <p>When you start Timeline, you tick a box that says: “{PLAN_TICK}”</p>
        <p>That right is the 14 days EU law usually gives you to cancel an online purchase.</p>
        <p>
          <Link href="/refunds#timeline">How refunds work for Timeline</Link>
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
          When you share someone's Personal report with them, it becomes theirs. You keep reading
          it, since you wrote it from details you had, until they choose Stop sharing, which ends
          your access at once.
        </p>
        {/* MB-103 provisional: whether a pair reaches its other person only by its maker's share is still open. */}
        <p>
          A Compatibility report reaches its other person only when one of the two people in it
          shares it. Once shared, it shows both people's birth records and passages from both of
          their Personal reports.
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
          We provide our reports and Timeline as they are. As far as the law allows, we're not liable for decisions you make
          because of them.
        </p>
        <p>
          These terms are governed by the law of {country}. If you live elsewhere in the EU, you keep the protection your own
          country's consumer law gives you.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

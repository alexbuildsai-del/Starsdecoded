import { Fragment } from "react";
import { LEGAL_IDENTITY } from "@workspace/commerce";
import { BROWSER_KEYS, PAYMENTS, PROCESSORS, STRIPE_COOKIES, US_TRANSFER, whereLine, type Processor } from "@/lib/processors";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { CONTACT, LegalLayout, LegalSection, MailLink } from "./LegalLayout";

const LIST = "list-disc space-y-3 pl-5 marker:text-[var(--sd-muted)]";

function ProcessorList({ rows }: { rows: readonly Processor[] }) {
  return (
    <ul className={LIST}>
      {rows.map((row) => {
        const where = whereLine(row);
        return (
          <li key={row.name}>
            <b className="font-semibold text-[var(--paper)]">{row.name}</b> {row.does}
            {where ? (
              <>
                {" "}
                <span className="sd-meta mt-1 block">{where}</span>
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function PrivacyPage() {
  const { name, tradingName, country } = LEGAL_IDENTITY;
  const servers = PROCESSORS.filter((row) => row.from === "server");
  const anyInTheUs = servers.some((row) => row.country === "the United States");

  return (
    <LegalLayout path="/privacy">
      <LegalSection title="Who is responsible for your data">
        <p>
          In this policy, “we” means {name}, a private individual based in {country} who trades as {tradingName}. We decide
          how your data is used, which makes us its controller under the GDPR.
        </p>
        <p>{PAYMENTS.name} takes your payments. It also uses your payment details for its own needs, like stopping fraud.</p>
        {CONTACT ? (
          <p>
            Write to <MailLink address={CONTACT} /> with any question about your data.
          </p>
        ) : null}
      </LegalSection>

      <LegalSection title="What we keep">
        <ul className={LIST}>
          <li>
            The birth details you enter, for yourself or someone else: a name, birth date, time and place, with the place's
            coordinates and time zone.
          </li>
          <li>The chart we work out from them, and the reports we write.</li>
          <li>Your account, if you make one: the ID our sign-in provider gives it and your email address.</li>
          <li>
            When you share a report or give a credit as a gift: the other person's email address, and the name and note you
            add.
          </li>
          <li>The credits you buy and use.</li>
          <li>
            For each payment: what you bought, the price, when you ticked the box at checkout, and {PAYMENTS.name}'s
            reference for the payment. We never see your card details.
          </li>
          <li>If you start Timeline: your plan, and when it renews or ends.</li>
        </ul>
        <p>We don't collect health data, and reports make no health, medical or clinical claims.</p>
      </LegalSection>

      <LegalSection title="How your report is written">
        <p>We work out your chart on our servers, from your birth details. OpenAI then writes your report's text from that chart.</p>
        <p>
          OpenAI gets the name you gave and the positions we worked out, never your birth date, time or place. For a{" "}
          {COMPATIBILITY_REPORT}, it also gets passages from both {PERSONAL_REPORT}s, and for a parent and child, the
          child's age.
        </p>
        <p>
          OpenAI keeps what we send it for up to 30 days to check for abuse, then deletes it. Those are its standard terms for
          businesses that use its API.
        </p>
        <p>OpenAI doesn't use what we send it to train its models.</p>
        <p>
          The free birth chart is worked out in your browser, so the birth date and time you type there never reach our
          servers. The words you type in the place field do, so we can find the place and its time zone.
        </p>
      </LegalSection>

      <LegalSection id="waitlist" title="The waitlist">
        <p>
          Before {PRODUCT} launches, you can join the waitlist with your email address. We email you a link, and your address
          goes on the list only when you click it. The link works for seven days. If you don't click it, we delete your
          address after seven days.
        </p>
        <p>
          With your address, we keep the date you joined, the form you used and the wording you agreed to. If the link that
          brought you had campaign tags, we keep those too. We don't keep your IP address.
        </p>
        <p>
          We use your address for one thing: to email you when {PRODUCT} launches. We delete it once that email has gone out,
          or sooner if you ask.
          {CONTACT ? (
            <>
              {" "}
              To be taken off the list, write to <MailLink address={CONTACT} />.
            </>
          ) : null}
        </p>
        <p>The form answers the same way for every address, so nobody can use it to find out who's on the list.</p>
      </LegalSection>

      <LegalSection id="payments" title="How you pay">
        <p>
          {PAYMENTS.name} takes the payments on our checkout page. You type your card details into {PAYMENTS.name}'s own
          fields, so they go to {PAYMENTS.name} and never reach us.
        </p>
        <p>
          We send {PAYMENTS.name} your email address and what you're buying. {PAYMENTS.name} tells us whether the payment
          went through, and emails you its own receipt.
        </p>
        <p>
          If you start Timeline, {PAYMENTS.name} also takes each renewal. Your Account page opens {PAYMENTS.name}'s own page,
          where you can change your card or stop Timeline.
        </p>
        <p>
          Our payments go through {PAYMENTS.company}, which is based in {PAYMENTS.country}, in the EU. {PAYMENTS.name} takes your
          payment for us. It also uses your payment details for its own needs, like stopping fraud, as{" "}
          <a href={PAYMENTS.policy}>{PAYMENTS.name}'s privacy policy</a> explains.
        </p>
      </LegalSection>

      <LegalSection id="processors" title="Who handles your data for us">
        <p>These companies run parts of {PRODUCT} for us.</p>
        <ProcessorList rows={servers} />
        {anyInTheUs ? <p>{US_TRANSFER}</p> : null}
      </LegalSection>

      <LegalSection title="Why we can use your data">
        <ul className={LIST}>
          <li>
            <b className="font-semibold text-[var(--paper)]">Charts, reports, payments and your account:</b> to give you
            what you asked for. The legal basis is our contract with you.
          </li>
          <li>
            <b className="font-semibold text-[var(--paper)]">The waitlist email:</b> to tell you when we launch. The legal basis
            is your consent, which you can withdraw at any time.
          </li>
          <li>
            <b className="font-semibold text-[var(--paper)]">Logs of requests to our servers:</b> to keep {PRODUCT} secure and
            working. The legal basis is our legitimate interest in running a safe service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <ul className={LIST}>
          <li>
            Your charts and reports stay until you delete them. Deleting a report removes it, and the birth details behind it
            unless another report uses them.
          </li>
          <li>Your account stays until you ask us to close it.</li>
          <li>We keep a record of what you buy, without any birth details, for our accounts.</li>
          <li>
            A waitlist address you haven't confirmed goes after seven days. A confirmed one goes once we've emailed you that{" "}
            {PRODUCT} has launched.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>You can delete any report yourself, from your dashboard.</p>
        {CONTACT ? (
          <>
            <p>
              Write to <MailLink address={CONTACT} /> to:
            </p>
            <ul className={LIST}>
              <li>get a copy of your data, which we email you within 30 days</li>
              <li>correct or delete your data</li>
              <li>close your account</li>
              <li>object to how we use your data</li>
            </ul>
            <p>We read that inbox every week.</p>
          </>
        ) : null}
        <p>You can also complain to {country}'s data protection authority, or to the one where you live.</p>
      </LegalSection>

      <LegalSection title="Data breaches">
        <p>
          If a breach ever exposes your data, we record what happened. We report it to {country}'s data protection authority
          within 72 hours of finding out.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and your browser">
        <p>
          We don't use analytics, advertising or tracking tools. The only cookies are the ones {PRODUCT} needs to work, so
          there's no cookie banner.
        </p>
        <p>
          Our own cookie, <code className="sd-mono text-[14px] text-[var(--paper)]">sd_session_id</code>, remembers which
          charts and reports are yours before you sign in. It lasts a year from your last visit. Clerk, our sign-in provider, sets its own cookies
          to know whether you're signed in.
        </p>
        <p>
          On our checkout page, {PAYMENTS.name}'s payment fields set cookies of their own:{" "}
          {STRIPE_COOKIES.map((cookie, i) => (
            <Fragment key={cookie.name}>
              {i === 0 ? "" : i === STRIPE_COOKIES.length - 1 ? " and " : ", "}
              <code className="sd-mono text-[14px] text-[var(--paper)]">{cookie.name}</code> for {cookie.lasts}
            </Fragment>
          ))}
          . {PAYMENTS.name} uses them to spot fraud.
        </p>
        <p>
          Some pages also keep a small note in your browser's storage, which stays on your device. Notes marked “This tab” go
          when you close the tab. The rest stay until you clear your browser's data.
        </p>
        <ul className={LIST}>
          {BROWSER_KEYS.map((key) => (
            <li key={key.name}>
              <code className="sd-mono text-[14px] text-[var(--paper)]">{key.name}</code>{" "}
              <span className="sd-meta ml-2 whitespace-nowrap">{key.store === "tab" ? "This tab" : "Until cleared"}</span>{" "}
              <span className="mt-1 block">{key.holds}</span>
            </li>
          ))}
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}

/**
 * What you get (timeline-page §1 item 4; ADR-255, 264): the plan card's lines with "Coming soon" where its price will
 * go, since Timeline has no price until launch (ADR-343), and how to get it in three steps, the last naming the Account
 * page, where cancelling lives (ADR-263). On launch day both plans' prices stand there, read live (ADR-355, 356). Get my
 * report is the one action, the waitlist before launch (ADR-167).
 */
import { formatEuro, PLANS } from "@workspace/commerce";
import { LAUNCHED } from "@workspace/launch";
import { usePrices } from "@/lib/prices";
import { PERSONAL_REPORT } from "@/lib/product";
import { ReportCta } from "@/site/cta";
import { buttonStyles } from "@/ds/atoms/Button";

const INCLUDED: readonly { line: string; more?: string }[] = [
  { line: "Your life's big cycles, birth to 90", more: "With your ages and dates, and what each one means" },
  {
    line: "What's going on for you now, this month and over six months",
    more: "In plain words, easy, mixed or intense, with how long it lasts",
  },
  { line: "A reading for each one", more: `Written for you and tied to your ${PERSONAL_REPORT}` },
  { line: "Ask, about your chart, your reports and your timeline" },
  { line: "Your week on your dashboard" },
  { line: "A Monday email in weeks that touch your chart", more: "Every week with something, only the big ones, or off" },
  { line: "With the yearly plan, 1 credit to give someone a report" },
];

const STEPS: readonly { lead: string; rest: string }[] = [
  { lead: `Get your ${PERSONAL_REPORT}.`, rest: "Timeline reads your chart through it." },
  { lead: "Read it to the end.", rest: "Its last page shows your sky today and lets you ask one question free." },
  { lead: "Start Timeline", rest: "there or from your dashboard. Cancel from your Account page, in two clicks." },
];

/** The catalogue's prices until the server's land, a campaign's among them, so the prerender and a refusal still show a price. */
function PlanPrices() {
  const { items } = usePrices();
  const line = PLANS.map((plan) => {
    const cents = items?.find((item) => item.id === plan.id)?.cents ?? plan.cents;
    return `${formatEuro(cents)} a ${plan.interval}`;
  }).join(" or ");
  return <p className="text-small text-paper-dim">{line}</p>;
}

export default function WhatYouGet() {
  return (
    <section className="sd-pg-sec sd-sec-c sd-line" aria-labelledby="get-h">
      <div className="sd-wrap">
        <div className="sd-shead">
          <p className="sd-eyebrow">What you get</p>
          <h2 className="sd-h2" id="get-h">
            Everything in Timeline
          </h2>
        </div>
        <div className="grid items-start gap-10 min-[880px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] min-[880px]:gap-x-10">
          <div className="grid min-w-0 gap-4 rounded-sheet border border-indigo bg-surface p-5 min-[880px]:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <h3 className="text-sheet-title leading-tight">Timeline</h3>
              {LAUNCHED ? <PlanPrices /> : <p className="text-small text-paper-dim">Coming soon</p>}
            </div>
            <ul role="list" className="m-0 grid list-none p-0">
              {INCLUDED.map(({ line, more }) => (
                <li
                  key={line}
                  className="grid grid-cols-[18px_minmax(0,1fr)] gap-2.5 border-t border-line-soft py-[9px] text-ui leading-normal"
                >
                  <span aria-hidden="true" className="mt-[7px] block h-[9px] w-[9px] rounded-full border-[1.5px] border-indigo-lt" />
                  <span className="min-w-0">
                    {line}
                    {more ? <small className="block text-caption leading-normal text-muted">{more}</small> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid min-w-0 content-start gap-3.5">
            <h3 className="sd-eyebrow">How to get it</h3>
            <ol role="list" className="m-0 grid list-none gap-2.5 p-0">
              {STEPS.map(({ lead, rest }, i) => (
                <li
                  key={lead}
                  className="grid grid-cols-[28px_minmax(0,1fr)] items-baseline gap-2.5 text-ui leading-normal text-paper-dim"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-6 w-6 place-items-center rounded-full border border-line font-numeric text-small text-paper"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <b className="font-medium text-paper">{lead}</b> {rest}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex">
              <ReportCta source="timeline" className={buttonStyles()} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

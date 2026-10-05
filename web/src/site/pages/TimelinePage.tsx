/**
 * /timeline, Timeline's product page (timeline-page §1; ADR-249 to 256): what Timeline is, the five things it gives a
 * reader shown on Mira's chart, the Saturn-return finder to try, what the plan holds, how it stays honest and the
 * questions, every word in the prerendered HTML (R-7.6). It goes live before Timeline does, under the waitlist like
 * every public page (ADR-167), so it names no price (ADR-255).
 */
import { Link } from "wouter";
import { SiteLayout } from "../SiteLayout";
import { CycleFinder } from "../components/CycleFinder";
import { FAQ_LINK_LABELS, TIMELINE_FAQ, type FaqItem } from "../data/faq";
import FiveThings from "../sections/timeline/FiveThings";
import Hero from "../sections/timeline/Hero";
import Honest from "../sections/timeline/Honest";
import WhatYouGet from "../sections/timeline/WhatYouGet";
import { pageFor } from "../site";

const page = pageFor("/timeline");

/** Folded, as the spec draws them; every answer is still in the HTML, so a crawler and FAQPage read them all. */
function Questions({ items }: { items: readonly FaqItem[] }) {
  return (
    <section className="sd-pg-sec sd-sec-b sd-line" aria-labelledby="questions-h">
      <div className="sd-wrap">
        <h2 className="sd-eyebrow" id="questions-h">
          Questions
        </h2>
        <div className="mt-6 max-w-[760px] border-t border-[color:var(--line-soft)]">
          {items.map((item) => {
            const more = item.link ? FAQ_LINK_LABELS[item.link] : undefined;
            return (
              <details key={item.q} className="group border-b border-[color:var(--line-soft)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md px-0.5 py-3.5 text-[15.5px] leading-snug text-[color:var(--paper)] [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="size-2 flex-none -translate-y-[3px] rotate-45 border-b-[1.5px] border-r-[1.5px] border-[color:var(--sd-muted)] transition-transform duration-[250ms] ease-[cubic-bezier(.16,1,.3,1)] group-open:translate-y-[2px] group-open:-rotate-[135deg]"
                  />
                </summary>
                <div className="grid justify-items-start gap-2 px-0.5 pb-4">
                  <p className="max-w-[64ch] text-[14.5px] leading-[1.55] text-[color:var(--paper-dim)]">{item.a}</p>
                  {item.link && more ? (
                    <Link className="sd-more mt-0 py-1.5" href={item.link}>
                      {more}
                    </Link>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
        <p className="sd-fine">
          The Saturn finder works from your birth date at midday, so a date can be a day off. The meanings come from astrology,
          which science doesn't back.
        </p>
      </div>
    </section>
  );
}

export default function TimelinePage() {
  return (
    <SiteLayout page={page} head={<Hero />}>
      <FiveThings />
      <CycleFinder />
      <WhatYouGet />
      <Honest />
      <Questions items={TIMELINE_FAQ} />
    </SiteLayout>
  );
}

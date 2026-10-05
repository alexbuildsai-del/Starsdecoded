/**
 * Your life's big cycles (ADR-212, 255, 262; reading 26): the last thing on the dashboard, after the stories, for a
 * reader without Timeline whose own Personal report is finished. The Saturn ring with the age of their first return,
 * the four big cycles soonest first as Life's compact cards, the plans' price, Start Timeline to /checkout (ADR-264,
 * 277), a link to /timeline and Not now. Every age and date is the API's, from the stored birth (acceptance 1). Not now is kept in this
 * browser (`teaser-view.ts`).
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import type { Teaser } from "@workspace/api-client-react";
import { AgeRing } from "@/components/timeline/AgeRing";
import { CycleCard } from "@/components/timeline/CycleCard";
import { Button } from "@/components/ui/button";
import { checkoutHref } from "@/lib/checkout-view";
import {
  START_TIMELINE, cameBack, keepNotNow, notNowPressed, planPriceLine, readNotNow, teaserModel, teaserShows, type NotNow,
} from "@/lib/teaser-view";
import { dayIn } from "@/lib/timeline-view";

const HEADING = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.18em] text-[#D4B06A]";

/** The heading of the nearest section above, where focus goes when Not now takes this one away. */
function headingBefore(section: HTMLElement | null): HTMLElement | null {
  for (let at = section?.previousElementSibling; at; at = at.previousElementSibling) {
    const heading = at.matches("h2") ? at : at.querySelector("h2");
    if (heading instanceof HTMLElement) return heading;
  }
  return null;
}

export interface TimelineTeaserProps {
  teaser: Teaser;
  /** The reader's zone, which says what day it is for them. */
  zone: string;
}

export function TimelineTeaser({ teaser, zone }: TimelineTeaserProps) {
  const id = useId();
  const section = useRef<HTMLElement>(null);
  const today = useMemo(() => dayIn(new Date(), zone), [zone]);
  const [notNow, setNotNow] = useState<NotNow | null>(() => readNotNow());
  const shows = teaserShows(teaser, notNow, today);
  const model = useMemo(() => teaserModel(teaser, today), [teaser, today]);

  useEffect(() => {
    const back = cameBack(notNow, shows);
    if (!back) return;
    keepNotNow(back);
    setNotNow(back);
  }, [notNow, shows]);

  if (!shows) return null;

  const hide = () => {
    const next = notNowPressed(notNow, today);
    keepNotNow(next);
    const heading = headingBefore(section.current);
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    setNotNow(next);
  };

  return (
    <section ref={section} aria-labelledby={id} className="grid min-w-0 gap-2.5">
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 id={id} className={HEADING}>
          Your life's big cycles
        </h2>
        <p className="min-w-0 text-right text-xs leading-[1.4] text-[#9AA3B5] max-[480px]:hidden">From your birth date · Timeline</p>
      </div>
      <div className="grid gap-[22px] rounded-[12px] border border-[rgba(212,176,106,.28)] bg-[rgba(17,22,31,.55)] p-5 md:grid-cols-[260px_minmax(0,1fr)] md:items-start">
        <figure className="m-0 grid min-w-0 justify-items-center gap-2.5">
          <AgeRing age={model.ring.age} progress={model.ring.progress} label={model.ring.label} />
          <figcaption className="flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-[11.5px] leading-normal text-[#9AA3B5]">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-[#D4B06A]" />
              Saturn when you were born
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-[#9FA8DA]" />
              Saturn today
            </span>
          </figcaption>
        </figure>

        <div className="grid min-w-0 gap-3">
          <h3 className="font-display text-2xl font-normal leading-[1.2] text-[#E8EBF2]">{model.title}</h3>
          <ol role="list" className="m-0 grid list-none gap-2 p-0">
            {model.cycles.map((cycle) => (
              <li key={cycle.key} className="min-w-0">
                <CycleCard cycle={cycle} compact />
              </li>
            ))}
          </ol>
          <p className="max-w-[62ch] text-sm leading-normal text-[#AEB6C6]">
            Timeline tells you what each one means for you. It also shows the sky moving across your chart each week.
          </p>
          <p className="text-sm font-medium leading-normal text-[#E8EBF2]">{planPriceLine()}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button asChild className="font-label">
              <Link href={checkoutHref("timeline_month", "/dashboard")}>{START_TIMELINE}</Link>
            </Button>
            <Button asChild variant="outline" className="font-label">
              <Link href="/timeline">Read about Timeline</Link>
            </Button>
            <button
              type="button"
              onClick={hide}
              className="min-h-9 rounded px-1 text-[13px] text-[#9AA3B5] transition-colors hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TimelineTeaser;

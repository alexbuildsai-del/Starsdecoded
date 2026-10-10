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
import { Button } from "@/ds/atoms/Button";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { TextButton } from "@/ds/atoms/TextButton";
import { Card, CardTitle } from "@/ds/molecules/Card";
import { checkoutHref } from "@/lib/checkout-view";
import {
  START_TIMELINE, cameBack, keepNotNow, notNowPressed, planPriceLine, readNotNow, teaserModel, teaserShows, type NotNow,
} from "@/lib/teaser-view";
import { dayIn } from "@/lib/timeline-view";

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
        <h2 id={id} className="m-0">
          <Eyebrow className="text-brass">Your life's big cycles</Eyebrow>
        </h2>
        <p className="min-w-0 text-right text-caption text-paper-dim max-[480px]:hidden">From your birth date · Timeline</p>
      </div>
      <Card variant="glass" as="div" className="gap-[22px] md:grid md:grid-cols-[260px_minmax(0,1fr)] md:items-start">
        <figure className="m-0 grid min-w-0 justify-items-center gap-2.5">
          <AgeRing age={model.ring.age} progress={model.ring.progress} label={model.ring.label} />
          <figcaption className="flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-caption text-paper-dim">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-pill bg-brass" />
              Saturn when you were born
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-pill bg-indigo-lt" />
              Saturn today
            </span>
          </figcaption>
        </figure>

        <div className="grid min-w-0 gap-3">
          <CardTitle>{model.title}</CardTitle>
          <ol role="list" className="m-0 grid list-none gap-2 p-0">
            {model.cycles.map((cycle) => (
              <li key={cycle.key} className="min-w-0">
                <CycleCard cycle={cycle} compact />
              </li>
            ))}
          </ol>
          <p className="max-w-[62ch] text-ui text-paper-dim">
            Timeline tells you what each one means for you. It also shows the sky moving across your chart each week.
          </p>
          <p className="text-ui font-medium text-paper">{planPriceLine()}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button asChild>
              <Link href={checkoutHref("timeline_month", "/dashboard")}>{START_TIMELINE}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/timeline">Read about Timeline</Link>
            </Button>
            <TextButton onClick={hide} className="text-paper-dim">
              Not now
            </TextButton>
          </div>
        </div>
      </Card>
    </section>
  );
}

export default TimelineTeaser;

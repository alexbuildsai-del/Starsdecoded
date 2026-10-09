/**
 * The computed cards under one of Ask's answers (ADR-172, 213): the same
 * pieces Timeline draws, never a second look. A day or a person's day is its
 * contact cards, a window its day cells, a cycle Life's card, and a quote the
 * report's evidence, word for word as the server put it in. The tone words'
 * legend follows the day cards, as it follows Timeline's.
 */
import { Fragment, useState } from "react";
import type { AskCard } from "@workspace/api-client-react";
import { ContactCard } from "@/components/timeline/ContactCard";
import { CycleCard } from "@/components/timeline/CycleCard";
import { DayCells } from "@/components/timeline/DayCells";
import { ToneLegend } from "@/components/timeline/ToneLegend";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { WINDOW_SHOWN, cardView, legendAfter, type AskCardView, type EventView } from "@/lib/ask-view";
import { useShownZone } from "@/lib/reader-zone";
import { dayIn } from "@/lib/timeline-view";

const HEAD = "font-label text-[10.5px] uppercase leading-snug tracking-[.14em] text-[#7E889A]";
const NOTE = "text-[13.5px] leading-normal text-[#AEB6C6]";

/** ContactCard's own frame, for the one event it can't take: an eclipse with no tone, which shows no tone word. */
function ToneFreeCard({ event }: { event: EventView }) {
  return (
    <article className="relative grid min-w-0 gap-[3px] rounded-xl border border-l-[3px] border-[#242C3B] bg-[#11161F] px-3 py-[11px]">
      <span className="text-xs text-[#AEB6C6]">{event.lasts}</span>
      <p className="font-display text-lg leading-[1.25] text-[#E8EBF2]">{event.headline}</p>
      {event.line ? <p className="text-sm leading-normal text-[#E8EBF2]">{event.line}</p> : null}
      <p className="pt-0.5 font-numeric text-[11px] leading-normal text-[#7E889A]">{event.facts}</p>
    </article>
  );
}

function EventCards({ events }: { events: readonly EventView[] }) {
  return (
    <>
      {events.map((event) =>
        event.tone ? <ContactCard key={event.key} contact={{ ...event, tone: event.tone }} /> : <ToneFreeCard key={event.key} event={event} />,
      )}
    </>
  );
}

function WindowCard({ view }: { view: Extract<AskCardView, { kind: "window" }> }) {
  const [all, setAll] = useState(false);
  const long = view.days.length > WINDOW_SHOWN;
  return (
    <div role="group" aria-label={view.title} className="grid min-w-0 gap-2">
      <p className={HEAD}>{view.title}</p>
      <DayCells days={long && !all ? view.days.slice(0, WINDOW_SHOWN) : view.days} keyed />
      {long ? (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll((was) => !was)}
          className="justify-self-start rounded text-[13px] text-[#9FA8DA] hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9FA8DA]"
        >
          {all ? "Show fewer days" : `Show all ${view.days.length} days`}
        </button>
      ) : null}
    </div>
  );
}

function CardOf({ view }: { view: AskCardView }) {
  switch (view.kind) {
    case "day":
      return (
        <div role="group" aria-label={view.title} className="grid min-w-0 gap-2">
          <div className="grid gap-0.5">
            <p className={HEAD}>{view.title}</p>
            <p className="text-[13px] leading-snug text-[#AEB6C6]">{view.moon}</p>
          </div>
          <EventCards events={view.events} />
          {view.quiet ? <p className={NOTE}>{view.quiet}</p> : null}
        </div>
      );
    case "person":
      return (
        <div role="group" aria-label={view.title} className="grid min-w-0 gap-2">
          <p className={HEAD}>{view.title}</p>
          <EventCards events={view.events} />
          {view.quiet ? <p className={NOTE}>{view.quiet}</p> : null}
        </div>
      );
    case "window":
      return <WindowCard view={view} />;
    case "cycle":
      return <CycleCard cycle={view.cycle} />;
    case "quote":
      return (
        <figure className="m-0 grid min-w-0 rounded-[13px] border border-[#242C3B] bg-[#171D29] px-4 py-[15px] text-[#E8EBF2]">
          <blockquote className="m-0 font-display text-sm italic leading-normal">“{view.text}”</blockquote>
          <figcaption className="mt-3 border-t border-[#1A202C] pt-2.5 font-label text-[9.5px] uppercase tracking-[.14em] text-[#AEB6C6]">
            {view.source}
          </figcaption>
        </figure>
      );
  }
}

export function AskCards({ cards }: { cards: readonly AskCard[] }) {
  const { order } = useEntryFormat();
  // Only a reader with Timeline reads Ask, so the server can say which zone it read the cards' days in.
  const zone = useShownZone(true);
  if (!zone) return null;
  const today = dayIn(new Date(), zone);
  const views = cards.map((card) => cardView(card, today, zone, order));
  const legend = legendAfter(views);
  return (
    <div className="grid min-w-0 gap-3">
      {views.map((view, i) => (
        <Fragment key={`${view.kind}.${i}`}>
          <CardOf view={view} />
          {i === legend ? <ToneLegend /> : null}
        </Fragment>
      ))}
    </div>
  );
}

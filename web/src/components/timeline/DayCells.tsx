/**
 * Seven days in a row (timeline-page §2, Your week): each day's name and date
 * with a dot for each tone touching the chart on it, and with `keyed` the key
 * under them. The dots are colour, so each cell also tells a screen reader its
 * day and tones in words, in the reader's date order.
 */
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { ToneWord } from "@/components/timeline/ContactCard";
import { TONE_ORDER, dayLabel, dayNumber, dayTones, toneClass, weekdayOf, type DayView } from "@/lib/timeline-view";

export function DayCells({ days, keyed = false }: { days: readonly DayView[]; keyed?: boolean }) {
  const { order } = useEntryFormat();
  return (
    <div className="grid min-w-0 gap-2.5">
      {/* A list styled without bullets loses its role in Safari, so it says it again. */}
      <ol role="list" className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <li
            key={day.date}
            className="grid min-w-0 justify-items-center gap-1.5 rounded-lg border border-[#1A202C] bg-[#11161F] px-0.5 pb-2.5 pt-2"
          >
            <span aria-hidden className="font-label text-[9.5px] uppercase leading-none tracking-[.1em] text-[#7E889A]">
              {weekdayOf(day.date)}
            </span>
            <span aria-hidden className="font-numeric text-[13px] leading-none text-[#E8EBF2]">
              {dayNumber(day.date)}
            </span>
            <span aria-hidden className="flex min-h-[7px] flex-wrap justify-center gap-[3px]">
              {dayTones(day.tones).map((tone) => (
                <i key={tone} className={`${toneClass(tone)} block h-[7px] w-[7px] rounded-full bg-[var(--sd-tone)]`} />
              ))}
            </span>
            <span className="sr-only">{dayLabel(day, order)}</span>
          </li>
        ))}
      </ol>
      {keyed ? (
        <p aria-hidden className="flex flex-wrap gap-x-3.5 gap-y-1">
          {TONE_ORDER.map((tone) => (
            <ToneWord key={tone} tone={tone} />
          ))}
        </p>
      ) : null}
    </div>
  );
}

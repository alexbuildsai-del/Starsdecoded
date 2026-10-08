/**
 * A life cycle as one card (ADR-172; Timeline's Life): full in Life and in Ask, compact in the finder and the dashboard
 * invitation. The full card is Your cycles' card (Review 05/10 §4), one idea a block in one order: its word and the
 * countdown; its name and the ⓘ that opens the science; what the cycle is and how often; For you, every age it comes at
 * and the date; what it means for the reader; and the look-back last. A card with `onOpen` and no meaning of its own
 * opens the reading on a tap. The compact card keeps the ring, the dates and a status chip.
 */
import { useId, useState } from "react";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { CycleRing } from "@/components/timeline/AgeRing";
import { OpenCard } from "@/components/timeline/ContactCard";
import {
  cycleAbout, cycleAgeSteps, cycleAges, cycleChip, cycleCountdown, cycleDates, cycleNextLine, cycleWhen, lookBack, ringTarget,
  type CycleView,
} from "@/lib/life-view";

const CHIP_LOOK = {
  now: "border-[#5C6BC0] bg-[rgba(92,107,192,.16)] text-[#E8EBF2]",
  ahead: "border-[#242C3B] text-[#E8EBF2]",
  past: "border-[#242C3B] text-[#7E889A]",
} as const;

function Chip({ cycle }: { cycle: CycleView }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-[11px] leading-none ${CHIP_LOOK[cycleWhen(cycle, cycle.today)]}`}>
      {cycleChip(cycle, cycle.today)}
    </span>
  );
}

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const DEGREE = /(\d+\.\d{2}\u00b0 [A-Z][a-z]+)/;

/** A science line with its degrees set in the numbers' face. */
function ScienceLine({ text }: { text: string }) {
  return (
    <p>
      {text.split(DEGREE).map((part, i) =>
        i % 2 ? (
          <span key={i} className="font-numeric text-[12.5px] text-[#E8EBF2]">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

const STEP_LOOK = { past: "text-[#7E889A]", this: "font-medium text-[#E8EBF2]", ahead: "text-[#AEB6C6]" } as const;

export interface CycleCardProps {
  cycle: CycleView;
  compact?: boolean;
  onOpen?: () => void;
  /** The ⓘ's lines (`cycleScience`), asked for when it opens; without it the card has no ⓘ. */
  science?: () => readonly string[];
  /** What it means for the reader: its paragraphs; one line saying why there are none (the card then offers Read more); null while they load; omitted, the card has none. */
  meaning?: readonly string[] | string | null;
}

export function CycleCard({ cycle, compact = false, onOpen, science, meaning }: CycleCardProps) {
  const { order } = useEntryFormat();
  const [scienceOpen, setScienceOpen] = useState(false);
  const scienceId = useId();

  if (compact) {
    const target = ringTarget(cycle);
    return (
      <article className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-t border-[#1A202C] pt-3">
        <div className="grid min-w-0 gap-1">
          <p className="font-label text-[10.5px] uppercase tracking-[.12em] text-[#7E889A]">{cycleAges(cycle)}</p>
          <p className="font-display text-[19px] leading-tight text-[#E8EBF2]">{cycle.name}</p>
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[13px]">
            <span className="font-numeric text-[#E8EBF2]">{cycleDates(cycle, order)}</span>
            <Chip cycle={cycle} />
          </p>
          <p className="text-[13.5px] leading-normal text-[#AEB6C6]">{cycle.why || sentence(cycle.word)}</p>
          {onOpen ? <OpenCard headline={cycle.name} onOpen={onOpen} rounded="after:rounded-md" /> : null}
        </div>
        <CycleRing progress={cycle.progress} target={target} size={56} />
      </article>
    );
  }

  const look = lookBack(cycle, cycle.today, order);
  const steps = cycleAgeSteps(cycle, cycle.today);
  const opens = onOpen ? " transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-[#171D29]" : "";
  return (
    <article className={`relative grid min-w-0 gap-2 rounded-xl border border-[#242C3B] bg-[#11161F] p-3.5${opens}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="rounded-full border border-[#242C3B] px-2.5 py-[3px] font-label text-[10.5px] uppercase leading-snug tracking-[.14em] text-[#AEB6C6]">
          {cycle.word}
        </span>
        <span className="font-numeric text-xs text-[#7E889A]">{cycleCountdown(cycle, cycle.today)}</span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-xl leading-tight text-[#E8EBF2]">{cycle.name}</p>
        {science ? (
          <button
            type="button"
            aria-label="The science behind it"
            aria-expanded={scienceOpen}
            aria-controls={scienceId}
            onClick={() => setScienceOpen((on) => !on)}
            className={`relative z-10 grid h-6 w-6 flex-none place-items-center rounded-full border font-display text-sm italic leading-none before:absolute before:-inset-2.5 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              scienceOpen ? "border-[#D4B06A] text-[#D4B06A]" : "border-[#242C3B] text-[#AEB6C6] hover:border-[#5C6BC0]"
            }`}
          >
            i
          </button>
        ) : null}
      </div>
      <p className="text-sm leading-normal text-[#AEB6C6]">{cycleAbout(cycle.id)}</p>
      {science && scienceOpen ? (
        <div id={scienceId} className="grid gap-1.5 rounded-lg border border-[#242C3B] bg-[#0D1117] px-3 py-2.5 text-[13.5px] leading-normal text-[#AEB6C6]">
          {science().map((line, i) => (
            <ScienceLine key={i} text={line} />
          ))}
        </div>
      ) : null}
      <div className="grid gap-1 rounded-lg bg-[#171D29] px-2.5 py-2">
        <p className="font-label text-[10.5px] uppercase leading-none tracking-[.14em] text-[#7E889A]">For you</p>
        <p className="font-numeric text-[13.5px] leading-normal">
          {steps.map((step, i) => (
            <span key={`${step.age}-${i}`}>
              {i ? <span className="text-[#7E889A]"> {"\u00b7"} </span> : null}
              <span className={STEP_LOOK[step.state]}>{step.age}</span>
            </span>
          ))}
        </p>
        <p className="text-[13.5px] leading-normal text-[#AEB6C6]">{cycleNextLine(cycle, cycle.today, order)}</p>
      </div>
      {meaning === null ? (
        <p aria-hidden className="h-[6.5em] rounded-md bg-[#171D29] motion-safe:animate-pulse" />
      ) : typeof meaning === "string" ? (
        <p className="text-[13.5px] leading-normal text-[#AEB6C6]">{meaning}</p>
      ) : meaning ? (
        meaning.map((text, i) => (
          <p key={i} className="whitespace-pre-line text-[14.5px] leading-[1.6] text-[#E8EBF2]">
            {text}
          </p>
        ))
      ) : null}
      {look ? (
        <p className="border-l-2 border-[#3FA796] pl-2.5 font-display text-[15px] italic leading-snug text-[#AEB6C6]">{look}</p>
      ) : null}
      {onOpen && (meaning === undefined || typeof meaning === "string") ? <OpenCard headline={cycle.name} onOpen={onOpen} rounded="after:rounded-xl" /> : null}
    </article>
  );
}

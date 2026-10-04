/**
 * A life cycle as one card (ADR-172; Timeline's Life): full in Life and in
 * Ask, compact in the finder and the dashboard invitation. Either way the
 * planet's round as a ring, the cycle's name and plain word, its dates with a
 * status, the numbers quieter than the words (ADR-98); the full card adds the
 * look-back of a repeating cycle. With `onOpen` a tap anywhere on the card
 * opens the cycle's reading.
 */
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { CycleRing } from "@/components/timeline/AgeRing";
import { OpenCard } from "@/components/timeline/ContactCard";
import { cycleAges, cycleChip, cycleDates, cycleFact, cycleWhen, lookBack, ringTarget, type CycleView } from "@/lib/life-view";

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

export function CycleCard({ cycle, compact = false, onOpen }: { cycle: CycleView; compact?: boolean; onOpen?: () => void }) {
  const { order } = useEntryFormat();
  const target = ringTarget(cycle);

  if (compact) {
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
  const opens = onOpen ? " transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-[#171D29]" : "";
  return (
    <article className={`relative grid min-w-0 gap-3 rounded-2xl border border-[#242C3B] bg-[#11161F] p-4${opens}`}>
      <div className="flex items-center gap-3.5">
        <CycleRing progress={cycle.progress} target={target} size={72} />
        <div className="grid min-w-0 justify-items-start gap-1">
          <span className="rounded-full border border-[#242C3B] px-2.5 py-[3px] font-label text-[10.5px] uppercase leading-snug tracking-[.14em] text-[#AEB6C6]">
            {cycle.word}
          </span>
          <p className="font-display text-[22px] leading-tight text-[#E8EBF2]">{cycle.name}</p>
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-numeric text-[12.5px] text-[#7E889A]">{cycleFact(cycle, order)}</span>
            <Chip cycle={cycle} />
          </p>
        </div>
      </div>
      {look ? (
        <p className="border-l-2 border-[#3FA796] pl-3 font-display text-[16.5px] italic leading-snug text-[#E8EBF2]">{look}</p>
      ) : null}
      {onOpen ? <OpenCard headline={cycle.name} onOpen={onOpen} rounded="after:rounded-2xl" /> : null}
    </article>
  );
}

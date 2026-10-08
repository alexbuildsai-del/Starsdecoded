/**
 * What the three tone words mean, wherever the tone colours show (Review 05/10 §2): Heavy · Mixed · Light, each with
 * its dot in the card's colour and its meaning in plain words. The colour never says it alone, so the word is in text.
 */
import { TONE_MEANINGS, TONE_ORDER, TONE_WORDS, toneClass } from "@/lib/timeline-view";
import { cn } from "@/lib/utils";

export function ToneLegend({ className }: { className?: string }) {
  return (
    <ul role="list" className={cn("m-0 grid list-none gap-1 rounded-[10px] border border-[#242C3B] px-3 py-2.5 text-[13px] leading-normal text-[#AEB6C6]", className)}>
      {TONE_ORDER.map((tone) => (
        <li key={tone} className={cn(toneClass(tone), "flex items-center gap-x-2")}>
          <i aria-hidden className="block h-[7px] w-[7px] flex-none rounded-full bg-[var(--sd-tone)]" />
          <span>
            <b className="font-label text-[10.5px] font-medium uppercase tracking-[.12em] text-[#E8EBF2]">{TONE_WORDS[tone]}</b>
            <span className="sr-only">:</span>{" "}
            {TONE_MEANINGS[tone]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default ToneLegend;

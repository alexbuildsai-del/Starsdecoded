/**
 * What the three tone words mean, wherever the tone colours show (Review 05/10 §2): Heavy · Mixed · Light, each with
 * its dot in the card's colour and its meaning in plain words. The colour never says it alone, so the word is in text.
 */
import { ToneDot } from "@/ds/atoms/ToneDot";
import { DOT_TONE, TONE_MEANINGS, TONE_ORDER, TONE_WORDS } from "@/lib/timeline-view";

export function ToneLegend({ className }: { className?: string }) {
  return (
    <ul role="list" className={`m-0 grid list-none gap-1 rounded-control border border-line px-3 py-2.5 text-small text-paper-dim ${className ?? ""}`}>
      {TONE_ORDER.map((tone) => (
        <li key={tone} className="flex items-center gap-x-2">
          <ToneDot tone={DOT_TONE[tone]} />
          <span>
            <b className="font-label text-label font-medium uppercase text-paper">{TONE_WORDS[tone]}</b>
            <span className="sr-only">:</span>{" "}
            {TONE_MEANINGS[tone]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default ToneLegend;

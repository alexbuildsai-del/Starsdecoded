/**
 * The day's tones as one bar (timeline-page §2, Now and ahead): a stretch for
 * each tone as long as its share of the day's contacts, intense first, with
 * the counts in words for a screen reader. Tone colours a time and is never a
 * score (reading 17). A quiet day draws no bar; the words around it say so.
 */
import type { Tone } from "@workspace/engine";
import { mixLabel, mixOf, toneClass } from "@/lib/timeline-view";

export function MixBar({ tones }: { tones: readonly Tone[] }) {
  const mix = mixOf(tones);
  if (mix.length === 0) return null;
  return (
    <div role="img" aria-label={mixLabel(tones)} className="flex h-2 w-full min-w-0 gap-[3px] overflow-hidden rounded-[4px]">
      {mix.map(({ tone, count }) => (
        <span key={tone} className={`${toneClass(tone)} block h-full min-w-0 bg-[var(--sd-tone)]`} style={{ flex: `${count} 1 0%` }} />
      ))}
    </div>
  );
}

/**
 * One of the five things Timeline gives you (timeline-page §2): the promise in
 * plain words, why you'd care, then what Mira sees, marked as hers
 * (acceptance 5). One column on a phone; from 880 px the words sit left and
 * her example right. Each side is its own column, so a tall example never
 * pulls the words apart.
 */
import type { ReactNode } from "react";
import { SAMPLE_WORDS } from "@/site/data/timeline/mira";

/** The mark on an example drawn from her account's own facts; an example in words written for her carries `SAMPLE_WORDS`. */
export const SAMPLE_ACCOUNT = "Sample account";

export type SampleMark = typeof SAMPLE_ACCOUNT | typeof SAMPLE_WORDS;

export interface ThingCardProps {
  /** The promise's id, which names the card for a screen reader. */
  id: string;
  /** Which part of Timeline it is: "Now and ahead". */
  name: string;
  promise: string;
  why: string;
  /** A link under the words. */
  more?: ReactNode;
  /** The example's head: words, or a mark that says them. */
  sees: ReactNode;
  mark: SampleMark;
  children: ReactNode;
}

export function ThingCard({ id, name, promise, why, more, sees, mark, children }: ThingCardProps) {
  return (
    <article
      aria-labelledby={id}
      className="grid min-w-0 gap-3.5 rounded-[18px] border border-[#242C3B] bg-[#11161F] p-5 min-[880px]:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] min-[880px]:items-start min-[880px]:gap-x-9 min-[880px]:p-7"
    >
      <div className="grid min-w-0 content-start gap-3.5">
        <p className="font-label text-[11px] uppercase leading-none tracking-[.14em] text-[#9FA8DA]">{name}</p>
        <h3 id={id} className="text-[24px] leading-[1.18] text-[#E8EBF2]">
          {promise}
        </h3>
        <p className="max-w-[58ch] text-[15px] leading-[1.6] text-[#AEB6C6]">{why}</p>
        {more}
      </div>
      <div className="grid min-w-0 gap-2.5 rounded-[14px] border border-[#1A202C] bg-[#0D1117] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5">
          {typeof sees === "string" ? (
            <p className="font-label text-[10.5px] uppercase leading-snug tracking-[.16em] text-[#AEB6C6]">{sees}</p>
          ) : (
            sees
          )}
          <span className="whitespace-nowrap rounded-md border border-dashed border-[#242C3B] px-1.5 py-px font-label text-[10px] uppercase tracking-[.14em] text-[#7E889A]">
            {mark}
          </span>
        </div>
        {children}
      </div>
    </article>
  );
}

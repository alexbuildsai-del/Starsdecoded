/**
 * The blocks under a house reading (ADR-396, 398, 402, 403): Often noticed, the stellium block, and one block for each
 * body going backwards. Each is a badge and a heading over its words, which the report stored (the card writes none of
 * its own, bar the headings). The card draws them in that order, directly above Does this sound like you?
 */
import type { ReactNode } from "react";
import { balanceHouse, noticedParts, retrogradeHeading, stelliumHeading } from "@/lib/house-deck";

const COPY = "text-[color:var(--paper-dim)] print:text-black";

function Block({ badge, heading, headingClass, badgeClass, whole, children }: {
  badge: string;
  heading: string;
  headingClass: string;
  badgeClass: string;
  whole: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 print:break-inside-avoid">
      <span
        aria-hidden
        className={`mt-px grid h-[22px] w-[22px] flex-none place-items-center border font-mono text-[11px] leading-none ${badgeClass}`}
      >
        {badge}
      </span>
      <div className="grid min-w-0 gap-1">
        <p className={`font-label text-[12px] font-medium uppercase tracking-[.08em] ${headingClass}`}>{heading}</p>
        <div className={`grid gap-1.5 ${whole ? "text-[14px] leading-[1.55]" : "text-[13.5px] leading-[1.5]"} ${COPY}`}>{children}</div>
      </div>
    </div>
  );
}

const BRASS_BADGE = "rounded-full border-brass text-brass print:border-[#7A5A1E] print:text-[#7A5A1E]";
const BRASS_HEAD = "text-brass print:text-[#7A5A1E]";
const LABEL = "font-medium text-[color:var(--paper)] print:text-black";

/** The chip in the card's header when the engine finds a stellium in the house. */
export function StelliumChip() {
  return (
    <span className="flex-none rounded-full border border-brass/55 px-[7px] py-0.5 font-mono text-[10px] normal-case leading-none tracking-[.1em] text-brass print:border-[#7A5A1E] print:text-[#7A5A1E]">
      Stellium
    </span>
  );
}

export function OftenNoticed({ idea, why, whole }: { idea: string; why: string; whole: boolean }) {
  const parts = noticedParts({ idea, why });
  return (
    <Block
      badge="✦"
      heading="Often noticed"
      headingClass="text-[color:var(--indigo-lt)] print:text-[#2E3A8C]"
      badgeClass="rounded-full border-[color:var(--indigo-lt)] text-[color:var(--indigo-lt)] print:border-[#2E3A8C] print:text-[#2E3A8C]"
      whole={whole}
    >
      <p>{parts.idea} <span className={LABEL}>Why:</span> {parts.why}</p>
    </Block>
  );
}

export function StelliumBlock({ count, house, text, balance, whole }: {
  count: number;
  house: number;
  text: string;
  balance: string;
  whole: boolean;
}) {
  return (
    <Block badge={String(count)} heading={stelliumHeading(count)} headingClass={BRASS_HEAD} badgeClass={BRASS_BADGE} whole={whole}>
      <p>{text}</p>
      <p><span className={LABEL}>To balance it:</span> {balanceHouse(house)}. {balance}</p>
    </Block>
  );
}

export function RetrogradeBlock({ planet, text, whole }: { planet: string; text: string; whole: boolean }) {
  return (
    <Block
      badge="R"
      heading={retrogradeHeading(planet)}
      headingClass="text-[#E3A3AD] print:text-[#9B4A57]"
      badgeClass="rounded-[5px] border-[#6B3A42] font-semibold text-[#E3A3AD] print:border-[#9B4A57] print:text-[#9B4A57]"
      whole={whole}
    >
      <p>{text}</p>
    </Block>
  );
}

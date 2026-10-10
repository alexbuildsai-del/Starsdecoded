/**
 * The blocks under a house reading (ADR-396, 398, 402, 403): Often noticed, the stellium block, and one block for each
 * body going backwards. Each is a badge and a heading over its words, which the report stored (the card writes none of
 * its own, bar the headings). The card draws them in that order, directly above Does this sound like you?
 */
import type { ReactNode } from "react";
import { RetrogradeBadge } from "@/ds/atoms/RetrogradeBadge";
import { balanceHouse, noticedParts, retrogradeHeading, stelliumHeading } from "@/lib/house-deck";
import { cn } from "@/lib/utils";

// Paper prints each colour as a darker version of itself, so the blocks still read on white.
const PRINT_BRASS = "print:border-[#7A5A1E] print:text-[#7A5A1E]";
const PRINT_INDIGO = "print:border-[#2E3A8C] print:text-[#2E3A8C]";
const PRINT_BACK = "print:border-[#9B4A57] print:text-[#9B4A57]";

function Block({ badge, heading, headingClass, whole, children }: {
  badge: ReactNode;
  heading: string;
  headingClass: string;
  whole: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 print:break-inside-avoid">
      {badge}
      <div className="grid min-w-0 gap-1">
        <p className={cn("font-label text-caption font-medium uppercase tracking-[.08em]", headingClass)}>{heading}</p>
        <div className={cn("grid gap-1.5 text-paper-dim print:text-black", whole ? "text-ui leading-[1.55]" : "text-small")}>{children}</div>
      </div>
    </div>
  );
}

function RoundBadge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn("mt-px grid size-[22px] flex-none place-items-center rounded-full border font-mono text-data-sm leading-none tracking-normal", className)}
    >
      {children}
    </span>
  );
}

const LABEL = "font-medium text-paper print:text-black";

/** The chip in the card's header when the engine finds a stellium in the house. */
export function StelliumChip() {
  return (
    <span className={cn("flex-none rounded-pill border border-brass/55 px-[7px] py-0.5 font-mono text-data-sm normal-case leading-none tracking-[.1em] text-brass", PRINT_BRASS)}>
      Stellium
    </span>
  );
}

export function OftenNoticed({ idea, why, whole }: { idea: string; why: string; whole: boolean }) {
  const parts = noticedParts({ idea, why });
  return (
    <Block
      badge={<RoundBadge className={cn("border-indigo-lt text-indigo-lt", PRINT_INDIGO)}>✦</RoundBadge>}
      heading="Often noticed"
      headingClass={cn("text-indigo-lt", PRINT_INDIGO)}
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
    <Block
      badge={<RoundBadge className={cn("border-brass text-brass", PRINT_BRASS)}>{count}</RoundBadge>}
      heading={stelliumHeading(count)}
      headingClass={cn("text-brass", PRINT_BRASS)}
      whole={whole}
    >
      <p>{text}</p>
      <p><span className={LABEL}>To balance it:</span> {balanceHouse(house)}. {balance}</p>
    </Block>
  );
}

export function RetrogradeBlock({ planet, text, whole }: { planet: string; text: string; whole: boolean }) {
  return (
    <Block
      badge={<RetrogradeBadge className={cn("mt-px", PRINT_BACK)} />}
      heading={retrogradeHeading(planet)}
      headingClass={cn("text-back", PRINT_BACK)}
      whole={whole}
    >
      <p>{text}</p>
    </Block>
  );
}

/** The house card's blocks in the R19 order: Often noticed, the stellium, then each body going backwards. */
export function ReportBlocks({ house, noticed, stellium, retrograde, whole }: {
  house: number;
  noticed?: { idea: string; why: string } | null;
  /** The stored block and the engine's bodies; the block draws only when both are there (ADR-397). */
  stellium?: { text: string; balance: string; bodies: string[] } | null;
  retrograde?: { planet: string; text: string }[];
  whole: boolean;
}) {
  return (
    <>
      {noticed && <OftenNoticed idea={noticed.idea} why={noticed.why} whole={whole} />}
      {stellium && (
        <StelliumBlock count={stellium.bodies.length} house={house} text={stellium.text} balance={stellium.balance} whole={whole} />
      )}
      {retrograde?.map((r) => <RetrogradeBlock key={r.planet} planet={r.planet} text={r.text} whole={whole} />)}
    </>
  );
}

export default ReportBlocks;

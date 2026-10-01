/**
 * A pair's block (ADR-174, review-01-10 scope 3): what comes naturally to the
 * two, chapter 01's strong lines, and the one challenge to work on, quoted as
 * `GET /home` gives them (ADR-18). One block for a quick look, under "With
 * you", and for Your pairs. On its own it carries its frame, as in a quick
 * look; `compact` leaves the frame to a card that draws its own, as Your
 * pairs' does, so no card sits in a card. A pair with neither line yet draws
 * nothing, and its door says it is still being written.
 *
 * The tokens' own colours are written out, since a block sits outside the
 * report's `rp-root` scope as often as inside it.
 */
import type { ReactNode } from "react";
import type { HomePair } from "@workspace/api-client-react";
import { MEET_COLOURS, type MeetTag } from "@/lib/charts-meet";
import { PAIR_BLOCK } from "@/lib/home-view";

export interface PairBlockProps {
  pair: HomePair;
  /** No frame of its own, for a card that has one. */
  compact?: boolean;
}

/** Scope 3 draws the block with three lines of what comes naturally, so a fourth would stretch every block in the row. */
const STRONG_SHOWN = 3;

const FRAME = "grid min-w-0 content-start gap-2 rounded-[12px] border border-[#242C3B] bg-[#0D1117] p-3.5";
const BARE = "grid min-w-0 content-start gap-2";

/** Teal for what comes easily and rose for what takes work, the colours the report's cards and ledger use (ADR-177). */
export function BlockHeading({ tone, children }: { tone: MeetTag; children: ReactNode }) {
  return (
    <p className="font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.18em]" style={{ color: MEET_COLOURS[tone] }}>
      {children}
    </p>
  );
}

export function BlockLine({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-[1.5] text-[#E8EBF2]">{children}</p>;
}

/** The block's frame, which the reader's own quick look shares for chapter 08's two lines. */
export function BlockFrame({ children }: { children: ReactNode }) {
  return <div className={FRAME}>{children}</div>;
}

export function PairBlock({ pair, compact = false }: PairBlockProps) {
  const strong = pair.strong.slice(0, STRONG_SHOWN);
  const challenge = pair.challenge;
  if (strong.length === 0 && !challenge) return null;
  return (
    <div className={compact ? BARE : FRAME} data-pair-block>
      {strong.length > 0 && (
        <>
          <BlockHeading tone="comes">{PAIR_BLOCK.comes}</BlockHeading>
          <ul className="m-0 grid list-disc gap-1 pl-4 text-[13px] leading-[1.5] text-[#E8EBF2] marker:text-[#6E7789]">
            {strong.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </>
      )}
      {challenge && (
        <>
          <BlockHeading tone="challenge">{PAIR_BLOCK.challenge}</BlockHeading>
          <BlockLine>{challenge}</BlockLine>
        </>
      )}
    </div>
  );
}

export default PairBlock;

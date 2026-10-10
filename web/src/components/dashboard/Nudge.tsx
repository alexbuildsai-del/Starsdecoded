/**
 * The nudge above the control it names: the fact, then its next step, and
 * nothing else (credit-loop.md, "The nudges"; ADR-126). It reads as the
 * approved dashboard's quiet note under the reader's own quick look (Review
 * 01/10), not as a heading. No button here: `nudgeFor` already names the
 * control the card draws on its own, so a second one never appears, and no
 * timer or countdown ever will (ADR-127, reading 5).
 */
import type { Nudge as NudgeData } from "@/lib/nudges";

export interface NudgeProps {
  nudge: NudgeData;
}

export function Nudge({ nudge }: NudgeProps) {
  return (
    <p className="grid gap-0.5 text-small">
      <span className="text-paper">{nudge.line}</span>
      <span className="text-paper-dim">{nudge.detail}</span>
    </p>
  );
}

export default Nudge;

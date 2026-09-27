/**
 * The nudge above the control it names: the credit loop's fact, then its
 * next step, and nothing else (credit-loop.md, "The nudges"; ADR-126). No
 * button here: `nudgeFor` already names the control the card draws on its
 * own, so a second one never appears, and no timer or countdown ever will
 * (ADR-127, reading 5).
 */
import type { Nudge as NudgeData } from "@/lib/nudges";

export interface NudgeProps {
  nudge: NudgeData;
}

export function Nudge({ nudge }: NudgeProps) {
  return (
    <div className="grid gap-0.5">
      <p className="font-display text-[15px] leading-[1.3] text-[var(--paper)]">{nudge.line}</p>
      <p className="text-[13px] leading-[1.4] text-[var(--paper-dim)]">{nudge.detail}</p>
    </div>
  );
}

export default Nudge;

/**
 * The one line that says what an R means (Review 05/10 §6): always open, no X, in the same words wherever an R or a
 * dashed ring shows. The caller decides whether a retrograde planet is in view; the line itself never hides.
 */
import { cn } from "@/lib/utils";

export const RETROGRADE_LINE =
  "Retrograde. From Earth, the planet looks like it moves backwards for a few weeks. It doesn't really. Earth is passing it, the way a slower car seems to roll back when you overtake it.";

const WORD = "Retrograde.";

export function RetrogradeLine({ className }: { className?: string }) {
  return (
    <p
      data-retrograde-line
      className={cn("flex items-start gap-2 border-t border-[#1A202C] pt-2.5 text-[13px] leading-normal text-[#AEB6C6]", className)}
    >
      <span
        aria-hidden
        className="mt-px inline-grid h-[18px] w-[18px] flex-none place-items-center rounded-[4px] border border-[#6B3A42] font-numeric text-[11px] font-semibold leading-none text-[#E3A3AD]"
      >
        R
      </span>
      <span>
        <b className="font-medium text-[#E8EBF2]">{WORD}</b>
        {RETROGRADE_LINE.slice(WORD.length)}
      </span>
    </p>
  );
}

export default RetrogradeLine;

/**
 * The one line that says what an R means (Review 05/10 §6): always open, no X, in the same words wherever an R or a
 * dashed ring shows. The caller decides whether a retrograde planet is in view; the line itself never hides.
 *
 * It says only what holds for every planet (ADR-386): the stretch runs from about three weeks for Mercury to five months
 * for the slow ones, and Mercury and Venus pass Earth where Earth passes Mars and the rest, so it names neither a length
 * nor who passes whom. Its colours are the page's own tokens, and print sets dark ones, so a printed page shows it.
 */
import { cn } from "@/lib/utils";

export const RETROGRADE_LINE =
  "Retrograde. From Earth, a planet can look like it moves backwards for weeks or months. It doesn't really. It looks that way because Earth and the planet pass each other on their way round the Sun.";

const WORD = "Retrograde.";

export function RetrogradeLine({ className }: { className?: string }) {
  return (
    <p
      data-retrograde-line
      className={cn("flex items-start gap-2 border-t border-[color:var(--line-soft,#1A202C)] pt-2.5 text-[13px] leading-normal text-[color:var(--paper-dim,#AEB6C6)] print:border-[#999] print:text-[#444]", className)}
    >
      <span
        aria-hidden
        className="mt-px inline-grid h-[18px] w-[18px] flex-none place-items-center rounded-[4px] border border-[#6B3A42] font-numeric text-[11px] font-semibold leading-none text-[#E3A3AD] print:border-[#9B4A57] print:text-[#9B4A57]"
      >
        R
      </span>
      <span>
        <b className="font-medium text-[color:var(--paper,#E8EBF2)] print:text-black">{WORD}</b>
        {RETROGRADE_LINE.slice(WORD.length)}
      </span>
    </p>
  );
}

export default RetrogradeLine;

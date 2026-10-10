/**
 * The one line that says what an R means (Review 05/10 §6): always open, no X, in the same words wherever an R or a
 * dashed ring shows. The caller decides whether a retrograde planet is in view; the line itself never hides.
 *
 * It says only what holds for every planet (ADR-386): the stretch runs from about three weeks for Mercury to five months
 * for the slow ones, and Mercury and Venus pass Earth where Earth passes Mars and the rest, so it names neither a length
 * nor who passes whom. Its colours are the page's own tokens, and print sets dark ones, so a printed page shows it.
 */
import { RetrogradeBadge } from "@/ds/atoms/RetrogradeBadge";

export const RETROGRADE_LINE =
  "Retrograde. From Earth, a planet can look like it moves backwards for weeks or months. It doesn't really. It looks that way because Earth and the planet pass each other on their way round the Sun.";

const WORD = "Retrograde.";

export function RetrogradeLine({ className }: { className?: string }) {
  return (
    <p
      data-retrograde-line
      className={`flex items-start gap-2 border-t border-line-soft pt-2.5 text-small text-paper-dim print:border-line-strong print:text-ground ${className ?? ""}`}
    >
      <RetrogradeBadge size="small" className="mt-px" />
      <span>
        <b className="font-medium text-paper print:text-ground">{WORD}</b>
        {RETROGRADE_LINE.slice(WORD.length)}
      </span>
    </p>
  );
}

export default RetrogradeLine;

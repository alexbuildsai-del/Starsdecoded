/**
 * The one checklist in the report. A checklist means do: it sits in the rail
 * beside prose, or inside a card, and it is never folded (ADR-24). Ticks are
 * the reader's workbook and are saved on the report; a tick is silent, with
 * no counter (ADR-48). A why is a sentence on its own line under its action,
 * capitalised and closed by the page, never a trailing clause (ADR-62).
 */
import { useWorkbook } from "@/lib/workbook";

/** The why as the page prints it: a first capital and a full stop, the prompt's clause untouched otherwise. */
export function whySentence(why: string): string {
  const t = why.trim();
  if (!t) return "";
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

/** The headings a checklist may carry: the natal four, the pair's three, and a lens chapter's next time (ADR-40, ADR-63). */
export type ChecklistHeading =
  | "What to do"
  | "How to use it"
  | "How to manage it"
  | "Practice this week"
  | "For you"
  | "For them"
  | "For both"
  | "Next time";

export interface ChecklistItem {
  key: string;
  action: string;
  why?: string;
}

export function Checklist({
  heading, items,
}: { heading: ChecklistHeading; items: ChecklistItem[] }) {
  const workbook = useWorkbook();
  if (!items?.length) return null;

  return (
    <div className="mt-[18px] max-w-[64ch] border-t border-[var(--line-soft)] pt-3">
      <span className="rp-lab">{heading}</span>
      <ul className="mt-2 grid gap-2.5">
        {items.map((item) => {
          const ticked = workbook?.ticked(item.key) ?? false;
          return (
            <li key={item.key} className="flex items-start gap-2.5 text-sm leading-[1.55] text-[rgba(232,235,242,.84)]">
              <input
                type="checkbox"
                checked={ticked}
                disabled={!workbook}
                onChange={() => workbook?.toggle(item.key)}
                aria-label={item.action}
                className="mt-1 h-3.5 w-3.5 flex-none cursor-pointer accent-[var(--accent)] disabled:cursor-default"
              />
              <span className={ticked ? "opacity-60" : undefined}>
                {item.action}
                {item.why && <span className="block text-[13px] leading-[1.5] text-[var(--paper-dim)]">{whySentence(item.why)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Checklist;

/**
 * The one checklist in the report. A checklist means do: it sits in the rail
 * beside prose, or inside a card, and it is never folded (ADR-24). Ticks are
 * the reader's workbook and are saved on the report.
 */
import { useWorkbook } from "@/lib/workbook";

/** The four headings a checklist may carry. There is no fifth. */
export type ChecklistHeading =
  | "What to do"
  | "How to use it"
  | "How to manage it"
  | "Practice this week";

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

  const done = workbook ? workbook.count(items.map((i) => i.key)) : 0;

  return (
    <div className="mt-[18px] max-w-[64ch] border-t border-[var(--line-soft)] pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="rp-lab">{heading}</span>
        {workbook && (
          <span className="font-label text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
            saved · {done} of {items.length}
          </span>
        )}
      </div>
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
                {item.why && <span className="text-[var(--paper-dim)]"> {item.why}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Checklist;

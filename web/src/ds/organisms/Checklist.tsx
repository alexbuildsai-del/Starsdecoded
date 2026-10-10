/**
 * The one checklist: every thing to try, in a report, on the site and on the dashboard, is this list in this look
 * (ADR-172). A checklist means do: it sits in the rail beside prose, or inside a card, and it is never folded (ADR-24).
 * A tick is silent, with no counter, and a box unticks (ADR-48). A why is a sentence on its own line under its action,
 * capitalised and closed by the page, never a trailing clause (ADR-62). A pinnable list puts a pin beside each item,
 * which keeps it under What you're practising on the dashboard, three a report (ADR-174).
 */
import { useEffect, useId, useReducer, useState, type CSSProperties } from "react";
import { TickBox } from "@/ds/atoms/TickBox";
import { cn } from "@/lib/utils";
import { PIN_LIMIT, useTickStore, type TickStore } from "@/lib/workbook";

export { localTicks, type TickStore } from "@/lib/workbook";

/** The why as the page prints it: a first capital and a full stop, the prompt's clause untouched otherwise. */
export function whySentence(why: string): string {
  const t = why.trim();
  if (!t) return "";
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

/**
 * The headings a checklist may carry: the natal four, the pair's three, a lens
 * chapter's next time (ADR-40, ADR-63), and the site's two (ADR-173).
 */
export type ChecklistHeading =
  | "What to do"
  | "How to use it"
  | "How to manage it"
  | "Practice this week"
  | "For you"
  | "For them"
  | "For both"
  | "Next time"
  | "Practice"
  | "Try together";

export interface ChecklistItem {
  key: string;
  action: string;
  why?: string;
  /** Where the item comes from, in a small line over it, as the dashboard's practising list names its source (ADR-174). */
  label?: string;
}

// The pin's words are Review 05/10 §7's. The brass is the chart's yellow, the Owner's call over "brass is never a control".
const PIN_LABEL = "Pin to your dashboard";
const UNPIN_LABEL = "Unpin from your dashboard";
const PIN_HINT = "Pinned items show on your dashboard.";
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six"];
const LIMIT_LINE = `You can pin ${COUNT_WORDS[PIN_LIMIT] ?? PIN_LIMIT} per report. Unpin one first, here or on your dashboard.`;
const PINNED_LINE = `Pinned. ${PIN_HINT} You can pin ${COUNT_WORDS[PIN_LIMIT] ?? PIN_LIMIT} per report.`;

function PinMark({ pinned }: { pinned: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-5", pinned && "fill-brass text-brass")}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6l-1 6 4 4H6l4-4z" />
      <path d="M12 13v8" />
    </svg>
  );
}

// The box keeps the checklist's own look over TickBox: a label-dim edge, filled in the list's colour with a void tick,
// 20 px, and set back by its margins so the 44 px tap area leaves the box where the row puts it.
const BOX = cn(
  "-mx-3 -mb-3 -mt-[11px]",
  "[&_input]:size-5 [&_input]:rounded-inner [&_input]:border-label-dim [&_input]:transition-colors [&_input]:duration-[var(--dur-fast)]",
  "[&_input:hover]:border-paper-dim [&_input:checked]:border-[color:var(--ck)] [&_input:checked]:bg-[color:var(--ck)]",
  "[&_input:disabled]:opacity-100 [&_input:disabled:hover]:border-label-dim print:[&_input]:border-neutral-600",
  "[&_svg]:size-[13px] [&_svg]:text-void",
);

const ROW = "grid items-start gap-x-2.5 rounded-[12px] border border-line bg-surface px-3.5 py-3 print:break-inside-avoid print:border-neutral-400 print:bg-transparent";

export function Checklist({
  heading, items, store, pinnable = false,
}: {
  heading: ChecklistHeading;
  items: ChecklistItem[];
  /** The report's workbook when absent; localTicks() for things to try that belong to no report. */
  store?: TickStore;
  /** A pin beside each item, when the store can pin. */
  pinnable?: boolean;
}) {
  const ticks = useTickStore(store);
  const id = useId();
  // A localTicks() store changes nothing React watches, so the list redraws itself after each press.
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  // What the status line says after a press: the limit line for a refused pin, the pin words for one that held.
  const [said, setSaid] = useState<"refused" | "pinned" | null>(null);
  // The pin words are a hint for the moment, so they leave on their own; the limit line stays until the next press.
  useEffect(() => {
    if (said !== "pinned") return;
    const timer = window.setTimeout(() => setSaid(null), 6000);
    return () => window.clearTimeout(timer);
  }, [said]);
  if (!items?.length) return null;

  const pins = pinnable && ticks?.pinned && ticks.togglePin ? { pinned: ticks.pinned, togglePin: ticks.togglePin } : null;
  // Outside a report there is no chapter accent, so a list given its own store takes the Closing's teal, the colour of things to try.
  const tone = { "--ck": store ? "var(--color-teal)" : "var(--accent)" } as CSSProperties;

  function tick(key: string) {
    ticks?.toggle(key);
    redraw();
  }

  function pin(key: string) {
    if (!pins) return;
    const wasPinned = pins.pinned(key);
    const held = pins.togglePin(key);
    setSaid(!held ? "refused" : wasPinned ? null : "pinned");
    redraw();
  }

  return (
    <div className="mt-[18px] max-w-[64ch] border-t border-line-soft pt-3 print:border-neutral-400" style={tone}>
      <span id={`${id}h`} className="font-label text-label uppercase tracking-[.2em] text-[color:var(--ck)] transition-colors duration-[900ms] ease-linear">
        {heading}
      </span>
      <ul aria-labelledby={`${id}h`} className="mt-2 grid gap-2">
        {items.map((item, i) => {
          const ticked = ticks?.ticked(item.key) ?? false;
          const pinned = pins?.pinned(item.key) ?? false;
          const actionId = `${id}a${i}`;
          return (
            <li key={item.key} className={cn(ROW, pins ? "grid-cols-[22px_minmax(0,1fr)_auto]" : "grid-cols-[22px_minmax(0,1fr)]")}>
              <TickBox checked={ticked} disabled={!ticks} onChange={() => tick(item.key)} label={item.action} className={BOX} />
              <div className="min-w-0">
                {item.label && (
                  <p className="mb-1 font-label text-label uppercase tracking-[.14em] text-label-dim">{item.label}</p>
                )}
                <p id={actionId} className="text-ui text-paper/85 print:text-black">{item.action}</p>
                {item.why && <p className="mt-0.5 text-[13px] leading-[1.5] text-paper-dim print:text-neutral-700">{whySentence(item.why)}</p>}
              </div>
              {pins && (
                <span className="group relative -my-1 -mr-1 print:hidden">
                  <button
                    type="button"
                    aria-label={pinned ? UNPIN_LABEL : PIN_LABEL}
                    aria-describedby={`${actionId} ${id}t${i}`}
                    onClick={() => pin(item.key)}
                    className="relative grid size-[26px] place-items-center rounded-inner text-label-dim transition-colors after:absolute after:-inset-[9px] after:content-[''] hover:text-paper-dim focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo-lt"
                  >
                    <PinMark pinned={pinned} />
                  </button>
                  <span
                    id={`${id}t${i}`}
                    role="tooltip"
                    className="pointer-events-none absolute right-0 top-[26px] z-10 w-[220px] rounded-lg border border-line bg-line-soft px-2.5 py-2 text-[13px] leading-[1.45] text-paper opacity-0 transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
                  >
                    {PIN_HINT}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {pins && (
        <p role="status" className={said ? "mt-2 text-[13px] leading-[1.5] text-paper-dim print:hidden" : undefined}>
          {said === "refused" ? LIMIT_LINE : said === "pinned" ? PINNED_LINE : ""}
        </p>
      )}
    </div>
  );
}

export default Checklist;

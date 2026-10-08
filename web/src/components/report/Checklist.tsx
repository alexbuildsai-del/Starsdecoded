/**
 * The one checklist: every thing to try, in a report, on the site and on the
 * dashboard, is this list in this look (ADR-172). A checklist means do: it
 * sits in the rail beside prose, or inside a card, and it is never folded
 * (ADR-24). A tick is silent, with no counter, and a box unticks (ADR-48). A
 * why is a sentence on its own line under its action, capitalised and closed
 * by the page, never a trailing clause (ADR-62). A pinnable list puts a pin
 * beside each item, which keeps it under What you're practising on the
 * dashboard, three a report (ADR-174).
 */
import { useEffect, useId, useReducer, useState, type CSSProperties } from "react";
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

// Outside a report there is no chapter accent, so a list given its own store takes the Closing's teal, the colour of things to try.
const TEAL = "#3FA796";

// The pin's words are Review 05/10 §7's. The brass is the chart's yellow, the Owner's call over "brass is never a control".
const PIN_LABEL = "Pin to your dashboard";
const UNPIN_LABEL = "Unpin from your dashboard";
const PIN_HINT = "Pinned items show on your dashboard.";
const BRASS = "#D4B06A";
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six"];
const LIMIT_LINE = `You can pin ${COUNT_WORDS[PIN_LIMIT] ?? PIN_LIMIT} per report. Unpin one first, here or on your dashboard.`;
const PINNED_LINE = `Pinned. ${PIN_HINT} You can pin ${COUNT_WORDS[PIN_LIMIT] ?? PIN_LIMIT} per report.`;

function PinMark({ pinned }: { pinned: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5"
      fill={pinned ? BRASS : "none"}
      stroke={pinned ? BRASS : "currentColor"}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6l-1 6 4 4H6l4-4z" />
      <path d="M12 13v8" />
    </svg>
  );
}

// The colours are the tokens' own values (line, surface, paper-dim, muted, indigo-lt, void), since the list also draws outside
// the report's token scope, on the site and the dashboard.
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
  const tone = { "--ck": store ? TEAL : "var(--accent)" } as CSSProperties;

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
    <div className="mt-[18px] max-w-[64ch] border-t border-[#1A202C] pt-3 print:border-[#999]" style={tone}>
      <span id={`${id}h`} className="font-label text-[10px] uppercase tracking-[.2em] text-[color:var(--ck)] transition-colors duration-[900ms] ease-linear">
        {heading}
      </span>
      <ul aria-labelledby={`${id}h`} className="mt-2 grid gap-2">
        {items.map((item, i) => {
          const ticked = ticks?.ticked(item.key) ?? false;
          const pinned = pins?.pinned(item.key) ?? false;
          const actionId = `${id}a${i}`;
          return (
            <li
              key={item.key}
              className={
                pins
                  ? "grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-x-2.5 rounded-[12px] border border-[#242C3B] bg-[#11161F] px-3.5 py-3 print:break-inside-avoid print:border-[#bbb] print:bg-transparent"
                  : "grid grid-cols-[22px_minmax(0,1fr)] items-start gap-x-2.5 rounded-[12px] border border-[#242C3B] bg-[#11161F] px-3.5 py-3 print:break-inside-avoid print:border-[#bbb] print:bg-transparent"
              }
            >
              {/* The label is the box's 40 px hit area on a phone; its negative margin keeps the box where the layout puts it. */}
              <label className="relative -mx-2.5 -mb-2.5 -mt-[9px] grid h-10 w-10 cursor-pointer place-items-center has-[:disabled]:cursor-default">
                <input
                  type="checkbox"
                  checked={ticked}
                  disabled={!ticks}
                  onChange={() => tick(item.key)}
                  aria-label={item.action}
                  className="peer m-0 h-5 w-5 cursor-pointer appearance-none rounded-[6px] border-[1.5px] border-[#6E7789] bg-transparent transition-colors hover:border-[#AEB6C6] checked:border-[color:var(--ck)] checked:bg-[color:var(--ck)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9FA8DA] disabled:cursor-default disabled:hover:border-[#6E7789] print:border-[#555]"
                />
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="pointer-events-none absolute h-[13px] w-[13px] opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                  fill="none"
                  stroke="#06080C"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12l5 5 9-10" />
                </svg>
              </label>
              <div className="min-w-0">
                {item.label && (
                  <p className="mb-1 font-label text-[9.5px] font-medium uppercase leading-[1.4] tracking-[.14em] text-[#6E7789]">{item.label}</p>
                )}
                <p id={actionId} className="text-sm leading-[1.5] text-[rgba(232,235,242,.84)] print:text-black">{item.action}</p>
                {item.why && <p className="mt-0.5 text-[13px] leading-[1.5] text-[#AEB6C6] print:text-[#444]">{whySentence(item.why)}</p>}
              </div>
              {pins && (
                <span className="group relative -my-1 -mr-1 print:hidden">
                  <button
                    type="button"
                    aria-label={pinned ? UNPIN_LABEL : PIN_LABEL}
                    aria-describedby={`${actionId} ${id}t${i}`}
                    onClick={() => pin(item.key)}
                    className="grid h-[26px] w-[26px] place-items-center rounded-[6px] text-[#6E7789] transition-colors hover:text-[#AEB6C6] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#9FA8DA]"
                  >
                    <PinMark pinned={pinned} />
                  </button>
                  <span
                    id={`${id}t${i}`}
                    role="tooltip"
                    className="pointer-events-none absolute right-0 top-[26px] z-10 w-[220px] rounded-lg border border-[#242C3B] bg-[#1A202C] px-2.5 py-2 text-[13px] leading-[1.45] text-[#E8EBF2] opacity-0 transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
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
        <p role="status" className={said ? "mt-2 text-[13px] leading-[1.5] text-[#AEB6C6] print:hidden" : undefined}>
          {said === "refused" ? LIMIT_LINE : said === "pinned" ? PINNED_LINE : ""}
        </p>
      )}
    </div>
  );
}

export default Checklist;

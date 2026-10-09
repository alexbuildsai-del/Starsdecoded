/**
 * One row of the dashboard's People and Compatibility lists (ADR-174), as the
 * approved mock draws it: who it is, a tap anywhere that opens the report, the
 * actions that stay in view, and "⋯" for the rest. "⋯" opens its items in
 * place, beside the row's own actions, rather than as a floating menu, so a
 * confirmation an item opens stays mounted with it. A row's state is one chip,
 * never a button (sharing-and-circle §7). The keyboard reaches "⋯",
 * lands on the first item, and Escape goes back to "⋯".
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const FOCUS = "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// The controls sit over the row's stretched link, so pressing one never opens the report.
export const ROW_ACTION = cn(
  "relative z-10 inline-flex min-h-8 items-center rounded-[10px] border border-[#242C3B] px-3 font-label text-[13px] font-medium leading-none text-[#E8EBF2] transition-colors hover:border-[#3A4560]",
  FOCUS,
);
/** A settled state in the mock's green, "This is me ✓". */
export const ROW_DONE =
  "inline-flex min-h-8 items-center rounded-[10px] border border-[#2C5A50] px-3 font-label text-[13px] font-medium leading-none text-[#9FDCCB]";
export const ROW_STATUS = "font-label text-xs leading-snug text-[#9AA3B5]";

const DOT: Record<"quiet" | "reading" | "waiting", string> = {
  quiet: "bg-[#7F8899]",
  reading: "bg-[#4DB6AC]",
  waiting: "bg-[#9FA8DA]",
};

/** A row's one state, in a neutral frame: the dot says which kind, the words say the rest. */
export function RowChip({ tone, children }: { tone: keyof typeof DOT; children: ReactNode }) {
  return (
    <span className="inline-flex min-h-6 items-center gap-1.5 rounded-full border border-[#242C3B] bg-[#0B0F15] px-2.5 font-label text-xs leading-none text-[#AEB6C6]">
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}

export const MENU_ITEM = cn(
  "relative z-10 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#242C3B] bg-[#0B0F15] px-2.5 font-label text-xs font-medium text-[#AEB6C6] transition-colors hover:text-[#E8EBF2]",
  FOCUS,
);
export const MENU_DANGER = cn(MENU_ITEM, "border-[#5A2C3B] text-[#E79AB2] hover:bg-[#0B0F15] hover:text-[#F2B8C9]");

/**
 * A dialog a row opens from state has no trigger for Radix to give focus back
 * to, so it goes back to whatever opened it, while that is still on the page.
 */
export function useOpenerFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      if (!opener.current?.isConnected) return;
      event.preventDefault();
      opener.current.focus();
    },
  };
}

export function MenuItem({ onSelect, children }: { onSelect: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onSelect} className={MENU_ITEM}>
      {children}
    </button>
  );
}

export interface ListRowProps {
  initials: string;
  /** The circle's violet ring: a pair with the reader that opens. */
  violet?: boolean;
  title: string;
  /** Where a tap goes; none while the report cannot open yet (ADR-131). */
  href?: string;
  sub?: ReactNode;
  /** What "⋯" is called for a screen reader, the row's own name in it. */
  moreLabel: string;
  /** Null when there is nothing to show, so an empty line takes no room. */
  actions?: ReactNode;
  /** Behind "⋯"; null, and the row has no "⋯". */
  menu?: ReactNode;
  /** A closed pair keeps its row and its name, greyed (MB-103 provisional). */
  muted?: boolean;
}

export function ListRow({ initials, violet = false, title, href, sub, moreLabel, actions = null, menu = null, muted = false }: ListRowProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
  }, [open]);

  const back = () => {
    setOpen(false);
    more.current?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    // A dialog an item opens is portalled out of the panel, and its Escape is its own.
    if (e.key !== "Escape" || !(e.target instanceof Node) || !e.currentTarget.contains(e.target)) return;
    e.preventDefault();
    back();
  };

  const name = cn("text-[15px] leading-snug [overflow-wrap:anywhere]", muted ? "text-[#9AA3B5]" : "text-[#E8EBF2]");
  return (
    <li
      className={cn(
        // A short row beside a taller one in two columns keeps its lines at the top.
        "relative grid min-w-0 content-start gap-2.5 rounded-xl border border-[#242C3B] bg-[#11161F] p-3",
        href && "transition-colors duration-200 hover:border-[#9FA8DA]/45 has-[a:focus-visible]:ring-1 has-[a:focus-visible]:ring-ring",
      )}
    >
      <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full border bg-[#0B0F15] font-display text-[15px] leading-none text-[#E8EBF2]",
            violet ? "border-[#9575CD] shadow-[0_0_0_2px_rgba(149,117,205,.2)]" : "border-[#242C3B]",
          )}
        >
          {initials}
        </span>
        <div className="min-w-0">
          {href ? (
            // The link's box stretches over the whole row, so a tap anywhere on it opens the report.
            <Link href={href} className={cn(name, "block outline-hidden after:absolute after:inset-0 after:rounded-xl")}>
              {title}
            </Link>
          ) : (
            <p className={name}>{title}</p>
          )}
          {sub && <p className="mt-0.5 font-mono text-[11.5px] leading-snug text-[#9AA3B5]">{sub}</p>}
        </div>
        {menu && (
          <button
            ref={more}
            type="button"
            aria-label={moreLabel}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((was) => !was)}
            onKeyDown={(e) => open && onKeyDown(e)}
            className={cn(
              "relative z-10 grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-[#242C3B] text-[#9AA3B5] transition-colors hover:text-[#E8EBF2]",
              open && "border-[#3A4560] text-[#E8EBF2]",
              FOCUS,
            )}
          >
            <span aria-hidden="true" className="text-base leading-none">⋯</span>
          </button>
        )}
      </div>
      {(actions || menu) && (
        <div hidden={!actions && !open} className="flex flex-wrap items-center gap-2">
          {actions}
          {menu && (
            <div id={panelId} ref={panel} role="group" aria-label={moreLabel} hidden={!open} onKeyDown={onKeyDown} className="flex flex-wrap items-center gap-1.5">
              {menu}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

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
import { Button, buttonStyles, type ButtonProps } from "@/ds/atoms/Button";
import { Chip } from "@/ds/atoms/Chip";
import { Numbers } from "@/ds/atoms/Numbers";
import { ToneDot } from "@/ds/atoms/ToneDot";
import { Card } from "@/ds/molecules/Card";

// The controls sit over the row's stretched link, so pressing one never opens the report.
export function RowAction({ className, ...rest }: ButtonProps) {
  return <Button size="compact" variant="secondary" className={cn("relative z-10", className)} {...rest} />;
}

/** A settled state, "This is me ✓": a teal chip, never a button. */
export function RowDone({ children }: { children: ReactNode }) {
  return (
    <Chip tone="teal" quiet>
      {children}
    </Chip>
  );
}

export const ROW_STATUS = "font-label text-caption text-paper-dim";

const DOT: Record<"quiet" | "reading" | "waiting", string> = {
  quiet: "",
  reading: "bg-teal",
  waiting: "bg-indigo-lt",
};

/** A row's one state, in a neutral frame: the dot says which kind, the words say the rest. */
export function RowChip({ tone, children }: { tone: keyof typeof DOT; children: ReactNode }) {
  return (
    <Chip icon={<ToneDot tone="mixed" className={DOT[tone]} />}>
      {children}
    </Chip>
  );
}

export const MENU_ITEM = cn(buttonStyles({ variant: "secondary", size: "compact" }), "relative z-10");
export const MENU_DANGER = cn(buttonStyles({ variant: "danger", size: "compact" }), "relative z-10");

export function MenuItem({ onSelect, children }: { onSelect: () => void; children: ReactNode }) {
  return (
    <Button size="compact" variant="secondary" onClick={onSelect} className="relative z-10">
      {children}
    </Button>
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

  const name = cn("text-prose leading-snug [overflow-wrap:anywhere]", muted ? "text-paper-dim" : "text-paper");
  return (
    <li className="min-w-0">
    <Card
      as="article"
      className={cn(
        // A short row beside a taller one in two columns keeps its lines at the top.
        "relative grid h-full content-start gap-2.5 p-3 sm:p-3",
        href && "transition-colors duration-fast ease-[var(--ease)] hover:border-indigo-lt/45 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus motion-reduce:transition-none",
      )}
    >
      <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-9 place-items-center rounded-pill border bg-ground font-display text-prose leading-none text-paper",
            violet ? "border-violet ring-2 ring-violet/20" : "border-line",
          )}
        >
          {initials}
        </span>
        <div className="min-w-0">
          {href ? (
            // The link's box stretches over the whole row, so a tap anywhere on it opens the report.
            <Link href={href} className={cn(name, "block outline-hidden after:absolute after:inset-0 after:rounded-card")}>
              {title}
            </Link>
          ) : (
            <p className={name}>{title}</p>
          )}
          {sub && <p className="mt-0.5"><Numbers>{sub}</Numbers></p>}
        </div>
        {menu && (
          <Button
            ref={more}
            size="compact"
            variant="secondary"
            aria-label={moreLabel}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((was) => !was)}
            onKeyDown={(e) => open && onKeyDown(e)}
            className={cn("relative z-10 size-9 px-0", open && "border-line-strong text-paper")}
          >
            <span aria-hidden="true" className="text-prose leading-none">⋯</span>
          </Button>
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
    </Card>
    </li>
  );
}

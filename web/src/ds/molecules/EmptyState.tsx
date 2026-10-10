import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** The small label naming the list, such as the circle. */
  label: string;
  title: string;
  /** One plain line on what will appear here. */
  body?: string;
  /** The one action that adds the first item, usually a Button. */
  action?: ReactNode;
  className?: string;
}

/** What a list shows before it has anything: it names what will appear and offers the one way to add the first. */
export function EmptyState({ label, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-start gap-2.5 rounded-card border border-dashed border-line p-6", className)}>
      <p className="m-0 font-label text-label uppercase text-label-dim">{label}</p>
      <h3 className="m-0 font-display text-card-title text-paper">{title}</h3>
      {body ? <p className="m-0 text-small text-paper-dim">{body}</p> : null}
      {action}
    </div>
  );
}

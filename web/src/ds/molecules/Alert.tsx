import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** One line in `error` under the field it is about. */
export function InlineError({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p role="alert" className={cn("text-small leading-snug text-error", className)} {...rest} />;
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /** error for a failed action; notice for news that is not a failure. */
  tone?: "error" | "notice";
}

export function Alert({ tone = "error", className, ...rest }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-control border px-4 py-3 text-small text-paper",
        tone === "error" ? "border-error/40 bg-error/10" : "border-line-strong bg-raised",
        className,
      )}
      {...rest}
    />
  );
}

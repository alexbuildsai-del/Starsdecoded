import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** site: the public bar, sticky, 62 px. app: signed-in pages. admin: app with the 17 px wordmark. checkout: not fixed, sits in its card. */
export type TopBarVersion = "site" | "app" | "admin" | "checkout";

export interface TopBarProps {
  version?: TopBarVersion;
  /** The wordmark, or a back link such as "← Dashboard". */
  left: ReactNode;
  /** Page links beside the wordmark; the site bar folds them into its phone menu. */
  centre?: ReactNode;
  /** Actions, then the account menu. */
  right?: ReactNode;
  /** A bar over a hero is see-through until the page scrolls. */
  seeThrough?: boolean;
  /** Reading width: the page's own column. */
  widthClass?: string;
  className?: string;
}

const SHELL: Record<TopBarVersion, string> = {
  site: "sticky top-0 z-20 h-[62px]",
  app: "fixed inset-x-0 top-0 z-50 h-14",
  admin: "fixed inset-x-0 top-0 z-50 h-14",
  checkout: "relative h-14",
};

export function TopBar({ version = "app", left, centre, right, seeThrough = false, widthClass = "max-w-4xl", className }: TopBarProps) {
  return (
    <header
      data-version={version}
      className={cn(
        "no-print border-b transition-colors duration-(--dur-slow) ease-[var(--ease)] motion-reduce:transition-none",
        SHELL[version],
        seeThrough ? "border-transparent bg-transparent" : "border-line/55 bg-ground/80 backdrop-blur-md",
        className,
      )}
    >
      <div className={cn("mx-auto flex h-full items-center justify-between gap-3 px-4 sm:px-6", widthClass)}>
        <div className="flex min-w-0 items-center gap-4 text-paper">{left}</div>
        {centre ? <nav aria-label="Site" className="hidden flex-1 items-center gap-6 pl-6 text-ui text-paper-dim md:flex">{centre}</nav> : null}
        {right ? <div className="flex shrink-0 items-center gap-2 sm:gap-3">{right}</div> : null}
      </div>
    </header>
  );
}

export default TopBar;

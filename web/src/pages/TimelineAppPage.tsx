/**
 * Timeline in the app (ADR-207, 209, 262; readings 1 to 4): the reader's own Timeline on one page at
 * /dashboard/timeline, Now and ahead then Life (a two-way switch on a phone), each event and cycle read on tap, and
 * Ask in the corner. Access is one check (ADR-262): a reader known not to have Timeline is sent to /timeline, the
 * product page, while a read that failed sends nobody anywhere. The app's shell keeps it out of search (`vercel.json`
 * and app.html's noindex), as every app route.
 */
import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, Redirect } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetHomeQueryKey, getGetTimelineAccessQueryKey, useGetHome } from "@workspace/api-client-react";
import { AccountMenu } from "@/components/AccountMenu";
import { StatusDots } from "@/components/StatusDots";
import { AskLauncher } from "@/components/ask/AskLauncher";
import { Life } from "@/components/timeline/Life";
import { NowAhead } from "@/components/timeline/NowAhead";
import { ReadingSheet, type ReadingTarget } from "@/components/timeline/ReadingSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { browserZone } from "@/lib/now-ahead";
import { usePageTitle } from "@/lib/page-title";
import { PERSONAL_REPORT } from "@/lib/product";
import { timelineDoor, useTimelineAccess } from "@/lib/timeline-access";
import { dayIn } from "@/lib/timeline-view";
import { cn } from "@/lib/utils";

type Screen = "now" | "life";
const SCREENS: readonly { id: Screen; label: string }[] = [
  { id: "now", label: "Now and ahead" },
  { id: "life", label: "Life" },
];

const LEDE = "The planets on your own chart, now and across your life.";
const BUTTON =
  "inline-flex min-h-10 items-center justify-self-start rounded-[10px] border border-[#242C3B] bg-[#171D29] px-4 font-label text-sm font-medium text-[#E8EBF2] transition-colors hover:border-[#5C6BC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const H2 = "font-display text-[26px] font-normal leading-tight tracking-[-0.01em] text-[#E8EBF2]";

/** Now and ahead · Life on a phone: a tab list, so the arrow keys move along it and the screen follows. */
function ScreenSwitch({
  screen,
  onChange,
  ids,
  tabs,
}: {
  screen: Screen;
  onChange: (screen: Screen) => void;
  ids: Record<Screen, { tab: string; panel: string }>;
  tabs: boolean;
}) {
  const buttons = useRef<Partial<Record<Screen, HTMLButtonElement | null>>>({});
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = SCREENS.findIndex((s) => s.id === screen);
    const to =
      e.key === "ArrowRight" || e.key === "ArrowLeft" ? (at + 1) % SCREENS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? SCREENS.length - 1
      : null;
    if (to === null) return;
    e.preventDefault();
    onChange(SCREENS[to].id);
    buttons.current[SCREENS[to].id]?.focus();
  };
  return (
    <div
      role={tabs ? "tablist" : undefined}
      aria-label="Timeline"
      onKeyDown={tabs ? onKeyDown : undefined}
      className="flex gap-0.5 rounded-[10px] border border-[#242C3B] bg-[#0B0F15] p-[3px] md:hidden"
    >
      {SCREENS.map(({ id, label }) => {
        const on = id === screen;
        return (
          <button
            key={id}
            ref={(el) => {
              buttons.current[id] = el;
            }}
            type="button"
            {...(tabs
              ? { role: "tab", id: ids[id].tab, "aria-selected": on, "aria-controls": ids[id].panel, tabIndex: on ? 0 : -1 }
              : { "aria-pressed": on })}
            onClick={() => onChange(id)}
            className={cn(
              "min-h-10 flex-1 rounded-[7px] px-2 font-label text-[13px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]",
              on ? "bg-[#171D29] text-[#E8EBF2]" : "text-[#9AA3B5] hover:text-[#E8EBF2]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** With Timeline but no finished Personal report of their own, the reader is told how to get one (reading 2). */
function NoReport() {
  const id = useId();
  return (
    <section aria-labelledby={id} className="mt-6 grid max-w-[560px] gap-3 rounded-[14px] border border-[#242C3B] bg-[#11161F] p-5">
      <h2 id={id} className="font-display text-2xl font-normal leading-tight text-[#E8EBF2]">
        Timeline starts with your {PERSONAL_REPORT}
      </h2>
      <p className="text-sm leading-normal text-[#AEB6C6]">
        Timeline reads the chart in your own {PERSONAL_REPORT}. You don't have a finished one yet.
      </p>
      <Link href="/dashboard" className={BUTTON}>
        Go to my dashboard
      </Link>
    </section>
  );
}

export function TimelineAppPage() {
  usePageTitle("Timeline");
  const access = useTimelineAccess();
  const door = timelineDoor(access);
  const client = useQueryClient();
  const phone = useIsMobile();
  const uid = useId();

  const zone = useMemo(() => browserZone(), []);
  const today = useMemo(() => dayIn(new Date(), zone ?? "UTC"), [zone]);
  const [screen, setScreen] = useState<Screen>("now");
  const [missing, setMissing] = useState(false);
  const [reading, setReading] = useState<ReadingTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const opened = door === "open";
  const home = useGetHome(undefined, { query: { queryKey: getGetHomeQueryKey(), enabled: opened } });
  const reportId = home.data?.you?.reportId ?? null;

  const onNoReport = useCallback(() => setMissing(true), []);
  // Access that went while the page was open is read again, and a no sends the reader to /timeline like any other.
  const onNoAccess = useCallback(() => {
    void client.invalidateQueries({ queryKey: getGetTimelineAccessQueryKey() });
  }, [client]);
  const onOpen = useCallback((target: ReadingTarget) => {
    setReading(target);
    setSheetOpen(true);
  }, []);
  const retry = () => void client.resetQueries({ queryKey: getGetTimelineAccessQueryKey() });

  const ids = useMemo(
    () =>
      Object.fromEntries(SCREENS.map(({ id }) => [id, { tab: `${uid}-${id}-tab`, panel: `${uid}-${id}` }])) as Record<
        Screen,
        { tab: string; panel: string }
      >,
    [uid],
  );

  if (door === "away") return <Redirect to="/timeline" replace />;

  const panel = (id: Screen, heading: string) =>
    phone
      ? { role: "tabpanel", id: ids[id].panel, "aria-labelledby": ids[id].tab }
      : { id: ids[id].panel, "aria-labelledby": heading };

  let body;
  if (door === "wait") {
    body = (
      <div className="grid min-h-[360px] place-items-center font-label text-sm text-muted-foreground">
        <StatusDots label="Loading your Timeline" />
      </div>
    );
  } else if (door === "retry") {
    body = (
      <div className="mt-6 grid max-w-[560px] gap-3">
        <p className="text-sm leading-normal text-[#AEB6C6]">We couldn't check your Timeline. Check your connection and try again.</p>
        <button type="button" onClick={retry} className={BUTTON}>
          Try again
        </button>
      </div>
    );
  } else if (missing || !access.hasPersonalReport) {
    body = <NoReport />;
  } else {
    body = (
      <div className="mt-5 grid gap-6 md:mt-8 md:gap-14">
        <ScreenSwitch screen={screen} onChange={setScreen} ids={ids} tabs={phone} />
        <section {...panel("now", `${uid}-now-h`)} className={cn("grid gap-4", screen !== "now" && "hidden md:grid")}>
          <h2 id={`${uid}-now-h`} className={cn(H2, "sr-only md:not-sr-only")}>
            Now and ahead
          </h2>
          <NowAhead zone={zone} onOpen={onOpen} onNoReport={onNoReport} onNoAccess={onNoAccess} reportId={reportId} />
        </section>
        <section {...panel("life", `${uid}-life-h`)} className={cn("grid gap-4", screen !== "life" && "hidden md:grid")}>
          <h2 id={`${uid}-life-h`} className={cn(H2, "sr-only md:not-sr-only")}>
            Life
          </h2>
          <Life zone={zone} today={today} onOpen={onOpen} onNoReport={onNoReport} onNoAccess={onNoAccess} />
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded font-label text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Dashboard
          </Link>
          <AccountMenu />
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-[74px] sm:px-6 sm:pt-20">
        <header className="grid gap-1">
          <h1 className="font-display text-[30px] font-normal leading-[1.15] tracking-[-0.01em]">Timeline</h1>
          <p className="text-[13px] leading-snug text-[#9AA3B5]">{LEDE}</p>
        </header>
        {body}
      </main>

      {opened ? <AskLauncher /> : null}
      <ReadingSheet
        eventKey={reading?.key ?? null}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        headline={reading?.headline}
        status={reading?.status}
        reportId={reportId}
      />
    </div>
  );
}

export default TimelineAppPage;

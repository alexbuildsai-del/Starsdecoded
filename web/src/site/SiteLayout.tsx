import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { EPHEMERIS } from "@workspace/engine";
import { buttonStyles } from "@/ds/atoms/Button";
import { Wordmark } from "@/ds/atoms/Wordmark";
import { Footer } from "@/ds/organisms/Footer";
import { TopBar } from "@/ds/organisms/TopBar";
import { usePageTitle } from "@/lib/page-title";
import { PRODUCT } from "@/lib/product";
import { keepCampaign } from "@/lib/prices";
import { ReportCta, SignInCta } from "./cta";
import { WaitlistDialogProvider } from "./WaitlistDialog";
import { FOOTER, NAV, formatUpdated, updatedLabel, type PageEntry, type PagePath } from "./site";
import "./site.css";

const currentIf = (href: PagePath, here: PagePath) => (href === here ? ("page" as const) : undefined);

function DateLine({ page }: { page: PageEntry }) {
  return (
    <>
      {updatedLabel(page)} <time dateTime={page.updated}>{formatUpdated(page.updated)}</time>
    </>
  );
}

/** The registry's head. A page that needs more inside it, such as the FAQ's search, passes this with children as `head`. */
export function PageHead({ page, children }: { page: PageEntry; children?: ReactNode }) {
  return (
    <header className="sd-head">
      <div className="sd-wrap">
        {page.kind === "learn" && page.parent ? (
          <nav className="sd-crumbs" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href={page.parent}>Learn</Link>
              </li>
              <li aria-current="page">{page.eyebrow}</li>
            </ol>
          </nav>
        ) : (
          <p className="sd-eyebrow">{page.eyebrow}</p>
        )}
        <h1 className="sd-page-h1">{page.h1}</h1>
        <p className="sd-lede">{page.lede}</p>
        <p className="sd-meta">
          <DateLine page={page} />
        </p>
        {children}
      </div>
    </header>
  );
}

const MENU_ROW =
  "flex min-h-11 items-center rounded-inner px-3 py-2 text-ui text-paper-dim no-underline outline-none transition-colors duration-(--dur-fast) ease-[var(--ease)] hover:bg-surface hover:text-paper aria-[current=page]:text-paper motion-reduce:transition-none";

function PhoneMenu({ here }: { here: PagePath }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  // A details element closes only from its own summary, so a tap outside and Escape close it here.
  useEffect(() => {
    if (!open) return;
    const close = (refocus: boolean) => {
      const box = menu.current;
      if (!box) return;
      box.open = false;
      if (refocus) box.querySelector("summary")?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) close(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <details className="group relative min-[901px]:hidden" ref={menu} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="relative grid size-9 cursor-pointer list-none place-items-center rounded-control border border-control-edge text-paper transition-colors duration-(--dur-fast) ease-[var(--ease)] after:absolute after:-inset-1 after:content-[''] hover:border-indigo-lt motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Menu</span>
        <svg className="size-[18px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] group-open:hidden" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <svg className="hidden size-[18px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] group-open:block" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </summary>
      {/* The page already open changes no route, and Sign in may open the waitlist over the page, which must not sit on
          an open menu: any link or button closes it. */}
      <nav
        className="absolute right-0 top-[calc(100%+8px)] z-30 grid w-[min(15rem,calc(100vw-2rem))] gap-0.5 rounded-card border border-line bg-raised p-1 shadow-raised"
        aria-label="Site"
        onClick={(event) => {
          if ((event.target as Element).closest("a, button") && menu.current) menu.current.open = false;
        }}
      >
        {NAV.map((link) => (
          <Link key={link.href} href={link.href} className={MENU_ROW} aria-current={currentIf(link.href, here)}>
            {link.label}
          </Link>
        ))}
        <SignInCta source="menu-sign-in" className={`${MENU_ROW} min-[461px]:hidden`} />
      </nav>
    </details>
  );
}

function SiteNav({ here }: { here: PagePath }) {
  const word = (
    <Link
      className="inline-flex items-center text-paper no-underline max-[359px]:[&>span>span]:sr-only"
      href="/"
      aria-label={`${PRODUCT}, home`}
      aria-current={currentIf("/", here)}
    >
      <Wordmark />
    </Link>
  );
  return (
    <TopBar
      version="site"
      widthClass="max-w-[1200px]"
      left={
        <>
          {word}
          <nav className="ml-6 hidden items-center gap-6 text-ui text-paper-dim min-[901px]:flex" aria-label="Site">
            {NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-paper-dim no-underline hover:text-paper aria-[current=page]:text-paper aria-[current=page]:underline aria-[current=page]:decoration-indigo-lt aria-[current=page]:underline-offset-8"
                aria-current={currentIf(link.href, here)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </>
      }
      right={
        <>
          <SignInCta source="nav-sign-in" className={`${buttonStyles({ variant: "secondary", size: "compact" })} max-[460px]:hidden`} />
          <ReportCta source="nav" className={buttonStyles({ size: "compact" })} />
          <PhoneMenu here={here} />
        </>
      }
    />
  );
}

function SiteFooter({ page }: { page: PageEntry }) {
  return (
    <Footer
      brand={
        <Link className="inline-flex items-center text-paper no-underline" href="/">
          <Wordmark />
        </Link>
      }
      tagline="We write reports about you from your birth chart."
      columns={FOOTER.map((column) => ({
        heading: column.heading,
        links: column.links.map((link) => (
          <Link key={link.href} href={link.href} className="aria-[current=page]:!text-paper" aria-current={currentIf(link.href, page.path)}>
            {link.label}
          </Link>
        )),
      }))}
      base={[
        <>Positions computed with {EPHEMERIS}. Place search © OpenStreetMap contributors.</>,
        <>
          <DateLine page={page} /> · © {page.updated.slice(0, 4)} {PRODUCT}
        </>,
      ]}
    />
  );
}

export function SiteLayout({
  page,
  children,
  end,
  head,
}: {
  page: PageEntry;
  children?: ReactNode;
  /** The page's last call to action or related cards: no page is a dead end. */
  end?: ReactNode;
  /** For a head that is part of a larger first screen (/sky's form and wheel, /sample's ring), drawn by the page. */
  head?: ReactNode;
}) {
  usePageTitle(page.title, { raw: true });
  // A link with an offer's code opens on any public page; the tab keeps the code for the price rows and for checkout.
  useEffect(() => {
    keepCampaign(window.location.search);
  }, []);
  // The home page's head is its hero, the first of its sections.
  const shownHead = head !== undefined ? head : page.kind === "home" ? null : <PageHead page={page} />;

  return (
    <div className="sd">
      <WaitlistDialogProvider>
        <a className="sd-skip" href="#main">
          Skip to content
        </a>
        <SiteNav here={page.path} />
        <main id="main" className="sd-main" tabIndex={-1}>
          {shownHead}
          {children}
          {end ? (
            <div className="sd-end">
              <div className="sd-wrap">{end}</div>
            </div>
          ) : null}
        </main>
        <SiteFooter page={page} />
      </WaitlistDialogProvider>
    </div>
  );
}

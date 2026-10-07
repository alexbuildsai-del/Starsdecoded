import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { EPHEMERIS } from "@workspace/engine";
import { Mark } from "@/components/Mark";
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
    <details className="sd-menu" ref={menu} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span className="sr-only">Menu</span>
        <svg className="sd-menu-shut" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <svg className="sd-menu-x" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </summary>
      {/* The page already open changes no route, and Sign in may open the waitlist over the page, which must not sit on
          an open menu: any link or button closes it. */}
      <nav
        className="sd-menu-panel"
        aria-label="Site"
        onClick={(event) => {
          if ((event.target as Element).closest("a, button") && menu.current) menu.current.open = false;
        }}
      >
        {NAV.map((link) => (
          <Link key={link.href} href={link.href} aria-current={currentIf(link.href, here)}>
            {link.label}
          </Link>
        ))}
        <SignInCta source="menu-sign-in" className="sd-menu-signin" />
      </nav>
    </details>
  );
}

function SiteNav({ here }: { here: PagePath }) {
  return (
    <header className="sd-nav">
      <div className="sd-wrap">
        <Link className="sd-word" href="/" aria-label={`${PRODUCT}, home`} aria-current={currentIf("/", here)}>
          <Mark />
          <span className="sd-word-name">{PRODUCT}</span>
        </Link>
        <nav className="sd-links" aria-label="Site">
          {NAV.map((link) => (
            <Link key={link.href} href={link.href} aria-current={currentIf(link.href, here)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="sd-right">
          <SignInCta source="nav-sign-in" className="sd-btn sd-btn-g sd-btn-sm sd-signin" />
          <ReportCta source="nav" className="sd-btn sd-btn-sm" />
          <PhoneMenu here={here} />
        </div>
      </div>
    </header>
  );
}

function SiteFooter({ page }: { page: PageEntry }) {
  return (
    <footer className="sd-foot">
      <div className="sd-wrap">
        <div className="sd-foot-cols">
          <div className="sd-foot-brand">
            <Link className="sd-word" href="/">
              <Mark />
              {PRODUCT}
            </Link>
            <p>We write reports about you from your birth chart.</p>
          </div>
          {FOOTER.map((column) => (
            <div key={column.heading}>
              <h2>{column.heading}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} aria-current={currentIf(link.href, page.path)}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="sd-foot-base">
          <span>Positions computed with {EPHEMERIS}. Place search © OpenStreetMap contributors.</span>
          <span>
            <DateLine page={page} /> · © {page.updated.slice(0, 4)} {PRODUCT}
          </span>
        </div>
      </div>
    </footer>
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

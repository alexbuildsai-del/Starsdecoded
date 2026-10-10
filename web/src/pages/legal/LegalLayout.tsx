import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { LEGAL_IDENTITY } from "@workspace/commerce";
import { DraftBanner } from "@/components/DraftBanner";
import { PageHead, SiteLayout } from "@/site/SiteLayout";
import { FOOTER, pageFor, type PagePath } from "@/site/site";

type LegalPath = Extract<PagePath, "/privacy" | "/terms" | "/refunds" | "/company">;

// The footer's Company column is the legal set, so the two cannot disagree on a label or an order.
const LEGAL_LINKS = FOOTER.flatMap((column) => column.links).filter((link) => pageFor(link.href).kind === "legal");

// MB-115 provisional: a sentence that needs the contact address is left out while it is missing, never shown with a gap
// (reading 10); the draft banner says the page is not final meanwhile.
export const CONTACT: string | null = LEGAL_IDENTITY.contactEmail?.trim() || null;

export function MailLink({ address }: { address: string }) {
  return <a href={`mailto:${address}`}>{address}</a>;
}

export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-14 last:mb-0">
      <h2 className="mb-4 text-sheet-title leading-tight">{title}</h2>
      <div className="space-y-4 text-prose leading-[1.7] text-paper-dim">{children}</div>
    </section>
  );
}

function LegalNav({ here }: { here: PagePath }) {
  return (
    <nav aria-label="Legal pages">
      <ul className="-my-2 flex flex-wrap gap-x-6 font-label text-small font-medium">
        {LEGAL_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={link.href === here ? "page" : undefined}
              className="inline-block py-2 text-paper-dim no-underline decoration-indigo-lt underline-offset-[6px] hover:text-paper aria-[current=page]:text-paper aria-[current=page]:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LegalLayout({ path, children }: { path: LegalPath; children: ReactNode }) {
  const page = pageFor(path);

  // A link to one section (the waitlist form's to #waitlist) can land before this page has rendered, and the fonts can
  // arrive after the jump and move the section, so it lands once now and again when they are in.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const land = () => document.getElementById(id)?.scrollIntoView();
    land();
    void document.fonts?.ready.then(land);
  }, []);

  return (
    <SiteLayout
      page={page}
      head={
        <PageHead page={page}>
          <LegalNav here={page.path} />
        </PageHead>
      }
    >
      <div className="sd-wrap pb-24 pt-12 md:pt-16">
        <div className="max-w-[34rem]">
          <DraftBanner className="mb-12" />
          {children}
        </div>
      </div>
    </SiteLayout>
  );
}

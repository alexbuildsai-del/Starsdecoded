import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { DraftBanner } from "@/components/DraftBanner";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
  { href: "/company", label: "Company" },
];

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl font-light mb-3">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

export function LegalLayout({
  kicker,
  title,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="flex items-center gap-4">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="font-label text-xs text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-28 pb-24">
        <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-4">{kicker}</p>
        <h1 className="font-display text-4xl md:text-5xl font-light leading-tight mb-3">{title}</h1>
        <p className="font-label text-xs text-muted-foreground mb-8">Draft dated {updated}</p>
        <div className="mb-12">
          <DraftBanner />
        </div>
        {children}
      </main>
    </div>
  );
}

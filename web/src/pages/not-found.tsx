import { Link } from "wouter";
import { Mark } from "@/components/Mark";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/lib/page-title";
import { PRODUCT } from "@/lib/product";

/** The whole tab title, which the prerendered 404.html carries too. */
export const NOT_FOUND_TITLE = `Page not found · ${PRODUCT}`;

/** 404.html answers every unknown path with this page (ADR-114), so nothing in it may depend on the path. */
export default function NotFound() {
  usePageTitle(NOT_FOUND_TITLE, { raw: true });

  return (
    <main className="min-h-[100dvh] bg-background bg-stars flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 font-display text-lg text-foreground">
          <Mark className="h-5 w-5 text-primary" />
          {PRODUCT}
        </Link>
        <h1 className="mt-10 font-display text-4xl leading-tight">Page not found</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed text-pretty">
          There's no page at this address. Check the link for a typo, or start again from the home page.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">Go to the home page</Link>
        </Button>
      </div>
    </main>
  );
}

/**
 * The build's server half of R-7.6 (ADR-114): each public page rendered to HTML with `renderToString` and wouter's
 * `ssrPath`, for scripts/prerender.mjs to write into the built index.html. No Clerk: nobody is known before hydration,
 * so the page renders the first paint the browser repeats (usePrelaunchView and useSignedInView fall back to it), and a
 * build needs no Clerk key.
 */
import { Suspense, type ComponentType, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_ENV } from "@/lib/appEnv";
import NotFound, { NOT_FOUND_TITLE } from "@/pages/not-found";
import { headFor } from "@/site/head";
import { PUBLIC_ROUTES, type PublicRoute } from "@/site/routes";
import { pageFor } from "@/site/site";

export { llmsTxt, robotsTxt, sitemapXml } from "@/site/crawl";

/** The deploy this build is for, so the heads and the crawl files say what the host is (reading 15). */
export const env = APP_ENV;
export const base = import.meta.env.BASE_URL;

const basePath = base.replace(/\/$/, "");

const NOT_FOUND_HEAD = `<title>${NOT_FOUND_TITLE}</title>\n<meta name="robots" content="noindex" />`;

/**
 * The providers a page can reach for, and the one Suspense boundary App.tsx renders every route in: hydration expects
 * that boundary's markers. Like App.tsx before hydration, no level has a second child, so useId counts the same here.
 */
function Shell({ path, children }: { path: string; children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <Router base={basePath} ssrPath={`${basePath}${path}`}>
          <Suspense fallback={null}>{children}</Suspense>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

/** A public page's HTML and head; any other path gets the page that answers 404. */
export async function render(path: string): Promise<{ html: string; head: string }> {
  const route = PUBLIC_ROUTES.find((entry) => entry.path === path);
  const Page = route ? (await route.load()).default : NotFound;
  const html = renderToString(
    <Shell path={path}>
      <Page />
    </Shell>,
  );
  return { html, head: route ? headFor(route.path, env) : NOT_FOUND_HEAD };
}

/** app.html's head: the tags headFor gives every app route, noindex and the site's share card among them. */
export function appHead(): string {
  return headFor("/chart", env);
}

const PAGE_MODULES = import.meta.glob<{ default: ComponentType }>(["./site/pages/*.tsx", "./pages/legal/*.tsx"]);

/** Matched on the module's export rather than a file name, so a route can never borrow another page's styles. */
async function sourceOf(route: PublicRoute): Promise<string> {
  const page = (await route.load()).default;
  for (const [file, load] of Object.entries(PAGE_MODULES)) {
    if ((await load()).default === page) return `src/${file.slice(2)}`;
  }
  throw new Error(`${route.path} loads its page from outside PAGE_MODULES' folders, so its styles cannot be linked.`);
}

export interface PublicPage {
  path: string;
  h1: string;
  lede: string;
  /** The page's module as the client manifest keys it, for its stylesheets and chunks. */
  source: string;
}

/** The pages the build writes: PUBLIC_ROUTES, which leaves /sample out while it is gated (reading 4). */
export async function publicPages(): Promise<PublicPage[]> {
  return Promise.all(
    PUBLIC_ROUTES.map(async (route) => {
      const page = pageFor(route.path);
      return { path: route.path, h1: page.h1, lede: page.lede, source: await sourceOf(route) };
    }),
  );
}

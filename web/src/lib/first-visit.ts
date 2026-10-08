/**
 * The first visit (Review 05/10 §1, ADR-389; readings 20, 21). With no Personal report of their own the dashboard asks
 * for one, in the artifact's words, and each bundle goes through today's checkout, which comes back to the birth form
 * for You. Your first steps, Practising and Ask wait for that report to be finished. The admin's preview of a new
 * visitor's dashboard is drawn here from nothing, so it never asks for anything of the admin's (ADR-197).
 */
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import type { Home } from "@workspace/api-client-react";
import { bundleById, type BundleId } from "@workspace/commerce";
import { BASE_URL } from "@/lib/api";
import { APP_ENV, type AppEnv } from "@/lib/appEnv";
import { isFinished } from "@/lib/home-view";
import { PERSONAL_REPORT } from "@/lib/product";

/** The artifact's empty dashboard (Mock B), its footnote rewritten for a tap that pays first (ADR-389). */
export const FIRST_VISIT = {
  heading: "Start with your own report",
  line: "Ten chapters on how you think, work and love. Then add the people close to you.",
  pay: "Tap one to pay, then enter your birth details.",
  free: "Credits are free while we test.",
} as const;

/** Each bundle's line on its button, in the artifact's words, with the count the catalogue holds. */
export const FIRST_VISIT_LINES: Readonly<Record<BundleId, string>> = {
  solo: `Your ${PERSONAL_REPORT}`,
  couple: "A report each and how you get along",
  family: `${bundleById("family").credits} reports for the people close to you`,
};

/** Staging and the previews pay in Stripe's sandbox, so their credits cost nothing; production never says so. */
export function firstVisitNote(env: AppEnv = APP_ENV): string {
  return env === "production" ? FIRST_VISIT.pay : `${FIRST_VISIT.pay} ${FIRST_VISIT.free}`;
}

/** No report of the reader's own at all, so the dashboard asks for it; several marked as theirs ask which instead. */
export function isFirstVisit(home: Pick<Home, "you" | "several">): boolean {
  return !home.you && !home.several;
}

/** The reader can read a finished Personal report of their own, which Your first steps and Practising wait for (reading 20). */
export function ownFinished(home: Pick<Home, "you" | "people">): boolean {
  return [...(home.you ? [home.you] : []), ...home.people].some((person) => person.isSelf && isFinished(person.status));
}

/**
 * A new visitor's GET /home, as the server sends it to a session that has made nothing: no one, no pairs, and Your first
 * steps on step 1, which the first visit doesn't draw. The admin's preview is drawn from it rather than from theirs.
 */
export const EMPTY_HOME: Home = {
  you: null,
  several: false,
  people: [],
  pairs: [],
  practising: [],
  firstSteps: { step: 1, person: null, gift: false, pairReady: false },
};

/** `/dashboard?visitor=new`, the admin menu's new-visitor view. */
export function visitorAsked(search: string): boolean {
  return new URLSearchParams(search).get("visitor") === "new";
}

/** The dashboard's address without the preview's query, the rest kept. */
export function withoutVisitor(search: string): string {
  const rest = new URLSearchParams(search);
  rest.delete("visitor");
  const query = rest.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

export const VISITOR = {
  intro: "What a new visitor sees. None of your reports or credits are here.",
  leave: "Leave",
  leaveLabel: "Leave the preview",
} as const;

export type VisitorTap = BundleId | "centre" | "credits" | "sign-in";

/**
 * What a tap in the preview would open for a visitor who isn't signed in, said rather than opened (reading 21): a
 * bundle and the circle's centre sign in first, then check out and come back to the birth form.
 */
export function visitorStep(tap: VisitorTap): string {
  if (tap === "credits") return "Credits would show your balance and the bundles.";
  if (tap === "sign-in") return "Sign in would open the sign-in page.";
  const what = tap === "centre" ? "Your report" : bundleById(tap).name;
  return `${what} would open sign-in, then checkout, then the birth form.`;
}

/** Where the preview goes: on, to the reader's own dashboard, or nowhere until it knows. */
export type VisitorGate = "wait" | "preview" | "dashboard";

async function adminAnswer(): Promise<boolean> {
  const res = await fetch(`${BASE_URL}admin/me`, { credentials: "include" });
  if (!res.ok) return false;
  const data = (await res.json()) as { isAdmin?: unknown };
  return data.isAdmin === true;
}

/**
 * The preview is the admin's (reading 21), decided before anything of theirs is asked for. It asks /admin/me under
 * `useIsAdmin`'s key, so the account menu reads the same answer, and tells waiting from a known no by the query's own
 * state, which `useIsAdmin`'s `false` can't. A signed-out visitor and any other account get their own dashboard; a
 * check that failed gets the preview, which holds nothing of anyone's, rather than a dashboard that would ask for the
 * admin's.
 */
export function useVisitorGate(): VisitorGate {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const check = useQuery({
    queryKey: ["admin-me", userId ?? ""],
    queryFn: adminAnswer,
    enabled: isLoaded && isSignedIn === true,
    staleTime: Infinity,
    retry: false,
  });
  if (!isLoaded) return "wait";
  if (!isSignedIn) return "dashboard";
  if (check.isError || check.data === true) return "preview";
  return check.isSuccess ? "dashboard" : "wait";
}

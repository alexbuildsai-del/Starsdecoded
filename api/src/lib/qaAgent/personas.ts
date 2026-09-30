/**
 * The five personas of `.claude/agents/qa.md`, as a headless walk on
 * staging can play them without spending: pages opened, things looked for,
 * and the one rule every walk keeps, that no form is ever submitted and no
 * report is ever created (MB-78). Signing in is not possible headless, so
 * the buyer's Get my report ends at the sign-in a signed-out visitor is
 * asked for, and the returning user and the admin check what an anonymous
 * visitor is shown at their doors. Every path is one the site serves; the
 * test reads the registry and vercel.json to keep it so.
 */
export interface PersonaStep {
  path: string;
  /** Text the page must show; a miss is a finding. */
  expect: RegExp[];
  /** Text the page must never show. */
  never?: RegExp[];
  /** Severity of a page that does not load or misses an expectation. */
  sev: 1 | 2 | 3;
}

export interface Persona {
  name: string;
  brief: string;
  steps: PersonaStep[];
}

// R-0.4: a reader is never shown the product's inherited name.
export const RETIRED_NAME = /Astra/;

/** Every step fails on the retired name, so a step added later cannot leave the check out. */
const checkedForRetiredName = (steps: PersonaStep[]): PersonaStep[] => steps.map((step) => ({ ...step, never: [RETIRED_NAME, ...(step.never ?? [])] }));

export const PERSONAS: Persona[] = [
  {
    name: "Buyer",
    brief: "Lands, understands the method claim, tries the free chart and reads what it asks, reads the sample report, and follows Get my report to the sign-in it asks for. Every claim on the home page must match what the product does: computed chart, whole-sign houses, one purchase, a written report.",
    steps: checkedForRetiredName([
      { path: "/", expect: [/natal|chart|report/i], sev: 1 },
      { path: "/sky", expect: [/birth|date|time|place/i], sev: 1 },
      // MB-90 provisional: production answers 404 here until the sample's name clears its legal check, and this walk only ever runs on staging.
      { path: "/sample", expect: [/natal report/i, /chapter/i], sev: 2 },
      // Clerk draws the sign-in from its own script under this walk's GET-only rule, so a miss is sev 2; the birth form showing instead breaks the account rule (ADR-140), which the `never` makes sev 1.
      { path: "/chart", expect: [/sign in|welcome back/i], never: [/Enter your birth details/i], sev: 2 },
    ]),
  },
  {
    name: "Returning user",
    brief: "Comes back for an earlier report. Anonymous here: the dashboard must offer the way in without an error page.",
    steps: checkedForRetiredName([{ path: "/dashboard", expect: [/sign in|report|dashboard/i], sev: 2 }]),
  },
  {
    name: "Invitee",
    brief: "Opens an invite link cold with a token that does not exist and must be told plainly, never shown a stack trace or a blank page.",
    // The token rides in the query, as every link the API mints does; a path segment reaches only the 404 page.
    steps: checkedForRetiredName([{ path: "/claim?token=not-a-real-token", expect: [/invite|expired|not found|sign in|claim/i], never: [/TypeError|undefined|\bat\b .*\.js/], sev: 2 }]),
  },
  {
    name: "Admin",
    brief: "Reaches the admin doors anonymous and must be refused, not served.",
    steps: checkedForRetiredName([{ path: "/admin/prompts", expect: [/sign in|access|admin/i], sev: 2 }, { path: "/admin/report-lab", expect: [/sign in|access|admin/i], sev: 2 }]),
  },
  {
    name: "Skeptic",
    brief: "Reads the method and the legal pages: house system, the library named, the section count, the price, the delete-my-data path, company details.",
    steps: checkedForRetiredName([
      { path: "/method", expect: [/whole.sign|astronomy/i], sev: 2 },
      { path: "/learn/whole-sign-houses", expect: [/whole.sign/i], sev: 2 },
      { path: "/privacy", expect: [/privacy|data|delete/i], sev: 2 },
      { path: "/terms", expect: [/terms/i], sev: 3 },
      { path: "/refunds", expect: [/refund/i], sev: 3 },
      { path: "/company", expect: [/run by/i], sev: 2 },
    ]),
  },
];

/** Forms a walk never submits and calls it never makes: nothing that creates a report or joins the waitlist (MB-78). */
export const FORBIDDEN_ACTIONS = [
  "submit birth form",
  "submit waitlist form",
  "POST /api/reports",
  "POST /api/compatibility",
  "POST /api/reports/:id/regenerate",
  "POST /api/waitlist",
  "POST /api/waitlist/confirm",
];

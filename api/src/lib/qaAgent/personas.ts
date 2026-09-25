/**
 * The five personas of `.claude/agents/qa.md`, as a headless walk on
 * staging can play them without spending: pages opened, things looked for,
 * and the one rule every walk keeps, that no birth form is ever submitted
 * and no report is ever created (MB-78). Signing in is not possible
 * headless, so the returning user and the admin check what an anonymous
 * visitor is shown at their doors.
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

export const PERSONAS: Persona[] = [
  {
    name: "Buyer",
    brief: "Lands, understands the method claim, opens the birth form and reads what it asks. Every claim on the landing page must match what the product does: computed chart, whole-sign houses, one purchase, a written report.",
    steps: [
      { path: "/", expect: [/natal|chart|report/i], never: [/Astra/], sev: 1 },
      { path: "/birth-form", expect: [/birth|date|time|place/i], sev: 1 },
    ],
  },
  {
    name: "Returning user",
    brief: "Comes back for an earlier report. Anonymous here: the dashboard must offer the way in without an error page.",
    steps: [{ path: "/dashboard", expect: [/sign in|report|dashboard/i], sev: 2 }],
  },
  {
    name: "Invitee",
    brief: "Opens an invite link cold with a token that does not exist and must be told plainly, never shown a stack trace or a blank page.",
    steps: [{ path: "/claim/not-a-real-token", expect: [/invite|expired|not found|sign in|claim/i], never: [/TypeError|undefined|\bat\b .*\.js/], sev: 2 }],
  },
  {
    name: "Admin",
    brief: "Reaches the admin doors anonymous and must be refused, not served.",
    steps: [{ path: "/admin/prompts", expect: [/sign in|access|admin/i], sev: 2 }, { path: "/admin/report-lab", expect: [/sign in|access|admin/i], sev: 2 }],
  },
  {
    name: "Skeptic",
    brief: "Reads the method and the legal pages: house system, the library named, the section count, the price, the delete-my-data path, company details.",
    steps: [
      { path: "/", expect: [/whole.sign|astronomy/i], sev: 2 },
      { path: "/legal/privacy", expect: [/privacy|data|delete/i], sev: 2 },
      { path: "/legal/terms", expect: [/terms/i], sev: 3 },
      { path: "/legal/refunds", expect: [/refund/i], sev: 3 },
    ],
  },
];

/** Paths a walk never navigates to and forms it never submits: nothing that creates a report. */
export const FORBIDDEN_ACTIONS = ["submit birth form", "POST /api/reports", "POST /api/compatibility", "POST /api/reports/:id/regenerate"];

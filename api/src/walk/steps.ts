/**
 * The Owner's flow as one list that both walks run in order (ADR-273, 314, 315): the buyer walk on a scratch Postgres
 * in CI, and the staging walk on the live site as the QA pair. Neither walk keeps a list of its own. Each runs this one
 * through a map typed by its ids, `Record<StepId, …>` for the buyer walk and `Record<StagingStepId, …>` for the staging
 * walk, so a step added here fails typecheck until both walks have it, or until it says it is local and why. Each also
 * refuses at its start when its map and this list differ (`mapProblem`), and steps.test.ts holds the staging walk's map
 * to the ids here.
 *
 * What the staging walk does with a step: `live` runs it on the live site; `stored` is a step that writes a report,
 * which a deploy's walk copies in from the seed and checks, and a Release's walk writes for real as the next seed
 * (reading 11); `local` skips it there, for the reason it gives. Credit counts differ by host, since staging's writes
 * are stored and Mira starts there with test credits, so a step names what changes and never a balance, and each walk
 * checks the change against the ledger it reads.
 */

export type StagingKind = "live" | "stored" | "local";

interface Listed {
  readonly id: string;
  readonly label: string;
  readonly staging: StagingKind;
  /** How the staging walk runs a live step, where the label alone doesn't say. */
  readonly how?: string;
  /** Why staging skips a local step. Every local step has one and no other step does. */
  readonly reason?: string;
  /** The stored steps whose reports this one reads, so it waits with them while they have no seed (reading 11). */
  readonly reads?: readonly string[];
}

const TOMAS_IS_LOCAL = "Tomás has no account on staging, where the QA pair is Mira and Idris; his steps run in CI (ADR-314).";

export const STEPS = [
  {
    id: "sign-in",
    label: "Mira arrives signed out, then signs in",
    staging: "live",
    how: "from the reset state",
  },
  {
    id: "buy",
    label: "Mira buys Family & friends from the credits sheet with the tick; the webhook adds 5 credits once; she's back in the sheet",
    staging: "live",
    how: "the test card 4242 in Stripe's sandbox",
  },
  {
    id: "own-report",
    label: "Mira writes her Personal report; a credit is taken before it's written",
    staging: "stored",
  },
  {
    id: "gift",
    label: "Mira gifts Idris a report; the email goes out and a credit is held",
    staging: "live",
  },
  {
    id: "no-credit",
    label: "Idris signs in with no credit and asks to write: 402 no_credit and Get credits",
    staging: "live",
  },
  {
    id: "gift-claimed",
    label: "Idris claims the gift from its link; the credit moves to him",
    staging: "live",
  },
  {
    id: "idris-report",
    label: "Idris writes his Personal report with the gifted credit",
    staging: "stored",
  },
  {
    id: "share",
    label: "Mira shares her report with Idris; he reads it from the link",
    staging: "live",
    reads: ["own-report"],
  },
  {
    id: "share-back",
    label: "Idris shares back; Mira reads his report",
    staging: "live",
    reads: ["idris-report"],
  },
  {
    id: "pair",
    label: "Mira writes the parent and child report for herself and Idris",
    staging: "stored",
    reads: ["own-report", "idris-report"],
  },
  {
    // ADR-285: Idris holds his own chart, so the pair goes to him as any send does.
    id: "pair-shared",
    label: "Mira shares the parent and child report with Idris; he claims it from the link and reads it",
    staging: "live",
    reads: ["pair"],
  },
  {
    id: "refund",
    label: "Stripe refunds the Family & friends purchase: its unused credits go, used and given ones stay",
    staging: "live",
  },
  {
    id: "tomas-report",
    label: "Mira, out of credits, buys a Couple from the birth form and writes Tomás's Personal report",
    staging: "local",
    reason: TOMAS_IS_LOCAL,
  },
  {
    id: "tomas-pair",
    label: "Mira writes the partners report for herself and Tomás",
    staging: "local",
    reason: TOMAS_IS_LOCAL,
  },
  {
    id: "tomas-sends",
    label: "Mira sends Tomás both reports; two emails go out",
    staging: "local",
    reason: TOMAS_IS_LOCAL,
  },
  {
    id: "tomas-claims",
    label: "Tomás claims both reports and reads them",
    staging: "local",
    reason: TOMAS_IS_LOCAL,
  },
  {
    // Timeline needs the reader's own finished Personal report (reading 1), so the plan waits with Mira's.
    id: "timeline",
    label: "Mira starts Timeline yearly: it opens with 1 credit to give, renews a year on, and closes at the end of the period she cancels; Idris keeps the teaser",
    staging: "live",
    how: "a test clock; access and the Account page, no Timeline page",
    reads: ["own-report"],
  },
] as const satisfies readonly Listed[];

export type ListedStep = (typeof STEPS)[number];
export type StepId = ListedStep["id"];
export type StoredStepId = Extract<ListedStep, { staging: "stored" }>["id"];
export type LocalStepId = Extract<ListedStep, { staging: "local" }>["id"];
/** The ids the staging walk's map runs: every step but the local ones. */
export type StagingStepId = Exclude<StepId, LocalStepId>;

export const STEP_IDS: readonly StepId[] = STEPS.map((step) => step.id);

export const STAGING_STEP_IDS: readonly StagingStepId[] = STEPS.flatMap((step) =>
  step.staging === "local" ? [] : [step.id],
);

export function stepById(id: StepId): ListedStep {
  const step = STEPS.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`the step list has no ${id}`);
  return step;
}

/**
 * The stored steps whose reports a step needs, itself first when it is one, and through what it reads, theirs too: a
 * deploy's walk marks the step `not_run` while any of them has no seed (reading 11).
 */
export function seedsFor(id: StepId): StoredStepId[] {
  const needed: StoredStepId[] = [];
  const visit = (at: StepId) => {
    const step = stepById(at);
    if (step.staging === "stored" && !needed.includes(step.id)) needed.push(step.id);
    for (const read of "reads" in step ? step.reads : []) visit(read);
  };
  visit(id);
  return needed;
}

/** Why a walk's map can't run its list: the ids it lacks and those the list doesn't have; null when the two agree. */
export function mapProblem(map: object, ids: readonly string[]): string | null {
  const has = Object.keys(map);
  const lacks = ids.filter((id) => !has.includes(id));
  const extra = has.filter((id) => !ids.includes(id));
  const problems = [
    ...(lacks.length > 0 ? [`the walk has no ${lacks.join(", ")}`] : []),
    ...(extra.length > 0 ? [`the list has no ${extra.join(", ")}`] : []),
  ];
  return problems.length > 0 ? `the walk and the step list differ: ${problems.join("; ")}` : null;
}

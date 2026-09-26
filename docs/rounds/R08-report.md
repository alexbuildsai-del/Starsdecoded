# R08 report — pair reliability and prose: checks by what matters, failures that say why, the lab and Release in the admin panel

Built 2026-09-25 on `round/R08` from `docs/rounds/R08-plan.md` (`pair-reliability-and-prose.md`, ADR-81 to 88). Twenty cards, one commit each. Scopes 1 to 7
are USER-FACING (a brain change, R-5.5): a report that failed on a style nit yesterday ships today with its claims snapped or dropped.

## Mailbox rows open more than two rounds
MB-5, 6, 8, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30 at 7 · MB-31 (blocking, the legal entity), 33, 35 at 6 · MB-43, 47, 49, 50 at 4 · MB-55, 57, 58, 59 at 3.
None blocked a card. **MB-75** (`GITHUB_RELEASE_TOKEN` on Railway staging) is the standing todo before the first production release.

## Shipped
- **R08-01** `generation_failures`, `lab_releases`, `reports.failure_code`; migration 3h ran three times on scratch — INTERNAL.
- **R08-02** the engine: `checks.ts` (rows 1 to 38 by rule id and class), counts cut before the parse, a `block` alone rejects, a `repair` buys one claims-only
  call and never a rewrite, every retry carries every error so far and the last reply, a natal section that loses three attempts gets one round alone while the
  others are kept, a second loss aborts the rest through one controller and throws a coded `ReportFailure`; every attempt logs — USER-FACING (brain).
- **R08-03** natal claims snap (0.85 token overlap) or drop, refs cut to 3, claims to 8, orbs and null houses take the chart's value, sect is overwritten, houses
  sort and dedupe; only a missing house and a body outside its house block — USER-FACING (brain).
- **R08-04** Zoë, José and Élodie match; "so you pause first" has a verb in both `hasVerb`s; card lines buffer to 15 words; only a capitalised body, an invented
  person, a percentage or mark, trine or sextile, "orb" or a numeral house on a blind pair blocks; band words warn with the six false hits gone; the brief prints
  the child's age on the day and the now-and-later rule, past tense only over 18 — USER-FACING (brain).
- **R08-05** rules 7 and 8 and `PAIR_WRITER`: sentences average 15 words or fewer, none over 25; "simpler sentences over complicated vocabulary, always" — USER-FACING (brain).
- **R08-06** `failureLog.ts`: one row per check and a `pass` row per clean write, quoted spans redacted, `failureCounts` flags at 3 of a section's last 20 writes — INTERNAL.
- **R08-07** `lab-spot.yml` deleted; `report-lab.yml` keeps natal, pass and pair with no secret and no environment; `promote.yml` reads a release's public verdict
  and fast-forwards with the built-in token (MB-79); `report-lab --dry` renders every natal and pair prompt in process, no network (`labDry.ts`) — INTERNAL.
- **R08-08** the Lab page: seven tabs, every route typed, the failure code and **Import r05 and r06** on Runs — INTERNAL.
- **R08-09** pair claims reconciled in code; a cross ref outside the allocation drops; link cards 32 to 84 words with the buffer logged, "Behavior check" in any
  case normalised, extra, duplicate and unmatched cards dropped, flows or rubs set from the aspect; the foundation's numbers, owners and scenes fixed, not retried — USER-FACING (brain).
- **R08-10** the pair report keeps its written chapters when one fails; the round alone; chapter 07 waits; a final failure aborts and throws coded — USER-FACING (brain).
- **R08-11** a failed report stores its code, refunds its credit (idempotent) and answers `failureReason`; `errorMessage` is always null in a response; `FailureReason` in the contract, codegen clean — USER-FACING.
- **R08-12** lab server: Clerk alone (a bearer opens nothing); `POST /spot/estimate` and `/spot` (409 over budget); `GET /dry?pair=` with zero usage; `POST /runs/import` from the public branches (MB-72); `GET /failures`, counts and no text — INTERNAL.
- **R08-13** release server: preflight from the public GitHub API, the lab only when the brain changed (five charts, one pair when the pair brain changed), the gate, the QA agent,
  the fast-forward with `GITHUB_RELEASE_TOKEN`; without it `passed` and MB-75 named; state in `lab_releases`; public `/api/release/:id/verdict` — INTERNAL.
- **R08-14** the QA agent: five personas GET-only in headless Chromium (`playwright-core`, `nixpacks.toml`), the catalogue's QA model reads the screenshots and one natal and
  one pair run; any sev-1 fails; no browser is `unconfigured`; one `qa` row carries the cost; `MODELS.qa`, `QA_AGENT_MODEL` — INTERNAL.
- **R08-15** the prose study: every variant measured, picked minus passed per card, overall and per writer, proposals at 8 of 12 cards; notes priced first on `MODELS.studyNotes` — INTERNAL.
- **R08-16, 17, 18** Failures, Spot and dry, Release and Prose study views — INTERNAL.
- **R08-19** the opening screen, the dashboard rows and the picker read `failureReason.line`; no `errorMessage` read remains in `web/src` — USER-FACING.
- **R08-20** the report-lab, round and qa skills, the orchestrator and qa agents, the runbook, `.env.example` and CLAUDE.md say the panel; `grep LAB_TOKEN .github` is empty — INTERNAL.

## Deviations
- The Agent tool was unavailable again (plan risk 8): the orchestrator built all twenty cards itself in wave order. Token spend heavy.
- Beyond a buffer the limit blocks (card lines over 15 words, cards outside 32 to 84): the buffer is the tolerance, the prompt keeps its target.
- The claims-only repair that fails again is a block in its fallback (annex row 9), so the prose retry still runs; a whole failed call is 3 attempts plus up to 3 alone.
- The release lab's pair is `curie-hepburn`, two matrix charts under partners, so no extra natal report is spent; the QA agent reads it.
- `resolveVariants` is exported from `adminLabSessions.ts` for the study; the walks are GET-only at the browser's network layer (MB-78); R08-08 landed with the wave B views.

## Gate
Green: `pnpm install --frozen-lockfile` · typecheck (scripts, api, web) · `build:web` · `build:api` · tests (api 236, db 9, scripts 6, web 104) · `db:bootstrap` twice on a
fresh Postgres 16 (exit 0 both; step 6 needs `OPENAI_API_KEY` set, as Railway has it; the migration alone a third time). **Dry lab, in process, no network**, against the
r06 runs fetched from the public branch: 69 prompts (60 natal on five charts, 9 pair on `curie-winfrey` under parent_child), usage recorded 0, every schema strict; input
tokens foundation 6,899 to 6,965 and sections 8,710 to 9,095 against R07's dry 6,941 and 8,849 to 9,023 (within 1%, the style contract's new sentence); the parent-child
brief prints "72 years old on the day this is written" and the now-and-later rule. Rehearsals as unit tests: the release with a stub lab and a stub verdict (seeded fault
stops at the gate, sev-1 stops at QA, a clean run calls the mocked fast-forward, no token stops `passed`), the pair stubbed to fail three times then pass, always-fail
with the abort, a network error as `provider_unreachable`. **Nothing generated; no paid call.**

## Pending (free on staging after the merge; paid on the Owner's go)
Import r05 and r06 (MB-72); the Failures tab; the prose study on `session-2026-09-24`. Paid: a Spot of the five lens chapters on one pair; the first Release from the
Release view, which stops at `passed` until MB-75 and then takes `promote.yml` with its id.

## Mailbox
Decided: MB-68 (credits added). Done: MB-69 (superseded by ADR-86), MB-72 (import from the public branches), MB-76 (the QA agent uses OpenAI). Built at their defaults,
open: MB-77 (Chromium in the API image), MB-78, MB-79. Raised: MB-80 (bootstrap step 6 imports the OpenAI client and needs a key to reset prompt overrides).

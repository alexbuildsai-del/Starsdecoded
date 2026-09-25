# R08 plan — pair reliability and prose: checks by what matters, failures that say why, the lab and Release in the admin panel

Planned 2026-09-25 on `claude/report-lab-model-matrix-rz5vet` (PR #63, the lock, unmerged) for the locked spec
`pair-reliability-and-prose` and its annex `docs/annex/pair-reliability-checks.md` (every check classified, rows 1 to 38).
Decisions: ADR-81 to 88, locked. MASTERFILE 0.11 already carries R-4.3, R-4.4, R-5.1 and §11.2 to §11.4 as amended.
No QA report exists. Existing code reused as is: `api/src/lib/proseMetrics.ts` (on main, tested), `labRules.gateProblems`,
`labReplay.checkBudget`, `writeSection`, `applyAmendment`'s drop logic and `drawnRef`.
**Scopes 1 to 7 are USER-FACING** (a brain change: someone who bought yesterday gets different words today, R-5.5).
Scopes 8 to 12 are INTERNAL. `PROMPT_VERSION` (v6) and `PAIR_PROMPT_VERSION` (p2) do not move: the stored shape is unchanged,
and a p-bump would hide every stored p2 report from the list (`reports.ts:251`).

## Mailbox rows above 2 rounds open after this plan's increment
At **7**: MB-5, 6, 8, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30. At **6**: MB-31 (blocking, the legal entity), 33, 35.
At **4**: MB-43, 47, 49, 50. At **3**: MB-55, 57, 58, 59. None blocks a card. **MB-68** (blocking, OpenAI credits, at 2) blocks
the paid acceptance only. MB-69 is superseded by ADR-86. Raised today: **MB-77 to 79** (MB-76 closed: the QA agent uses OpenAI) (below).

## Goals
1. **A report no longer dies of a style nit** (scopes 1, 2, 5, 6; ADR-81, 82, 84; the 2026-09-24 pair campaign failed 7 of 7).
   Checks are reclassified per the annex, claims snap or drop, retries carry every error and the last reply, and only
   the failed section gets one more round alone. The two impossible checks (Zoë, "so you pause first") are fixed first.
2. **Every failure says why and gives the credit back** (scope 7, ADR-84), and every rejected or corrected attempt is
   logged by rule id with a *Failures* tab that flags a rule firing on more than 1 in 10 of a section's last 20 writes
   (scope 8, ADR-85).
3. **The prompts state what the checks enforce** (scopes 3, 4; ADR-83, 87): link cards 45 to 60 words ending on
   "Behaviour check:", card lines 12 words, allocated links only, sentences average 15 words and none over 25, the
   child's age on the day and the now-and-later rule.
4. **The lab and the release live in the admin panel; GitHub holds no secret** (scopes 9, 10; ADR-86): Spot and Dry on
   the Lab page, a Release view that runs the release lab, the gate and the QA agent on Railway staging, then
   fast-forwards `production` with a Railway-held token. `lab-spot.yml` and every `LAB_TOKEN` campaign go.
5. **The prose study** (scope 11, ADR-88): the reveal's picks measured in code against the variants passed over,
   proposals at 8 of 12 cards, text never leaving the staging database.

## Preconditions
1. PR #63 (the lock, docs only) merges into `main` first; `round/R08` branches from that merge.
2. Builders read MASTERFILE §0, their card's sections, the spec and the annex rows their card names, and the artifact
   https://claude.ai/artifact/6HLtPdSaR3wiVLXx16oWHU (version 2) for the Failures tab, Release view and Prose study.
3. **Single owners.** Wave A: `packages/db/**` and `scripts/bootstrap-db.sh` → R08-01. `aiInterpretation.ts`,
   `prompts/types.ts`, new `prompts/checks.ts`, new `lib/failureReasons.ts` → R08-02. `prompts/pair/shapes.ts` (with
   `PairSectionSpec`) and `pair-prompts.test.ts` → R08-04, then R08-09 in wave B. `prompts/pair/index.ts` → R08-05 (no
   other card renames or adds an export there; import by path instead). `labRules.ts` → R08-04. `AdminLabPage.tsx` and
   `labApi.ts` → R08-08. `.github/workflows/*` and `scripts/src/report-lab.ts` → R08-07. Wave B: `routes/index.ts`
   → R08-13. `api/package.json`, `pnpm-lock.yaml`, new `nixpacks.toml` → R08-14. `openapi.yaml` and generated files → R08-11.
4. Inside a wave a card may land before the card it imports from; the orchestrator accepts a red intermediate until the
   wave ends (R05 to R07 precedent). A builder who needs a pinned shape changed stops and raises it (R-0.1).
5. **No card spends.** Tests stub the model (`testModel.ts`, `testPair.ts`). Paid checks are listed under Acceptance.

## Pinned shapes
- **Check** (`api/src/prompts/checks.ts`): `type CheckClass = "block" | "fix" | "warn" | "buffer" | "repair"`;
  `interface Check { rule: string; cls: CheckClass; message: string }`. Rule ids are `chk-NN` from the annex row
  (`chk-04`), a letter for a split row (`chk-21a` trine/sextile block, `chk-21b` square etc. warn), and `chk-00-json`,
  `chk-00-schema`, `chk-00-truncated`, `chk-00-refused` for the engine. `RULES: Record<string, { row: number; cls }>` holds
  all of them, written by R08-02 from the annex; helpers `block()`, `fixed()`, `warned()`, `buffered()`, `repair()`.
- **Specs** (`SectionSpec` in `types.ts`, `PairSectionSpec` in `shapes.ts`): `normalise?(raw: unknown, brief) =>
  { raw: unknown; checks: Check[] }` runs before the zod parse (cuts to maxima, drops extras, spells small numbers);
  `validate?(out, brief) => { output: T; checks: Check[] }` runs after (snaps, drops, fills, blocks). A `block` rejects;
  a `repair` (fewer than 3 valid claims) calls the claims-only repair; `fix`, `warn`, `buffer` are logged only.
- **callStructured** gains `normalise`, the new `validate`, `signal?: AbortSignal` (passed to the SDK),
  `onChecks?(checks, { attempt, final })`, and `carry?: { errors: string[]; lastReply: string }` for the round alone.
  A retry's user turn ends: `EVERY ERROR SO FAR:` (numbered, all attempts), `YOUR LAST REPLY:` (the JSON), then
  "Fix these and keep the rest." `SectionError` gains `errors: string[]` and `lastReply?: string`.
- **Failure codes** (`api/src/lib/failureReasons.ts`): `FailureCode = "provider_unreachable" | "provider_out_of_credit" |
  "quality" | "internal"`; `failureCodeOf(err)` (network, 5xx, timeout → unreachable; `OutOfCreditError` → out of credit;
  `SectionError` → quality; else internal); `FAILURE_LINES`, the four customer lines of spec scope 7 verbatim, in one place.
- **Report contract**: `reports.failure_code` text null; report and status responses gain
  `failureReason: { code: FailureCode; line: string } | null`; `errorMessage` stays in the database and is always `null`
  in customer responses (it carries internal text today, `OpeningOverlay.tsx:93`); the field stays so no build goes red.
- **`generation_failures`**: `id`, `kind` (`natal | pair | lab`), `section`, `rule_id`, `class` (the five plus `pass`),
  `message` (redacted: quoted text removed, never report text), `model`, `attempt`, `final`, `write_id` uuid (one per
  section call), `report_id` null, `created_at`; indexes `(section, created_at)`, `(rule_id)`. A clean section write logs
  one `pass` row, so "a section's last 20 writes" is the last 20 `write_id`s. **`lab_releases`**: `id`, `sha`,
  `production_sha`, `brain_changed`, `pair_changed`, `status` (`running | stopped | passed | failed | forwarded`),
  `steps` jsonb, `qa` jsonb, `error`, `created_at`, `updated_at`. `lab_runs.source` gains `release`, `study`, `qa`.
- **failureLog** (`api/src/lib/failureLog.ts`): `recordChecks({ kind, section, model, writeId, reportId?, attempt, final,
  checks })` never throws; `redact(message)`; pure `failureCounts(rows)` → `{ rule, section, cls, count, lastAt, rate,
  flagged }[]` with `flagged` = the rule fired in more than 2 of the section's last 20 writes.
- **Routes** (Clerk admin only; the `LAB_TOKEN` bearer is removed; mutations 405 under `PROMPTS_READ_ONLY`):
  `adminLab.ts` (R08-12): `GET /api/admin/lab/failures`, `POST /lab/spot/estimate` and `POST /lab/spot`
  `{ sections, charts, base, model }` → `{ runKeys }`, `GET /lab/dry?base=&pair=<fixture>`, `POST /lab/runs/import
  { labels: ["r05","r06"] }` (public raw files from the `report-lab/<label>` branches, MB-72), `failureCode` on runs.
  `adminLabSessions.ts` (R08-15): `GET /lab/sessions/:id/prose-study` (409 until revealed), `POST
  /lab/sessions/:id/prose-study/notes/estimate` and `/notes` (gpt-6-luna, budget-checked, a `study` row in `lab_runs`).
  `adminRelease.ts` (R08-13): `GET /api/admin/release/preflight`, `POST /api/admin/release`, `GET /api/admin/release`,
  `GET /api/admin/release/:id`, and public `GET /api/release/:id/verdict` → `{ sha, status }` only (MB-79).
- **QA agent** (`api/src/lib/qaAgent/index.ts`): `runQaAgent({ webOrigin, natalRunKey, pairRunKey, signal }):
  Promise<QaVerdict>`; `QaVerdict = { status: "pass" | "fail" | "unconfigured"; findings: Array<{ sev: 1 | 2 | 3; where:
  string; title: string; detail: string }>; costUsd: number; reason?: string }`. Any sev-1 is `fail`.
- **Brain paths** unchanged: `api/src/prompts/`, `models.ts`, `aiInterpretation.ts`, `traditional.ts`,
  `chartCalculation.ts`; the pair brain is `api/src/prompts/pair/`, `pairInterpretation.ts`, `pairBrief.ts`.

---

## Wave A — the core, the checks, the log, the plumbing

Dispatch R08-01 to R08-08 in one message.

### R08-01 — Two tables and a column (INTERNAL) · Sonnet
Objective: the failure log, the release record and the report's reason code exist and migrate twice.
Files: new `packages/db/src/schema/generationFailures.ts`, `labReleases.ts`; `schema/index.ts`, `schema/reports.ts`
(`failure_code`), `schema/labRuns.ts` (source comment); new `packages/db/scripts/migrate-add-failures-and-releases.ts`;
`scripts/bootstrap-db.sh` (step 3h).
Refs: MASTERFILE §3, R-7.3; spec scopes 7, 8, 10; pinned `generation_failures`, `lab_releases`.
Done when: the migration runs three times on a scratch Postgres with one result; `db:bootstrap` twice on a fresh
database is green; typecheck green.

### R08-02 — The engine: checks, retries that carry everything, the round alone, abort, failure codes (USER-FACING, brain) · Opus
Objective: a check blocks only per its class; a natal section that exhausts its attempts gets one round alone while
the others are kept; a final failure aborts running sections and throws a coded error.
Files: `api/src/lib/aiInterpretation.ts` (+ `aiInterpretation.test.ts`, `writeSection.test.ts`), `api/src/prompts/types.ts`,
new `api/src/prompts/checks.ts` (+ test), new `api/src/lib/failureReasons.ts` (+ test).
Refs: spec scopes 2, 5, 6, 7; annex rows 9, 10 (rising claims minimum 1), 17 (amendments), the whole RULES table; ADR-81, 82, 84.
Done when:
- Pinned shapes land; the claims-only repair fires on any `repair` check, not only quote problems (EV:72 widened).
- `generateInterpretation` gives a failed section one more round alone with `carry`; the foundation is excluded; a second
  failure aborts the rest through one `AbortController` and throws; every attempt calls `recordChecks` (R08-06).
- Stub tests: fail three times then pass → report completes, other sections called once; always fail → `quality`, others
  aborted; network error → `provider_unreachable`; a retry prompt holds every earlier error and the previous reply.
- The dry lab (five charts) renders unchanged prompts; `models.ts` untouched.

### R08-03 — Natal checks reclassified (USER-FACING, brain) · Opus
Objective: natal claims snap or drop, counts are cut in code, and only rows 14 (missing house) and 15 block.
Files: `api/src/prompts/evidence.ts` (+ `evidence.test.ts`), `api/src/prompts/sections/*.ts`, `api/src/prompts/prompts.test.ts`.
Refs: annex rows 1 to 8, 12 to 16 (natal side); spec scopes 1, 2; ADR-81, 82; MASTERFILE R-4.3.
Done when:
- Refs cut to 3, claims to 8, short quotes dropped; a near-verbatim quote (≥ 0.85 token overlap, case and punctuation
  ignored) snaps to its sentence; a wrong ref drops and then an empty claim; orbs snap; a drawn chart's null house fills
  via `drawnRef`; sect is overwritten from the brief; houses sorted and deduped.
- Under 3 valid claims returns a `repair` check. One unit test per annex row touched, named by rule id.
- No prompt text changes. The dry lab on five charts shows no schema change.

### R08-04 — Pair shapes, bands and the two bugs (USER-FACING, brain) · Opus
Objective: the card, scene, why, score, jargon, house and band checks follow the annex; the child's age is in the brief.
Files: `api/src/prompts/pair/shapes.ts` (with `PairSectionSpec`), `pair/sections/parent-child/doctrine.ts` and `index.ts`,
`api/src/lib/pairBrief.ts` (+ test), `api/src/lib/labRules.ts` (`hasVerb`, + test), `pair-prompts.test.ts`.
Refs: annex rows 16 (pair counts), 18 to 30; spec scopes 1, 3, 4 (card lines 12); ADR-81, 83; bugs rows 27, 28 first.
Done when:
- Zoë, José and Élodie match (Unicode lookarounds); "so you pause first" passes in both `hasVerb`s; a 15-word card line
  passes (BUFFER); only a capitalised body, an invented person, a digit-score, trine or sextile, "orb", or a numeral house
  on a blind pair blocks.
- The brief prints the child's age on the day; the prompt carries the now-and-later rule and, over 18, childhood only in the
  past tense; band words are WARN with the false hits removed (grounded, a phone call, revise the plan, make allowances,
  rent, tablet); a grown-band "curfew" is logged, not rejected.
- The dry lab renders the parent-child brief with the age and the rule (acceptance 2).

### R08-05 — The style contract gets numbers (USER-FACING, brain, prompt only) · Sonnet
Objective: rules 7 and 8 say "sentences average 15 words or fewer, none over 25"; `PAIR_WRITER` says the same.
Files: `api/src/prompts/system.ts`, `api/src/prompts/pair/index.ts`, new `api/src/prompts/style.test.ts`.
Refs: spec scope 4; ADR-87; MASTERFILE R-5.1, R-5.4 (source of truth; `prompt_templates` overrides of these keys noted).
Done when: both texts carry the numbers in plain words; a test in a new `api/src/prompts/style.test.ts` pins them; the dry
lab shows the new text in every natal and pair system prompt, input tokens within 1% of r06.

### R08-06 — The failure log (INTERNAL) · Sonnet
Objective: every BLOCK, FIX, WARN, BUFFER and REPAIR, and one `pass` per clean write, lands as a row.
Files: new `api/src/lib/failureLog.ts` (+ test).
Refs: spec scope 8; ADR-85; pinned `failureLog`, `generation_failures`; R-3.5 (no report text).
Done when: `recordChecks` swallows database errors (logged); `redact` strips quoted spans and anything over 160
characters; `failureCounts` flags a rule at 3 of a section's last 20 writes and not at 2 (pure tests, seeded rows).

### R08-07 — GitHub builds, tests and smokes only (INTERNAL) · Sonnet — provisional MB-79
Objective: no workflow references `LAB_TOKEN`; the lab script keeps its free, offline levels.
Files: delete `.github/workflows/lab-spot.yml`; `report-lab.yml` (keep natal, pass, pair; drop dry, spot, release, stub,
publish and `environment: staging`); `promote.yml`; `scripts/src/report-lab.ts` (+ test).
Refs: spec scope 9, acceptance 7; ADR-86; MB-79; CLAUDE.md "No secret on GitHub, ever".
Done when: `grep -r LAB_TOKEN .github` is empty; `promote.yml` takes `release_id`, refuses unless the public verdict says
`passed` for main's head, then staging smoke, fast-forward (built-in `GITHUB_TOKEN`), production smoke; the script drops
`--publish/--spot/--release/--gate/--stub`, and `--dry --base <label> [--pair <fixture>]` renders in-process with no network.

### R08-08 — The Lab page shell and client (INTERNAL, UI) · Sonnet
Objective: the page gains its tabs and the client every new route, and the reason code shows on *Runs*.
Files: `web/src/pages/AdminLabPage.tsx`, `web/src/lib/labApi.ts`, `web/src/components/lab/RunsView.tsx`.
Refs: spec scopes 7 (code on the Lab page), 8, 9, 10; pinned routes; MASTERFILE §9 (dense admin tempo); MB-72.
Done when: tabs Runs, Spot and dry, Spawn a session, Reading room, Reveal, Failures, Release mount R08-16/17/18's
exports (`SpotView`, `FailuresView`, `ReleaseView`, `ProseStudyView` inside Reveal); `labApi.ts` types every pinned
route; *Runs* shows `failureCode` and an **Import r05 and r06** button; no report text in the network tab.

---

## Wave B — the pair engine, the routes, the release, the study, the views

Dispatch R08-09 to R08-18 in one message.

### R08-09 — Pair claims, link cards and the foundation (USER-FACING, brain) · Opus
Objective: pair claims snap or drop; link cards are buffered, normalised and prompted at 45 to 60 words.
Files: `api/src/prompts/pair/evidence.ts`, `pair/sections/links.ts`, `pair/foundation.ts`, `pair-prompts.test.ts`
(handed over from R08-04), new `pair/claims-links.test.ts`.
Refs: annex rows 1 to 9 (pair side), 11, 31 to 38; spec scopes 1, 2, 4; ADR-81, 82, 83.
Done when:
- A cross ref outside the allocation drops; a 78-word card passes; "Behavior check:", any case, and a two-sentence ending
  pass; an extra, duplicate or unmatched card drops; flows/rubs is set from the aspect; a card naming another card's body blocks.
- The links prompt states 45 to 60 words, the "Behaviour check:" ending and allocated links only; the foundation's rating
  words and strength lines WARN; its numbers, duplicates and scene picks are fixed in code.
- The dry lab on one pair renders the new text; one unit test per annex row touched.

### R08-10 — Pair orchestration: the round alone, abort, codes (USER-FACING, brain) · Opus
Objective: the pair report keeps its written chapters when one fails, and fails cleanly when the round alone fails.
Files: `api/src/lib/pairInterpretation.ts` (+ `pairInterpretation.test.ts`), `api/src/lib/testPair.ts`.
Refs: spec scope 6, acceptance 3 and 4; ADR-84; pinned callStructured; `pairInterpretation.ts:247` today.
Done when: stage 2 no longer rejects on one failure; the failed chapter gets one round alone with `carry`; chapter 07 waits
for it; a final failure aborts through one controller and throws coded; every attempt logs with `kind: "pair"`; stubbed
tests cover three-fails-then-pass (others called once, rows written) and always-fail (`quality`, others aborted).

### R08-11 — Failure codes, the refund and the contract (USER-FACING) · Opus
Objective: a failed natal or pair report stores its code, refunds its credit and answers with the plain line.
Files: `api/src/routes/reports.ts` (+ test), `api/src/routes/compatibility.ts`, `api/src/lib/credits.ts` (`refundCredit`),
`packages/api-spec/openapi.yaml`, then codegen (`api-client-react`, `api-zod`).
Refs: spec scope 7, acceptance 4; ADR-84; MASTERFILE R-3.3, R-6.1, R-7.2; pinned report contract.
Done when: generate, regenerate and the pair path set `status failed` and `failure_code` from `failureCodeOf`; the credit
used for the report returns to `available` (idempotent: a second call is a no-op); responses carry `failureReason` and a null
`errorMessage`; codegen is clean; a test with a stubbed network error yields `provider_unreachable`.

### R08-12 — Lab server: spot, dry for a pair, import, failures, the guard (INTERNAL) · Opus — provisional MB-72
Objective: every lab level runs from the panel with Clerk alone.
Files: `api/src/routes/adminLab.ts`, `api/src/lib/labGuard.ts` (+ test), `api/src/lib/labReplay.ts` (+ test).
Refs: spec scope 9, acceptance 6, 7; ADR-86, 77; pinned routes; `failureCounts`.
Done when: the bearer path is gone (test: a `Bearer` header is refused); spot estimates before it runs, replays the
picked sections on the picked charts through `startReplay`, and refuses over budget (409 `lab_budget`); `/dry?pair=`
renders every pair prompt through `previewPairSectionPrompt` with zero usage; import reads the public branch files with
no token; `/failures` returns counts and flags from seeded rows and no text.

### R08-13 — Release server: preflight, lab, gate, QA, fast-forward (INTERNAL) · Opus — provisional MB-75, MB-79
Objective: one admin action releases staging to production with every gate on Railway.
Files: new `api/src/lib/release.ts` (+ test), `api/src/lib/releaseLab.ts`, `api/src/lib/github.ts` (+ test), new
`api/src/routes/adminRelease.ts`; `api/src/routes/index.ts`.
Refs: spec scope 10, acceptance 8; ADR-76, 77, 86; MASTERFILE R-4.4; `gateProblems`, `MATRIX_CHARTS`; MB-75, 78, 79.
Done when: preflight reads production's and main's heads and the brain and pair-brain diffs from the public GitHub API;
the lab runs only when the brain changed (five charts, plus one pair when the pair brain changed), budget-checked, rows
`source: release`; then the gate; then `runQaAgent`; a seeded fault or a sev-1 stops it; a clean run calls the
fast-forward (`PATCH refs/heads/production`, no force) with `GITHUB_RELEASE_TOKEN`, mocked in tests; without the token
it stops `passed` and names MB-75; staging only (`APP_ENV`); state survives a restart in `lab_releases`.

### R08-14 — The QA agent on Railway staging (INTERNAL) · Opus — provisional MB-77, MB-78
Objective: the five personas walk staging in headless Chromium and two stored reports are read against the style contract.
Files: new `api/src/lib/qaAgent/` (`index.ts`, `personas.ts`, `browser.ts`, `reader.ts`, + test); `api/package.json`
(`playwright-core`), `pnpm-lock.yaml`, new `nixpacks.toml` (chromium).
Refs: spec scope 10; `.claude/agents/qa.md` personas; MASTERFILE §1, §11.3, R-5.1; ADR-86; MB-77, 78.
Done when: no walk submits a birth form or creates a report; the reads use the release lab's runs by key; the model is
a `models.ts` entry (`QA_AGENT_MODEL`, default gpt-5.2, vision), through the existing OpenAI client; no browser → `unconfigured`, never a crash;
cost is recorded as a `qa` row in `lab_runs`; a stubbed OpenAI client test turns a sev-1 into `fail`.

### R08-15 — The prose study server (INTERNAL) · Opus — provisional MB-70 (gpt-6-luna price)
Objective: after a reveal, every variant is measured in code and picked texts are compared with those passed over.
Files: new `api/src/lib/proseStudy.ts` (+ test), `api/src/routes/adminLabSessions.ts`.
Refs: spec scope 11, acceptance 9; ADR-88; `proseMetrics.ts` (`proseText`, `measureProse`, `METRIC_KEYS`); R-3.5.
Done when: the study returns per card, overall and per writer the picked-minus-passed deltas for every metric, the admin's
own-report columns included; a measure agreeing on at least 8 of 12 cards becomes a proposal with its numbers; no model call
(test with the client stubbed to throw); the optional notes step estimates first, checks the budget, writes three lines a
card, and records a `study` row; no text in any response but the notes.

### R08-16 — Failures, Spot and Dry views (INTERNAL, UI) · Sonnet
Objective: the Owner sees which rules fire and runs a spot or a dry from the panel.
Files: new `web/src/components/lab/FailuresView.tsx`, `SpotView.tsx`, `web/src/lib/failureCounts.ts` (+ test).
Refs: spec scopes 8, 9, acceptance 6; artifact (the Failures tab, lab levels); MASTERFILE §9.
Done when: Failures shows counts per rule and section with the red flag and no text; Spot picks sections, charts and a
writer, shows the estimate, then runs and polls; Dry is a button that shows tokens and schema per prompt, natal and pair.

### R08-17 — The Release view (INTERNAL, UI) · Sonnet
Objective: preflight, then one button, then each step's state and verdict.
Files: new `web/src/components/lab/ReleaseView.tsx`.
Refs: spec scope 10, acceptance 8; artifact (the Release view); MB-75, 76, 79.
Done when: preflight shows the two heads, the brain diff, the estimate and which keys are present (never values); the run
shows lab, gate, QA findings by severity and the fast-forward; a stop names its reason (fault, sev-1, MB-75).

### R08-18 — The Prose study view (INTERNAL, UI) · Sonnet
Objective: a *Prose study* button in Reveal fills the tables and lists the proposals.
Files: new `web/src/components/lab/ProseStudyView.tsx`; `web/src/components/lab/RevealView.tsx`.
Refs: spec scope 11, acceptance 9; artifact (the 2026-09-24 picks, the Prose study).
Done when: disabled until the reveal; per-card, overall and per-writer tables; proposals with numbers and an agreement count;
the notes step shows its estimate before it runs.

---

## Wave C — the customer line and the rules

Dispatch R08-19 and R08-20 in one message.

### R08-19 — The customer reads why (USER-FACING, UI) · Sonnet
Objective: a failed report shows its plain line; the raw internal message never shows.
Files: `web/src/components/report/OpeningOverlay.tsx`, `web/src/hooks/useLiveReport.ts`, `web/src/pages/DashboardPage.tsx`,
`ReportPage.tsx`, `CompatibilityReportPage.tsx`, `web/src/components/CompatibilityPicker.tsx`.
Refs: spec scope 7, acceptance 4; ADR-84; MASTERFILE §9 (voice), R-7.1.
Done when: the overlay, the dashboard row and the picker read `failureReason.line`, falling back to the `internal` line;
the retry button stays; no `errorMessage` read remains in `web/src`.

### R08-20 — The rules say the panel (INTERNAL, docs) · Sonnet
Objective: every instruction a session reads names the panel, not GitHub, for the lab and the release.
Files: `.claude/skills/report-lab/SKILL.md`, `round/SKILL.md`, `qa/SKILL.md`; `.claude/agents/orchestrator.md`, `qa.md`;
`docs/annex/staging-runbook.md`; `.env.example`; CLAUDE.md commands and brain paragraph (not Current focus).
Refs: spec scope 12; ADR-86; MASTERFILE R-4.4, §11.2 to §11.4 (already amended).
Done when: no `LAB_TOKEN` or `lab-spot` outside history; `.env.example` lists `GITHUB_RELEASE_TOKEN` and
`QA_AGENT_MODEL` without values, staging only; every file within budget.

---

## Acceptance
**Free, in the round** (the gate): typecheck, both builds, unit tests (one per reclassified annex row; the stubbed
retry, round-alone, abort and code tests), `db:bootstrap` twice on a fresh database, the dry lab on the five matrix charts
plus one pair (`report-lab --dry`, in-process, zero usage: prompts carry the new numbers, the age and the rule),
`grep LAB_TOKEN .github` empty, the Release rehearsal with a stub lab and a stub QA verdict (seeded fault and sev-1 stop,
clean run calls the mocked fast-forward).
**On staging after the merge, free:** Import r05 and r06 (MB-72); the prose study on `session-2026-09-24` fills its tables
with no model call, 12 cards; the Failures tab reads.
**Paid, after MB-68 and on the Owner's go** (nothing spends automatically): a Spot of the five lens chapters on one pair;
the first Release (about $1.40 plus one pair and the QA reading), which is also the first Promote.

## Risks
1. **Report content changes** (USER-FACING, R-5.5): R08-02 to 05, 09, 10. A section that failed before now ships, with
   snapped or dropped claims, buffered lengths and logged nits; the style contract tightens sentence length. The dry lab
   proves the prompts, not the prose: the words are only seen at the paid Spot and the first Release, and the gate plus
   the QA agent stand between them and production.
2. **Schema**: `generation_failures`, `lab_releases`, `reports.failure_code`, all additive; one idempotent script (R-7.3).
3. **Contract**: `failureReason` joins the report and status responses and `errorMessage` goes null there (codegen, R-7.2).
4. **New dependencies**: `playwright-core` and Chromium in the Railway image (MB-77); the image grows
   on production too, where the browser is never launched.
5. **The QA agent uses OpenAI** (Owner, 2026-09-25: one vendor, one key, already on Railway). Its model is in
   `CATALOGUE`, and its cost counts in the lab budget through a `qa` row. MB-76 is closed.
6. **Refunds before payments**: `refundCredit` flips a soft-pass ledger (MB-6); harmless now, and the path the payments
   round inherits (R-6.2 will make the provider the ledger).
7. **Promote changes shape** while MB-75 is open: the fallback fast-forwards only a verdict the Release view passed
   (MB-79). A public verdict route exposes a sha and a status, nothing else.
8. **Wave B is ten cards** and the Agent tool was unavailable in R06 and R07; the waves still hold in sequence.

## Questions raised (Mailbox, before the round starts)
For the Owner, highest stakes first (R-12.1):
1. **MB-68, carried and blocking: OpenAI credits.** *Recommendation:* about $10 covers the pair Spot, the first Release
   and the prose-study notes. *If silent:* the round merges on free acceptance; nothing generates.
2. **MB-75, carried: place `GITHUB_RELEASE_TOKEN`** (fine-grained, this repo, contents write) in Railway staging.
   *If silent:* the Release view stops at `passed`, and Claude dispatches the Promote fallback (MB-79).

For the Mailbox only, at their defaults: MB-77 (Chromium in the API image), MB-78 (the QA agent never creates a report and
reads the release lab's runs), MB-79 (the Promote fallback), MB-72 (default revised: import from the public branches).

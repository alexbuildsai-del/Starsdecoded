# Backlog — Claude's own work

Work Claude does without a product choice: bugs, cleanup, tests, CI, copy that follows the voice chart, a
builder's leftover, a non-blocking sentinel finding that does not show how to abuse us (R-12.3). One line each,
`B-NN · what · where · source`. Claude adds, does and deletes lines without asking; a round takes them as cards.
Code refs use `B-NN` like `MB-NN`. Choices go to Decisions (`Decided by: Claude`); the Owner's go to the Mailbox.

## Open

Roughly in order. Lines for the brain carry a dry lab run.

- B-03 · Timeline checks: house on a blind chart, Ask length, retrograde and eclipse in the dry lab; the Lab-page spot for readings · was MB-218, MB-198
- B-04 · Rough birth time: Ascendant and Midheaven contacts as rough dates with a range · ADR-295, was MB-217
- B-05 · A masked block copied back logs a `generation_failures` row · ADR-294, was MB-208
- B-06 · /compatibility: write one report for two labelled sample people on staging, commit its headline and two items · ADR-286, was MB-93
- B-07 · R10 copy: "Or skip. Nothing expires." (`PathSheet.tsx`), Joined in a neutral tone (`SendDialog`, `PeopleRows`) · ADR-288, was MB-111
- B-09 · Primary button contrast to 4.5:1, one token · was MB-221
- B-10 · Report page dead ends after a failure; plain next step on the internal failure line · was MB-205, MB-91
- B-11 · Toast and waiting buttons get accessible names; raw claim errors in plain words · was MB-204
- B-12 · Reduced motion: the closing Sun stops sitting over every chapter · was MB-203
- B-13 · Triad plate: draw the Moon's day arc above the bodies · was MB-210
- B-14 · Typed place moves from the GET query string to a POST body · was MB-211
- B-16 · Pre-1970 zone offsets: ship tzdb backzone, with a dry lab run · was MB-201
- B-17 · Uranus, Neptune and Pluto from a JPL Horizons table, as Chiron (ADR-221), with a dry lab run · was MB-216
- B-18 · Rewind on slow phones: a positions-only engine export, with a dry lab run · was MB-125
- B-19 · Bootstrap step 6: lazy-import the OpenAI client so reset-stale needs no key · was MB-80
- B-20 · Drop the `AI_INTEGRATIONS_OPENAI_*` fallback (`credentials.ts`, `release.ts`, `report-lab.ts`) · was MB-21
- B-21 · Dead code: `packages/integrations/openai_ai_integrations`, `integrations-openai-ai-react`, the conversations and messages schema · was MB-22
- B-22 · A prettier check in CI (the critical tier's DB tests run on CI's Postgres since R17-22) · was MB-20, MB-49
- B-23 · Prompt version history for admin overrides · was MB-19
- B-24 · Swap `fixtures/reports/marie-curie.reference.json` for the real r06 run · was MB-73
- B-25 · Drop `reports.workbook` (idempotent) once one Release has run on `report_workbooks` · was MB-195
- B-26 · Enforce the CSP after 7 clean days: read the Failures tab after 2026-10-10, then flip `vercel.json` · was MB-147, ADR-198
- B-27 · /sample refreshes from the next passing Release; check the old tie line is gone · was MB-182
- B-28 · Remove each `// MB-NN provisional` seam whose row is no longer open (seams for 39 rows in `api`, `web`, `packages` today; fetch each row first) · sweep 05/10
- B-29 · R15 and R16 small follow-ups (libraries, query counts, leak table, release retry; R16 leftovers) · was MB-209, MB-222
- B-31 · /round reads `/api/qa/latest` after each merge (a skill line; a running /round can't edit its own skill; /qa's half done in R18) · was MB-230, R17
- B-32 · The Stop sharing dialog names that Ask answers built on that report get hidden (ADR-182) · R17-20
- B-35 · A finished report regenerated, then failing three times, gives its credit back: check its old version isn't still readable · R17 tester
- B-36 · Comments left on the soft pass or old rules: `requireAccount.ts`, `prelaunch.ts`, `limits.ts` (anonWrites), `Orbit.tsx`, `nudges.ts`, `pair-selection.ts` (MB-6), `ClaimPage.tsx`, `pair-row.ts` (MB-137); `aiInterpretation.ts` with a dry lab run · R17
- B-52 · The share dialog's `failureLine` hides the API's 400 line ("That's your own email…") · QA-06 #7
- B-56 · /checkout's country still defaults from the IP: set it from the buyer's time zone, which needs a zone-to-country source · QA-06 #12, R18-01
- B-58 · The report status route's `provisional` bodies (`provisionalFor`, `api/src/routes/reports.ts`, `openapi.yaml`) are read only by the orrery; once R18-27 removes it, drop them, their test and the codegen output · R18 plan
- B-59 · Dial: a retrograde ring with a size-scaled stroke and a focus prop; NatalWheel's small mode with a stronger lit house · R18-08
- B-60 · `.claude/skills/round/SKILL.md` brain list misses the pair files and `chartCalculation.ts` (match `BRAIN_PATHS` in `github.ts`) · R18-13
- B-61 · Clerk ids still passed to log lines: `names.ts:30`, `adminPrompts.ts:60`, `testers.ts:158`, `credits.ts:313` (redacted, but the rule says none) · R18 close
- B-65 · Personal story step 5: the 7th house's PARTNERSHIP label runs into LIBRA at the right edge · R18-10
- B-66 · Archive `timelineReadings.edges.test.ts` tests at ~355 and ~488 check the old setup rule · R18-25
- B-67 · `prompts/brief.ts` words an element tie by key order ("air and fire" vs "fire and air" for the same chart); sort it, with a dry lab run · R18-25
- B-68 · A new birth time gives some events a new key; queue their readings at the open instead of writing them on open (with a guard for keys that never land) · R18-25
- B-69 · The QA walk's guard names `/api/timeline/*` when a failed setup read sends the page to Timeline's views; name the setup read · R18-28
- B-70 · Hard-pair weighting: a hard-pair conjunction weighs -0.3 and can drop out of the twelve (Charles-William Venus-Saturn 0.9°); with a dry lab run · R18-13
- B-71 · The done page's plan redirect sits inline in `CheckoutDonePage.tsx`; move it into `checkout-view.ts` so the critical tier pins it; `steps.ts`'s `timeline-setup` label also covers the stale refresh now · R18 tester
- B-72 · Staging deploys still answer 502 on `/api/*` for about 45 s (two deploys measured 2026-10-07, after R18-03); finish once MB-228's dashboard answer is in (a volume, Teardown overlap 0, or no health check) · R18 staging confirmation
- B-75 · The loading stories' chart labels print at 6.5 to 7.5 px and overlap · QA-07 #3
- B-78 · `/faq` "Do I pay once or every month?" no longer answers once or monthly in its first sentence · QA-07 #6
- B-79 · Get my report from the free chart lands on "Welcome back" sign-in and loses the typed birth data · QA-07 #7
- B-80 · A dead report link spins about 7 s and calls the API five times before "Report not found."; answer a 404 once · QA-07 #8
- B-81 · `/sample` chapter 9 still has "Home as destiny, love as friction" and two more fate lines; refresh /sample from the next passing Release or rewrite · QA-07 #9, QA-06 #14
- B-82 · Model passages for Compatibility, Timeline and Ask, once the Personal report's have been read at a Release; with a dry lab run · ADR-383, R19 plan
- B-83 · Two 9:16 reels from the loading story's scenes, rendered in HyperFrames and posted only after the Owner's yes, through /marketing · report-loading-story §6, ADR-324, ADR-388
- B-84 · `hemisphereEmphasis` (`chartCalculation.ts`, in the contract) counts east as houses 1 to 6, the same as below the horizon, and nothing reads it; remove it or take it from `chartPatterns` · R19 plan, ADR-404
- B-85 · QA account's daily cap: a rewrite in place is counted only in process memory, so a staging restart forgets it; keep the day's let-through count in the database · `qaAccount.ts:145,267` · R19 sentinel S1
- B-86 · A life cycle's passes carry no direction (forward or backwards) from the engine, so Read more can't say which · `packages/engine` · R19-16
- B-87 · The 1st house's covers say "how you come across" while the reading bans the phrase; it reaches the prompt as a 7th-house stellium's balance · `houseCovers.ts`, `checks.ts` · R19-12
- B-88 · Heavy · Mixed · Light legend on the site's sample Timeline cards · `web/src/site` · R19-32
- B-89 · Archive tests left on the old behaviour (not run): `orbit.test.ts` (3), `ask-view.test.ts:433-462` and `ask-view.edges.test.ts:216-270` ("Until"), `checks.test.ts:18,21`, `prompts.test.ts:105,114`, the pair-prompts and labDry archive pins, `index.exports.test.ts`; `jobs.test.ts` makes its schema in a `before` hook (R19-50's race) · R19
- B-90 · Report hero: a long name with a body on the Descendant (high-latitude fixture) still sits over the Moon at 900 to 1366 px; break the name onto two lines in `nameLines` · R19-47
- B-91 · The picker opened by `?pair=` leaves focus on the page body when closed · `DashboardPage.tsx` · R19-40
- B-92 · A pair mid-write: `GET /reports/:id` answers `interpretation: { meta }` with no `wordCount`, where `openapi.yaml` says whole or null · R19-41
- B-93 · ClaimPage says "Share yours back when it's ready?", the locked spec "Share yours back?"; one changes · R19-41
- B-94 · The buyer walk's "someone you know" road (Tomás) never reads step 4 as a first-steps state · `buyer.walk.ts` · R19-41
- B-95 · First visit leftovers: `Orbit.tsx` draws "YOU / Your report" with ghost seats where the mock has one "You"; Practising shows Audrey's sample when an own report has nothing to practise; the gift nudge's line repeats its heading (/ux-copy) · R19-35

## Waiting on Alex

Open Mailbox rows, ids and links only (R-12.7). Kept current by every session that opens or closes one.

- MB-12 https://app.notion.com/p/3d6fefe7493181e3b555e715e8ccfc56
- MB-102 https://app.notion.com/p/3e7fefe74931815a91d2d4ca95eb1d2c
- MB-114 https://app.notion.com/p/3e8fefe74931811f81d8eeda3c1a23d7
- MB-116 https://app.notion.com/p/3e8fefe74931815aba15dbc53b46fb1e
- MB-117 https://app.notion.com/p/3e8fefe7493181199d89d84e98a0945b
- MB-191 https://app.notion.com/p/3eefefe7493181da8feedb50233dc9c6
- MB-193 https://app.notion.com/p/3eefefe7493181819339d9205fba797c
- MB-215 https://app.notion.com/p/3effefe7493181ff9609ffecbe99463f
- MB-227 https://app.notion.com/p/3f0fefe7493181b1bb50e644ea207157
- MB-228 https://app.notion.com/p/3f0fefe7493181958e8bfd0d011d4120
- MB-232 https://app.notion.com/p/3f0fefe749318169953ced2f4aee9abe
- MB-235 https://app.notion.com/p/3f2fefe749318108bfe0c17365632444

Private, Owner Claude (security, details in Notion only; done before Timeline opens to subscribers):

- MB-202 https://app.notion.com/p/3eefefe74931814f8c7ad359223ab36e
- MB-207 https://app.notion.com/p/3eefefe7493181319d96f56bd2b2f26b
- MB-212 https://app.notion.com/p/3eefefe7493181249240f5c8c8f52875
- MB-213 https://app.notion.com/p/3eefefe7493181328321dcbe281e8a16
- MB-214 https://app.notion.com/p/3effefe7493181fa9c85ccda47f5f310
- MB-234 https://app.notion.com/p/3f2fefe74931815c91dde645a2a88772

Parked until the Owner starts pricing (ADR-296): MB-115, 120, 149.

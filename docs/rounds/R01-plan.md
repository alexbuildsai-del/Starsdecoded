# R01 plan — land PR #6, make every public claim true, ship the promised delete, draft the legal pages

Planned 2026-09-09 on `claude/busy-noether-ldtkn2`. Scope is fixed by Decisions ADR-13 (locked). No locked specs and no QA reports exist yet. Mailbox rows above 2 rounds open: none (first round; every carried row is now at 1).

## Preconditions (merge order, in this order)

1. This docs branch merges to `main`. It only adds files (`CLAUDE.md`, `MASTERFILE.md`, `docs/`, `.claude/`, `.github/pull_request_template.md`), none of which PR #6 touches.
2. PR #6 (`origin/claude/prompts-library-rework-91uysl`) is retargeted from `claude/replit-astra-report-integration-c0w56f` to `main`, measured and merged (card R01-01). `main` has not moved past PR #6's last merge commit `e05a060`, so the retarget is conflict-free.
3. `round/R01` branches from `main` after step 2. Every path below is as it exists after PR #6: the meaning library is gone, `api/src/prompts/` is the section registry, `fixtures/charts/` holds five fixtures, `pnpm report:lab` exists.

## Goals

1. PR #6 on `main` with a report-lab measurement on record (MB-14, blocking).
2. Every method claim literally true: the status string names `astronomy-engine` (MB-1); the landing page stops claiming a trained model and lists the ten sections the engine emits (MB-2, and the drift half of MB-8).
3. The promised delete works end to end: `DELETE /api/reports/:id` in the spec, the route, a dashboard button (MB-3).
4. Draft legal pages, privacy, terms, refunds, company details, behind a visible draft banner (MB-4).

No fifth goal. Pricing (MB-5) and payments (MB-6) stay open per ADR-13; nothing here touches the €24 literal or the credits soft pass.

## Task cards

### R01-01 Land PR #6 on `main` — INTERNAL plus USER-FACING (report content changes)
Objective: retarget, measure, merge the prompt-library rework. Owner or orchestrator; not a builder card.
Files: none edited in this repo; PR base changed on GitHub.
Refs: MASTERFILE §4 R-4.4, §5 R-5.5, §11.2 gate; MB-14.
Done when: PR base is `main`; CI green; `pnpm report:lab --all --defaults-only --baseline` run with a real `DATABASE_URL` and `OPENAI_API_KEY`, its output pasted into the PR description and copied into `docs/rounds/R01-report.md`; merged; the Railway deploy runs `scripts/bootstrap-db.sh` steps 4/6 and 5/6 (`migrate-drop-dead-prompt-keys.ts`, `migrate-drop-meaning-library.ts`) clean; `/api/healthz` 200; one real report generated on production renders all ten sections; MB-14 closed.
Sequencing: runs first. Every other card branches after it.

### R01-02 Name the real library in the status string — INTERNAL
Objective: replace `"Computing planetary positions with Swiss Ephemeris..."` with a string naming `astronomy-engine`.
Files: `api/src/routes/reports.ts` (`statusToStep` in `GET /reports/:id/status`, line 346 after PR #6).
Refs: MASTERFILE §1 "compute, don't guess", R-4.1; MB-1.
Notes: `web/src/pages/GenerationPage.tsx` renders its own `STEPS` copy, so the false string reaches users only through the public JSON; do not touch `GenerationPage.tsx`. Never fix the claim by swapping libraries. The GTM page in Notion carries the same badge; the orchestrator edits it in the same session (R-10.4).
Done when: `git grep -i swiss -- . ':!pnpm-lock.yaml'` returns nothing; typecheck passes; the status endpoint on the preview returns the new string; MB-1 closed.
Parallel with R01-03, R01-04, R01-06.

### R01-03 Landing page claims match the engine — USER-FACING
Objective: every sentence on the landing page is backed by the code after PR #6.
Files: `web/src/pages/LandingPage.tsx` only.
Refs: MASTERFILE §1, §2 item 1, §9 voice rules, R-4.1; MB-2, MB-8 (drift half only).
Changes: (a) "written by AI trained on Jungian and humanistic astrology" becomes: a general language model, prompted with your computed chart and a written doctrine, nothing is trained; (b) "Precise Natal Chart" names `astronomy-engine` and whole-sign houses; (c) "10+ section" becomes ten; (d) the section grid lists `REPORT_SECTIONS` in registry order by `label`: Chart Overview, Core Triad, Mind & Communication, Career & Calling, Money & Resources, Relationships & Intimacy, Family & Roots, Superpowers, Chronic Patterns & Growing Edges, Key Paradoxes & Discoveries, What to Focus On (wheel and PDF are not sections); (e) footer gains links to `/privacy`, `/terms`, `/refunds`, `/company`, built in R01-06; (f) "under three minutes" stays only if the R01-01 lab timing backs it, otherwise "in minutes".
Constraints: no new "Astra" (existing uses are MB-7); the €24 literal is untouched (MB-5); tokens only, no restyle (ADR-7).
Done when: builds; preview checked against (a) to (f); MB-2 closed; MB-8 annotated "drift fixed by hand in R01, generation from the registry still open".
Parallel with R01-02, R01-04, R01-06.

### R01-04 `DELETE /api/reports/:id` — USER-FACING, `provisional MB-32`
Objective: a report's owner can delete it; the profile behind it goes too when nothing else needs it.
Files: `packages/api-spec/openapi.yaml` (new `delete` under `/reports/{id}`, `operationId: deleteReport`, 204 / 404 / 409 with `ErrorResponse`); `pnpm --filter @workspace/api-spec run codegen` rewrites `packages/api-client-react/src/generated/*` and `packages/api-zod/src/generated/*` (never hand-edited); `api/src/routes/reports.ts` (`router.delete`, reusing its `viewerOwns`); new `api/src/lib/deletion.ts` with the pure decision (delete profile iff no other `reports` row and no `relationship_participants` row references it) and `api/src/lib/deletion.test.ts` (`node --test`, matching `chartCalculation.test.ts`).
Refs: MASTERFILE §3 R-3.5, §7 R-7.2, `access.ts` "writes remain owner-only"; MB-3, MB-32 (recommended option, `// MB-32 provisional` at the seam).
Semantics: natal only, synastry returns 409 until MB-9; non-owner or unknown id returns 404; report row deleted; orphaned profile row deleted (FK cascades clean `invite_tokens`); `credits.used_for_report_id` goes null by the existing `onDelete: "set null"`, so the payment record survives; a report mid-generation (`pending`, `computing`, `interpreting`) is deleted too, and `generateInterpretation` must tolerate its row vanishing (update by id affects zero rows, no throw).
Done when: spec, codegen and route land in one commit before R01-05 starts; unit test covers orphaned, shared-by-second-report, shared-by-relationship; on the preview a deleted report 404s on `GET /reports/:id` and disappears from `GET /reports`; no schema change; MB-3 stays open until R01-05 ships.
Parallel with R01-02, R01-03, R01-06. R01-05 depends on this card's codegen.

### R01-05 Delete button on the dashboard — USER-FACING, `provisional MB-32`
Objective: the "delete your report at any time" promise is honoured from the dashboard.
Files: `web/src/pages/DashboardPage.tsx` (Zone 1 self card and Zone 2 `ProfileCard`, only where `ownership === "owner"` and a natal report exists); new `web/src/components/DeleteReportDialog.tsx` built on `web/src/components/ui/alert-dialog.tsx`; uses the generated `useDeleteReport` hook from `@workspace/api-client-react`.
Refs: MASTERFILE §2 item 7, §9 two tempos (dashboard is dense); MB-3, MB-32.
Behaviour: confirm dialog states exactly what goes: the report, and the birth data when no other report or relationship uses it (server decides; copy says "and its birth data if nothing else uses it"); on success invalidate `getListReportsQueryKey()` and `getListProfilesQueryKey()`, toast, stay on the dashboard; on 409 show the message, no retry loop.
Constraints: no new "Astra"; existing tokens and button variants only; no prompt or API change in this card.
Done when: typecheck and build pass; on the preview, delete a report created from real birth data, the card disappears, the profile card disappears when orphaned, refresh shows the same; MB-3 closed.
Sequential after R01-04's codegen commit. Parallel with R01-02, R01-03, R01-06 otherwise.

### R01-06 Legal page drafts behind a draft banner — USER-FACING, `provisional MB-31, MB-33, MB-5`
Objective: privacy, terms, refunds and company details exist as readable drafts that never pretend to be final.
Files: new `web/src/pages/legal/PrivacyPage.tsx`, `TermsPage.tsx`, `RefundsPage.tsx`, `CompanyPage.tsx`; new `web/src/components/DraftBanner.tsx`; `web/src/App.tsx` (lazy routes `/privacy`, `/terms`, `/refunds`, `/company`). Does not touch `LandingPage.tsx` (R01-03 adds the footer links).
Refs: MASTERFILE §2 item 7, §3 R-3.5 (delete report, anonymise profile, keep payment record; EU data stores; no health claims), §7 R-7.4, §9 voice; MB-4, MB-31, MB-33, MB-5 (refund terms belong to the pricing session).
Content rules: grep-able placeholders `[LEGAL ENTITY]`, `[ADDRESS]`, `[COUNTRY]`, `[COMPANY NUMBER]`, `[CONTACT EMAIL]`, `[REGION]`, `[RETENTION]`; privacy names every processor the code calls (Supabase, OpenAI receiving the name and computed positions, Clerk, Resend, Vercel, Railway, Nominatim and timeapi.io from the browser) and the deletion path from R01-04; refunds drafts the digital-content immediate-performance consent and a refund for a failed report, marked provisional MB-5; terms state no predictions, no diagnosis, no fate (R-5.2). Report page style: airy, `font-display` headings, no starfield restyle. Banner copy: "Draft. Not yet reviewed by the Owner. Nothing is sold until it is."
Done when: four routes render on the preview with the banner; `git grep -n '\[LEGAL ENTITY\]\|\[REGION\]'` lists every placeholder and the list goes in the round report; no new "Astra"; MB-4 closed, MB-31 and MB-33 stay open for the Owner's fill-in.
Parallel with R01-02, R01-03, R01-04.

## Parallelism

Wave 0: R01-01 alone. Wave 1: R01-02, R01-03, R01-04, R01-06 on disjoint files. Wave 2: R01-05 after R01-04's codegen commit. Close per §11.2 step 4: round report with USER-FACING / INTERNAL tags, `docs/INDEX.md` regenerated, `CLAUDE.md` current focus advanced to the pricing session, Mailbox rows closed, pull request opened for the Owner.

## Risks

- USER-FACING report content: R01-01 changes every word of every report (ten sections, sect, structured outputs). The lab measurement is the only guard; no round card may edit `api/src/prompts/` or `api/src/lib/` beyond R01-02's one string.
- Deletion touches what is stored about a person (R-12.2). R01-04 builds the recommended option provisionally; if the Owner answers MB-32 differently the seam is one function in `api/src/lib/deletion.ts`.
- Legal drafts are user-visible without a locked spec and without an entity. The banner and placeholders are the mitigation; nothing is sold in this round.
- OpenAPI change (new operation) is not a schema change; no migration, `db:bootstrap` untouched. PR #6 itself adds two migrations that Railway runs pre-deploy; a failure there blocks the deploy, which is why R01-01 checks the deploy log.
- No new dependencies in any card. Report generation racing a delete (R01-04) is the one concurrency edge; the done-when covers it.
- The bible's prompt section is stale after PR #6 and its sync script lives on the unmerged bible branch (MB-15, launch). R-8.1 cannot be honoured this round; the round report says so.

## Questions raised (Mailbox rows added before the round starts)

- MB-31 (decision, blocking): legal entity, jurisdiction and contact details. Default: placeholders and banner stay, nothing sold.
- MB-32 (decision, launch): profile fate when its last report is deleted. Default: delete the orphaned profile row, built `// MB-32 provisional`.
- MB-33 (gap, launch): processor list and hosting regions for the privacy policy. Default: processors from code, `[REGION]` and `[RETENTION]` placeholders.

Rounds open incremented to 1 on all 27 carried rows (MB-1 to MB-25, MB-29, MB-30). Parked rows MB-26 to MB-28 untouched.

Three questions for the Owner this session, highest stakes first: (1) MB-31 entity and country, since it gates selling; (2) MB-32 delete semantics, since it changes what is stored about a buyer; (3) who runs the PR #6 report lab, since it needs the production `OPENAI_API_KEY` and a `DATABASE_URL`; recommendation: the Owner runs it locally against a scratch Supabase database and pastes the output into the PR.

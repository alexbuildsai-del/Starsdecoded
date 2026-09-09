# R01 report — every public claim true, delete shipped, legal drafts up

Branch `round/R01` from `main` at `0a871fa`, run 2026-09-09. Plan: `docs/rounds/R01-plan.md`. Gate green locally; nothing verified on a deploy (see "Not verified here").

## Shipped

- R01-01 (INTERNAL + USER-FACING, report content): PR #6 merged into `main` as `f6b4713` with CI green before this round. The lab measurement is missing (deviation 1).
- R01-02 (INTERNAL): `GET /reports/:id/status` says "Computing planetary positions with astronomy-engine..." (MB-1). `9ac8ff2`.
- R01-03 (USER-FACING): landing page: no trained model, a general model prompted with the computed chart and a written doctrine; names astronomy-engine and whole-sign houses; "ten sections" and the grid lists the ten `REPORT_SECTIONS` labels in registry order; "under three minutes" is now "in minutes"; footer links to `/privacy`, `/terms`, `/refunds`, `/company` (MB-2, MB-8 drift half). `cd33ad6`.
- R01-04 (USER-FACING, `// MB-32 provisional`): `DELETE /api/reports/:id` in the spec (`deleteReport`, 204/404/409), codegen, route reusing `viewerOwns`; `api/src/lib/deletion.ts` decides the profile's fate (deleted when no other report and no relationship participant references it); `generateReport` returns early if the profile vanished mid-run (MB-3). `963f0c3`.
- R01-05 (USER-FACING, `// MB-32 provisional`): delete button on the dashboard's self card and each owned person card with a natal report; confirm dialog on `alert-dialog`; success invalidates reports and profiles lists and toasts; 409 shows the server message with no retry (MB-3). `c794f48`.
- R01-06 (USER-FACING, `provisional MB-31, MB-33, MB-5`): `/privacy`, `/terms`, `/refunds`, `/company` as lazy routes with `DraftBanner` ("Draft. Not yet reviewed by the Owner. Nothing is sold until it is."); privacy names Supabase, OpenAI, Clerk, Resend, Vercel, Railway, Nominatim and timeapi.io and the deletion path; refunds drafts the immediate-performance consent; terms state no predictions, no diagnosis, no fate (MB-4). `50234a8`, `daa7432`.
- R01-07 (INTERNAL, added by the Owner this session): `.github/workflows/smoke.yml` (56 lines) on push to `main` and dispatch: waits up to 10 min for the web root div, reads the first `https://…railway…` origin out of the linked `/assets/*.js`, polls `/api/healthz` for `{"status":"ok"}`, prints both URLs in the job summary. `e818f6e`.

## Gate (local, in order)

`pnpm install --frozen-lockfile` exit 0 · `pnpm run typecheck` exit 0 · `pnpm run build:web` exit 0 (2365 modules, 5.4 s) · `pnpm run build:api` exit 0 · unit tests: api 34/34 pass (3 new in `deletion.test.ts`: orphaned, shared by second report, shared by relationship). No schema change, so `db:bootstrap` not required. New "Astra" uses in the diff: 0. Meaning-library package absent from `main` as expected; only `packages/db/scripts/migrate-drop-meaning-library.ts` remains, by design.

Legal placeholders (`git grep -n '\[LEGAL ENTITY\]\|\[REGION\]' -- web/src`): `CompanyPage.tsx:10` LEGAL ENTITY · `PrivacyPage.tsx:10` LEGAL ENTITY, ADDRESS, COUNTRY · `PrivacyPage.tsx:38,42,43` REGION (Supabase, Vercel, Railway) · `RefundsPage.tsx:25` LEGAL ENTITY · `TermsPage.tsx:9` LEGAL ENTITY, COUNTRY. All tokens across `web/src`: LEGAL ENTITY 4, ADDRESS 2, COUNTRY 5, COMPANY NUMBER 1, CONTACT EMAIL 5, REGION 3, RETENTION 2.

## Not verified here (sandbox egress blocks *.vercel.app and *.railway.app; the Owner tests the deployed site)

- Status endpoint returns the new string on the preview (R01-02).
- Landing page (a) to (f) on the preview (R01-03).
- Deleted report 404s on `GET /reports/:id` and leaves `GET /reports`; orphaned profile card disappears and survives a refresh (R01-04, R01-05). The route was exercised only by typecheck; no database in the sandbox.
- Four legal routes render with the banner on the preview (R01-06).
- The smoke workflow has never run; its first run is the push of this branch's merge to `main` (R01-07).
- Report-lab timing that would have backed "under three minutes" (R01-03 f); copy says "in minutes".

## Deviations from the plan

1. R01-01 lab not run: no `OPENAI_API_KEY` and no route to Postgres here; the Owner declined to run it (Decisions "Operations belong to Claude"). No measurement is on record for PR #6. MB-14 is handled by the launcher, not this round.
2. No builder subagents were available in this session; the orchestrator built all six cards itself, one commit per card, in the plan's wave order.
3. R01-04 touched `api/src/lib/` (`deletion.ts`, a pure predicate with no engine or prompt effect), so the gate formally asks for the lab; see 1.
4. `git grep -i swiss` is clean in code; it still hits `MASTERFILE.md` §14, `docs/rounds/R01-plan.md` and, until this commit, `CLAUDE.md`. The masterfile and the plan are historical text and were left alone.
5. The plan's section list split "Superpowers, Chronic Patterns & Growing Edges" into two, giving eleven; the registry has ten labels and the page follows the registry.
6. The GTM page badge (R01-02 notes) was not edited: the session was scoped to the Mailbox and the page URL was not in hand. Raised as MB-35.
7. R-8.1 (bible sync) not honoured; the sync script lives on the unmerged bible branch (MB-15), as the plan foresaw.
8. `ErrorType` is not exported from `@workspace/api-client-react`'s index, so the dialog relies on the hook's inferred error type instead of naming it. Not raised; cosmetic.

## Mailbox

Resolved: MB-1, MB-2, MB-3, MB-4 set `done`. Annotated: MB-8 ("drift fixed by hand in R01, generation from the registry still open"). Added: MB-35 (todo, launch) GTM badge. Left open for the Owner: MB-31, MB-32, MB-33, MB-5.

Token spend: moderate; the round was six small cards on well-mapped files.

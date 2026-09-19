# R05 report — pass three, unknown birth time, the compatibility report

Built 2026-09-19 on `round/R05` from `docs/rounds/R05-plan.md` (`natal-report-pass-three.md` ADR-46 to 51,
`unknown-birth-time.md` ADR-33 to 38, `compatibility-report.md` ADR-39 to 45). Thirty-two cards, all shipped.
142 files, +11,014 / −3,261, 38 commits.

## Shipped

- **Brain, natal v6** (R05-01, 02, 06, 07, 09) — USER-FACING. `path` retired, ten chapters, `PROMPT_VERSION` v6; the horizon is a status: `calculateNatalChart` sweeps the band, a blind chart carries no angles, houses, sect or lots; the brief writes `HORIZON: unknown`, the registry skips `triad.rising`, `houses`, `angleMeanings`, `validateClaims` rejects angle, ruler, sect, lot and any house on a blind report; the offset is the birth date's (Warsaw 1867 → 1.4, MB-48).
- **The horizon pass** (R05-07, 09, 10) — USER-FACING. `PATCH /profiles/:id/birth-time` recomputes the chart, writes `triad.rising`, `houses`, `angleMeanings`, runs one amendment call per section applied by exact quote match (three amendments, one addition, unmatched dropped and logged, claims re-validated); `report_revisions` keeps the previous text; a failed pass restores it and says so; status `revising`.
- **Brain, compatibility p1** (R05-11 to 15) — USER-FACING. Pair registry, pair brief from two stored reports, overlays, evidence kinds `cross` and `source`, one foundation call then nine sections and twelve link cards, `POST /compatibility`, reports of type `compatibility` listed and readable through the existing access roles; old synastry rows hidden (MB-58).
- **Contract, schema, credits** (R05-03, 04, 05, 08) — INTERNAL. OpenAPI for every shape above, `provisional` on `/status`, `profiles.timezone` and `birth_time_window_minutes`, `reports.horizon_passes`, `report_revisions`, relationship types remapped to the three lenses, `credits.credit_type` nullable and unread (MB-57); one credit kind, `consumeCredit(userId, reportId)`; four idempotent migrations as bootstrap steps 3c–3f.
- **Lab** (R05-16) — INTERNAL. Blind band and flags, `--pass` local and remote, `--pair <fixture> --lens`, the `marie-curie-unknown` and `curie-winfrey` fixtures.
- **Web, shared** (R05-17 to 26) — USER-FACING. Real progress (4/10/90÷n, five labels, the door at 67% once `overview` and `houses` land), the orrery of the chart as the loading screen, the star gather onto the hero ring, the three-way birth time control with its live readout and record hints, lenses, skeletons, silent ticks, the sun on the fixed layer, one sky, revision marks and the ledger, the method strip's horizon line, link cards, the bi-wheel, the compatibility picker (MB-6 seam), admin prompt tabs natal and pair.
- **Hero and explorer, drawn and blind** (R05-27, 28) — USER-FACING. `AngleGlyph` with its tick on the card and the hero, the scroll cue a button to chapter 01, no plate chapter label; a blind chart draws no horizon, labels, marker, house ring, axes or quadrants, reads `TOB · not recorded`, `horizon · not drawn`, the Moon as the arc it travelled that day, and carries the one call to action.
- **Intake, routes, dashboard, claim** (R05-29, 30) — USER-FACING. The birth form asks the three-way question and submits the zone and window, no noon note; `/generating/:id` redirects to `/report/:id`, `/synastry/:id` and its page go with the score; dashboard zone 3 is the picker and the pair list, credits one badge, a blind tile carries "Add your birth time"; the claim asks the time question once and runs the pass.
- **Pages** (R05-31, 32) — USER-FACING. Ten chapters ending in Closing over the dawn, the door, skeletons, the ledger with marks remembered per browser, Export PDF flipping at complete, no house number on a blind page or its print; the compatibility page opens on the bi-wheel, nine chapters by accent, source-tagged passages, three checklists, a closing paragraph, no dawn, no number anywhere.

## Deviations

- The Agent tool was unavailable for the whole round: the orchestrator built all thirty-two cards itself, in wave order, one commit per card. Token spend was heavy (two context compactions); R-13.3 noted.
- Contract additions not in the plan: `ProfileSummary.latitude/longitude/timezoneOffset` and `Report.profileId`, so the birth-time door can run from the dashboard, the claim and the report page without a second lookup (R05-30).
- New shared file `web/src/components/BirthTimeDialog.tsx`: the one door to the pass, used by the hero, explorer, dashboard and claim. `Chapter.tsx` prints an eyebrow that equals its title once; `evidence-glossary.ts` glosses `cross` and `source`; `InviteModal` invalidates the report, not a synastry query; `MyPeoplePage.tsx` (dead, unrouted) deleted.
- `invites.ts`: claiming no longer creates a synastry report; the redirect goes to the pair report, else the natal, else the dashboard. Raised as MB-59.
- `DRAWN_LINKS` is 12 with one overlay card per notable group, so the cards stay under the schema's 24; the plan's card said "per drawn link" without a cap.

## Gate

`pnpm install --frozen-lockfile` green · typecheck green (scripts, api, web) · `build:web` green · `build:api` green ·
tests green: api 116 pass / 0 fail, packages/db 9, scripts 2, web 11 files / 78 tests · codegen leaves no diff ·
`db:bootstrap` green three times against a scratch Postgres 16 (an already-bootstrapped database, then a fresh
one twice; every migration idempotent, step 6 reset natal → v6 and pair → p1).

**Not run here, recorded per the plan**: the three lab campaigns (natal v6 on the five fixtures, the blind pair with
`--pass`, `curie-winfrey` once per lens) need `OPENAI_API_KEY` and the staging API; neither credential exists in this
environment. The Vercel preview smoke needs the preview URL and a browser; CI's `smoke.yml` runs on `main` after the
merge. Both are the first things to run from the orchestrator's machine before Owner acceptance; MB-38 stays open until
the natal measurement is pasted here.

## Mailbox

Done: MB-9, MB-16, MB-18, MB-27, MB-32, MB-44, MB-48, MB-56. Built at their defaults, still open: MB-55 (the ring
creeps), MB-6 (the picker's no-credit seam), MB-43 (marks and hint per browser), MB-47. Raised: MB-59 (the claim
lands on a report without generating one). Open more than two rounds: MB-5, 6, 8, 11, 12, 13, 15, 17, 19 to 25, 30,
31 (blocking), 33, 35, 39.

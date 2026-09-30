# R11 report — the First Light site as real HTML, found by AI, with the waitlist over it

Built 2026-09-30 on `claude/compassionate-clarke-l16qww` (the session's branch, in place of `round/R11`) from `docs/rounds/R11-plan.md`
(`landing-and-ai-search`, ADR-107 to 119; from `pricing-and-launch` only the seller, the legal pages, double opt-in and the prices).
Twenty-seven cards in four groups, one commit each (R11-24 two), every group ended green. The Owner answered MB-115 (name, Belgium,
hello@mystarsdecoded.com) and placed MB-75 and Resend's domain before the round started. Two usage-limit stops were resumed.

## Mailbox rows open more than two rounds
At 10: MB-12, 13, 15, 17, 19–24, 30 · at 9: MB-33, 35 · at 7: MB-43, 47, 49 · at 6: MB-55, 58, 59 · at 5: MB-64–67 · at 4: MB-70, 73, 74 ·
at 3: MB-77–80, 87, 89. None blocked a card. MB-50, 42, 75, 101, 108 are done.

## Shipped
- **R11-01** `@workspace/engine` (chartCalculation moved byte for byte, api re-exports it) and `@workspace/commerce`; the brain gains `packages/engine/` — INTERNAL.
- **R11-02** one seller (Alexandra Bendicakova, Stars Decoded, Belgium, hello@mystarsdecoded.com; no postal address), the tick, three refund rules, three bundles — INTERNAL.
- **R11-03** `waitlist_signups` gains `utm_content` and three confirmation columns, idempotent in bootstrap step 1; the contract for confirming — INTERNAL.
- **R11-04** Inter and Space Grotesk served from our origin; no page calls Google's font hosts — INTERNAL.
- **R11-05** one place field with the OpenStreetMap credit, reused by the birth form, the hero and /sky; the prefill through sign-in after launch — USER-FACING.
- **R11-06** the site's registry, shell, nav, footer and routes — USER-FACING.
- **R11-07** the waitlist over the site: Get my report and Sign in open a dialog (a sheet on a phone) before launch; `?prelaunch=1` on staging — USER-FACING.
- **R11-08** the sample in one module: r06's run, her computed chart, four home claims, six synthetic sample people — INTERNAL.
- **R11-09** every public page prerendered and hydrated; app routes an empty noindex shell; unknown paths 404 — USER-FACING.
- **R11-10** each page's head and JSON-LD, robots.txt, sitemap, llms.txt; staging never indexed — USER-FACING.
- **R11-11** Privacy, Terms, Refunds and Who runs Stars Decoded read the seller; final, no draft banner — USER-FACING.
- **R11-12 / 13** double opt-in: a 7-day link, one confirmation email, "Check your inbox", the admin list's confirmed and pending — USER-FACING.
- **R11-14** the hero on the live sky over the visitor's city, and the sky screen rewinding to a birth minute — USER-FACING.
- **R11-15** four cited claims on her rewound wheel, and Inside's ten chapters — USER-FACING.
- **R11-16** your people on the sample orbit, and two charts on one horizon — USER-FACING.
- **R11-17** How it works and birth time, on the engine's own readouts — USER-FACING.
- **R11-18** the prices from the catalogue with nothing to buy, fifteen FAQ answers, the dawn — USER-FACING.
- **R11-19** /sky · **R11-20** /sample (63 claims marked; off production until MB-90) · **R11-21** /method, /compatibility · **R11-22** the two Learn pages ·
  **R11-23** /faq with search, /waitlist with confirmation, the phone ribbons at the bottom — USER-FACING.
- **R11-24** the home page whole: below-the-fold chart work deferred (first light 2.56 s → 1.61 s at 4x CPU), one pass for the cycles — USER-FACING.
- **R11-25** old landing, waitlist page, demo chart and `GET /api/sky` gone; the price gate test — INTERNAL.
- **R11-26** the QA personas walk real pages; the smoke checks the crawl surface and any return of Google fonts — INTERNAL.
- **R11-27** production's API pings IndexNow once its own web build is live — INTERNAL.

## Gate
install, typecheck, both builds (13 pages prerendered; 12 in a production build), unit tests (web 441, api 325, scripts 11, commerce 19, db 9,
engine 8), codegen twice with no diff, `db:bootstrap` twice on a scratch Postgres 16, clean. **Dry lab:** 65 prompts (5 fixtures × 13
sections) against r06, token counts identical to `main`'s: the engine moved, no report's words changed.

## Deviations
- The overlay supersedes ADR-141 in part: **ADR-167**. ADR-150 (#72) and ADR-151 were already taken.
- MB-91 kept the locked "credit back" words, tagged, until R12; MB-90: her chart and claims are public on the home page from the first Release.
- Plates are drawn by `TwoPlates`, not `TriadPlate` (two horizons on one line); `NatalWheel` uses `useId` and rounds positions for hydration.
- `/faq` gained end cards; the form gained "Use a different email"; the third refund rule no longer states our reason.
- Not verified here: Nominatim, IndexNow and a Vercel preview are blocked from this session; the first preview and Release show them.

## New words for the Owner's look (no locked spec)
The dialog "Stars Decoded isn't open yet" · "Check your inbox" and the confirmation page · the email "Confirm your email to join the
waitlist" · /waitlist's three steps · the legal pages' sentences · the 404 page · the fifteen FAQ answers · the sample fine print.

## Raised
Bootstrap step 2 cannot fail a deploy · element ties read as a winner · the rewind's wait on slow phones · the Moon's hidden day arc.
MB-13 (the share image's "ONE PURCHASE"), MB-33 (processor DPAs), MB-94 (Nominatim's policy) gained notes.

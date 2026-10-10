# R20 report — the design system, whole

Built 2026-10-10 on `round/R20` from `docs/rounds/R20-plan.md`. 36 cards in three groups (6 Opus, 29 Sonnet, 1 Haiku), plus one Opus
sweep after group 3. Each group ended green and was pushed once. Round start: staging's QA walk passed `buy` on 7d70ace (QA-08 #1 fixed).

**Open Mailbox rows created more than 14 days ago (ADR-186):** 2026-09-09: MB-12 (no error reporting). No card waited on it.

## Shipped
- **R20-01, 02** `packages/design` (tokens.css, tokens.ts, tokens.json) and `pnpm check:ds` (literals, contrast pairs, the mirrors, the chart rule), in CI — INTERNAL.
- **R20-03** the base CSS on tokens: the shadcn map, one palette, one curve; the old bridge block and the door button rules gone — USER-FACING.
- **R20-04** `/admin/design`: every part with its page and example; the Removed parts deleted — INTERNAL.
- **R20-05 to 12** the atoms and molecules (Button, text, chips, fields, loaders, the logo, planet bodies and rings, cards, alerts, wells, labels, tiles) — USER-FACING.
- **R20-13 to 17, 19** Sheet with peek, Dialog and Confirm (B-99, partly), Menu, ClaimPopover, TopBar, Footer, the six templates, BirthFields with part-of-day pills — USER-FACING.
- **R20-18** ReportBlocks, HouseCard with its planet row back, the Checklist — USER-FACING.
- **R20-20, 21** the Chart part: 12 parts, one chart in 9 states; `chart-consistency.test.ts` (99 tests) in the critical tier and the Charts shot in site-checks — USER-FACING, INTERNAL.
- **R20-22, 23** the emails, Clerk's theme, `render-brand`, the share image and the post kit on tokens; the committed covers unchanged — USER-FACING.
- **R20-24 to 34** every screen on the parts: dashboard, flows and account, report (B-12), Timeline, Ask, the site and legal pages, checkout, sign-in, claim, birth form, loading and Share; the house deck, triad, site plates and Did you know through the Chart part — USER-FACING.
- **R20-35, 36** the admin and Lab on the parts; `/web-taste` and MASTERFILE §9 point at the library — INTERNAL.

## Gate
install, typecheck, both builds (csp unchanged), the critical tier on scratch Postgres (api 621, web 311, commerce 27, engine 21, db 20,
scripts 14), "buyer walk: 22/22 steps passed", `check:shipped`, `check:copies`, `check:ds` (zero outside `ds-drawings.json`),
`check:callers` (each caller in the diff), `pnpm audit --prod` clean, gitleaks 8.30.1 over 63 commits clean, the Charts harness with no
sideways scroll. No brain, schema or contract file touched: no dry lab, no bootstrap run, no codegen. No tester (no flow step moved).
**Sentinel:** CLEAR, no findings.

## Pictures
Before (base 670f93c) and after at 390 px for every screen, admin at 1280, the emails and the cover:
the round's picture page (link in the PR). Sign-in and Stripe's own fields show stand-ins locally.
**Outliers (ADR-440), each a visible change:** #9AA3B5 → paper-dim · #8E9BE0, #C5CAE9 → indigo-lt · #8967C1 → violet · #F2F4F9,
#F4F5FA → paper / on-indigo · the dial's #E3A3AD → back · #6E7789 → label-dim · #3A4356 → line-strong · #63A8C4 → line-easy ·
#7FB08B → element-earth · the site's glows → brass, brass-dim, element-fire · #F6E3C0 → brass on on-indigo · the toasts' reds → void ·
the chart label grey #A3ABBC → paper-dim. **Other visible moves:** the emails' and Clerk's button gradient is solid indigo; the admin
side nav is chips; print shows planet renders, not glyphs; the home's dawn is on tokens but the report hero's glow is not (allow-listed);
the account menu lost its row icons; text sizes snapped (10.5 and 9.5 → 11, 19 → 17, 22 → 20).

## Deviations
- R20-27: the report hero is not on the Chart part (its must-keeps); R20-34: the stories keep their build in motion. Both allow-listed (B-104, 105).
- R20-26, 30: the ReportPage and SitePage templates are built but the live pages don't use them yet (B-106).
- B-99 only partly: the home chart screen's opener sits in an inert hero face. B-75 partly: pair-story labels on a phone.
- Orchestrator fixes in commits: the Button hover contrast, the Chart's focus colour, AdminDesignPage's literal; one Opus sweep after
  group 3 (the bridge block, `.lf*` rules, dead site CSS, AppPage and AdminPage under the fixed bar, `duration-*`, render-brand).
- R20-30 fixed `cn()` in `lib/utils.ts`, outside its card, after R20-26 and R20-28 found token text sizes dropped.

## Decided by me
ADR-443 to 448: the Button keeps its fill on hover with a lighter edge; the Chart's focus is the `focus` colour (MB-196 provisional);
the hero and stories stay allow-listed; 15 px body floor; confirms are danger; check:ds's chart rule is a ratchet. Also: compact Button
36 px with a 44 px tap; whole-sign framing kept; "needs a birth time" on a label with no house; the birth form says "Writing" while busy.

## Needs you
Your look on staging: the before and after pictures, a house card's planet row, `/admin/design`. MB-196 (focus look) still open.

## Spend
Spend: 1.56M Opus (6 cards, the sweep, the sentinel), 2.83M Sonnet (29 cards, the before pictures), 0.04M Haiku · cards 6 Opus,
29 Sonnet, 1 Haiku by planned tier · escalations none · session $69.

**Lessons.** Seen once: the walk's database shared with a running server, `cn()` not knowing token sizes, `duration-*` with no CSS,
no signed-in session for shots. The caller rule held (re-exports, callers named). Nothing promoted.
**Mailbox and backlog.** Raised: none new. Backlog done: B-09, B-12, B-98; B-11, B-75, B-99 narrowed; added B-104 to B-113.

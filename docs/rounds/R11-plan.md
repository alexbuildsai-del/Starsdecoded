# R11 plan — The website: eight public pages as real HTML, found by AI, with the waitlist laid over it

Planned 2026-09-30 on `claude/compassionate-clarke-l16qww` (`main` at 627e306, merged in at 34df546) for the locked spec
`landing-and-ai-search` (ADR-107 to 119; annex `docs/annex/landing-and-ai-search-pages.md`; artifact
https://claude.ai/artifact/Rx9GsG4ZUA8Gnxif6fHWbV), with the waitlist laid over the site, and from `pricing-and-launch`
(ADR-142 to 149) only what a lawful production waitlist and the landing's prices need. **The Owner, 2026-09-30:** "Let's plan
this website build. I would like the new website and the waitlist overlay on top of it. Let's leave Stripe settings on the
side, I will handle that in another round, and yes, we're going to keep going with Stripe." He gave the seller's name
(Alexandra Bendicakova, as spelled), the country (Belgium) and a postal address, which stays out of this public repo
(reading 9); no contact address yet. No QA report exists; no Owner comment sits on the Mailbox or Decisions rows this touches.
**Tags:** every card is USER-FACING except R11-01 to 04, R11-08 and R11-25 to 27 (INTERNAL). **The brain moves but does not
change** (R11-01, MB-108): `chartCalculation.ts` becomes `@workspace/engine` byte for byte, so the dry lab runs once and no
report's words change (R-5.5 not triggered). **The schema changes** (R11-03: four waitlist columns). **No new npm
dependency**: astronomy-engine 2.1.19 reaches the web through the engine package; two workspace packages; the fonts are
copied. **No credential is needed to build**, nothing goes on GitHub, and nothing reaches production in the round.

## Mailbox rows above 2 rounds open after this plan's increment
At **10**: MB-12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 30 · at **9**: MB-33, 35 · at **7**: MB-43, 47, 49, 50 · at **6**: MB-55, 58,
59 · at **5**: MB-64, 65, 66, 67 · at **4**: MB-70, 73, 74, 75 · at **3**: MB-77, 78, 79, 80, 87, 89. All 59 carried-over open rows
were incremented; the deferred plan's increment of 2026-09-28 never reached Notion, so this is the first since R10. MB-25 ("No
launch plan") was marked decided by ADR-147 instead. None blocks a card. **MB-115** (blocking) blocks production's waitlist
form, not the build: the name and country are in, the contact address is Owner ask 1. **MB-75** stays the release todo. No row
was raised: every consequential choice here sits on an existing row (MB-90, 101, 108, 115, 119) or on the Owner's words today.

## Round order: the website is R11, pricing and launch R12
- The plan written on 2026-09-27 and 28 as R11 (pricing and launch first) is now `docs/rounds/R12-plan.md`, its body unchanged
  under a two-line note. The Owner put the website first and gave Stripe its own round.
- This plan starts from "Proposed R11" in `docs/rounds/R10-plan.md` and "Proposed R12" in the deferred plan, re-read against
  `main`'s code as it is today (R10, #70 the waitlist, #72 the catalogue change all shipped).
- From the deferred plan it takes only what the site and a lawful production waitlist need and that touches no payment;
  "What moves from the deferred plan" (near the end) names every card, moved or staying.
- Size: twenty-seven cards in four groups, near R10's twenty-five; the shrink path is under Parallel groups.

## Round start (the orchestrator)
1. The round runs on this branch, as R10 did. `git diff --stat main...HEAD` lists only docs (MASTERFILE 0.18, INDEX, the
   pricing-and-launch lock, the deferred R12 plan, this plan), so typecheck is unaffected; the round's pull request brings them
   to `main`.
2. **ADR-150 is taken** (gpt-6.1-sol joining the catalogue, #72, 2026-09-30): the overlay's Decisions row at close is
   **ADR-151**. Nothing else precedes group A.

## What already shipped (checked on this branch at 1569a8b)
- **Met, and reused:** the waitlist (#70, ADR-141): the First Light copy (the ten chapter lines, the ten FAQ answers, method,
  birth time, the lenses), `WaitlistForm`, POST /waitlist with its tags and one row per address, the admin list with its CSV
  and Remove, `LAUNCHED` and both prelaunch seams; the wheel that names its houses and every printed house with its word
  (R09, landing scope 14); `TriadPlate` (R09-07); `Orbit` and `SkyCard` with the ring cut at .26 (R10, ADR-112); `CHAPTERS`,
  `LENSES`, `PAIR_CHAPTER_TITLES`, the product names, `PART_LABELS` and `readout`, `HOUSE_WORDS` and `HOUSE_THEMES`; the
  evidence card and citations (R03, R09); the engine's sweep of a birth-time window (ADR-33); `opengraph.jpg` and its tags
  (MB-13); the four legal pages as drafts (R01, R10-05); `/ux-copy` and `/web-taste` as rebuilt at the lock (scope 22).
- **Not met:** `LandingPage.tsx` is the old page (Aria Solis from `demoChart.ts`, "€24" twice, registry labels by hand, glyph
  orbits); no public page but the waitlist; `#root` ships empty and the catch-all rewrite answers 200 for any path; no
  robots.txt, sitemap, canonical, JSON-LD or llms.txt; the web cannot import the engine (`.vercelignore`, MB-108), so the live
  sky comes from `GET /api/sky`; the place search lives inside `BirthFormPage.tsx` without the map credit; Inter and Space
  Grotesk load from Google's CDN; single opt-in; bracketed placeholders in four legal pages, "Company details", a Refunds page
  promising a regeneration; the QA agent's personas walk `/birth-form` and `/legal/*`, which never existed.

## Where the specs disagree, and how this plan settles it
1. **ADR-141** (production shows every visitor the waitlist page) against the Owner today (the site, with the waitlist over it)
   → the Owner's words, read as reading 1; ADR-151 at close supersedes ADR-141 in part.
2. **The overlay's row number:** the orchestrator's brief names ADR-150, which #72 took the same day → ADR-151.
3. **The landing's "No dry lab"** against MB-108's package (a brain file moves) → the dry lab runs once, free; no prompt,
   model or computation changes.
4. **"Signed out, every CTA reaches the birth form"** (scope 1, acceptance) → after launch ADR-140 (sign-in, then the form),
   before it ADR-151 (the waitlist).
5. **The parked pricing slot** (scope 11, "until the pricing session") against ADR-142 (prices locked) → the slot shows the
   catalogue, with nothing to buy until launch (reading 13).
6. **ADR-142's catalogue in `api/src/` with a Stripe price id** against MB-108 (the prerender cannot import `api/`) →
   `@workspace/commerce` without Stripe columns: MB-119's location half; its price_data half and the offers stay R12's.
7. **Method's "the sample's brief"** (annex) against MB-108 (the brief is `api/` code) → the engine's own notes (reading 6).
8. **The waitlist page as the whole site** (ADR-141, #70) against the new home → its sections move into the home page and
   `/waitlist` becomes a short page of its own.
9. **`GET /api/sky`** (MB-108 provisional) against the engine in the browser → retired at the end of the round (R11-25).
10. **"IndexNow on deploy"** (scope 21) against no secret on GitHub and MB-75 → production's API pings once its own web build
    is live (R11-27).
11. **ADR-145's "each processor's region listed (MB-33 verifies)"** against unverified regions → listed where known, else the
    provider's country and transfer basis, tagged; the draft banner follows the seller's waitlist fields only (reading 10).
12. **MB-91** ("fixed in the round that builds the landing"; the lock's "same copy pass") against the soft pass, under which
    some reports hold no credit → R12, with credits going hard (reading 18).
13. **Sample people** (ADR-112, R-3.1) against the fixtures on hand (the pair fixtures are real people) → new synthetic
    fixtures (reading 7).
14. **The QA walk** (acceptance "Existing checks") against paths that do not exist → the personas walk real paths (R11-26).
15. **The credits sheet's names** (ADR-142 supersedes credit-loop's) → unchanged until R12 rebuilds the sheet (Risk 9).

## Goals
1. **A lawful production waitlist** (MB-115, blocking; ADR-144, 145): one seller constant with the Owner's name and country,
   the four legal pages reading it, double opt-in by email, the fonts off Google's CDN; production's form waits only for the
   contact address.
2. **The waitlist over the site** (the Owner, 2026-09-30; ADR-151 at close): before launch every call to write or sign in
   opens the waitlist over the page, `/waitlist` is a page, the app stays the admin's and the API gate holds; staging previews
   it with `?prelaunch=1`; launch is still one edit.
3. **The website** (landing-and-ai-search, ADR-107 to 119): the home page on the live sky with the sky screen, cited claims,
   Inside, your people, two charts on one horizon, method, birth time, the prices, the FAQ and the dawn; /sky, /sample,
   /method, /compatibility, the two Learn pages and /faq; every chart computed by the engine, now a package both sides import
   (MB-108), and one place field.
4. **Found by AI** (ADR-114 to 116): every public page prerendered with its head and JSON-LD; robots.txt, sitemap and llms.txt;
   app routes noindex, unknown paths 404, staging never indexed; the QA walk and the smoke check it; IndexNow from production.

## Preconditions
1. The round runs on this branch (Round start); no builder starts before this plan's commit is pushed.
2. Builders read MASTERFILE §0, their card, and the spec sections and pinned shapes it names. They cannot open claude.ai (403):
   the orchestrator hands each UI builder local copies of the artifact screens its card names (the home page, the seven pages,
   Phone, Motion, Voice, Found by AI). Without them builders follow the spec, the annex and the shapes, and the round report
   lists what differs.
3. **Single owners.** Group A: `packages/engine/**`, `packages/commerce/package.json` and `tsconfig.json`, the three
   `tsconfig.json` references, `web/package.json`, `api/package.json`, `pnpm-lock.yaml` → R11-01; `packages/commerce/src/**` →
   R11-02; `packages/db/**`, `scripts/bootstrap-db.sh`, `packages/api-spec/**` and the generated client and zod → R11-03;
   `web/index.html`, `web/src/index.css`, the font files → R11-04; `BirthFormPage.tsx` → R11-05; `web/src/site/` registry,
   shell, routes, `pages/*` and `sections/*` → R11-06; `web/src/lib/prelaunch.ts`, `site/cta.tsx`, `site/WaitlistDialog.tsx`
   → R11-07; `web/src/site/data/**`, `site/lib/chart.ts`, `fixtures/sample-people/**` → R11-08. Group B: `App.tsx`, `main.tsx`,
   `web/package.json`, `vite.config.ts`, `index.html`, `vercel.json` → R11-09; `api/src/lib/prelaunch.ts` → R11-12; each
   section file to its card. Group C: `site/sections/*` → R11-24 alone; `HorizonWheel.tsx`, `SkyForm.tsx`, `site/lib/sky.ts` →
   R11-19 alone. Group D: `api/src/app.ts`, `api/src/lib/prelaunch.ts`, `openapi.yaml` → R11-25; `site/head.ts`,
   `vite.config.ts` → R11-27.
4. Inside a group a card may land before one it imports from (pinned shapes): the orchestrator accepts a red intermediate until
   the group ends, and every group ends green. A builder who needs a pinned shape changed stops (R-0.1).
5. **No card spends.** Nothing generates; mail goes to a stub in tests; the walks of the place field are a builder's own few
   searches (Nominatim's usage policy).
6. **No secret in the repo or on GitHub**; the IndexNow key is public by design. The Owner's postal address appears nowhere:
   not in code, tests, fixtures, docs, commits or Notion (reading 9).
7. Code cites ADR-107 to 119 and 140 to 145 where it follows them. Provisional seams: `// MB-90 provisional` (`SAMPLE_LIVE`),
   `MB-101` (the committed run), `MB-112` (Couple), `MB-115` (the two missing seller fields), `MB-119` (the catalogue's home),
   `MB-33` (regions). The `MB-108` tag leaves with `skyNow.ts`; the `MB-106` tag in `web/src/lib/waitlist.ts` goes (ADR-145).

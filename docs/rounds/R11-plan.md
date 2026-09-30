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

## Readings pinned where the spec is silent
1. **The overlay** (the Owner, 2026-09-30; ADR-151 at close), the default the Owner can correct on staging: before launch,
   production shows everyone, and every crawler, the public site: home, /sky, /method, /compatibility, the two Learn pages,
   /faq, the four legal pages and /waitlist (/sample by reading 4). Every call to write a report or sign in (Get my report, Sign
   in, the sky screen's and the prices' buttons) opens the waitlist over the page, a dialog on desktop and a bottom sheet on a
   phone, with the waitlist form; `/waitlist` is its page. The app (sign-up, the birth form, dashboard, reports, claims) shows
   a non-admin the /waitlist page, as today; `/sign-in` and `/admin` stay the admin's way in, and the signed-in admin sees and
   uses everything. The API keeps its gate: healthz, `/waitlist`, `/waitlist/confirm`, `/admin/*`; the public pages call
   nothing else, since they compute in the browser and read build data. Staging and local are never gated.
2. **One HTML for both states.** The prerendered pages read the same before and after launch. The buttons keep the locked
   labels (Get my report, Sign in); their `href` is `/waitlist` in a production build before launch and `/chart` or `/sign-in`
   otherwise, and the click decides on the client: the dialog for a visitor before launch, else ADR-140's sign-in and then
   the birth form. The dialog's first line says plainly that Stars Decoded is not open yet. Launch stays one edit,
   `LAUNCHED = true`, then a Release.
3. **Staging previews the look** with `?prelaunch=1`, kept for the tab in `sessionStorage` `sd.prelaunch.preview`;
   `?prelaunch=0` or the ribbon's Exit clears it. It shows the visitor's view even to the signed-in admin, on any host. Web
   only: the API stays open on staging.
4. **/sample on production** answers 404 and stays out of the sitemap until MB-90 is done (`SAMPLE_LIVE`, `// MB-90
   provisional`); on staging it is whole. Elsewhere her computed chart, the four home claims and the worked examples appear as
   the spec locks them, with the fine print (her public birth record, Astro-Databank AA; no connection to her family or
   estate). One module holds the sample, so Marie Curie's run can take the slot in one edit if MB-90's check fails.
5. **The engine becomes a package** (MB-108's recommendation, which its default leaves to this plan): `chartCalculation.ts`
   moves unchanged to `packages/engine`, with `zoneCities.ts` and the pure parts of `skyNow.ts`; `api/src/lib/chartCalculation.ts`
   re-exports it, so thirty imports keep their path; `BRAIN_PATHS` gains `packages/engine/`; `CHART_VERSION` stays 3, since
   nothing computes differently (R-3.2). The live sky moves to the browser and `GET /api/sky` retires at the end of the round.
6. **Method's notes** are what the engine itself computes for the sample: a day or night birth from the Sun's altitude, the
   dominant planets, element and modality. The brief stays on the server (the web cannot import `api/`).
7. **Sample people** (ADR-112, R-3.1): four to six synthetic fixtures under `fixtures/sample-people/`, birth data only,
   labelled as samples wherever shown, one per relation the orbit and the three lenses need; they also give each lens its two
   plates. The royal pair fixtures stay lab-only (real published births).
8. **The four home claims** stay r06's, byte-identical, the artifact's four as `/ux-copy` picked them (no Sun or Ascendant
   claim passes, MB-92); ADR-110's re-pick at a Release belongs to the round that changes the sample run.
9. **The seller** (ADR-144, MB-115): `LEGAL_IDENTITY` in `@workspace/commerce` holds the name "Alexandra Bendicakova" (as given;
   accents asked in ask 1), the trading name "Stars Decoded", the country "Belgium" and the statement descriptor
   "MYSTARSDECODED"; `postalAddress` and `contactEmail` are `null` under `// MB-115 provisional`. **The postal address is
   never written in the repo, a plan, a commit or Notion**; only R12's sale path will require it (`saleReady`).
   `waitlistReady()` means the name and the contact address are there.
10. **The legal pages** (ADR-143 to 145) read `LEGAL_IDENTITY`. The draft banner shows while `!waitlistReady()`; after that,
    "Draft dated" reads "Updated". A missing postal address is left out, never shown as a placeholder. Processors carry their
    region where it is confirmed, else the provider's country and the transfer basis ADR-145 names (`// MB-33 provisional`).
    No Stripe (R12), no analytics (MB-116's default). `/company` keeps its route, titled "Who runs Stars Decoded".
11. **Double opt-in** (ADR-145; the deferred plan's reading 11): a 32-byte token, only its SHA-256 stored, the link alive seven
    days; an unconfirmed address is deleted after seven days, swept on each call; every join answers `check_email`, so nobody
    learns who is listed; a new link at most once per ten minutes per address; `launch-email-v1` rows count as confirmed
    (staging holds the only ones); a confirmed address is kept until the opening email (R12) or a request to delete it. The
    page posts the link's token itself, so a mail scanner's GET confirms nothing.
12. **Production's form before the contact address** shows one line and no field, and POST /waitlist answers 503
    `waitlist_closed` there while `!waitlistReady()`. Staging and local always take sign-ups.
13. **Prices** (ADR-142, R-6.3, MB-119's location half): the three rows live in `@workspace/commerce`, with no Stripe column
    and no offer (both R12's). The pricing slot shows each bundle's name, line, price and "VAT included", with nothing to buy:
    its button is Get my report (reading 2). JSON-LD gives a Product (the Personal natal report) with an Offer per bundle and
    sets `availability` only after launch.
14. **The prefill through sign-in** (ADR-140): after launch only, the sky screen's Get my report keeps the date, time and place
    in `sessionStorage` `sd.form.draft`, the tab's own, gone once the birth form reads it; the privacy page names it.
15. **Crawl** (ADR-115; settled at lock 2): production's robots.txt allows every crawler, GPTBot, ClaudeBot and
    Applebot-Extended included, except `/api/` and `/admin`; staging and previews answer `Disallow: /` and
    `X-Robots-Tag: noindex`; app routes carry noindex; unknown public paths 404; the sitemap's `lastmod` is each page's Updated
    date (ADR-116); llms.txt lists the pages from the registry. Measurement needs no code: ChatGPT's `utm_source=chatgpt.com`
    lands in the waitlist's tags, crawler hits in the host's firewall log (MB-102).
16. **Tests stay on pure modules** (MB-47): the prerender itself fails the build when a page lacks its H1 or lede; no component
    rendering test.
17. **Copy:** the artifact's words where it has them; every new string passes `/ux-copy` and every page `/web-taste`; each
    builder lists its new strings for the Owner's look (the dialog, the confirmation, the closed line, the legal lines).
18. **MB-91 waits for R12:** "Your credit is back." is true of every failed report only once credits go hard (the soft pass
    writes some reports with none), so it moves with the deferred R11-13.

## Pinned shapes
- **Engine** (`@workspace/engine`, R11-01): every export of today's `chartCalculation.ts` (`calculateNatalChart`, `hasHorizon`,
  `offsetAtBirth`, `CHART_VERSION`, `EPHEMERIS`, `ASPECT_ORBS` and the types) and, from `sky.ts`, `Place`,
  `placeForZone(zone?)`, `cityName(zone)`, `localParts(at, zone)`, `skyAt(at, place)`.
- **Commerce** (R11-02): `SellerIdentity { name; tradingName; country; postalAddress: string | null; contactEmail: string |
  null; statementDescriptor }`; `LEGAL_IDENTITY`; `missingSellerFields(id = LEGAL_IDENTITY): ("postalAddress" |
  "contactEmail")[]`; `waitlistReady(id?)`, `saleReady(id?)`: boolean; `CHECKOUT_TICK`; `REFUND_RULES: readonly [string,
  string, string]`; `BundleId = "solo" | "couple" | "family"`; `Bundle { id; name; line; credits: 1 | 3 | 5; cents }`;
  `BUNDLES`; `bundleById(id)`; `formatEuro(cents)` ("€24", "€14.40").
- **Contract** (R11-03): `JoinWaitlistBody.consent` enum + `launch-email-v2`, `utmContent?` (≤ 100); `WaitlistJoined.status`
  + `check_email`; POST /waitlist + 503; `POST /waitlist/confirm` `ConfirmWaitlistBody { token (≤ 100) }` → 200
  `WaitlistConfirmed { status: confirmed }` or 404 [confirmWaitlist]. `/admin/*` stays out of the spec.
- **Site** (R11-06): `SITE = { origin: "https://mystarsdecoded.com", name: "Stars Decoded" }`; `PageEntry { path; title;
  eyebrow; h1; lede; updated: "YYYY-MM-DD"; kind: home | page | learn | faq | legal | waitlist; schema: ("WebPage" | "Article" |
  "FAQPage")[]; sitemap: boolean; parent?: string }`; `PAGES`; `pageFor(path)`; `isPublicPath(path)`; `SAMPLE_LIVE`; `NAV`;
  `FOOTER`; `SiteLayout({ page: PageEntry; children; end?: ReactNode })`; `PUBLIC_ROUTES: readonly { path; load: () =>
  Promise<{ default: ComponentType }> }[]`. Pages `web/src/site/pages/{Home,Sky,Sample,Method,Compatibility,LearnHouses,
  LearnBirthTime,Faq,Waitlist}Page.tsx`; sections `web/src/site/sections/{Hero,Claims,Inside,YourPeople,TwoCharts,Method,
  BirthTime,Pricing,Faq,Dawn}.tsx`, each a default export with no required props.
- **Overlay** (R11-07): `previewFlag(search?, store?): boolean`, `setPreview(on, store?)`; `PrelaunchViewProvider({ children })`
  (client only, inside Clerk) and `usePrelaunchView(): boolean` (defaults to `PRELAUNCH` without the provider, as on the
  server); `WaitlistDialogProvider({ children })`, `useWaitlistDialog(): { open(source: string): void }`; `ReportCta({ source;
  className?; children? })`, `SignInCta({ source; className? })`.
- **Waitlist** (R11-12, 13): `sendWaitlistConfirmEmail({ to, confirmUrl, expiresOn }): Promise<boolean>`; `WaitlistForm({
  source: string; joined: string | null; onJoined(email) })`; `ConfirmWaitlist({ token: string })`.
- **Place and prefill** (R11-05): `PlaceField({ id; value: GeocodeResult | null; onChange(place: GeocodeResult | null);
  label? })`, `GeocodeResult` as the birth form types it today; `FormDraft { birthDate; time: BirthTimeAnswer; place:
  GeocodeResult | null }`; `saveFormDraft(draft, store?)`, `takeFormDraft(store?): FormDraft | null`.
- **Sample** (R11-08): `toChartData(natal): ChartData`, `chartOf(birth): ChartData` (`web/src/site/lib/chart.ts`); `SAMPLE {
  name; birth; run; generatedAt }`, `sampleChart()`, `claimsInReadingOrder(): { n; section; claim }[]`; `HOME_CLAIMS: readonly {
  claimId; target: { kind: "body" | "angle"; key } }[]`; `SAMPLE_PEOPLE: readonly { id; name; relation; birthDate; chart }[]`;
  `SAMPLE_PAIRS: Record<Lens, [string, string]>`.
- **Head, crawl, FAQ** (R11-10, 18): `headFor(path, env): string`; `robotsTxt(env)`, `sitemapXml(env)`, `llmsTxt()`: string;
  `FAQ_GROUPS: readonly { topic; items: readonly { q; a; home: boolean; link?: string }[] }[]`.
- **Prerender** (R11-09): `web/src/entry-server.tsx` exports `render(path): Promise<{ html: string; head: string }>` and the
  three crawl builders; `web/scripts/prerender.mjs` writes `dist/{path}.html`, `dist/app.html`, `dist/404.html`,
  `dist/robots.txt`, `dist/sitemap.xml`, `dist/llms.txt`.

## Parallel groups
**Group A**, one message: R11-01 to R11-08, no dependencies between them (R11-01 and R11-02 meet at `packages/commerce`,
R11-06 and R11-07 at `cta.tsx` and `WaitlistDialog.tsx`, R11-08 imports the engine: pinned). **Group B**, one message once A is
green: R11-09 to R11-18 (R11-09 imports R11-10's builders, R11-10 reads R11-18's `FAQ_GROUPS`: pinned); each section lands in
the home page's placeholder, so the group-end build prerenders every section on the server. **Group C**, one message once B is
green: R11-19 to R11-24. **Group D**, one message once C is green: R11-25 to R11-27. Then the gate. **If R11 must shrink**,
R11-27 (IndexNow) moves to R12 first, then R11-26's smoke half; the pages stay, since they are the goal, and R11-25 stays,
since the price gate and the retired route close the round.

---

## Group A — the packages, the columns and contract, the fonts, the place field, the site's skeleton, the overlay, the sample

### R11-01 — The engine and commerce as workspace packages (INTERNAL) · Opus — MB-108
Objective: the chart calculation lives where the browser, the prerender and the API all import it; `@workspace/commerce` is wired.
Files: new `packages/engine/` (`package.json` with astronomy-engine 2.1.19 and a test script, `tsconfig.json`, `src/index.ts`,
`src/chartCalculation.ts` and `src/zoneCities.ts` by `git mv` from `api/src/lib/`, new `src/sky.ts`, `engine.test.ts`, `sky.test.ts`);
new `packages/commerce/package.json`, `tsconfig.json`; `api/src/lib/chartCalculation.ts` (a re-export), `skyNow.ts` (+ test, the
cache alone), `github.ts` (`BRAIN_PATHS`); the three `tsconfig.json`; both `package.json`; `pnpm-lock.yaml`; `sky-card.test.ts`.
Refs: MB-108; ADR-107; R-3.2, R-4.4; CLAUDE.md "the brain"; landing acceptance "Charts are computed"; reading 5; pinned engine.
Done when:
- `git diff -M main` shows both moved files as renames with no content change; `sky.ts` holds `placeForZone`, `cityName`,
  `localParts` and `skyAt` as `skyNow.ts` has them; `CHART_VERSION` is 3.
- `engine.test.ts` pins Audrey Hepburn (Sun 13.12° Taurus, Moon 6.45° Pisces, rising 28.62° Aquarius) and Marie Curie to 0.01°;
  api's `chartCalculation.test.ts` passes unchanged through the re-export; both packages test under the root command.
- `pnpm install --frozen-lockfile` passes; web and api typecheck against both packages (commerce's sources come with R11-02);
  `build:web` bundles the engine. The orchestrator runs the dry lab and pastes it into the report.

### R11-02 — One seller, the terms' words, three prices (INTERNAL) · Sonnet — provisional MB-112, MB-115, MB-119
Objective: the seller, the tick, the refund rules and the bundle catalogue in one package the web, the prerender and the API import.
Files: new `packages/commerce/src/index.ts`, `seller.ts`, `terms.ts`, `catalogue.ts`, `seller.test.ts`, `catalogue.test.ts`.
Refs: pricing-and-launch Bundles and prices, Sold by Alex, Checkout; ADR-142 to 144; R-6.3, 6.6; readings 9, 13; pinned commerce.
Done when:
- `LEGAL_IDENTITY` holds exactly "Alexandra Bendicakova", "Stars Decoded", "Belgium", "MYSTARSDECODED", and `null` for
  `postalAddress` and `contactEmail`, each under `// MB-115 provisional`; no street, postcode or town appears in the package.
- `missingSellerFields`, `waitlistReady` (name and contact address) and `saleReady` (every field) answer for any identity passed
  in; `CHECKOUT_TICK` is R-6.6's sentence byte for byte; `REFUND_RULES` are ADR-143's three rules in the reader's words.
- `BUNDLES`: solo "Single", "1 credit · one report", 1, 2400; couple "Couple" (`// MB-112 provisional`), "3 credits · a report
  each and how you get along", 3, 4800; family "Family & friends", "5 credits · for the people close to you", 5, 7200; the file
  tagged `// MB-119 provisional` (its home; offers and Stripe's amounts are R12's).
- Tests: the predicates on complete and incomplete identities, the three rows, `formatEuro`.

### R11-03 — The waitlist's columns and contract for double opt-in (INTERNAL) · Opus
Objective: a waitlist row can wait for its owner's confirmation, and the contract carries the confirmation and each post's tag.
Files: `packages/db/src/schema/waitlist.ts`; new `packages/db/scripts/migrate-waitlist-confirmation.ts`; `packages/db/package.json`
(`migrate` runs it last); `scripts/bootstrap-db.sh` (step 1's comment); `packages/api-spec/openapi.yaml`; the generated
`api-client-react` and `api-zod` (codegen only).
Refs: ADR-141, 145, 147 (`utm_content` per post); R-7.2, R-7.3; MB-80, MB-106 (decided); reading 11; pinned contract.
Done when:
- `waitlist_signups` gains `utm_content text`, `confirmed_at timestamp`, `confirm_token_hash text` (unique index) and
  `confirm_sent_at timestamp`; the script adds them `IF NOT EXISTS` in step 1, before `push`, skips a database without the
  table, marks `launch-email-v1` rows confirmed at their `created_at`, and is idempotent.
- On a scratch Postgres 16 with a dummy `OPENAI_API_KEY` (MB-80): `db:bootstrap` from `main`'s tree (a worktree), then this
  branch's twice, then an empty database twice; every run clean, step 2 applying nothing after step 1.
- The contract as pinned, every change additive with a line naming ADR-145; codegen, typecheck green with no other file
  changed, and a second codegen leaves no diff.

### R11-04 — The last two fonts from our own origin (INTERNAL) · Sonnet
Objective: no page calls Google's font CDN, so the privacy page names no font host and the public site sends no visitor's
address to Google (ADR-145).
Files: new Inter and Space Grotesk woff2 files and their OFL texts in `web/src/assets/fonts/`; `web/src/index.css` (its first
three lines); `web/index.html` (its three font links).
Refs: ADR-145; MB-33, MB-42; §9 (the four families); the Newsreader and IBM Plex Mono `@font-face` rules as the pattern.
Done when: Inter (400 to 700) and Space Grotesk (400 to 600) load from `./assets/fonts/` as variable woff2, copied once from
the npm registry's `@fontsource-variable` packages without adding a dependency, the licence named in one comment; no
`fonts.googleapis.com` or `fonts.gstatic.com` remains in `web/`; `build:web` emits the files; the comment over the block no
longer says two fonts come from the CDN; pages look as they did.

### R11-05 — One place field, and the birth form's prefill (USER-FACING) · Opus
Objective: the birth form's place search becomes one component the landing and /sky reuse as it is, with the map data
credited (ADR-109), and the form takes what the sky screen carried through sign-in (ADR-140).
Files: new `web/src/components/PlaceField.tsx`; new `web/src/lib/places.ts` (+ test); new `web/src/lib/form-draft.ts`
(+ test); `web/src/pages/BirthFormPage.tsx`.
Refs: landing scope 4, acceptance "One place field", "Fields fit"; ADR-109, 140; MB-30, 94 (neither built); reading 14; pinned
place and prefill.
Done when:
- `PlaceField` carries today's search exactly (Nominatim, the ranking, timeapi.io's zone, the list, the chosen place's line),
  shows "© OpenStreetMap contributors" in its list, and its input is 16 px on a phone; `places.ts` holds the pure ranking and
  labels with tests; the birth form renders `PlaceField` and behaves as before.
- `saveFormDraft` writes the date, time answer and place to `sessionStorage` `sd.form.draft`; `takeFormDraft` returns and
  deletes it; the birth form fills its fields from it once on mount and submits nothing for the reader; tests on a fake store.

### R11-06 — The site's skeleton: registry, shell, routes and stubs (USER-FACING) · Opus
Objective: one registry names every public page with its head, one shell draws nav, page head and footer, and every page and
home section exists as a file its own card fills.
Files: new `web/src/site/site.ts` (+ test), `SiteLayout.tsx`, `site.css`, `routes.tsx`; stubs in `web/src/site/pages/` and
`web/src/site/sections/` (the pinned names).
Refs: landing scope 1, 13, 17; annex Shared; ADR-116, 119; §9; readings 1, 2, 4; pinned site; the artifact's nav, footer, heads.
Done when:
- `PAGES`: the eight site pages, `/waitlist` and the four legal pages (`/company` titled "Who runs Stars Decoded") with title,
  eyebrow, H1, the annex's answer-first lede, Updated date, schema and sitemap flag; `isPublicPath`, `SAMPLE_LIVE` per reading 4.
- `SiteLayout`: the nav (wordmark; Free chart, Sample report while `SAMPLE_LIVE`, Compatibility, How it works, FAQ; `SignInCta`;
  `ReportCta`), the page head, the footer (Reports, Learn, Company; `EPHEMERIS`, the Updated date, the credits), inside
  `WaitlistDialogProvider`; a menu on a phone; `site.css` from `waitlist.css`'s rules under its own prefix (the old file goes in R11-25).
- Page stubs render `SiteLayout` with their registry head; `HomePage` renders the ten sections in the locked order, each stub
  empty but `Hero`, which renders the home's H1 and lede; `PUBLIC_ROUTES` covers the nine site pages and the four legal pages;
  no module touches `window` at load; tests for the registry.

### R11-07 — The overlay on the web: who sees the waitlist, and the buttons that open it (USER-FACING) · Opus
Objective: before launch every call to write or sign in opens the waitlist over the page; after launch the same buttons go
through sign-in to the birth form; staging can preview the first.
Files: `web/src/lib/prelaunch.ts` (+ test); new `web/src/site/WaitlistDialog.tsx`, `cta.tsx`; `StagingRibbon.tsx`, `PrelaunchRibbon.tsx`.
Refs: the Owner 2026-09-30 (ADR-151 at close); ADR-140, 141; R-3.4; readings 1 to 3, 17; pinned overlay; `/ux-copy`.
Done when:
- `prelaunch.ts` keeps `PRELAUNCH`, narrows `OPEN_BEFORE_LAUNCH` to `/sign-in` and `/admin`, and adds `previewFlag`, `setPreview`,
  `PrelaunchViewProvider` and `usePrelaunchView` (readings 1, 3): server and first paint agree, the admin and the flag are
  learned after mount; tests.
- `ReportCta` and `SignInCta` render one link with reading 2's `href`; a click gives a visitor before launch the dialog with its
  source, anyone else `/chart` or `/sign-in?return_to=/dashboard`; signed in after launch, `SignInCta` reads Dashboard.
- `WaitlistDialog`: a dialog on desktop, a bottom sheet on a phone (framer-motion, as R10's sheets), a first line saying Stars
  Decoded is not open yet, `WaitlistForm`, the privacy link; focus held and returned; still under reduced motion.
- `StagingRibbon` adds "Prelaunch preview · Exit" while the flag is on; `PrelaunchRibbon` says visitors see the site with the
  waitlist; both render after mount.

### R11-08 — The sample: its run, its chart, its claims, its people (INTERNAL) · Opus — provisional MB-90, MB-101
Objective: one module holds everything the pages show of the sample, with nothing typed: the run's text, the chart computed,
the four claims, the sample people.
Files: new `web/src/site/data/sample/audrey-hepburn.r06.json`, `web/src/site/data/sample.ts` (+ test), `claims.ts`, `people.ts`
(+ test); new `web/src/site/lib/chart.ts`; new `fixtures/sample-people/*.json` and `README.md`.
Refs: landing scope 5, 7, 8; annex /sample; ADR-110, 112, 119; R-3.1; MB-90, 92, 101; readings 4, 7, 8; pinned sample.
Done when:
- The JSON is the `interpretation` of `report-lab/r06`'s `fixtures/reports/audrey-hepburn.r06.json`, its sections and claims
  byte for byte, without the chart, the fixture, `foundation` or `meta.usage`; `sampleChart()` computes her chart from
  `fixtures/charts/audrey-hepburn.json` through the engine and `toChartData`.
- Tests: all 63 claims anchor to their text in the report page's chapter order; each `HOME_CLAIMS` entry, the artifact's four,
  points at a body or angle the computed chart has at the degree its evidence names.
- `people.ts` computes `SAMPLE_PEOPLE` from the new fixtures (synthetic, labelled, birth data only) and `SAMPLE_PAIRS` per lens;
  the README says they are synthetic and marketing-only, and the report lab never reads the directory.

---

## Group B — real HTML, the crawl surface, the legal pages, the waitlist's opt-in, the home page's sections

### R11-09 — Real HTML: prerender, hydrate, route (USER-FACING) · Opus
Objective: every public page ships its words in the HTML and hydrates; app routes get the empty shell with noindex; an unknown
path answers 404 (ADR-114, R-7.6).
Files: `web/src/App.tsx`, `main.tsx`, `pages/not-found.tsx`; new `web/src/entry-server.tsx`, `web/scripts/prerender.mjs`;
`web/package.json`, `vite.config.ts`, `index.html` (head and root markers); `vercel.json`, `.gitignore`.
Refs: landing scope 18, 19, acceptance "Crawlable", "Crawl files"; ADR-114, 140; R-7.6; readings 1 to 4, 15; pinned shapes.
Done when:
- `build:web` builds the client and the server entry, then writes each `PUBLIC_ROUTES` page (not /sample in a production build
  while gated), `app.html` (empty `#root`, noindex), `404.html` and the crawl files; it fails when a page lacks its H1 or lede.
- `main.tsx` hydrates a prerendered page, else renders; `App.tsx` routes the site from `PUBLIC_ROUTES`, drops the old landing
  and waitlist routes, mounts `PrelaunchViewProvider`, and before launch (or in preview) gives a visitor the /waitlist page on
  any app path; on the preview no page logs a hydration mismatch.
- `vercel.json`: `cleanUrls`; the `/api` rewrites first; app routes (`/sign-in`, `/sign-up`, `/chart`, `/report/*`, `/generating/*`,
  `/compatibility/*`, `/dashboard`, `/people`, `/claim*`, `/admin*`, `/login`) to `/app.html` with `X-Robots-Tag: noindex`;
  staging and preview hosts noindex throughout; no catch-all; each app route opens on the preview.

### R11-10 — The crawl surface: head tags, structured data, robots, sitemap, llms.txt (USER-FACING) · Opus
Objective: each page tells search and AI search what it is, in tags and JSON-LD that match what it shows, and the site
publishes its map (ADR-115, 116).
Files: new `web/src/site/head.ts` (+ test), `web/src/site/crawl.ts` (+ test).
Refs: landing scope 19 to 21, acceptance "Crawl files"; ADR-115, 116; R-6.3; MB-13, MB-102; readings 4, 13, 15; pinned head,
crawl and FAQ; `.claude/skills/ux-copy/references/ai-search.md`.
Done when:
- `headFor(path, env)`: the title, the description (the lede), canonical on `https://mystarsdecoded.com`, OG and Twitter tags
  with `opengraph.jpg`; JSON-LD: Organization and WebSite on every page, BreadcrumbList off the home page, a Product with an
  Offer per `BUNDLES` row on the home page (reading 13), Article with `dateModified` on /sample (the run's date) and the Learn
  pages, FAQPage on /faq identical to the visible answers; no review markup; each block parses and names only what its page
  shows.
- `robotsTxt(env)`, `sitemapXml(env)` (every indexable page with its Updated date as `lastmod`, /sample only where live) and
  `llmsTxt()` (the pages and their ledes) follow reading 15; tests pin each file for production and for staging.

### R11-11 — The legal pages read one seller (USER-FACING) · Opus — provisional MB-33, MB-115
Objective: the four legal pages read `LEGAL_IDENTITY`, say what ADR-143 to 145 decided, and leave draft once the waitlist's fields are in.
Files: `web/src/pages/legal/*.tsx` (all five); `web/src/components/DraftBanner.tsx`; new `web/src/lib/processors.ts` (+ test).
Refs: pricing-and-launch Sold by Alex, Privacy until the company, Checkout; ADR-139, 143 to 145; MB-33, 115, 116; readings 9 to 11, 14.
Done when:
- No bracketed placeholder; the banner and "Draft dated" or "Updated" follow reading 10; the pages sit inside `SiteLayout`, the
  legal nav reading Privacy, Terms, Refunds, Who runs Stars Decoded.
- Who runs Stars Decoded: Alexandra Bendicakova, a private individual trading as Stars Decoded, Belgium, the contact once set, no
  postal line while it is `null`. Refunds: exactly `REFUND_RULES`. Terms: the seller, bundles of credits priced before paying,
  another person's details only with their knowledge and a child's only as parent or guardian, accounts 16 and over, the tick's
  effect (`CHECKOUT_TICK`), R10-05's section kept, Belgian law.
- Privacy as ADR-145 states it: controller and contact; `processors.ts` (Supabase, Railway, Vercel, OpenAI, Clerk, Resend;
  Nominatim and timeapi.io from the browser) with reading 10's regions; lawful bases; double opt-in and retention (reading 11);
  rights (an export by email within 30 days, the mailbox read weekly, a breach reported within 72 hours); necessary cookies only;
  the browser keys, `sd.form.draft` among them; no analytics; `#waitlist` kept.

### R11-12 — The waitlist asks twice: the API (USER-FACING) · Opus
Objective: an address joins only when its owner confirms it; production takes none until the privacy page names its contact.
Files: `api/src/routes/waitlist.ts`, `adminWaitlist.ts`; `api/src/lib/waitlist.ts`, `prelaunch.ts`, `mailer.ts` (each + test).
Refs: ADR-141, 145; pricing-and-launch Privacy; MB-106 (decided), MB-115; readings 11, 12; pinned contract, waitlist, commerce.
Done when:
- POST /waitlist stores the address unconfirmed with a fresh token's hash and `utm_content`, sends `sendWaitlistConfirmEmail`
  with `{PUBLIC_APP_URL}/waitlist?confirm={token}`, and answers `check_email` whatever the address's state, with reading 11's
  throttle; on production it answers 503 `waitlist_closed` while `!waitlistReady()`.
- POST /waitlist/confirm confirms a live token (a repeat answers the same) and 404s an unknown or expired one; unconfirmed rows
  older than seven days go on each call; `OPEN_PATHS` admits `/waitlist/confirm`.
- The confirmation email, in the shell the other emails use, says only what confirming does, with the button and the day the
  link stops working, in words that pass `/ux-copy`; GET /admin/waitlist adds `confirmedAt`, `utmContent` and the two counts.
- Tests: the token, the throttle, the sweep, the closed state, the gate and the email's words.

### R11-13 — The waitlist asks twice: the web (USER-FACING) · Sonnet
Objective: the form asks people to confirm by email, the /waitlist page confirms their link, and the admin list shows who did.
Files: `web/src/components/waitlist/WaitlistForm.tsx`; new `web/src/components/waitlist/ConfirmWaitlist.tsx`;
`web/src/lib/waitlist.ts` (+ test); `web/src/pages/AdminWaitlistPage.tsx`.
Refs: ADR-141, 145; readings 11, 12, 17; pinned waitlist and contract.
Done when:
- `WaitlistForm` takes any `source`, sends consent `launch-email-v2` (its sentence through `/ux-copy`) and `utmContent`; a join
  shows "Check your inbox" with the address; production while `!waitlistReady()` shows reading 12's line and no field.
- `ConfirmWaitlist` posts its token once on load and shows "You're on the list", or a line and the form when the link has
  expired or is unknown.
- `readUtm` reads `utm_content`; the admin page shows confirmed and pending, its CSV gains `utm_content` and `confirmed_at`, and
  its types `confirmedAt` and `utmContent`; the `MB-106` tag goes; tests.

### R11-14 — The hero and the sky screen (USER-FACING) · Opus
Objective: the sky now over the visitor's city, and a birth date's full-screen sky rewinding to the birth minute (ADR-107, 108).
Files: `web/src/site/sections/Hero.tsx`; new `sections/SkyScreen.tsx`, `site/components/HorizonWheel.tsx`, `SkyForm.tsx`,
`site/lib/sky.ts` (+ test), `useLiveSky.ts`; `NatalWheel.tsx` only if it cannot render on the server.
Refs: landing scope 2, 3, 15, 16 and its acceptance; ADR-107, 108, 140; §9; readings 2, 5, 14; the artifact's home, Motion, Phone.
Done when:
- The locked heading and lede; the product's wheel at full height on the Ascendant, the horizon across the page, the live sky
  from the engine over the zone's city each minute; its square reserved in the HTML and drawn on hydration, so nothing shifts;
  below 900 px it stacks.
- `SkyForm`: the date, a time that always shows AM or PM, `PlaceField`; three, two or one per row; 16 px on a phone. Show my
  chart lifts the wheel into `SkyScreen` (0.75 s), rewinds to the birth minute in 2.9 s (real positions, trails, a counting
  date), then names Sun, Moon and Rising; no time: no horizon or houses, the Moon as the day's arc; Close flies back, the hero
  keeps that sky; nothing stored; its button is `ReportCta`, saving the prefill only after launch (reading 14).
- First light about 2.3 s on the one easing; reduced motion draws it still. Tests: the rewind's last frame equals the birth
  minute's chart to 0.01° (Audrey Hepburn), the counting dates, the Moon's day range.

### R11-15 — Every claim cited, and Inside (USER-FACING) · Opus
Objective: four real claims take turns, each drawn to its place on the sample's wheel, and the ten chapters step through with a
line each (ADR-110, 111).
Files: `web/src/site/sections/Claims.tsx`, `Inside.tsx`; new `web/src/site/data/inside.ts`.
Refs: landing scope 5, 6, acceptance "Claims point true", "Reduced motion"; ADR-110, 111; MB-8 (decided), MB-92; reading 8;
pinned sample.
Done when:
- Claims: in view, the sample's wheel rewinds once to her birth; `HOME_CLAIMS` take turns every 6.5 s, each with its evidence
  (the evidence card's rows) and a line ending on its body or angle at its degree; a tap stops the cycle; nothing sits behind
  them or follows scroll; on a phone they stack, the line rising from them; "Read her whole report" to /sample while `SAMPLE_LIVE`.
- Inside: the ten `CHAPTERS` names in their accents, each with its one sentence and its parts (the waitlist page's lines, moved
  into `inside.ts`), stepping through until touched; no word count anywhere (ADR-111).
- Reduced motion: no rewind, no cycle; the first claim and the first chapter shown whole.

### R11-16 — Your people, and two charts on one horizon (USER-FACING) · Opus
Objective: the orbit sells the second person on labelled sample people, and two plates show two people without a score
(ADR-112, 113).
Files: `web/src/site/sections/YourPeople.tsx`, `TwoCharts.tsx`; new `web/src/site/components/TwoPlates.tsx`;
`web/src/components/dashboard/SkyCard.tsx` only to make its controls optional.
Refs: landing scope 7, 8, acceptance "Compatibility"; dashboard-sky; ADR-17, 89 to 96, 97, 112, 113; reading 7; pinned sample.
Done when:
- Your people: R10's `Orbit` and `SkyCard` on `SAMPLE_PEOPLE`, each labelled as a sample, the ring at .26 cut around each person
  and name; a tap opens the card with no live control (no Generate, Send or credits); on a phone the card is a sheet; the
  dashboard renders as before.
- `TwoPlates`: two `TriadPlate`s on their own Ascendants, both horizons on one dotted line, Sun and Moon at their degrees, the
  inner lane within 14° of the Ascendant; no line joins a body of one to the other; no score, number of fit or age band.
- TwoCharts: the lens tabs from `LENSES`, the plates of `SAMPLE_PAIRS[lens]`, the seven titles from `PAIR_CHAPTER_TITLES` with a
  line each, "About the Compatibility report" to /compatibility.

### R11-17 — How it works, and birth time (USER-FACING) · Opus
Objective: the method in three steps on the sample's real data, and the three birth-time plates carrying the product's own
readouts.
Files: `web/src/site/sections/Method.tsx`, `BirthTime.tsx`; new `web/src/site/lib/readouts.ts` (+ test).
Refs: landing scope 9, 10; annex /method (the facts); ADR-33, 111, 117; readings 6, 17; pinned engine and sample.
Done when:
- Method: we work out your chart (the sample's readout: Sun, Moon, rising, the clock), we note what stands out (reading 6), we
  write your report and check it (one claim with each reference ticked); the three facts (the writing service never sees birth
  data, no predictions, the credit back on failure); no model or vendor named; "How we make your report, step by step" to /method.
- Birth time: for people with only what a parent remembers, or nothing; I know it, Roughly and I don't know, each plate's
  readout from the engine's window sweep, said by `birth-time.ts`'s `readout` (the "3 possible … flips at …" form); the parts of
  the day from `PART_LABELS`; no time typed.
- `readouts.ts` tests: each plate's readout equals the engine's sweep for its birth; the notes match the sample's chart.

### R11-18 — Prices, the questions and the dawn (USER-FACING) · Opus
Objective: the pricing slot shows the three bundles from the catalogue with nothing to buy yet, the FAQ answers first, and the
dawn closes the page (ADR-118).
Files: `web/src/site/sections/Pricing.tsx`, `Faq.tsx`, `Dawn.tsx`; new `web/src/site/data/faq.ts` (+ test).
Refs: landing scope 11 to 13; pricing-and-launch Bundles and prices; ADR-111, 116 to 118, 142; R-6.3, 6.4; readings 2, 13, 17.
Done when:
- Prices, above the FAQ: each `BUNDLES` row's name, line, `formatEuro` price and credits, "VAT included", one credit for any
  report (R-6.4), and `ReportCta`; no offer, no countdown, no literal price.
- `FAQ_GROUPS`: fifteen questions in five groups, ten marked for the home page, each answered in its first sentence; AI named
  once, in "How is the report written?"; "Is this scientific?" as locked; any price read from the catalogue; on the home page
  all ten visible and "See all the questions" to /faq; tests for the counts and the one mention of AI. The Owner reviews them.
- Dawn: "Start with your birth date." and "Then add where you were born, and your birth time if you know it." over the dawn light
  and the rising Sun on a full-width horizon, with `ReportCta`; still under reduced motion.

---

## Group C — the seven pages and the home page whole

### R11-19 — /sky, the free birth chart (USER-FACING) · Opus
Objective: the free chart as a page: the sky now until a birth is typed, then that chart with its placements and a guide to the wheel.
Files: `web/src/site/pages/SkyPage.tsx`; new `web/src/site/components/Placements.tsx`, `ReadTheWheel.tsx`; `HorizonWheel.tsx`,
`SkyForm.tsx` and `site/lib/sky.ts` only as the page needs.
Refs: annex /sky; landing scope 4, 17; ADR-107 to 109, 116; readings 2, 5; the artifact's /sky.
Done when:
- The annex's H1 and first sentence; copy above the horizon, the form below it, the wheel across both; before input the sky now
  over the visitor's town; the prerender shows the sample's chart as the worked example; Show my chart rewinds the wheel in
  place (no sky screen).
- The result: "Sun in …, Moon in …, … rising." from the chart; the placements table (planet, position, house with its word;
  Rising and Midheaven rows; no House column and the Moon's day range without a time); "How to read the wheel" in four parts,
  each lighting its layer on hover or tap; `ReportCta` at the end.
- At 390 px the table fits without sideways scroll; still under reduced motion.

### R11-20 — /sample, a whole report with every citation (USER-FACING) · Opus — provisional MB-90
Objective: Audrey Hepburn's stored run read end to end as a Personal natal report, every claim marked and opening its evidence.
Files: `web/src/site/pages/SamplePage.tsx`; new `web/src/site/components/SampleHead.tsx`, `SampleRail.tsx`; report components it
reuses, only where they cannot render on the server (named in the builder's report).
Refs: annex /sample; natal-report-ui (citations); review-25-09; ADR-22, 49, 98, 104, 119; MB-90, 101; reading 4; pinned sample.
Done when:
- The annex's first sentence; the head (a brass opening ring with her name, Sun and Moon at their true angles, the Ascendant
  marker, a legend); a sticky rail of the ten chapters in their accents; every block of the run in the report page's order,
  chapter 2 with the wheel, three triad cards and twelve house cards, a card lighting its house.
- Each claim marked in place with its number in reading order; a tap opens the evidence card (the claim, a row per reference
  with kind, label and glossary line, a footer count), beside the line on desktop, a bottom sheet on a phone; all 63 anchor.
- The fine print (public birth data, Astro-Databank AA; no connection to her family or estate); the whole text in the
  prerendered HTML; absent from a production build while `SAMPLE_LIVE` is false.

### R11-21 — /method and /compatibility (USER-FACING) · Opus
Objective: how we make the report, step by step, and what the Compatibility report is, each on its own page.
Files: `web/src/site/pages/MethodPage.tsx`, `CompatibilityPage.tsx`.
Refs: annex /method, /compatibility; ADR-40, 63, 97, 113, 117, 120; R-6.4; MB-93; readings 6, 7, 17.
Done when:
- /method: the annex's first sentence; four steps, text left and the sample's real data right: the chart (astronomy-engine,
  accurate to within one arcminute and tested against NASA's JPL Horizons, per its README), the notes (reading 6), the writing
  (the ten chapters), the check (one real claim with each reference ticked); the three facts; the one AI answer outside the
  FAQ, "Is the report written by AI?", at the end.
- /compatibility: the annex's H1 and first sentence; lens tabs, strapline, `TwoPlates` and the seven chapter titles; three
  steps (each has a Personal natal report, added from the dashboard or sent; you say who they are; you get it); no score,
  everyday life, one credit (R-6.4); a table of the two reports; three questions; `ReportCta`; no pair text (MB-93), no "invite".

### R11-22 — The two Learn pages (USER-FACING) · Opus
Objective: what whole-sign houses are and what happens without a birth time, answered first and shown with live diagrams.
Files: `web/src/site/pages/LearnHousesPage.tsx`, `LearnBirthTimePage.tsx`; new `web/src/site/components/HouseRing.tsx`,
`web/src/site/lib/learn.ts` (+ test).
Refs: annex both Learn pages; landing acceptance "Houses turn true"; ADR-98, 116; R-4.2, 6.1; readings 4, 5.
Done when:
- Houses: the H1 answered by definition; a bare ring with a rising-sign picker, the zodiac turning past houses that stay put,
  counted from the east downward; the sample's wheel with her 1st and 4th houses lit and a computed sentence; the twelve houses
  (`HOUSE_WORDS`, `HOUSE_THEMES`); whole sign against Placidus (undefined above about 66°); "Why does Stars Decoded use
  whole-sign houses?" attributed to Brennan's *Hellenistic Astrology* (2017), never "more accurate".
- Birth time: the H1 and first sentence; what the date settles and what the time settles; the sample's day computed (the rising
  sign's window over Brussels and her minutes from the next sign); a day slider over today above the visitor's town (the rising
  sign and its window, houses, the Moon's and Sun's move); R11-17's three plates; where to find a birth time; adding it later,
  free once.
- `learn.ts` tests: picking Leo puts Taurus in the 10th; the sample's window equals a minute-by-minute engine sweep; nothing typed.

### R11-23 — /faq and /waitlist (USER-FACING) · Sonnet
Objective: every question on one page, and the waitlist's own page, which also confirms an address.
Files: `web/src/site/pages/FaqPage.tsx`, `WaitlistPage.tsx`.
Refs: annex /faq; ADR-116, 141, 145; readings 1, 11, 12, 17.
Done when:
- /faq: "Questions people ask"; a search box that filters as you type; the five topics as a sticky index (chips on a phone);
  the fifteen from `FAQ_GROUPS`, each answered in its first sentence and linking on where a page goes deeper; every answer in
  the HTML.
- /waitlist: an answer-first lede on when Stars Decoded opens and what joining brings; the form (source `page`); what happens next
  (the confirmation email, seven days); `?confirm=` mounts `ConfirmWaitlist`; links to the home and Learn pages; words through
  `/ux-copy`.

### R11-24 — The home page, whole (USER-FACING) · Opus
Objective: the ten sections read as one page at every width and under reduced motion, and a crawler reads all of it.
Files: `web/src/site/pages/HomePage.tsx`; `web/src/site/sections/*.tsx` for fixes only (no other card in the group edits them).
Refs: landing scope 1 to 16, acceptance "Plain words", "Reduced motion", "Phone at 390 px", "Crawlable"; ADR-107 to 118;
`/web-taste`, `/ux-copy`.
Done when:
- The sections in the locked order, each linking on to its page; one big moment (first light), motion after it only explaining.
- From 320 to 1920 px no field leaves its form and nothing overlaps a wheel; at 390 px no sideways scroll; under reduced motion
  nothing animates and every section is whole at first paint.
- On the preview, `curl -A OAI-SearchBot` on `/` returns the H1, the lede, every heading and the ten FAQ answers; the page passes
  `/ux-copy`'s checklist and `/web-taste`'s checks, any deviation listed.

---

## Group D — what the site replaced, the checks that gate a release, IndexNow

### R11-25 — The old pages go, the sky leaves the API, one place for prices (INTERNAL) · Sonnet
Objective: nothing the site replaced stays behind, and a test keeps every price in the catalogue (R-6.3).
Files: delete `web/src/pages/LandingPage.tsx`, `WaitlistPage.tsx`, `waitlist.css`, `web/src/components/waitlist/SkyNow.tsx`,
`web/src/data/demoChart.ts`, `api/src/routes/sky.ts`, `api/src/lib/skyNow.ts` (+ test), and whatever of `web/src/lib/sky-now.ts`
(+ test) nothing uses; `api/src/app.ts`; `api/src/lib/prelaunch.ts` (+ test); `openapi.yaml` (`/sky`, `SkyNow`) and codegen;
new `scripts/src/price-gate.test.ts`.
Refs: landing "What today's page gets wrong", acceptance "No typed numbers"; ADR-107, 142; R-6.3; MB-50, 108; reading 5.
Done when:
- No file imports what went; `OPEN_PATHS` loses `/sky`; nothing in the repo names Aria Solis, `getSkyNow` or `demoChart`;
  codegen twice with no diff; typecheck, both builds and tests green.
- The price gate reads every `.ts` and `.tsx` under `web/src`, `api/src` and `packages/*/src` except tests, generated code and
  `packages/commerce/src/catalogue.ts`, fails on a euro amount (`€24`, `24 €`, `EUR 24`) naming file and line, and is green.

### R11-26 — The QA walk and the smoke read the site (INTERNAL) · Sonnet
Objective: the checks that gate a release walk pages that exist and check what a crawler gets, with no secret.
Files: `api/src/lib/qaAgent/personas.ts` (+ `qaAgent.test.ts`); `.github/workflows/smoke-run.yml`.
Refs: landing acceptance "Existing checks", "Crawlable", "Crawl files"; ADR-86, 115; MB-78; CLAUDE.md (no secret on GitHub).
Done when:
- The personas walk real paths: the buyer `/`, `/sky`, `/chart` (sign-in asked); the skeptic `/method`,
  `/learn/whole-sign-houses`, `/privacy`, `/terms`, `/refunds`, `/company`; `/sample` on staging; each keeps its patterns and
  never the retired name; no persona submits a form (MB-78).
- `smoke-run.yml` adds: robots.txt, sitemap.xml and llms.txt answer 200; `/no-such-page` answers 404; `curl -A OAI-SearchBot` on
  the home page returns an `<h1>`; `/dashboard` carries `X-Robots-Tag: noindex`; no secret, no key.

### R11-27 — IndexNow when production's site changes (INTERNAL) · Sonnet
Objective: Bing, and the AI search that reads its index, hear of changed pages the day they ship, with no secret and no GitHub step.
Files: new `api/src/lib/indexNow.ts` (+ test); `api/src/index.ts`; `web/src/site/head.ts` (a `commit` meta); `web/vite.config.ts`
(the build's commit); new `web/public/indexnow.txt`.
Refs: landing scope 21; ADR-86, 115; MB-75, MB-102; reading 15.
Done when: on production only, after start, a background task that can never fail the start waits (up to 20 minutes) until the
home page's `commit` meta equals the API's own commit, then posts the sitemap's URLs to IndexNow once per commit, with the key
the site serves at `/indexnow.txt` (public by design) as `keyLocation`; the outcome is one log line; tests on fake fetches for
the URL list, the payload and once per commit. It works whether a Release forwards by token or through `promote.yml`.

---

## What moves from the deferred plan (now `docs/rounds/R12-plan.md`)
**Taken into R11, re-planned under new ids:**
- R11-01 (its columns) → the waitlist's four only (R11-03); `bundles`, `stripe_events`, `users`, `launch_entries`,
  `waitlist_sends` and the dropped `credit_type` stay.
- R11-02 (its contract) → the waitlist's shapes only (R11-03); checkout, attribution and the question stay.
- R11-03 (the catalogue) → the three rows and `formatEuro`, placed in `@workspace/commerce` (R11-02); the offers, `priceFor` and
  the offer link stay.
- R11-04 (the commerce package) → the package with the seller, `CHECKOUT_TICK` and `REFUND_RULES` (R11-01, R11-02);
  `LAUNCH_DATE` stays.
- R11-05 (no typed price) → the landing's two prices leave with the old page, and the price gate lands (R11-25).
- R11-06 (the fonts) → whole (R11-04).
- R11-09 (the emails) → the confirmation email only (R11-12); the receipt and the opening email stay.
- R11-10 (the waitlist asks twice) → whole (R11-12), plus production's closed state.
- R11-17 (the legal pages) → R11-11, without Stripe or a checkout gate, the postal line left out while it is missing.
- R11-18 (the waitlist page) → "Check your inbox" and the confirmation only (R11-13, R11-23); attribution and analytics stay.
- R11-22 (the admin waitlist) → the confirmation fields and counts only (R11-12); the opening email stays.
- R11-25 (the Launch view and nav) → the admin waitlist page's counts and CSV columns only (R11-13); the Launch view and
  `AdminNav` stay.

**Stay in R12, untouched:** R11-07 the Stripe seam, 08 the ledger, 11 the loop study, 12 attribution and the question, 13 the
failure lines (MB-91, reading 18), 14 the credits sheet, 15 back from checkout, 16 the gift claim's form, 19 credits hard,
20 the checkout routes, 21 the webhook, 23 the birth form's credit step, 24 the dashboard's asking steps, 26 the walk; and
whatever of 01 to 05, 09, 18, 22 and 25 is not listed above. Its "Proposed R12" (the landing) is this plan. The postal address,
MB-114's check and the Stripe account wait for R12's own /plan.

## Acceptance
**Free, in the round (the gate):** `pnpm install --frozen-lockfile`, typecheck, `build:web` (the prerender included, which fails
on a page without its H1 or lede), `build:api`, unit tests (the engine's pins and the sky; the seller and the catalogue; both
prelaunch seams; the place ranking and the prefill; the registry; the sample's 63 anchors and four claims; the rewind, the
readouts and the Learn sweeps; the head and the crawl files; the FAQ's counts; the waitlist's token, throttle, sweep and closed
state; the email's words; the personas; the price gate), codegen twice with no diff after R11-03 and after R11-25,
`db:bootstrap` on the upgrade path and on an empty scratch Postgres as R11-03 states, **the dry lab once** (R11-01 moved a
brain file; every prompt renders as it does on `main`), and smoke on the Vercel preview with R11-26's crawl checks. The
orchestrator opens each app route on the preview and reads the console of every public page for a hydration mismatch. Nothing
generates or spends; no key is needed. The spec's acceptance is met but for two parts that need production: /sample stays off
it until MB-90, and IndexNow's first ping comes with the first Release.
**On staging after the merge (the Owner's look):**
1. The home page on the live sky: type a birth date and press Show my chart; watch the claims point at the wheel; open your
   people and the prices; every page from the nav and the footer, and /sample with its citations.
2. Add `?prelaunch=1`: production's look. Get my report and Sign in open the waitlist; join and confirm from the email (it
   reaches only the Resend account's own address until runbook L); the admin list shows the address confirmed; Exit on the ribbon.
3. The legal pages name you as the seller and stay drafts until the contact address is in.
Signed in on staging, Get my report goes through sign-in to the birth form, prefilled from the sky screen.

## Production after the round
The round ships nothing to production. The first Release then brings `main` (179 commits ahead of production today, which still
serves #32 of 2026-09-10) to mystarsdecoded.com with the site and the waitlist over it. It waits on: **ask 1**, the contact
address (one edit to `packages/commerce/src/seller.ts` opens production's form and ends the drafts); **ask 2**, Resend's domain
and production's `PUBLIC_APP_URL`, so confirmations reach people and link back to production; and **the Release view on
staging**: the full lab on the five matrix charts, since the brain has changed since production's commit (R06 to R11, v7 among
them), then the gate and the QA agent, within `LAB_BUDGET_USD`; then the fast-forward, by `GITHUB_RELEASE_TOKEN` (ask 3) or
`promote.yml` with the release id (MB-79). The site could go public earlier with the form closed (reading 12), but the four-week
warm-up (ADR-147) starts only with a working form. After the promote: MB-102's steps (Search Console's TXT record in Vercel's
DNS, Bing's import, the host's AI-bot rule at Log, never Deny), the sitemap submitted, MB-13 closed on a link preview, the
bible's release log (R-8.1). Launch stays R12's: checkout, the postal address, `LAUNCHED = true`, a Release.

## Risks
1. **The overlay is a product decision whose Decisions row comes at close** (ADR-151): built on the Owner's words of today,
   stated as reading 1, which the Owner can correct on staging with `?prelaunch=1`. ADR-141 still holds for the API gate, the
   admin's way in and launch as one edit.
2. **The site is public on production before launch** (USER-FACING at the first Release): crawlers index it, and Audrey
   Hepburn's name, chart and four claims sit on the home page before MB-90's check (only /sample waits); if the check fails,
   Marie Curie's run takes the slot in `sample.ts`.
3. **The brain moves** (R-4.4): `chartCalculation.ts` into `packages/engine` byte for byte behind a re-export; `BRAIN_PATHS`
   gains the package, so the Release view sees future engine edits; the dry lab runs once; CLAUDE.md's and the round skill's
   brain lists take the package at close.
4. **Prerender and routing** (R-7.6): a wrong `vercel.json` can take every app route down on staging, and a hydration mismatch
   re-renders a page; each app route is opened on the preview, every public page's console is read, and smoke gains crawl checks.
5. **Schema** (R-7.3): four nullable columns, a unique index and a data update in step 1, tested on the upgrade path staging and
   production take, and on an empty database.
6. **Legal and privacy:** four pages go public on production with the Owner's name, drafts until the contact address; the postal
   address never enters the repo; the fonts leave Google's CDN; one new `sessionStorage` key holds the tab's own birth data
   (reading 14), and the preview key is staging's.
7. **Emails** (USER-FACING): one new template; until Resend's domain is verified it reaches only the Resend account's address.
8. **Weight:** the engine joins the home page's bundle; /sample's run loads only on its page.
9. **Staging shows two sets of bundle names** until R12: the landing's Single, Couple and Family & friends beside the dashboard
   sheet's credit-loop names (ADR-142 supersedes them; the sheet is rebuilt with checkout).
10. **User-visible without a locked spec:** the dialog, the closed line, the confirmation's words, the preview ribbon; each
    passes `/ux-copy` and is listed for the Owner.
11. **No report content change:** /sample shows stored text; no prompt, model or computation changes.
12. **Size:** twenty-seven cards, ten in group B; the shrink path is under Parallel groups. No new npm dependency.

## Questions raised (Notion, 2026-09-30)
- **Raised:** none. The overlay is the Owner's decision of today (ADR-151 at close); every other choice sits on an existing row.
- **Updated:** **MB-115**: the name and the country answered on 2026-09-30; the postal address given by the Owner and held out
  of the public repo until the checkout round; the contact address still open, blocking production's waitlist form; the
  default revised. **MB-108**: this plan takes the package (R11-01). **MB-90**: the overlay puts her name and chart on
  production's home page before launch; only /sample waits for the check. **MB-91**: moves to R12 with hard credits (reading
  18), default revised. **MB-119**: its location half is built here; price_data and the offers wait for R12. **MB-25**: decided
  by ADR-147. **Rounds open** incremented on all 59 carried-over open rows.
- **Read at their defaults:** MB-101 (the run committed as recommended), MB-102 (the Owner's steps at close), MB-116 (no
  analytics), MB-112 (Couple, tagged), MB-33 (regions, tagged), MB-47 (pure tests), MB-93 (no pair text), MB-94 (no place
  index of our own), MB-114 (the Owner's check; nothing in the build).

## For the Owner (three asks, highest stakes first)
Nothing blocks the round: approving this plan starts it (§11.2). These three decide when production gets the site.
1. **A contact address for the legal pages (MB-115), and the name as it will appear.** Before production collects an address,
   the privacy page must say how to reach the person who holds the list; your name and country are in, and your postal address
   stays out of the public repo until checkout. Recommendation: a dedicated address on mystarsdecoded.com that forwards to your
   inbox (a forwarding service's two DNS records go into Vercel's DNS, about ten minutes), or any address you use only for Stars
   Decoded; and say whether "Alexandra Bendicakova" should carry accents. If silent: the address stays a placeholder, the legal
   pages keep their draft banner, production's waitlist form stays closed, and the name appears as given.
2. **Resend's domain (runbook L).** Every sign-up now gets a confirmation email; until mystarsdecoded.com is verified in Resend,
   only the Resend account's own address receives mail, so nobody else could confirm. Recommendation: runbook L's Resend lines
   (its DKIM and SPF records into Vercel's DNS, Verify, `RESEND_FROM_EMAIL` on both Railway environments) and
   `PUBLIC_APP_URL=https://mystarsdecoded.com` on Railway production if it is not there; about ten minutes, with ask 1. If
   silent: the first Release waits, since a form whose confirmations reach nobody collects addresses deleted after seven days.
3. **MB-75, `GITHUB_RELEASE_TOKEN` on Railway staging**, still the release todo. Recommendation: place it as the runbook says, so
   the Release view fast-forwards production itself. If silent: the Release stops at `passed` and `promote.yml` fast-forwards it
   with the release id (MB-79): one more step for us, none for you.

## Close (the orchestrator)
- **Decisions: ADR-151** (not ADR-150, which #72 took): "Until launch, production shows the public site to everyone, with the
  waitlist over every call to write or sign in; the app stays the admin's." Its body from readings 1 to 3 and 12; supersedes
  ADR-141 in part (every visitor seeing the waitlist page; `GET /api/sky`); Masterfile refs §6, R-3.4, R-7.6; source: the Owner,
  2026-09-30.
- **Mailbox:** done MB-50 (the fabricated chart deleted), MB-101 (committed), MB-108 (the package); MB-90, 91, 102, 115 and 119
  stay open with their notes; rows the builders raise, and the round's new strings for the Owner's look.
- **MASTERFILE 0.19:** §6's "until launch production shows the waitlist alone (ADR-141)" becomes ADR-151's sentence; §2 item 7
  names the seller's constant in `@workspace/commerce` and the legal pages as public before launch; R-6.3 says the catalogue
  lives in `@workspace/commerce` (MB-119); §3 gains `waitlist_signups` with its confirmation columns.
- **CLAUDE.md:** the brain gains `packages/engine/`; the waitlist line (the site public; the API open to healthz, `/waitlist`,
  `/waitlist/confirm` and `/admin/*`); the MB-108 line becomes "the web imports the engine package"; the current focus: R11
  shipped, production waiting on asks 1 and 2 and a Release, R12 next. The round skill's brain list gains `packages/engine/`.
- **INDEX:** the code map gains `packages/engine`, `packages/commerce`, `web/src/site/` (pages, sections, components, data, head,
  crawl), `entry-server.tsx`, `web/scripts/prerender.mjs`, `PlaceField`, `form-draft.ts`, `processors.ts`, `indexNow.ts` and
  `fixtures/sample-people/`, and loses the old landing and waitlist pages, `skyNow.ts`, the sky route and `demoChart.ts`; Specs
  marks the landing built and pricing-and-launch R12; Decisions counts 151 rows.
- The Owner gets the staging URL with the three lines above, and MB-102's steps for after the first promote.

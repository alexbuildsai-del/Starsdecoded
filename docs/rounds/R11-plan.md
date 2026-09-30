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

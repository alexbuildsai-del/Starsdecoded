# Draft spec — the landing page and AI search ("First light")

Raised by the Owner 2026-09-25: a landing page with beautiful visuals, transitions and
copy in the brand, built to be found and cited by ChatGPT and other AI search, with the
Dashboard Sky orbit under the product features.

Artifact: https://claude.ai/artifact/Rx9GsG4ZUA8Gnxif6fHWbV (draft 1). The page in it is
live: the hero sky is computed in the browser with astronomy-engine 2.1.19 and the calls
in `chartCalculation.ts` (checked against the fixtures: Audrey Hepburn's Sun 13.12°
Taurus, Moon 6.45° Pisces and rising 28.62° Aquarius match to the hundredth), the excerpt
is unedited r06 text, and the orbit is Dashboard Sky (ADR-89 to 96).

## What today's page gets wrong

- `web/src/data/demoChart.ts` hand-types "Aria Solis". The engine disagrees on every
  angle (rising 26.2° Gemini, not 2.1° Cancer). Six glyphs orbit at arbitrary speeds and
  `samplePlanets` lists invented degrees. Both break R-3.1 and §9.
- "€24" is typed at `LandingPage.tsx:163`, `:280` and `BirthFormPage.tsx:566`. No price
  constant exists (R-6.3).
- Every CTA goes to `/chart`, behind `RequireAuth` (`App.tsx:171-184`), against R-3.4.
- "Ten sections of insight" lists registry labels, not the report's ten chapters
  (`ReportPage.tsx:52-63`), MB-8. "Personal natal report" and compatibility never appear.
- The SPA ships `<div id="root"></div>`. GPTBot, OAI-SearchBot, ClaudeBot and
  PerplexityBot do not run JavaScript, so they see a title and one sentence. No
  robots.txt, sitemap, canonical or JSON-LD; unknown paths answer 200.

## Scope

**A. The page, top to bottom** (copy as in the artifact; every number read from code)

1. **Nav.** Wordmark; The report, Inside, Your people, Method, FAQ; Sign in; Get my
   report. Every CTA opens the birth form without an account.
2. **Hero, the live sky.** Eyebrow "Personal natal report"; H1 "The sky you were born
   under, read closely."; the lede. The wheel is the sky now over the visitor's time-zone
   city, framed on the Ascendant: sign band, five-degree ticks, whole-sign house ring,
   aspects in the inner disc, bodies on three lanes (ADR-17), MC marked, the brass angle
   marker at east. The dotted horizon runs across the full width at the wheel's centre,
   labelled "EAST · RISING" and "WEST · SETTING"; the H1 sits above it, everything you act
   on below it. HUD corners: live time, city and coordinates, "WHOLE SIGN · TROPICAL",
   day or night with the Sun's altitude. Redrawn every minute. Hover names a body.
3. **The free sky.** Birth date, optional time, place. Draw my sky rewinds the wheel from
   now to the birth minute (real positions every frame, trails, the date counting down),
   then names Sun, Moon and Rising with the legend rows. No time: no horizon, no houses,
   the Moon as the day's arc, the line "Add your birth time to draw the horizon". Nothing
   is stored. "Get the report for this sky" opens the birth form prefilled.
4. **Every claim, cited.** The public sample's real report text with superscripts. A
   number lights its placements on the sample's wheel (bodies pulse, the rest dim, the
   aspect line draws, the house tints) and opens the evidence card: claim in italic serif,
   kind chips in the evidence colours, "n verified references · whole sign · tropical".
   Cycles slowly until touched.
5. **Inside.** The ten chapter names from the registry with their fixed hues, plus the
   chart explorer; each opens the sample's first lines under the ghost numeral.
6. **Your people.** Dashboard Sky's orbit and card as locked, on a sample account of
   synthetic people. Below it the Compatibility report: lens doors and straplines from
   `lenses.ts`, a computed bi-wheel with lines within 4° (flows teal, rubs rose, meet
   brass), counts, "No score".
7. **Method.** Three steps (computed, briefed, written and checked) with the sample's
   real readout and brief facts; three facts (the writer never sees birth data, no
   predictions, the credit back on failure); the three birth-time options as plates.
8. **Price.** One card, price from the constant: ten chapters, twelve house readings,
   citations, one free time update, PDF, delete. A Compatibility report uses one credit.
9. **FAQ.** Ten questions, answer first, all visible (no accordions).
10. **The dawn.** "Your sky happened once. Read it closely." over the report's dawn light
    and Sun rising behind a full-width horizon; footer with the `EPHEMERIS` line and an
    Updated date.
11. **Motion.** One easing, `cubic-bezier(.16,1,.3,1)`. First light on load: the horizon
    draws, stars gather into the ring (1.6 s), the band settles, bodies rise from the
    Ascendant 70 ms apart. The rewind 2.9 s. Nothing waits at opacity 0; reduced motion
    renders everything still.
12. **Phone.** Container queries: one column, the wheel full width with the HUD above and
    below it, horizon labels hidden, fields stacked, Draw my sky scrolls the wheel into
    view first, the orbit card a bottom sheet.

**B. Found by AI**

13. **Real HTML.** Public routes (`/`, `/sky`, `/sample`, `/method`, `/compatibility`,
    `/learn/whole-sign-houses`, `/learn/birth-time`, `/faq`, the legal pages) are
    prerendered at build inside the web app with React's `renderToString` and wouter's
    `ssrPath`, keep `#root` (the smoke check reads it) and hydrate. The static wheel is the
    sample chart computed at build from its fixture; the live sky replaces it on hydrate.
14. **Crawl surface.** robots.txt (allow `*`, disallow `/api/` and `/admin/`, Sitemap
    line), sitemap.xml with `lastmod`, a canonical, `og:url` and Twitter tags per page.
    `X-Robots-Tag: noindex` on `/report`, `/compatibility/:id`, `/dashboard`, `/claim`,
    `/chart`, `/admin`. Unknown public paths answer 404.
15. **Structured data.** Organization (with sameAs), WebSite, Product and Offer (price
    from the constant), Article with `dateModified` for `/sample`, `/method` and `/learn/*`,
    BreadcrumbList; FAQPage optional; no review markup until real reviews exist.
16. **Answer first.** Each page opens with one sentence that answers its question alone
    (the artifact's page table), question headings where the page answers one, and an
    Updated date that changes only with the content.
17. **Registration.** Bing Webmaster Tools and Search Console verified, IndexNow pinged on
    deploy, Vercel's AI-bot firewall rule Off or Log. Dashboard steps, no GitHub secret.
18. **Measurement.** Search Console's AI report, Bing's AI Performance,
    `utm_source=chatgpt.com` referrals, crawler hits in the logs; events ride MB-11.
19. **llms.txt**, last (draft in the artifact).

**C. Voice**

20. **Marketing voice v1**, the six rules in the artifact, one page in
    `docs/annex/marketing-voice.md`, linked from MASTERFILE §9 in place of the
    "not written yet" line.

## Out of scope

- Checkout, credits bundles and prices (MB-5, MB-6), the legal entity (MB-31).
- Placement pages ("Mars in the 10th house"), a comparison page, an "Is astrology real?"
  page: later, once a checked writer exists for them (question 3).
- Off-site mentions (YouTube, Reddit, "best of" lists): the launch plan, MB-25.
- Moving marketing to Astro: revisit past a few dozen pages.
- A light theme, a new palette, an animated or per-chart mark (§9, logo.md).

## Acceptance criteria

- Nothing on any public page that looks like a chart is typed: every wheel, plate,
  degree and orb comes from `calculateNatalChart` or the same astronomy-engine calls, and
  a test pins the hero math to the fixtures (Audrey Hepburn and Marie Curie to 0.01°).
- `grep` finds no literal price, chapter count or word count in `web/src/pages`; the page
  reads the price constant, the chapter registry and the measured length.
- Signed out, every CTA reaches the birth form; the free sky prefills it and stores
  nothing server-side.
- `curl -A OAI-SearchBot https://<preview>/` returns the H1, the lede, the section
  headings and the FAQ text in HTML; the same for each public route.
- robots.txt, sitemap.xml and llms.txt answer 200 with the right types; app routes carry
  noindex; `/no-such-page` answers 404; JSON-LD validates in the Rich Results test.
- Sample text on the page is byte-identical to a stored lab run of the sample fixture.
- Reduced motion: no animation runs and every section is complete at first paint.
- Phone at 390 px: no horizontal scroll, nothing overlaps the wheel, the rewind is
  on screen when it plays.
- The smoke check and the QA agent's landing expectations still pass (`id="root"`,
  `/natal|chart|report/i`, `/whole.sign|astronomy/i`, never `/Astra/`).
- The dry lab is not needed: nothing in the brain changes.

## Screens

All in the artifact: the page (desktop, live), What changes, Phone (live at 390 px),
Found by AI (the engine flow, today's HTML against prerendered, the page table with each
quotable sentence, an illustrated answer, robots.txt and llms.txt drafts, the plan),
Voice, Motion, Decisions, Questions.

## Open questions

1. **Whose report is the public sample?** Recommend Audrey Hepburn, as the fixtures plan:
   birth-certificate time (AA). Her estate licenses her name and likeness, so text and
   chart only, no photo, with a one-line legal check beside MB-31. Alternatives: Marie
   Curie (no rights issue, time not from a record) or a synthetic person.
   Default: Audrey Hepburn, text and chart only.
2. **Let AI companies train on public pages?** Recommend yes: allow GPTBot, ClaudeBot and
   Applebot-Extended as well as the search crawlers, so future models know us without a
   search. Google-Extended stays allowed either way (blocking it drops Gemini grounding).
   Default: allow all on public pages.
3. **How candid, and how far?** Recommend keeping "Is this scientific?" as written (the
   astronomy is exact, the meanings are tradition) and launching with the eight
   cornerstone pages; placement pages wait for a checked writer.
   Default: the FAQ as written, eight pages at launch.

## Decisions to record

- **ADR-97 The landing opens on the live sky.** The sky now over the visitor's time-zone
  city, computed in the browser with the engine's calls, framed on the Ascendant with the
  horizon across the page. Replaces the Aria Solis demo; every chart on the page is computed.
- **ADR-98 The free sky hands off.** Date, optional time and place rewind the hero to the
  birth sky and name Sun, Moon and Rising; no account, nothing stored; the data prefills
  the birth form, which opens without sign-in (R-3.4).
- **ADR-99 Proof by citation.** Real, unedited sample text with live superscripts lighting
  its wheel; each Release regenerates the sample.
- **ADR-100 Numbers come from code.** Price (one constant), chapter names (the registry,
  closes MB-8), length, house readings and the method line are read, never typed.
- **ADR-101 The orbit sells the second person.** Dashboard Sky's orbit and card on the
  landing with synthetic sample fixtures (birth data only), and the Compatibility report
  on a computed bi-wheel. No living person's name on a marketing page.
- **ADR-102 Public pages are real HTML.** Prerendered in the web app, `#root` kept,
  hydrated; app routes noindex; unknown public paths 404. Astro considered, not chosen.
- **ADR-103 Found by AI.** robots.txt open to search and answer crawlers, sitemap with
  lastmod, canonical and OG per page, the JSON-LD set in scope 15, Bing Webmaster Tools,
  IndexNow and Search Console, the AI-bot firewall never Deny, llms.txt last.
- **ADR-104 Answer first.** Every public page opens with a sentence that answers its
  question alone and shows an Updated date that changes only with its content.
- **ADR-105 Marketing voice v1.** The six rules; closes the voice half of MB-25.
- **ADR-106 The dawn closes the page.** The report's dawn light and Sun over a full-width
  horizon, with the last call to action.

# Draft spec — the landing page and AI search ("First light")

Raised by the Owner 2026-09-25: a landing page with beautiful visuals, transitions and
copy in the brand, found and cited by ChatGPT and other AI search, with the Dashboard
Sky orbit under the product. Draft 5, 2026-09-26: headings you would say out loud.

Artifact: https://claude.ai/artifact/Rx9GsG4ZUA8Gnxif6fHWbV (draft 5), live: the sky is
computed in the browser with astronomy-engine 2.1.19 and the calls in `chartCalculation.ts`,
to the hundredth of the fixtures (Audrey Hepburn: Sun 13.12° Taurus, Moon 6.45° Pisces,
rising 28.62° Aquarius). Claims are unedited r06 text; the orbit is Dashboard Sky.

## Drafts 2 to 5, after the Owner's notes

Kept as loved: first light, the sky screen, the chart, the orbit, the two charts on one
horizon, Inside, Method, birth time and the dawn's Sun.
- Draft 2: the sky screen, one claim at a time, general chapters, no word counts, copy
  for people who will never know their birth time, pricing parked.
- Draft 3: the form's place field; fields that fit; claims on a timer with nothing behind
  them; named houses on every wheel; a quieter orbit; no age band.
- Draft 4: every word rewritten with the new `/ux-copy` skill, four plainer real claims,
  plain chart labels; `/ux-copy` and `/web-taste` join `.claude/skills/`.
- Draft 5: headings said, never "noun, phrase"; both reports named; the method with no
  model or vendor; the dawn asks for the date and place the form needs.

## What today's page gets wrong

- `demoChart.ts` hand-types "Aria Solis" (R-3.1); "€24" is typed three times (R-6.3);
  every CTA goes to `/chart` behind `RequireAuth` (`App.tsx:171-184`), against R-3.4.
- "Ten sections of insight" lists registry labels, not the chapters (MB-8); neither
  product is named; the place list has no OpenStreetMap credit (`BirthFormPage.tsx:156`).
- The SPA ships an empty `#root`: AI crawlers run no JavaScript. No robots.txt, sitemap,
  canonical or JSON-LD; unknown paths answer 200.

## Scope

**A. The page, top to bottom** (copy as in the artifact; every number read from code)

1. **Nav.** Wordmark; Example, What's inside, Your people, How it works, FAQ; Sign in;
   Get my report. Every CTA opens the birth form without an account.
2. **Hero.** "Find out what your birth chart says about you" over the live wheel at full
   height: the sky now over the visitor's city, on the Ascendant, the horizon across the
   page. Form and result share one slot. Fields sit three, two or one per row; the time
   always shows AM or PM; phone inputs are 16 px. Below 900 px the hero stacks.
3. **The sky screen.** Show my chart lifts the wheel into a full-screen sky (FLIP, 0.75
   s). It rewinds to the birth minute (real positions, trails, a countdown date), then
   names Sun, Moon and Rising, with "Get my full report" and "Try another date". Close or
   Escape flies it back; the hero keeps that sky with a summary. No time: no horizon or
   houses, and the Moon as the day's arc. Nothing stored; the birth form opens prefilled.
4. **Places, the birth form's field.** The landing reuses the birth form's place search
   as it is: one component, one behaviour. Its list gains "© OpenStreetMap contributors",
   in the form too. The artifact runs the field on a GeoNames copy only to work offline.
5. **Every claim, cited.** In view, the wheel rewinds once from now to the sample's
   birth. Four real claims, the plainest the run cites by `/ux-copy`'s test, then take
   turns every 6.5 s, each with its evidence, a line from its number to its place
   and a line filling under its tab. A tap stops the cycle. Nothing sits behind the
   claims, nothing is tied to scrolling; reduced motion shows four still tabs.
6. **Inside.** The ten chapter names from the registry in their hues. Each has one
   sentence from its prompt and the parts it covers. The list steps through while in
   view, until touched.
7. **Your people.** Dashboard Sky's orbit and card as locked, on synthetic sample people;
   the ring at .26, cut away around each person and name, on the dashboard too.
8. **Two charts, one horizon.** Two triad plates on their own Ascendants, both horizons
   on one dotted line with a violet knot. Lower halves shaded; Sun and Moon at their
   degrees, the inner lane within 14° of the Ascendant (ADR-17). Doors and straplines from
   `lenses.ts`, rewritten plainly; seven chapters, a line each. No score, no age band.
9. **Method.** Three steps with the sample's readout and brief: we work out your chart,
   note what stands out, write your report and check it. No model or vendor is named.
   Facts: the writing service never sees birth data, no predictions, credit back on failure.
10. **Birth time.** Written for people who only have what a parent remembers, or
    nothing. Three plates carry the product's readouts: I know it (the rising sign),
    Roughly ("3 possible: Pisces, Aries, Taurus · flips at 07:12, 08:26", the Moon
    holding), I don't know (the Moon's arc that day). Parts of the day: `birth-time.ts`.
11. **Pricing, parked.** A marked slot above the FAQ until the pricing session (MB-5,
    MB-6). The price will come from one constant.
12. **FAQ.** Ten questions, answer first, all visible. AI is named once, plainly, in "How
    is the report written?". The Owner reviews the wording.
13. **The dawn.** "All you need is your birth date and place", as the form needs both,
    over the dawn light and rising Sun. The footer: `EPHEMERIS`, an Updated date, credits.
14. **The wheel.** Every wheel is the product's wheel component, so it follows
    `review-25-09`: the band names each house under its sign ("10 · CAREER"), the inner
    number ring goes, and a printed house carries its word ("1st (self)"). A blind chart
    draws no house line. Built before that round, the landing inherits it on merge.
15. **Motion.** One easing, `cubic-bezier(.16,1,.3,1)`. First light takes about 2.3 s:
    the horizon draws, stars gather into the ring, the bodies rise 70 ms apart. The
    rewind takes 2.9 s. Nothing waits at opacity 0; reduced motion renders still.
16. **Phone.** One column by container query: the wheel full width, fields stacked, the
    sky screen full. Claims stack, the line rising from them; the orbit card is a sheet.

**B. Found by AI** (as draft 1)

17. **Real HTML, eight pages.** `/` and seven new pages (`/sky`, `/sample`, `/method`,
    `/compatibility`, `/learn/whole-sign-houses`, `/learn/birth-time`, `/faq`), plus
    legal, prerender at build with `renderToString` and `ssrPath`. Their words pass
    `/ux-copy`; the artifact's page table has each page's opening sentence.
18. **Crawl surface.** robots.txt allows `*`, not `/api/` or `/admin/`; a sitemap with
    `lastmod`; canonical, OG and Twitter tags; app routes noindex; unknown paths 404.
19. **Structured data.** Organization, WebSite, Product and Offer, Article with
    `dateModified`, BreadcrumbList; FAQPage optional; no review markup.
20. **Answer first.** Each page opens with a sentence that answers its question alone.
21. **Registration and measurement.** Bing Webmaster Tools, Search Console, IndexNow on
    deploy; the AI-bot rule Off or Log; AI reports, `utm_source=chatgpt.com`, crawler
    hits; events ride MB-11; no GitHub secret. **llms.txt** comes last.

**C. Voice**

22. **Marketing voice.** `.claude/skills/ux-copy` (the coffee test and thirteen rules on
    the report's style contract) and `.claude/skills/web-taste` for the look. MASTERFILE
    §9 links both in place of "not written yet".

## Out of scope

- Pricing, packages, checkout and credits (MB-5, MB-6), and the legal entity (MB-31).
- Mailbox topics at lock: rectification (a birth time estimated from life events), and
  our own place index (135,233 GeoNames towns with zones, in the artifact) for the day
  Nominatim's limits bite. The wheel's redesign belongs to `review-25-09`.
- The report's own prose. No Sun or Ascendant claim in the sample run passes `/ux-copy`:
  the claims echo `vocabulary.ts` ("The Moon is the body…"), and the style contract's
  model sentence has the "X first, Y second" shape. A Mailbox topic for the prose study.
- Placement pages, a comparison page, "Is astrology real?" (question 3), off-site
  mentions (MB-25), Astro, a light theme, a new palette, a per-chart mark (§9).

## Acceptance criteria

- **Charts are computed.** Every wheel, plate, degree and readout comes from
  `calculateNatalChart` or the same calls. A test pins the hero to the fixtures (Audrey
  Hepburn, Marie Curie) to 0.01°.
- **No typed numbers.** No literal price or word count in `web/src/pages` or the
  prerendered HTML. Chapter names come from the registry.
- **Signed out, every CTA reaches the birth form.** The sky screen prefills it and stores
  nothing server-side.
- **One place field.** The landing and the birth form render the same place component,
  and its list shows the OpenStreetMap credit.
- **Fields fit.** From 320 to 1920 px no field leaves the form, the time shows AM or PM
  in full, and phone inputs are 16 px.
- **Stable page.** The sky screen keeps the scroll position; nothing below the hero moves.
- **Claims point true.** Each line ends on a body or angle drawn at the degree its
  evidence names. The claim text is byte-identical to a stored lab run of the sample.
  The claims change on a timer, never on scroll.
- **Compatibility.** Plates are computed from the pair's birth data. No score, number of
  fit or age band appears.
- **Crawlable.** `curl -A OAI-SearchBot` returns the H1, lede, headings and FAQ text on
  every public route.
- **Crawl files.** robots.txt, sitemap.xml and llms.txt answer 200. App routes carry
  noindex, `/no-such-page` answers 404, and the JSON-LD validates.
- **Plain words.** Every string on the public pages passes `/ux-copy`, and every page
  passes `/web-taste`'s checks. Each Release picks the four claims again by that test.
- **Reduced motion.** Nothing animates; every section is complete at first paint.
- **Phone at 390 px.** No horizontal scroll, nothing overlaps the wheel, and the sky
  screen fills the phone.
- **Existing checks.** The smoke check and the QA agent's landing expectations pass
  (`id="root"`, the natal and whole-sign patterns, none of the retired name). The brain
  is untouched, so no dry lab.

## Screens

All in the artifact: the page (live, desktop), Draft 5, What changes, Phone (live at
390 px, sky screen included), Found by AI (engine flow, HTML before and after, page
table, robots.txt, llms.txt), Voice, Motion, Decisions, Questions.

## Open questions

1. **Whose report is the public sample?** Recommend Audrey Hepburn (birth certificate
   time, AA), text and chart only with a legal line beside MB-31; or Marie Curie, or a
   synthetic person. Default: Audrey Hepburn, text and chart only.
2. **Let AI companies train on public pages?** Recommend yes: GPTBot, ClaudeBot and
   Applebot-Extended as well as the search crawlers. Default: allow all on public pages.
3. **How candid, and how far?** Recommend "Is this scientific?" as written, the eight
   pages at launch, and their full words drafted in the artifact before lock. Default:
   the FAQ as written; the pages written in the round and checked on the preview.

## Decisions to record (numbers provisional until lock)

- **ADR-97 The landing opens on the live sky.** The sky now over the visitor's city,
  computed in the browser, on the Ascendant, drawn with the product's wheel. Replaces
  Aria Solis.
- **ADR-98 The free sky is its own screen.** Date, optional time and place open a
  full-screen sky that rewinds to the birth and names Sun, Moon and Rising. Nothing is
  stored, and the birth form opens prefilled (R-3.4).
- **ADR-99 One place field.** The landing reuses the birth form's place search as it is,
  with the OpenStreetMap credit. Our own index waits in the Mailbox.
- **ADR-100 Proof by citation, on a timer.** The wheel rewinds to the sample once in
  view; four real claims, picked by `/ux-copy`, take turns, each drawn to its place.
  Nothing behind them, nothing tied to scroll. Each Release regenerates the sample.
- **ADR-101 Chapters in general terms, no word counts.** Registry names (closes MB-8),
  each described from its prompt. Marketing copy never states a length.
- **ADR-102 The orbit sells the second person.** Dashboard Sky with synthetic people; the
  ring at .26 and cut around each person, dashboard included (amends ADR-89 to 96).
- **ADR-103 Two charts, one horizon.** Two triad plates on one horizon, with the lens's
  seven chapters. No combined chart, no score, no age band.
- **ADR-104 Public pages are real HTML.** Prerendered in the app, `#root` kept, app
  routes noindex, unknown public paths 404. Astro not chosen.
- **ADR-105 Found by AI.** Open robots.txt, a sitemap, canonical, OG, JSON-LD, Bing,
  IndexNow and Search Console. The AI-bot firewall is never Deny; llms.txt comes last.
- **ADR-106 Answer first.** Each public page opens with a sentence that answers its
  question alone, and an Updated date that moves only with its content.
- **ADR-107 Marketing voice lives in `/ux-copy`.** The coffee test on the style contract:
  headings said, never "noun, phrase"; both reports named; no model or vendor, and AI
  never leads. `/web-taste` for the look. Closes the voice half of MB-25.
- **ADR-108 The dawn closes the page.** Dawn light and the Sun over a full-width
  horizon, with the last call to action. Pricing takes its slot above the FAQ.

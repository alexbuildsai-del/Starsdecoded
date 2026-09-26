# Draft spec — the landing page and AI search ("First light")

Raised by the Owner 2026-09-25: a landing page with beautiful visuals, transitions and
copy in the brand, found and cited by ChatGPT and other AI search, with the Dashboard
Sky orbit under the product. Draft 6, 2026-09-26: seven more pages, each designed.

Artifact: https://claude.ai/artifact/Rx9GsG4ZUA8Gnxif6fHWbV (draft 6), live: the sky is
computed in the browser with astronomy-engine 2.1.19 and the calls in `chartCalculation.ts`,
to the hundredth of the fixtures (Audrey Hepburn: Sun 13.12° Taurus, Moon 6.45° Pisces,
rising 28.62° Aquarius). Claims are unedited r06 text; the orbit is Dashboard Sky.

## Drafts 2 to 6, after the Owner's notes

Kept as loved: first light, the sky screen, the chart, the orbit, the two charts on one
horizon, Inside, Method, birth time and the dawn's Sun.
- Draft 2: the sky screen, one claim at a time, general chapters, no word counts, copy
  for people who will never know their birth time, pricing parked.
- Draft 3: the form's place field; fields that fit; claims on a timer with nothing behind
  them; named houses on every wheel; a quieter orbit; no age band.
- Draft 4: every word rewritten with the new `/ux-copy`, four plainer real claims, plain
  chart labels; `/ux-copy` and `/web-taste` join `.claude/skills/`.
- Draft 5: headings said, never "noun, phrase"; both reports named; the method with no
  model or vendor.
- Draft 6: the seven pages designed; labels back ("No predictions"); `/ux-copy` rebuilt
  on humanizer, speak-human's reader step and research on what AI search quotes.

## What today's page gets wrong

`demoChart.ts` hand-types "Aria Solis" (R-3.1), "€24" is typed three times (R-6.3) and
every CTA hits `RequireAuth` (R-3.4). It lists registry labels, not chapters (MB-8), names
neither product, credits no map data, and ships an empty `#root` with no robots.txt,
sitemap or JSON-LD, so AI crawlers read a title and one sentence.

## Scope

**A. The home page, top to bottom** (copy as in the artifact; every number from code)

1. **Nav.** Wordmark; Free chart, Sample report, Compatibility, How it works, FAQ; Sign
   in; Get my report. Every CTA opens the birth form without an account.
2. **Hero.** "Find out what your birth chart says about you" over the live wheel at full
   height: the sky now over the visitor's city, on the Ascendant, the horizon across the
   page. The lede names Stars Decoded. Fields sit three, two or one per row; the time
   always shows AM or PM; phone inputs are 16 px. Below 900 px the hero stacks.
3. **The sky screen.** Show my chart lifts the wheel into a full-screen sky (0.75 s),
   rewinds to the birth minute (real positions, trails, a countdown date), then names
   Sun, Moon and Rising. Close flies it back and the hero keeps that sky. No time: no
   horizon or houses, the Moon as the day's arc. Nothing stored; the form opens prefilled.
4. **Places, the birth form's field.** The landing reuses the birth form's place search
   as it is: one component, one behaviour. Its list gains "© OpenStreetMap contributors",
   in the form too. The artifact runs the field on a GeoNames copy only to work offline.
5. **Every claim, cited.** In view, the wheel rewinds once to the sample's birth. Four
   real claims picked by `/ux-copy` take turns every 6.5 s, each with its evidence and a
   line to its place. A tap stops the cycle; nothing sits behind them or follows scroll.
6. **Inside.** The ten chapter names from the registry in their hues, each with one
   sentence from its prompt and the parts it covers, stepping through until touched.
7. **Your people.** Dashboard Sky's orbit and card as locked, on synthetic sample people;
   the ring at .26, cut away around each person and name, on the dashboard too.
8. **Two charts, one horizon.** Two triad plates on their own Ascendants, both horizons
   on one dotted line; Sun and Moon at their degrees, the inner lane within 14° of the
   Ascendant (ADR-17). Chapter titles from `lenses.ts`, a line each. No score, no age band.
9. **Method.** Three steps with the sample's readout and brief: we work out your chart,
   note what stands out, write your report and check it. No model or vendor is named.
   Facts: the writing service never sees birth data, no predictions, credit back on failure.
10. **Birth time.** For people who only have what a parent remembers, or nothing. Three
    plates carry the product's readouts: I know it, Roughly ("3 possible: Pisces, Aries,
    Taurus · flips at 07:12, 08:26"), I don't know. Parts of the day: `birth-time.ts`.
11. **Pricing, parked.** A marked slot above the FAQ until the pricing session (MB-5,
    MB-6). The price will come from one constant.
12. **FAQ.** Ten questions, answer first, all visible. AI is named once, plainly, in "How
    is the report written?". The Owner reviews the wording.
13. **The dawn.** "Start with your birth date." and "Then add where you were born, and your
    birth time if you know it." over the dawn light and rising Sun. The footer:
    `EPHEMERIS`, an Updated date, credits, and links to every page.
14. **The wheel.** Every wheel is the product's wheel, so it follows `review-25-09`: the
    band names each house under its sign ("10 · CAREER") and a printed house carries its
    word ("1st (self)"). A blind chart draws no house line. It arrives with that round.
15. **Motion.** One easing, `cubic-bezier(.16,1,.3,1)`. First light takes about 2.3 s:
    the horizon draws, stars gather into the ring, the bodies rise 70 ms apart. The
    rewind takes 2.9 s. Nothing waits at opacity 0; reduced motion renders still.
16. **Phone.** One column by container query: the wheel full width, fields stacked, the
    sky screen full. Claims stack, the line rising from them; the orbit card is a sheet.

**B. Seven more pages** (designs in `docs/annex/landing-and-ai-search-pages.md`)

17. **/sky, /sample, /method, /compatibility, /learn/whole-sign-houses,
    /learn/birth-time, /faq**, each designed from the home page's parts, each home
    section linking on to its page. /sky is the free chart as a page; /sample is the whole
    stored run with every citation and its evidence card; the Learn pages carry live
    diagrams and facts computed from the fixtures. Each opens with an answer-first lede.

**C. Found by AI**

18. **Real HTML.** All eight pages and legal prerender at build with `renderToString` and
    `ssrPath`, `#root` kept and hydrated, every word in the HTML.
19. **Crawl surface.** robots.txt allows `*`, not `/api/` or `/admin/`; a sitemap with
    `lastmod`; canonical, OG and Twitter tags; app routes noindex; unknown paths 404.
20. **Structured data.** Organization, WebSite, Product and Offer, Article with
    `dateModified`, BreadcrumbList; FAQPage optional; no review markup.
21. **Registration and measurement.** Bing Webmaster Tools, Search Console, IndexNow on
    deploy; the AI-bot rule Off or Log; AI reports, `utm_source=chatgpt.com`, crawler
    hits; events ride MB-11; no GitHub secret. **llms.txt** comes last.

**D. Voice**

22. **Marketing voice.** `.claude/skills/ux-copy`, rebuilt on humanizer (MIT) with
    speak-human's reader step and `references/ai-search.md`: AI-writing patterns ranked
    and limited, labels allowed, ledes that name Stars Decoded. `/web-taste` for the look.
    MASTERFILE §9 links both in place of "not written yet".

## Out of scope

- Pricing, packages, checkout and credits (MB-5, MB-6), and the legal entity (MB-31).
- Mailbox topics at lock: rectification (a birth time estimated from life events), our
  own place index (135,233 GeoNames towns with zones) for the day Nominatim's limits
  bite, and a stored pair run so /compatibility can quote one real claim.
- The report's own prose. No Sun or Ascendant claim in the sample run passes `/ux-copy`:
  the claims echo `vocabulary.ts` ("The Moon is the body…"), and the style contract's
  model sentence has the "X first, Y second" shape. A Mailbox topic for the prose study.
- Pages per placement ("Moon in Pisces"): scaled content, until each is checked like a
  report. Off-site mentions (MB-25), Astro, a light theme, a new palette, a per-chart mark.

## Acceptance criteria

- **Charts are computed.** Every wheel, plate, degree, time and readout on every page
  comes from `calculateNatalChart` or the same calls. A test pins the hero to the
  fixtures (Audrey Hepburn, Marie Curie) to 0.01°.
- **No typed numbers.** No literal price, word count, degree or time in `web/src/pages`
  or the prerendered HTML. Chapter names and lens titles come from the code.
- **Signed out, every CTA reaches the birth form.** The sky prefills it and stores
  nothing server-side.
- **One place field.** The landing, /sky and the birth form render the same place
  component, and its list shows the OpenStreetMap credit.
- **Fields fit.** From 320 to 1920 px no field leaves the form, the time shows AM or PM
  in full, and phone inputs are 16 px.
- **Claims point true.** Each home claim ends on a body or angle at the degree its
  evidence names; claim text is byte-identical to a stored run. On /sample every claim of
  the run anchors to its text (63 of 63 for r06) and opens its evidence card.
- **Houses turn true.** On /learn/whole-sign-houses the houses count from the east
  downward and the signs follow; picking Leo puts Taurus in the 10th.
- **Compatibility.** Plates are computed from the pair's birth data. No score, number of
  fit or age band appears.
- **Crawlable.** `curl -A OAI-SearchBot` returns every page's H1, lede, headings, the
  sample's full text and the FAQ answers.
- **Crawl files.** robots.txt, sitemap.xml and llms.txt answer 200. App routes carry
  noindex, `/no-such-page` answers 404, and the JSON-LD validates.
- **Plain words.** Every string on the public pages passes `/ux-copy`, and every page
  passes `/web-taste`'s checks. Each Release picks the four claims again by that test.
- **Reduced motion.** Nothing animates; every section is complete at first paint.
- **Phone at 390 px.** No horizontal scroll on any page, nothing overlaps a wheel, tables
  fit, and the sky screen fills the phone.
- **Existing checks.** The smoke check and the QA agent's landing expectations pass
  (`id="root"`, the natal and whole-sign patterns, none of the retired name). No dry lab.

## Screens

All in the artifact, clickable through the Pages bar: the home page (live), the seven
pages, Draft 6, What changes, Phone, Found by AI (page table with each first sentence,
robots.txt, llms.txt), Voice, Motion, Decisions, Questions.

## Open questions

1. **Whose report is the public sample?** Recommend Audrey Hepburn (birth certificate
   time, AA), text and chart only, with a legal line beside MB-31; or Marie Curie, or a
   synthetic person. Default: Audrey Hepburn, the whole report, text and chart only.
2. **Let AI companies train on public pages?** Recommend yes: GPTBot, ClaudeBot and
   Applebot-Extended as well as the search crawlers. Default: allow all on public pages.
3. **Where do the pages say AI helps write the report?** Recommend plainly, twice and
   never first: the FAQ and the end of /method. "Is this scientific?" stays as written.
   Default: those two places only.

## Decisions to record (numbers provisional until lock)

- **ADR-97 The landing opens on the live sky.** The sky now over the visitor's city,
  computed in the browser, drawn with the product's wheel. Replaces Aria Solis.
- **ADR-98 The free sky is its own screen.** A date, and time and place if known, open a
  full-screen sky that rewinds to the birth; nothing stored, the form prefilled (R-3.4).
- **ADR-99 One place field.** The landing reuses the birth form's place search as it is,
  with the OpenStreetMap credit. Our own index waits in the Mailbox.
- **ADR-100 Proof by citation, on a timer.** Four real claims, picked by `/ux-copy`, take
  turns, each drawn to its place; nothing tied to scroll. Each Release regenerates them.
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
- **ADR-107 Marketing voice lives in `/ux-copy`.** AI-writing patterns ranked and
  limited, not banned; labels allowed; both reports named; no model or vendor, AI never
  leads; AI-search rules in its references. Closes the voice half of MB-25.
- **ADR-108 The dawn closes the page.** Dawn light and the Sun over a full-width
  horizon, with the last call to action. Pricing takes its slot above the FAQ.
- **ADR-109 Eight public pages, one design.** Home, /sky, /sample, /method,
  /compatibility, the two Learn pages and /faq, built from the same parts; /sample is a
  whole stored run with its citations. No page per placement.

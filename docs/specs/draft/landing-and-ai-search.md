# Draft spec — the landing page and AI search ("First light")

Raised by the Owner 2026-09-25: a landing page with beautiful visuals, transitions and
copy in the brand, found and cited by ChatGPT and other AI search, with the Dashboard
Sky orbit under the product. Draft 2, the same day, after the Owner's notes on draft 1.

Artifact: https://claude.ai/artifact/Rx9GsG4ZUA8Gnxif6fHWbV (draft 2). The page is live:
the sky is computed in the browser with astronomy-engine 2.1.19 and the calls in
`chartCalculation.ts`, matching the fixtures to the hundredth (Audrey Hepburn: Sun 13.12°
Taurus, Moon 6.45° Pisces, rising 28.62° Aquarius). Claims are unedited r06 text, the
place search runs on the real index, and the orbit is Dashboard Sky (ADR-89 to 96).

## Draft 2, after the Owner's notes

Kept as loved: the H1, first light, "See your sky first · Free · nothing is saved",
Method, "No birth time? Still a full report." and the dawn. Changed:
- Any birth place, from our own index. Draw my sky opens a full-screen sky.
- Scrolling on rewinds the wheel to the sample's birth; claims come one at a time with a
  line to their placement, the report faded behind.
- Inside is general: one sentence per chapter, from its prompt. No explorer row, sample
  text, door at two thirds or PDF line.
- No word counts, a brighter orbit ring, and two charts on one horizon in place of the
  combined chart. Birth time speaks to people who will never know theirs. Pricing parked.
- A fix: draft 1's Roughly plate claimed one rising sign; it now shows the readout.

## What today's page gets wrong

- `web/src/data/demoChart.ts` hand-types "Aria Solis" with invented degrees; the engine
  puts its rising at 26.2° Gemini, not 2.1° Cancer (R-3.1, §9).
- "€24" is typed at `LandingPage.tsx:163`, `:280` and `BirthFormPage.tsx:566`. No price
  constant exists (R-6.3).
- Every CTA goes to `/chart`, behind `RequireAuth` (`App.tsx:171-184`), against R-3.4.
- "Ten sections of insight" lists registry labels, not the ten chapters
  (`ReportPage.tsx:52-63`), MB-8. Neither product is ever named.
- Places come from public Nominatim (`BirthFormPage.tsx:156`, `routes/geocode.ts`), whose
  policy is 1 request a second and no autocomplete. The zone comes from timeapi.io,
  falling back to `Math.round(lon / 15)`.
- The SPA ships an empty `#root`; AI crawlers run no JavaScript and see a title and one
  sentence. No robots.txt, sitemap, canonical or JSON-LD; unknown paths answer 200.

## Scope

**A. The page, top to bottom** (copy as in the artifact; every number read from code)

1. **Nav.** Wordmark; The report, Inside, Your people, Method, FAQ; Sign in; Get my
   report. Every CTA opens the birth form without an account.
2. **Hero.** Draft 1's H1, lede and live wheel at full viewport height: the sky now over
   the visitor's time-zone city, on the Ascendant. The horizon runs the full width, H1
   above it, form below. The form and its result share one slot; nothing reflows.
3. **The sky screen.** Draw my sky lifts the wheel into a full-screen sky (FLIP, 0.75 s).
   It rewinds to the birth minute (real positions, trails, a countdown date), then names
   Sun, Moon and Rising, with "Get the report for this sky" and "Draw another". Close or
   Escape flies it back; the hero keeps that sky with a summary. No time: no horizon or
   houses, and the Moon as the day's arc. Nothing stored; the birth form opens prefilled.
4. **Places, our own index.** GeoNames `cities1000` with admin1 names (CC BY 4.0):
   135,233 towns, 397 IANA zones and 3,290 regions in 80 static shards (6.88 MB). The
   first keystrokes load one shard, at most 421 KB (138 KB gzipped). Accents and ß, æ, ø
   fold, alternate names match, and a town's own name ranks first. A pick gives lat,
   lng, the zone for `offsetAtBirth` and the country for the birth-record hints. The
   birth form uses the same index. Nominatim, timeapi.io and their privacy-page lines
   go, and the footer credits GeoNames.
5. **Every claim, cited.** Scrolling in, the wheel rewinds to the sample's birth. Four
   real claims then step by with the scroll: Sun, Moon, Rising and one aspect, each with
   kind chips and "n verified references". A line draws from the claim's number to its
   place, lighting those bodies and dimming the rest. The report's own text drifts
   behind as faded texture. Tabs jump; reduced motion shows four still steps.
6. **Inside.** The ten chapter names from the registry in their hues. Each has one
   sentence from its prompt and the parts it covers. The list steps through while in
   view, until touched.
7. **Your people.** Dashboard Sky's orbit and card as locked, on synthetic sample people.
   The ring is brighter here and on the dashboard: opacity .4, stroke 1.2, dashes 2 5.
8. **Two charts, one horizon.** Two triad plates, each on its own Ascendant, so both
   horizons fall on one dotted line with a violet knot: "ONE HORIZON", "NO SCORE".
   Lower halves shaded; Sun and Moon at their degrees, inner lane within 14° of the
   Ascendant (ADR-17). Lens doors and straplines from `lenses.ts`. Seven chapters with a
   line each: your two charts, the lens's five, what to practise. The parent-and-child
   lens shows the `pairBrief.ts` age band. A lens change glides the second Sun and Moon.
9. **Method.** Three steps with the sample's real readout and brief. Three facts: the
   writer never sees birth data, no predictions, the credit back on failure.
10. **Birth time.** Written for people who only have what a parent remembers, or
    nothing. Three plates carry the product's readouts: I know it (the rising sign),
    Roughly ("3 possible: Pisces, Aries, Taurus · flips at 07:12, 08:26", the Moon
    holding), I don't know (the Moon's arc that day). Parts of the day: `birth-time.ts`.
11. **Pricing, parked.** A marked slot above the FAQ until the pricing session (MB-5,
    MB-6). The price will come from one constant.
12. **FAQ.** Ten questions, answer first, all visible. The Owner reviews the wording.
13. **The dawn.** "Your sky happened once. Read it closely." over the report's dawn
    light and rising Sun. The footer has `EPHEMERIS`, an Updated date and the credit.
14. **Motion.** One easing, `cubic-bezier(.16,1,.3,1)`. First light takes about 2.3 s:
    the horizon draws, stars gather into the ring, the bodies rise 70 ms apart. The
    rewind takes 2.9 s. Nothing waits at opacity 0; reduced motion renders still.
15. **Phone.** Container queries: one column, the wheel full width, fields stacked. The
    sky screen fills the phone. The claims stack, with the line rising from the claim.
    The orbit card becomes a bottom sheet.

**B. Found by AI** (as draft 1)

16. **Real HTML.** The public routes are prerendered at build in the web app with
    `renderToString` and wouter's `ssrPath`, keep `#root` and hydrate: `/`, `/sky`,
    `/sample`, `/method`, `/compatibility`, `/learn/*`, `/faq` and the legal pages.
17. **Crawl surface.** robots.txt allows `*` and disallows `/api/` and `/admin/`. A
    sitemap with `lastmod`; canonical, OG and Twitter tags. App routes send
    `X-Robots-Tag: noindex`; unknown public paths answer 404.
18. **Structured data.** Organization, WebSite, Product and Offer, Article with
    `dateModified`, BreadcrumbList. FAQPage optional; no review markup.
19. **Answer first.** Each page opens with a sentence that answers its question alone,
    under question headings, with an Updated date.
20. **Registration and measurement.** Bing Webmaster Tools, Search Console and IndexNow
    on deploy; the Vercel AI-bot rule Off or Log. The AI reports in Search Console and
    Bing, `utm_source=chatgpt.com` referrals, crawler hits. Events ride MB-11. No GitHub
    secret.
21. **llms.txt**, last.

**C. Voice**

22. **Marketing voice v1.** The artifact's seven rules, including "say what it covers,
    not how long it is", in `docs/annex/marketing-voice.md`, linked from MASTERFILE §9.

## Out of scope

- Pricing, packages, checkout and credits (MB-5, MB-6), and the legal entity (MB-31).
- Rectification, which estimates an unknown birth time from life events. It becomes a
  Mailbox topic at lock.
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
- **Place search.** "springf" lists Springfields by region, "munchen" finds Munich, and
  "ljubl" puts Ljubljana first. A pick sets the IANA zone. Neither page calls Nominatim
  or timeapi.io.
- **Stable page.** The sky screen keeps the scroll position; nothing below the hero moves.
- **Claims point true.** Each line ends on a body or angle drawn at the degree its
  evidence names. The claim text is byte-identical to a stored lab run of the sample.
- **Compatibility.** Plates are computed from the pair's birth data. No score or number
  of fit appears.
- **Crawlable.** `curl -A OAI-SearchBot` returns the H1, lede, headings and FAQ text on
  every public route.
- **Crawl files.** robots.txt, sitemap.xml and llms.txt answer 200. App routes carry
  noindex, `/no-such-page` answers 404, and the JSON-LD validates.
- **Reduced motion.** Nothing animates; every section is complete at first paint.
- **Phone at 390 px.** No horizontal scroll, nothing overlaps the wheel, and the sky
  screen fills the phone.
- **Existing checks.** The smoke check and the QA agent's landing expectations pass
  (`id="root"`, the natal and whole-sign patterns, none of the retired name). The brain
  is untouched, so no dry lab.

## Screens

All in the artifact: the page (live, desktop), Draft 2, What changes, Phone (live at
390 px, sky screen included), Found by AI (engine flow, HTML before and after, page
table, robots.txt, llms.txt), Voice, Motion, Decisions, Questions.

## Open questions

1. **Whose report is the public sample?** Recommend Audrey Hepburn, as the fixtures plan:
   the time is from her birth certificate (AA). Her estate licenses her name, so text
   and chart only, no photo, with a legal line beside MB-31. Alternatives: Marie Curie,
   or a synthetic person. Default: Audrey Hepburn, text and chart only.
2. **Let AI companies train on public pages?** Recommend yes: allow GPTBot, ClaudeBot and
   Applebot-Extended as well as the search crawlers. Google-Extended stays allowed either
   way. Default: allow all on public pages.
3. **How candid, and how far?** Recommend "Is this scientific?" as written, and the eight
   cornerstone pages at launch; placement pages wait for a checked writer. Default: the
   FAQ as written, eight pages at launch.

## Decisions to record (numbers provisional until lock)

- **ADR-97 The landing opens on the live sky.** The sky now over the visitor's city,
  computed in the browser, on the Ascendant. Replaces Aria Solis.
- **ADR-98 The free sky is its own screen.** Date, optional time and place open a
  full-screen sky that rewinds to the birth and names Sun, Moon and Rising. Nothing is
  stored, and the birth form opens prefilled (R-3.4).
- **ADR-99 Places come from our own index.** GeoNames towns with IANA zones, as static
  shards on our domain, for the free sky and the birth form. No third-party geocoder.
- **ADR-100 Proof by citation, one claim at a time.** The wheel rewinds to the sample.
  Four real claims are drawn to their places, the report faded behind. Each Release
  regenerates the sample.
- **ADR-101 Chapters in general terms, no word counts.** Registry names (closes MB-8),
  each described from its prompt. Marketing copy never states a length.
- **ADR-102 The orbit sells the second person.** Dashboard Sky with synthetic people and
  a brighter ring, dashboard included (amends ADR-89 to 96). No living person's name.
- **ADR-103 Two charts, one horizon.** Two triad plates on one horizon, with the lens's
  seven chapters. No combined chart, no score.
- **ADR-104 Public pages are real HTML.** Prerendered in the app, `#root` kept, app
  routes noindex, unknown public paths 404. Astro not chosen.
- **ADR-105 Found by AI.** Open robots.txt, a sitemap, canonical, OG, JSON-LD, Bing,
  IndexNow and Search Console. The AI-bot firewall is never Deny; llms.txt comes last.
- **ADR-106 Answer first.** Each public page opens with a sentence that answers its
  question alone, and an Updated date that moves only with its content.
- **ADR-107 Marketing voice v1.** Seven rules; closes the voice half of MB-25.
- **ADR-108 The dawn closes the page.** Dawn light and the Sun over a full-width
  horizon, with the last call to action. Pricing takes its slot above the FAQ.

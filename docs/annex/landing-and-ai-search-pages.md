# Annex: the seven public pages (landing-and-ai-search, draft 6)

Abstract. Besides the home page, the site gets seven public pages, each designed in the
artifact (https://claude.ai/artifact/Rx9GsG4ZUA8Gnxif6fHWbV, Pages bar) from the home
page's parts: the product's wheel, the triad plates, the evidence card, the report's type.
Each opens with a sentence that answers its question alone (ADR-106), prerenders all its
text, and takes every number from code. Copy passes `/ux-copy`, layout `/web-taste`.

## Shared

- **Nav.** Free chart, Sample report, Compatibility, How it works, FAQ; Sign in; Get my
  report. Each home section links on to its page ("Read her whole report", "About the
  Compatibility report", "How we make your report, step by step", "See all the questions").
- **Footer.** Reports (Personal natal, Compatibility, Sample, Free birth chart), Learn
  (How it works, Whole-sign houses, If you don't know your birth time, FAQ), Company.
- **Page head.** Eyebrow or breadcrumb, H1, the answer-first lede, an Updated date where
  the content can age. Question H1s only on /faq and the Learn pages.
- **End.** A call to action or related cards; no page is a dead end.
- **Phone.** One column; tables fit without sideways scroll; rails become chips.

## /sky: Free birth chart

- H1 "Free birth chart"; first sentence "A birth chart is a map of where the Sun, Moon and
  planets were at the minute you were born, seen from where you were born."
- Copy above the horizon, the form below it, the wheel across both, as on the home page.
  Show my chart rewinds the wheel in place (no sky screen here).
- Result: "Sun in Taurus, Moon in Pisces, Aquarius rising.", a placements table (planet,
  position, house with its word; Rising and Midheaven rows; no House column and the
  Moon's day range without a time), and "How to read the wheel": four parts, each lights
  its layer on hover or tap.
- Before any input the page shows the sky now over the visitor's town; the prerender
  shows the sample's chart as a worked example. Schema: WebPage, BreadcrumbList.

## /sample: Audrey Hepburn's Personal natal report

- First sentence "This is a real Personal natal report from Stars Decoded, copied word
  for word, so you can read one before you get your own."
- Head: a brass opening ring with her name, Sun and Moon at their true angles, the
  Ascendant marker and a legend. Then a sticky rail of the ten chapters in their hues and
  every block of the stored run in the report page's order (`ReportPage.tsx` CHAPTERS).
- Citations as in `natal-report-ui`: each claim marked in place with a number in reading
  order; tap opens the evidence card (the claim, a row per reference with kind, label and
  the glossary line, a footer count). Desktop: beside the line, below the nav. Phone: a
  bottom sheet. All 63 claims of r06 anchor to their text.
- Chapter 2: the wheel, three triad cards, twelve house cards; a card lights its house.
- Fine print: public birth data (Astro-Databank, AA); no connection to her family or
  estate (MB-31). Schema: Article with the run's date as dateModified.

## /method: How we make your report

- First sentence "Stars Decoded works out your birth chart from where the planets really
  were and notes what stands out in it."
- Four steps, text left and the sample's real data right: the chart (astronomy-engine,
  accurate to within one arcminute and tested against NASA's JPL Horizons, per its
  README), the notes (the brief), the writing (the ten chapters), the check (one real
  claim with each reference ticked).
- The three facts; the one AI answer outside the FAQ ("Is the report written by AI?").

## /compatibility

- H1 "How the two of you get along"; first sentence "A Compatibility report from Stars
  Decoded looks at how two people get along, using both of your birth charts."
- Lens tabs, strapline, the two plates on one horizon and the seven chapter titles from
  `lenses.ts`; three steps (each has a Personal natal report, added from the dashboard or
  by invite; you say who they are; you get it); no scores, everyday life, one credit
  (R-6.4); a table of the two reports; three questions; a call to action.
- No pair text yet: one real pair claim joins when a pair run is stored (Mailbox).

## /learn/whole-sign-houses

- H1 "What are whole-sign houses?", answered by definition in the first sentence.
- A bare ring (signs and houses, no planets) with a rising-sign picker: the zodiac turns
  past houses that stay put, counted from the east downward. Then the sample's wheel with
  her 1st and 4th houses lit and a computed sentence.
- The twelve houses (names from `review-25-09`, themes from `HOUSE_THEMES`), a table of
  whole sign against Placidus (undefined above about 66°), and "Why does Stars Decoded
  use whole-sign houses?", with the history attributed to Brennan's *Hellenistic
  Astrology* (2017), never "more accurate".

## /learn/birth-time

- H1 "What if you don't know your birth time?"; first sentence "You can still get a full
  Personal natal report without your birth time."
- What the date settles and what the time settles; one computed fact from the sample's
  day (Aquarius rose over Brussels from 01:53 to 03:03 on 4 May 1929, so her 03:00 birth
  sits three minutes from Pisces); a day slider over today above the visitor's town
  (rising sign and its window, houses, the Moon's and Sun's move); the three plates;
  where to find a birth time; adding it later, free once (R-6.1).

## /faq

- H1 "Questions people ask"; a search box; topics as a sticky index; fifteen questions in
  five groups, each answered in its first sentence, linking on where a page goes deeper.
  FAQPage markup optional and identical to the visible text.

# Review 01/10

Ideation 2026-10-01 with the Owner from the Notion page "Review 01/10" (fifteen notes on the
R11 build on staging). Artifact, revision 2: https://claude.ai/artifact/7sRXjmJcybAmnQHrbxJ5Rc.
Status: **draft**. Supersedes in part ADR-142 (Couple's price), ADR-146 (offers), ADR-72 (on-tap
scenes), ADR-103 (the scene intro), ADR-101 (the ledger's words); touches `pricing-and-launch`
(R12), `dashboard-sky`, `landing-and-ai-search`, `compatibility-report-p2`. Brain: the pair
prompts change (dry lab). **Phone first**: every screen is designed at 390 px before desktop.

Only what the Owner asked is in scope. The artifact's "Noted, not changed" list stays out unless
the Owner says yes. Answered in revision 1: launch price against the Singles total with no end
date for now; Personal report and Compatibility report; the sample at four chapters with the
app's chapter 02 matching it; one sun.

## Scope

### 1. Prices and names (note 1)
- Single €24, Couple **€54**, Family & friends €72, one catalogue (`packages/commerce`). Couple
  and Family & friends carry a "Launch price" chip, the Singles total struck through ("3 Singles
  €72", "5 Singles €120") and "you save €18 / €48". No end date until the Owner sets one; no
  "was" price. `CatalogueBundle` gains `fullCents`; the price gate still holds.
- Each bundle shows its credits as example mixes in chips; one line wherever a price or balance
  shows: "1 credit = 1 report of either kind."
- **"Personal report"** replaces "Personal natal report" (`product.ts` and every literal);
  "Compatibility report" stays; the credits sheet uses Single / Couple / Family & friends with
  prices; "Your circle" replaces orbit, sky and "Your People"; the nudge becomes "Add someone
  to your circle. 1 credit = 1 report." Site, app, emails, FAQ, terms, JSON-LD. Public pages
  keep "natal chart" where people search.

### 2. What makes us different (note 9)
A band after the home hero, repeated at the end of /sample. **"A personality report, not a
horoscope"**: a real sample line ("You spend to soothe, and you save to feel safe."), its
Behaviour check, two Practice items with tick boxes. **"Your circle starts with you"**: then the
people close to you, real situations, a pair headline and two "Try together" items in the
**same** tick-box component. One kind of thing, one look, everywhere (now a `/web-taste` rule).
Copy through `/ux-copy`; the pair quotes a sample pair, never a customer (MB-93).

### 3. The dashboard, phone first (notes 10, 11)
- Order on a phone: title **"Dashboard"** with a one-line summary; **Your circle** with the
  switch **Circle · People · Compatibility**; the panel for the selected person; **What you're
  practising**; **Your pairs**; **Share** last. Desktop: circle and panel side by side, then the
  three rows full width.
- **Everyone's signs**: Sun, Moon and Rising signs under each name on the circle and in each
  row (from `ReportSummary.signs`); degrees in the panel.
- **The panel** is selected from the circle or from any row. You: name, triad, "Open your
  report". A person with a pair: their triad, the pair headline, "Open Compatibility report",
  "{name}'s report", "Send to {name}". Without a pair: "Compatibility with you · 1 credit". No
  elements bars or house grid.
- **Rows keep their actions**: People shows "This is me ✓" or "Send to {name}" as a button and
  Not me / Delete report behind "⋯"; Compatibility shows "Share image" and "Send to {name}",
  Delete behind "⋯". No hearts anywhere.
- **What you're practising**: up to 3 pinned items per report, from the Closing or a pair's
  "Next time"; with none pinned, the Closing's first Practice item. Same tick-box component.
- **Your pairs**: a sideways row, per pair the three "Comes naturally" lines and one
  "Challenge to work on".
- **Share**: ready images per pair in two sizes (Q3): a 9:16 story (WhatsApp status, Instagram
  story) and the 4:5 post (today's 1080 × 1350 card), each with Share (Web Share with the file)
  and Save. Same drawing as `ShareCard`, re-laid for 9:16.
- **Four states**: empty (ghost seats, the three bundles under "Your circle starts with you",
  one sample practice item), one Personal report, two reports and a pair, family.
- **Underneath**: pins stored with the workbook ticks (ADR-24), `PATCH /reports/{id}/workbook`
  carries `pinned`; a new `GET /home` (in `openapi.yaml`) returns pins or defaults, each pair's
  strong lines, one challenge and the share text, so no full report loads.

### 4. The Compatibility report (notes 12 to 17)
- **"Where your charts meet"** replaces the link cards' unnamed list (Q2). Each card is tagged
  **Comes naturally** (teal) or **Challenge** (rose); its title is in people words from a fixed
  list, one word per body: Sun identity, Moon feelings, Mercury mind, Venus affection, Mars
  drive, Jupiter optimism, Saturn structure, Uranus independence, Neptune imagination, Pluto
  intensity ("Alexandra's drive and Mamca's structure"); the astrology in small mono under it
  ("Mars opposite Saturn · 1.4°"); first names only. Three of each kind first (the ledger's
  links leading, then `synastryCompute` weight), "Show all N". Code, not the writer; the enum
  keeps `flows`/`rubs`.
- The chapter 01 ledger's columns read **Comes naturally** and **Challenge**.
- The prose says "This is the challenge: …" for "This is where it rubs" (doctrine and 15
  chapter prompts); "room" only for a real room ("in public", never "public rooms").
- Chapter 01's `pointer` ("Next, we name…") leaves the schema, prompt and page.
- `SCENE_INTRO` is removed in both places.
- **One scene per chapter** (artifact table); the chips, `writeScene` and its route go. Parent and
  child: the band scene by the child's age, under 3 written as 3. `PAIR_PROMPT_VERSION` bumps.

### 5. The sample report (note 7)
/sample shows **4 of 10**: Overview, Deep dive, Superpowers, Key Paradoxes & Discoveries. The
head says "A sample: 4 of 10 chapters from Audrey Hepburn's Personal report"; the other six are
dimmed in the rail and the page with one line each, opening to their first paragraph (kept in
the HTML). The page ends on the two pillars, then "Get my report".

### 6. Chart deep dive, phone first (note 8)
In the app's chapter 02 and on /sample (one component). The existing `NatalWheel` at thumbnail
size with its `selectedHouse`, no new wheel. A **pinned bar**: the wheel (92 px), "02 / 10",
the title, the current house ("4th house · Home · Taurus") and twelve ticks. Under it, per Q1:
**A, a swipe deck** of twelve house cards, one per swipe, each the house and sign, its planet
renders, the title, the first sentence in the display face, "Read the rest" for the remainder,
and the Behaviour check; swiping lights the wedge. **B, twelve rows**, one line each (word,
sign, renders, first sentence), tap to open. No triad cards (the triad is still written; pairs
cite it). Desktop: the wheel full size on the left, the same deck or rows on the right. Display
only; the houses prompt is unchanged. Reduced motion: no fade or scale.

### 7. How it works pages (notes 2, 3)
- **The reference check** is drawn as the report draws it: the sentence underlined, the indigo
  number chip, the evidence card with each kind in its colour (ruler brass, placement indigo,
  aspect blue, sect violet, lot green), its label and its one plain line from `glossFor`, the
  foot "N verified references · whole sign · tropical". No ticks. Motion: the underline draws,
  the number lights, the card rises, the rows arrive in turn; once on view, replayable, finished
  at rest. The same figure on home and /method.
- **/compatibility "How to get a Compatibility report"**: no comparison table and no facts row.
  Three large steps built from the site's own pieces: 01 the two plates (Mira and June, the
  computed sample people); 02 the lens chips and, for a parent and a child, "Who is the
  parent?"; 03 the seven chapter titles of the chosen lens in their chapter colours, changing
  with step 02. The page's three questions move to /faq's FAQPage schema.
- lucide line icons where a step needs one; no Material Symbols.

### 8. One sun (note 6)
`sun.webp` is re-made at 192 px from `sun-512.webp`; `HorizonWheel`'s dark disc gets thinner.

### 9. Birth place (note 18)
In `SkyForm` the place gets its own full row; the match list is the form's width; each match is
one column: the name (wrapping, never truncated), then "REGION · SLOVAKIA · UTC+2" under it.
Same field on the birth form.

## Out of scope
The artifact's noted list: the failed pairs on staging, the "In a room together" title, "Deep
dive" spelling, the share image (MB-13), the regions-only search, a Personal share image
(MB-104), cutting the triad prompt, degrees in list rows. Stripe, checkout and `LAUNCHED` stay R12's.

## Acceptance criteria
1. Pricing at 390 and 1440 px: €24, €54, €72, two launch chips, the struck Singles totals, the
   example mixes, no end date; the catalogue test pins €54; no euro typed elsewhere.
2. No "Personal natal report", "One report", "Someone and the two of you", "orbit" or "Your
   People" in user-facing strings (a grep test); the credits sheet shows names and prices.
3. Home shows the two pillars after the hero and /sample ends with them; every thing to try
   on the site, in reports and on the dashboard uses one tick-box component.
4. The dashboard at 390 px first, then 1440 px, renders the four states in the order above;
   the panel follows the circle and the rows; rows keep their actions; every person shows
   three signs; pins persist; one `GET /home` call; Share sits last with both sizes.
5. A Compatibility report shows "Where your charts meet" with Comes naturally / Challenge tags,
   people-word titles, three of each first; the ledger uses the same two words; no hearts, no
   scene chips, no scene intro, no pointer.
6. The dry lab renders every pair prompt with the challenge wording, the room rule, no
   `pointer` and one scene per chapter; a 10-month-old child renders as 3.
7. /sample shows four chapters open and six dimmed with first paragraphs in the HTML.
8. Chapter 02 at 390 px shows the pinned bar with the existing wheel and the chosen deck or
   rows; the wedge follows the card; no triad cards; reduced motion is still.
9. The reference check matches the report's evidence card, plays once and replays.
10. /compatibility shows three visual steps and no table; its questions are in /faq's schema.
11. Every Sun render is the new one; a long place name wraps, with no gap column.
12. Typecheck, both builds, unit tests, codegen no diff, the dry lab, Vercel preview smoke.

## Screens
All in the artifact, revision 2: the noted list, the new questions, pricing, the pillars with
the shared tick box, the dashboard in a phone frame in four states, "Where your charts meet",
the scene table, the sample map, both deep-dive options in phone frames, the evidence card
animation, the three compatibility steps, the suns, the place field in a phone frame.

## Open questions
1. **Q1, deep dive on a phone.** A ★ swipe deck; B twelve rows. Default A.
2. **Q2, the pair's words.** A ★ "Where your charts meet", Comes naturally / Challenge, the
   ledger matching; B Strength / Challenge; C What works / Challenge. Default A.
3. **Q3, share images.** A ★ 9:16 story and 4:5 post; B add a 1:1 square. Default A.

## Decisions to record
1. Couple is €54; Single €24 and Family & friends €72 stay (supersedes ADR-142 for Couple).
2. Couple and Family & friends show a launch price against the struck Singles total, never a
   "was" price, with no end date until the Owner sets one (supersedes ADR-146 for the launch).
3. Personal report and Compatibility report; 1 credit = 1 report of either kind, said wherever
   a price or balance shows; the people are "Your circle".
4. Phone first: every screen is designed at 390 px before desktop.
5. One kind of thing, one look, everywhere: a thing to try always carries its tick box.
6. Home and /sample state the two differences: a personality report with things to try, and
   your circle with everyday scenes.
7. The dashboard is a home: titled, the circle first with People and Compatibility as lists that
   keep their actions, a short panel driven by both, everyone's three signs, pinned practice,
   pair strengths and one challenge, ready share images last, from one endpoint.
8. A reader pins up to 3 items per report, stored with the ticks.
9. Share images come ready in 9:16 and 4:5.
10. A Compatibility report has one fixed scene per chapter, no chips, no intro line; a child
    under 3 is written as 3 (supersedes ADR-72, ADR-103 in part).
11. "Where your charts meet", tagged Comes naturally or Challenge, titled in people words with
    the astrology under it; the ledger uses the same words (amends ADR-101); "challenge" in the
    prose; "room" never a figure of speech; no chapter 01 pointer.
12. /sample shows four of ten chapters and ends on the two differences.
13. Chapter 02 is one component in the app and on /sample: the existing wheel pinned with the
    house counter, short house cards, no triad cards.
14. The how-it-works pages draw evidence exactly as the report does; /compatibility explains
    itself in three visual steps with no table, its questions on /faq.
15. One Sun render everywhere.

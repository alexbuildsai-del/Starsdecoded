# Review 01/10

Ideation 2026-10-01 with the Owner from the Notion page "Review 01/10" (fifteen notes on the
R11 build on staging). Artifact, revision 4: https://claude.ai/artifact/7sRXjmJcybAmnQHrbxJ5Rc.
Status: **draft**. Supersedes in part ADR-142 (Couple's price), ADR-146 (offers), ADR-72 (on-tap
scenes), ADR-103 (the scene intro), ADR-101 (the ledger's words); touches `pricing-and-launch`
(R12), `dashboard-sky`, `landing-and-ai-search`, `compatibility-report-p2`. Brain: the pair
prompts change (dry lab). **Phone first**: every screen is designed at 390 px before desktop.

Only what the Owner asked is in scope; the artifact's "Noted, not changed" list stays out unless
the Owner says yes. Answers so far: launch price, no end date; the names; the sample at four
chapters; one sun; stories only; quick look on the circle, lists open reports; Q1 A; Q2 A; the
share preview, Košice and the circle by who shares with you, at the Owner's word.

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
- Order: **"Dashboard"** with a one-line summary; **Your circle** with **Circle · People ·
  Compatibility** (same on every size); **What you're practising**; **Your pairs**; **Share**.
  Desktop: the circle with its quick-look panel beside it, then the rows.
- **Circle → quick look** (a bottom sheet on a phone, the side panel on desktop): name, birth
  date, Sun, Moon and Rising with degrees; for a pair, "With you · {lens}" and the pair block
  (three "Comes naturally", one "Challenge to work on"); for you, chapter 08's superpower and
  growing edge. Buttons: "Open Compatibility report" (or "Open your report"), "{name}'s
  report", "Share with {name}", "Share story"; a close control.
- **People and Compatibility → the report**, directly. Rows show the name (or "You & {name}" and
  the lens), birth date and three signs, and keep their actions: "This is me ✓" or "Share with
  {name}", "Share story" on a pair, Not me and Delete report behind "⋯". No hearts.
- **What you're practising**: up to 3 pins per report from the Closing or a pair's "Next time";
  none pinned, the Closing's first Practice item. **Your pairs**: a sideways row of pair blocks.
- **Share**: one ready 9:16 story per pair, "Share story" (Web Share with the file) and "Save";
  its look in a later session. **Share with** replaces "Send to" (Q3); emails: "Alexandra
  shared your report with you"; a credit given stays a Gift.
- **The circle** is you plus everyone whose Personal report you can read: ones you wrote, until
  that person stops sharing, and ones shared with you (it now matches People). A stop removes
  them from your circle, People and quick look at once.
- **Stop sharing** keeps today's dialog and lists the consequences: "{giver} can no longer read
  your Personal report." "You leave {giver}'s circle. Your birth date and your Sun, Moon and
  Rising go from {giver}'s dashboard." "Compatibility reports {giver} made with you close for
  {giver} too. Nothing is deleted." (MB-103's rule today.) "Your report stays yours. You can't
  undo this." Keep sharing / Stop sharing.
- **Four states**: empty (ghost seats, the bundles under "Your circle starts with you", one
  sample practice item), one Personal report, two reports and a pair, family.
- **Underneath**: pins stored with the ticks (ADR-24) via `PATCH /reports/{id}/workbook`; a new
  `GET /home` (`openapi.yaml`) returns pins or defaults, the circle's birth dates and triads with
  degrees, each pair's strong lines and challenge, chapter 08's lines and the story text.

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

### 6. Chart deep dive, the swipe deck (note 8, Q1 A)
One component for chapter 02 and /sample; `NatalWheel` **unchanged**, driven by `selectedHouse`.
Phone: a pinned bar (wheel 92 px, "02 / 10", the Q4 title, "4th house · Home · Taurus", twelve
ticks); "Swipe through the houses" with a brass arrow nudging three times; one card per swipe
(house, sign, renders, title, first sentence, "Read the rest", Behaviour check). Desktop: the
full wheel fixed on the left, one card with the whole text, Previous / Next, ← →, wedge clicks
(`onSelectHouse`). No triad cards; the houses prompt is unchanged; reduced motion is still.

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
  with step 02. The page's three questions move to /faq's FAQPage schema. Step 01 reads "You
  can share it with them once it's written." Motion, the page's one moment: on view the plates'
  Sun, Moon and Rising arrive in turn, then the seven titles one by one in their colours; a new
  lens replays step 03 only; once, replayable, still under reduced motion.
- lucide line icons where a step needs one; no Material Symbols.

### 8. One sun (note 6)
`sun.webp` is re-made at 192 px from `sun-512.webp`; `HorizonWheel`'s dark disc gets thinner.

### 9. Birth place (note 18)
In `SkyForm` the place gets its own full row; the match list is the form's width; each match is
one column: the name (wrapping, never truncated), then "REGION · SLOVAKIA · UTC+2" under it.
Same field on the birth form. **Košice**: Nominatim likely returns the city as an administrative
boundary, so it reads as a region; `places.ts` ranks and labels by `addresstype` ("City"). A unit
test pins a saved "kosice" answer; the live list is checked on the preview.

### 10. The share preview image (MB-13)
`scripts/render-brand.mjs` footer: "One report · one purchase" becomes "Every reference
checked"; `opengraph.jpg` re-rendered with `pnpm brand:render`. Nothing else on it changes.

## Out of scope
The noted list: failed pairs on staging, "In a room together", a Personal share image (MB-104),
the unused `geocode.ts`, the second chapter-title copy, cancelling a pending share. The triad
stays written. Stripe, checkout and `LAUNCHED` stay R12's.

## Acceptance criteria
1. Pricing at 390 and 1440 px: €24, €54, €72, two launch chips, the struck Singles totals, the
   example mixes, no end date; the catalogue test pins €54; no euro typed elsewhere.
2. No "Personal natal report", "One report", "Someone and the two of you", "orbit" or "Your
   People" in user-facing strings (a grep test); the credits sheet shows names and prices.
3. Home shows the two pillars after the hero and /sample ends with them; every thing to try
   on the site, in reports and on the dashboard uses one tick-box component.
4. The dashboard at 390 px first, then 1440 px, renders the four states in the order above; a
   circle tap opens the quick look (name, birth date, triad, pair block or chapter 08 lines,
   buttons); a row tap opens the report; rows keep their actions; pins persist; one `GET /home`
   call; Share sits last with one 9:16 story per pair; no "Send to" left in the app or emails.
5. A Compatibility report shows "Where your charts meet" with Comes naturally / Challenge tags,
   people-word titles, three of each first; the ledger uses the same two words; no hearts, no
   scene chips, no scene intro, no pointer.
6. The dry lab renders every pair prompt with the challenge wording, the room rule, no
   `pointer` and one scene per chapter; a 10-month-old child renders as 3.
7. /sample shows four chapters open and six dimmed with first paragraphs in the HTML.
8. Chapter 02 at 390 px shows the pinned bar with the unchanged wheel, the swipe hint and the
   deck; the wedge follows the card; at 1440 px the full text, arrows, keys and wedge clicks.
9. The reference check matches the report's evidence card, plays once and replays.
9. /compatibility shows three visual steps and no table; its questions are in /faq's schema.
10. Every Sun render is the new one; a long place name wraps, with no gap column; "kosice"
    lists Košice first as City; the share preview ends "Every reference checked".
11. A circle shows only reports the reader can read; after a stop, that person is gone from
    the giver's circle, People and `GET /home`; the dialog lists the four consequences.
12. Typecheck, both builds, unit tests, codegen no diff, the dry lab, Vercel preview smoke.

## Screens
All in the artifact, revision 4, phone first; the deep dive also at desktop.

## Open questions
1. **Q3, send or share.** A ★ "Share with {name}" for giving a report, "Share story" for the
   image; B keep "Send to" (ADR-120). Default A.
2. **Q4, chapter 02's name.** A ★ "House by House"; B "Your Twelve Houses"; C "Natal Chart Deep
   Dive". One string in `chapters.ts`, no lab. Default A.

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
7. The dashboard is a home: the circle opens a quick look (name, birth date, triad, something
   from a report, buttons); rows open the report and keep their actions; up to 3 pins per report
   stored with the ticks, pair strengths and one challenge, stories last; one endpoint.
8. Share images are ready 9:16 stories only; their look is settled in a later session.
9. A Compatibility report has one fixed scene per chapter, no chips, no intro line; a child
    under 3 is written as 3 (supersedes ADR-72, ADR-103 in part).
10. "Where your charts meet", tagged Comes naturally or Challenge, titled in people words with
    the astrology under it; the ledger uses the same words (amends ADR-101); "challenge" in the
    prose; "room" never a figure of speech; no chapter 01 pointer.
11. /sample shows four of ten chapters and ends on the two differences.
12. Chapter 02 is one component in the app and on /sample: the unchanged wheel pinned with the
    house counter, a swipe deck of house cards (full text on desktop), no triad cards; its
    title is "House by House" (Q4).
13. The how-it-works pages draw evidence exactly as the report does; /compatibility explains
    itself in three visual steps with no table, its questions on /faq.
14. "Share with {name}" replaces "Send to {name}" for giving a report (amends ADR-120's word).
15. Your circle is you and everyone whose Personal report you can read; whoever stops sharing
    leaves it at once, after a dialog that names every consequence.
16. One Sun render everywhere; the share preview says "Every reference checked".

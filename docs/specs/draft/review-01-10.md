# Review 01/10

Ideation 2026-10-01 with the Owner from the Notion page "Review 01/10" (fifteen notes on the
R11 build on staging). Artifact: https://claude.ai/artifact/7sRXjmJcybAmnQHrbxJ5Rc.
Status: **draft**. Supersedes in part ADR-142 (Couple's price), ADR-146 (offers), ADR-72 (on-tap
scenes), ADR-103 (the scene intro); touches `pricing-and-launch` (R12), `dashboard-sky`,
`landing-and-ai-search`, `compatibility-report-p2`. Brain: the pair prompts change (dry lab).

Only what the Owner asked is in scope. Twelve further fixes are listed first in the artifact
("Noted, not changed") and stay out unless the Owner says yes.

## Scope

### 1. Prices and names (note 1)
- **Prices.** Single €24, Couple **€54**, Family & friends €72, one catalogue
  (`packages/commerce`). Couple and Family & friends carry a "Launch price" chip with the
  Singles total struck through, "3 Singles €72" and "5 Singles €120", "you save €18 / €48",
  and an end date printed under the list (Q1). No "was" price: neither bundle was ever sold
  at the struck sum. `CatalogueBundle` gains `fullCents` and `launchUntil`; the price gate
  still forbids a typed euro amount outside the catalogue.
- **The credit, explained by example.** Every bundle shows its credits as a mix in chips:
  Single "1 Personal report or 1 Compatibility report", Couple "for example, 2 Personal
  reports and 1 Compatibility report", Family & friends "for example, 3 and 2". One line
  wherever a price or balance shows: "1 credit = 1 report of either kind."
- **One set of words** (Q2): "Personal report" replaces "Personal natal report" through
  `web/src/lib/product.ts` and every literal; "Compatibility report" stays; the dashboard
  credits sheet uses the catalogue's names and prices (today "One report / Someone and the
  two of you / Your people and how you fit", no prices); "Your orbit", "Your People" and
  "Your sky" become "Your circle"; the nudge "Credits come in 1, 3 and 5." and "Your orbit
  has room for more" become "Add someone to your circle. 1 credit = 1 report." Site, app,
  emails, FAQ, terms, JSON-LD offers. Public pages keep "natal chart" where people search.

### 2. What makes us different (note 9)
A band after the home hero with two pillars, repeated at the end of /sample: **"A personality
report, not a horoscope"** (real moments from everyday life, things to try in each chapter,
ticked off as you go; one real sample line and two Closing items with ticks) and **"Your
circle"** (the people close to you; a Compatibility report shows real situations like money,
a weekend away, an argument, and gives you both something to try). Copy through `/ux-copy`;
the pair pillar quotes a sample pair, never a customer (MB-93).

### 3. The dashboard becomes a home (notes 10, 11)
- Visible title **"Dashboard"**, a one-line summary under it ("2 reports · 1 Compatibility
  report"). Under it **Your circle** (the orbit) on the left as the main tool for adding a
  person and making either report; a switch **Circle · People · Compatibility** over it, the
  two lists as compact one-line rows (avatar, name, one line, "Open ›"), no action buttons.
- **The panel** for the selected person is short: you → name, Sun, Moon and Rising, "Open
  your report"; a person with a pair → the pair's headline, "Open Compatibility report",
  "Open {name}'s report", one "Focus together" line, "Send to {name}"; a person without one →
  "Compatibility with you · 1 credit". The elements bars and the house grid leave the
  dashboard. On a phone the panel stays the sheet, shorter.
- **The home strip** below: *What you're practising* (up to 3 per report, pinned by the
  reader from "Lean into / Notice / Practice" in the Closing or a pair's "Next time"; with
  no pin, the Closing's first Practice item), each tickable; *Share* (the type-only pair
  cards, a sideways carousel); *Your pairs* (per pair: the three strong lines and one focus).
- **Four states** as in the artifact: empty (ghost seats Partner, Mum, Best friend, Your
  child; the three bundles; two sample lines), one Personal report, two reports and a pair,
  family.
- **Underneath:** pins stored with the workbook ticks on the server (ADR-24), at most 3 per
  report, `PATCH /reports/{id}/workbook` carries `pinned`; a new `GET /home` in
  `openapi.yaml` returns pinned or default items, each pair's strong lines, one focus and
  share-card text, so the dashboard loads no full report.
- The heart icon leaves `CompatibilityRows` and the home page's people section.

### 4. The Compatibility report (notes 12 to 17)
- Chapter 01's `pointer` ("Next, we name…") leaves the schema, the prompt and the page; the
  chapter ends on the paradox. Stored reports simply don't render it.
- `SCENE_INTRO` ("A moment you will both recognise, played out.") is removed in both places.
- **Challenge for rubs.** The card tag reads "Challenge"; the doctrine and the 15 chapter
  prompts say "This is the challenge: …" instead of "This is where it rubs". The enum stays
  `rubs`: no schema change, no migration. "Flows" is unchanged.
- **No "room" as a figure of speech.** A vocabulary rule in `PAIR_DOCTRINE`: "room" only for
  a real room; "in public", never "public rooms".
- **One scene per chapter.** Each lens chapter has one fixed scene (table below); the chips,
  `writeScene` and its route go; the foundation stops choosing. Parent and child: the band
  scene by the child's age, an age under 3 written as 3 (`pairBrief`).

  | Ch | Partners | Friends, family, colleagues | A parent and a child |
  |---|---|---|---|
  | 02 | The end of a long day | The big dinner | the band scene |
  | 03 | The argument at 11 pm | The project with the deadline | the band scene |
  | 04 | The bill nobody expected | The weekend away | the band scene |
  | 05 | The weekend away (new) | Money between you | the band scene |
  | 06 | The job offer in another city | The favour too big to ask | the band scene |

- **Link cards, 3 of each.** Two columns, Flows and Challenges, three each: first the links
  the chapter 01 ledger cites, then by `synastryCompute` weight; "Show all links" opens the
  rest in place. `PAIR_PROMPT_VERSION` bumps for all of section 4.

### 5. The sample report (note 7)
/sample shows **4 of 10 chapters** (Q3): Overview, Deepdive, Superpowers, Key Paradoxes &
Discoveries. The head says "A sample: 4 of 10 chapters from Audrey Hepburn's Personal report";
the rail lists all ten, the other six dimmed with one line on what each covers, each opening
to its first paragraph only (kept in the HTML); a band "6 more chapters in your report"
between. The end shows the two pillars of section 2, then "Get my report".

### 6. Chart deepdive (note 8)
On /sample, and in the app's chapter 02 (Q3): the counter, title and a house counter ("4th
house · Home", "04 / 12", a brass progress line) stay pinned with the wheel while the cards
scroll; each card fades in as it arrives and lights its wedge as it reaches the middle (today
hover only); the three triad cards leave the chapter (the triad section is still written, the
pair reports cite it). On a phone the wheel is a 120 px thumbnail beside the pinned heading.
Reduced motion: every card shown, the wedge changes without a fade. The app's `ChartExplorer`
(one flippable card) gives way to this layout; its triad-on-the-back goes with it.

### 7. How it works pages (notes 2, 3)
- One step pattern on home's Method section and /method: a lucide line icon, the number, the
  heading, two lines and one live figure. lucide is already installed; no Material Symbols.
- **The reference check** animates once on entering view, with a replay button: the
  underline draws, each reference ticks in turn, then the seal "N references · all checked
  against her chart". The finished state is the resting state.
- **/compatibility "How to get"**: three icon steps; the three facts merge into the table
  (Costs, Scores rows); the page's three questions move to /faq's Compatibility group, into
  the FAQPage schema, with a link. Today only the h1 and lede reach structured data.

### 8. One sun (note 6)
`sun.webp` is re-made at 192 px from `sun-512.webp`, so the ten surfaces on the old render
change with no code edits; `HorizonWheel`'s dark disc behind the Sun gets thinner.

### 9. Birth place (note 18)
In `SkyForm` the place gets its own full row under date and time, the match list is the
form's width, each match shows the name on its own line (wrapping, never truncated) with the
kind and country under it. Same field on the birth form.

## Out of scope
The twelve "Noted, not changed" items in the artifact, among them the failed pairs on staging,
Strength for Flows, the "In a room together" title, first names in link titles, "Deep dive",
the share image (MB-13), the regions-only search, a Personal share card (MB-104), cutting the
triad prompt. Stripe, checkout and `LAUNCHED` stay R12's.

## Acceptance criteria
1. Pricing at 390 and 1440 px shows €24, €54 and €72, the two launch chips, the struck Singles
   totals, the example mixes and the end date; the catalogue test pins €54; no euro typed
   elsewhere.
2. No "Personal natal report", "One report", "Someone and the two of you", "orbit" or "Your
   People" in user-facing strings (a grep test); the credits sheet shows names and prices.
3. Home shows the two pillars after the hero; /sample ends with them.
4. The dashboard at 390 and 1440 px renders the four states; the title is visible; the
   Circle, People and Compatibility switch works by keyboard; pinning a Closing item shows it
   on the dashboard after reload; one `GET /home` call, no full report fetched.
5. No heart icon on any Compatibility row.
6. The dry lab renders every pair prompt with no `pointer`, the challenge wording, the room
   rule and one fixed scene per chapter; a pair with a 10-month-old child renders age 3.
7. A Compatibility report shows no scene chips and no scene intro, and three link cards of
   each kind with "Show all links".
8. /sample shows four chapters open and six dimmed with first paragraphs in the HTML.
9. Chapter 02 keeps its heading and wheel pinned and lights the wedge of the card in the middle
   on scroll, on /sample and in the app; no triad cards; reduced motion shows all cards still.
10. The reference check plays once, replays on the button and rests finished.
11. Every Sun render is the new one; "Ko…" never appears: a long place name wraps.
12. Typecheck, both builds, unit tests, codegen no diff, the dry lab, Vercel preview smoke.

## Screens
All in the artifact: the noted list, the three questions, pricing now and proposed, the names
table, the two pillars, the dashboard in four states with the switch, the compatibility diffs,
the scene table and link cards, the sample's chapter map, the scrolling deepdive, the reference
check, the compatibility steps and table, the two suns, the place field now and proposed.

## Open questions
1. **Q1, launch price.** A ★ "Launch price" against the Singles total, with an end date; B
   "You save" only; C "was €72" (not advised). Default A, until 31 Jan 2027.
2. **Q2, names.** A ★ Personal report and Compatibility report, "1 credit = 1 report of either
   kind"; B keep "Personal natal report"; C sell "reports", no credits. Default A.
3. **Q3, sample and chapter 02.** A ★ four chapters including the deepdive, and the app's
   chapter 02 takes the sample's layout; B the Owner's three, sample only. Default A.

## Decisions to record
1. Couple is €54; Single €24 and Family & friends €72 stay (supersedes ADR-142 for Couple).
2. Couple and Family & friends show a dated launch price against the struck Singles total,
   never a "was" price; the launch may exceed 25% off (supersedes ADR-146 for the launch).
3. The reports are the Personal report and the Compatibility report; 1 credit = 1 report of
   either kind, said wherever a price or balance shows; the people are "Your circle".
4. Home and /sample state the two differences: a personality report with things to try, and
   your circle with everyday scenes.
5. The dashboard is a home: titled, the circle first with People and Compatibility as lists, a
   short person panel, pinned practice items, share cards and pair focus, from one endpoint.
6. A reader pins up to 3 workbook items per report, stored with the ticks.
7. A Compatibility report has one fixed scene per chapter, no chips, no intro line; a child
   under 3 is written as 3 (supersedes ADR-72, ADR-103 in part).
8. "Challenge" replaces "rubs" in the report's words; "room" is never a figure of speech; the
   chapter 01 pointer goes.
9. Link cards show three of each kind first, the ledger's links leading.
10. /sample shows four of ten chapters and ends on the two differences.
11. Chapter 02 pins its heading and wheel, lights houses on scroll and drops the triad cards,
    in the app and on /sample.
12. One step pattern with lucide icons and one motion per step on the how-it-works pages; the
    page FAQ of /compatibility moves to /faq.
13. One Sun render everywhere.

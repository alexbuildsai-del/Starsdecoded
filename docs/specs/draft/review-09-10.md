# Review 09/10

Ideation 2026-10-09 with the Owner from the Notion page "Review 09/10": staging after R19, tested on Thibault's Personal
report (18/05/1993, 8:20, Brussels) and the Alex and Luna Compatibility report (parent and child, Luna under 1).
Artifact: https://claude.ai/artifact/B3FYNhYVK3otrSRUsmHgdr. Status: **draft**, version 3 after the Owner's second look (2026-10-09).
Touches `explain-like-a-friend` (rule 1, Did you know cards, the primer), `review-08-10` (§5 retrograde blocks, §8 rulers,
§9 observations), `review-01-10` and `compatibility-report-p2` (pair chapters and scenes), ADR-176 (the written age).
**Brain:** `api/src/prompts/system.ts`, `vocabulary.ts`, `brief.ts`, `sections/houses.ts`, `didYouKnow.ts`, `examples.ts`,
`pair/` (index, shapes, sections/links, parent-child), `lib/pairBrief.ts`. Dry lab, then a spot run on a pair with a baby.

## Scope

### 1. Explain it, every time (Owner notes 1, list 2 notes 1, 2, 8, 13, 16)
- **Rule, all four products** (`system.ts` rule 1, the pair's doctrine, Timeline and Ask): a planet, sign or house is named
  only with what it means in the same or the next sentence, then why it matters to this reader, then one everyday example.
  Exception: the same fact already explained earlier in the same chapter. "Venus is least at ease in Scorpio" always comes
  with "Venus wants calm and closeness; Scorpio wants depth". No fluff, and no cutting: the report may grow.
- **Rulers, three ideas** (the Owner, v3): the sign of a house (the rising sign starts the 1st, the signs follow), the
  planet that rules that sign (so it rules the house, wherever it sits), and the planets that happen to sit in the house.
  **The first ruler of a report** keeps the Owner's structure and adds the meaning: "Saturn rules Capricorn, the sign of this
  house, so Saturn rules your 7th (partnership) too. And your Saturn sits in your 8th (depth)… Saturn is about rules and
  patience. So with a partner, you may want clear terms on money before you relax." **Every later ruler** is said
  naturally and varied (three model variants in the artifact), never the same frame twice. "<Planet> has a say in it" at
  most once in a whole report. `houses.ts:216`'s copied template is replaced by these models; `system.ts` rule 1 likewise.
- **A house always carries its word in brackets**: "(11th, friends)", never "(11th)", in every product and every section;
  the words are `HOUSE_WORDS` (the wheel's).
- **No rarity.** `houses.ts:225` ("say how common it is"), `didYouKnow.ts:163`, the brief's `RETROGRADE AT BIRTH` numbers
  (`BACKWARDS_IN_100`, `brief.ts:77`) and the vocabulary's "so it is common" (`vocabulary.ts:314`) go. No "N in 100", "common",
  "rare", "many people" about a placement anywhere.
- **No age, ever** (the Owner, 2026-10-09: "i dont want any ages to be displayed anywhere in the text"): no prompt of any
  product states an age or asks for one; `writtenAge` and `YOUNGEST_WRITTEN_AGE` go (supersedes ADR-176's written age); the
  band stays internal. A check blocks "at <number>", "<number> years old", "aged <number>" in any report prose.
- **"Does this sound like you?"** is one thing to notice, said once; the "Behaviour check: … this week" form
  (`houses.ts:210`, `pair/sections/links.ts:129`, `parent-child/index.ts:43`, `superpowers.ts:38`) loses "this week".
- **Examples the writer copies** (`examples.ts`, with what makes each good): Thibault's chart-ruler line and 1st house
  (Moon rising in Aries, note 3), the 4th house card with Jupiter going backwards and Often noticed (notes 5, 9), and the
  pair's Venus square Sun card (note 15). **Bad examples kept as "never like this"**: the pair's Challenge lines (note 13),
  the Saturn card (note 8), the bedtime scene with "At three" (note 16).

### 2. House by House (notes 1, 2, 4, list 2 note 6)
- **Regression, restored as it was:** the planet row under the card's title (`HouseCard.tsx`, removed unasked by `8094e71`,
  R19-48): the planet renders (never symbols), Chiron and both nodes with their point marks, R, degree; `title` and `alt` give
  the name and what it does. The wheel's hover shows the full name ("Jupiter 5.0°", not "JUP 5.0°", `NatalWheel.tsx:486`).
- **Never again** (the Owner: "I don't want to see the same regression happen twice"): a `test.critical` check that every
  house card renders every body in its house, Chiron, North and South Node included; and a builder rule in
  `.claude/agents/builder.md` and `lessons.md`: a card never removes something its plan doesn't name.
- **The primer**: the four cards come before the deck, each with a small drawing from the reader's chart in the loading
  story's style (the rising sign starting the count; the twelve parts; the ruler's line from its house to where it sits;
  a planet at home and least at ease). "The cool fact, in one table" goes; the table folds behind "Where each planet feels
  at home" (`HousePrimer.tsx:54`).
- **The Jupiter-in-4th fact** ("Could home bring help?") is read in the 4th house card (list 2 note 6).

### 3. Did you know leaves the chapters (list 2 notes 3 to 7)
- No Did you know card in any chapter of the Personal report, Closing included (`didYouKnow.ts:33`, `ReportPage.tsx:495`).
  The loading screens keep their facts (ADR-316): they teach astrology and are about nobody's chart.
- Each card's idea moves into the prose at its placement: Jupiter in the 4th into the 4th house; Saturn's slow results into
  the 8th house; a retrograde's tradition into its going-backwards block. The Moon's phase goes: no chapter reads it.
- **Sun and Moon as parents** (note 7, the Owner's TikTok point): the Family chapter says it plainly, as a tradition: the
  Sun is your father, what he showed you and what you had to learn from him; the Moon your mother; then the reader's signs.
  No event, no blame (`didYouKnow.ts:162`'s rule moves to the Family section).
- **Observations into the prose:** the writer is told to use the brief's OBSERVATIONS in the sentence about that placement
  (no prompt asks today, `brief.ts:332`), the way the Jupiter going-backwards block did. Often noticed stays on house cards.

### 4. Compatibility (list 2 notes 10 to 17)
- **The hero** (question 1, default B, "two skies"): each person as their own chart, the same size, the name in its
  centre (wrapped and scaled to fit), "and" between, their strongest link drawn between the two charts. A, stacked names
  with "and" on its own line, is the plain fallback. Either way no name length can unbalance it.
- **Bugs** (since R16, not regressions): the Scroll cue at the
  bottom of the first screen on wide screens (`:168`); the wheel's Ascendant, Midheaven and their opposites drawn as short
  ticks at the band on both reports (`NatalWheel.tsx:378-406`); "source A/B" labels caught in any form by
  `stripBriefLabels` (`shapes.ts:181`) and a blocking check for a stray name letter in pair prose.
- **Age-true scenes:** the parent-and-child examples and scenes come by age (under 1, 1 to 2, 3 to 5, then the existing
  bands); `LENS_REGISTER.parent_child.examples` and `bandLines()` stop sending every band's lines to every pair. No call, screen
  or homework for a baby. No age in the text (§1).
- **The voice reaches the pair:** model passages (good and bad, §1) and the scene pool go to the pair sections; every
  contact names what each planet means and which houses both sit in, so every planet's house enters the brief (today only Sun
  to Saturn, `pairBrief.ts:256`) and the link labels carry houses.
- **Where your charts meet:** houses in brackets ("Your Saturn (11th, friends) and Athena's Neptune (10th, career)"); the orb
  moves under an ⓘ (`charts-meet.ts:101`).
- **The walk** (the Owner chose B, no scenes; v3 makes it a scroll): the Overview, then one long scroll where the two
  charts stay on screen (side by side on desktop, sticky on top on a phone) and each link, as it reaches the middle,
  lights its two planets and draws the line between the charts: teal straight for comes naturally, brass for two planets
  together, the rose zigzag for a challenge (the ledger's glyphs, `TwoChartsLedger.tsx:44`). Links are grouped in topics
  by what their planets are about (comfort and feelings: Moon, Venus, Neptune, Pluto; growing: Jupiter, Sun, Mars; talking
  and change: Mercury, Uranus; limits: Saturn), because the two planets sit in different houses for each person; each topic
  holds every link the charts make, easy and hard mixed, and opens with its count. Each card: the tag, the ledger glyph,
  a title in words, both planets with "(Nth, word)", the angle explained, what it means for them, one everyday example by
  the child's age, and "Try together" with its tick box to pin. The orb under an ⓘ. Closing stays. Same price, one credit.

### 5. Observations status (the Owner's P.S.)
- Live: 22 ideas (one with two creators, 21 with one creator plus our doctrine). Waiting: 8. Out: 18.
- 2026-10-09 researcher run: no second source for any of the 8. Every astrology site failed to resolve from the session
  (21 hosts; search results are leads only, ADR-403). Leads to read first: skyscript.co.uk (Venus–Jupiter), cafeastrology.com
  (Mars–Saturn), sallykirkman.com (Jupiter–Pluto), theastrologypodcast.com (3rd–9th), thetarotlady.com (Venus 2nd).
- Needs the Owner: the session environment's network access must allow these hosts; then `/observe` re-runs.
- The waiting list is on the Notion page "Observations inbox" (section "Waiting for a second source", added 2026-10-09);
  `/observe` keeps it in step with the annex. About 70 new screenshots arrived on the page on 2026-10-09 for the next run.

### 5b. Where docs live (the Owner asked, v3; question 2, default Notion)
- Notion stays: free, and the problem was a list he couldn't see, now on a Notion page. A private repo would need GitHub
  Pro at $4 a month (on Free, branch protection and rulesets cover public repos only) and CI minutes beyond Pro's 3,000 at
  $0.006 a minute (verified 2026-10-09 against GitHub's docs source), plus a token for the lab import and the Release
  preflight, which read GitHub without one (`labImport.ts:18`, `github.ts:105`).

### 6. Roadmap (note 1)
- A Notion **Roadmap** database under STARS DECODED for future ideas, separate from the Mailbox (Decided by Claude, with question 2). First
  item: "Learn to read your houses", a short explainer video, house by house, also used as a post.

## Out of scope
Pricing and launch (ADR-230, 242); the loading screens' Did you know; Timeline's cards; new synastry doctrine beyond the
houses; the explainer video itself (roadmap).

## Acceptance criteria
1. Dry lab: no house reading prints "<Planet> rules <Sign>, the sign on this house, and it sits in your <Nth>." as a bare
   fact; every ruler named comes with what the planet does and what the house covers (by eye, per fixture).
2. `grep -rE "in 100|BACKWARDS_IN_100|how common" api/src/prompts` finds nothing; no report prose in the spot run says
   "common" or a share of people.
3. No prompt carries an age; the spot run on beatrice-athena (a child under 2) has no age, no call, no screen, no homework.
4. Thibault's house cards show their planets with names on hover, and the wheel's hover shows full names.
5. The primer shows four cards and a closed table; no "cool fact".
6. No chapter of the Personal report renders a Did you know card; the 4th house reading of Thibault's chart names
   Jupiter's help from home; the Family chapter says Sun as father, Moon as mother.
7. The pair hero's AND is centred within 1 px with "Alex test Luna model" and "Luna"; Scroll sits at the screen's bottom.
8. The pair wheels draw the axes as ticks; no "source A/B" or stray A/B letter can reach the page (blocking check).
9. With B: the Compatibility report reads Overview, the two charts, the walk by topic, Closing; each card names both houses.

## Screens
The artifact, version 1: Part 1 the rule and five befores and afters; Part 2 the 4th house card and the primer; Part 3 where
each card goes; Part 4 the six bugs, the hero, options A, B and C, and B's walk drawn on the beatrice-athena pair from the engine.

## Open questions (each with its default)
Answered 2026-10-09: the walk (B) with no scenes; Chiron, the South Node and R come back on the cards.
1. The hero: A stacked or B two skies? Recommended and default: **B**.
2. Docs and lists: Notion or a private repo? Recommended and default: **Notion** (the roadmap a Notion database).

## Decisions to record
- Every planet, sign or house named in any report comes with its meaning, why it matters and an everyday example; a repeat
  in the same chapter is the only exception (the Owner).
- No share of people, "common" or "rare" for a placement, anywhere (the Owner).
- No age in any text of any report; the band stays internal; supersedes ADR-176's written age (the Owner).
- The ruler sentence template leaves the prompts; the rule asks for meaning instead (Decided by Claude, from the Owner's notes).
- "Does this sound like you?" never starts with "This week" (the Owner).
- The house card's planet row is restored, with names on hover; the wheel's hover shows the full name (the Owner).
- The primer keeps its four cards; its table folds away and "The cool fact, in one table" goes (the Owner).
- No Did you know card in the Personal report's chapters, Closing included; their ideas move into the prose at the
  placement; the loading screens keep theirs (the Owner; the loading-screen part Decided by Claude).
- The writer is told to use observations in the sentence about their placement (the Owner).
- Parent-and-child examples and scenes come by the child's age, under 1 included (Decided by Claude).
- Pair contacts name both planets' meanings and houses; houses in brackets on Where your charts meet; the orb under an ⓘ.
- The good and bad examples of 9 Oct go into the writer's model passages (the Owner).
- The first ruler of a report is explained in full (sign, ruler, where it sits, what it means); later ones vary; "has a
  say" at most once a report; houses always "(Nth, word)" (the Owner).
- The house card's planet row (renders, Chiron, both nodes) is guarded by a critical test; a builder never removes what its
  plan doesn't name (the Owner).
- The primer's four cards each carry a drawing from the reader's chart (the Owner, Decided by Claude for the drawings).
- The Compatibility report becomes the walk: no scenes, links grouped by their planets' topic, the two charts lit per
  link with the ledger's glyphs, a long scroll (the Owner chose B; the scroll Decided by Claude).
- Docs and lists stay in Notion; what the Owner needs to see goes on a Notion page (Decided by Claude, pending question 2).
- Pending: the hero (default B).

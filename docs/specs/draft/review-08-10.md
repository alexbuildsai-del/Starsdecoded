# Review 08/10

Ideation 2026-10-08 with the Owner from the Notion page "Review 08/10": eight numbered notes on staging after R18, plus
a P.S. about carousels and an observations brain. Artifact: https://claude.ai/artifact/CLc6MqvaUapEUgCCAgJ8Eg.
Status: **draft**. Touches `review-05-10` (the retrograde line, the loading screens' progress, the hero),
`report-loading-story` (the end of the story, the house pairs), `explain-like-a-friend` (rule 1, rulers), `timeline-page`.
**Brain:** `packages/engine` (`doctrine.ts` passes, new chart patterns), `api/src/prompts/brief.ts`, `sections/houses.ts`,
`sections/overview.ts`, `system.ts`, `vocabulary.ts`, `timeline/reading.ts`, `timeline/doctrine.ts`. Dry lab, then a spot run.
Every date and degree here is the engine's: Pluto crosses 3°52′ Aquarius on 6 Feb, 14 Aug and 14 Dec 2026, stations
retrograde 6 May and direct 16 Oct 2026. House facts are from the Owner's screenshots of staging.

## Scope

### 1. Retrograde inside a transit (note 1)
- **The engine tags each exact pass** of a contact `forward` or `backwards` (the transiting body's speed at the hit) and
  returns the backwards stretch (the station dates) that falls inside the contact's window. `ContactEvent` gains them.
- **The reading's prompt gets them**: "Exact: 6 Feb 2026 (forward), 14 Aug 2026 (backwards), 14 Dec 2026 (forward).
  Pluto goes backwards 6 May to 16 Oct 2026." Timeline doctrine gains (Decided by Claude, astrology call): the first
  pass brings the theme up; a backwards pass brings it back, quieter and more inward, gone over alone; the last forward
  pass is when it may settle. The reading must say what the backwards pass changes, with "may".
- **The card**: a chip "<Planet> going back" on the face while the planet is retrograde within the window. Read more
  gains a strip of the passes (forward in brass, backwards in rose, the backwards stretch shaded, today marked) and two
  short blocks: "Why three dates" and "What the backwards pass changes". Facts line keeps planet, aspect, house, degree.
- Applies to Jupiter through Pluto (and Chiron) whenever a contact has more than one pass. Mercury, Venus and Mars
  retrograde events keep their own cards.

### 2. The Personal report waits for the tap (note 2)
- `OpeningOverlay` no longer opens the report by itself (drops `SELF_OPEN_HOLD_MS` and the self-open). The story plays
  to its last frame and holds still on "Start reading". The early door ("We'll finish the last chapters while you
  read") stays. A failure still shows "Try again".

### 3. One progress bar on both loading screens (note 3)
- A thin bar with the percentage and a line naming what is being written ("58% · writing this month"), under the
  dial on Timeline's setup and under the story on the Personal report (replaces the bare number). One component in
  `components/loading/`.
- The bar moves only with real work: on Timeline, each reading that lands (the six steps weighted by their count of
  readings); on the Personal report, the existing `progress`. No timer, no seconds estimate. Supersedes "the loading
  screens' unchanged progress" (review-05-10).

### 4. A straight horizon in the hero (note 4)
- The hero's horizon becomes a solid, level paper line through the Ascendant and Descendant, drawn like the loading
  story's (`BuildStory` step 4), with the ring dimmed behind it. The dotted `SKY_DIM` line goes.
- **Root cause first**: the Owner's screenshot shows the dotted line tilted by a few degrees. The builder finds why
  (frame, scroll transform, or the plate's aspect) and fixes it at 390, 768 and 1440 px. The hero is otherwise unchanged.

### 5. Retrograde, said for the house (note 5)
- The generic `RETROGRADE_LINE` leaves every house card. It stays once, under the wheel, with B-73's fix (no "a few
  weeks", no "Earth is passing it" for outer planets).
- **A card with a retrograde planet** gets one block per retrograde planet: an R badge, "<Planet> is retrograde here",
  and two or three sentences written for that planet in that house: what it may cause, compared with the planet moving
  forward. Wording names it plainly ("Saturn retrograde may make you…"). The nodes never count.
- **Place**: after the reading and any stellium block, just before "Does this sound like you?" (the Owner's order).
- **Brain**: the houses section returns `retrograde: [{ planet, text }]` per house; the prompt gets the doctrine line
  per planet (`vocabulary.ts` retrograde entry made per planet, inward and on its own timetable, Decided by Claude).

### 6. The opposite line (note 6, question 1)
- `oppositeLine` ("Opposite: 8th, Depth. Mine · shared.") leaves the house card face. The opposite house appears only
  where it helps: "To balance it" on a stellium (§7). The pair words stay in the loading story and /learn.

### 7. Stelliums and other house patterns (note 7)
- **The engine computes chart patterns** (moved out of `brief.ts` so the web and the brief share one rule):
  - *Stellium*: 3 or more of the ten planets, Chiron and the North Node in one sign, at least two of them planets.
    Whole sign makes the sign and the house the same 30°; a blind chart names the sign only.
  - *Pair*: exactly two bodies in one sign. *Empty house*: none. *Angular planet*: in the 1st, 4th, 7th or 10th.
  - *Half the sky*: 7 or more of the ten planets above or below the horizon, or east or west of the meridian.
  These are astrology calls, Decided by Claude.
- **House card**: a "Stellium" chip in the header; a block after the reading: "A stellium: <n> in one house", what it
  means for this reader, then "To balance it:" the opposite house in everyday words and one thing to do.
- **Overview**: when a stellium exists, the Overview opens with it ("The loudest spot in your chart is your 9th
  house…"); half the sky gets one line. `overview.ts` replaces "ground the whole thing in … any stellium" with that.
- **Pairs** are read together in their card (what each brings, where they pull apart). **Empty houses** keep the ruler
  reading, with the reason said (§8). **Angular planets** are called among the chart's strongest, with why.
- **Did you know**: a "What's a stellium?" fact in `lib/facts.ts`, after "What's a retrograde?", shown on both
  loading screens; one plain picture, three sentences.

### 8. No planet without its reason (note 8)
- A body that is not in the house (its ruler, or any other) is named only with its reason in the same sentence:
  "Jupiter rules Pisces, the sign on this house, and sits in your 1st." If the reason doesn't help the reader, the
  body isn't named. `houses.ts` rule and `system.ts` rule 1 (explain-like-a-friend's "one clause naming why a ruler
  belongs to a house" becomes required, not allowed). chk-15 stays as it is; no new check (the Owner: prose is fixed
  in the prompt).

### 9. Claims with reasons, and the observations brain (P.S., questions 2 and 3)
- **Now, in every prose prompt**: each claim names its placement and its reason, gives one scene the reader can
  picture, and says when it shows (tired, under pressure, with someone safe). No hype, no forecasts ("guarantees",
  "destined"). Added to `system.ts`' style contract.
- **The observations brain**, built over time:
  1. The Owner drops screenshots, TikTok links, articles or book pages on one Notion page, "Observations inbox".
  2. A session skill (`/observe`) reads the inbox, splits each source into single claims, and rewrites each in our
     words: placement key, the idea, the scene, the reason, the source's account or author. Nothing stored verbatim.
  3. The same idea from different accounts or authors is merged and counted. Two posts by one account count once.
  4. An idea with **2 or more sources** (Q3 default) is checked against the doctrine and enters
     `api/src/prompts/observations.ts`, a typed table keyed by placement (planet in house, planet in sign, stellium in
     house, house ruler in house, aspect). One source waits in `docs/annex/observations-inbox.md`.
  5. `buildBrief` adds the reader's matching ideas as OBSERVATIONS, each with its reason.
- **In the report** (Q2 default): one "Often noticed" block at most per house card, after the reading and before the
  stellium and retrograde blocks: the idea, then "Why:" in one sentence. Ideas may also shape the prose.
- First seed: the 33 slides on Review 08/10. One idea already has two sources (8th house: people open up to you, you
  sense their motives). Every other idea waits for a repeat.

## Out of scope
Pricing and launch (ADR-230, 242); Mercury, Venus and Mars retrograde cards (they exist); shadow periods (explain-like-
a-friend); synastry observations; scraping any site (the Owner sends what we read); quoting any creator.

## Acceptance criteria
1. The Owner's Pluto opposite Moon card shows "Pluto going back" until 16 Oct 2026; Read more shows three passes, 6 Feb
   and 14 Dec 2026 forward, 14 Aug 2026 backwards, the stretch 6 May to 16 Oct 2026, and a reading that says what the
   backwards pass changes.
2. After the Personal report's story ends, the screen waits on "Start reading" for at least 60 s with no navigation.
3. Timeline's setup and the Personal report's story show the same bar; it never moves back and reaches 100% only when
   the last reading has landed.
4. The hero's horizon is level (both ends within 0.5 px of the same y) and solid at 390, 768 and 1440 px.
5. No house card prints the generic retrograde definition; each retrograde planet in a house has its own block,
   placed directly before "Does this sound like you?". The definition shows once, under the wheel, with B-73's wording.
6. No house card prints "Opposite:" (Q1 default).
7. The 9th house card of the chart in the Owner's screenshot (North Node, Saturn, Neptune in Pisces) shows the Stellium
   chip, the stellium block with "To balance it: your 3rd house", and Saturn's retrograde block; its Overview opens
   with the 9th house.
8. In the dry lab, every house reading that names a body outside the house gives its reason in the same sentence (read
   by eye, per fixture).
9. "What's a stellium?" appears in Did you know on both loading screens.
10. `observations.ts` holds at least the one two-source idea; the dry lab shows it in the brief of a chart with a busy
    8th house and its card shows "Often noticed".

## Screens
The artifact (version 1): note 1 the Timeline card, notes 2 and 3 the loading screens, note 4 the hero, notes 5 to 8
the 9th house card, note 7 the Overview and Did you know, P.S. the observations flow, table and block.

## Open questions (each with its default)
1. Remove the opposite line from house cards? Recommended and default: yes; it returns as "To balance it" on stelliums.
2. Observations as an "Often noticed" block or only in the prose? Recommended and default: the block, one per card.
3. Sources needed before an idea enters? Recommended and default: two, from different accounts or authors.

## Decisions to record
- A contact's exact passes are tagged forward or backwards and its backwards stretch reaches the reading and the card;
  a backwards pass is read as the theme coming back, inward, before the last pass settles it (Decided by Claude).
- The Personal report never opens by itself; the story ends on "Start reading" (the Owner).
- Both loading screens share one progress bar driven by real work, no timer; supersedes review-05-10's unchanged progress.
- The hero's horizon is a solid, level line like the loading story's; the tilt is fixed at its cause (the Owner).
- House cards drop the generic retrograde line; each retrograde planet gets a block written for its house, before
  "Does this sound like you?"; the generic line stays once under the wheel. Supersedes review-05-10's "one
  always-open line wherever an R shows" for house cards.
- Stellium: 3+ of the ten planets, Chiron and the North Node in one sign, at least two planets; pairs, empty houses,
  angular planets and half the sky are computed by the engine and read (Decided by Claude).
- A stellium gets a chip, a card block with "To balance it" (the opposite house), the Overview's opening, and a Did you
  know fact.
- A body outside a house is named only with its reason in the same sentence; required, not allowed.
- Every claim in the prose names its placement and reason, one scene, and when it shows; no hype.
- An observations brain: the Owner's sources, rewritten in our words, merged by idea, entering the brief at two
  independent sources; shown as one "Often noticed" block per house card.
- Pending Q1: the opposite line leaves house cards.

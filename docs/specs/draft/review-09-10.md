# Review 09/10

Ideation 2026-10-09 with the Owner from the Notion page "Review 09/10": staging after R19, tested on Thibault's Personal
report (18/05/1993, 8:20, Brussels) and the Alex and Luna Compatibility report (parent and child, Luna under 1).
Artifact: https://claude.ai/artifact/B3FYNhYVK3otrSRUsmHgdr. Status: **draft**, version 5 after the Owner's fourth look (2026-10-09).
Touches `explain-like-a-friend` (rule 1, Did you know cards, the primer), `review-08-10` (§5 retrograde blocks, §8 rulers,
§9 observations), `review-01-10` and `compatibility-report-p2` (pair chapters and scenes), ADR-176 (the written age),
ADR-97 (two charts never joined), ADR-202 (the name rule), MASTERFILE §9 (design system).
**Brain:** `api/src/prompts/system.ts`, `vocabulary.ts`, `brief.ts`, `sections/houses.ts`, `didYouKnow.ts`, `examples.ts`,
`pair/` (index, shapes, sections/links, parent-child), `timeline/reading.ts`, `ask/index.ts`, `lib/pairBrief.ts`,
`lib/promptLoader.ts`. Dry lab, then a spot run on a pair with a baby.

## Scope

### 1. Explain it, every time (Owner notes 1, list 2 notes 1, 2, 8, 13, 16)
- **Rule, all four products**: a planet, sign or house is named only with what it means in the same or the next sentence,
  then why it matters to this reader, then one everyday example. Exception: the same fact already explained earlier in the
  same chapter. No fluff, and no cutting: the report may grow.
- **Rulers, three ideas**: the sign of a house (the rising sign starts the 1st, the signs follow), the planet that rules that
  sign (so it rules the house, wherever it sits), and the planets that happen to sit in the house. **The first ruler of a
  report** keeps the Owner's structure and adds the meaning ("Saturn rules Capricorn, the sign of this house, so Saturn rules
  your 7th (partnership) too. And your Saturn sits in your 8th (depth)… So with a partner, you may want clear terms on money
  before you relax."). **Later rulers** are said naturally and varied (three model variants in the artifact). "<Planet> has a
  say in it" at most once a report. `houses.ts:216`'s template and `system.ts` rule 1 are replaced by these models.
- **A house always carries its word in brackets**: "(11th, friends)", never "(11th)", in every product (`HOUSE_WORDS`).
- **No rarity**: `houses.ts:225`, `didYouKnow.ts:163`, `BACKWARDS_IN_100` (`brief.ts:77`) and `vocabulary.ts:314` go.
- **No age as a number** (the Owner, v4: "saying never… is never really never"): no prompt states or asks for an age;
  `writtenAge` and `YOUNGEST_WRITTEN_AGE` go (supersedes ADR-176's written age); the band stays internal. A stage of life is
  fine where a placement speaks to it ("when you were young", "as you grow older"). Said in the prompt as a default with its
  reason, not a ban.
- **No vague words** (v4): "what's real", "keep it real", "authentic", "true self" and their kind leave the prompts and the
  examples; the writer says the actual thing ("until you've seen it can work"). The Neptune before and after is the model.
- **Soft rules with reasons**: the voice states defaults and why, so the writer can step outside one when it truly helps the
  reader; hard lines stay only for safety (no event predicted, no blame, no health or money advice).
- **"Does this sound like you?"** loses "this week" (`houses.ts:210`, `pair/sections/links.ts:129`,
  `parent-child/index.ts:43`, `superpowers.ts:38`).
- **Examples the writer copies** (`examples.ts`, good and bad, each with why): Thibault's chart-ruler line and 1st house,
  the 4th house card, the pair's Venus square Sun card, the life-stage line (Sun and Mercury in the 11th), the Neptune line;
  bad: the pair's Challenge lines, the Saturn card, "At three", "what's real".

### 1b. One voice, read by every writer (the Owner: "this is where the money sits")
- The voice (the style contract, how we explain, rulers, brackets, words we avoid, good and bad passages) becomes one
  block in `system.ts` that every writer's system prompt imports. (The Owner never edits prompts from the admin, so no
  override guard is needed.)
- Personal, Compatibility, Timeline and Ask all receive the model passages (today only Personal does,
  `aiInterpretation.ts:227`). A French writer or translator later imports the same block; nothing is copied.
- Rules live in the prompt; a check is added only where the text would be wrong for the reader (ADR-81).
- The bible gains a **Voice** page that renders this block live, so the Owner reads what the writers read.

### 2. House by House (notes 1, 2, 4, list 2 note 6)
- **Regression, restored as it was:** the planet row under the card's title (`HouseCard.tsx`, removed unasked by `8094e71`):
  renders (never symbols), Chiron and both nodes, R, degree; `title` and hover give the name and what it does. The wheel's
  hover shows the full name (`NatalWheel.tsx:486`).
- **Never again:** a `test.critical` check that every house card renders every body in its house, Chiron and both nodes
  included; a builder rule in `.claude/agents/builder.md` and `lessons.md`: a card never removes what its plan doesn't name.
- **The primer**: four cards before the deck, each a short loop on the reader's chart in the chart system's Teach state,
  played only on screen, the last frame under reduced motion, words only: (1) the horizon stays flat and the sky turns under
  it until the rising sign reaches the east, then the houses count round; (2) each house lights in turn with its word and
  what it covers (`HOUSE_COVERS`), no drawings; (3) a house's sign lights and a line runs to its ruler (three of the
  reader's houses in turn); (4) "A planet is at home in some signs", starting from the planet: Venus wants calm and
  closeness; Taurus and Libra want that too (at home); Aries and Scorpio want a win or intensity (least at ease); then the
  reader's Venus lands at its degree. The table folds behind "Where each planet is at home"; "The cool fact" goes.
- **The Jupiter-in-4th fact** ("Could home bring help?") is read in the 4th house card.

### 2b. The chart system (the Owner, v4: "settle it once and for all")
- **The backbone is the landing page's wheel (`HorizonWheel.tsx`), kept exactly as it is** (the Owner: "don't rebuild
  it"): the horizon flat with the rising degree at 9 o'clock and the chart turning under it (already decided); two curved
  lines on the rim following the circle, the sign outside and "4 · HOME" inside, never straight or spilling out; 5° ticks;
  renders at their true degree, crowding stepping inward; aspects inside the inner circle in its colours, solid applying,
  dashed separating. Every other chart takes its format through `wheel-geometry.ts`; on a report chart Chiron and the
  nodes are always drawn.
- **One Ascendant marker.** The MC is never the same icon: it is the landing's "MC" label at the top of its line
  (`AngleGlyph`'s midheaven variant goes). Small charts (pair plates, the hero) draw no axes. Links between two people keep
  the ledger's glyph (teal, brass, the rose zigzag).
- Seven states: Full, Focus (one house lit, the rest dimmed), Teach (few parts, moving), Pair (two plates apart, named,
  never joined, ADR-97), Small (Sun and Moon), No birth time (signs only), Loading (builds in the same geometry).
- Moves onto it: the natal loading story (dots and fixed radii today, `BuildStory.tsx`), the pair loading story
  (`PairStory.tsx`), the ledger's and Did you know's glyph fallbacks, the pair wheels' axes (`NatalWheel.tsx:378-406`), the
  hardcoded hex in PairStory, TwoPlates, Dial and the ledger (tokens instead). The dashboard's orbit stays not-a-chart.
- Reused parts, documented: the planet pill, the Ascendant marker and MC label, the link glyph, How two planets meet.
- **No house drawings** (the Owner, v5: "it looks really childish… keep it as text"): `HouseObject.tsx` leaves the primer,
  and the loading story too if question 3 says so (ADR-321).
- Written in `docs/annex/chart-system.md` (rules, states, do's and don'ts) and the bible's design page, rebuilt from the live
  tokens (it still shows the Astra-era styles); the "Stars Decoded Atlas" canvas is the base. `/ideate` and `/web-taste`
  draw charts by it.

### 3. Did you know leaves the chapters (list 2 notes 3 to 7)
- No Did you know card in any chapter of the Personal report, Closing included (`didYouKnow.ts:33`, `ReportPage.tsx:495`).
  The loading screens keep their facts (ADR-316).
- Each idea moves into the prose at its placement; the Moon's phase goes. **Sun and Moon as parents** in the Family chapter,
  as a tradition, no event, no blame. The writer is told to use the brief's OBSERVATIONS in the sentence about that
  placement (`brief.ts:332`). Often noticed stays on house cards.

### 4. Compatibility (list 2 notes 10 to 17)
- **The hero** (the Owner, v4: "we can do both"): the kicker, the two names stacked with "and" between, sized by length and
  wrapping, and beside them (under them on a phone) each person's own chart, named, the same size, apart. **No line**: there
  is no single strongest link (the brief sorts a dozen by orb) and ADR-97 bars a joining line.
- **The hero's names** stay modest: at most 42 px on a computer and 30 px on a phone, smaller for long names.
- **Names with numbers** (question 1): `PERSON_NAME_PATTERN` (`web/src/lib/person-name.ts:7`, the three name fields in
  `openapi.yaml`) adds digits and "/", so a test report can be named "Alexandra 9/10". Safe: names reach the writer only in
  the data block (R13-12). Default yes.
- **Bugs** (since R16): the Scroll cue at the first screen's bottom (`PairHero.tsx:168`); the axes as markers on every chart
  (§2b); "source A/B" caught in any form by `stripBriefLabels` (`shapes.ts:181`) and a blocking check for a stray letter.
- **Age-true scenes:** examples and scenes by the child's age band (under 1, 1 to 2, 3 to 5, then the existing bands);
  `LENS_REGISTER.parent_child.examples` and `bandLines()` stop sending every band's lines to every pair. No age in the text.
- **The voice reaches the pair:** §1b; every contact names what each planet means and both houses ("(Nth, word)"); every
  planet's house enters the brief (today Sun to Saturn, `pairBrief.ts:256`); the orb under an ⓘ (`charts-meet.ts:101`).
- **How two planets meet** (new, the Owner: "we never actually explained them"): before the walk, five small dials, one per
  angle (together 0°, sextile 60°, square 90°, trine 120°, opposite 180°), each with its colour, a plain line, and the pair's
  own example where one exists. The Owner's model visual: saved in `docs/annex/liked-visuals.md`; it also goes on the
  site's Learn pages and behind each link's ⓘ in the walk.
- **The walk** (the Owner chose B, no scenes): after the Overview, **one card a screen**: the page snaps and locks on each
  (`scroll-snap-type: y mandatory`, `scroll-snap-stop: always`); a card fits the space under the stage. **Groups come from
  the charts, not the prompt** (question 2): each link joins the group of its faster planet (Moon, Mercury, Venus, Sun,
  Mars, Jupiter, Saturn: "Feelings and comfort", "Talking", "Affection", "Who you are", "Drive and friction", "Growing",
  "Limits and staying power"), outer-to-outer contacts last ("The times you were born into"); empty groups never show; the
  group name heads its first card. Sources index synastry planet pair by planet pair (search snippets only, 2026-10-09:
  the hosts failed to resolve; unverified). **The link is shown on the two charts themselves** (the Owner, v5: no third
  circle): each named chart ("You · Beatrice", "Athena") lights its own planet with its owner's ring (yours blue, theirs
  lilac), dims the rest, and shows the other person's planet as a faint dashed guest at its true degree; the angle is drawn
  across the inner circle, where the chart draws aspects, in the link's glyph, with its degrees at the centre. This puts
  one planet of the other chart on a plate: supersedes ADR-97 in that part, at the Owner's ask. Each card: tag, a title in words, both
  planets with owner and "(Nth, word)", what the angle means, one everyday example by the child's age, Try together with
  its tick box. Phone: stage on top, cards under it; computer: stage left, cards right. Closing stays. Same price, one credit.

### 5. Observations, docs and the roadmap
- Live: 22 ideas; waiting: 8 (listed on the Notion "Observations inbox" page, 2026-10-09); out: 18. Second sources need the
  session network to reach the astrology hosts (skyscript.co.uk, cafeastrology.com, sallykirkman.com first). About 70 new
  screenshots wait for the next `/observe`.
- **A private repo and docs in it**: the Owner leans that way; handed on 2026-10-09 to the "Rounds R16-R19 efficiency
  analysis" session with the verified prices (Pro $4 a month for branch protection on a private repo, 3,000 included
  minutes, $0.006 a minute beyond), the two token-less GitHub reads that would break (`labImport.ts:18`, `github.ts:105`),
  and his condition: CI minutes measured and the waste cut first. Measured there (3 to 9 Oct): 2,387 minutes a week, about $43
  to $52 a month private; after alexbuildsai-del/Starsdecoded#135 (approved), about $0 to $1 plus Pro. Not decided here.
- **Roadmap**: a list of future ideas, separate from the Mailbox, wherever the docs question lands. First item: "Learn to
  read your houses", a short explainer video, house by house, also a post.

## Out of scope
Pricing and launch (ADR-230, 242); the loading screens' Did you know; Timeline's cards; new synastry doctrine beyond the
houses; the explainer video itself; the private-repo decision (the efficiency session).

## Acceptance criteria
1. Dry lab: every ruler named comes with what the planet does and what the house covers; the first ruler in the Owner's
   structure (by eye, per fixture).
2. `grep -rE "in 100|BACKWARDS_IN_100|how common|what's real|keep it real" api/src/prompts` finds nothing.
3. No prompt carries an age; the spot run on beatrice-athena (a child under 2) has no age number, no call, screen or homework.
4. The dry render shows the voice block in every product's system prompt; Pair, Timeline and Ask contain the model passages.
5. Thibault's house cards show their bodies with names on hover; a critical test fails if one is removed.
6. The primer's four loops run on screen only and show their last frame under reduced motion; no "cool fact".
7. No chapter of the Personal report renders a Did you know card; the Family chapter says Sun as father, Moon as mother.
8. The pair hero holds "Alex test Luna model" and "Luna", and a 30-letter name, at 390 px and 1280 px with no overlap and no
   line between the charts; Scroll sits at the screen's bottom.
9. No chart draws a body as a dot or a Unicode symbol (render fallback excepted), axes on a small chart, the MC with the
   Ascendant's marker, rim text off its arc, or a hex colour outside the tokens (grep and the probe).
10. The walk snaps one card a screen at 390 px and 1280 px; each link is drawn on both charts, every lit planet with its
    owner's ring and the other's as a guest; no third circle.

## Screens
The artifact, version 4: Part 1 the voice (three ideas, words we avoid, one voice for every writer); Part 2 the chart system
(backbone, seven states, do's and don'ts, parts); Part 3 the primer loops and the house card; Part 4 Did you know; Part 5 the
hero, how two planets meet, the walk on a phone and a computer, the topics with owners; Part 6 observations and docs.

## Open questions (each with its default)
Answered 2026-10-09: the walk (B) with no scenes and no third circle; Chiron, the nodes and R back on the cards; the hero
stacked plus two skies, no line; the landing wheel as backbone; no house drawings in the primer; docs and the private repo
go to the efficiency session; phone and computer in every mock.
1. Allow digits and "/" in names? Recommended and default: **yes**.
2. Group the links by their faster planet, computed in code? Recommended and default: **yes**.
3. Take the house drawings out of the loading story too (ADR-321)? Recommended and default: **yes**, words only.

## Decisions to record
- Every planet, sign or house named in any report comes with its meaning, why it matters and an everyday example (the Owner).
- No share of people, "common" or "rare" for a placement (the Owner).
- No age as a number in any report; a stage of life is fine; supersedes ADR-176's written age (the Owner).
- Vague words ("what's real", "keep it real") leave the voice; the writer says the actual thing (the Owner).
- Voice rules are defaults with reasons, not bans; hard lines only for safety (the Owner).
- The voice is one block every writer imports, with the model passages, for every product and any future language; the
  bible shows it (the Owner asked; the mechanism Decided by Claude).
- The first ruler of a report is explained in full; later ones vary; "has a say" at most once; houses always "(Nth, word)".
- "Does this sound like you?" never starts with "This week" (the Owner).
- The house card's planet row is restored and guarded by a critical test; a builder never removes what its plan doesn't name.
- The primer's four cards are short loops on the reader's chart; its table folds away; "The cool fact" goes.
- One chart system (the landing wheel as backbone, seven states, reused parts), written in the annex and the bible; the
  loading stories and the ledger move onto it (the Owner; the details Decided by Claude).
- No Did you know card in the Personal report's chapters; their ideas move into the prose; Sun and Moon as parents.
- The writer uses observations in the sentence about their placement (the Owner).
- Parent-and-child examples and scenes come by the child's age, under 1 included (Decided by Claude).
- The pair hero: names stacked, each person's own chart beside them, no line (the Owner).
- The walk: one card a screen with snap; the link drawn on both charts with the other's planet as a guest (supersedes
  ADR-97 in part); owners named and ringed; How two planets meet before it and on the site (the Owner).
- The landing wheel is the chart backbone, unchanged; one Ascendant marker, the MC its label; no house drawings (the Owner).
- Every ideation mock shows phone and computer side by side (the Owner; CLAUDE.md and `/ideate`).
- Pending: names with digits (yes); groups by the faster planet (yes); house drawings out of the loading story (yes).

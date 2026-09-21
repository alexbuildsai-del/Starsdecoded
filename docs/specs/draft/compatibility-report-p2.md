# Compatibility report, second pass

Ideation 2026-09-20 and 21 with the Owner, from note 5 of "Review 20/09" and the Owner's two
replies. Artifact, with the three lenses, every chapter's card and scenes, one whole chapter
in the blend, the engine table and the sources: https://claude.ai/artifact/Am3TWP2XpqkbzZy8M9tBXL. Status: **draft**, locked
together with `review-20-09.md`. Builds on `compatibility-report.md` (ADR-39 to 45) and
amends ADR-40 and ADR-44.

## Why
Four causes in the brain: a four-scene register injected twice and demanded by every
prompt; nine parallel sections handed the same material, so they repeat it; 14 to 16 natal
passages restating the personal reports; prompts that ask for behaviour, never the mechanism.
The Owner's brief: a counselling workbook for two people, tangible day to day, shorter,
psychology behind the pattern, likely scenes, and men will read it.

## Scope

### Shape: seven chapters, the two charts first
- 01 **Your two charts**, the introduction (Owner, 21 Sept): the bi-wheel with a static
  legend in product copy (inner ring A, outer ring B, a line is where one meets the other,
  brass touch, teal ease, rose friction, tap a line), then generated: the verdict headline
  (the pair thesis) · what is naturally strong between you, three lines, each cited to its
  link and pointing at its chapter · what will take work, three lines, framed as what it
  trains (ADR-5) · the paradox, one line · a card, your three strengths as a pair · one
  pointer sentence. 300 to 360 words. Link cards stay under the wheel. "How you meet" is gone.
- 02 to 06 set by the lens · 07 What to practise (the next-time items collected into the
  three checklists, nothing new, the 80 to 100 word closing). Two ways of being, Where it
  flows, Where it rubs and How you talk go; flow and friction live in every lens chapter's
  pattern block, and talking is a lens chapter in each lens.
- Every lens chapter: a verdict headline in B's voice · a **side-by-side card** (three lines
  per person in that person's own words from their personal report, one line for the pair;
  twelve words a line, names only the two, no body names, no number; generated and validated
  like link cards) · one **scene** written by the main model (four to six present tense
  sentences, both names, may hold a short quoted exchange, no facts outside it) · **what just
  happened** with because A and because B (25 to 40 words each, the need, fear or habit under
  that side, in that report's words, cited as a source claim) · **the pattern under it**
  (40 to 60 words, cited to the chapter's own link, and it says whether this is where it
  flows or rubs) · **next time** (two or three items, who it is for, action, why on its own
  line). 230 to 300 words a chapter. Prose total 1,900 to 2,500; cards outside, about 400.
- Three scenes per chapter, named in the chapter spec. The foundation picks the one that
  fits the pair; the other two are chips under the scene, written on tap by the fast model
  after the Groq experiment is read (Review 20/09); until then no chips.

### The hero (Owner, 21 Sept)
- No ring on the compatibility hero. Two triad plates side by side, one per person: Sun,
  Moon and rising with the natal hero's renders; degree and sign on a phone, house and ruler
  from 640 px up; the reader's own report on the left; a blind chart shows "rising · not
  drawn" and the Moon's arc as the natal hero does. Eyebrow "Compatibility report · {lens}",
  the two names with AND between, the plates, the scroll cue clear of the corners.
- The four corners carry both birth records: left column A's date, time, place and
  coordinates; right column B's. The "whole-sign · tropical" line joins the eyebrow.
- The hero keeps the starfield and blobs (two skies); no gather on this page, the opening
  crossfades from the generation screen. Print: the plates and corners, no sky.

### Lens 1, Partners (chapters 02 to 06)
02 How you love (care shown and wanted: words, time, help, gifts, touch, as vocabulary,
never a match; scenes: the end of a long day · a birthday, planned badly · the thumbs-up) ·
03 How you fight and repair (pursuer and withdrawer, the four corrosive habits and their
antidotes as plain behaviour, the repair each accepts; scenes: the argument at 11 pm · the
silent car ride · day two of an apology) · 04 Home, chores and money (whose standard, who
carries the list, how a bill lands, fairness as each feels it; scenes: the dishwasher, again
· the bill nobody expected · guests on Saturday) · 05 Fun, weekends and holidays (out against
in, planner against drifter, the shape of a holiday that fits both, never a destination;
scenes: Friday, 7 pm, no plan · booking the summer in January · day three of the holiday) ·
06 What you are building (ambition, time apart, distance, the strengths as a pair; scenes:
the job offer in another city · two weeks apart · the five-year conversation).
Grounding per chapter and the sources are in the artifact.

### Lens 2, Parent and child
- Frame: goodness of fit (Thomas and Chess). The child read as potential (ADR-40); the
  parent addressed as the one who adapts. The infographic's positive-parenting techniques
  are doctrine behind the next-time items, never named on the page.
- **The child's age band** is derived from the child's profile birth date at generation and
  stored on the report's meta: little (0 to 5), school (6 to 12), teen (13 to 17), grown (18
  and over). Scenes, cards and the "fair at this age" lines change with the band; the
  doctrine carries the research lines per band (tantrum norms, chores by age, the ten-minute
  homework rule, the AAP screen guidance, the Pew adult-child friction list).
- 02 What your child needs from you (scenes by band: bedtime, the third call · the morning
  rush · the closed door · the Sunday call) · 03 Feelings and the big reactions (emotion
  coaching's five moves, which one this parent skips; the supermarket floor · losing the game
  · the door slam after a text · the call that ends in silence) · 04 Home, chores and
  contributing (tidying before dinner · the room, the deal, the pocket money · the kitchen
  after they cooked · a week back home) · 05 School, homework and how they learn (autonomy
  support over control; the drawing that isn't "right" · homework at the kitchen table ·
  "I've revised" · the choice you don't understand) · 06 Rules, freedom and screens (warm and
  firm; turning off the tablet · one more episode · the phone at midnight · the rule that no
  longer applies).

### Lens 3, Two people (family, friends, colleagues) — amends ADR-40's "family" lens
- One lens for anyone not a partner or a parent and child. `relationships.type` `family`
  becomes `people`; the picker asks "How do you know each other?" (family · friends ·
  colleagues) into the free label; that answer picks which scene and a few words of
  register, never the engine. Marketing door: "Friends, family, colleagues". One remap added
  to the R05 migration script.
- 02 In a room together (the big dinner · the meeting where one goes quiet · the party you
  both said yes to) · 03 Working on something together (planning mum's sixtieth · the project
  with the deadline · moving day) · 04 Having fun (the weekend away · the night that ended
  early, or late · the hobby one of you wanted to share) · 05 The hard talk (money between
  you · the feedback at work · the thing unsaid for a year) · 06 What you give each other
  (three months without talking · the favour too big to ask · the joke only you two get).
- Birth order is not used (Rohrer et al. 2015 finds no effect on personality).

### Engine
- Fifteen lens chapter specs plus two fixed in `api/src/prompts/pair/`; the lens chapter
  schema is headline, card, scene, whatJustHappened (with becauseA, becauseB), pattern,
  nextTime, claims; chapter 01's is headline, strong, work, paradox, strengths, pointer,
  claims; `PairPassageSchema` goes. `PAIR_PROMPT_VERSION` p2.
- Per-chapter brief: the links the foundation gave the chapter (at most two chapters a
  link), the claims of the personal-report sections the chapter draws on, its three scenes,
  the band; the brief before the instructions so the parallel calls share one cached prefix.
  `validatePairClaims` rejects a cross claim outside the chapter's allocation.
- Foundation adds: link ownership, the scene per chapter, the band, the three strengths.
- Validators add: no bracketed evidence; card lines at twelve words naming only the two;
  a scene names both; every why has a verb; a band line never contradicts the doctrine.
- Lens doctrine per lens, appended to the pair doctrine: the vocabulary and research lines
  in the artifact, never written for the reader (rule 1 stands). Love languages are named
  generically; the numbered book title is a registered trademark and never appears.
- Lab: `--pair` on all three lenses, plus one parent-and-child run per band on fixtures
  whose birth dates fall in each band (fixtures grow, birth data only); the repetition score
  under its bar (Review 20/09); cost under 25 cents a report; pasted in the round report.
- Rendering: `PairSections.tsx` gains the card, the scene block with its chip row, the
  because kickers and the next-time checklist; chapter 07 reuses `Checklist`; the wheel
  legend and the two triads are static components on chapter 01. A share card (the
  strengths card and the headline as one image) is question 3.

## Out of scope
- Composite charts, transits, a third person, a score, a destination for a holiday, any
  clinical claim (the report describes patterns, never diagnoses: R-5.2), the natal report.

## Acceptance criteria
1. `PAIR_CHAPTER_IDS` has seven ids; chapters 02 to 06 differ by lens in title, card, scene
   set and prose; 01 and 07 are the same shape under every lens; 01 opens on the wheel with
   its legend, and its strong, work and paradox lines each cite a link.
9. The compatibility hero at 390 px shows no ring, two triad plates with both people's
   Sun, Moon and rising at their true degrees, both birth records in the four corners, and
   the cue clear of them; at 1440 px the plates flank the names; a blind side reads
   "rising · not drawn".
2. Every lens chapter renders headline, card, scene, what just happened with two cited
   because-lines, pattern, next time; the card has three lines a side and one for the pair,
   none over twelve words, none naming a body; the scene names both people.
3. A parent-and-child report writes for the band of the child's birth date; the lab shows
   four runs, one per band, with band-appropriate scenes and no line contradicting the
   doctrine table; the band is on the report's meta.
4. The picker offers Partners, Parent and child, Two people; the third asks how they know
   each other; a stored `family` relationship reads as `people` after bootstrap.
5. The lab's three lens runs land inside 1,900 to 2,500 words of prose, the repetition
   score under its bar, no bracketed evidence, cost under 25 cents; pasted in the report.
6. No claim is cited outside its chapter's allocation; the validator has a unit test.
7. The chip row is absent until the Groq page has been read; the written scene is present.
8. Typecheck, both builds, unit tests, codegen no diff, `db:bootstrap` clean (p2 reset and
   the type remap idempotent), Vercel preview smoke.

## Screens
All in the artifact: the frame; each lens's five chapters with grounding, headline, card and
three scenes; the parent bands; the marketing doors; one whole partners chapter in the
blend; the engine table.

## Open questions
1. The five lens chapters as laid out, for all three lenses? Recommendation: yes. Default:
   as laid out.
2. The third lens is Two people with a "how do you know each other" answer? Recommendation:
   yes. Default: yes.
3. A share card on chapter 01 (headline, strengths, both names, the wheel behind, no
   placements) in this pass? Recommendation: yes, it is the growth loop. Default: yes.

## Decisions to record
1. **Seven chapters, the two charts first.** Your two charts opens as the introduction
   (legend, triads, strong, work, paradox, strengths); five day-to-day lens chapters, each a
   verdict, a side-by-side card, a scene, what just happened with two because-lines, the
   pattern, next time; What to practise closes. 1,900 to 2,500 words of prose. Amends
   ADR-40's chapter list and band and ADR-43's chapter 02 line.
2. **The pair tone is C with B in two fixed places**: the headline and the next-time list.
3. **Three scenes per chapter, curated**, one written, two on tap after the experiment.
4. **Links are owned and briefs are per chapter**; repetition is measured in the lab, not
   edited; an editing pass only if p2 misses the bar, and then by quote match.
5. **Parent and child writes for the child's age band**, derived from the birth date.
6. **The third lens is Two people**, family, friends or colleagues by one answer, replacing
   the family lens. Amends ADR-40.
7. **Evidence lives in claims only**; no body, aspect or orb in prose. Amends ADR-44.
8. **The research is doctrine**, named nowhere on the page; love languages generic, no
   numbered title; no score, no diagnosis, no birth order.

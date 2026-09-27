# R06 plan — the report on a phone, and the compatibility report as a workbook

Planned 2026-09-21 on `claude/affectionate-lamport-v93urs`, from the two locked specs the Owner
named: `docs/specs/locked/review-20-09.md` (ADR-59 to 62) and
`docs/specs/locked/compatibility-report-p2.md` (ADR-63 to 71). Both amend
`natal-report-pass-three.md` (ADR-46 to 51) and `compatibility-report.md` (ADR-39 to 45), which
shipped in R05. No QA report exists; R05's lab findings stand in for one.

**Not in this round.** `docs/specs/locked/report-lab-model-matrix.md` (ADR-52 to 58) is unplanned
and stays unplanned: no card, no Groq provider, no `GROQ_API_KEY`, no admin Lab page.

**Owner decision, 2026-09-21, recorded as ADR-72** (supersedes ADR-65's "after the Groq experiment
is read"): the chip row ships now and `gpt-5.2` writes the two on-tap scenes. Acceptance 7 of the
p2 spec reads **chips present, written by gpt-5.2**. The Groq provider, its key and the blind
matrix belong to the model-matrix spec, in its own round, after the Owner sets Railway up there.

## Mailbox rows above 2 rounds open after this plan's increment

At **5**: MB-5, 6, 8, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30. At **4**: MB-31
(blocking, the legal entity; the Owner's only outstanding input), MB-33, MB-35. None of them
blocks a card here. MB-43, 47, 49, 50 are at 2. The R05 rows are at 1, and three of them are goals
below. Raised today: MB-63, MB-64, MB-65 (Questions raised).

## Goals

1. **No report fails, and the horizon pass stays honest.** MB-62 is blocking: about 7% of natal
   generations died on `triad` claim validation, which a customer would see. MB-60 (the passed
   report runs 269 words over the 5,500 ceiling) and MB-61 (60 claims before the pass, 53 after)
   go with it. Nothing else in the natal brain moves.
2. **The compatibility brain, second pass.** Seven chapters with the two charts first, fifteen
   lens chapter specs plus two fixed, per-chapter briefs with owned links, the child's age band,
   the third lens generalised to Two people, `PAIR_PROMPT_VERSION` p2, evidence in claims only.
3. **The compatibility page, second pass.** The hero with two triad plates and no ring, chapter 01
   on the wheel with its legend, the side-by-side card, the scene with its chip row, the two
   because-lines, the pattern, the next-time checklist, the share card, the picker's third lens.
4. **The report reads right on a phone.** The hero at 390 px, the two skies, the generation screen
   as its own screen with the scroll locked, the orrery moving on a phone, the Closing gap.
5. **The copy the Owner read wrong.** The evidence sheet's two labelled lines, a why on its own
   line in both reports, and the Personal natal report named as itself everywhere.

## Preconditions

1. `round/R06` branches from this branch. Every builder reads MASTERFILE §0 plus the sections its
   card names, and the artifact its card names, for geometry, copy and timing, never ported
   literally: Review 20/09 https://claude.ai/artifact/M9SMzqwbNcXtuSZGws2p2F · compatibility p2
   https://claude.ai/artifact/Am3TWP2XpqkbzZy8M9tBXL.
2. The pinned shapes below are the contract between parallel cards. A builder who needs to change
   one stops and raises it (R-0.1). Inside a wave a card may land before the card it imports from;
   the wave's end state compiles and the orchestrator accepts a red intermediate, as in R05.
3. **Single owners, per wave.** `packages/api-spec/openapi.yaml`, `packages/db/src/schema` and
   `scripts/bootstrap-db.sh` → R06-01 · `api/src/prompts/pair/shapes.ts` → R06-02 ·
   `api/src/lib/pairBrief.ts` and `pairInterpretation.ts` → R06-03 · `api/src/lib/models.ts` →
   R06-16 · `api/src/prompts/pair/index.ts` → R06-15 · `web/src/index.css` → R06-07 in wave A and
   R06-17 in wave B, nobody else · `web/src/components/report/ReportHero.tsx` → R06-07, then
   R06-17, then R06-24 · `ReportPage.tsx` → R06-22 · `CompatibilityReportPage.tsx` and
   `web/src/hooks/useLiveReport.ts` → R06-20 · `web/src/types/chart.ts` → R06-19 ·
   `web/src/lib/lenses.ts` and `DashboardPage.tsx` → R06-21, then R06-24.
4. A card that needs styling in a wave where it does not own `index.css` styles in its own
   component, or raises it. No card mixes a prompt change with a UI change.

## Pinned shapes

- **Pair registry**: seventeen specs. Two fixed, `twoCharts` (chapter 01) and `whatToPractise`
  (chapter 07), plus `links`; and fifteen lens chapters keyed `pair:partners02` … `pair:people06`.
  `pairSectionIds(lens)` returns eight ids in order (`twoCharts`, the lens's five,
  `whatToPractise`, `links`); `pairChapterIds(lens)` returns the seven. `PAIR_PROMPT_VERSION` p2.
- **Lens chapter schema**: `{ headline, card: { a: string[3], b: string[3], pair: string },
  scene, whatJustHappened: { becauseA, becauseB }, pattern, nextTime: { items: [{ for, action,
  why }] }, claims }`. Chapter 01: `{ headline, strong[3], work[3], paradox, strengths[3],
  pointer, claims }`. `PairPassageSchema` and the old `PairChapterSchema` go.
- **Bands**: lens chapters 230 to 300 words; chapter 01 300 to 360; chapter 07 unchanged. Prose
  total 1,900 to 2,500, cards outside it.
- **Lens**: `Lens = "partners" | "parent_child" | "people"`; `relationships.type` default
  `people`; the free label carries family, friends or colleagues.
- **Age band**: `band = "little" | "school" | "teen" | "grown"` from the child's birth date at
  generation, on `interpretation.meta.band`, null outside the parent lens.
- **Scenes**: three per lens chapter in the spec; the foundation picks index 0 to 2 as the written
  one; the other two are `POST /compatibility/{id}/scenes` `{ chapter, index }`, written by
  `MODELS.scenes = "gpt-5.2"` (ADR-72), stored on the interpretation, served from storage after.
- **Progress, pair**: n = 8; door = real ≥ 67 and `twoCharts` and the lens's chapter 02 landed.

---

## Wave A — contract, engine shapes, the natal brain, and the standalone page fixes

Dispatch R06-01 to R06-11 in one message.

### R06-01 — Contract, schema and the lens remap (INTERNAL)
Objective: every shape the round adds exists in the contract and the database before anything
writes to it: the lens chapter and chapter 01 schemas on the compatibility report, `meta.band`,
the on-tap scene route, `people` in place of `family`.
Files: `packages/api-spec/openapi.yaml`; generated client and zod by codegen only;
`packages/db/src/schema/relationships.ts`; `packages/db/scripts/migrate-remap-relationship-types.ts`;
`scripts/bootstrap-db.sh`.
Refs: MASTERFILE §3, §7 (R-7.2, R-7.3); p2 spec, Engine and Lens 3; acceptance 4 and 8.
Done-when: `family` remaps to `people` in `relationships.type` and the default changes; the
migration runs three times on a scratch database with the same result; bootstrap step 6 resets
pair prompt overrides to p2 as it reset natal to v6; `pnpm --filter @workspace/api-spec run
codegen` leaves no diff; typecheck green. No route is added that the spec does not describe.

### R06-02 — Pair shapes and validators (USER-FACING)
Objective: the p2 chapter shapes and every validator the spec asks for, so the fifteen chapter
specs in wave B have something to be built from.
Files: `api/src/prompts/pair/shapes.ts`, `api/src/prompts/pair/evidence.ts`,
`api/src/prompts/pair/pair-prompts.test.ts`.
Refs: p2 spec, Engine and Validators; review-20-09 note 6; MASTERFILE §5 (R-5.1, R-5.3).
Done-when: the lens chapter and chapter 01 schemas are as pinned and `PairPassageSchema` is gone;
`chapterProblems` rejects a passage matching a bracketed body name, an aspect name or the word
orb, the way `ratingProblems` does, so the section retries; a card line over twelve words, a card
line naming anything but the two people, a scene missing either name, a why with no verb and a
band line contradicting the doctrine table each fail; `validatePairClaims` rejects a cross claim
outside the chapter's allocation and has its own unit test; `pnpm -r test` green (p2 acceptance 6).

### R06-03 — The pair brief, per chapter, with the age band (USER-FACING)
Objective: one brief per chapter instead of one for all of them, so parallel calls stop being
handed the same material, and the parent lens knows the child's age.
Files: `api/src/lib/pairBrief.ts` (+ test), `api/src/lib/pairInterpretation.ts` (+ test),
`api/src/lib/overlays.ts`.
Refs: p2 spec, Engine and Lens 2; ADR-66, ADR-67; MASTERFILE §4 (R-4.3, R-4.5).
Done-when: `Lens` is `partners | parent_child | people`; the brief a chapter receives carries only
its own links (at most two chapters a link), the claims of the personal-report sections it draws
on, its three scenes and the band; the brief sits before the instructions so the parallel calls
share one cached prefix; the band is derived from the child's profile birth date at generation and
lands on `interpretation.meta.band`, null under the other two lenses; unit tests cover the four
band boundaries and the link allocation; `pnpm report:lab --render` still reads the committed run.

### R06-04 — The claims-only retry (USER-FACING) — MB-62, blocking
Objective: a natal report can no longer fail because a claim quote is not found verbatim. One
cheap retry rewrites the claims against the prose already written, instead of rewriting the prose.
Files: `api/src/lib/aiInterpretation.ts`, `api/src/prompts/evidence.ts` (+ tests).
Refs: MB-62; MASTERFILE §4 (R-4.3, R-4.4), §5 (R-5.3), R-3.3.
Done-when: a section whose claims fail validation retries claims-only against its own prose
before any prose retry, and the validator accepts a quote after the same softening `CitedText`
applies on the page; a unit test reproduces R05's `triad` failure and passes; a report is `failed`
only after the claims-only retry also fails; the natal campaign in R06-23 shows no failed section
across six charts, pasted in the round report.

### R06-05 — Blind bands so the pass lands inside the ceiling (USER-FACING) — MB-60
Objective: a blind report plus its horizon pass reads inside 3,500 to 5,500 words. The blind
bands shrink by roughly what the pass adds, which is cheaper than teaching the pass to stop.
Files: `api/src/prompts/sections/*.ts`, `api/src/prompts/index.ts`,
`api/src/prompts/prompts.test.ts`.
Refs: MB-60; MASTERFILE §1, §4 (R-4.4); `unknown-birth-time.md`.
Done-when: every section the pass amends carries a blind band below its drawn band, about 1,500
words less in total; the sums test asserts both the drawn and the blind range inside 3,500 to
5,500; a drawn report's bands are untouched, so the natal campaign's five drawn charts move by
nothing; the `pass` campaign in R06-23 shows blind plus pass inside the ceiling.

### R06-06 — The pass keeps its claims (USER-FACING) — MB-61
Objective: a passed report never cites less than the blind one it replaces, and the ledger records
every sentence that changed.
Files: `api/src/lib/horizonPass.ts` (+ test).
Refs: MB-61; ADR-33 to 38; MASTERFILE §4 (R-4.6), R-3.3.
Done-when: an amendment carries a claim for every sentence it rewrites, and a dropped quote is
logged with the claim it took with it; the count of sentences differing on the page equals the
count in the ledger (R05 read 58 against 16); a unit test replays the stored r05-pass json pair
and asserts claims after ≥ claims before; the `pass` campaign in R06-23 shows the same.

### R06-07 — The hero on a phone (USER-FACING)
Objective: at 390 px the ring takes the top of the viewport and the name lives under it, not
inside it. Desktop does not move.
Files: `web/src/components/report/ReportHero.tsx`, `web/src/components/report/hero-layout.ts`
(+ test), `web/src/index.css` (hero rules only; owned by this card in wave A).
Refs: review-20-09 note 1 and acceptance 1; MASTERFILE §9.
Done-when: `useNarrow` splits into a narrow tier and a phone tier under 640 px; on the phone tier
the ring is 82vw at the top with bodies on it, the eyebrow and name sit under it (`.rp-hname`
leaves `top: 50%`), then the triad legend, then the cue whose stem ends at least 24 px above the
corner text's top edge and never on its line; the name breaks to two lines before the ring
shrinks; `.rp-hud` keeps its four positions and the staging badge moves to the top bar; a pure
test covers the phone stack order and the 24 px clearance; 1440 px is pixel-identical.

### R06-08 — The orrery on a phone (USER-FACING)
Objective: the planets move on a phone, and they move under Reduce Motion too.
Files: `web/src/components/report/Orrery.tsx`, `web/src/lib/orrery.ts` (+ test).
Refs: review-20-09 note 4 and acceptance 3; ADR-47, ADR-59; MASTERFILE §9.
Done-when: the round first reproduces the still planets on a phone with Reduce Motion off and
says in its commit what caused it; the canvas resizes with its box in width and height, DPR-aware,
on a resize observer, and its own max height is set on the canvas, not on a rule meant for an svg;
under Reduce Motion the bodies still settle onto the stored chart and then turn at one slow
constant rate, never standing still; no `web/src/index.css` edit (R06-07 owns it this wave).

### R06-09 — The Closing gap (USER-FACING)
Objective: the Closing's prose starts where every other chapter's does.
Files: `web/src/components/report/DawnClosing.tsx`.
Refs: review-20-09 note 3's closing gap, acceptance 4; ADR-46.
Done-when: the phone top padding `pt-[calc(min(560px,82vw)*0.74)]` is gone and the body begins
within 56 px of its head at 390, 768 and 1440 px; the sun on the fixed layer is unchanged.

### R06-10 — The why on its own line (USER-FACING)
Objective: a why reads as a sentence under its action, not as a trailing clause.
Files: `web/src/components/report/Checklist.tsx`.
Refs: review-20-09 note 9, acceptance 7; ADR-62; MASTERFILE §9, R-5.1.
Done-when: `why` renders as a block under the action at 13 px in `--paper-dim`, its first letter
capitalised and its full stop added by the page; prompts and rule 12 are untouched; it reads the
same in the natal workbook and in the pair's checklists, and in print.

### R06-11 — The evidence sheet (USER-FACING)
Objective: the sheet says where a claim came from in two labelled lines, with no sentence around
them.
Files: `web/src/lib/evidence-glossary.ts`, `web/src/components/report/Citation.tsx`,
`web/src/components/report/EvidenceCard.tsx`.
Refs: review-20-09 note 7, acceptance 5; ADR-60.
Done-when: a `source` claim's sheet reads `SOURCE {First name}'s personal report · {Chapter}` and
`EVIDENCE {that claim's own labels}`, and the "claim N" sentence and the `source` gloss are gone;
the `cross` gloss is unchanged; the natal report's own evidence sheets are untouched.

---

## Wave B — the pair's prompts, the on-tap scene, the skies and the pair hero

Dispatch R06-12 to R06-18 in one message. R06-12 to R06-16 are brain cards, R06-17 and R06-18 are
UI cards; no card is both.

### R06-12 — Partners, chapters 02 to 06 (USER-FACING)
Objective: the five day-to-day chapters of lens 1, each with its grounding, its register and its
three curated scenes.
Files: new `api/src/prompts/pair/sections/partners/{love,fight,home,fun,building}.ts` only.
Refs: p2 spec, Lens 1 and Every lens chapter; the artifact's partners pages; ADR-63, 64, 65, 69.
Done-when: five specs on the shapes from R06-02, chapter numbers 2 to 6, band 230 to 300 words,
each naming its three scenes in the spec's order and its grounding; each instruction block says
citations live in the claims field only and a passage never writes a body, an aspect or an orb;
the lens doctrine is appended and never written for the reader, love languages are named
generically and the numbered title appears nowhere; `pnpm -r test` green.

### R06-13 — Parent and child, chapters 02 to 06, and the band doctrine (USER-FACING)
Objective: lens 2 on goodness of fit, writing for the child's age band.
Files: new `api/src/prompts/pair/sections/parent-child/*.ts` and its doctrine table only.
Refs: p2 spec, Lens 2 and acceptance 3; ADR-40 as amended, ADR-67, ADR-69; MASTERFILE R-5.2.
Done-when: five specs with scenes and "fair at this age" lines per band; the doctrine carries the
research lines per band (tantrum norms, chores by age, the ten-minute homework rule, the AAP
screen guidance, the Pew adult-child friction list) and names none of them on the page; the child
is read as potential and the parent addressed as the one who adapts; no clinical claim, no
diagnosis, no birth order; the four band runs in R06-23 show no line contradicting the table.

### R06-14 — Two people, chapters 02 to 06 (USER-FACING)
Objective: lens 3 generalised to anyone who is not a partner and not a parent or child.
Files: new `api/src/prompts/pair/sections/people/*.ts` only.
Refs: p2 spec, Lens 3; ADR-68, ADR-69.
Done-when: five specs with their three scenes; the free label's answer (family, friends,
colleagues) picks which scene fits and a few words of register and never touches the engine; no
birth order anywhere; `pnpm -r test` green.

### R06-15 — Chapter 01, chapter 07, the foundation and the registry (USER-FACING)
Objective: the report's two fixed chapters and the registry that assembles seven of them per lens.
Files: `api/src/prompts/pair/index.ts`, `api/src/prompts/pair/foundation.ts`,
`api/src/prompts/pair/sections/twoCharts.ts`, `.../whatToPractise.ts`, `.../links.ts`; deletes
`howYouMeet.ts`, `twoWays.ts`, `whereItFlows.ts`, `whereItRubs.ts`, `howYouTalk.ts`, `lensOne.ts`,
`lensTwo.ts`.
Refs: p2 spec, Shape and Engine; ADR-63, 64, 66; MASTERFILE §4, §8 (R-8.1).
Done-when: `pairSectionIds(lens)` and `pairChapterIds(lens)` return eight and seven as pinned;
chapter 01 writes the verdict headline, three strong lines, three work lines framed as what they
train, the paradox, the three strengths and one pointer, the first three each cited to a link;
chapter 07 collects the next-time items into the three checklists and adds nothing new; the
foundation also returns link ownership, the scene per chapter, the band and the three strengths;
`PAIR_PROMPT_VERSION` is `p2`; the admin pair tab lists seventeen live keys and no dead one.

### R06-16 — On-tap scenes, written by gpt-5.2 (USER-FACING) — provisional MB-64
Objective: the two scenes a reader has not read yet are one tap away.
Files: `api/src/lib/models.ts`, new `api/src/lib/pairScene.ts` (+ test),
`api/src/routes/compatibility.ts`.
Refs: ADR-72 (Owner, 2026-09-21), ADR-65 as amended; p2 acceptance 7; MASTERFILE R-5.6, R-4.4.
Done-when: `MODELS.scenes = "gpt-5.2"` sits in the catalogue with every other job and no model id
exists outside that file; `POST /compatibility/{id}/scenes` takes a chapter and an index, checks
report access like every other read, refuses an index outside that chapter's two, writes the scene
on the same chapter brief and schema as the written one, stores it on the interpretation and
serves the stored one on every later tap, tagged `// MB-64 provisional`; usage lands on
`meta.usage`; no `GROQ_API_KEY` and no provider is added; a unit test covers both refusals.

### R06-17 — Two skies (USER-FACING)
Objective: the hero owns the starfield, the gradient and the ring of stars; the chapters get R04's
ground back exactly as it shipped.
Files: `web/src/components/report/ReportSky.tsx`, `web/src/lib/gather.ts` (+ test),
`web/src/index.css` (owned by this card in wave B), and the `ReportSky` mount in
`ReportHero.tsx`, `ReportPage.tsx` and `CompatibilityReportPage.tsx`.
Refs: review-20-09 notes 2 and 3, acceptance 2; ADR-59 superseding ADR-47 and ADR-51;
MASTERFILE §9 (two moves a chapter, one easing, reduced motion a real state).
Done-when: `.rp-hsky`'s radial gradient, the 0.6-screen fade, the per-chapter accent blobs and the
parallax starfield are back on chapters and no star ring is; `ReportSky` is mounted in the hero,
sized to it and scrolling with it; the gather targets the ring in hero coordinates and stores
landed stars as angle and radius, drawn from the ring's centre each frame; a resize re-measures and
re-projects without re-seeding the field or clearing the gather; the ring survives an address-bar
collapse and a rotation at 390 px.

### R06-18 — The compatibility hero (USER-FACING)
Objective: a hero for two people, with no ring and both birth records on it.
Files: new `web/src/components/report/PairHero.tsx` and `pair-hero-layout.ts` (+ test).
Refs: p2 spec, The hero, acceptance 9; ADR-70; MASTERFILE §9.
Done-when: two triad plates side by side, one per person, Sun, Moon and rising at their true
degrees with the natal hero's renders; degree and sign on a phone, house and ruler from 640 px up;
the reader's own report on the left; a blind chart reads `rising · not drawn` and shows the Moon's
arc as the natal hero does; the eyebrow is `Compatibility report · {lens}` with the whole-sign
line, the two names with AND between, the cue clear of the corners; the four corners carry A's
date, time, place and coordinates on the left and B's on the right; print keeps the plates and the
corners and drops the sky; no `web/src/index.css` edit (R06-17 owns it this wave).

---

## Wave C — the pair page, the picker, the generation screen and the lab

Dispatch R06-19 to R06-23 in one message.

### R06-19 — The lens chapter block and the chip row (USER-FACING) — provisional MB-64
Objective: a lens chapter renders as the workbook the spec describes.
Files: `web/src/components/report/PairSections.tsx`, new
`web/src/components/report/SceneChips.tsx`, `web/src/types/chart.ts`.
Refs: p2 spec, Rendering, acceptance 2 and 7; ADR-63, 64, 65, 72.
Done-when: a chapter renders headline, the side-by-side card (three lines a side, one for the
pair, none over twelve words, none naming a body), the scene, what just happened with the two
cited because-kickers, the pattern and the next-time checklist through `Checklist`; the chip row
sits under the scene with the other two scenes' titles, a tap calls the scene route once, shows a
skeleton, then the scene, and a chip already read renders the stored scene with no call;
`CURRENT_PAIR_PROMPT_VERSION` is `p2`; print shows the written scene and no chips.

### R06-20 — The compatibility page, seven chapters, and the share card (USER-FACING) — provisional MB-63, MB-65
Objective: the page as a seven-chapter document that opens on the two charts.
Files: `web/src/pages/CompatibilityReportPage.tsx`, `web/src/lib/progress.ts` (+ test),
`web/src/hooks/useLiveReport.ts`, new `web/src/components/report/ShareCard.tsx`.
Refs: p2 spec, Shape, The hero, Rendering, acceptance 1 and 9; ADR-63, 70, 71; MB-63, MB-65.
Done-when: `TOTAL` is 7 and the chapter list comes from the lens; chapter 01 opens on the bi-wheel
with its static legend in product copy (inner ring A, outer ring B, a line is where one meets the
other, brass touch, teal ease, rose friction, tap a line) and the link cards under it, then the
generated introduction; `PairHero` replaces the plate; progress reads n = 8 with the pinned door;
the share card draws on a canvas in the browser from the headline and the strengths card with both
names and the wheel behind, offers Download and Web Share where it exists, uploads nothing and
names no placement, tagged `// MB-63 provisional`; a p1 report reads as unavailable in one line
and is listed nowhere, tagged `// MB-65 provisional`; no number anywhere, on screen or in print.

### R06-21 — The picker and the lenses (USER-FACING)
Objective: the third lens is Two people, and the picker asks the one question that sets its
register.
Files: `web/src/lib/lenses.ts` (+ test), `web/src/pages/DashboardPage.tsx`.
Refs: p2 spec, Lens 3, acceptance 4; ADR-68; MB-6's existing seam.
Done-when: the picker offers Partners, Parent and child, Two people; choosing the third asks "How
do you know each other?" with family, friends and colleagues into the free label; the marketing
door reads "Friends, family, colleagues"; the seven chapter titles per lens live here for the
page; a stored `family` relationship reads as `people` after bootstrap; the `// MB-6 provisional`
no-credit seam is untouched.

### R06-22 — The generation screen is its own screen (USER-FACING)
Objective: while a report writes, the generation screen is the page, not an overlay on it.
Files: `web/src/pages/ReportPage.tsx`, `web/src/components/report/OpeningOverlay.tsx`.
Refs: review-20-09 note 3, acceptance 3; ADR-59; MASTERFILE §9.
Done-when: `/report/:id` renders it full-bleed while the report is not open, the document scroll is
locked on the root while it shows and focus stays inside; the same orrery, five labels and real
progress; the door at 67% once `overview` and `houses` land, self-open at 100%, 1.2 s hold; taking
the door unmounts the screen, shows the report at the top and runs the gather once; the pre-chart
branch shows the same screen; `/generating/:id` still redirects; reduced motion crossfades; the
compatibility page crossfades into its hero with no gather; no `web/src/index.css` edit.

### R06-23 — The lab: three lenses, four bands, the repetition score (INTERNAL)
Objective: the measurement the round is judged on, and the fixtures it needs.
Files: `scripts/src/report-lab.ts` (+ test), `fixtures/charts/`, `fixtures/pairs/`,
`.github/workflows/report-lab.yml`.
Refs: p2 spec, Lab, acceptance 3 and 5; MASTERFILE §4 (R-4.4), §11.4, R-3.1.
Done-when: `--pair` runs all three lenses and one parent-and-child run per band on fixtures whose
birth dates fall in each band, every fixture a published birth record and birth data only, never
fabricated; a pair run publishes markdown to `report-lab/<label>` as the natal run does (R05's lab
gap); the run prints a repetition score with its bar, the prose total against 1,900 to 2,500, the
cost against 25 cents and the failure count; `pnpm report:lab --render` still works offline. The
campaigns (natal, pass, three lenses, four bands) are dispatched from `report-lab.yml` on staging
after the merge and pasted into `docs/rounds/R06-report.md`.

---

## Wave D — the name

### R06-24 — Personal natal report (USER-FACING)
Objective: the product is called what it is called, everywhere it is named. Last wave because it
edits files five earlier cards own.
Files: new `web/src/lib/product.ts`; `ReportHero.tsx`, `ReportPage.tsx` print header,
`BirthFormPage.tsx`, `DashboardPage.tsx`, `AdminPromptsPage.tsx`, `PairSections.tsx`.
Refs: review-20-09 note 8, acceptance 6; ADR-61; MASTERFILE §2, R-0.4.
Done-when: one constant names the product; the hero eyebrow and the print header read `Personal
natal report`; the birth form, the dashboard card, the admin tab and the picker use it;
`PairSections.tsx`'s kicker reads `{First name} · from personal report`; no "natal chart report"
remains anywhere in `web/src` outside the landing page, which is MB-8's; the mailer's "Astra" line
is not touched here and no new use of "Astra" is added.

---

## Risks

1. **The schema moves.** `relationships.type`'s default and every stored `family` row change in
   R06-01. The remap must run twice; Railway runs the bootstrap as the first step of its start
   command, so one that cannot breaks the deploy (R-7.3). `db:bootstrap` three times on a scratch
   Postgres is in the gate, as in R05.
2. **Every p1 compatibility report stops rendering.** The page cannot read nine untyped chapters.
   Recommended as MB-65: hidden like the retired synastry rows (MB-58); nothing was ever sold from
   one. Built provisionally in R06-20 until the Owner says otherwise.
3. **Report content changes in eight cards** (R06-02 to R06-06, R06-12 to R06-16): USER-FACING
   under R-5.5 even where no UI moves. Nothing ships without R06-23's campaigns pasted in the
   round report (R-4.4). The natal brain is touched only by the three MB cards, which leave the
   drawn bands alone, so a natal regression should show as a moved word count on the five drawn
   charts.
4. **Cost.** R05's pair ran 45 cents; p2 must land under 25 with shorter prose and per-chapter
   briefs that break one cached prefix into several. On-tap scenes add up to ten calls a report at
   the main model's price (ADR-72). If the pair campaign lands over 25 cents the orchestrator
   reports it and does not tighten a token ceiling to fix it (quality over cost, §1).
5. **Fixtures for the four bands mean children's birth data in a public repository.** R-3.1
   forbids fabrication, so R06-23 uses published birth records and nothing else. If a band has no
   published record the card stops and raises it rather than inventing one.
6. **The share card is user-visible with no spec for its renderer.** MB-63 carries the
   recommendation; R06-20 builds the default behind a seam.
7. **`index.css` and `ReportHero.tsx` are touched in three waves.** Ownership is per wave and
   listed in the preconditions; two builders in one wave never open the same file.
8. **Round size.** Twenty-four cards, the brain and the page at once, on the heels of R05's
   thirty-two. If the Agent tool is unavailable again the orchestrator says so at wave A and
   considers stopping after wave C, leaving R06-24 to the next round (R-13.3).

## Questions raised

Three Mailbox rows added before the round, each with a recommendation and a default, and one
Decisions row recorded.

- **MB-63** (launch, decision) The share card has no renderer and no destination. Recommendation:
  a client-side canvas from what the page already holds, Download plus Web Share where it exists,
  nothing stored and nothing hosted; hosting an image of two people's report is a privacy decision
  that belongs with sharing, which §2 excludes from V1. Default if silent: as recommended.
- **MB-64** (launch, decision) An on-tap scene is an unbounded model call from the report page.
  Recommendation: write once per report, chapter and index, store it, serve the stored one after;
  ten extra calls a report at most, and a reader who taps back finds the same scene. Default if
  silent: as recommended, tagged in R06-16 and R06-19.
- **MB-65** (launch, decision) p1 compatibility reports cannot render on the seven-chapter page.
  Recommendation: treat them as MB-58 treats the synastry rows, hidden and never listed. Default
  if silent: as recommended, tagged in R06-20.
- **ADR-72 recorded** (supersedes ADR-65's Groq clause): the two on-tap scenes ship now, written
  by `gpt-5.2` under a `scenes` job key in `models.ts`; the Groq provider, its key and the blind
  matrix stay with `report-lab-model-matrix.md`; p2 acceptance 7 now reads "chips present, written
  by gpt-5.2". No card in this round reads `GROQ_API_KEY`.

Nothing above needs the Owner before the round starts. The one open question that does is MB-31,
the legal entity, at four rounds open, and it blocks no card in R06.

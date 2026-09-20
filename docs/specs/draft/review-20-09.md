# Review 20/09

Ideation 2026-09-20 with the Owner from the Notion page "Review 20/09" (nine notes on the R05
build on staging). Artifact, with the phone mocks, the two skies, the copy fixes side by side
and the three pair tones on the Owner's own passages: https://claude.ai/artifact/M9SMzqwbNcXtuSZGws2p2F.
Status: **draft**. Builds on `natal-report-pass-three.md` (ADR-46 to 51) and
`compatibility-report.md` (ADR-39 to 45); amends four of those decisions (below).

Notes 1, 2, 3, 4, 6, 7, 8 and 9 are fixes with no question in them. Note 5 is the ideation.

## Scope

### The hero on a phone (note 1)
- Under 640 px (`ReportHero.tsx` `useNarrow`, today `max-width: 900px`, split into a narrow
  and a phone tier): the ring takes the top of the viewport at 82vw, bodies on it as now; the
  eyebrow and name move out of the ring's centre to under it (`.rp-hname` leaves `top: 50%`);
  the triad legend under the name; the scroll cue in the last band, 24 px clear of the corner
  text. Corner text (`.rp-hud`) keeps its four positions. The name breaks to two lines before
  the ring shrinks. Desktop unchanged. The staging badge moves to the top bar on phones.

### Two skies, and the generation screen is a screen (notes 2, 3, 4) — amends ADR-47, ADR-51
- **Chapter ground comes back exactly as R04 shipped it**: `.rp-hsky`'s radial gradient, the
  sky's fade-in over the first 0.6 screens, the per-chapter accent blobs with their two moves
  and one easing, the faint parallax starfield. Budget as §9. Nothing new is designed here.
- **The hero sky is the hero's**: `ReportSky` is mounted in the hero, sized to it, scrolls
  with it. The gather (`lib/gather.ts`) targets the ring in hero coordinates; landed stars are
  stored as angle and radius and drawn from the ring's centre each frame. A resize re-measures
  the ring and re-projects; it no longer re-seeds the field or clears the gather. The ring of
  stars exists only where the ring is.
- **The generation screen is its own screen**: `/report/:id` renders it full-bleed while the
  report is not open, with the document scroll locked (`overflow: hidden` on the root while it
  shows, focus kept inside). Same orrery, five labels, real progress, the door at 67% once
  `overview` and `houses` land, self-open at 100%, 1.2 s hold. Taking the door unmounts the
  screen, shows the report at the top, and runs the gather. `/generating/:id` keeps redirecting.
  The pre-chart branch shows the same screen. Reduced motion crossfades.
- **The orrery on a phone**: the canvas resizes with its box (width and height, DPR-aware) on a
  resize observer; the `max-height: 62svh` rule targets the canvas. Under Reduce Motion the
  bodies still settle onto the chart and turn at one slow constant rate, never stand still: a
  still wheel on the first screen reads as a stall. The round reproduces the still planets on
  a phone with Reduce Motion off before fixing.
- **The closing gap**: `DawnClosing.tsx` drops the phone top padding
  (`pt-[calc(min(560px,82vw)*0.74)]`); the closing's body starts where every chapter's does.
  The sun stays on the fixed layer (ADR-51's sun line stands).

### Copy and rendering (notes 6, 7, 8, 9)
- **No evidence in prose** (6): every pair section prompt says citations live in the claims
  field only and a passage never writes a body, an aspect or an orb; `chapterProblems` in
  `pair/shapes.ts` rejects a passage matching a bracketed body name or the word orb, like
  `ratingProblems` does, so the section retries. The prompt phrase "cited as the cross aspect"
  becomes "with a cross claim".
- **The evidence sheet** (7): `evidence-glossary.ts`'s `source` gloss and its "claim N"
  sentence go. The sheet shows two labelled lines: `SOURCE {First name}'s personal report ·
  {Chapter}` and `EVIDENCE {that claim's own labels}`. The `cross` gloss is unchanged.
- **Personal natal report** (8): one constant in `web/src/lib/` names the product; the hero
  eyebrow and print header read `Personal natal report`, the birth form, dashboard card, admin
  tab and picker use it; `PairSections.tsx`'s kicker reads `{First name} · from personal
  report`. Landing copy is MB-8's; the mailer's "Astra" line is a separate cleanup, not here.
- **The why on its own line** (9): `Checklist.tsx` renders `why` as a block under the action,
  13 px, `--paper-dim`; the clause keeps its lowercase because it is a clause. Both reports.

### The compatibility report, p2 (note 5) — amends ADR-40, ADR-44
Four causes, all in the brain: a four-scene register injected twice and named in every
section prompt; nine sections written in parallel that cannot see each other, so rule 9 of
the style contract cannot be obeyed and the foundation's three strongest links recur in
every chapter; 14 to 16 natal passages restating the personal reports (about 1,800 of 4,500
words); and prompts that ask for behaviour but never for the mechanism under it.

- **Shape.** Eight chapters: 01 How you meet (its two because-lines absorb Two ways of
  being, which is retired) · 02 The two charts · 03 Where it flows · 04 Where it rubs ·
  05 How you talk · 06 lens one · 07 lens two · 08 What to practise. Total 1,900 to 2,500
  words; `PAIR_TOTAL` and the pinned band test move; link cards stay 40 to 70 words and stay
  outside the band. `PAIR_PROMPT_VERSION` p2, so bootstrap step 6 clears the pair overrides.
- **Every chapter has one skeleton**, whatever the tone: a verdict headline (one sentence,
  the chapter's point for a reader who reads only headlines) · a scene (four to six present
  tense sentences, both names, from the chapter's assigned pool entries) · Pattern, both,
  60 to 90 words, new, cited to the chapter's own link · Because A and Because B, 25 to 40
  words each, the need, fear or habit under that side of it, cited as a source claim from the
  personal report · Try, 30 to 50 words, one move each or one for both, with the why on its
  own line. `PairChapterSchema` gains the block kinds; `PairPassageSchema.source` keeps
  natal and new. Chapter 02 keeps its two-link intro at 100 to 140 words; chapter 08 keeps
  the three checklists and the 80 to 100 word closing and drops its opening paragraph.
- **Scene pool.** `LENS_REGISTER.examples` becomes 24 scenes per lens (the four partners
  scenes stay in the pool). The foundation assigns two scenes and its links to each chapter
  (`sectionGuidance` gains `scenes` and `links` per chapter); a section prompt sees only its
  own. `lensContext` names the assigned scenes, not the whole pool. The lab counts every pool
  phrase across a report and flags one used in two chapters.
- **Link ownership.** The foundation assigns each drawn cross aspect and notable overlay to at
  most two chapters; a chapter's new claims cite only its own; `validatePairClaims` rejects a
  cross claim outside the chapter's allocation.
- **Because is the mechanism.** The prompt asks for the need, fear or habit under the
  behaviour, in the words of that person's report, never the placement. The pair doctrine
  gains: "Every pattern is explained: for each person, why they do it, from their own report."
- **Tone.** Three are in the artifact on the Owner's own chapter: A, the counsellor's notes
  (labelled blocks); B, straight talk (verdict first, numbered moves); C, the scene first.
  Recommended blend: C's scene opening inside A's blocks, B's verdict as the headline. The pair
  contract alone lifts two natal rules: a scene may hold a short quoted exchange with no facts
  outside the scene (no dates, places, names beyond the two), and a why may sit on its own
  line. Everything else in the style contract stands.
- **Lab.** `--pair curie-winfrey` on all three lenses before the merge, pasted in the round
  report: totals inside 1,900 to 2,500, no scene phrase twice, no link in more than two
  chapters, no bracketed evidence, cost under 40 cents.

## Out of scope
- New chapter art, a new hero for desktop, the landing page (MB-8), the mailer's "Astra".
- The natal report's prose; the natal style contract; MB-60 to MB-62 (their own cards).
- Tone changes to the link cards; a composite chart; sharing.

## Acceptance criteria
1. At 390 px the hero shows the ring on top, the eyebrow and name under it, the triad, then
   the cue with 24 px clear of the corner text; nothing overlaps; desktop is pixel-identical.
2. At 390 px and 1440 px, chapters 01 to 09 show R04's gradient, blobs and parallax and no
   star ring; the hero shows the starfield, the gradient and, after opening, the ring of
   stars, which stays on the ring after an address-bar collapse and a rotation.
3. With the API slowed, the generation screen fills the viewport, the document does not
   scroll behind it, the planets move on a phone, the door appears at 67% with `overview` and
   `houses` landed, taking it shows the hero at the top and the gather runs once.
4. The Closing's prose begins within 56 px of its head at every width; the sun is unchanged.
5. A pair passage never contains a bracketed body, aspect or orb; the lab's three runs show
   none and the validator has a unit test that rejects one.
6. The evidence sheet of a source claim shows SOURCE and EVIDENCE lines and no sentence.
7. "Personal natal report" appears wherever the natal report was named; the pair kicker
   reads `{First name} · from personal report`; no string "natal chart report" remains in
   `web/src` outside the landing page.
8. Every checklist why renders on its own line under its action, in both reports.
9. `PAIR_CHAPTER_IDS` has eight ids; every chapter renders headline, scene, pattern, two
   because-lines and try; the lab's three lenses land inside 1,900 to 2,500 words with no
   scene phrase repeated and no link cited in more than two chapters.
10. Typecheck, both builds, unit tests, codegen no diff, `db:bootstrap` clean (p2 reset),
    lab pasted, Vercel preview smoke.

## Screens
All in the artifact: the hero now and proposed at 390 px; the generation screen, the hero
sky and the chapter sky side by side; notes 6 to 9 now and proposed; the chapter skeleton,
the word budget bars, the scene pool; the three tones on Where it rubs.

## Open questions
1. Which tone? Recommendation: the blend. Default: the blend.
2. Eight chapters at 1,900 to 2,500 words? Recommendation: yes. Default: yes.
3. "Personal natal report" everywhere, or only beside the pair? Recommendation: everywhere.
   Default: everywhere.

## Decisions to record
1. **Two skies.** The hero owns the starfield, the gradient and the ring of stars; chapters
   keep R04's ground and parallax. The generation screen is its own screen with the scroll
   locked; the door is the only way in before 100%. Amends ADR-47 and ADR-51's "one sky".
2. **The compatibility report is eight chapters, 1,900 to 2,500 words**, every chapter a
   verdict, a scene, the pattern, two because-lines and a try. Two ways of being is retired.
   Amends ADR-40's nine chapters and the 3,000 to 4,500 band.
3. **Scenes come from a pool and links are owned.** 24 scenes per lens, two per chapter,
   never reused; a cross link cited by at most two chapters. Amends ADR-40's register line.
4. **Evidence lives in claims only.** No body, aspect or orb in a passage; the evidence sheet
   is two labelled lines. Amends ADR-44's "rendered with that report's own evidence label".
5. **The natal report is the Personal natal report** wherever it is named; the pair reads
   "from personal report".
6. **A why has its own line.** Under the action, in both reports; the clause stays a clause.
7. **The pair tone** as the Owner picks it from the three, recorded at lock.

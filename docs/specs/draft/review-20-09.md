# Review 20/09

Ideation 2026-09-20 with the Owner from the Notion page "Review 20/09" (nine notes on the R05
build on staging), revised the same day on the Owner's five replies. Artifact, with the phone
mocks, the two skies, the copy fixes, the three pair tones and the blended chapter on the
Owner's own passages: https://claude.ai/artifact/M9SMzqwbNcXtuSZGws2p2F. Status: **draft**.
Builds on `natal-report-pass-three.md` (ADR-46 to 51) and `compatibility-report.md`
(ADR-39 to 45); amends four of those decisions (below).

Notes 1, 2, 3, 4, 6, 7, 8 and 9 are fixes with no question in them. Note 5 is the ideation.

## Scope

### The hero on a phone (note 1)
- Under 640 px (`ReportHero.tsx` `useNarrow`, today `max-width: 900px`, split into a narrow
  and a phone tier): the ring takes the top of the viewport at 82vw, bodies on it as now; the
  eyebrow and name move out of the ring's centre to under it (`.rp-hname` leaves `top: 50%`);
  the triad legend under the name; the scroll cue last, its stem ending at least 24 px above
  the corner text's top edge, never on its line. Corner text (`.rp-hud`) keeps its four
  positions. The name breaks to two lines before the ring shrinks. Desktop unchanged. The
  staging badge moves to the top bar on phones.

### Two skies, and the generation screen is a screen (notes 2, 3, 4) — amends ADR-47, ADR-51
- **Chapter ground comes back exactly as R04 shipped it**: `.rp-hsky`'s radial gradient, the
  sky's fade-in over the first 0.6 screens, the per-chapter accent blobs with their two moves
  and one easing, the faint parallax starfield. Budget as §9. Nothing new is designed here.
- **The hero sky is the hero's**: `ReportSky` is mounted in the hero, sized to it, scrolls
  with it. The gather (`lib/gather.ts`) targets the ring in hero coordinates; landed stars are
  stored as angle and radius and drawn from the ring's centre each frame. A resize re-measures
  the ring and re-projects; it no longer re-seeds the field or clears the gather.
- **The generation screen is its own screen**: `/report/:id` renders it full-bleed while the
  report is not open, with the document scroll locked (`overflow: hidden` on the root while it
  shows, focus kept inside). Same orrery, five labels, real progress, the door at 67% once
  `overview` and `houses` land, self-open at 100%, 1.2 s hold. Taking the door unmounts the
  screen, shows the report at the top, and runs the gather. `/generating/:id` keeps redirecting.
  The pre-chart branch shows the same screen. Reduced motion crossfades. The door stays: see
  "No editing pass" below.
- **The orrery on a phone**: the canvas resizes with its box (width and height, DPR-aware) on a
  resize observer; the `max-height: 62svh` rule targets the canvas. Under Reduce Motion the
  bodies still settle onto the chart and turn at one slow constant rate, never stand still.
  The round reproduces the still planets on a phone with Reduce Motion off before fixing.
- **The closing gap**: `DawnClosing.tsx` drops the phone top padding
  (`pt-[calc(min(560px,82vw)*0.74)]`); the closing's body starts where every chapter's does.

### Copy and rendering (notes 6, 7, 8, 9)
- **No evidence in prose** (6): every pair section prompt says citations live in the claims
  field only and a passage never writes a body, an aspect or an orb; `chapterProblems` in
  `pair/shapes.ts` rejects a passage matching a bracketed body name or the word orb, like
  `ratingProblems` does, so the section retries.
- **The evidence sheet** (7): `evidence-glossary.ts`'s `source` gloss and its "claim N"
  sentence go. Two labelled lines: `SOURCE {First name}'s personal report · {Chapter}` and
  `EVIDENCE {that claim's own labels}`. The `cross` gloss is unchanged.
- **Personal natal report** (8): one constant in `web/src/lib/` names the product; the hero
  eyebrow and print header read `Personal natal report`; the birth form, dashboard card, admin
  tab and picker use it; `PairSections.tsx`'s kicker reads `{First name} · from personal
  report`. Landing copy is MB-8's; the mailer's "Astra" line is a separate cleanup.
- **The why is a sentence on its own line** (9): `Checklist.tsx` renders `why` as a block
  under the action, 13 px, `--paper-dim`, first letter capitalised and a full stop added by
  the page. Prompts and rule 12 unchanged. Both reports.

### The compatibility report, p2 (note 5) — amends ADR-40, ADR-44
Four causes, all in the brain: a four-scene register injected twice and named in every
section prompt; nine sections written in parallel given the same material (three links, four
scenes, 120 claims), so they repeat it; 14 to 16 natal passages restating the personal
reports (about 1,800 of 4,500 words); prompts that ask for behaviour, never the mechanism.

- **Shape.** Eight chapters: 01 How you meet (its two because-lines absorb Two ways of
  being, which is retired) · 02 The two charts · 03 Where it flows · 04 Where it rubs ·
  05 How you talk · 06 lens one · 07 lens two · 08 What to practise. Total 1,900 to 2,500
  words; `PAIR_TOTAL` and the pinned band test move; link cards stay 40 to 70 words, outside
  the band. `PAIR_PROMPT_VERSION` p2, so bootstrap step 6 clears the pair overrides.
- **Tone: C with B in two fixed places.** Every chapter: a verdict headline in B's voice (one
  sentence, the chapter's point for a reader who reads headlines only) · a scene (four to six
  present tense sentences, both names, one of the chapter's assigned pool entries, may hold a
  short quoted exchange with no facts outside the scene: no dates, places or names beyond the
  two) · What just happened, 60 to 90 words, new, cited to the chapter's own link, holding
  Because A and Because B (25 to 40 words each, the need, fear or habit under that side, in
  the words of that person's report, cited as a source claim) · The pattern under it, 40 to
  60 words · Next time, a checklist in the checkbox style, two or three items naming who each
  is for, the why a sentence on its own line. Never alternating whole chapters. Chapter 02
  keeps its two-link intro at 100 to 140 words; chapter 08 collects the Next time items into
  the three checklists, adds nothing new, and keeps the 80 to 100 word closing.
  `PairChapterSchema` gains these blocks; `PairPassageSchema.source` keeps natal and new.
- **Scene pool.** `LENS_REGISTER.examples` becomes 24 scenes per lens (the four partners
  scenes stay in the pool). The foundation assigns two scenes and its links to each chapter
  (`sectionGuidance` gains `scenes` and `links`); a section prompt sees only its own. The lab
  counts every pool phrase across a report and flags one used in two chapters.
- **Link ownership and a per-chapter brief.** The foundation assigns each drawn cross aspect
  and notable overlay to at most two chapters; a chapter's brief carries only its links and
  the claims of the sections it may cite; `validatePairClaims` rejects a cross claim outside
  the allocation. The brief goes before the instructions in the user message so the nine
  parallel calls share one cached prefix. Estimated 15 to 20 cents a report against 45 to 47
  today (the reading of a 120-line brief eleven times is about half of p1's bill); the lab
  measures, the estimate is not a promise.
- **No editing pass, unless the lab says so.** A repetition score joins the lab: five-word
  runs shared between chapters, scene phrases used twice, links cited in more than two
  chapters, the natal share of words. Measured first on the three p1 runs (their json is in
  the run artifacts), then on p2 with no pass. Bar: under 2% of five-word runs shared, no
  scene twice, no link in more than two chapters. Clear it and no pass is built. Miss it and a
  pass is added in the horizon pass's shape: amend by exact quote match, claims carried,
  never a rewrite; about 8 to 12 cents and 30 to 60 s more per report. The door stays either
  way; a game during the wait is a separate idea.
- **On-demand scenes, as an experiment (Owner, 20 Sept).** Under the chapter's scene, a row
  of five more pool scenes. A tap writes that scene for this chapter from the pattern, the
  two because-lines, the names, the lens and the scene name: 60 to 90 words, present tense,
  both names, no facts outside the scene, no claim (it illustrates a cited pattern). Style
  checks only: no body name, no number, no method talk, both names, the band. Saved on the
  report, so the second reader and the PDF see the same text and a tap is paid once. A small
  fast model: Groq's OpenAI-compatible endpoint through the existing client with a second base
  URL and key; the two ids the Owner named (GPT OSS 120B and the Qwen model) go into
  `models.ts` with prices read off Groq's catalogue, never from memory. Lab mode `--scenes`
  on `curie-winfrey`, partners: eight chapters × six scenes × two models, latency median and
  worst, cost per scene, style flags, all 192 rendered on one page beside the main model's own
  scene. Credential: a Groq API key in Railway staging and the lab workflow. The tap row ships
  only after the Owner has read that page; the written scene per chapter ships regardless.
- **Lab.** `--pair curie-winfrey` on all three lenses before the merge, pasted in the round
  report: totals inside 1,900 to 2,500, the repetition score under its bar, no bracketed
  evidence, cost under 25 cents.

## Out of scope
- New chapter art, a new desktop hero, the landing page (MB-8), the mailer's "Astra".
- The natal report's prose and contract; MB-60 to MB-62 (their own cards); a game during
  the wait; a composite chart; sharing.

## Acceptance criteria
1. At 390 px the hero shows the ring on top, the eyebrow and name under it, the triad, then
   the cue with its stem 24 px or more above the corner text; nothing overlaps; desktop is
   pixel-identical.
2. At 390 px and 1440 px, chapters show R04's gradient, blobs and parallax and no star ring;
   the hero shows the starfield, the gradient and, after opening, the ring of stars, which
   stays on the ring after an address-bar collapse and a rotation.
3. With the API slowed, the generation screen fills the viewport, the document does not
   scroll behind it, the planets move on a phone, the door appears at 67% with `overview` and
   `houses` landed, taking it shows the hero at the top and the gather runs once.
4. The Closing's prose begins within 56 px of its head at every width; the sun is unchanged.
5. A pair passage never contains a bracketed body, aspect or orb; the lab's three runs show
   none and the validator has a unit test that rejects one.
6. The evidence sheet of a source claim shows SOURCE and EVIDENCE lines and no sentence.
7. "Personal natal report" appears wherever the natal report was named; the pair kicker
   reads `{First name} · from personal report`; no "natal chart report" remains in `web/src`
   outside the landing page.
8. Every checklist why renders on its own line under its action as a capitalised sentence,
   in both reports.
9. `PAIR_CHAPTER_IDS` has eight ids; every chapter renders headline, scene, what just
   happened with two because-lines, the pattern, and a Next time checklist; the lab's three
   lenses land inside 1,900 to 2,500 words with the repetition score under its bar.
10. The lab prints the repetition score for a stored run, and the p1 runs are scored in the
    round report beside p2.
11. The `--scenes` page exists with 192 scenes, latency, cost and flags; nothing on the report
    page depends on it until the Owner has read it.
12. Typecheck, both builds, unit tests, codegen no diff, `db:bootstrap` clean (p2 reset),
    lab pasted, Vercel preview smoke.

## Screens
All in the artifact: the hero now and proposed at 390 px; the generation screen, the hero
sky and the chapter sky; notes 6 to 9 now and proposed; the two answers (no editing pass,
where the 45 cents go); the chapter skeleton, the word bars, the scene pool; the on-demand
scene row; the three tones and the blended Where it rubs.

## Open questions
1. The tone is C with B's verdict headline and B's Next time checklist, in every chapter?
   Recommendation: yes. Default: the blend.
2. On-demand scenes: run the Groq experiment first and decide on the rendered page?
   Recommendation: yes; needs the Groq key. Default: experiment first, nothing on the page
   until read.
3. Eight chapters at 1,900 to 2,500 words, and "Personal natal report" everywhere?
   Recommendation: yes to both. Default: yes to both.

## Decisions to record
1. **Two skies.** The hero owns the starfield, the gradient and the ring of stars; chapters
   keep R04's ground and parallax. The generation screen is its own screen with the scroll
   locked; the door is the only way in before 100%. Amends ADR-47 and ADR-51's "one sky".
2. **The compatibility report is eight chapters, 1,900 to 2,500 words**, every chapter a
   verdict, a scene, what just happened with two because-lines, the pattern, and Next time.
   Two ways of being is retired. Amends ADR-40's nine chapters and the 3,000 to 4,500 band.
3. **The pair tone is C with B in two fixed places**: the headline and the Next time
   checklist. The pair contract alone allows a short quoted exchange inside a scene.
4. **Scenes come from a pool and links are owned.** 24 scenes per lens, two per chapter,
   never reused; a link cited by at most two chapters; a per-chapter brief. Amends ADR-40's
   register line.
5. **Repetition is measured, not edited.** A lab score with a bar; an editing pass is built
   only if p2 misses it, and then as a quote-match amendment.
6. **On-demand scenes are an experiment on a fast model**, shipped to the page only after the
   Owner reads the lab page. A scene carries no claim.
7. **Evidence lives in claims only.** No body, aspect or orb in a passage; the evidence sheet
   is two labelled lines. Amends ADR-44's evidence label line.
8. **The natal report is the Personal natal report** wherever it is named; the pair reads
   "from personal report".
9. **A why is a sentence on its own line**, capitalised by the page, in both reports.

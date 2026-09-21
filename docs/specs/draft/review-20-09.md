# Review 20/09

Ideation 2026-09-20 with the Owner from the Notion page "Review 20/09" (nine notes on the R05
build on staging), revised the same day on the Owner's five replies. Artifact, with the phone
mocks, the two skies, the copy fixes, the three pair tones and the blended chapter on the
Owner's own passages: https://claude.ai/artifact/M9SMzqwbNcXtuSZGws2p2F. Status: **draft**.
Builds on `natal-report-pass-three.md` (ADR-46 to 51) and `compatibility-report.md`
(ADR-39 to 45); amends two of those decisions (below).

Notes 1, 2, 3, 4, 6, 7, 8 and 9 are fixes with no question in them. Note 5 has its own draft.

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
  The pre-chart branch shows the same screen. Reduced motion crossfades. The door stays (p2 spec, no editing pass).
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

### The compatibility report (note 5)
Moved to its own draft on 21 September, after the Owner's second reply widened it to the
three lenses, their scenes and the day-to-day themes: `docs/specs/draft/compatibility-report-p2.md`.
The two are locked together. In one line each, what that spec holds: eight chapters, the
fixed frame (How you meet, The two charts, What to practise) around five lens chapters; C's
voice with B's headline and Next time checklist; three likely scenes per chapter, one
written and two on tap; a side-by-side card per lens chapter; a per-chapter brief and link
ownership; a repetition score in the lab instead of an editing pass; on-demand scenes as a
Groq experiment; the third lens generalised to any two people.

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
5. The evidence sheet of a source claim shows SOURCE and EVIDENCE lines and no sentence.
6. "Personal natal report" appears wherever the natal report was named; the pair kicker
   reads `{First name} · from personal report`; no "natal chart report" remains in `web/src`
   outside the landing page.
7. Every checklist why renders on its own line under its action as a capitalised sentence,
   in both reports.
8. Typecheck, both builds, unit tests, codegen no diff, `db:bootstrap` clean (p2 reset),
   lab pasted, Vercel preview smoke.

## Screens
All in the artifact: the hero now and proposed at 390 px; the generation screen, the hero
sky and the chapter sky; notes 6 to 9 now and proposed. The pair report's screens are in the
p2 artifact.

## Open questions
1. "Personal natal report" everywhere the natal report is named? Recommendation: yes.
   Default: everywhere. The pair questions are in `compatibility-report-p2.md`.

## Decisions to record
1. **Two skies.** The hero owns the starfield, the gradient and the ring of stars; chapters
   keep R04's ground and parallax. The generation screen is its own screen with the scroll
   locked; the door is the only way in before 100%. Amends ADR-47 and ADR-51's "one sky".
2. **Evidence lives in claims only.** No body, aspect or orb in a passage; the evidence sheet
   is two labelled lines. Amends ADR-44's evidence label line.
3. **The natal report is the Personal natal report** wherever it is named; the pair reads
   "from personal report".
4. **A why is a sentence on its own line**, capitalised by the page, in both reports.

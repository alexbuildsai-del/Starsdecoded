# R03 plan — the wheel becomes a chart, claims cite in place, Observatory lands whole

Planned 2026-09-17 on `claude/great-rubin-2ernfv` as R02; renumbered R03 on merge, since `main` landed its own R02 first. Task card ids are unchanged. Scope is fixed by `docs/specs/locked/natal-report-ui.md` (locked 2026-09-17) and ADR-15 to ADR-18; ADR-7 is superseded. No QA reports exist. Mailbox rows above 2 rounds open: none — the twenty-one carried rows went to 2 and the six R01 rows to 1 at the start of this round.

## Preconditions

1. `962a7c7` (spec lock) and `830cd13` (dead table toggle removed) are on the branch already. `round/R02` branches from `main` after this plan merges; nothing else is owed first.
2. The ten planet renders are real files on this branch (3–5 KB, 192×192 WebP with alpha) and `web/src/assets/planets/README.md` already says so. Acceptance criterion 1 therefore reduces to "the wheel renders them", which is R02-04.
3. No API, prompt, schema or `openapi.yaml` change in this round, so no report-lab run and no `db:bootstrap` run. If a card finds itself wanting one, it stops and raises it (R-0.1).
4. Every builder reads `/tmp/claude-0/-home-user-Starsdecoded/d9749026-f5f3-5443-9432-546a3a4f91f9/scratchpad/v2/sd-v2.html` for the geometry and behaviour its card names. It is vanilla JS/SVG driven by real report-lab JSON: read it as the reference, then write idiomatic React and Tailwind. Never port it literally, never copy its CSS variables, never copy its inline `style` strings.

## Goals

1. **The picture is the chart.** `calcPose` is gone, every body sits at its true `absoluteDegree`, crowding ladders inward, the Ascendant is a point. Acceptance 1, 2, 3, 8. Honours the built half of MB-13; MB-13 stays open on `opengraph.jpg` alone.
2. **Claims are cited in place and the UI writes no astrological prose.** Superscripts replace the repeated quote block; the twelve hand-written house descriptions and the two invented angle fallbacks in `ReportPage.tsx` go. Acceptance 4.
3. **Observatory lands whole, in one commit each.** Newsreader for display, IBM Plex Mono for every degree and coordinate, brass that is never a control. Acceptance 5, 6, 7. Closes MB-29 (decided; this is its build half).
4. **The report reads as a report.** Hero plate, chaptered scroll, chrome demoted to a footnote strip and a slide-over, 400 px clean, `prefers-reduced-motion` a real state for the first time. Acceptance 10, 11.

No fifth goal. Pricing (MB-5), payments (MB-6), the Astra rename (MB-7), the admin report browser (MB-39) and the word-target bands (MB-38) stay closed to this round. The section → house map stays out per the spec.

## Task cards

### R02-01 Observatory tokens, faces and the numeric utility — INTERNAL
Objective: put the whole app on the locked type stack and add brass, in one commit, so no card after this one restyles anything by hand.
Files: `web/src/index.css` only.
Refs: MASTERFILE §9 (colour roles, type stack); spec "Design direction Observatory", acceptance 6, 7; MB-42.
Changes: (a) L1 `@import` gains `Newsreader:wght@400;500` and `IBM+Plex+Mono:wght@400;500`, drops the Noto Serif range it replaces, and keeps Inter and Space Grotesk (MB-42, subset now, self-host later); (b) `--app-font-serif` and the `.font-display` and `h1,h2,h3` rules move to Newsreader; (c) `--app-font-mono` moves to `'IBM Plex Mono', ui-monospace, monospace` — `.font-label` stays Space Grotesk, it is the label face, not the mono one; (d) new `--brass: 41 54% 62%` (#D4B06A) with a `--color-brass` entry in `@theme inline`, mirrored under `.dark`; (e) new `.font-numeric` utility: mono family plus `font-variant-numeric: tabular-nums`; (f) a base `@media (prefers-reduced-motion: reduce)` block that kills `animation` and `transition` app-wide, which R02-06 then refines.
Constraints: brass is a token only here — this card puts it on nothing. No other colour changes; the ground, indigo and violet are settled (ADR-15, "extend never replace").
Done when: typecheck and `build:web` pass; `git grep -n "Noto Serif"` returns nothing; `git grep -n "Space Grotesk" -- web/src/index.css` returns only the `.font-label` and `--app-font-sans`-adjacent lines; the preview renders Newsreader on every existing heading and IBM Plex Mono at the four current `font-mono` sites.
Sequencing: wave 0, alone. Every other card branches after it.

### R02-02 Retire weight-300 display outside the report — INTERNAL
Objective: Newsreader has no 300, so every `font-display font-light` heading in the app would render a faux weight the moment R02-01 lands. Sweep them, and move numerals to `.font-numeric`.
Files: `web/src/pages/LandingPage.tsx`, `GenerationPage.tsx`, `SynastryReportPage.tsx`, `AdminPromptsPage.tsx`, `BirthFormPage.tsx`, `DashboardPage.tsx`; `web/src/components/BirthLocationHorizon.tsx`, `InviteModal.tsx`, `DeleteReportDialog.tsx`, `ErrorBoundary.tsx`, `SaveReportCta.tsx`, `ui/chart.tsx`. Explicitly **not** `ReportPage.tsx` or `ReportSections.tsx` — R02-03 and R02-07 own those.
Refs: MASTERFILE §9 "one register"; spec "Design direction Observatory"; acceptance 6.
Changes: drop `font-light` and `font-thin` wherever they sit on `font-display`; replace `font-mono` with `font-numeric` at the four numeric sites; anything printing a degree, orb, latitude or longitude gets `font-numeric`.
Constraints: no copy changes, no layout changes, no new "Astra" (R-0.4), no restyle beyond the two class swaps. `SynastryReportPage.tsx` is otherwise out of scope for the round; it gets the sweep and nothing else.
Done when: typecheck and `build:web` pass; `git grep -n "font-display.*font-light\|font-light.*font-display" -- web/src` returns nothing; `git grep -n "font-mono" -- web/src` returns nothing outside `index.css`; the landing page and the birth form look unchanged apart from the face.
Parallel with R02-03, R02-04, R02-05, R02-06.

### R02-03 Claims cite in place — USER-FACING
Objective: mark each claim's quote at its true offset with a numbered superscript whose card carries the evidence; delete the block that reprinted the quote under the paragraph.
Files: `web/src/components/EvidenceLine.tsx` (keep `claimsFor`, delete `EvidenceLines`), `web/src/components/ReportSections.tsx`, new `web/src/components/report/Citation.tsx` and `EvidenceCard.tsx`, new `web/src/lib/evidence-glossary.ts`.
Refs: spec "Citations become superscripts" and the Evidence-card screen; ADR-18; acceptance 4. Reference: `sd-v2.html` `annotate()`, `showCard()`, `evWhy()` (L1074–1125).
Behaviour: `claimsFor()` is reused unchanged; matching is by offset inside the already-normalised text, overlapping hits are skipped, numbering runs per section through a counter the section owner passes down. Hover opens the card on a fine pointer, tap on a coarse one, Escape and blur close it, the superscript is a real focusable control with an accessible name. The card shows the claim in italic Newsreader, then one row per `evidence[]`: kind chip, `label` in `.font-numeric`, and one line of plain English from the static glossary. Footer: `N verified references · whole sign · tropical`.
Constraints: the glossary is the **only** place in this round where the UI may write a sentence, and it describes a body, sign, house, aspect, dignity or sect in general — never this reader (ADR-18). No prompt, schema or API change. Brass may tint the superscript and the card rule; it may not be the focus ring (acceptance 7).
Changes, same file: `OverviewBlock`'s headline drops to `text-2xl` so R02-07's section title can outrank it (acceptance 5).
Done when: typecheck and `build:web` pass; `git grep -n "EvidenceLines"` returns nothing; on the preview a real report shows no repeated quote under any paragraph, and every superscript's card lists the same `evidence[].label` strings the old block printed.
Parallel with R02-02, R02-04, R02-05, R02-06.

### R02-04 The natal wheel, drawn from the chart — USER-FACING
Objective: replace the index-positioned wheel with one where a body's angle comes only from its `absoluteDegree` and crowding is resolved by radius.
Files: new `web/src/components/chart/wheel-geometry.ts` (pure, no React, no DOM) and `web/src/components/chart/NatalWheel.tsx`; `web/src/types/chart.ts` (add the `applying: boolean` the API already sends on every aspect and the client type omits). Does **not** touch `ReportPage.tsx` and does **not** delete the old component — R02-07 does both.
Refs: spec "The wheel is rebuilt as a chart" and the Wheel screen; ADR-17; MASTERFILE §9 "the picture is the chart", R-4.1, R-4.2; acceptance 1, 2, 3, 8; MB-13. Reference: `sd-v2.html` `drawWheel()` (L1181–1308) for the ring radii, the 5° tick ring, the three lanes and the leader lines.
Behaviour: sign band with names written out, house-number ring inside it, aspects in the inner disc weighted by orb against `interpretation.meta.orbs`, quadrants named in words outside, degrees revealed on hover, click or Enter selects a **house**. ASC and MC are brass axes; DSC and IC are derived as +180° since `ChartData.angles` carries only the two. Chiron and the nodes keep drawn glyphs. The side panel is a `renderHouse?: (house: number) => ReactNode` slot this card leaves empty; R02-07 passes R02-05's card into it.
Constraints: the Ascendant is never a body (acceptance 8); no planet render above 90 CSS px, since the source is 192 px (MB-13) — larger markers use the drawn sphere; brass is geometry only.
Done when: typecheck and `build:web` pass; the component renders standalone against the `marie-curie` fixture with the Sun's node centred on the radius through 14.58° Scorpio and its leader on that tick, and the four-planet Scorpio stellium in the 11th showing four separated bodies on four degrees; `git grep -n "calcPose"` returns nothing once R02-07 lands.
Parallel with R02-02, R02-03, R02-05, R02-06. R02-08 asserts this card's geometry module.

### R02-05 House cards built only from generated strings — USER-FACING
Objective: a house card whose every word comes from the report, replacing twelve hand-written house descriptions.
Files: new `web/src/components/report/HouseCard.tsx` and `HouseGrid.tsx`, new `web/src/lib/house-rulers.ts` (the traditional ruler table — data, not prose).
Refs: spec "House cards" and the House-card screen; ADR-18; acceptance 8. Reference: `sd-v2.html` `houseCardHTML()` and `bodyText()`.
Behaviour: front is type-led — `4TH HOUSE · ARIES`, ghost numeral, the house's short theme, the planets it actually contains as renders, quadrant in the footer. Back is the house's question as a heading, then `personalPlanets[body]` for each body in it, and `angleMeanings` for the 1st and 10th, footed `FROM YOUR REPORT`. An empty house reads through its ruler and says so in the label, using that ruler's `personalPlanets` line.
Constraints: if nothing generated applies — an empty house whose ruler has no generated line — the back says nothing at all. It never invents a sentence, never falls back to a template, never shows a planet render on a house that planet does not occupy (acceptance 8). The card takes its strings as props; it does not fetch.
Done when: typecheck and `build:web` pass; rendered against a real report every string on a back is traceable to `personalPlanets` or `angleMeanings`; a house with no planets and a ruler without a line renders a back with a heading and no body.
Parallel with R02-02, R02-03, R02-04, R02-06.

### R02-06 Hero plate, chapter shell and a real reduced-motion state — USER-FACING
Objective: the opening plate and the chapter furniture, as components, with motion that actually stops.
Files: new `web/src/components/report/ReportHero.tsx`, `Chapter.tsx`, `ChapterDivider.tsx`, `Starfield.tsx`, new `web/src/hooks/useReducedMotion.ts`, new `web/src/lib/chapter-accent.ts`.
Refs: spec "Report shell", the Opening and Chapter screens; MASTERFILE §9 motion budget (two moves per chapter change, one easing); acceptance 10, 11; **provisional MB-40**.
Behaviour: hero is a thin brass ring carrying Sun and Moon as lit renders at their true angles and the Ascendant as an open brass marker with an outward tick, the reader's given name at the centre in Newsreader over the eyebrow `NATAL CHART REPORT`; frame corners carry DOB, TOB, POB, the coordinates, `whole-sign · tropical` and `day chart · sun alt 21.5°` from `interpretation.meta`, all in `.font-numeric`. Chapter is divider, eyebrow `09 / 12 · ROOTS`, title, hairline, lede, prose at 64 ch, ghost numeral at 4.5%.
Notes: the accent is the one thing the spec cannot supply — it asks for the element of the chapter's house while deferring the section → house map. Until MB-40 is answered, `chapter-accent.ts` derives one accent per reader from `chartData.dominance.dominantElement` and morphs lightness between chapters, tagged `// MB-40 provisional` at that single function.
Constraints: at 400 px the hero's three readouts move to a legend below the ring, never beside it (acceptance 10). Under reduced motion the parallax freezes, the morph snaps and the starfield stops, and every word stays reachable (acceptance 11). Three parallax depths is the ceiling, not a target.
Done when: typecheck and `build:web` pass; the hero renders standalone against the `marie-curie` fixture at 400, 768 and 1440 px with no horizontal overflow; toggling the OS reduced-motion setting stops every moving thing on the page.
Parallel with R02-02, R02-03, R02-04, R02-05.

### R02-07 Assemble the report page and demote the chrome — USER-FACING
Objective: compose the round's components into `ReportPage.tsx`, delete what they replace, and put the section title above the lede.
Files: `web/src/pages/ReportPage.tsx`, `web/src/components/MethodologyBox.tsx`, `web/src/components/ReportSections.tsx` (`HouseSystemExplainer` only), new `web/src/components/report/MethodologyStrip.tsx` and `HouseSystemSheet.tsx`; deletes `web/src/components/ui/radial-orbital-natal.tsx`.
Refs: spec "Type hierarchy", "Chrome demotion", "House cards"; ADR-17, ADR-18; acceptance 3, 4, 5, 8, 10, 11.
Changes: (a) mount `NatalWheel` where `RadialOrbitalNatal` was, passing `HouseCard` into its side-panel slot, and delete the old component; (b) `Section` becomes eyebrow → title → lede with the title at `text-3xl md:text-4xl`, above `OverviewBlock`'s demoted headline (acceptance 5); (c) wrap the twelve sections in `Chapter` and put `ReportHero` at the top; (d) delete `HOUSE_REFERENCE` and `HouseReferenceGuide` and mount `HouseGrid` in their place; (e) delete the two invented angle fallbacks around L650–675 (`At your best, your … Midheaven channels ambition …` and its Under-pressure twin) and the `mcLegacy` template string — when `angleMeanings` has nothing, nothing is shown; (f) `MethodologyBox` becomes a footnote strip and `HouseSystemExplainer` a slide-over, neither open inline.
Constraints: the print path must not regress — `no-print`, `print-page-break`, `print-expand` keep working and the print-only placement table still carries every degree, because the PDF is the one place it appears (spec, "Answered in the session" 3).
Done when: typecheck, both builds and unit tests pass; `git grep -n "calcPose\|radial-orbital"` returns nothing; on the preview a real report shows hero, twelve chapters, the wheel, the house grid and the footnote strip, with no horizontal overflow at 400 px; browser print preview still produces the full report with the placement table.
Sequencing: wave 2, after R02-02 through R02-06 have all merged. It is the only card that touches `ReportPage.tsx`.

### R02-08 Assert the wheel's geometry — INTERNAL, `provisional MB-41`
Objective: make acceptance criterion 2 machine-checkable instead of eyeballed, and give `web/` its first test.
Files: `web/package.json` (one devDependency `vitest`, one `test` script), new `web/vitest.config.ts`, new `web/src/components/chart/wheel-geometry.test.ts`.
Refs: MB-41 (recommended option); acceptance 2, 3, 9; MASTERFILE §11.2 gate, R-12.4.
Notes: pure module only — no jsdom, no testing-library, no snapshots, no component rendering, and no second web test in this round. The root `pnpm -r --filter '!@workspace/e2e' --if-present run test` already discovers a new `test` script, so `ci.yml` needs no edit; confirm that rather than assume it.
Done when: `pnpm -r --filter '!@workspace/e2e' --if-present run test` runs the new file from the repo root and CI is green; the tests cover `theta()` against a known Ascendant, lane assignment for the `marie-curie` Scorpio stellium, and the invariant that laddering changes radius and never angle; `// MB-41 provisional` sits on the config.
Sequencing: wave 3, after R02-04. Can run alongside R02-07 — disjoint files.

## Parallelism

Wave 0: R02-01 alone. Wave 1: R02-02, R02-03, R02-04, R02-05, R02-06 on disjoint files — five builders, and R02-04 is the long pole. Wave 2: R02-07 alone, the only card touching `ReportPage.tsx`. Wave 3: R02-08, which may overlap R02-07. Close per §11.2 step 4.

Two ordering judgements worth stating. **The tokens land first and alone**, because a token swap is the one change that cannot be half-applied: after R02-01 the app is fully re-faced, and R02-02 exists purely to clear the weight-300 headings the swap would otherwise render faux. **`ReportPage.tsx` gets exactly one card.** Five cards want a piece of it; giving them each a turn would serialise the round behind its most crowded file, so wave 1 builds components against the fixture and R02-07 composes them.

## Risks

- USER-FACING without a report-lab run, and correctly so: no card touches `api/`, `packages/`, `openapi.yaml` or `api/src/prompts/`. If any card finds itself editing one, it stops (R-4.4 applies the moment it does).
- Content the reader has today disappears: twelve house descriptions and two angle fallbacks. That is ADR-18 working as decided, but the Owner will see the house grid say less than it used to. Called out for acceptance.
- No dependency but one: `vitest`, in R02-08, `provisional MB-41`. Two font families join a render-blocking `@import` (MB-42).
- The wheel is the largest single component in the app and it is being replaced, not patched. The pure geometry module plus R02-08 is the mitigation; a wheel that misplaces a body is a sev-1 against R-4.1.
- Motion is user-visible and reduced motion has never been implemented here. R02-06 owns it; if it slips, the parallax ships without its off switch, which fails acceptance 11 — so R02-06 ships the off switch first and the depth second.
- Deferred to R03 on purpose: `opengraph.jpg` (MB-13), the section → house map and house cards inside sections, generated section art, the loading animation, the keepsake plate, and any marketing restyle beyond the one-register rule. Printables inherit Observatory through the shared tokens; nothing bespoke is built for them this round.

## Questions raised

New Mailbox rows, added before the round starts:

- MB-40 (decision, launch): the chapter accent has no source while the section → house map is deferred. Default: one accent per reader from `dominance.dominantElement`, lightness morph between chapters, `// MB-40 provisional`.
- MB-41 (decision, launch): nothing under `web/` is tested, so the wheel's degrees cannot be asserted. Default: `vitest` for the geometry module only.
- MB-42 (todo, later): two more families from `fonts.googleapis.com`, a processor MB-33's list omits. Default: subset the CDN import now, self-host in the launch round, annotate MB-33.

`Rounds open` incremented on all twenty-seven carried open rows: MB-5 to MB-13, MB-15 to MB-25 and MB-30 to 2; MB-31, MB-32, MB-33, MB-35, MB-38, MB-39 to 1. Parked rows MB-26 to MB-28 untouched. MB-29 is decided and this round is its build half.

Three questions for the Owner this session, highest stakes first: (1) MB-31, the legal entity, which still gates selling anything and is the only blocking row left; (2) MB-40, the chapter accent, because it changes a colour the reader reads as meaning something about their chart and the spec contradicts itself on it; recommendation: derive it from the dominant element until the section → house session runs; (3) MB-41, whether `web/` gets its first test runner this round; recommendation: yes, `vitest` over the pure geometry module only, because the wheel's core promise is otherwise unverifiable.

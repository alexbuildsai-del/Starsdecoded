# R09 plan — Review 25 Sept: the ringless pair hero, two charts side by side, the ledger, one word per house, plain prose in v7

Planned 2026-09-26 on `main` at d33eb54 (#67, the lock, docs only) for the locked spec `review-25-09` (Decisions ADR-97 to 105;
MASTERFILE 0.12 already carries §9 as amended). Artifact, revision 3: https://claude.ai/artifact/BejywNF3s6rEGEc4aRHTSD. No QA report
exists. Note 8 (the dashboard crash) shipped in #66 and has no card. Not planned: sharing and invites (MB-81 to 85, the dashboard sky
round), the prompts' house wording (MB-87), and `night-sky` and `dashboard-sky`, locked on their branches.
**Every card is USER-FACING**: R09-01 and R09-02 change report words (a brain change, R-5.5); the rest change what a reader sees.
`PAIR_PROMPT_VERSION` stays p2: a p-bump hides every stored p2 report from the list (`reports.ts:257`) and the page (`types/chart.ts:430`).

## Mailbox rows above 2 rounds open after this plan's increment
At **8**: MB-5, 6, 8, 11, 12, 13, 15, 17, 19, 20, 21, 22, 23, 24, 25, 30. At **7**: MB-31 (blocking, the legal entity), 33, 35.
At **5**: MB-43, 47, 49, 50. At **4**: MB-55, 57, 58, 59. At **3**: MB-64, 65, 66, 67. None blocks a card; MB-31 blocks launch, not
this round. **MB-75** (`GITHUB_RELEASE_TOKEN` on Railway staging) stays the todo before any production release. All 46 open rows were
incremented; no Owner comment sits on a Mailbox or Decisions row since R08. Raised today: **MB-88** (decided yes, ADR-106), **MB-89** (below).

## What v7 moves (checked on main)
- **No stored natal report is hidden, once R09-03 lands.** The list never filters natal reports by version; the page does:
  `isCurrentInterpretation` (`web/src/types/chart.ts:423`) matches `v6` exactly. Left alone, every new v7 report would read "needs to be
  regenerated" (`ReportPage.tsx:144`) and its button would write v7 again; moved to `v7` alone, every stored v6 report would.
- **v7 alone does not reset the 19 pair system rows**, as the spec expects (`review-25-09.md:96`): `reset-stale-prompt-overrides.ts`
  clears `natal:%` on a natal bump and `pair:%` only on a pair bump. R09-02 adds a third family on `PROMPT_VERSION` that clears every
  `%:system` row, natal and pair (both embed `STYLE_CONTRACT`), so all 31 run the new text and p2 stays. A pair `:user` override survives.
- **The rest stays.** New natal reports stamp `v7`; a v6 blind report the pass updates keeps `v6` (`horizonPass.ts:140` spreads the old
  meta) with its amendments written under the new rules; the free update and the revision marks key on `horizonPasses`, not the version.
  In the lab a replay holds the r06 foundation fixed, so only a `pipeline` Spot exercises the foundation's new wording; input tokens rise
  by the new text (about 100 a call); the QA reader imports `STYLE_CONTRACT` and reads the new rules itself.

## Readings pinned where the spec is silent
1. Rule 8's new first sentence replaces its old "No bullet points inside prose fields." (the artifact's now and proposed); the rest stays.
2. "The foundation" is the natal one (`sections/foundation.ts`: `supportingEvidence`, `sectionGuidance`); the pair foundation is unchanged.
3. "Every house number the page prints" (MASTERFILE §9, ADR-98) also covers the natal hero's labels, the print placement table's "H3"
   and the revision card's chips; the house card stays untouched.
4. The pair's two wheels draw no aspect lines and select no house, so the name reads in the centre (the artifact's duo); the explorer
   keeps both. Chapter 02's intro sits under its title, above the lede (artifact note 7).
5. The chip's chapter is read from the lens chapters' claims (MB-89). "Send it to {B}" names the other person: B, or A when B is the
   reader's own profile.

## Goals
1. **Prose is plain text, said in the prompt** (note 9, ADR-104): rules 3 and 8 in all 12 natal and 19 pair system prompts through v7,
   the doctrine, the natal foundation, Overview, Mind and the link cards; v6 and v7 both render; the page reads stored reports clean.
2. **The pair report opens on one centred group and two charts side by side** (notes 1, 3; ADR-97, 99): each name once over its rows,
   no ring; two natal wheels, name and rising in the centre; the bi-wheel, legend and lines retire; the plate moves out for MB-86.
3. **Chapter 01 is a ledger and the card is type only** (notes 5, 6; ADR-101, 102): glyphs, chips, the paradox across; the strengths
   only on a portrait card shown with Share (or Copy) and Save; nothing stored.
4. **A house is never a bare number** (note 4, ADR-98): every wheel's band, the hero rows, link cards, the evidence sheet, claim labels.
5. **Chapters read in order and the Closing opens like the rest** (notes 2, 7, 10; ADR-100, 103): the counter alone, the scene
   introduced, the Closing gap.

## Preconditions
1. The plan commit sits on `claude/hopeful-newton-del7cs` (`main` at d33eb54 plus this file). On the Owner's approval `round/R09`
   branches from it, and the plan reaches `main` with the round's pull request: no docs-only merge before the build.
2. Builders read MASTERFILE §0 and their card's sections, `docs/specs/locked/review-25-09.md` and the artifact. They cannot open
   claude.ai: the orchestrator hands every UI builder the local copy (`review-25-sept.html`, `v3-n2/4/5/6.png`, `v2-n1…n9.png`,
   `v2-phone-n1.png`) for the heroes, the counter, the duo, the twelve words, the ledger glyphs, card A, the scene order and the Closing.
3. **Single owners.** Wave A: `api/src/prompts/**` → R09-01. `aiInterpretation.ts`, `scripts/src/*prompt*`, `scripts/bootstrap-db.sh` →
   R09-02. `web/src/types/chart.ts` → R09-03. `evidence-glossary.ts` → R09-04. `Chapter.tsx` → R09-05. `NatalWheel.tsx`,
   `wheel-geometry.ts` → R09-06. `PairHero.tsx`, `pair-hero-layout.ts`, new `TriadPlate.tsx` → R09-07. `EvidenceCard.tsx`,
   `RevisedText.tsx`, `ReportHero.tsx`, `ReportPage.tsx` → R09-08. `LinkCard.tsx`, new `TwoChartsLedger.tsx`, new `lib/ledger.ts` →
   R09-09. `ShareCard.tsx`, new `lib/share-card.ts` → R09-10. `PairSections.tsx`, `SceneChips.tsx` → R09-11. `Citation.tsx`, new
   `lib/plain-prose.ts` → R09-12. `DawnClosing.tsx`, `index.css` → R09-13; every other UI card styles with Tailwind utilities.
   Wave B: `CompatibilityReportPage.tsx` and the bi-wheel's three files → R09-14; `PairSections.tsx` and `index.css` hand over to it.
4. Inside a wave a card may land before the card it imports from; the orchestrator accepts a red intermediate until the wave ends (R05
   to R08). Without the Agent tool (R06 to R08), take wave A in card order. A builder who needs a pinned shape changed stops (R-0.1).
5. **No card spends.** Tests stub the model; the dry lab is free. Paid checks sit under Acceptance, on the Owner's go.
6. MB-88 is answered: yes (the Owner, 2026-09-26; ADR-106). R09-01 rewords `twoCharts.ts` and `shapes.ts` as pinned below.

## Pinned shapes
- **House words** (`web/src/lib/evidence-glossary.ts`, R09-04): `HOUSE_WORDS = ["Self", "Money", "Mind", "Home", "Play", "Work",
  "Partnership", "Depth", "Belief", "Career", "Friends", "Solitude"] as const`; `houseWord(n: number): string` → "mind" (lower case, ""
  outside 1 to 12); `houseWithWord(n: number): string` → "3rd (mind)"; `withHouseWords(text: string): string` adds " (word)" once after
  every "Nth house" and "rules the Nth", idempotent. The wheel prints `${n} · ${HOUSE_WORDS[n - 1].toUpperCase()}`.
- **Versions**: `PROMPT_VERSION = "v7"` (R09-02); web `RENDERABLE_PROMPT_VERSIONS = ["v6", "v7"] as const`, `isCurrentInterpretation`
  keeps its signature (R09-03). **Families** (`scripts/src/prompt-families.ts`): `promptFamilies(natal: string, pair: string):
  Array<{ key: string; like: string; version: string; label: string }>` → `__prompt_version` `natal:%` on natal, `__pair_prompt_version`
  `pair:%` on pair, `__system_prompt_version` `%:system` on natal. It takes the versions as arguments and imports nothing.
- **NatalWheel** (R09-06): optional `centreName?: string`. Given, it prints the name and "Rising 12°04′ Capricorn" (blind: "Rising · not
  drawn") in the centre, draws no aspect lines and no selected or selectable house; the degree chip on hover, focus and tap stays;
  everything else as the natal wheel draws it. Absent, nothing changes but the band.
- **Chapter** (R09-05): optional `intro?: ReactNode` between the title's rule and the lede; the counter `NN / TT`, both padded, no
  eyebrow; `eyebrow` stays for the divider.
- **TriadPlate** (`web/src/components/report/TriadPlate.tsx`, R09-07): `TriadPlate({ chart, name, className }: { chart: ChartData;
  name: string; className?: string })`, today's plate SVG (ring, dashed horizon, Moon band arc, Sun and Moon at true degrees, the R03
  marker), no rows. `PairHero`'s props are unchanged.
- **Ledger** (R09-09): `TwoChartsLedger({ s, names, interpretation, lens }: { s: PairTwoCharts; names: { a: string; b: string };
  interpretation: PairInterpretation; lens: Lens })`. `web/src/lib/ledger.ts`: `ledgerRows(s, interpretation, lens): { strong:
  LedgerRow[]; work: LedgerRow[] }`, `LedgerRow = { text: string; link: { planetA: string; aspect: string; planetB: string } | null;
  glyph: "flow" | "touch" | "rub" | null; chapter: { number: number; title: string } | null }`; `linkAnchor(link): string` →
  `link-{planetA}-{aspect}-{planetB}`, the id of that aspect's link card.
- **Share** (R09-10): `ShareCard({ names, lens, headline, strengths, recipient }: { names: { a: string; b: string }; lens: Lens;
  headline: string; strengths: string[]; recipient: string })`, no `wheel`. `web/src/lib/share-card.ts`: `SHARE_CARD = { width: 1080,
  height: 1350 }`, `shareCardText(...)`, `shareActions({ canShareFiles, canCopyImage }): Array<"share" | "copy" | "save">`,
  `recipientOf(a: { name: string; isSelf: boolean }, b: { name: string; isSelf: boolean }): string` (a first name).
- **Scenes** (R09-11): `ScenesIntro()` exported from `PairSections.tsx`, the spec's two sentences, the second `print:hidden`.
- **Guard** (R09-12): `plainProse(text: string): string` in `web/src/lib/plain-prose.ts`; `CitedText` runs it first, signature unchanged.
- **Chapter 01's premise** (R09-01, ADR-106): `twoCharts.ts`'s opening premise becomes "The reader sees the two charts side by side,
  each alone. Under them this chapter's lines are set out as a ledger, each beside the link it rests on, with a pointer to the chapter
  that shows it; the link cards follow." "each pointing at the chapter that shows it, by its title" goes; "the cards under the wheel"
  becomes "the link cards"; `shapes.ts` drops "pointing at the chapter that shows it" from the strong line's description.

## Parallel groups
**Group A**, one message: R09-01 to R09-13. **Group B**, once A is green: R09-14. In card order if the Agent tool is unavailable.

---

## Wave A — the brain, the words, the wheel, the hero, the ledger, the card, the scene, the guard, the gap

### R09-01 — The prompts say plain text (USER-FACING, brain, prompt only) · Sonnet — twoCharts per ADR-106
Objective: rules 3 and 8 in every natal and pair system prompt; the doctrine, the natal foundation, Overview, Mind, links and chapter 01 follow.
Files: `api/src/prompts/system.ts`, `pair/index.ts`, `sections/foundation.ts`, `overview.ts`, `mind.ts`, `pair/sections/links.ts`,
`pair/sections/twoCharts.ts`, `pair/shapes.ts`, and `style.test.ts`, `pair/pair-prompts.test.ts`, `prompts.test.ts`.
Refs: spec note 9 (its quoted texts are verbatim); ADR-104, 106; MASTERFILE R-5.1, R-5.4, R-4.4; readings 1, 2; artifact note 9; pinned premise.
Done when:
- Rule 3 is the spec's; rule 8 opens on its new sentence (reading 1); `PAIR_DOCTRINE` gains the spec's bullet; the foundation reads
  "Supporting evidence cites chart facts as the brief's own lines give them." and adds "Each guidance sentence is behaviour, with no
  planet, sign, house, ruler or dignity in it."; Overview and Mind "give that paragraph a claim for each placement it rests on";
  links say "under the two charts" and "on the two charts"; titles stay in code; the `links` comment in `pair/index.ts` follows.
- Tests pin each text in `SHARED_SYSTEM`, `PAIR_SYSTEM` and the sections; no prompt names the bi-wheel, one wheel or a legend; chapter 01
  carries the pinned premise and asks no strong line to name its chapter.
- Free fixture run: `git fetch origin report-lab/r06 && git checkout FETCH_HEAD -- fixtures/reports/` (never committed), then
  `pnpm report:lab --dry --base r06 --pair curie-winfrey`: the rules in every natal (five charts) and pair system prompt, the links
  wording, strict schemas, usage 0, input tokens up by the new text only.

### R09-02 — v7 reaches every system prompt (USER-FACING, brain) · Sonnet
Objective: `PROMPT_VERSION` v7, and the bootstrap's reset clears every `:system` override, natal and pair, with p2 kept.
Files: `api/src/lib/aiInterpretation.ts` (the constant only), new `scripts/src/prompt-families.ts` (+ `prompt-families.test.ts`),
`scripts/src/reset-stale-prompt-overrides.ts`, `scripts/bootstrap-db.sh` (step 6's comment only).
Refs: spec note 9 ("all 12 natal and 19 pair system rows"), acceptance 8; ADR-104; MASTERFILE R-5.4, R-7.3; "What v7 moves"; pinned
families; MB-80 (its default: a dummy `OPENAI_API_KEY` on a scratch database).
Done when:
- `promptFamilies` returns the three pinned families and the script loops them; the test pins each pattern and the system family on
  the natal version; `PAIR_PROMPT_VERSION` is `p2`.
- On a scratch Postgres 16 after one `db:bootstrap`, set as staging stands (`__prompt_version` v6, `__pair_prompt_version` p2, no system
  marker) with `natal:overview:system`, `pair:links:system` and `pair:links:user` inserted: the next `db:bootstrap` removes both system
  rows (and `natal:*`) and keeps `pair:links:user`; the one after reports every family already seen.
- `aiInterpretation.test.ts` stays green (it reads the constant).

### R09-03 — The page renders v6 and v7 (USER-FACING) · Sonnet
Objective: a stored v6 report and a new v7 report both render; v5 and older keep the regenerate call (MB-45, decided).
Files: `web/src/types/chart.ts`, new `web/src/types/chart.test.ts`.
Refs: "What v7 moves"; pinned versions; MB-45; `ReportPage.tsx:144`, which this card does not edit.
Done when: `isCurrentInterpretation` is true for `v6` and `v7` and false for `v5` and for a missing meta (tests);
`isCurrentPairInterpretation` stays on `p2`; the stale "MB-45 provisional" tag above the guard reads "MB-45".

### R09-04 — One word per house (USER-FACING) · Sonnet
Objective: the twelve words and the three helpers every consumer imports; the evidence gloss stops printing a bare "in the 11th".
Files: `web/src/lib/evidence-glossary.ts`, `web/src/lib/evidence-glossary.test.ts`.
Refs: spec note 4, acceptance 4; ADR-98; MASTERFILE §9; pinned house words.
Done when:
- The pinned exports sit beside `HOUSE_NAMES`; `HOUSE_NAMES`, `HOUSE_THEMES` and `HOUSE_QUESTIONS` are untouched.
- Tests: each word is the first word of its `HOUSE_NAMES` title; "Venus 21.3° Scorpio, 11th house" gains "(friends)"; "Venus rules the
  10th and sits in Scorpio, 11th house, exalted" reads "rules the 10th (career) … 11th house (friends), exalted"; a second pass changes
  nothing; "Oprah's Sun in Marie's 2nd house" gains "(money)"; a line with no house returns as it came.
- `glossFor`'s ruler line reads "in the 11th (friends)"; `theHouse` already carries the word through its theme and stays.

### R09-05 — The counter alone, and a place for an intro (USER-FACING) · Haiku
Objective: both reports print "04 / 10" and "01 / 07"; a chapter can carry an intro under its title.
Files: `web/src/components/report/Chapter.tsx`.
Refs: spec notes 2, 7, acceptance 2; ADR-100, 103; pinned Chapter.
Done when: the counter prints both numbers padded and nothing else; the divider keeps its word; `intro` renders between the rule and
the lede and nothing renders when it is absent; typecheck green (the pair page's `total` moves in R09-14).

### R09-06 — Every wheel names its houses (USER-FACING) · Opus
Objective: two lines a band segment, no number ring, and a wheel that can stand alone in the pair's chapter 01.
Files: `web/src/components/chart/NatalWheel.tsx`, `wheel-geometry.ts`, `wheel-geometry.test.ts`.
Refs: spec note 3 ("Two charts, side by side", "Every wheel names its houses"), acceptance 3, 4; ADR-97, 98, 34, 17; MASTERFILE §9;
artifact note 3 (`v2-n3.png`); pinned NatalWheel and house words; reading 4.
Done when:
- Each segment reads the sign, and under it "9 · BELIEF"; the band widens for two lines and the lanes move inward, every body still at
  its true degree; the house-number ring is gone.
- A blind chart prints the sign alone in each segment and no house line anywhere.
- The explorer's tap on a band segment or a house wedge opens the house card as before; the landing page's wheel renders.
- `centreName` behaves as pinned; the geometry test pins the band's two text radii inside it and the band clear of the outer lane.

### R09-07 — The pair hero, one centred group with no ring (USER-FACING) · Opus
Objective: the eyebrow, then each name once over its three rows, "and" between, stacked on a phone; the ringed plate leaves.
Files: `web/src/components/report/PairHero.tsx`, new `TriadPlate.tsx`, `pair-hero-layout.ts`, `pair-hero-layout.test.ts`.
Refs: spec note 1, acceptance 1; ADR-99, 70, 92; MB-86; MASTERFILE §9; artifact note 1 (`v2-n1.png`, `v2-phone-n1.png`); pinned
TriadPlate and house words.
Done when:
- "Compatibility report · {lens}" with no method line, on screen and in print; the names at today's title size, rows and renders at
  today's sizes; no SVG in the hero; print draws no ring and prints each name once, over its rows; the corners unchanged.
- `triadRows`: "16.48° Pisces · 3rd (mind)" at full detail; a Moon with a band "10.20°–22.85° Pisces" (dashboard-sky's format; both
  signs named when it crosses one); a blind side's rising row "rising · not drawn".
- `TriadPlate` is today's plate SVG with a why-comment naming MB-86; nothing on main renders it yet.
- `PAIR_STACK` and `pairStack()` rebuilt for the group, side by side from a measured width held in a constant; tests: the cue's stem
  clears the corners at 390 × 844, 390 × 664, 768 × 1024 and 1440 × 900.

### R09-08 — The word wherever the natal page and the evidence print a house (USER-FACING) · Sonnet
Objective: every house number printed outside the pair's hero and chapter 01 carries its word once.
Files: `web/src/components/report/EvidenceCard.tsx`, `RevisedText.tsx`, `ReportHero.tsx`, `web/src/pages/ReportPage.tsx`.
Refs: spec note 4, acceptance 4; ADR-98; MASTERFILE §9; reading 3; pinned house words.
Done when:
- The evidence sheet runs `withHouseWords` over each label and a source's evidence line; the revision card's chips do the same.
- The natal hero's ring labels and narrow legend read "16.48° Pisces · 3rd (mind)"; `labelWidth` covers the widest value ("29.99°
  Sagittarius · 7th (partnership)" at 11.5 px Plex Mono) so no label meets the ring or the corners; `hero-layout.test.ts` stays green.
- The print placement table's "H3" reads "3rd (mind)"; the "MB-45 provisional" comment reads "MB-45"; the house card is untouched.

### R09-09 — Chapter 01's ledger and its link cards (USER-FACING) · Opus — provisional MB-89
Objective: two columns, a glyph per cross link, a chip to each line's chapter, the paradox across; a glyph opens its link card.
Files: new `web/src/components/report/TwoChartsLedger.tsx`, new `web/src/lib/ledger.ts` (+ `ledger.test.ts`),
`web/src/components/report/LinkCard.tsx`, new `web/src/components/report/link-card.test.ts`.
Refs: spec note 5, acceptance 4, 5; ADR-101, 43, 60, 66; artifact note 5 (`v3-n5.png`); pinned ledger and house words; reading 5.
Done when:
- "Naturally strong" in teal and "Will take work" in rose, side by side from 760 px; each line in the display face through
  `CitedText`; its glyph from the first cross aspect its claims cite: A's render, the link, B's render, the two names under; strong is
  a straight line, brass for a conjunction and teal otherwise; work is the rose zigzag; no cross claim, no glyph.
- A chip "→ 02 How you love" to `#chapter-2` from the lens chapter whose claims cite the link, else none; the paradox spans both
  columns under a teal-to-rose rule; the pointer closes; no strengths block.
- A glyph whose link has a card is a button: it scrolls that card (`id` from `linkAnchor`) into view and focuses it; reduced motion jumps.
- `linkTitle` prints "Oprah's Sun in Marie's 2nd house (money)". Tests on `ledgerRows`, `linkAnchor` and `linkTitle` use the artifact's
  six real curie-winfrey links (Mercury conjunct Moon, sextile Sun; Jupiter trine Neptune; Moon square Jupiter; Venus, Saturn square Pluto).

### R09-10 — The type-only card and the share block (USER-FACING) · Opus
Objective: a portrait 1080 × 1350 card drawn in the browser, shown on the page, with Share the card (or Copy image) and Save image.
Files: `web/src/components/report/ShareCard.tsx`, new `web/src/lib/share-card.ts` (+ `share-card.test.ts`).
Refs: spec note 6, acceptance 6; ADR-102 (closes MB-63), 71; `docs/specs/locked/logo.md`; MASTERFILE §9; artifact card A (`v3-n6.png`);
pinned share; reading 5.
Done when:
- The canvas: eyebrow "Compatibility report · {lens}", "{A} and {B}" by first name and the verdict in Newsreader, "Your three strengths
  as a pair", the three lines in Inter, the foot line, and the mark with "Stars Decoded"; no wheel, placement or number; the fonts load
  before it draws.
- The block: the drawn card as an image, "Send it to {recipient}." and the spec's second line, then the buttons `shareActions` gives:
  Web Share with the PNG where `canShare({ files })` holds, else Copy image where `ClipboardItem` exists, then Save image; `no-print`;
  no request carries the card; the "MB-63 provisional" tag goes.
- Tests on `shareCardText`, `shareActions` (all three cases) and `recipientOf` (B; A when B is the reader's own).

### R09-11 — The scene, introduced (USER-FACING) · Sonnet
Objective: every lens chapter of every lens reads Going in, the introduced scene, then What just happened opening on the pair line.
Files: `web/src/components/report/PairSections.tsx`, `SceneChips.tsx`.
Refs: spec note 7, acceptance 7; ADR-103, 64, 65, 72; artifact note 7; pinned `ScenesIntro`.
Done when:
- The side-by-side card is headed "Going in" and keeps its two sides; `card.pair` leaves it and opens What just happened in the display
  face; the because-lines, the pattern and Next time follow unchanged.
- "A moment you will both recognise, played out." sits under the scene's kicker, with chips and in the no-scenes fallback; the chips and
  the "MB-64 provisional" seam are unchanged.
- `ScenesIntro` prints the spec's two sentences, the second hidden in print. No prompt word changes; `TwoChartsBlock` and
  `StrengthsCard` stay for R09-14 to remove.

### R09-12 — The page prints plain text (USER-FACING) · Sonnet
Objective: `CitedText` drops markdown asterisks and any line that is only a placement, so stored reports read clean; it fails nothing.
Files: `web/src/components/report/Citation.tsx`, new `web/src/lib/plain-prose.ts` (+ `plain-prose.test.ts`).
Refs: spec note 9 (the page's one guard), acceptance 8; ADR-104; artifact note 9.
Done when:
- `plainProse` removes `*` emphasis markers, and a line whose every word is placement vocabulary (bodies, signs, angles, lots, nodes,
  ordinals, house, ruler, rules, dignities, aspects, degrees, orb, in, of, the, and, punctuation) whether one newline or a blank line
  follows it; a pass's paragraphs keep their blank line; `CitedText`'s signature is unchanged.
- Tests: the stored Career field's first line "**10th ruler: Mercury in Aquarius, 6th house (peregrine)**" above a paragraph, with "\n"
  and with "\n\n", renders the paragraph alone; "You **really** decide first." reads without asterisks; a sentence that opens on a
  placement and goes on is kept; an empty field stays empty.
- No log, no check, no retry.

### R09-13 — The Closing opens like every chapter (USER-FACING) · Haiku
Objective: the Closing's first line sits under its rule as every chapter's does.
Files: `web/src/components/report/DawnClosing.tsx`, `web/src/index.css`.
Refs: spec note 10, acceptance 9; ADR-59, 51; artifact note 10.
Done when: `md:pt-14` leaves `DawnClosing.tsx:95`; `.rp-dawn .body > .rp-pull:first-child` has no top margin, hairline or top
padding; nothing else in `index.css` moves in this card; the preview measure is in Acceptance.

---

## Wave B — the pair page assembled

### R09-14 — Chapter 01 and the pair page, assembled (USER-FACING) · Opus
Objective: two charts, the ledger, the share block and the link cards, in that order, the bi-wheel gone; the counter and intro wired.
Files: `web/src/pages/CompatibilityReportPage.tsx`; delete `web/src/components/chart/BiWheel.tsx`, `bi-wheel.ts`, `bi-wheel.test.ts`;
`PairSections.tsx` (from R09-11: delete `TwoChartsBlock`, `StrengthsCard`); `index.css` (from R09-13: delete the `.rp-biwheel` rules).
Refs: spec notes 2, 3, 5, 6, 7, acceptance 2, 3, 5, 6, 7; ADR-97, 100 to 103; every pinned shape.
Done when:
- Chapter 01: two `NatalWheel`s with `centreName`, side by side from 640 px and stacked below, each the width available; then
  `TwoChartsLedger`, `ShareCard` (with `recipientOf`) and `LinkCards`; each a skeleton while its section writes.
- `WheelLegend`, the links memo, `host` and `wheelRef` go and nothing imports the bi-wheel; the page-level print header goes (the hero
  prints each name once).
- `ch()` passes `titles.length`; chapter 02 passes `intro={<ScenesIntro />}`; the file's doc comment describes the page as it now is.
- Typecheck, both builds and every test green on the merged waves.

---

## Acceptance
**Free, in the round (the gate):** `pnpm install --frozen-lockfile`, typecheck, `build:web`, `build:api`, unit tests (the words,
`linkTitle`, the ledger, the card, the guard, the versions, the hero stack, the wheel radii, the prompt pins, the families), codegen with
no diff (no contract change), the dry lab as R09-01 states, `db:bootstrap` twice on a fresh Postgres 16 as R09-02 states, and smoke on
the Vercel preview. Nothing generates.
**On staging after the merge, free (the Owner's look):** the spec's acceptance 1 to 7 at 390 and 1440 px on a stored pair report and a
stored natal report; 9 at 390, 820 and 1280 px (the Closing's first line within 26 px of its rule); the stored report with the Career
label renders without it; the Prompts page shows no `:system` override and no `pair:links` or `pair:twoCharts` override.
**No paid check in this round** (the Owner, 2026-09-26: no; the Owner checks it). The Owner reads v7 on staging: no label, heading or
asterisk in any prose field (Career included), link cards that name their two bodies inside a sentence, the Failures tab for new rules
(acceptance 8). Nothing in the round spends; the Release's lab reads v7 before production.
**Production** moves only on "promote": the Release view runs the full lab (the brain changed) and the QA agent, stops at `passed`
while MB-75 is open, then `promote.yml` takes the release id; the bible's prompt section re-syncs (R-8.1).

## Risks
1. **Report content changes** (USER-FACING, R-5.5): R09-01 (chapter 01 included, ADR-106) and R09-02. Every section writes under the new
   rules from the deploy on; the dry lab proves the prompts, not the prose; the Owner's read on staging and the Release stand before production. A
   scene's quoted exchange now sits inside one paragraph (rule 8: no blank lines).
2. **The reset widens**: a natal bump now also clears every pair `:system` override (both families share the style contract); the first
   deploy deletes any such row on staging, and production copies staging's. A pair `:user` override survives with its old wording.
3. **A version guard in the web**: without R09-03 every v7 report reads "needs to be regenerated" and its button writes v7 again.
   R09-02 and R09-03 ship in one pull request.
4. **Every wheel changes** (USER-FACING): the explorer, the pair's two charts and the landing page's demo wheel (the same component,
   MB-50's chart); the band widens and the lanes move in; the explorer's house tap must survive.
5. **The natal hero's labels widen** (reading 3): up to "29.99° Sagittarius · 7th (partnership)" beside a body; the label box is
   re-measured, the solver unchanged.
6. **Chips come from claims** (MB-89, provisional): a line whose lens chapter never cites its link shows no chip.
7. **The card lives in the browser**: Web Share with files and `ClipboardItem` differ by browser, so Save image is always offered;
   fonts must load before the canvas draws or the card falls back to Georgia.
8. **Deleted and dormant code**: the bi-wheel, its test and `WheelLegend` go; `TriadPlate` sits unused on main until dashboard sky.
9. **No schema, contract or dependency change**: `openapi.yaml`, `packages/db` and the lockfile are untouched.
10. **dashboard-sky** (`claude/modest-cori-wh0mty`) is docs only against main (its spec, annex, MASTERFILE 0.13, INDEX); its card
    already expects "the ringed plate, its own component", which R09-07 creates. Only `docs/INDEX.md` and MASTERFILE's version line
    will conflict at its merge.
11. **Wave A is thirteen cards**; if the Agent tool is unavailable again they run in card order.

## Questions raised (Mailbox, before the round starts)
Answered by the Owner on 2026-09-26, with "go" for the round:
1. **MB-88, chapter 01's prompt: yes.** Reworded inside this round's v7 change, p2 kept (ADR-106; MB-88 decided).
2. **The paid pair check after the merge (about 90 ¢): no.** The Owner checks v7 on staging; nothing in the round spends.

For the Mailbox only, at its default: MB-89 (the chip read from claims, built provisional in R09-09).

## Close (the orchestrator)
MB-86 gains R09's facts for the dashboard sky planner: the plate is `web/src/components/report/TriadPlate.tsx`, the words are
`HOUSE_WORDS` and `houseWithWord()` in `web/src/lib/evidence-glossary.ts`, a banded Moon row reads "10.20°–22.85° Pisces". MB-88 is
decided (ADR-106); MB-89 stays open at its default with its seam tagged. The INDEX code map loses the bi-wheel, gains the ledger, card, guard.

# Natal report UI

Ideation 2026-09-17 with the Owner, over six rounds of live prototypes
(https://claude.ai/artifact/BRbKnKKjC78Xe3egLtanZz, built on the Marie Curie report-lab
run). Status: draft, awaiting `/lock`. The report is the product and its page is a wall
of text with one decorative wheel; this settles the design direction MB-29 has been
holding open, and the report shell that sits on it.

## Scope

- **Design direction "Observatory"**, chosen by the Owner from four live directions. It
  extends the §9 tokens rather than replacing them: same near-black ground, same
  indigo/violet for the product. Three additions — a **brass** token `#D4B06A` that means
  *measured sky* and is never a control, **Newsreader 400** in place of Noto Serif 300 for
  display and ledes, and **IBM Plex Mono** for every degree, orb and coordinate. This
  changes the display face named in **MASTERFILE §9**, so `/lock` edits and version-bumps it.
- **One register.** Marketing and printables are Observatory too: the printable is the same
  plate at print resolution, the share card the same frame cropped square. The earlier
  "product is the observatory, marketing is the print shop" split is withdrawn.
- **The wheel is rebuilt as a chart.** `web/src/components/ui/radial-orbital-natal.tsx`
  positions planets by **array index**, not by degree (`calcPose(index, total, rotation)`,
  L162). The rendered wheel is therefore decorative and contradicts R-4.1 and "real chart
  data only". Replace it: every body sits at its true `absoluteDegree` and never moves;
  where a sign is crowded, bodies **ladder inward** across three radii, each joined to its
  own degree tick by a leader line. Sign names written out, house numbers on their own
  ring, aspects de-emphasised in an inner disc, the four quadrants named in words, degrees
  revealed on hover, click selects a **house** rather than a planet. The Owner approved
  replacing the staging wheel outright with the one prototyped this session, so
  `radial-orbital-natal.tsx` goes rather than being patched.
- **Citations become superscripts.** `EvidenceLine.tsx` reprints the model's claim quote
  under the paragraph the reader just read. Instead, mark the quote in place at its true
  offset with a numbered superscript; hover (pointer) or tap (touch) opens a card listing
  the same `evidence[].label` strings plus a plain-English gloss from a static glossary.
  `claimsFor()` already does the matching and is reused unchanged. **No prompt, schema,
  `openapi.yaml` or API change, and no report-lab run.**
- **Report shell.** A hero opening — the person's name at the centre of a ring carrying
  Sun, Moon and Ascendant at their true angles, with the birth details in the frame corners
  — then chapters, each announced by a divider, a hue morph of the chapter accent, and
  three parallax depths. The chapter accent is the element of that chapter's house, so it
  differs per reader.
- **Type hierarchy.** `Section`'s `h2` is `text-2xl` while `OverviewBlock`'s headline is
  `text-3xl md:text-4xl`, so the one-liner outranks the title that introduces it. Fixed:
  eyebrow → title → lede, title always largest.
- **Planet renders.** The ten files in `web/src/assets/planets/` are 1×1 placeholders. The
  Owner supplied the originals (192×192 WebP with alpha). Commit them; they are used as
  **bodies only, never UI** — no planet in a button, chip or icon slot. Chiron and the lunar
  nodes have no render and keep a drawn glyph, which usefully reads as "point, not planet".
- **House cards.** Type-led front (house number, sign, the planets in it as renders), taller
  card, and a back whose every word is a string the report already emits —
  `personalPlanets[body]`, and `angleMeanings` for the 1st and 10th. An empty house reads
  through its ruler, using that ruler's generated line. **The UI writes no astrological
  prose of its own in this round** — if a card has nothing generated to say, it says nothing.
- **Chrome demotion.** `MethodologyBox` and `HouseSystemExplainer` move to a footnote strip
  and a slide-over instead of sitting open inline.

## Out of scope

- The section → house map (Mind→3rd, Career→10th …). The Owner deferred it to its own
  session; until then no section carries a house card.
- The birth-place keepsake plate and the four element atmosphere plates. Both need image
  credits the Owner has not spent (MB-13 adjacent).
- Generated section art. The house-style prompt is written and lives in the artifact; no
  image is generated in this round.
- The report-generation loading animation (Owner marked it PRIO 2 on the Notion page).
- Light mode. "Plate & Paper" was built, shown and rejected; it stays recorded as the
  rejected option and would reverse the dark-only decision.
- Marketing and landing-page restyle beyond stating the one-register rule. Voice is MB-25;
  the landing section grid is MB-8.
- Reusing the house card inside sections, and the logged-in dashboard tiles. The Owner said
  not yet.
- `SynastryReportPage.tsx`.

## Acceptance criteria

1. Every file in `web/src/assets/planets/` is over 1 KB, and the wheel renders a lit body
   for each of the ten; `web/src/assets/planets/README.md` no longer claims placeholders.
2. Rendering the `marie-curie` fixture, the Sun node's centre lies on the radius through
   14.58° Scorpio and its leader line lands on that degree's tick; the four-planet Scorpio
   stellium in the 11th shows four separated bodies, each on its own degree.
3. `git grep -n "calcPose"` returns nothing, and no code path derives a planet's angle from
   its position in an array.
4. No paragraph in the report is followed by a repeat of its own claim quote. Every claim
   renders as a superscript whose card lists the same `evidence[].label` strings that
   `EvidenceLines` used to print.
5. On all twelve sections the section title renders at a larger computed font size than the
   first line of prose beneath it.
6. Every degree, orb, latitude and longitude renders in the mono face with
   `font-variant-numeric: tabular-nums`.
7. The brass token appears on no interactive element: a grep of it returns only chart and
   geometry components, never a button, link or focus ring.
8. The Ascendant is never drawn as a planet body, and no planet render appears on a house
   that planet does not occupy.
9. `pnpm run typecheck`, `pnpm run build:web`, `pnpm run build:api` and the unit tests pass,
   and the Vercel preview smoke passes.
10. At 400 px the report has no horizontal overflow, and the hero's three readouts sit in a
    legend below the diagram rather than beside it.
11. Under `prefers-reduced-motion: reduce` the parallax freezes, the hue morph snaps and the
    starfield stops; every word of the report is still reachable and legible.

## Screens

- **Opening.** Dark ground, faint grain. A thin brass ring; the reader's given name at its
  centre in Newsreader 400 over the eyebrow `NATAL CHART REPORT`. Sun and Moon as lit
  renders on the ring at their true angles, each labelled `SUN` / `14.58° Scorpio · 11th` in
  mono. The Ascendant is an open brass marker with an outward tick, labelled
  `RISING · THE SLICE CLIMBING` and `12.07° Capricorn · ruled by Saturn`. Frame corners
  carry `DOB`, `TOB`, `POB`, the coordinates, `whole-sign · tropical`, and
  `day chart · sun alt 21.5°`. On a phone the labels move to a legend under the ring.
- **Chapter.** Divider rule with the chapter word on it, then eyebrow `09 / 12 · ROOTS`,
  title, hairline, lede, and prose at 64 ch with superscript citations. A ghost numeral
  sits behind the header at 4.5% opacity.
- **Evidence card.** Raised surface, the claim in italic serif at the top, then one row per
  reference: a kind chip (`placement`, `aspect`, `ruler`, `sect`, `lot`), the label in mono,
  and one line of plain English. Footer: `3 verified references · whole sign · tropical`.
- **Wheel.** Sign band with names, house-number ring inside it, aspects in a small inner
  disc, quadrant labels outside, ASC and MC axes in brass. Side panel shows the selected
  house as the same card used in the house grid.
- **House card.** Front: `4TH HOUSE · ARIES`, ghost numeral, `Home & roots`, the planets in
  it as renders, quadrant in the footer. Back: the house's question as a heading, then the
  generated text, footed `FROM YOUR REPORT`.

## Open questions

1. **The dead table toggle.** In section `02 — Chart`, directly above the wheel, there is a
   pill toggle that shows a single option, `WHEEL`. Its sibling button, `TABLE`, carries
   `hidden` (`ReportPage.tsx` L462), so the control has nothing to switch to. The view it
   would reveal (L543–581) is a plain list of every placement, main planets then minor. That
   list is not lost either way: print renders both views stacked, so it is already in the
   PDF. Default if silent: **delete the toggle and the dead branch**, keep the wheel.

## Decisions to record

1. Design direction: Observatory is the Stars Decoded visual direction; the other three
   explored directions, including light-ground "Plate & Paper", are rejected.
2. One register: marketing, share cards and printables use the same direction as the product.
3. Display face: Newsreader 400 replaces Noto Serif 300 for display and ledes. Supersedes the
   display-face clause of MASTERFILE §9.
4. Numerals: IBM Plex Mono with tabular numerals for every degree, orb and coordinate.
5. Colour roles: brass means measured sky and is never a control; indigo/violet mean the
   product; element hues mean element-derived data only.
6. Planet renders are bodies only, never UI.
7. The Ascendant is a point on the horizon, not a body, and is never drawn as a planet.
8. The wheel places every body at its true degree; crowding is resolved by radius, never by
   moving a body off its degree.
9. Citations are in-paragraph superscripts with an evidence card; the repeated-quote block
   under paragraphs is removed. No prompt or schema change.
10. House-card copy is drawn only from fields the report already emits; an empty house reads
    through its ruler's generated line, and the UI writes no astrological prose of its own.
11. Accent: brass `#D4B06A` is the sky colour. Platinum and indigo-only were built, shown and
    rejected. This closes MB-29.
12. The decorative wheel component is replaced, not repaired: `radial-orbital-natal.tsx` is
    deleted with the round that lands its successor.

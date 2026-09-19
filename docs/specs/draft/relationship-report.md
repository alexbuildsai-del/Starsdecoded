# Relationship report

Ideation 2026-09-19 with the Owner. A second report type that reads two finished natal
reports and says how these two people meet. Artifact (name options, lenses, picker, chapters,
a real bi-wheel of the two fixtures, engine, questions):
https://claude.ai/artifact/AmsN9XxzbU81Ek18dAsBuk. Status: **draft**.

What exists today (mapped this session): a chart-to-chart synastry v1 is wired end to end,
`relationships`, `relationship_participants`, `invite_tokens`, `computeCrossAspects`
(`api/src/lib/synastryCompute.ts`), six untyped prose calls, `SynastryReportPage`, dashboard
zone 3, invite and claim. It never reads the stored natal reports, has no foundation, no zod
sections, no claims, no usage accounting, and shows a score. This spec replaces its report
and keeps its plumbing. Nothing was ever sold from it.

## Scope

### Name and positioning
- Product name **Relationship report** (Q1). "Compatibility" stays a plain word in copy ("how
  compatible you are, and why"); "The Two of You" is the strapline. Tab and PDF title
  "{A} & {B} · Relationship Report · Stars Decoded" (supersedes ADR-32's synastry line).
- One product, one price, one engine, one lab (Q2). Three marketing doors (partners, parent and
  child, family) open the same product with the lens preselected.

### Lenses
- `relationships.type` becomes `partners | parent_child | family` with an optional free label
  ("sisters", "father-in-law"). Supersedes `romantic | sibling | custom`.
- The lens sets: chapters 07 and 08; the example register every section writes in; the workbook
  labels; symmetry. Parent and child is asymmetric: the picker asks who is the parent and the
  participants' positional `role` carries it. A child's chart is read as potential, never a
  verdict (MB-16).
- Registers. Partners: a weekend, a bill, an argument at 11 pm, a move. Parent and child:
  bedtime, homework, a tantrum, praise, a first heartbreak. Family: a dinner, a gift, the group
  chat, a shared care duty, the conversation nobody starts.

### Inputs and the flow
- Created from the dashboard, never from a birth form: pick report A and report B from the
  natal reports the buyer can see, any two, own not required (Q3); pick the lens; one CTA.
- Both must be `complete`. A person with no report is added the normal way first (natal
  credit). A report still writing is listed but not selectable. The invite link stays the other
  door in and is unchanged.
- CTA states: has the credit → "Write the report", the page opens at once and streams; no
  relationship credit → "Get the relationship report" opens checkout for one credit and keeps
  the selection; both people missing → checkout offers the pair bundle.
- The report reads `reports.interpretation` and the cached `chart_data` of both. No birth data
  is read again, nothing from a natal report is regenerated.

### Credits
- One credit type `relationship` replaces `couple` and `parent_child`. Bundles: solo (1 natal),
  pair (2 natal + 1 relationship), relationship add-on (1). Prices stay MB-5; R-6.4 holds
  (pair above two solos). Consumption goes hard with payments (MB-6).

### Chapters (nine, 3,000 to 4,500 words, no score anywhere)
01 How you meet · 02 The two charts · 03 Two ways of being · 04 Where it flows · 05 Where it
rubs · 06 How you talk · 07 lens one · 08 lens two · 09 What to practise.
- Lens one: Partners "Love and closeness" (how each shows care and wants it shown, desire,
  repair); Parent and child "What this child needs" (safe, learn, protest, recover); Family
  "Being family" (roles, loyalty, distance, humour).
- Lens two: Partners "Building a life" (money, home, ambitions); Parent and child "How you
  parent them" (reflexes, where they fit this child, where they miss); Family "Gatherings, gifts
  and hard talks".
- Each section tags its sources: **natal** (read from the two stored reports, quoted or
  paraphrased with the original citation carried over) or **new** (written for the pair from
  cross-chart evidence). 03 is mostly natal (overview headline, temperament, howYouDecide) with
  one new bridging paragraph. 04 tests each person's `connectBestWith` against the other chart.
  05 draws on `paradoxes` and `theChallenge`; hard aspects framed as growth (ADR-5).
- 09: three checklists, for A, for B, for both, each item with a why (the natal style contract).
  Ticks save to the report's workbook (ADR-24). Closing paragraph, no dawn.
- The natal page layout is reused: chapter accents by index (ADR-23), rail beside prose, cards
  for lists, superscript citations, streaming, print.

### Chapter 02, the two charts
- One bi-wheel drawn from both `chart_data`: inner ring A, outer ring B, the host's whole-sign
  houses, host swapped with one tap. Bodies at their true degree; crowding steps the radius.
  Cross aspects within 4° drawn: brass conjunction, teal trine and sextile, rose square and
  opposition. Brass stays geometry (§9).
- One card per drawn link and per notable overlay (three or more of one person's planets in
  one house of the other, or a luminary there): a 40 to 70 word reading tagged **flows**,
  **rubs** or **overlay**, ending on a "Behaviour check:" sentence. Generated and validated
  like house cards (ADR-21): names only the two bodies and the house.
- The existing score ring, category bars and six prose blocks are retired; the internal
  weighting only orders the links.

### Engine
- `reports.type = "relationship"`, `relationship_id` as today. `pair:` section registry in
  `api/src/prompts/`, same `SectionSpec` shape, every section zod enforced, usage accounted,
  model ids from `models.ts`.
- Pair brief derived in code: both foundations' `chartThesis`, `dominantPattern`,
  `centralTension`; cross aspects with orbs (`computeCrossAspects`, unchanged); whole-sign
  overlays (new pure module, both directions); each side's `connectBestWith` and
  `theChallenge`; the lens and its register.
- One foundation call (pair thesis, three strongest links, the friction that matters, one
  guidance sentence per section), then nine section calls in parallel, stored as each lands.
- Claims: two new evidence kinds. `cross` `{ planetA, planetB, aspect, orb }` or
  `{ planet, of: "A" | "B", inHouseOf, house }`; `source` `{ report: "A" | "B", section,
  claim }` pointing at a stored natal claim, rendered with that report's own evidence label.
  `validateClaims` rejects any `source` that does not exist.
- Lab: one pair fixture (Marie Curie and Oprah Winfrey), three runs, one per lens; cost target
  under 60 cents, wall clock under the natal's.
- Access: the buyer owns it; a participant who claimed their own report sees it through the
  existing access roles. Delete follows natal (MB-32's 409 goes).

## Out of scope

- Composite charts, transits, a third person, friends and colleagues lenses, sharing a report
  with someone who has no account, a report between two reports the buyer cannot see,
  Placidus, a score of any kind, regenerating either natal report.

## Acceptance criteria

1. The dashboard offers "New relationship report"; the picker lists only complete natal
   reports; a writing one is visible and unselectable; the lens is required; parent and child
   asks who the parent is.
2. With no relationship credit the CTA opens checkout and returns to the same selection.
3. Creating the report reads no birth data: geocoding and `calculateNatalChart` are not called.
4. The page opens with the bi-wheel before any chapter; chapters stream in; the swap control
   re-hosts the houses; every drawn line matches a cross aspect within 4° of the pair fixture.
5. Every link card is 40 to 70 words, ends on "Behaviour check:", names only its two bodies
   and, for an overlay, the house.
6. Every claim validates: a `cross` claim matches a computed aspect or overlay; a `source`
   claim resolves to an existing claim in report A or B and renders that report's label.
7. No number, rating, percentage or bar describes the pair anywhere on the page or in the PDF.
8. Lens changes chapters 07 and 08's titles and content and the examples' register; the lab's
   three runs differ there and nowhere structurally else.
9. Workbook ticks persist per report; "for A", "for B", "for both" labels present.
10. Total 3,000 to 4,500 words; the lab measurement is pasted in the round report.
11. Typecheck, both builds, unit tests, codegen, `db:bootstrap` clean (type and credit
    migrations idempotent), Vercel preview smoke.

## Screens

All in the artifact: the three name options as tile, tab and filename; the lens cards; the
picker with its three CTA states; the chapter list with sources; the bi-wheel on real data
with link and overlay cards; a prose chapter with the rail; the engine pipeline.

## Open questions

1. Name: Relationship report? Recommended yes. Default: Relationship report.
2. Packaging: one product with three lenses behind three marketing doors? Recommended yes.
   Default: one product, partners first in the picker.
3. Which two: any two complete reports the buyer can see, own not required? Recommended yes,
   so a parent can pair two children. Default: any two.

## Decisions to record

1. **The second report type is the Relationship report**, built from two stored natal reports
   and cross-chart evidence; nothing is regenerated. Supersedes ADR-32's synastry title.
2. **One product, three lenses**: partners, parent and child, family. The lens sets two
   chapters and the example register, never the engine. Closes MB-16 and MB-27 into this spec.
3. **No score.** No number describes a pair. Closes MB-18 as "not shown".
4. **Credits**: one `relationship` credit type; pair bundle 2 natal + 1 relationship; add-on 1.
5. **Chapter 02 is the bi-wheel** with generated link cards, grounded like house cards.
6. **Two evidence kinds** `cross` and `source`; a source claim carries the natal label.
7. **The old synastry report is retired**; its compute module and plumbing stay. MASTERFILE
   §2 changes: the relationship report is V1 scope after payments; zone 3 hides until it
   ships (MB-9).

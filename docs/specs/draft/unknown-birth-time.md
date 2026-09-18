# Unknown birth time: the sky without the horizon

Ideation 2026-09-18 with the Owner, from the gift-buyer risk ("a gift buyer almost never
knows their mother-in-law's birth time"). Artifact, built on the Marie Curie fixture swept
through its birth day by the real engine: https://claude.ai/artifact/GicHa2umwRm5rQDuWVLp9p. Status: **draft**. Builds on
`natal-report-pass-two.md` (R04, in flight) and depends on the R04 section registry.

## The finding that frames it

- The hour decides one family of facts, **the horizon**: rising sign and degree, Midheaven,
  the twelve houses and their rulers, sect, the lots. The date decides everything else,
  with two exceptions the engine can detect (the Moon changes sign every 2.5 days, the Sun
  once a month). In the R04 report the horizon is exactly `triad.rising`, the `houses`
  section, `angleMeanings`, every claim of kind `angle`, `ruler`, `sect` or `lot`, and the
  house on every placement label. Clean seam.
- Swept at two-minute steps, 7 Nov 1867 in Warsaw has Capricorn rising from 11:12 to 12:58.
  The fixture's "12:00" is a convention, not a record: the reference report's horizon rests
  on 106 minutes out of 1,440.
- Correction to the premise: the current invite flow is the synastry invite, where the
  inviter types the other person's birth data and the recipient claims the profile. That
  claim mechanism exists; sharing an unspent credit does not, and belongs to pricing
  (MB-5, MB-6). The Owner settled the gift model in this session (below).
- Found on the way: both timezone lookups use today's offset, not the birth date's (MB-48).
  One hour is up to 30° of Ascendant, a whole sign. The readout below is only honest once
  the offset is the one in force at birth, so MB-48 ships inside this round.

## Scope

### Intake: three answers, one readout
- The time field becomes a three-way control: **I know it** (HH:MM, "as written on the
  record"), **Roughly** (a part of the day, or a time give or take an hour), **I don't know**.
- Storage: `profiles.birth_time` stays, plus `birth_time_window_minutes` (exact 0, part of
  day 180 around its centre, unknown 720 around 12:00). One representation, the band
  drives the maths. `resolveOrCreateProfile` dedupes on both.
- **The horizon readout**: `POST /api/horizon/preview` (date, place, time, window) sweeps
  the band with `calculateNatalChart` and returns, per fact, whether it holds across the
  band: rising sign (with the minutes it holds from and to), Midheaven sign, sect, Moon
  sign, Sun sign. The form shows it live under the control, before anything is paid:
  "Capricorn · holds from 11:12 to 12:58", or, for "Afternoon", "6 possible: Capricorn,
  Aquarius, Pisces, Aries, Taurus, Gemini · flips at 12:58, 14:06, 14:56, 15:46, 16:54".
- **The horizon is known** when rising sign, Midheaven sign and sect all hold across the
  band; a rough time that passes is treated as known and the method strip says
  "birth time approximate, holds across the window". Otherwise the horizon is **unknown**.
- A Moon or Sun that changes sign inside the band is read as the sign covering the larger
  share of the band, and the method strip and the brief say so. Its degree is the centre
  time's; the Moon's orbs widen to its travel across the band.
- **Where to find it**: under "I don't know", a hint keyed by birth country from the
  geocoder: France (copie intégrale de l'acte de naissance, free, service-public.fr or the
  mairie), Belgium, Netherlands, Germany (register extract, not the Geburtsurkunde), Spain,
  Italy, Switzerland, UK (Scotland yes; England and Wales only for twins), US and Canada
  (long form), elsewhere (parents, hospital). Lines are verified against the official
  source before shipping; an unverified line falls back to the "elsewhere" copy.
- The old "if unknown, use noon" note is deleted.

### Engine: the horizon as a status
- `calculateNatalChart` takes the window; `chartData.horizon` records
  `{ status: known | approximate | unknown, ascendant, midheaven, sect, moonSign, sunSign }`
  each with `holds: boolean` and the flip times. `CHART_VERSION` 3, so cached charts recompute.
- When unknown: positions at the centre time; `angles`, `houses`, `sunAltitude`, lots and
  every `house` field are absent from the chart, not zero. Type it so a consumer cannot read
  a house that does not exist.
- The timezone offset is the offset in force at the birth instant, from the IANA zone stored
  on the profile (MB-48); the fractional LMT path for pre-standard-time births stays.

### The blind report
- Brief: the ANGLES line becomes `HORIZON: unknown` and the placements carry no house; sect
  and lots are omitted; the doctrine adds one rule: never name a house, the Ascendant, the
  Midheaven, rising, day or night, or a lot. The prose never mentions the missing time; the
  frame does.
- Registry: `triad.rising`, `houses` and `angleMeanings` are skipped when the horizon is
  unknown; the schema forbids claims of kind `angle`, `ruler`, `sect`, `lot`, and
  `validateClaims` rejects a placement ref with a house. Chapter footers that point to a
  house ("Read chapter") are omitted. Bands unchanged; the blind report is about 900 words
  shorter and the lab's total band for a blind run is about 2,900 to 4,600.
- `interpretation.meta.horizon` mirrors the chart status. The credit is consumed here, once.
- **Hero**: no horizon line, no EAST and WEST labels, no rising marker. Corner `TOB` reads
  "not recorded" (or "approximate"); the frame reads "horizon · not drawn". The Moon is drawn
  as the arc it travelled that day (10.2° to 22.8° Pisces on the fixture), the Sun at its
  centre-time degree. Legend third line: "RISING · add your birth time to draw the horizon".
- **Explorer**: the wheel keeps the sign band and the bodies at their degrees, drops the
  house ring and the axes; the card slot holds the one call to action: what the hour adds
  (four lines), "Add my birth time", "Free. Every change is marked.", the country hint. The
  dashboard tile carries the same call to action; print carries the marks and the ledger.
- **Method strip**: "birth time not recorded · rising sign, houses, day or night and lots
  not drawn · positions at 12:00 local · Moon 10.2° to 22.8° Pisces". Printed too.

### The horizon pass
- Entry: hero, explorer, method strip, dashboard, all opening the same three-way control
  with the live readout. `PATCH /api/profiles/:id/birth-time` (time, window), owner only.
- Report status gains **`revising`**: readable throughout, chapters mark "revising" as R04
  marks "writing". Machine: `complete → revising → complete | failed`; a failed pass keeps
  the previous text and says so.
- The pass never regenerates the report. It: recomputes the chart; generates
  `triad.rising`, `houses` and `angleMeanings` as in R04; and runs one **amendment call**
  per existing section with the section's text, the full brief and the instruction to
  return only what the horizon changes: `{ amendments: [{ quote, replacement, evidence }],
  additions: [{ after: quote | "end", text, claims }] }`, at most three amendments and one
  addition per section, everything else kept word for word. Applied in code by exact quote
  match after the same softening `CitedText` uses; an unmatched quote is dropped and
  logged, never applied loosely. Claims re-validated after application.
- `report_revisions` table: `report_id`, `interpretation` (the previous), `chart_data`
  (the previous), `reason` (`birth_time_added`), `created_at`. MB-19 and MB-45 reuse it.
- **Credit rules (Owner).** Only the time can change on a report, through this pass. The
  first time update is free, no window; a second consumes a credit; a changed date or place
  is a new report on a new credit. No other user regeneration: `POST /reports/:id/regenerate`
  and the MB-45 CTA are reconciled (MB-49). No credit opens the pricing popup (pricing
  session). This round ships the free first pass and a `horizon_passes` counter.
- **Marks**: an amended sentence carries a brass underline and the tag "revised"; hover or
  tap opens a card: before (struck), now, because (evidence chips, `angle` and `lot` in
  brass). An added paragraph carries a brass rule and the kicker "Added with your birth
  time". New blocks are tagged once. The rail shows "n sentences revised · m added · date".
- **The ledger** at the top after the pass: rising, Midheaven, day or night, what was added,
  sentences per chapter, "Before · kept · compare any time", the toggle "Show what changed"
  (on at first visit, remembered per browser). Folded into the method strip afterwards.

### Gifting, two modes (Owner's answer 3)
- **Generated by the giver.** The giver spends a credit from their own account, enters what
  they know (the time may be rough or unknown), reads the report, and invites the person to
  read it and claim it as theirs. On claim the recipient owns the profile and the report and
  is asked the three-way time question first: adding or correcting the time is the horizon
  pass, free once. A corrected date or place is a different sky: a new report on a new
  credit, never an edit. The giver keeps read access after the claim unless the recipient
  removes it (default; pricing may revisit).
- **Shared credit.** The giver passes an unspent credit; the recipient generates it
  themselves. First screen is the gift: the giver's message, two lines on what the report
  is, "only you enter your birth details". Then the same form with the three-way control
  and the free-later promise. Second button: "Save and come back with the time".

## Out of scope

- The gift purchase, credit kinds and pricing (MB-5, MB-6), the credit gate on a second
  time update and the pricing popup (MB-49). Synastry with a blind chart.
- Rectification from life events, and any "most likely rising sign" guess.
- Placidus (MB-28). A time-band Moon written as two signs.
- Chart explorer redesign beyond removing the house ring; the R04 explorer is the base.

## Acceptance criteria

1. With "I don't know", the form submits; the report reaches `complete` with
   `meta.horizon = "unknown"`, no house number, angle, sect or lot anywhere in its text or
   claims (a lab flag greps for them), and no `houses` or `triad.rising` key.
2. The Marie Curie fixture entered as "Afternoon" returns a readout naming six rising signs
   and the flips at 12:58, 14:06, 14:56, 15:46 and 16:54; entered as "around noon, give or take an
   hour" it returns Sagittarius, Capricorn or Aquarius with flips at 11:12 and 12:58.
3. Entered as 12:00 exact, the readout reads "Capricorn · holds from 11:12 to 12:58".
4. The blind hero renders no horizon line and draws the Moon as an arc whose ends are the
   Moon's longitudes at 00:00 and 23:59 local; the wheel renders no house ring and no axes.
5. After the pass on the blind fixture, every sentence of the blind report is either present
   verbatim or listed as an amendment with its evidence; the ledger's counts equal the
   amendments applied; the previous interpretation is in `report_revisions`.
6. The lab measures the pair (blind, then passed) against the reference run and prints
   words kept verbatim, sentences amended, claims added, and the cost of each stage.
7. A summer birth entered in winter gets the summer offset (MB-48), asserted in a unit test
   on a date with DST and one before 1970.
8. Typecheck, both builds, unit tests, `db:bootstrap` twice, codegen clean, the report lab on
   the five fixtures plus the blind Marie Curie, smoke on the preview.

## Screens

All in the artifact: the birth-day sweep; the form with the three modes and the readout; the
claim page; the blind hero beside the passed hero; the blind explorer and method strip; the
ledger; chapter 04 with a revised sentence, an added paragraph and the revision card; the
options side by side; the flow of states.

## Answered in the session

1. **Blind means no houses.** Solar houses rejected: a guess wearing a house number.
2. **The first pass is free, no window.** A second time update, or any change of date or
   place, costs a credit; nothing else regenerates a report.
3. **The giver may enter everything.** Two gift modes: generated by the giver and claimed
   by the recipient, or an unspent credit shared for the recipient to generate themselves.

## Open questions

None. The giver's read access after a claim is a default for pricing to revisit.
## Decisions to record

1. **The horizon is a status, not a guess.** A chart computed without a known time carries
   no angle, house, sect or lot, in data, prose or citation. Noon is a centre for positions,
   never a birth time. Supersedes the form's "use noon" note.
2. **Birth time is a window.** Exact, a part of the day, or unknown are one representation
   (centre plus half-width); the engine sweeps it and decides whether the horizon holds.
3. **Adding the time is a pass, not a regeneration.** New horizon blocks are generated;
   existing sections change only by quote-matched amendments with evidence, capped at
   three sentences and one paragraph each; the previous text is kept; the reader sees
   exactly what changed. Report status gains `revising` (edits R-3.3).
4. **One free time update per report, and nothing else changes a report.** The first
   horizon pass is free with no window; a second consumes a credit; date or place changes
   are a new report on a new credit; no other user regeneration exists. Credit gate and
   pricing popup are built with pricing (MB-49).
5. **The frame is honest so the prose can be confident.** The plate, the explorer and the
   method strip state what is not drawn; the report's sentences never apologise.
6. **Gifting has two modes.** A giver may generate a report from their own account and
   invite the person to claim it, or share an unspent credit for them to generate it
   themselves. A claimed report belongs to the recipient; the horizon pass is theirs to run.
   Recorded now so pricing builds on it.

## Mailbox rows raised

- MB-48 (this session): timezone offset is today's, not the birth date's. Ships in this round.
- MB-49 (this session, decided): the credit rules above, for the pricing session to build.
- To raise at lock: verify the country hints against official sources (todo, launch).

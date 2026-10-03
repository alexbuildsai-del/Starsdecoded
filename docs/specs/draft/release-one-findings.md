# Release one's findings: what the sweep does not cover

Ideation 2026-10-03. Draft, second pass. Source: `docs/qa/QA-02.md` (staging at R14, the QA that cleared the first
Release at 27bb5c5). Every finding was re-read against `main` at 30b45b6, then against the locked
`mailbox-sweep-03-10` (ADR-231 to 242, on `claude/affectionate-ride-n4l2zb`), which already holds QA-02's rows as R15.
Artifact: https://claude.ai/artifact/X4mFcvZkWtmNWG2vJqgnP7

## Already held by the sweep (removed from this draft)
#4 MB-177 the wheel's focus · #5 MB-178 one clock · #6 MB-179 the card's offset · #7 MB-180 /method's Chiron line ·
#8 MB-181 the Elements line removed (no tie wording) · #9 MB-182 /sample from a Release · #10 MB-183 Clerk blocked ·
#11 MB-184 the waitlist's focus · #12 MB-185 a pasted date · #1 MB-186 the network setting (the Owner's, when he has
time). #2 was fixed in PR #100.

## Scope

### 1. The zone comes from the server (QA-02 #3, MB-30) — the one finding nothing holds
With timeapi.io unreachable, the browser guesses the offset from the longitude (`places.ts` `fallbackZone`; Brussels
gets UTC+0) and says nothing: Audrey's 1929 chart reads Aries rising instead of Aquarius. /sky is public on
production now, and the birth form sends the same guess (`BirthFormPage.tsx:108`), so a written report can carry a
wrong chart: wrong for the reader (ADR-81). MB-30 is from 2026-09-09, before the sweep's window, so neither the sweep
nor `R16-plan.md` holds it.
- The web calls `/api/geocode` (mounted, unused). The API asks Nominatim, ranks with the shared ranking, and reads
  each hit's IANA zone from an offline coordinates-to-zone table on the API; the library is picked at /plan by the
  researcher and checked by the verifier (border accuracy, size, upkeep, a release older than 7 days).
- A place with no zone is refused ("Pick a nearby town"). `fallbackZone` and the longitude guess are deleted.
- The offset is always the zone's at the birth date (the engine's `offsetAtBirth`), which MB-179's card then reads.
- timeapi.io and Nominatim leave the browser: the CSP's `connect-src`, `processors.ts` and the privacy page's
  processor list move them to the server.
- Size L, about 250 lines and tests. No brain. Opus.

### 2. Three gaps in the sweep's cards (added to R15's cards at /plan)
- **MB-177.** On home the wheel has 25 stops that do nothing (`Claims.tsx:753` passes no `onSelectHouse`). The
  locked fix outlines them and adds a skip link; home's wheel should also take no stop, one prop.
- **MB-178.** The card names five places; QA-02 cited more. The full list: `plateAnswer`, `summaryLine`, `hudLines`,
  `clockLine`, `risingReadout` ("HOLDS FROM 07:12 TO 08:26"), `sampleDayLine`, `spanLine`, and inline times in
  `Method.tsx:59`, `MethodPage.tsx:73`, `Claims.tsx:606`, `LearnBirthTimePage.tsx:162`.
- **MB-182.** `refresh-sample.ts` has nothing to read: runs live in staging's `lab_runs` on Railway, and no route
  returns a run's text (`adminLab.ts:43` strips `output`). A passing Release pushes `sample/<release-id>` with the
  refreshed JSON through `GITHUB_RELEASE_TOKEN` (already on Railway staging, contents write); the session opens the
  pull request and merges it once green. No key leaves Railway and no one carries a file.

### 3. Closed on paper
`access-control-allow-origin: *` on prerendered HTML (QA-02 #12, from QA-01 #8) is Vercel's default for static files;
the pages are public and carry no credentials. Accepted; the probe keeps checking `/api`.

## Out of scope
Everything the sweep holds; anything about pricing.

## Acceptance criteria
- With the zone table's answer for Ixelles, 4 May 1929 03:00 reads Aquarius rising on /sky, the birth form and the
  dialog; a place with no zone is refused; the browser sends no request to timeapi.io or Nominatim.
- A route test with Nominatim stubbed covers a hit, a hit without a zone and Nominatim down.
- Tab passes home's wheel without a stop; every printed time on the list follows the reader's clock.
- A passing Release leaves a `sample/<release-id>` branch whose JSON has no foundation and no usage.

## Screens
The artifact's place flow, before and after: https://claude.ai/artifact/X4mFcvZkWtmNWG2vJqgnP7

## Open questions
None. MB-30 joins R15 as the sweep's lane 2, row 23, and the three gaps ride their cards, unless the Owner says no.

## Decisions to record
- Places and their zones are resolved on the server; a place without a zone is refused; the offset is the zone's at
  the birth date; the browser calls no geocoder or zone service (MB-30).
- A passing Release pushes /sample's refreshed run on its own branch with the release token (amends ADR-223's step).
- `access-control-allow-origin: *` on public static HTML is accepted.

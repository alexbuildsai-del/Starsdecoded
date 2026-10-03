# Release one's findings: QA-02's sev-2 and sev-3, sized and grouped

Ideation 2026-10-03. Draft. Source: `docs/qa/QA-02.md` (staging at R14, the QA that cleared the first Release
at 27bb5c5), Mailbox MB-30 and MB-177 to 186. Every finding was re-read against `main` at 30b45b6 by three
read-only agents; file and line evidence is in the artifact.
Artifact: https://claude.ai/artifact/X4mFcvZkWtmNWG2vJqgnP7

QA-02 #2 (the pre-filled place not selected) was fixed in PR #100 and is not repeated here. The Release's own
QA-agent findings sit in the admin Release view on staging, which a cloud session cannot open; they are not in
this draft.

## What the re-read changed
- **#3 is worse than filed.** With timeapi.io unreachable the browser guesses the offset from the longitude
  (`places.ts` `fallbackZone`, UTC+0 for Brussels) and says nothing. /sky is public on production today, and the
  paid birth form sends the same guess (`BirthFormPage.tsx:108`), so after launch it is a wrong chart in a paid
  report: sev-1 by the reader rule. `/api/geocode` exists but the web never calls it.
- **#7 is narrower.** Chiron is well inside one arcminute of Horizons (`chiron.test.ts` pins it to 0.001°); only
  "Every chart is worked out by the same code" is false, since Chiron is not astronomy-engine's.
- **#11 is half done.** `aria-invalid` and `aria-describedby` are already there (`WaitlistForm.tsx:110`); focus
  and the outline are not.
- **#10 is admin-only on production.** The waitlist covers /claim and /chart until launch; /sign-in and /admin
  hang. Staging shows all four, and launch opens them.
- **#12's header is likely harmless.** `access-control-allow-origin: *` on prerendered HTML is Vercel's default
  for static files; the pages are public and carry no credentials.

## Scope, by topic

### A. Birth data is right (sev-2 #3, sev-3 #6, #12) — L
1. **Places come from the server** (MB-30). The web calls `/api/geocode`; the API asks Nominatim, ranks with the
   shared ranking, and reads each hit's IANA zone from an offline coordinates-to-zone table on the API (the
   library is picked at /plan by the researcher, then verified: border accuracy, size, upkeep, the 7-day release
   age). A place with no zone is refused ("Pick a nearby town"); the longitude guess is deleted. The offset is
   always the zone's at the birth date (the engine's `offsetAtBirth`). timeapi.io and Nominatim leave the
   browser and the CSP's `connect-src`; `processors.ts` lists Nominatim as the server's. ~250 lines, Opus.
2. **The place card tells the birth's offset** (#6): no offset until a date is typed, then the zone's at that
   date ("UTC+1" for Brussels 1929). ~30 lines.
3. **A pasted date reads as a date** (#12): month names in the browser's language and English, genitive forms
   included, read by `readDate`; letters with no month found are refused at once. ~50 lines.

### B. One clock per page (sev-3 #5) — M
4. Every time a reader sees follows the browser's clock, through R14-13's `clockWords`: `summaryLine`,
   `hudLines`, `clockLine`, `plateAnswer`, `risingReadout`, `sampleDayLine`, `spanLine` and four inline times.
   The default stays 24-hour so prerender and hydration agree. ~100 lines, Sonnet.

### C. What the pages say is true (sev-3 #7, #8, #9) — M
5. **/method step 1** keeps the library sentence and ends "Chiron's place comes from JPL Horizons itself."
   `updated` moves, so `csp:write`. 3 lines, Haiku.
6. **A tie is told the same way everywhere** (#8). One pure helper in `packages/engine` gives the leaders of a
   count; the brief (same output, pinned), the sky card's `elementLead` and BalanceRail all read it. Wording is
   Question 1. Touches the brain without changing its output, so the dry lab runs. ~100 lines, Sonnet.
7. **/sample from the first Release's run** (#9, ADR-223). An admin-only route on staging exports a lab run
   without its foundation and usage; Claude commits Audrey's run from the Release lab, repins the digest and
   re-picks home's claims with /ux-copy. No new spend. ~60 lines plus data, Sonnet.
8. **The 25-word rule is measured** by a warn-only check (chk-43) that logs a `generation_failures` row and never
   blocks (ADR-81). Brain, ~40 lines, Opus.

### D. Keyboard and screen readers (sev-2 #4, sev-3 #11) — M
9. **The wheel is one keyboard widget.** A wheel that does nothing takes no tab stop (home: 25 stops to 0). An
   interactive one has two stops, houses and bodies, each a roving tabindex: arrows, Home and End move selection
   and focus; a drawn ring like the circle's YOU node (`orbit.css`) marks the focused stop. ~120 lines, Opus.
10. **The waitlist's error** moves focus to the field and the field shows an outline on focus. ~6 lines, Haiku.

### E. When sign-in cannot load (sev-3 #10) — M
11. One `useClerkLoad()` state (loading, ready, failed: Clerk's own error, or 8 s) and one line with Retry:
    "Sign-in couldn't load. Check your connection or content blocker." Used by RequireAuth, sign-in and sign-up,
    the three admin pages and /claim; /claim shows the invite or its not-found without waiting on Clerk.
    ~90 lines, Sonnet.

### F. Closed without code
- **#12, the header.** Recorded as accepted: public HTML, no credentials; the probe keeps checking `/api` only.
- **#1, the QA harness** (MB-186). The cloud environment's network policy denies `*.clerk.accounts.dev`, the
  Railway hosts and `mystarsdecoded.com`. Question 3.

## Size
Eleven cards: one L, five M, five S; about 850 lines and tests. Two touch the brain (6 and 8), so the dry lab runs.
Fits one round of three parallel groups: A, B and C5 to C6 together; C7, C8, D and E; then the tester and the
sentinel.

## Out of scope
The pricing round's work (checkout, the postal address, `LAUNCHED`); MB-169 to 176 from R14's report; QA-01's
sev-3 rows not reproduced by QA-02; a pair run for /compatibility (MB-93).

## Acceptance criteria
- With the zone table's answer for Ixelles, 4 May 1929 03:00 reads Aquarius rising on /sky, the birth form and the
  dialog; a place with no zone is refused; no request leaves the browser for timeapi.io or Nominatim.
- The place card shows no offset before a date, UTC+1 for Brussels on 4 May 1929.
- Pasting "4 May 1929", "4 mai 1929" (fr) and "4 maja 1929" (pl) fills the field; "4 Mayo" in en-GB is refused.
- In en-US every time on home, /sky, /method, /sample and /learn/birth-time reads in 12-hour words; en-GB in 24.
- Audrey's elements read the same tie on home, /method, BalanceRail and the brief.
- /method names Horizons for Chiron; /sample's run is the Release's; the overview averages 15 words or fewer, or
  the gap is reported, not hidden.
- Tab passes home's wheel; /sample's wheel takes two stops, arrows move focus and the card, each stop draws a ring.
- An empty /waitlist submit focuses the field, with `aria-invalid="true"` and a visible outline.
- With Clerk blocked, `/claim?token=bogus` shows its not-found; /chart and /sign-in show the line within 10 s.
- e2e for wheel, waitlist, Clerk blocked and the paste; unit tests for the zone route, the helper and the clocks.

## Screens
The artifact shows the triage board, the place flow before and after, the tie wording options, the wheel's focus
ring and the sign-in line: https://claude.ai/artifact/X4mFcvZkWtmNWG2vJqgnP7

## Open questions
1. **The tie's words** (locked as "Spread across the four" in `dashboard-sky.md`). Recommendation: name the tie,
   "Fire, earth and water tie at 3", with BalanceRail's label "Tied"; "Spread across the four" only when all four
   are within one. Default if silent: this.
2. **When.** Recommendation: these eleven cards as R15 now, pricing and launch as R16 (#3 must precede launch
   either way). Default if silent: this order.
3. **The QA harness.** Recommendation: allow `*.clerk.accounts.dev`, `starsdecoded-staging.up.railway.app` and
   `mystarsdecoded.com` in the cloud environment's network settings (Custom, keep the defaults). Default if
   silent: the Release view's QA agent plays those personas (MB-186's default).

## Decisions to record
- Places are resolved on the server: zone from an offline table, refused without one, offset at the birth date;
  the browser calls no geocoder or zone service (MB-30).
- Every time a reader sees follows the browser's clock (extends R14-13).
- One engine helper tells a count's leaders; every page and the brief read it (wording per Question 1).
- /method step 1 names Horizons as Chiron's source.
- /sample is exported from the Release lab's run by an admin route; sentence length is a warn-only check (chk-43).
- The wheel is a composite widget: no stop when inert, two roving stops when interactive, a drawn focus ring.
- Sign-in that cannot load shows one line with Retry after 8 s; /claim's preview does not wait on Clerk.
- `access-control-allow-origin: *` on public static HTML is accepted.

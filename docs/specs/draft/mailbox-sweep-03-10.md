# Mailbox sweep 03/10

Ideation 2026-10-03 on the Mailbox rows raised 2026-09-26 to 2026-10-03 that are still open and that no other
session or plan holds. Artifact: https://claude.ai/artifact/1f8CkTF3ET9wGxVkce3YRf. Status: **draft, answered by
the Owner 2026-10-03** (Q1 yes, Q2 changed, Q3 changed: no pricing until he starts it, MB-181 cut to one removal).
Checked against `main` at 30b45b6 by three code reads, each row confirmed still true or not.
**Brain:** lane 4 only (`api/src/prompts/`, `aiInterpretation.ts`, `pairInterpretation.ts`): dry lab, spot, release lab.
**Schema:** lane 3 only (a share grant, per-reader workbooks), each with an idempotent script in `bootstrap-db.sh`.
**Phone first**: every screen in the artifact is drawn at 390 px.

Left alone because they are already held: MB-125 (the timeline planner session's round plan, in progress),
MB-91 and 113 to 120 (`docs/rounds/R15-plan.md`), MB-144, 148, 162 (follow payments to R15, `R14-plan.md`),
MB-147 (seven clean CSP days from the first Release, 2026-10-03). MB-111 and 149 wait with the pricing plan.

## Scope

### Lane 1. Close on paper (15 rows, no build; closed in the Mailbox 2026-10-03 on the Owner's word)
- Built at their default, so they are decided as built: MB-128 (gpt-6-sol plans), 129 (a refused release fixes the
  prompt, then moves one section), 130 (offset once a place is picked), 131 (no signs on the circle), 145 (20 USD a
  day), 146 (60 a minute on the horizon preview), 89 (the ledger chip from stored claims). Their `// MB-NN
  provisional` tags go in the next round that touches those files.
- Kept: MB-151 (staging keeps signed-out writes for the GitHub lab campaigns), 174 (`@vercel/functions` stays now
  that `edge: true` holds), 176 (undici in orval's dev tree, through Dependabot within the 7-day rule).
- MB-127, 141, 175 merge into one list of R11, R12 and R14 words for the Owner to read on staging. They ship as
  written unless he changes one.
- MB-164: QA-02's method (preinstalled Chromium by `executablePath`, the proxy CA pinned by SPKI for that browser
  alone, Nominatim and timeapi.io stubbed) is written into `.claude/agents/qa.md`. Certificate checks stay on.
- MB-187: one line in `/round`: push once per group and once per fix (Vercel's 100 deployments a day).

### Lane 2. Launch fixes (22 rows, the cleanup round)
Each is a proper fix, confirmed still true on 30b45b6 (file and line in the session's reads):
1. MB-177: a brass focus outline on every wheel house and planet stop (`NatalWheel.tsx` drops
   `focus-visible:outline-none`), and "Skip past the chart wheel" before the svg.
2. MB-183: when Clerk has not loaded after 8 s, `/claim` renders the public invite preview and the line "Sign-in
   couldn't load. A content blocker may be stopping it." with Try again. `RequireAuth`, `/sign-in` and the three
   admin pages show the same line.
3. MB-184: the waitlist's bad-email path focuses the field. `.wl-fld input:focus` gets a 2 px outline.
4. MB-180: /method step 1 adds "Chiron, which astronomy-engine doesn't cover, comes from NASA JPL Horizons
   positions.", through `/ux-copy`.
5. MB-181: the "Elements · …" readout line leaves home and /method (`site/lib/readouts.ts:96`). Nothing else:
   no tie wording, no `leaders.ts` work, BalanceRail as it is (the Owner: "just remove that line").
6. MB-138: the tab title and the saved PDF say Personal Report. `page-title.ts` drops "Natal" and "Synastry".
7. MB-140: each bundle's line shows in `BundleList`, so the JSON-LD describes visible text.
8. MB-178: every printed time goes through `clockWords` with `useEntryFormat` (`plateAnswer`, `summaryLine`,
   `hudLines`, `clockLine`, the method card).
9. MB-179: the place card prints the offset on the birth date once one is typed (`offsetOn(zone, ymd)`).
10. MB-185: `readDate` reads "4 May 1929" and "May 4 1929".
11. MB-173: on a 12-hour clock the time field keeps focus after four digits until AM or PM is set.
12. MB-170: a birth-time change passes the newest complete report only, and older ones are marked to offer
    Regenerate. The 429 that names "6 reports" no longer fires for this case.
13. MB-137: a failed People row and its quick look offer Try again (`POST /reports/:id/regenerate`, free).
14. MB-169: regenerate is allowed to the holder after a hand-over. The report says `canRegenerate`, and Try
    again shows only when it is true.
15. MB-139: the quick look shows the Moon's range for an approximate birth time (`Spot.band`, codegen).
16. MB-171: TriadPlate passes a plate-sized step to the hero layout, so the Sun stays on the plate.
17. MB-136: nudge rows 1 to 3 and `sd.nudge.seen` are removed, including from the privacy list.
18. MB-182: `scripts/src/refresh-sample.ts` writes a passing Release's Audrey Hepburn run as /sample's data (no
    foundation, no usage), updates the import, the test hash and the claims pick (ADR-110, 223).
19. MB-123: bootstrap step 2 captures push's output and exits 1 on an error line, like step 7.
20. MB-133: the release lab's estimates come from `models.ts` (about $0.35 a release, not $1.95).
21. MB-154: the origin rule matches this team's preview form only, and a test refuses `starsdecoded-evil.vercel.app`.
22. MB-172: the 43 unused `web/src/components/ui/` files and the 28 dev libraries only they import are removed.

### Lane 3. Sharing, kept honest (5 rows, the cleanup round)
The home page says "Share reports with each other. Share yours, read theirs" (`YourPeople.tsx:90`). The API refuses
your own chart (`invites.ts:330`, 409 `own_chart`), and nothing puts a person on someone else's circle.
1. MB-104: "Share my report" on your own quick look, shown when your Personal report is finished. A sheet takes an
   email and names what goes: "Sam reads your report and sees you in their circle. Your birth date, time and place
   go with it. You can stop sharing any time." The link uses the send-and-claim path (sign in with that address).
   The claim writes a grant, so the recipient reads the whole Personal report (Q1) and you sit on their circle
   marked "shared". After the claim they see "Share yours back", one tap and optional. Stop sharing revokes the
   grant at once. A new access kind `shared` sits in `accessFor`, `canReadProfile`, `natalRowsOf` and `seatsOf`.
2. MB-103: "Not me" hands the report back (Q2). The confirmation offers only Hand it back and Cancel; "Keep it
   as someone else's chart" is gone (the Owner: "it doesn't need to be there"). The claim ends, participant grants
   for that profile return to the owner, and the giver's row reads "Handed back" with Send again.
3. MB-109: a waiting send or gift offers Change address. The old token is revoked and a new one goes to the new
   address in one transaction. A gift keeps its held credit and return date.
4. MB-110: workbook ticks and pins are stored per reader (`report_workbooks`), backfilled to each report's writer,
   so a shared report's ticks stay its reader's own.
5. MB-135: Stop sharing's lines name the person ("June's Personal report") when the chart is not the reader's own.

### Lane 4. One brain pass (6 rows, the cleanup round)
1. MB-152: `maskNames` in `prompts/data.ts` turns typed names into A, B or a data block in model text sent back
   on retries and repairs (`retryTail`, PROSE AS WRITTEN, chapter 07's tail, the foundation JSON). Built whether or
   not a spot run obeys an injection, because the sentinel found the path (S8).
2. MB-142: two staging reports are read first. If sections fall under their bands, each prompt states its floor,
   and a spot run measures it. A section still short on Luna moves alone to Sol (MB-129's rule).
3. MB-132, 143: the natal prompts carry the room rule, idioms included ("time" or "space" instead).
4. MB-92: the model sentence in `system.ts` loses its "X first, Y second" shape, and the vocabulary is read as
   doctrine, not as sentences to repeat.
5. MB-87: each `HOUSE.short` in `vocabulary.ts` opens with the page's word for that house (ADR-98).

### Lane 5. The Owner's, ten minutes (2 rows; he is doing them, 2026-10-03)
- MB-102: Search Console domain property with its TXT record in Vercel DNS, Bing imported from it, and Vercel's
  AI-bot rule on Log. The sitemap is submitted at launch.
- MB-186: `*.clerk.accounts.dev` and `starsdecoded-staging.up.railway.app` added under the environment's Network
  access (Custom, package-manager defaults kept). Without it, the Release view's QA agent covers those personas.

### Order (Q3, the Owner 2026-10-03)
- Clean up first: lanes 2, 3 and 4 are the next round (R15), then Timeline (ADR-205 to 217).
- Pricing and checkout are not planned and not slotted between rounds until the Owner says to start them ("don't
  try to keep adding it in between"). `docs/rounds/R15-plan.md` (the pricing plan) is renamed to its number then.

## Out of scope
- Rows held elsewhere (listed above), MB-93 (a sample pair run) and MB-94 (our own place index).
- Pricing, checkout, offers and their dates (MB-111, 113 to 120, 149): until the Owner starts pricing.
- A share image for a Personal report (the other use of "MB-104" in `review-01-10.md:132`).
- Sharing a pair report by its maker: unchanged (ADR-133).

## Acceptance criteria
1. Lane 1's rows are decided or done in the Mailbox, each built-at-default row linked to its Decisions row.
2. Every lane 2 row has a test or an e2e step that failed before the fix. The wheel shows a visible focus on all 25
   stops at 1440 px, and `/claim?token=bogus` shows its 404 with Clerk blocked.
3. A signed-in reader can share their own finished Personal report. After the claim, the recipient reads it and
   sees the sharer on their circle. Stop sharing ends both at once, and a scratch-Postgres walk covers the grant,
   the revoke and a pair that closes with it.
4. "Not me" ends the claim, and the giver sees "Handed back". Change address revokes the old link.
5. A recipient's ticks never show in the sharer's workbook, and the reverse holds too.
6. The brain pass passes the dry lab and the release lab against r06, with no new fault. The inject-instruction
   spot runs on a natal and a pair report and obeys nothing.
7. No secret goes on GitHub. Nothing reaches production outside a Release.

## Screens
Artifact https://claude.ai/artifact/1f8CkTF3ET9wGxVkce3YRf: the five lanes; your quick look with Share my report;
the share sheet; the recipient's circle with "Share yours back"; Q1's two options; Not me's handback; the rows with
Change address; Stop sharing in the third person; the wheel's focus, the Clerk line, the waitlist error and the
tie line before and after; the round order.

## Open questions
None. Answered 2026-10-03: Q1 the whole Personal report; Q2 hand it back, with Cancel as the only other choice;
Q3 cleanup, then Timeline, pricing when the Owner says. MB-102 and MB-186 are the Owner's, in hand.

## Decisions to record
- Lane 1's seven built-at-default rows decided as built (MB-89, 128, 129, 130, 131, 145, 146).
- MB-151, 174, 176 kept as they are. MB-127, 141, 175 ship as written.
- QA in a cloud session uses the pinned-certificate browser method, written into `qa.md` (MB-164).
- One push per group and per fix (MB-187).
- Sharing your own report: a grant through send-and-claim, the whole Personal report, "Share yours back"
  (MB-104, Q1).
- "Not me" hands the report back; its confirmation is Hand it back or Cancel (MB-103, Q2, amending ADR-139's
  'Not me' as locked). Change address on a waiting send or gift (MB-109). Stop sharing in the third person (MB-135).
- The Elements readout line leaves home and /method (MB-181).
- Workbooks per reader (MB-110). Name masking in returned model text, built regardless of spot results (MB-152).
- Round order: the cleanup round (lanes 2 to 4) next, then Timeline; pricing and checkout only when the Owner
  starts them (Q3).

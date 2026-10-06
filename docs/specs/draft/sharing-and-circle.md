# Sharing and your circle — draft

Status: draft, fifth pass, 2026-10-06, from the Owner's staging walk after R17. Artifact:
https://claude.ai/artifact/3NgoY1o1CG4wk38WKwtc41 (version 5). The Compatibility loading screen
is its own draft, `compatibility-loading-story.md`.

## Why

The Owner, testing staging: sharing your own report opens a side panel, sharing someone's report
a pop-up; neither says who can read it. A Compatibility row doesn't say whether its other person
can read it and shows Share story where it doesn't belong. The circle doesn't show pairs. Making
a Compatibility report is hidden under a tab. The credits card has no way to make a report. He
wants the loop from your own report to a Compatibility report "simple, intuitive, easy to
understand", guided step by step, and tested as part of the critical journey.

The dashboard that showed two reports until a press is a bug, fixed outside this spec (commit
`2946659`, `web/src/App.tsx`: the dashboard and report pages wait for Clerk's fresh token).

## Scope

1. **One Share window.** One component replaces `ShareMySheet` (right drawer) and `SendDialog`:
   a centred dialog on desktop, a bottom sheet on a phone. Adapted from the reference dialog the
   Owner sent (`share-file-dialog.tsx`, shadcn, framer-motion and lucide-react already in `web`):
   a token email field (several addresses, chips, a bad address marked in place), Share, then
   "Who can read it" with each person's state (Owner, Can read it, Invited) and a ⋯ menu (Copy
   their link and Cancel invite, or Remove access, which opens today's Stop sharing dialog,
   ADR-182, 238), a footer count ("1 person can read it · 1 invited") and Done. Dropped from the
   reference: roles and "Anyone with the link". Every report uses it: your own (any email,
   ADR-235), someone's you made (that person only, ADR-181), a pair (its other person, MB-82).
2. **Your first steps.** A card in the dashboard's idle panel, kept until the first Compatibility
   report is made, with Hide; it replaces `PathSheet`'s one-time sheet. A progress bar, one button
   at a time: 1 Your Personal report · 2 Add someone, which opens today's `AddSomeoneSheet`
   unchanged (Someone you know → birth form → loading screen; Gift a report → `GiftFlow`) · 3
   Share it with {name} (a gift: done once sent, nothing waits) · 4 either You & {name}, your
   Compatibility report (for a gift, once they share back), or Add someone else, back to step 2.
3. **Sharing around a gift.** `GiftFlow` gains a step after the note: "Share your report with
   {name} too?" Yes or Not now, nothing pre-picked; Yes writes a grant of the giver's own report
   when the gift is claimed. The claim page then asks the recipient "Share your report with
   {giver} when it's ready?" (or, when the giver shared, "Share yours back?", ADR-235's words);
   Yes writes their grant once their report is finished; Not now leaves the offer on their quick
   look of the giver. Once both can read each other's report, either can make the pair.
4. **Make a report.** The idle card gets two buttons: "Your Personal report" (main) until the
   reader has one, then "Personal report · For someone", and Compatibility. Compatibility, and
   "Two people together" in `AddSomeoneSheet`, show only when the reader can read two finished
   Personal reports (their own and one more, made or shared).
5. **The quick look keeps everything it shows today** (name, birth date, `TriadRow`, the With you
   block and `PairBlock`); only its buttons change: two main actions of one width and height, Make You & {name} · 1 credit
   (or Open Compatibility report) and Open {name}'s report; then a line on what they can read with
   a small text Share, which opens the Share window. Share story goes.
6. **The picker as a pop-up.** `CompatibilityPicker` opens in a dialog or sheet from the card,
   the tab's "+ New Compatibility report" or a quick look (both people picked). Make it opens
   `/compatibility/:id` on its loading screen (`openOnCreate`), changing ADR-131's reading 6.
7. **Compatibility rows.** One state chip each (Only you can read it · {name} can read it ·
   Waiting for {name} · Shared by {name}); ⋯ holds Share and Delete report; no buttons on the row.
8. **No stories on the dashboard.** Remove Share story from rows and the quick look, and the
   Stories section. The Compatibility report's story card moves to the end of the report.
9. **Pairs on the circle.** The violet ring marks anyone in a Compatibility report the reader can
   open; the legend names it.
10. **You once.** When birth details typed in the birth form match the reader's own chart, it
    says "These are your own birth details" and offers their report.
11. **One source.** `GET /home` carries, per person, what they can read of the reader's and its
    state, and per pair its share state, plus the first-steps state. `openapi.yaml` first.
12. **The walk.** The buyer walk (`api/src/walk/steps.ts`) gains share back at the gift claim and
    the picker opening the report; both roads to step 4 stay in the critical tier (ADR-273).

## Out of scope

- Link sharing ("anyone with the link"), roles, a story card on the Personal report.
- Who may receive a pair stays MB-82; the Owner's "Alexandra" duplicate is account data, not code.
- The Compatibility loading screen (its own draft).

## Acceptance criteria

- At 390 px the Share window is a bottom sheet; at 1440 px a centred dialog; Escape closes, focus
  stays inside; pasting "a@x.com, b@y.com" makes two chips; a bad address is marked, not sent.
- Sharing your own report and someone's report open the same window; no right-side drawer remains.
- After Share the new person is at the top marked Invited; Cancel invite and Remove access take
  them off the list without a reload; states come from `GET /home`.
- A new buyer sees Your first steps at 0 of 4; step 2 opens the Add someone sheet; each finished
  step ticks without a reload; both roads reach step 4's either/or; Add someone else returns to
  step 2; the card goes after the first pair.
- The quick look's header, date, triad and pair block render exactly as before; only buttons differ.
- The gift flow asks about sharing the giver's report; the claim asks about sharing back; each Yes
  is a grant, each Not now shares nothing; with both, either side can open the picker for the pair.
- "Two people together" and Compatibility are absent until two Personal reports are readable.
- Equal actions share width and height; Share is a text button (`/web-taste`).
- Make it in the picker opens the report's loading screen.
- No "Share story" anywhere on the dashboard; one state chip per Compatibility row.
- The buyer walk passes with the new steps; words pass `/ux-copy`.

## Screens

Your first steps (four states) and the flow on both sides · A the circle and idle card · B a
quick look · C the Share window (phone and laptop, live) · D the Compatibility tab · E the picker
pop-up · F you twice on the circle. All in the artifact.

## Evidence (verified 2026-10-06, all supported)

Apple HIG Sheets (a scoped task; half height on iPhone; centred over a dimmed page on iPad);
Material side sheet ("not recommended for narrow screens"); Apple HIG Collaboration and sharing
(people first, one plain line on access; remove one person; pending and accepted apart); MDN
`navigator.share()` (only from a tap). Dropped: browser-version claims.

## Open questions

1. Ship the sign-in fix to staging now, on its own? Recommended yes. Default: with the next round.
2. ~~Gifting and sharing~~: answered by the Owner, option B (2026-10-06).
3. Your first steps stays until step 4, with Hide, replacing the one-time sheet? Recommended yes.
   Default: yes.

## Decisions to record

- D1 · One Share window for every report, centred dialog on desktop, bottom sheet on a phone,
  built on the Owner's reference dialog without roles or link access (Claude, from the Owner).
- D2 · Your first steps: a card with a progress bar; step 2 opens the Add someone sheet; step 4 is
  You & {name} or Add someone else, looping to step 2; until the first pair (Q3, Owner).
- D3 · Around a gift, each side is asked once about their own report, Yes or Not now; when the
  giver shared, the claim reads "{giver} shared their report with you. Share yours back?" (Owner,
  option B; amends ADR-139 only by each person's own yes).
- D13 · Compatibility and Two people together need two readable Personal reports (Owner).
- D14 · Buttons by weight: equal actions share width and height, a secondary one is a small text
  button (Owner, now in `/web-taste`).
- D4 · The idle card's Make a report: Your Personal report until you have one, then For someone.
- D5 · The quick look stays as it is; only its buttons change (Owner).
- D6 · The picker as a pop-up; Make it opens the loading screen (amends ADR-131 reading 6).
- D7 · Compatibility rows: one state chip, ⋯ for Share and Delete.
- D8 · No stories on the dashboard; the pair's story card at the end of its report (Owner).
- D9 · The violet ring marks anyone in a pair you can open (Claude).
- D10 · The birth form warns on your own birth details (Claude).
- D11 · `GET /home` carries share and first-steps state (Claude).
- D12 · Both roads to the first pair and share back join the buyer walk (Owner).

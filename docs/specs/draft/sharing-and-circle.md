# Sharing and your circle — draft

Status: draft, 2026-10-06, from the Owner's staging walk after R17. Artifact:
https://claude.ai/artifact/3NgoY1o1CG4wk38WKwtc41

## Why

The Owner, testing staging: sharing doesn't say who you share with; the side panel is unclear; a
Compatibility row doesn't say whether its other person can read it, and shows Share story where it
doesn't belong; the circle doesn't show who you have a Compatibility report with; making one is
hidden under a tab; the credits card says "1 credit = 1 report" with no way to make one. He wants
the loop of making and sharing reports "simple, intuitive, easy to understand".

The dashboard that showed two reports until a press is a bug, fixed outside this spec (commit
`2946659`, `web/src/App.tsx`: the dashboard and report pages wait for Clerk's fresh token).

## Scope

1. **One Share window.** One component replaces `ShareMySheet` (right drawer) and `SendDialog`
   for sharing. A centred dialog on desktop, a bottom sheet with a grabber on a phone, resting at
   half height with the people list in view. Escape and swipe-down close it; one Done button.
   Three subjects, one layout: your own Personal report (any email, ADR-235), someone's report you
   made ("Give it to {name}", ADR-181), a Compatibility report (its other person only, MB-82).
2. **Who can read it, first.** The window opens on "Only the people below can read it." and the
   list: You (Owner / Made it), then each person with one state: Can read it, Invite sent · not
   opened yet, Not shared yet, Handed back. Remove on each person opens today's Stop sharing
   dialog (ADR-182, 238). Add someone (email + Share) only where the subject allows more people.
   After Share: "We emailed {name} a link", then "Send the link…" (`navigator.share`, from the
   tap, when `canShare` says yes) and Copy link (always).
3. **Stories move inside Share.** "Post as a story" is the window's last line and an item in the
   row's ⋯ menu; it opens today's `StoryPreview`. Rows lose Share story. The dashboard's Share
   section (`Stories.tsx`) stays.
4. **Compatibility rows.** Each row shows one state chip: Only you can read it · {name} can read
   it · Waiting for {name} · Shared by {name}. No buttons on the row; ⋯ holds Share…, Post as a
   story, Delete report. The tab opens with "+ New Compatibility report", which opens
   `CompatibilityPicker` in the same dialog or sheet.
5. **Pairs on the circle.** The violet ring marks anyone in any Compatibility report the reader
   can open (today: pairs with the reader only). Tapping lights the partners, as today. A one-line
   legend under the circle: violet ring, teal mark, Add someone.
6. **The quick look.** Two short lists replace its button stack. *Reports*: {name}'s report,
   each pair with them (Open), and "You & {name}" with Make it · 1 credit when missing and both
   Personal reports are finished (picker preselected). *What {name} can read*: their report (Only
   you can read it / Given to them) and your report (Can't read it / Can read it), each with its
   Share or Give button into the Share window. Your own quick look keeps chapter 08 and lists
   who can read your report.
7. **The idle card.** Under "Tap someone for a quick look": *Make a report* with two buttons,
   For someone (Add someone) and Compatibility (the picker), then the credits line and Get more.
8. **One source.** `GET /home` adds per person what they can read of the reader's (own report,
   their report, pairs) with its state, and per pair its share state, so the circle, quick look,
   rows and Share window read one place. `openapi.yaml` first, then codegen.

## Out of scope

- Who may receive a pair: today's rule stands unless the Owner answers question 3 otherwise.
- Gift placement (credit loop): Gift isn't sharing.
- Link sharing ("anyone with the link"): every share stays a grant to one person.
- Story image content and the Share section at the bottom of the dashboard.

## Acceptance criteria

- At 390 px the Share window is a bottom sheet with a grabber, swipe-down and Done; at 1440 px a
  centred dialog on a dimmed page; Escape closes, focus stays inside, keyboard reaches every row.
- Each of the three subjects opens the same window; its first block is the people list with the
  states above, taken from `GET /home`, never inferred in the browser.
- Remove opens the Stop sharing dialog; after it, the person's row is gone without a reload.
- "Send the link…" appears only when `navigator.canShare` returns true; Copy link always.
- No Compatibility row shows a button besides ⋯; each shows exactly one state chip.
- A pair the reader didn't make with themselves reads "Only you can read it" and the window says
  "A Compatibility report can only go to someone in it, and you're not in this one."
- Everyone in a pair the reader can open has the violet ring; the legend names it.
- From the idle card, Compatibility opens the picker in one tap; from a quick look, Make it opens
  the picker with both people chosen.
- The buyer walk passes; words pass `/ux-copy` (simple words).

## Screens

A · the circle with the idle card · B · a quick look (Mamca) · C · Share your report (phone, two
states) · D · Share a Compatibility report (desktop, in and not in the pair) · E · the
Compatibility tab before and after. All in the artifact.

## Evidence (verified 2026-10-06, all supported)

- Apple HIG Sheets: a sheet is for "a scoped task that's closely related to their current
  context"; on iPhone "a share sheet displays the most relevant items within the medium detent";
  on iPad a centred sheet "on top of a dimmed background view".
- Material side sheet: "Coplanar side sheets are not recommended for narrow screens."
- Apple HIG Collaboration and sharing: collaborators listed on top, management below; "Write
  succinct phrases that summarize the sharing permissions". UICloudSharingController: "Remove
  access from one or more participants"; CloudKit participant status: pending, accepted, removed.
- Apple HIG Activity views: "Avoid creating duplicate versions of common actions".
- MDN `navigator.share()`: must come from "a UI event like a button click".
Dropped: browser-version claims (unsupported on re-fetch).

## Open questions

1. Ship the dashboard fix to staging now, on its own? Recommended yes. Default: with the next round.
2. "Post as a story": last line of the Share window and in ⋯? Recommended yes. Default: yes.
3. A pair you made but aren't in: keep "only you" (R-3.6)? Recommended keep, with the line.
   Default: keep.

## Decisions to record

- D1 · One Share window for every report: centred dialog on desktop, bottom sheet on a phone;
  the side panel goes (Decided by Claude, from the Owner's "a pop-up" and the evidence).
- D2 · The Share window opens on who can read it, each person with one state and Remove.
- D3 · "Post as a story" moves into the Share window and ⋯; rows lose Share story (Q2).
- D4 · Compatibility rows show one state chip; ⋯ holds Share, story, Delete; the tab opens with
  New Compatibility report.
- D5 · The violet ring marks anyone in a Compatibility report the reader can open (Claude).
- D6 · The quick look lists Reports and What {name} can read; Make it when the pair is missing.
- D7 · The idle card gets For someone and Compatibility buttons.
- D8 · `GET /home` carries share state per person and per pair (Claude).
- D9 · Pairs go only to someone in them, said in one line (Q3).

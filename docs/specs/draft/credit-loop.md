# The credit loop

Ideation 2026-09-26 with the Owner. Status: draft, nothing built.
Artifact: https://claude.ai/artifact/UST4kga6e2KJZ4M1w78fZ7
Builds on the two gift modes (ADR-38), `dashboard-sky` (ADR-89 to 96 and its
MB-81 to 86 amendment) and one credit per report (ADR-42). Prices and
checkout stay with MB-5 and MB-6.

Credits are the moment the buyer's path is clearest, and the dashboard is
where the orbit grows. Every unspent credit is an open seat on the orbit;
filling a seat grows the sky, and each report that lands leaves one obvious
next step. A person who receives a report starts an orbit of their own with
the giver already in it.

## Scope

### Two verbs, never mixed (replaces "Share with" and "Invite {name}")

- **Send to {name}**, on a person's card, only for a finished report the
  reader made: ADR-38's first mode. An email and a link; the recipient signs
  in with that email and the report is theirs by default ("This is me" ticked,
  "Not me" undoes, Delete, "Stop {giver} seeing it"). On claim they are asked
  whether the birth time is right: the horizon pass, free once (ADR-35/38).
  Costs nothing; the credit was spent when the report was made. A pair is sent
  the same way, only by one of its two people (MB-82).
- **Gift a report**, only on the credits surfaces (a seat, the credits sheet):
  ADR-38's second mode. First name, email, an optional note. One credit is
  held; unclaimed after 30 days it returns. The recipient enters their own
  birth data as "this chart is for me" (the three-way time control). When it
  is written they join the giver's orbit and the giver joins theirs.
- "Invite {name}" on a person with no report goes away: a person without a
  report exists only as a gift on its way.

### Credits you can see: open seats

- Every unspent credit is a dashed open seat on the orbit, among the people
  (indigo dashed ring, "+", "OPEN SEAT"). A gift waiting is a seat with the
  name, a brass dashed ring turning slowly, "{NAME} · GIFT SENT".
- Tapping a seat opens "Who goes here? · 1 credit" with three choices:
  **Someone you know** (the birth form; send it when written), **Gift it**
  (the gift form), **Two people together** (the picker). "Or leave it open.
  Seats never expire."
- Tapping a gift seat: when it was sent, the date its credit comes back,
  **Send a reminder**, **Take it back** (the credit returns at once).
- The credit pill (ADR-95) opens the credits sheet: open seats, a meter of
  seats filled, **Gift a report**, the bundles as counts (1, 3, 5; ADR-42)
  and **Get credits**.
- No seats and no credits: the orbit shows the ADR-96 Get credits point.

### The path after buying

- After a bundle of 3 or more, one skippable sheet lays the bundle out as
  steps, filled from what the reader already has (question 3):
  - 3 credits: your own chart (ticked when written, freeing the credit),
    someone close (add or gift), the two of you.
  - 5 credits: your own chart, two people close, two pairs.
- A meter counts seats filled. Each step's button opens its flow; a step that
  needs an earlier one waits with its reason ("After step 2").
- "Or skip: the seats wait on your orbit." Any seat can go to any choice.

### The nudges

One at a time, inside the card it belongs to, never over the sky:

| When | Line | Action |
|---|---|---|
| A person's report just finished | "{name} is in your orbit" · "Read the two of you · 1 credit" | Generate |
| A report you made is finished | "It is about {name}" · "Send it to her; it becomes hers." | Send to {name} |
| Your pair just finished | "You and {name}" · "Send it to them too." | Send to {name} |
| No seats left | "Your orbit has room for more" · "Credits come in 1, 3 and 5." | Get credits |

### What it never does

No timers, streaks, countdowns or fake scarcity; credits never expire. No
badges or points: the orbit is the reward. One nudge at a time. Nobody joins
an orbit without an email in the giver's name, and anyone can leave one.

### Data

- Credits: the ledger already counts; a gift holds one (`invite_tokens` gains
  a kind and a credit id, MB-83), released on claim to the recipient, back to
  the giver on expiry or Take it back. Behind `// MB-6 provisional` until
  checkout exists; until then the soft pass keeps writing.
- Orbit membership both ways on a gift claim; `claimed_as_self` on a send
  claim (MB-81). Contract and schema changes through `openapi.yaml` and an
  idempotent bootstrap script.

## Out of scope

- Prices, checkout, gift cards sold to people without an account (MB-5, MB-6).
- A thank-you credit for the giver when a recipient buys (question 2).
- Badges, levels, leaderboards, streaks; push notifications or marketing email
  beyond the send, gift and reminder emails.

## Acceptance criteria

1. The dashboard never shows "Share with" or "Invite {name}": a finished
   report the reader made offers Send to {name}; Gift a report appears only
   on seats and the credits sheet.
2. A sent report lands on the recipient's dashboard as theirs ("This is me"
   ticked) with Not me, Delete and Stop {giver} seeing it; the time question
   comes first; the giver keeps reading until stopped (route tests, MB-84).
3. The orbit shows one open seat per unspent credit, a named turning seat per
   waiting gift, and the Get credits point only at zero.
4. Tapping a seat offers exactly the three choices, each opening its flow with
   the credit named; a gift holds one credit, Take it back and expiry return
   it, a claim moves it (ledger tests).
5. A gift recipient enters their own birth data as "this chart is for me";
   once written, each is on the other's orbit.
6. After a bundle of 3 or 5 the path sheet appears once, reflects what exists,
   and can be skipped; a single credit goes straight to its seat.
7. At most one nudge shows per card, per the table.
8. No timer, streak, badge or expiry anywhere; reduced motion stops the seat
   rings.
9. Typecheck, both builds, unit tests, `db:bootstrap` clean twice; no lab.

## Screens

All in the artifact: the two verbs side by side; the live orbit with seats
(3, 1, none), the seat sheet, the gift seat, the credits sheet; the path after
buying 3 and 5; Send to Mom in four steps; Gift to Pierre in four steps; the
loop and the four nudges.

## Open questions

1. **Can the giver read a gifted report?** It puts the recipient on the
   giver's orbit and lets them read the two together. Recommend: yes by
   default, a switch for the recipient on sign-in. Default: that.
2. **A thank-you credit when a recipient buys?** It closes the loop for the
   giver but is a price decision. Recommend: design for it, decide with MB-5.
   Default: not in V1, raised as a Mailbox row.
3. **Show the path after every purchase?** Recommend: every bundle of 3 or
   more, filled from what exists; a single credit goes to its seat. Default:
   that.

## Decisions to record

1. **Two verbs.** Send to {name} for a finished report (ADR-38 mode one,
   theirs by default); Gift a report for a credit (mode two), only on credits
   surfaces. "Share with" and "Invite {name}" leave the dashboard.
2. **Every unspent credit is an open seat** on the orbit; a waiting gift is a
   named seat; seats never expire.
3. **A seat offers three choices:** someone you know, gift it, two people
   together.
4. **A gift holds a credit** for 30 days: claimed it moves, unclaimed or taken
   back it returns (behind the MB-6 seam until payments).
5. **A gift claim joins both orbits.**
6. **The path after buying** a bundle of 3 or more: one skippable sheet of
   steps with a seat meter.
7. **Nudges:** one at a time, inside their card, per the table.
8. **No dark patterns:** no timers, streaks, badges or expiry; nobody joins an
   orbit without an email in the giver's name.

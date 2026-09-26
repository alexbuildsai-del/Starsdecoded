# The credit loop

Ideation 2026-09-26 with the Owner. Status: draft 2, nothing built.
Artifact: https://claude.ai/artifact/UST4kga6e2KJZ4M1w78fZ7
Builds on the two gift modes (ADR-38), `dashboard-sky` (ADR-89 to 96 and its
MB-81 to 86 amendment) and one credit per report (ADR-42). Prices and
checkout stay with MB-5 and MB-6.

Credits are the moment the buyer's path is clearest, and the dashboard is
where the orbit grows. The orbit holds only real people (reports the reader
had written and reports shared with them) plus one Add someone point; credits
live in the pill, always in sight. Each report that lands leaves one obvious
next step, and a person who receives a report starts an orbit of their own
with the giver in it. Names in examples are examples: the product never
assumes how two people are related.

## Scope

### Two verbs, never mixed (replaces "Share with" and "Invite {name}")

- **Send to {name}**, on a person's card, only for a finished report the
  reader made: ADR-38's first mode. An email and a link; the recipient signs
  in with that email and the report is theirs by default ("This is me" ticked,
  "Not me" undoes, Delete, "Stop sharing with {giver}"). On claim they are asked
  whether the birth time is right: the horizon pass, free once (ADR-38).
  Costs nothing; the credit was spent when the report was made. A pair is sent
  the same way, only by one of its two people (MB-82).
- **Gift a report**, only from Add someone or the credits sheet: ADR-38's
  second mode. First name, email, a note. The gift arrives as a designed
  cover (starfield, the mark, "A gift from {giver}", "Your Personal natal
  report, for {name}", the note), shown to the giver as "How it arrives"
  before sending and set at the top of the email. One credit is held;
  unclaimed after 30 days it returns. The recipient's birth form ends with
  the existing "This is my natal chart" box, ticked for a gift; unticked, it
  asks "Whose chart is it?" (a free name). When it is written they appear on
  the giver's orbit and the giver on theirs.
- **Emails never say "made".** Send: "Your Personal natal report is ready":
  "{giver} had it written for you". Gift: "{giver} gave you a Personal natal
  report", button "Claim my report".
- "Invite {name}" on a person with no report goes away: a person without a
  report exists only as a gift on its way.

### Credits you can see

- **The orbit holds people only**: reports the reader had written, reports
  shared with them, a gift still waiting, and one **Add someone** point
  (ADR-96). No seat per credit: a credit does not assume who it is for.
- **A waiting gift** is its own colour (teal `#3FA796`, dashed ring, an
  envelope) labelled "{NAME} · GIFT WAITING"; claimed and written, it becomes
  an ordinary person. Tap: when it was sent, the date its credit returns,
  **Send a reminder**, **Take it back**.
- **Add someone** with credits: "Who is it for? · 1 of your N credits" with
  **Someone you know** (the birth form, then Send), **Gift a report**, **Two
  people together** (the picker). With none: the credits sheet.
- **The credits sheet** (the pill, ADR-95): "N credits to use", a meter that
  lights the credits still to use and dims the ones used ("3 to use · 2
  used"), Add someone and Gift a report, the bundles as counts (1 "One
  report", 3 "Someone and the two of you", 5 "Your people and how you fit";
  ADR-42), Get credits.

### The path after buying

- After a bundle of 3 or more, one skippable sheet lays the bundle out as
  steps, filled from what the reader already has (question 3):
  - 3 credits: your own chart (ticked when written, freeing the credit),
    someone close to you (add or gift), the two of you.
  - 5 credits, "Your people, then how you fit": your own chart, two people
    close to you, two compatibility reports (you and each of them).
- The meter lights the credits still to use. Each step's button opens its
  flow; a step that needs an earlier one waits with its reason.
- "Or skip; nothing expires." Any credit can go to any report.

### The nudges

One at a time, inside the card it belongs to, never over the sky:

| When | Line | Action |
|---|---|---|
| A person's report just finished | "{name} is in your orbit" · "Read the two of you · 1 credit" | Generate |
| A report you had written is finished | "It is about {name}" · "Send it to them; it becomes theirs." | Send to {name} |
| Your compatibility report just finished | "You and {name}" · "Send it to them if you want them to read it." | Send to {name} |
| No credits left | "Your orbit has room for more" · "Credits come in 1, 3 and 5." | Get credits |

### Who sees what

Nobody sees the reader's orbit. Someone sent to sees their own report and the
reader; someone gifted sees the report they wrote and the giver. A
compatibility report reaches the other person only when the reader chooses
Send on it. Anyone can Stop sharing, Not me or Delete at any time.

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
   from Add someone and the credits sheet.
2. A sent report lands on the recipient's dashboard as theirs ("This is me"
   ticked) with Not me, Delete and Stop {giver} seeing it; the time question
   comes first; the giver keeps reading until stopped (route tests, MB-84).
3. The orbit shows people, waiting gifts in teal and one Add someone point
   (Get credits at zero); never a point per credit.
4. Add someone offers exactly the three choices with the credit named; a gift
   holds one credit, Take it back and expiry return it, a claim moves it
   (ledger tests). The credits meter lights credits still to use.
5. A gift arrives as the cover, previewed to the giver before sending; the
   recipient's form ends with "This is my natal chart" ticked, and unticked
   asks whose chart it is; once written, each is on the other's orbit, and
   neither sees the other's people (route tests).
6. After a bundle of 3 or 5 the path sheet appears once, reflects what exists,
   and can be skipped; a single credit goes straight to Add someone.
7. At most one nudge shows per card, per the table.
8. No timer, streak, badge or expiry anywhere; reduced motion stops the gift
   rings.
9. Typecheck, both builds, unit tests, `db:bootstrap` clean twice; no lab.

## Screens

All in the artifact: the two verbs; the live orbit with Add someone, the
waiting gift and the credits sheet (3, 1, none); the path after buying 3 and
5; Send to Beatrice and Gift to Pierre in four steps each, with the cover;
who sees what; the loop and the four nudges.

## Open questions

1. **Can the giver read a gifted report?** It puts the recipient on the
   giver's orbit and lets them read the two together. Recommend: yes by
   default, a switch for the recipient on sign-in. Default: that.
2. **A thank-you credit when a recipient buys?** It closes the loop for the
   giver but is a price decision. Recommend: design for it, decide with MB-5.
   Default: not in V1, raised as a Mailbox row.
3. **Show the path after every purchase?** Recommend: every bundle of 3 or
   more, filled from what exists; a single credit goes to Add someone. Default:
   that.

## Decisions to record

1. **Two verbs.** Send to {name} for a finished report (ADR-38 mode one,
   theirs by default); Gift a report for a credit (mode two), only on credits
   surfaces. "Share with" and "Invite {name}" leave the dashboard.
2. **The orbit holds people only**, a waiting gift in teal and one Add
   someone point; credits live in the pill and its sheet, whose meter lights
   what is left to use. Credits never expire.
3. **Add someone offers three choices:** someone you know, gift a report, two
   people together.
4. **A gift holds a credit** for 30 days: claimed it moves, unclaimed or taken
   back it returns (behind the MB-6 seam until payments).
5. **A gift claim joins both orbits**, and nobody sees another's people; a
   compatibility report reaches the other person only by Send.
9. **A gift arrives as a designed cover** previewed before sending; its form
   ends with "This is my natal chart". Emails never say "made".
6. **The path after buying** a bundle of 3 or more: one skippable sheet of
   steps with a credits meter.
7. **Nudges:** one at a time, inside their card, per the table.
8. **No dark patterns:** no timers, streaks, badges or expiry; nobody joins an
   orbit without an email in the giver's name.

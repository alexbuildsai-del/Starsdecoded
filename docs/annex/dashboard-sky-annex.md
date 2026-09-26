# Dashboard sky: annex

Detail moved out of `docs/specs/locked/dashboard-sky.md` to keep it in budget.

## Micro animations

- **Micro animations**, each under a second except the float: points pop onto
  the orbit 70 ms apart on first load; the glow behind the name breathes every
  5 s (the dashed no-report disc turns instead); hover lifts a point to 110%;
  selection pulses a ring out once and springs in partners' rings; a writing
  point's dashed ring turns; the card rises 10 px as it fades in, its element
  bars fill from the left and the renders settle into their houses; the phone
  sheet slides up on the report easing; buttons press to 97%. Reduced motion
  stops all of it.
- **Empty orbit.** With nobody else, one dashed "+" point on the orbit reads
  "ADD SOMEONE", or "GET CREDITS" at zero credits.

## Credits

- **Nav:** a credit pill on every dashboard view ("2 credits"; greyed "0
  credits"). At zero, "+ Add a Person" becomes **Get credits**.
- **Panel:** a credit row: "N credits left · Each report uses one" with Get
  more; at zero "No credits left" with Get credits (primary).
- **Every spend** (add a person, generate a pair, generate my chart) shows
  "1 credit" beside it; at zero it is disabled next to Get credits.
- **Get credits sheet:** bundles as counts (1, 3, 5; ADR-42), prices from
  MB-5, checkout from MB-6. Until payments exist the zero-credit states stay
  behind the `MB-6 provisional` seam and the soft pass keeps writing
  (question 2).

## Empty states

| State | Orbit | Panel / message | Actions |
|---|---|---|---|
| Only you, credits | "+ ADD SOMEONE" point | "No one in your sky yet. Add someone and they join your orbit." | + Add a person · 1 credit |
| Only you, zero credits | "+ GET CREDITS" point | "Adding someone uses a credit, and you have none left." | Add a person (disabled), Get credits |
| New account | dashed centre, add point | "Your chart comes first. It sits at the centre, and everyone you add orbits it." | Generate my chart · 1 credit |
| People, no own report | dashed centre, people | "Compatibility needs your own report. Their cards still open." | Generate my chart, or Get credits at zero |

## Sharing and inviting (MB-81 to 85, amendment 2026-09-26)

Renamed and extended by `docs/specs/locked/credit-loop.md` (2026-09-26): Share
with is Send to, Stop the giver seeing it is Stop sharing with {giver}, and
Invite {name} is Gift a report on the credits surfaces. The text below keeps
the access rules.

- **Share with {first name}** on a finished report made by the reader: on the
  natal report, the person's row and their card. Invites as they are (token,
  email, link, sign-in with that email, the birth-time question). On claim the
  report is theirs by default (`claimed_as_self`, "Not me" undoes; asked if they
  already have a self profile); they may delete it or remove the giver's
  access, and the giver reads it until then (R-3.5). Joined: "Joined ✓".
- **Share with {B}** for a pair, only when the reader is one of the two: the
  third button of the chapter 01 share block, the pair's row and card. Someone
  already joined gets participant access at once, not today's 409.
- **Invite {first name}** on a person with no report: they make their own as
  "this chart is for me". The gifted credit ships with payments (MB-5, MB-6).
- **Fixed with it:** the claimer's read and list checks accept
  `claimed_by_user_id` as `canReadProfile` does (MB-84); the pair email names
  the right person, the invite page shows a first name, the Terms say what a
  participant sees (MB-85). The pair row never shows the lens (ADR-93), unlike
  note 6's "· Partners".

Designs: Review 25 Sept artifact, note 6
(https://claude.ai/artifact/BejywNF3s6rEGEc4aRHTSD): the giver's rows (Share
with {name}, Invite {name}, Joined), the recipient's rows ("From {giver} ·
marked as yours", This is me ✓, "shared by {giver}"), the three flows.

# Chart fixtures

Each file holds **birth data only**. The chart itself is computed at run time by
`calculateNatalChart`, so a fixture can never drift from the ephemeris code.

Fields match the `calculateNatalChart` signature: `birthDate` (YYYY-MM-DD),
`birthTime` (HH:MM, local), `latitude`, `longitude`, `timezoneOffset` (hours east
of UTC, fractional allowed for pre-standard-time births), and optionally
`birthTimeWindowMinutes` (the band's half-width: 0 exact, 180 a part of the day,
720 unknown) and `timezone` (an IANA name, from which the offset in force at
birth is derived instead).

`marie-curie` and `oprah-winfrey` are two of the three charts the V2 prompt suite
was validated against, so their reports are the tone baseline. Their birth times
come from commonly cited sources rather than birth records; they are fixed inputs
for regression testing, not claims of accuracy.

`marie-curie-unknown` is the same birth with the time not recorded (window 720):
the blind report, and the input to the lab's `--pass` run, which adds 12:00 back
through the horizon pass and measures what changed.

`audrey-hepburn` has a birth-certificate time (Astro-Databank AA) and a zone
name, so the Belgian summer-time offset of 1929 is derived, not typed. It is
the model matrix's fifth chart and the candidate sample report for the landing page.

The remaining fixtures are synthetic and exist to pin specific structural cases:
unambiguous day and night charts for sect, and a high-latitude chart to catch any
future drift away from whole-sign houses.

`../pairs/` names two of these by fixture name and holds no birth data: the
compatibility lab runs one per lens.

The six `pairOnly` fixtures (`charles`, `william`, `george`, `charlotte`,
`beatrice`, `athena`) are published birth records of one family, kept for the
parent-and-child lens's four band runs in `../pairs/` and never run in the
natal campaign. A child's band is derived from the birth date at generation,
so each pair fixture notes the year it leaves its band; the lab prints the band
it computed. Nothing here is fabricated (R-3.1).

The three `injection` fixtures (`inject-instruction`, `inject-delimiter`,
`inject-markup`) are synthetic, and their name is the point: each is built to
escape the data block a typed name reaches the prompts in (ADR-202, security
scope 8). One is an instruction the name rule lets through (letters, spaces, one
dot), one carries the block's closing marker with an instruction after it, and
one is 500 characters of markup. `pnpm report:lab --dry` renders every natal
prompt for each on its own computed chart, a matrix chart's stored foundation
standing in, and every pair prompt with two of them as A and B over
curie-winfrey's runs, and fails if a name changes anything outside its block.
They never join a campaign or the release lab: the API refuses two of the names
at the door, and a report written for any of them measures nothing the matrix
does not. Only `inject-instruction` is ever written, on demand on staging, to
see a report use it as a name and obey none of it.

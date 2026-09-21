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

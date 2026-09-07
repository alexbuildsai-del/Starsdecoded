# Chart fixtures

Each file holds **birth data only**. The chart itself is computed at run time by
`calculateNatalChart`, so a fixture can never drift from the ephemeris code.

Fields match the `calculateNatalChart` signature: `birthDate` (YYYY-MM-DD),
`birthTime` (HH:MM, local), `latitude`, `longitude`, `timezoneOffset` (hours east
of UTC, fractional allowed for pre-standard-time births).

`marie-curie` and `oprah-winfrey` are two of the three charts the V2 prompt suite
was validated against, so their reports are the tone baseline. Their birth times
come from commonly cited sources rather than birth records; they are fixed inputs
for regression testing, not claims of accuracy.

The remaining fixtures are synthetic and exist to pin specific structural cases:
unambiguous day and night charts for sect, and a high-latitude chart to catch any
future drift away from whole-sign houses.

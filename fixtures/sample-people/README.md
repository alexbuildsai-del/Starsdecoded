# Sample people

Six invented people for the public site: the orbit's sample account and the two
plates each compatibility lens draws (ADR-112). They are synthetic, with no
real person behind any of them, and the site labels them as samples wherever it
shows them. Each file holds birth data only, in the `../charts/` format plus
`"synthetic": true`; the charts are computed at run time by the engine
(R-3.1). Who each person is to Mira, and which pair each lens draws, lives in
`web/src/site/data/people.ts`.

Marketing only: the report lab never reads this directory, so no report is
ever written about these people. The lab's charts, the published births among
them included, stay in `../charts/`.

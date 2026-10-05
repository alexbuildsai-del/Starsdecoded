# Sample people

Six invented people for the public site: the orbit's sample account and the two
plates each compatibility lens draws (ADR-112). They are synthetic, with no
real person behind any of them, and the site labels them as samples wherever it
shows them. Each file holds birth data only, in the `../charts/` format plus
`"synthetic": true`; the charts are computed at run time by the engine
(R-3.1). Who each person is to Mira, and which pair each lens draws, lives in
`web/src/site/data/people.ts`.

The report lab never reads this directory. Mira and Idris are also staging's
two test accounts (ADR-314, `api/src/lib/qaPair.ts`). On staging only, each
Release's walk has the model write three reports about them: Mira's Personal
report, Idris's, and their parent and child report. `lab_runs` keeps the last
ones as the seed the next walks copy in, so a deploy's walk writes nothing
(ADR-315). No public page shows these reports, and production never writes
them. The buyer walk (`api/src/walk/buyer.walk.ts`, ADR-273) and the Timeline
walk use Mira, Idris and Tomás with stand-in text on a throwaway database, so
tests and the site share one cast. The lab's charts, the published births among
them included, stay in `../charts/`.

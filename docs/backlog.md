# Backlog — Claude's own work

Work Claude does without a product choice: bugs, cleanup, tests, CI, copy that follows the voice chart, a
builder's leftover, a non-blocking sentinel finding that does not show how to abuse us (R-12.3). One line each,
`B-NN · what · where · source`. Claude adds, does and deletes lines without asking; a round takes them as cards.
Code refs use `B-NN` like `MB-NN`. Choices go to Decisions (`Decided by: Claude`); the Owner's go to the Mailbox.

## Open

Roughly in order. Lines for the brain carry a dry lab run.

- B-01 · Pair reports shared like any other: `pairSendStateFor`, `pairReadable` and the 403 line in `api/src/lib/access.ts`; buyer walk step 10 becomes the share · ADR-285, was MB-223, before Timeline opens
- B-02 · Timeline before subscribers: Ask's stored answers hidden once their source can't be read · was MB-220, ADR-139
- B-03 · Timeline checks: house on a blind chart, Ask length, retrograde and eclipse in the dry lab; the Lab-page spot for readings · was MB-218, MB-198
- B-04 · Rough birth time: Ascendant and Midheaven contacts as rough dates with a range · ADR-295, was MB-217
- B-05 · A masked block copied back logs a `generation_failures` row · ADR-294, was MB-208
- B-06 · /compatibility: write one report for two labelled sample people on staging, commit its headline and two items · ADR-286, was MB-93
- B-07 · R10 copy: "Or skip. Nothing expires." (`PathSheet.tsx`), Joined in a neutral tone (`SendDialog`, `PeopleRows`) · ADR-288, was MB-111
- B-08 · Bundle cards say their credit count once · was MB-206
- B-09 · Primary button contrast to 4.5:1, one token · was MB-221
- B-10 · Report page dead ends after a failure; plain next step on the internal failure line · was MB-205, MB-91
- B-11 · Toast and waiting buttons get accessible names; raw claim errors in plain words · was MB-204
- B-12 · Reduced motion: the closing Sun stops sitting over every chapter · was MB-203
- B-13 · Triad plate: draw the Moon's day arc above the bodies · was MB-210
- B-14 · Typed place moves from the GET query string to a POST body · was MB-211
- B-15 · `openapi.yaml`: `PairLink.of` gains `none`, then codegen · was MB-224
- B-16 · Pre-1970 zone offsets: ship tzdb backzone, with a dry lab run · was MB-201
- B-17 · Uranus, Neptune and Pluto from a JPL Horizons table, as Chiron (ADR-221), with a dry lab run · was MB-216
- B-18 · Rewind on slow phones: a positions-only engine export, with a dry lab run · was MB-125
- B-19 · Bootstrap step 6: lazy-import the OpenAI client so reset-stale needs no key · was MB-80
- B-20 · Drop the `AI_INTEGRATIONS_OPENAI_*` fallback (`credentials.ts`, `release.ts`, `report-lab.ts`) · was MB-21
- B-21 · Dead code: `packages/integrations/openai_ai_integrations`, `integrations-openai-ai-react`, the conversations and messages schema · was MB-22
- B-22 · A prettier check in CI; DB tests run in CI on a service Postgres · was MB-20, MB-49
- B-23 · Prompt version history for admin overrides · was MB-19
- B-24 · Swap `fixtures/reports/marie-curie.reference.json` for the real r06 run · was MB-73
- B-25 · Drop `reports.workbook` (idempotent) once one Release has run on `report_workbooks` · was MB-195
- B-26 · Enforce the CSP after 7 clean days: read the Failures tab after 2026-10-10, then flip `vercel.json` · was MB-147, ADR-198
- B-27 · /sample refreshes from the next passing Release; check the old tie line is gone · was MB-182
- B-28 · Remove each `// MB-NN provisional` seam whose row is no longer open (seams for 39 rows in `api`, `web`, `packages` today; fetch each row first) · sweep 05/10
- B-29 · R15 and R16 small follow-ups (libraries, query counts, leak table, release retry; R16 leftovers) · was MB-209, MB-222
- B-30 · When credits go hard: Run the fixtures on the Lab page, retire report-lab.yml's signed-out runs · ADR-290, was MB-148, waits on billing

## Waiting on Alex

Open Mailbox rows, ids and links only (R-12.7). Kept current by every session that opens or closes one.

- MB-12 https://app.notion.com/p/3d6fefe7493181e3b555e715e8ccfc56
- MB-102 https://app.notion.com/p/3e7fefe74931815a91d2d4ca95eb1d2c
- MB-114 https://app.notion.com/p/3e8fefe74931811f81d8eeda3c1a23d7
- MB-116 https://app.notion.com/p/3e8fefe74931815aba15dbc53b46fb1e
- MB-117 https://app.notion.com/p/3e8fefe7493181199d89d84e98a0945b
- MB-191 https://app.notion.com/p/3eefefe7493181da8feedb50233dc9c6
- MB-193 https://app.notion.com/p/3eefefe7493181819339d9205fba797c
- MB-215 https://app.notion.com/p/3effefe7493181ff9609ffecbe99463f
- MB-225 https://app.notion.com/p/3f0fefe7493181898b92da25fe707f2a
- MB-227 https://app.notion.com/p/3f0fefe7493181b1bb50e644ea207157
- MB-228 https://app.notion.com/p/3f0fefe7493181958e8bfd0d011d4120
- MB-232 https://app.notion.com/p/3f0fefe749318169953ced2f4aee9abe

Private, Owner Claude (security, details in Notion only; done before Timeline opens to subscribers):

- MB-202 https://app.notion.com/p/3eefefe74931814f8c7ad359223ab36e
- MB-207 https://app.notion.com/p/3eefefe7493181319d96f56bd2b2f26b
- MB-212 https://app.notion.com/p/3eefefe7493181249240f5c8c8f52875
- MB-213 https://app.notion.com/p/3eefefe7493181328321dcbe281e8a16
- MB-214 https://app.notion.com/p/3effefe7493181fa9c85ccda47f5f310
- MB-219 https://app.notion.com/p/3effefe74931819eaa2efb1e4ad5614f

Parked until the Owner starts pricing (ADR-296): MB-115, 120, 149.

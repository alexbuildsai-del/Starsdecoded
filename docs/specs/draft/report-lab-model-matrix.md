# Draft spec — the model matrix: the lab moves into the admin panel, the Owner judges blind

Raised by the Owner, 2026-09-19, directed 2026-09-20: 28.4 cents a natal report
(R05 mean) is the high end; find a better mix, a different model per section by
the reasoning it needs, beyond `gpt-5.2` and `gpt-5-mini`, Groq included. Natal
only in this pass. Quality over cost; the Owner's blind read is the judge.
Artifact: https://claude.ai/artifact/RRnfSk9Ci3VwxapoXwi6ub

## Where the 28 cents go (R05, five fixtures, real usage)

Twelve calls: one serial foundation, then ten chapters and the houses in
parallel, needing four levels of reasoning, read from their prompts:

| tier | sections | what the prompt asks | share of cost |
|---|---|---|---|
| open-ended | foundation | read the whole chart, choose thesis, pattern, tension, guide every section | 13% |
| synthesis | overview, discoveries, superpowers, focus | find paradoxes, partition the chart, reuse without repeating, inside the handover | 31% |
| scaffolded | triad, mind, career, money, relationships, family | write against evidence the prompt names, foundation attached verbatim, strict schema, claims checked in code | 48% |
| mechanical | houses | twelve 45–65 word cards under a per-house whitelist, no claims | 8% |

The foundation takes 34 s before any chapter starts. At €24 the report is 1.2%
of a sale against MASTERFILE §1's "under 1%".

## Candidates in the first matrix

Prices September 2026; ◌ from aggregators (vendor pages blocked from the
sandbox), entered in `CATALOGUE` only after a check against the official page.

| writer | door | $/M in / out | prose | why it is in |
|---|---|---|---|---|
| gpt-5.2 | OpenAI key on Railway | 1.75 / 14 | Hemingway 1049 | the baseline, the stored R05 text |
| GPT-5.6 Luna ◌ | same key, same API | 0.20 / 1.20 | Elo 1928 | eleven times cheaper on output, prose within noise of Terra |
| gpt-oss-120b on Groq | Groq key | 0.15 / 0.60 | Elo 1079 | the Owner's ask; strict json_schema, hundreds of tokens a second |
| gpt-5-mini | same key | 0.25 / 2 | none | already catalogued; the control that shows where cheap breaks |

Later, per the artifact: Opus 5, Sonnet 5, Gemini 3.8 Flash, Kimi K3, DeepSeek, Terra, Sol.

## Five mixes, one judgement

The matrix reads five charts: day-angular, high-latitude, marie-curie,
night-angular and `audrey-hepburn` (Ixelles 1929, birth certificate, night
chart, Aquarius rising), which replaces oprah-winfrey in the matrix; its M0 is
generated on staging in the round and doubles as the candidate sample report
for a Belgian landing page. The Owner's own staging report can join as a base
run too, picked in *Matrix*, so no private birth data enters the public repo.
Costs below are priced on the R05 token shape, before retries; M0 is measured.

| mix | foundation | synthesis | scaffold | houses | ¢ |
|---|---|---|---|---|---|
| M0 today | 5.2 | 5.2 | 5.2 | 5.2 | 28.4 |
| M1 5.2 thinks, Luna writes | 5.2 | 5.2 | Luna | Luna | ≈14.0 |
| M2 5.2 thinks, Groq writes | 5.2 | 5.2 | Groq | Groq | ≈13.7 |
| M4 the floor | 5.2 | mini | mini | mini | ≈7.3 |
| M7 only Groq | Groq | Groq | Groq | Groq | ≈2.1 |

The Owner judges writers, not mixes, one section at a time. M1, M2 and M4
share the stored foundation, so a difference in a section is the writer alone;
M7 writes its own foundation, so its sections carry a different reading too.
Per section the room shows every distinct text (five for a scaffolded section,
four for synthesis, five for the houses) plus a fresh 5.2 replay as a hidden
control: how often the Owner prefers one 5.2 over the other is the noise floor
a writer must beat. The mixes are read off the picks and priced at the reveal.

## Scope

1. **Providers in the catalogue.** Each `CATALOGUE` entry gains
   `provider: "openai" | "groq"`; the client factory maps a provider to a base
   URL and a key variable (`OPENAI_API_KEY`, `GROQ_API_KEY`), both read on the
   Railway service, one client per provider from the exported factory.
   `ModelId` keeps deriving from `CATALOGUE`. Usage stays OpenAI-shaped, which
   Groq honours. `GET /admin/lab/providers` reports which keys are present, so
   a missing key on Railway shows as a light in the panel, not a question here.
2. **Lab tables.** `lab_runs` (fixture, label, source `lab | replay`, base run,
   per-section model, text, usage, faults, cost, created_at) and
   `lab_judgements` (session, fixture, section, the shuffled order, picks, note,
   judged_at, revealed_at). Declared in `packages/db/src/schema`, one idempotent
   migration wired into `scripts/bootstrap-db.sh`.
3. **Replay on the server.** `POST /admin/lab/replay` takes a base run, a
   model and a section list (`foundation` means write a foundation first, then
   every section on it). It uses the two hooks the engine already exposes for
   the lab, `previewSectionPrompt` and `callStructured`, so the prompt, schema,
   retries and claim validation are the customer's, and stores one `lab_runs`
   row per section. Runs as a job with a status the page polls, like a report.
   No `reports` row, no credit, no customer path touched. The regex fault rules
   move from the script into `api/src/lib/labRules.ts`, imported by both.
4. **Every lab run lands in the panel.** `report:lab --remote` posts each
   finished run to `POST /admin/lab/runs`; `--publish <fixture>.<label>`
   imports a stored file, which is how the five R05 runs become the baseline.
   The Owner's browser passes the Clerk gate; the workflow and the script pass
   a `LAB_TOKEN` accepted by the lab routes only, placed once by the Owner in
   Railway staging and the GitHub `staging` environment (the Groq key joins it
   on Railway). The report-lab branch stays as the paste trail.
5. **The admin Lab page** at `/admin/report-lab`, beside Prompts in the admin
   sidebar, gated like it (`ADMIN_USER_ID`), four views:
   - *Runs*: every stored run by fixture and label, per-section words, cost,
     seconds, faults; the compare table the lab prints today, in the browser,
     for any two labels.
   - *Matrix*: pick a base run, a fixture run or one of the admin's own
     stored reports, tick writers and sections, dispatch replays, watch them
     land.
   - *Reading room*: exists only inside a session the Owner spawns from
     *Matrix* by choosing runs, sections and charts; nothing is queued
     otherwise. One card per fixture and section, the variants side by side
     as A, B, C, D, E in an order shuffled per card and stored, models, costs
     and faults hidden. Under each variant a **best** button, a **would
     not ship** button, and *same as* to tie two or more; one free-text note
     per card. Career first, then the sections the session lists; a card is
     saved on the pick and the room reopens where it stopped.
   - *Reveal*: enabled only when every card of the session is judged. Per
     writer: best, tied, not-shippable counts by section and by tier, faults
     and words against the contract, cost per section. Per mix: cost, and how
     many of its sections the Owner marked worse than 5.2. Every session stays
     readable afterwards with its notes; that is the history.
6. **Docs.** `/report-lab` skill gains the panel, `--publish` and the matrix;
   R-5.6 in MASTERFILE points at `api/src/lib/models.ts`; MB-39's report
   browser gap is met for lab runs.

## Out of scope

- Any edit to `MODELS` or `SECTION_MODELS`: a routing change is its own
  USER-FACING engine change with a staging lab run pasted (R-4.4, R-5.5).
- The compatibility report: same tables, its own matrix, after the natal one.
- A native Anthropic or Gemini adapter, batch or flex tiers, `reasoning_effort`.
- An LLM judge: the Owner is the judge, the contract faults the automatic gate.
- Tightening any ceiling or band (MASTERFILE §1); judging the foundation's text
  directly, it is judged through the sections it produces.
- Production: the page ships behind the admin gate everywhere, replay refuses
  to run when `PROMPTS_READ_ONLY` is set.

## Acceptance criteria

1. The four R05 runs appear under *Runs* after `--publish` with the costs the
   lab printed; `audrey-hepburn` gets its M0 there; the admin's own report can
   be chosen as a base run without birth data leaving the database.
2. A replay of `career` on `gpt-5.2` against `marie-curie.r05` produces a row
   `--compare` and the *Runs* view show with no fault the original lacked.
3. A replay on `gpt-oss-120b` runs from the panel with no key in the repo; with
   the Groq key absent the providers light says so and the job fails before
   any call.
4. A reading-room card hides model, cost and faults, stores the shuffled order,
   accepts best, would-not-ship, ties and a note, and reloads judged.
5. *Reveal* refuses until the last card is judged, then shows the per-writer
   and per-mix tables; a second session on the same runs starts blank while
   the first stays readable.
6. Typecheck, both builds, unit tests, `db:bootstrap` twice on a fresh database
   green; nothing a customer sees changes; every line INTERNAL.

## Screens

Artifact above: tiers, candidates, mixes, the flow from stored run to reveal,
the reading-room card with its columns and note, the reveal table.

## The rule for moving a section

Quality over cost. A writer takes a section only when, on every fixture read,
the Owner picked it best or tied it with the best, never marked it would not
ship, and the contract gate holds (zero new faults on five fixtures, band
held, retry rate not up). Five of five is the bar: a coin-flip writer does
that once in thirty-two. Four of five earns a confirmation session on five
more charts (new fixtures, real birth data) before it moves; three or fewer
stays. A writer the Owner picks best over 5.2 moves even when it costs more.
The foundation moves only on a full session of its own, never on one
section's picks.

## Sequence

1. Lab round, INTERNAL: scope 1–6, one branch, gate, merge, staging deploy.
2. Publish the five R05 runs; dispatch Luna, Groq and mini on the eleven
   sections and M7 whole, five fixtures. About 10 ¢ a fixture, 50 ¢ in all.
3. First reading session, spawned by the Owner: career, then three more
   sections, five fixtures, twenty cards. Reveal. Discuss here. Later sessions
   are spawned by the Owner, or proposed here when a new writer or prompt
   version lands in the lab, a run's faults or bands move against the
   baseline, or a writer at four of five needs its confirmation round.
4. Second session: the remaining sections. Then the routing round,
   USER-FACING: `models.ts`, staging lab, paste, promote, prices verified on
   the vendor page the same day.
5. The compatibility matrix on the same page.

## Open questions

1. **Which four sections in the first reading session?** *Recommendation:*
   career (the Owner's example), overview (the first thing a buyer reads),
   superpowers and discoveries (the wow moments). *Default if silent:* those four.

## Decisions to record

- The lab's A/B instrument is server-side replay of a stored run with chart and
  foundation held fixed, dispatched from the admin panel; two staging deploys
  are no longer how a model is compared.
- Lab runs and judgements live in the staging database and are read in the
  admin Lab page; the report-lab branch remains the paste trail only.
- The Owner is the judge, blind, per section, with a note; there is no LLM
  judge. Models, costs and faults are revealed only after the last card.
- Lab runs land in the panel automatically; a reading session exists only
  when the Owner spawns one, or accepts one proposed here.
- Providers enter through OpenAI-compatible endpoints named per model in
  `CATALOGUE` with their price; keys live on the Railway service.
- A section moves to another writer only on the rule above; quality over cost.
- R-5.6 is superseded: `api/src/lib/models.ts` is the single catalogue.

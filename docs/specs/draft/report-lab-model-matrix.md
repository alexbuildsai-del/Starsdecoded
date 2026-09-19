# Draft spec — the model matrix: which model writes which section, and how the lab proves it

Raised by the Owner, 2026-09-19: 31.0 cents a report (R04 mean) is the high end;
find a better mix, possibly a different model per section by the reasoning it
needs, and look beyond `gpt-5.2` and `gpt-5-mini`, Groq included.
Artifact: https://claude.ai/artifact/RRnfSk9Ci3VwxapoXwi6ub

## Where the 31 cents go

Thirteen calls: one serial foundation, twelve sections in parallel. Read from
their prompts, they need four levels of reasoning (`api/src/prompts/sections/`):

| tier | sections | what the prompt asks | share of cost |
|---|---|---|---|
| open-ended | foundation | read the whole chart, choose thesis, pattern, tension, guide every section | 12% |
| synthesis | overview, discoveries, superpowers, focus | find paradoxes, partition the chart, reuse without repeating, inside the handover | 35% |
| scaffolded | triad, mind, career, money, relationships, family, path | write against evidence the prompt names, foundation attached verbatim, strict schema, claims checked in code | 44% |
| mechanical | houses | twelve 45–65 word cards under a per-house whitelist, no claims | 8% |

Shares from the R02 token shape scaled to the R04 mean; the model lands at
29.6 ¢ against 31.0 measured, retries being the gap. MASTERFILE §1 says
inference is under 1% of a sale; at €24 it is 1.3%.

## Candidates

Three doors: the OpenAI key on Railway; the Groq key already in the GitHub
`staging` environment; an OpenAI-compatible endpoint plus one more key. Prose is
EQ-Bench Creative Writing v3 Elo where one exists. Prices are September 2026;
those marked ◌ come from aggregators because the vendor pages are blocked from
the sandbox, and enter `CATALOGUE` only after a check against the official page.

| model | door | $/M in / out | whole report | prose | fit |
|---|---|---|---|---|---|
| gpt-5.2 (today) | OpenAI | 1.75 / 14 | 29.6 ¢ | Hemingway 1049 | baseline |
| GPT-5.6 Luna ◌ | OpenAI | 0.20 / 1.20 | 2.7 ¢ | Elo 1928 | scaffold, houses: same key, same API, 11x cheaper |
| GPT-5.6 Terra ◌ | OpenAI | 2 / 12 | 27.5 ¢ | Elo 1927 | like-for-like successor to 5.2 |
| gpt-oss-120b on Groq | Groq | 0.15 / 0.60 | 2.8 ¢ | Elo 1079 | foundation (speed, reasoning, unread prose), houses; only Groq model with strict json_schema |
| gpt-5-mini | OpenAI | 0.25 / 2 | 4.2 ¢ | none | already catalogued; the cheap-tier control |
| Claude Opus 5 | Anthropic key | 5 / 25 (×1.3 tokens) | 79 ¢ | Elo 2105–2121, lowest slop | the four synthesis chapters only; needs a native adapter |
| Claude Sonnet 5 | Anthropic key | 2 / 10 (×1.3) | 32 ¢ | Elo 1759 | below the 5.6 tiers at higher cost; skip |
| Gemini 3.8 Flash ◌ | Google key | 0.75 / 3.75 promo | 9.1 ¢ | Arena writing #3 | wildcard; promo ends 2026-12-31 |
| Kimi K3 ◌ | Moonshot key | 3 / 15 | 32 ¢ | Elo 2060–2071 | second-best prose at today's price; provider risk |
| DeepSeek V4.1 Flash ◌ | DeepSeek key | 0.30 / 1.20 | 3.0 ¢ | Elo ~1553 | json_object only officially; skip |
| GPT-5.6 Sol ◌ | OpenAI | 4 / 20 promo | 49 ¢ | Elo 1960 | foundation only, if ever |

Groq notes: strict constrained decoding exists only on the two gpt-oss models;
`strict: true` is silently ignored elsewhere. Kimi K2 and Llama 4 left Groq's
self-serve tier in 2026, so any Groq route is replaceable by design. Caching is
automatic, hits at half price, free tier 30 RPM.

## Mixes to measure

Hypotheses for the lab, not a shortlist to pick by eye. Costs from the model
above, before retries.

| mix | foundation | synthesis | scaffold | houses | ¢ |
|---|---|---|---|---|---|
| M0 today | 5.2 | 5.2 | 5.2 | 5.2 | 31.0 measured |
| **M1** 5.2 thinks, Luna writes the scaffold | 5.2 | 5.2 | Luna | Luna | ≈15.5 |
| **M2** the Owner's ask | 5.2 | 5.2 | Groq oss-120b | Groq | ≈15.6 |
| **M2b** Groq where nobody reads | Groq oss-120b | 5.2 | 5.2 | Groq | ≈26, foundation in ~5 s not ~30 |
| M3 quality up, cost flat | 5.2 | Opus 5 | Luna | Groq | ≈32 |
| M4 the floor | 5.2 | mini | mini | mini | ≈7.4 |
| M6 invert it | Opus 5 | Luna | Luna | Luna | ≈11.7 |

M1 and M2 hold foundation and synthesis on 5.2, so a difference in the replayed
sections is the writer alone. M2b replays the foundation and then all twelve
sections on 5.2, so a difference is the reading alone. M3 and M6 wait for an
Anthropic adapter.

## Scope

1. **Replay mode** in `scripts/src/report-lab.ts`:
   `pnpm report:lab --replay <fixture>.<label> --label <new> --model <id> [--sections a,b]`.
   Reads the stored run (chart, foundation, sections), rebuilds each chosen
   section's prompt from the chart and the stored foundation through the
   existing `api/src/prompts` assembly, calls the candidate through the
   existing OpenAI client with the same schema, retries and validation, and
   writes `<fixture>.<new>.json` in the same shape with `meta.model` per
   section, so `--compare` works unchanged. `--sections foundation` replays the
   foundation and then every section on the base model (M2b). No database, no
   staging deploy, no product code. Spend is the replayed sections only.
2. **Provider on the catalogue.** Each `CATALOGUE` entry gains
   `provider: "openai" | "groq"` and a cached-write price where the vendor
   bills one; the client factory maps a provider to a base URL and a key env
   (`GROQ_API_KEY`). `ModelId` keeps deriving from `CATALOGUE`, so an unpriced
   model still does not compile. Usage accounting stays OpenAI-shaped, which
   Groq honours; a native Anthropic adapter is out of scope here.
3. **The blind judge.** `--judge <a> <b>`: for every section present in both
   runs, a pairwise read in random order, scored on five lines from the style
   contract (specific to this chart; follows the foundation's guidance;
   restraint; no repeated cadence; would a reader know which is the machine),
   with tie allowed. The judge model is never one of the two under comparison
   and is named in the output. Results land in the compare table as a sixth
   column and in the run summary.
4. **The reading room.** `--html` on a replay also writes
   `<fixture>.<a>-vs-<b>.html` to the report-lab branch: the same section from
   A and B, blind, one fixture at a time, pick then reveal, picks kept in the
   page's localStorage and exportable as one line the round report pastes.
5. **Workflow.** `report-lab.yml` gains a `mode: generate | replay | judge`
   input, `run`, `candidate` and `sections` inputs, and runs its job under
   `environment: staging` so the Groq key (and the OpenAI key, question 2) are
   readable. Publishing to `report-lab/<label>` stays as it is.
6. **Docs.** `/report-lab` skill gains the replay and judge arguments; R-5.6 in
   MASTERFILE points at `api/src/lib/models.ts` as the single catalogue.

## Out of scope

- Any edit to `MODELS` or `SECTION_MODELS`. A routing change is its own
  USER-FACING engine change with a staging lab run pasted (R-4.4, R-5.5).
- A native Anthropic or Gemini adapter, batch or flex tiers, `reasoning_effort`.
  Batch tiers halve the price and add minutes to hours; the report is written
  while the buyer waits, so they do not apply.
- Tightening any token ceiling or word band (MASTERFILE §1).
- Synastry, which has no schema, no validation and no usage recording today.
- Judging the foundation's text directly; it is judged through the sections it
  produces.

## Acceptance criteria

1. `--replay` on `marie-curie.r04b` with `--sections triad` and `--model gpt-5.2`
   produces a file `--compare` reads with no fault the original lacked, and the
   replayed section's `meta.model` and cost are printed per section.
2. A replay against Groq runs from the workflow with no key in the repo and no
   change under `api/` or `web/` beyond the catalogue's provider field.
3. `--judge` prints one row per section with winner or tie, the judge's model,
   and never runs when a run contains the judge's own model.
4. `--render` and `--compare` on existing R02 and R04 files behave exactly as
   before; the unit tests for the lab's judge() rules still pass.
5. The reading-room page opens from the report-lab branch, hides models until a
   pick, and its export line names fixture, section, pick and the two models.
6. Everything shipped is INTERNAL; no report a customer can buy changes.

## The rule for moving a section (recorded for the routing round)

Cheaper and not worse, per section, three gates: contract (zero new faults on
five fixtures, band held, retry rate not up), judge (not worse on four of five,
never worse on the fixture that retried), reading room (the Owner picks the
candidate or same on two fixtures read blind). Pass all three and the section
moves in `SECTION_MODELS`. The foundation never moves on the judge alone.

## Sequence

1. Lab round, INTERNAL: scope items 1 to 6, one branch, no product change.
2. Dispatch M1, M2, M2b against the R04 files, five fixtures each; then M4 as
   the floor. About 10 ¢ of generation and 10 ¢ of judging in total.
3. The Owner reads. Sections passing all three gates are listed with their model.
4. Routing round, USER-FACING: `models.ts`, staging lab, paste, promote. Prices
   verified on the vendor page the same day.
5. Then the second-key candidates: Opus 5 for the synthesis chapters (adapter,
   usage normaliser, about a day), Gemini 3.8 Flash (a key only).

## Open questions

1. **Run the Groq replay now, before the lock?** The Owner suggested it and the
   key is in place; it needs the replay script and a workflow input, so it is
   the first card of the lab round rather than part of the ideation.
   *Recommendation:* yes, on a lab-only branch touching nothing under `api/`
   or `web/`, against the five R04 files. *Default if silent:* waits for the round.
2. **Does the staging OpenAI key join the Groq key in the GitHub `staging`
   environment?** Replay needs it for Luna and for the judge; today it lives
   only on Railway. *Recommendation:* yes, staging key only, as an environment
   secret; the repo stays secret-free. *Default if silent:* replay runs Groq
   candidates only and the judge waits.
3. **First matrix.** *Recommendation:* Luna on the scaffold; gpt-oss-120b on
   Groq for the scaffold (the ask) and the foundation (its fit); gpt-5-mini as
   control; gpt-5.2 as baseline. No third key until these are read.
   *Default if silent:* exactly that.

## Decisions to record

- The lab's A/B instrument is replay of a stored run with chart and foundation
  held fixed; two staging deploys are no longer how a model is compared.
- Providers enter through OpenAI-compatible endpoints, named per model in
  `CATALOGUE` with their price; nothing else names a provider or a model.
- A section moves to another model only on the three gates above; cheaper and
  not worse is the only move MASTERFILE §1 allows.
- The judge is never a model in the comparison; the Owner's blind pick is the
  last gate, not the judge's score.
- Groq is a fit for the foundation and the houses, not for the prose chapters,
  until a replay says otherwise.
- The foundation never moves on the judge alone.
- R-5.6 is superseded: `api/src/lib/models.ts` is the single catalogue.

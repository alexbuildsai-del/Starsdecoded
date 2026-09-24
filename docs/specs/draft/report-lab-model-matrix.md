# Draft revision — the model matrix, re-cast on GPT-6, and a lab that runs at release

Revises the spec locked 2026-09-21 (ADR-52 to 58). Raised by the Owner 2026-09-24: lab
spend every round is too high. Review the models again, OpenAI and Groq, no Anthropic,
Luna suggested; generate nothing for the reading room until a session is spawned; run
the full lab at the staging-to-production release, not every round.
Artifact: https://claude.ai/artifact/RRnfSk9Ci3VwxapoXwi6ub (version 3)

## What changed since the lock

- **GPT-6 Sol and GPT-6 Luna shipped on 2026-09-22** at half the GPT-5.6 price.
  GPT-6 Luna is cheaper per output token than gpt-oss-120b on Groq and scores
  far higher on every index.
- **gpt-5.2 is marked deprecated** with no shutdown date, and gpt-5-mini shuts
  down on 2026-12-11. Every job runs on 5.2 today, so a successor is needed
  whatever the price.
- **Groq lost its case.** Kimi K2 and Llama 4 were retired from Groq in 2026.
  gpt-oss-120b is weak on writing boards: 1652 on EQ-Bench creative writing
  against 1963 for GPT-5.6 Sol, and 48th on lechmazur's writing board. It costs
  more per output token than GPT-6 Luna. Its only edge left is speed.
- **The lab spends by campaign, not by report.** R05 dispatched at least nine
  campaigns: natal, pass and pair, plus reruns. R06 spent about $4 before the
  key ran dry (MB-68). `--all` now runs seven charts, not five.

## Candidates, September 2026

Standard tier, $ per million tokens, from press and aggregators quoting the vendor
pages (the proxy blocked direct reads); each is checked on the official page the
day it enters `CATALOGUE`.

| writer | in / cached / out | evidence | role in the matrix |
|---|---|---|---|
| gpt-5.2 | 1.75 / 0.175 / 14 | the stored R05 and R06 text; deprecated | baseline and hidden control |
| gpt-6-sol | 2.00 / 0.20 / 10 | AA index 48; blind panel: "Sol is competitive" | the thinker, and the like-for-like successor |
| gpt-6-luna | 0.10 / 0.01 / 0.50 | AA 37, level with 5.6 Luna; AA notes weaker presentation | the cheap writer |
| gpt-5.6-luna | 0.20 / 0.02 / 1.20 | AA 37; the Owner's suggestion | the cheap writer's check on 6 Luna's presentation |

Left out: **gpt-5.6-sol** at 4 / 20, third on EQ-Bench but 50 ¢ a report, back
only if 6 Sol loses to 5.2 on synthesis. **gpt-5.6-terra** at 2 / 12, "not close"
in a blind panel and dearer than 6 Sol. **gpt-5.5** at 5 / 30 and OpenAI's $10 / $50
flagship, out of range for €24. **gpt-5-mini**, shut down in December. **Groq's**
gpt-oss-120b, gpt-oss-20b and qwen3.8-27b (0.80 / 4, 16k output cap), see above.
From 5.6 onward a cache write bills at 1.25 times the input price. The prices
below charge it on all uncached input, which overstates the cost.

## Mixes, priced on real R05 usage

Per report: 32.5k uncached input, 93k cached, 15.1k output, no reasoning. Cents:

| mix | foundation | synthesis | scaffold | houses | ¢ | vs today |
|---|---|---|---|---|---|---|
| M0 today | 5.2 | 5.2 | 5.2 | 5.2 | 28.4 | — |
| S successor | Sol | Sol | Sol | Sol | 25.1 | −12% |
| A Sol thinks, Luna writes | Sol | Sol | 6 Luna | 6 Luna | 11.5 | −60% |
| A5 the Owner's Luna | Sol | Sol | 5.6 Luna | 5.6 Luna | 12.4 | −56% |
| B Sol plans only | Sol | 6 Luna | 6 Luna | 6 Luna | 4.1 | −86% |
| L all Luna | 6 Luna | 6 Luna | 6 Luna | 6 Luna | 1.3 | −95% |

2k reasoning tokens on a Sol foundation add about 2 ¢. Expected landing: A; B if
6 Luna holds on synthesis; S if Luna fails the scaffold. Mixes are read off the
section picks at the reveal; nobody judges a mix.

## The reading room: nothing is generated until a session is spawned

The locked Sequence step 2 is deleted. That step pre-dispatched every writer
across eleven sections and five charts. Instead:

1. The Owner opens *Spawn a session*, the renamed *Matrix* view. They tick
   sections, charts and writers. The form shows the estimated spend before
   anything runs. For example, career plus three synthesis sections, five
   charts, four writers and the 5.2 control comes to about 90 ¢.
2. **Spawn** starts the replays for exactly those cards and nothing else. The
   room opens when the last card lands. A replay that fails is retried once,
   then its column is dropped from the card and named at the reveal.
3. Pages load no report text until a card opens. *Runs* lists numbers only:
   words, cost, seconds and faults. A card fetches its variants when it is
   opened.
4. The rest of the room works as locked: blind columns in a stored shuffled
   order, best, same as, would not ship, one note per card, and a reveal only
   after the last card.

## When the lab runs: four levels instead of one

| level | when | what runs | spend |
|---|---|---|---|
| 0 dry | every round with a brain change | every section's prompt rendered on staging for the five charts; token count and schema check against the baseline; no model call | free |
| 1 spot | merge to staging when a prompt changed | server replay of only the changed sections on two charts, foundation held from the stored run, compared in *Runs* | about 2–10 ¢ |
| 2 release | Promote to production, only when the brain changed since production's commit | the full natal lab on the five matrix charts; a pair lens only if the pair brain changed; release gate below | about $1.40 on M0, 60 ¢ on A |
| 3 reading | spawned by the Owner, or proposed here for a new writer or prompt voice | the session's cards only | shown before spawn |

A pipeline change (`aiInterpretation.ts`, chart engine, `traditional.ts`) spots one
whole report on one chart, about 28 ¢ today.

**The release gate.** `promote.yml` diffs the brain paths between production and
the commit being promoted. If they are unchanged, it skips the lab. If they
changed, it dispatches the release lab and waits. It fast-forwards only when
three things hold: no new contract fault, every total inside its band, and
cost within 10% of the last release. A red gate leaves production where it was
and says why. Promotes before Stripe are rare, and so are full labs.

**Guards.**
- A lab budget, `LAB_BUDGET_USD` with a default of $15 a month, is summed from
  `lab_runs`. The replay route and the release lab refuse beyond it, and the
  panel shows the spend to date.
- A campaign stops at the first out-of-credit 429 instead of failing every
  chart.
- `--all` means the five matrix charts. oprah-winfrey and marie-curie-unknown
  run only when their own brain changed: the pair fixture, the birth time.
- Lab replays ask for OpenAI's Flex tier where the model offers it, at half
  price. The release lab stays on the customer path at the standard tier.

## Scope

The locked scope holds with these changes:

1. **Catalogue.** Add gpt-6-sol, gpt-6-luna and gpt-5.6-luna with their prices.
   Each entry also gets a `reasoningEffort` with default `none`, sent on every
   call. Newer models reason by default, and reasoning bills as output, so the
   effort is pinned in one place.
2. **Groq is dropped**, subject to the question below. That removes the
   provider field, `GROQ_API_KEY` and the providers light. `createOpenAIClient`
   stays single-provider.
3. **Replay** takes `serviceTier: flex | standard`, flex by default.
4. **Spawn a session** replaces *Matrix*: an estimate before spawn, generation
   on spawn, texts loaded per card.
5. **Level 0 and level 1.** Add `GET /admin/lab/dry`, which renders prompts
   through `previewSectionPrompt` with no call. Level 1 runs through
   `POST /admin/lab/replay`. `report-lab.yml` gains `campaign: release`.
6. **Release gate** in `promote.yml` as above. The budget guard and the
   stop-at-429 go in the lab script and the replay route.
7. **Rules.** R-4.4 and §11.4 in MASTERFILE, CLAUDE.md, and the report-lab,
   round and orchestrator instructions all say the same four levels. The
   orchestrator's "anything in `api/src/lib/`" trigger narrows to the brain.

## Out of scope

- Moving any section off 5.2: the routing round, USER-FACING, on the reading-room
  rule. Pair, scenes and synastry stay on 5.2 until their own matrix.
- The Batch API, a non-OpenAI provider, an LLM judge, a scheduled drift check
  (level 2 at each release is the drift check).

## Acceptance criteria

1. The locked criteria 1, 2, 4 and 5 hold. Criterion 3 goes with Groq.
2. Before spawn, the *Runs* and *Spawn* views make no model call and load no
   report text. Checked in the network tab.
3. A spawned session creates exactly the ticked cards. The spend it shows is
   within 20% of the cost stored afterwards.
4. The dry lab returns per-section input tokens for five charts with zero
   usage recorded.
5. A promote with no brain diff skips the lab. A promote with one runs it and
   refuses on a seeded fault. Both are checked on a test branch with no spend,
   using a stub campaign.
6. Replays past `LAB_BUDGET_USD` are refused with the spend named. A 429 run
   stops after one chart.
7. The gate is green: typecheck, both builds, unit tests, and `db:bootstrap`
   run twice. Every line is INTERNAL.

## The rule for moving a section

Unchanged. Quality over cost: best or tied on every chart read, never "would
not ship", and the contract gate held. Five of five moves the section. Four of
five earns a confirmation session. A writer picked over 5.2 moves even when it
costs more. Sol is judged as a writer too. S is the fallback if the cheap
writers fail, because 5.2 is retiring.

## Sequence

1. Lab round, INTERNAL: scope 1 to 7 on the locked scope.
2. The OpenAI key gets credits (MB-68). Nothing generates until then.
3. The first session is spawned by the Owner: career, overview, superpowers and
   discoveries on five charts, with Sol, 6 Luna, 5.6 Luna, the stored 5.2 and
   the hidden fresh 5.2: about 90 ¢, 45 ¢ on Flex. Then the reveal, discussed here.
4. The second session covers the remaining sections and the foundation. Then
   the routing round: `models.ts`, a level 2 lab, and a promote through the gate.

Screens: the artifact above (candidates, mixes, spawn form, four levels, release gate).

## Questions

1. **Drop Groq?** Recommended yes: GPT-6 Luna is cheaper and stronger. If you
   want Groq's speed tested anyway, it can come back as one column in a later
   session, at the cost of the provider seam. Default if silent: dropped.
2. **Release gate automatic inside Promote?** Recommended yes: no one has to
   remember it. Default if silent: automatic.
3. **Lab budget of $15 a month?** Recommended, with the OpenAI usage alert at
   $20 from MB-68 set in the OpenAI dashboard. Default if silent: $15.

## Decisions to record

- ADR-56 is superseded: the matrix is OpenAI-only, Groq out on September 2026 evidence.
- The candidates are gpt-6-sol, gpt-6-luna and gpt-5.6-luna against gpt-5.2.
  Each catalogue entry pins its reasoning effort.
- ADR-55 is amended. Nothing is generated for the reading room until the Owner
  spawns a session. The spend is shown before spawn, and texts load per card.
- R-4.4 is amended. The lab runs at four levels: dry at every brain change,
  spot on merge to staging, full at release when the brain changed, and
  reading when spawned. The full lab gates Promote.
- Lab spend is capped by `LAB_BUDGET_USD`; lab replays use the Flex tier.

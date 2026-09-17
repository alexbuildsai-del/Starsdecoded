# Report lab runs

A run is `<fixture>.<label>.json` — the birth-data fixture, the computed chart,
and the full interpretation. `.md` and `.html` siblings are the readable forms.

## Read a report without generating one

```sh
pnpm report:lab --render                  # newest run on disk
pnpm report:lab --render marie-curie.reference
```

No API key, no database, no spend. Use this whenever you need a real
interpretation in front of you — UI, PDF, styling, copy, or re-reading a past
measurement. **Generating a report costs about 25 cents; rendering one is free.**

Regenerate only when the words would change: prompts, section schemas,
`vocabulary.ts`, `brief.ts`, the model, or reasoning effort.

## What is committed

`marie-curie.reference.json` only — one real staging run, so a fresh clone can
render something immediately. It goes stale: `--render` prints its
`generatedAt` so you can see how old it is.

## Getting the current set

Every Report lab workflow run replaces the `report-lab/<label>` branch with all
five fixtures. Pull them in:

```sh
git fetch origin report-lab/staging
git checkout origin/report-lab/staging -- fixtures/reports/
```

They land beside the committed reference, and `--render` with no argument picks
whichever was generated most recently. Those files are not committed to `main`.

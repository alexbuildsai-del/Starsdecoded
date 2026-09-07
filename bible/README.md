# Stars Decoded — the bible

The browsable reference for what Stars Decoded is, how it is positioned, and
how it generates reports. Nine sections, from product overview through to a
searchable library of all 85 report prompts.

**Live:** https://claude.ai/code/artifact/7bd58e7a-995a-442e-94ea-7293d7ee3fd2

The page is a single self-contained HTML artifact — no framework, no build
step, no bundler. The only generated input is `bible/prompts.json`.

## Sync

Pull every prompt from the source of truth into `bible/prompts.json`:

```sh
node bible/sync-prompts.mjs
```

To include the live overrides written at `/admin/prompts`:

```sh
DATABASE_URL='postgresql://…' DATABASE_SSL=require node bible/sync-prompts.mjs
```

Prompts live in two layers and the script merges them the same way the API
does — a `prompt_templates` row beats the file default field by field. Without
`DATABASE_URL` the output is marked `dbOverridesRead: false` and the page says
so on its face.

The script exits non-zero if a prompt it expects has been renamed or removed.

## Build

There is no build. The page is authored as one HTML file and published with
the `Artifact` tool. To change content, edit the HTML and republish to the
**same URL** so the link stays stable.

## Deploy

Publishing the artifact *is* the deploy. It is private to the account that
owns it until shared from the page's share menu.

## The rule

Prompts are never edited by hand here. Fix them in
`api/src/lib/promptDefaults.ts` or at `/admin/prompts`, then re-sync.
`bible/prompts.json` is overwritten on every run.

See `CLAUDE.md` at the repo root for the update checklist and the
release-notes convention.

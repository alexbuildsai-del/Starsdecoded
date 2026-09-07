# CLAUDE.md — working on Stars Decoded

Repo-level notes for future sessions. The first half is about the codebase;
the second half is about **the bible**, which is the browsable reference for
what this product is, how it is positioned, and how it generates reports.

---

## The product, in one line

Stars Decoded (the app still says "Astra" in places — see Gaps) computes a
natal chart locally with `astronomy-engine`, then writes a 2,000–2,800 word
psychological report with a chain of `gpt-5.2` calls grounded in a
pre-generated meaning library.

**Naming:** the product is **Stars Decoded**. `Astra` is the inherited Replit
project name and still appears in the nav, footer and page title. Do not
introduce new uses of "Astra".

---

## The bible

**Live page:** https://claude.ai/code/artifact/7bd58e7a-995a-442e-94ea-7293d7ee3fd2

A single self-contained HTML artifact, nine sections, no build step and no
framework. It exists so a new collaborator, an investor, a freelancer or
future-Alex can answer anything short of reading the code.

### Where the content lives

| Section | Content source |
|---|---|
| 1 Overview | Hand-written prose + an inline SVG pipeline diagram |
| 2 Design system | **Generated at runtime** from the token list in the page's JS. Swatches paint the real `hsl()` and read the hex back from the browser, so they cannot drift. |
| 3 Landing page | Hand-written, quoting `web/src/pages/LandingPage.tsx` verbatim |
| 4 GTM & pricing | Notion GTM page + ASTRA_PRODUCT_LOG, plus a cost model derived from the token budgets in code |
| 5 Marketing | Notion GTM page |
| 6 Features | Reconciled from code, then against ASTRA_PRODUCT_LOG |
| 7 Reports | TypeScript interfaces in `aiInterpretation.ts` + shipped prompt text |
| 8 Prompt library | **Generated** from `bible/prompts.json` — never hand-written |
| 9 Gaps | Every unanswered question, collected in one place |

### The one rule

> **Prompts are never edited by hand in the bible.**

They are extracted from the source of truth by `bible/sync-prompts.mjs`. If a
prompt looks wrong on the page, fix it in `api/src/lib/promptDefaults.ts` or at
`/admin/prompts`, then re-sync. Editing `bible/prompts.json` directly will be
silently overwritten on the next run.

### Running the sync

```sh
# file defaults only — no credentials needed, works offline
node bible/sync-prompts.mjs

# file defaults + live DB overrides (what production actually resolves)
DATABASE_URL='postgresql://…' DATABASE_SSL=require node bible/sync-prompts.mjs
```

Prompts resolve in two layers, and the script mirrors `promptLoader.resolvePrompt()`
exactly: a `prompt_templates` row beats the file default **field by field**.
Without `DATABASE_URL` the output records `dbOverridesRead: false` and the page
says so, rather than passing defaults off as production truth.

The script **exits non-zero and explains itself** when a prompt named in its
`REQUIRED` list no longer exists in the source file. That is deliberate — a
renamed prompt means a bible page is now describing something that is not there.

> Note: the sandbox these sessions run in has HTTPS-only egress, so Postgres
> (5432/6543) is unreachable from a remote session. Run the DB sync locally.

---

## Updating the bible after a product change

One command, then a short checklist:

```sh
node bible/sync-prompts.mjs   # add DATABASE_URL if overrides matter
```

Then, in the session that made the change, ask Claude to republish the bible
with the URL above and walk this list:

1. **Prompts changed?** Re-sync. Confirm the `lastSynced` line updated and the
   key count is still what you expect.
2. **New or removed report section?** Update section 7 (Reports) and the
   pipeline diagram in section 1. Check whether a prompt key went dead.
3. **Design tokens changed?** Update the `CORE` / `CHART` arrays in the page JS.
   Nothing else — swatches derive from them.
4. **Landing page copy changed?** Section 3 quotes it verbatim. Re-quote it.
5. **Price or packaging changed?** Section 4, and re-check the margin table.
6. **Feature shipped, parked or started?** Section 6, and clear the matching
   entry from section 9 (Gaps) if it resolved one.
7. **Gap answered?** Delete it from section 9. Gaps only shrink by being
   answered — never by being quietly dropped.
8. **Add a release-notes row** (below).

Republish with `Artifact` using the **same URL** so the link stays stable.

---

## Release notes

The bible doubles as the release log. Updating it is **part of any production
deploy**, not a follow-up task. Every entry is tagged:

- `USER-FACING` — communicate it. Changes what a customer sees, gets or pays.
- `INTERNAL` — do not communicate. Refactors, infra, prompt tuning that does
  not change output shape, dead-code removal.

A change that alters report *content* is `USER-FACING` even when no UI moved —
someone who bought a report yesterday would get different words today.

| Date | Change | Tag |
|---|---|---|
| 2026-09-07 | Bible created. 85 prompts synced from `promptDefaults.ts` at `0d7bf7a`. | `INTERNAL` |

---

## Things a future session should know

- **`gpt-5.2` is hard-coded** at three call sites. Not env-configurable.
- **No temperature, no `response_format`, no retries** anywhere in the report path.
- **Parse failures degrade silently** — every section parser returns the raw
  string on a `JSON.parse` throw, which is why several types are `Section | string`.
  A malformed response saves successfully and renders wrongly. Nothing is logged.
- **14 of 85 prompt keys are dead** (the 7 legacy natal sections). Still editable
  at `/admin/prompts`, wired to nothing.
- **There is no prompt version history.** `prompt_templates` stores `updatedAt`
  only. Editing overwrites irreversibly. A minimal revisions-table fix is
  proposed on the bible's prompt library page.
- **The "Swiss Ephemeris" string in `routes/reports.ts:346` is false** — the
  code uses `astronomy-engine`. It is shown to every user during generation.
  Fix the string, do not fix it by swapping libraries.
- **Houses are whole-sign**, every cusp at 0°. Chiron is a simplified
  Keplerian approximation, not an ephemeris lookup.
- **Inference costs about 0.7% of a €24 sale.** Token ceilings are not a cost
  constraint — do not tighten them to save money.
- **Never commit a `DATABASE_URL`.** Pass it as an env var at the point of use.

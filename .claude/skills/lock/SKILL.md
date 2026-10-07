---
name: lock
description: Lock a Stars Decoded draft spec. Moves docs/specs/draft/<slug>.md to docs/specs/locked/, records every new decision as a Notion Decisions row, edits MASTERFILE.md if the spec changes it, regenerates docs/INDEX.md, then merges it to main the same session. Use when the Owner types /lock <slug> or says "lock it" after an ideation. Not for file, database or git locks.
---

The slug is the text after the command. With none, take the draft spec this
session ideated; if there is none, ask. Work from the draft file, not the
conversation: after a compaction the file is the record.

1. Move `docs/specs/draft/<slug>.md` to `docs/specs/locked/<slug>.md`. Trim to
   200 lines; anything longer moves to `docs/annex/<slug>-annex.md` with a
   pointer left in place.
2. For every item under "Decisions to record", add a row to the Notion
   Decisions database (Status locked, Decided by Alex, Date today, Source
   "ideation: <slug>", Masterfile ref). Link any Mailbox row the decision closes, set it to
   `decided` and drop its id from *Waiting on Alex* in `docs/backlog.md`.
3. If the spec changes anything MASTERFILE.md states, edit the masterfile in
   the same commit and bump its version line.
4. Regenerate `docs/INDEX.md`. Commit as "Lock spec: <slug>".
5. Land it on `main` in the same session; a lock left on a branch is not done (the Owner,
   2026-10-05). Merge `origin/main` into the branch first and, on every conflict, keep what
   main says and only add the lock's own lines: never reword, trim or drop what another
   session wrote. Push, open the pull request from the repo's template, and merge it once CI
   is green; fix a red check the same way, never by skipping it.

Lock the draft spec: $ARGUMENTS

1. Move `docs/specs/draft/<slug>.md` to `docs/specs/locked/<slug>.md`. Trim to
   200 lines; anything longer moves to `docs/annex/<slug>-annex.md` with a
   pointer left in place.
2. For every item under "Decisions to record", add a row to the Notion
   Decisions database (Status locked, Date today, Source "ideation: <slug>",
   Masterfile ref). Link any Mailbox row the decision closes and set it to
   `decided`.
3. If the spec changes anything MASTERFILE.md states, edit the masterfile in
   the same commit and bump its version line.
4. Regenerate `docs/INDEX.md`. Commit as "Lock spec: <slug>".

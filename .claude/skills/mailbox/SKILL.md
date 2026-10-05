---
name: mailbox
description: Walk the Owner through what waits on him in Stars Decoded's Notion, highest stakes first, the open Mailbox rows and the decisions Claude took that he has not ticked, and record each answer as a Decisions row. Use when the Owner types /mailbox or asks to review open topics, gaps or todos. Not email.
---

Any text after the command narrows the review (a row id, a type, a topic).

Never query a Notion database (R-12.7). The open rows are the ids in *Waiting
on Alex* at the end of `docs/backlog.md`; fetch each by its link and skip any
with Owner = Claude. Present them highest stakes first (blocking, launch,
later, then oldest), each as: context in one line, the recommendation, the
default if silent. Then name the Claude decided view (link in R-12.6) and the
count of its unticked rows the session knows of; walk them only if he asks.

For each row the Owner decides: add a Decisions row (Status locked, Decided by
Alex, dated today, Source "mailbox MB-NN"), link it from the Mailbox row, set
the row to `decided` and drop its id from *Waiting on Alex*. For a todo he
confirms done, set `done`. For anything deferred, set `parked` with a one-line
reason. When he overrules a decision Claude took, the new row supersedes it and
`docs/annex/owner-playbook.md` gains the rule his reason teaches.

If MASTERFILE.md states something a new decision changes, edit it in the same
session and bump its version line. Commit `docs/backlog.md` with the session.

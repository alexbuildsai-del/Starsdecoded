---
name: mailbox
description: Walk the open Stars Decoded Notion Mailbox with the Owner, highest stakes first, and turn each decision into a Notion Decisions row. Use when the Owner types /mailbox or asks to review open topics, gaps or todos. Not email.
---

Any text after the command narrows the review (a row id, a type, a topic).

Query the Notion Mailbox (URL in CLAUDE.md) for Status = open, sorted by
Priority then Rounds open. Present the rows highest stakes first, each as:
context in one line, the recommendation, the default if silent.

For each row the Owner decides: add a Decisions row (locked, dated today,
Source "mailbox MB-NN"), link it from the Mailbox row, set the Mailbox row to
`decided`. For a todo the Owner confirms done, set `done`. For anything
deferred, set `parked` with a one-line reason.

If MASTERFILE.md states something a new decision changes, edit it in the same
session and bump its version line.

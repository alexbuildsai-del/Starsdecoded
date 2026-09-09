Mailbox review. $ARGUMENTS

Query the Notion Mailbox (URL in CLAUDE.md) for Status = open, sorted by
Priority then Rounds open. Present the rows highest stakes first, each as:
context in one line, the recommendation, the default if silent.

For each row the Owner decides: add a Decisions row (locked, dated today,
Source "mailbox MB-NN"), link it from the Mailbox row, set the Mailbox row to
`decided`. For a todo the Owner confirms done, set `done`. For anything
deferred, set `parked` with a one-line reason.

If MASTERFILE.md states something a new decision changes, edit it in the same
session and bump its version line.

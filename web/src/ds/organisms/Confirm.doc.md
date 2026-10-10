# Confirm

## Level
Organism.

## What it replaces
`ui/alert-dialog` (Delete report, O15, and the admin's End and Remove) and the consent sheet frame (Stop sharing O16, Hand it back O17).

## Use it for
- A step that cannot be undone, with Cancel beside it.

## Not for
- Something the reader can undo.

## Versions
The Dialog window with a danger button and Cancel. `AlertDialogAction` is the danger button; a caller may pass its own class for a different weight.

## States
Closed, open, pending (the caller disables both buttons and shows the status word).

## Access
- First focus is Cancel, so a stray Enter never confirms.
- Escape closes and returns focus to the opener.
- Both buttons carry a 44 px tap.

## Do
- Name the thing in the title; say what stays in the body.

## Don't
- A danger button alone.

## Live example
`Confirm.example.tsx`, at `/admin/design`.

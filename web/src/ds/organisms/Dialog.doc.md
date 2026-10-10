# Dialog

## Level
Organism.

## What it replaces
The Share window frame (O11) becomes the standard, and `ui/dialog` (Add birth time, O14), the pair picker (O12) and the waitlist box (O18) take it. The home chart screen (O19) and Ask (O13) are kept as they are.

## Use it for
- A task that needs a few fields or a short list and then closes (Share, Add birth time, Two people together).

## Not for
- Anything that can be undone: use the page or a toast.
- A danger action: use Confirm.

## Versions
One window: a bottom sheet under 640 px with a grab bar, a 480 px centred window from 640 px. `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` and `DialogClose` sit inside. The scrim is the `scrim` token; it opens in 300 ms on the house curve (the sheet rises its full height, the window rises 8 px).

## States
Closed, open, closing. Reduced motion shows it with no movement.

## Access
- Focus starts on the first field, never on Close. With nothing to type in, the window itself takes it.
- Escape and Close return focus to the control that opened the window, also when a row opened it from state (B-99).
- Enter inside a field never closes the window (R14-12); a held Enter cannot press Close.
- Title and description are named for the screen reader; Close is 44 px.

## Do
- A caller that must not close mid-send gates `onOpenChange`.

## Don't
- A window over a window, except Stop sharing over Share.

## Live example
`Dialog.example.tsx`, at `/admin/design`.

# LoadingStory

Level: template. One grid for the Personal, Compatibility and Timeline loading screens (ADR-351).

## What it replaces
Nothing visible; it names the grid `LoadingFrame` already draws, with the same slots.

## Slots
`counter`, `title`, `subtitle`, `stage`, `detail`, `pct` (the bar and its line), `door`. Each sits at a fixed share of the frame's height (`.lf` in index.css), the same on every device. No data.

## Use it for
The three generation screens, with the stage each tells its own story in.

## Not for
A page that scrolls; the generation screen locks scroll.

## States
Static. The door rises in once; under reduced motion it appears at once.

## Access
The title is an `h2` inside the screen's dialog; a missing slot leaves its place empty, nothing moves.

## Do and don't
- Do give the parent a height.
- Don't move a slot with its content.

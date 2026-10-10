# Sheet

The one sheet for a short task tied to the screen: credits, add someone, gift, a reading, the method. It rises from the bottom on a phone and slides in from the right on a desktop. A dim scrim sits behind it and the page cannot be reached until it closes.

- `open`, `onOpenChange`: the state, held by the caller. A sheet opened only by its `SheetTrigger` may leave both out.
- `peek`: the dashboard's version. No scrim and the page stays live. It rests at 45% of the screen, opens to 96% on a drag up or a tap on the handle, and closes on a drag down a third of the way or fast. Pass `label` (its name), `contentKey` (changes when it shows someone else) and `selfClosing` (the content draws its own Close).
- `SheetContent side="bottom" | "right"`: bottom has a grab bar that drags down to close.

Motion: 300 ms in, 200 ms out, on the house curve, over the one scrim. Under reduced motion the sheet is simply there, with no slide.

Access: focus moves into the sheet when it opens, stays inside, and returns to the control that opened it. Escape closes it. The close button is 44 px and named "Close". The peek is not modal: Escape inside it closes it, and the circle above answers Escape pressed anywhere else.

Use it for a short task close to what is on screen. Not for a long flow (use a page) and not for a yes or no (use Dialog). One at a time.

Fates: O1 the peek version (quick look). O2 and O3 the peek or the bottom sheet on touch. O4 to O8 the standard. O9 and O10 the right side on a desktop, full width on a phone. The Timeline reading's own `#11161F` fill becomes `raised`.

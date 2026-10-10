# Chip

A short status word in a pill, led by an optional icon. Tones: neutral, now (indigo tint), brass, back, teal.

- `icon`: any node. A ToneDot, a RetrogradeBadge or a 16 px PlanetBody.
- `selected`: the now look, `aria-pressed` on a button, `aria-current` on a link.
- `disabled`: half strength, no pointer.
- `quiet`: sentence case in the body face, for a fact that is not a state.
- Pass `onClick` or `href` and it is a control: the pill stays 24 px, the tap reaches 44 px.

Label 11 px, three words at most. Text contrast is 4.5:1 or more on ground and surface in every tone. `back` reads 4.3:1 on `raised`, so keep it off a sheet.

Fates: P3 neutral, P4 and P7 now, P5 neutral with a ToneDot, P6 teal, P8 brass (label face, not mono), P11 back, P14 neutral link.

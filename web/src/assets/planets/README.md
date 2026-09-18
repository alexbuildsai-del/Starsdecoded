# Planet renders

`lib/planet-renders.ts` imports a `.webp` per planet; the wheel, the hero and
the house cards render them as the bodies of the chart.

The ten files here are the real renders, restored from the Replit workspace on
2026-09-17 (MB-13). They are 192×192 WebP with an alpha channel, 3–5 KB each:
lit spheres with a terminator and a rim light, Saturn with its rings.

    sun.webp  moon.webp  mercury.webp  venus.webp    mars.webp
    jupiter.webp  saturn.webp  uranus.webp  neptune.webp  pluto.webp

## Rules

They are **bodies, never UI**. A planet render belongs on the wheel, a house
card or a chart tile; it never stands in for an icon in a button, a chip or a
nav item. The colour rule in MASTERFILE §9 only works if a body's colour means
"this is the sky" and nothing else borrows it.

192 px is enough for a wheel node, a card and a hero marker at 2× device pixel
ratio. Anything displayed above roughly 90 px needs a larger source: re-export
at 512 px rather than upscaling, which adds no detail.

There is no render for Chiron or the lunar nodes. Those are points rather than
planets and are drawn as glyphs, which is the correct distinction to show.

`web/public/opengraph.jpg`, the social preview image, is still missing and has
no placeholder.

`sun-512.webp` is the Sun at 512 px for the hero plate and the dawn, keyed from
the Owner's render, which arrived with the transparency checkerboard flattened
into it (MB-13: replaced when a true-alpha export exists).

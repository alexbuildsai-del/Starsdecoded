// Written by `pnpm brand:render` (scripts/render-brand.mjs) with web/public/share-cover-v2.jpg; redraw the cover rather than edit it.

/**
 * The share cover's minute and place, its corners as printed, and the ecliptic longitude, to the hundredth, of each
 * body its wheel drew and of the two angles the wheel is set by (reading 15). share-cover.test.ts holds them to skyAt.
 */
export const SHARE_COVER = {
  image: "/share-cover-v2.jpg",
  at: "2026-10-03T07:50:00.000Z",
  place: { city: "London", zone: "Europe/London", lat: 51.51, lon: -0.13 },
  corners: {
    tl: "THE SKY · 3 OCT 2026 · 08:50",
    tr: "OVER LONDON · 51.51°N 0.13°W",
    bl: "WHOLE SIGN · TROPICAL",
    br: "SUN 14.9° ABOVE THE HORIZON",
  },
  degrees: {
    sun: 190.13,
    moon: 97.06,
    mercury: 213.7,
    venus: 218.49,
    mars: 123.04,
    jupiter: 140,
    saturn: 11.39,
    uranus: 65.48,
    neptune: 2.8,
    pluto: 303.11,
    ascendant: 207.7,
    midheaven: 127.01,
  },
} as const;

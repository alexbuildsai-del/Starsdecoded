# Planet renders — placeholders

`ReportPage.tsx` and `components/ui/radial-orbital-natal.tsx` import a `.webp`
per planet and render them as the orbiting nodes of the natal chart wheel.

The ten files here are **1×1 transparent placeholders**, not the real artwork.
The originals are still in the Replit workspace: the integration used to port
this codebase can only read text files, so no binary asset came across.

They are committed rather than omitted so `vite build` resolves every import
and the app builds and deploys. Visually the wheel currently falls back to
nothing where a planet should be — the node itself, its label, retrograde
badge and click behaviour all still work.

## Restoring the real renders

Download `artifacts/astra/src/assets/planets/*.webp` from the Replit project
and overwrite these files, keeping the names exactly:

    sun.webp  moon.webp  mercury.webp  venus.webp    mars.webp
    jupiter.webp  saturn.webp  uranus.webp  neptune.webp  pluto.webp

They are transparent-background 3D planet renders (Saturn includes its rings).
No code change is needed — the imports already point here.

Same story for `web/public/opengraph.jpg`, the social preview image, which did
not come across either and has no placeholder.

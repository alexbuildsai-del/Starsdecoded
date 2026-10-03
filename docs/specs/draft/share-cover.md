# Share cover: draft spec

Ideation 2026-10-03 with the Owner. Status: **final draft**. The Owner chose cover A (3 Oct); Q2 stands at its default.
Artifact: https://claude.ai/artifact/UVrFGzzXDJkDVbTkKxKgYR

The Owner shared https://mystarsdecoded.com/ on WhatsApp and got no image, and the domain in place of
a title. The Owner wants a cover that makes sharing exciting.

## What the session found
- The cover exists. `web/public/opengraph.jpg` (1200 × 630, 61 KB, MB-13, logo lock, Review 01/10 §10)
  is named by `web/src/site/head.ts` (`SHARE_IMAGE`). A production build of `main` today writes
  `og:title`, `og:description`, `og:image` with its width and height, and `twitter:card`
  `summary_large_image` into every prerendered page. The tags sit within the head's first 1.2 KB and
  come before every stylesheet. App routes get the same card through `shellHead()`.
- WhatsApp showed neither the title nor the image, so its fetch returned no usable head. The image's
  size doesn't explain it.
- The session's network cannot reach mystarsdecoded.com, so the live response was not seen. Two causes
  fit: a cached failed preview, or a block at Vercel's edge (bot protection, attack mode or platform
  mitigation). Neither is confirmed.
- Verified (verifier, 2026-10-03; developers' reports on GitHub, not Meta's documentation):
  WhatsApp caches previews per URL, and a new file name or a `?v=` query gets a fresh one
  (github.com/agent-habilis/agent-gossip/issues/16; github.com/zaidkhan9085/job_advertise_fe/pull/66).
  WhatsApp's small preview crops the image to its centre square
  (github.com/akashsabva/MADHAV_TECHNO_CAST/pull/8; github.com/AyoubMoussaoui/printlab-website2/pull/16).
  Markup placed ahead of the OG tags has stopped WhatsApp reading them (github.com/wp-media/wp-rocket/issues/4507).
  Ours has none.
- Unverified, so they shape no rule here: Meta's WhatsApp link-preview limits (300 KB of HTML, 600 KB
  image, 4:1) and every Vercel firewall claim. Their hosts were blocked for the researcher and the
  verifier alike. The checks below are sized so they hold whichever way those limits turn out.

## Scope
1. **A new cover, A: headline and wheel** (the Owner's pick, Q1). 1200 × 630, the home page's hero
   as a still. On the left: the eyebrow "PERSONAL REPORT", the h1 "Find out what your birth chart
   *says about you*" as the page sets it, the line "A report on how you think, work and love, with
   every claim pointing to your chart." and the wordmark (mark and Newsreader) at the foot. On the
   right: the home page's own `HorizonWheel`, with the engine's positions (`skyAt`) for one stated
   minute over London, the home page's default place. Every body sits at its true degree (R-3.1).
   The horizon line runs the full width. The corner labels stay in mono: the minute as "THE SKY ·
   3 OCT 2026 · 08:50", the place with its coordinates, "WHOLE SIGN · TROPICAL" and the Sun's
   altitude. A still never says "Live". Accepted trade-off: WhatsApp's small square preview cuts
   both the headline and the wheel (artifact, cover A); the large preview is the one designed for.
2. **Rendered by `pnpm brand:render`** (`scripts/render-brand.mjs`), which takes the minute as an
   argument and defaults to now. It writes `web/public/share-cover-v2.jpg` (JPEG, under 150 KB). The
   SVG mark and the planet renders stay the sources (ADR-31). The cover is redrawn by hand when the
   wheel's look changes, not on a schedule.
3. **A new file name.** `SHARE_IMAGE` in `head.ts` points at `/share-cover-v2.jpg`, so no cached
   preview can stand in for it. `opengraph.jpg` is deleted once nothing names it; `head.test.ts`
   pins the new path. Every page and app link (gift, invite) uses it through `socialTags`.
4. **A preview check in the deploy smoke** (`smoke-run.yml`, keyless, ADR-192). For the deployed web
   URL: fetch `/` as `WhatsApp/2.24 A` and as `facebookexternalhit/1.1`. Each must return 200, and its
   head must name `og:image` with the cover's absolute URL, plus `og:title`. Then fetch that image
   with the same agents: 200, `image/jpeg`, 600 KB or less, a full body rather than a 206. A miss
   fails the run and names the agent and the status. The check runs from GitHub's network, so it
   catches a block by user agent or a challenge page. It cannot see a block keyed to Meta's own
   addresses. If the Owner's Q2 test still says no after the round, the round report says so and
   names the Vercel firewall switch to check (a dashboard setting only the Owner can change, R-12.5).

## Out of scope
A cover per page (/sample, /sky) or per report (MB-104); a cover redrawn daily or at request time
(an image function at the edge); any change to the title or description text; the 9:16 stories and
the report share card (ADR-103, 175).

## Acceptance criteria
1. `share-cover-v2.jpg` is 1200 × 630, JPEG, under 150 KB, and matches cover A in the artifact. Every
   body's degree equals `skyAt` for the stamped minute over London, and a unit test pins the minute
   the committed image was drawn for.
2. Nothing overlaps: the headline, line and wordmark clear the wheel's ring and its labels; no
   label is cut at the image's edges except the horizon line, which runs off both sides.
3. The prerendered head of every public page, `app.html` and `404.html` names
   `https://mystarsdecoded.com/share-cover-v2.jpg`. No file names `opengraph.jpg`.
4. The smoke's preview step passes on the staging preview and on production after the Release. With
   the image removed, the step fails and names `og:image`.
5. The Owner shares the bare https://mystarsdecoded.com/ on WhatsApp after the Release and sees
   cover A with the title. That is the Owner's yes or no.

## Screens
Artifact: https://claude.ai/artifact/UVrFGzzXDJkDVbTkKxKgYR. It shows the Owner's screenshot, the
three covers (A headline and wheel, chosen; B wheel centred; C today's card) in WhatsApp's full and
small layouts, and the build list.

## Open questions
- **Q1. Which cover?** Answered 3 Oct: A. Recommended B. The Owner found B nice but not "wow",
  and liked that A says what the product is.
- **Q2. The Owner's test.** Send `mystarsdecoded.com/?v=2` to yourself on WhatsApp: does today's card
  show? Yes means a cached preview, and the new file name fixes it. No means a block, and the smoke
  finds what kind. Unanswered; the default stands: the smoke answers it on its first deploy.
- **Later, not this spec.** The Owner wants a more striking visual than the wheel one day ("not
  wow"). No candidate yet; held as a Mailbox idea (https://app.notion.com/p/3eefefe7493181819339d9205fba797c), not built here.

## Decisions to record
1. The share cover is the home page's hero as a still: the headline left, the live wheel right for
   one stated minute over London, the wordmark at the foot; it supersedes the type-only card (MB-13,
   Review 01/10 §10). It is a still, so it never says "Live". The small square preview's crop is an
   accepted cost (the Owner, 2026-10-03).
2. A new cover ships under a new file name, never over the old one.
3. The deploy smoke fetches the home page and the cover as WhatsApp and Facebook's crawler, and a
   missing or blocked preview fails the run.

Tier hint for /plan: one card, builder-sonnet (render script, `head.ts` and its test, smoke step).
Touches no brain file; no dry lab.

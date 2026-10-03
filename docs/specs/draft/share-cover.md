# Share cover: draft spec

Ideation 2026-10-03 with the Owner. Status: **draft**, waiting on the Owner's answers to Q1 and Q2.
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
1. **A new cover, B: the wheel centred** (default, Q1). 1200 × 630, drawn from the home page's own
   `HorizonWheel` with the engine's positions (`skyAt`) for one stated minute over London, the home
   page's default place. Every body sits at its true degree (R-3.1). The whole wheel sits inside the
   centre 630 × 630 square, so WhatsApp's small preview still shows all of it. The wordmark (mark and
   Newsreader) is top left. "What does yours say about you?" sits bottom right in Newsreader. The
   corner labels stay in mono: the minute as "THE SKY · 3 OCT 2026 · 08:50", the place with its
   coordinates, "WHOLE SIGN · TROPICAL" and the Sun's altitude. A still never says "Live".
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
1. `share-cover-v2.jpg` is 1200 × 630, JPEG, under 150 KB, and matches cover B in the artifact. Every
   body's degree equals `skyAt` for the stamped minute over London, and a unit test pins the minute
   the committed image was drawn for.
2. The centre 630 × 630 crop holds the whole wheel and its ring, with no label cut.
3. The prerendered head of every public page, `app.html` and `404.html` names
   `https://mystarsdecoded.com/share-cover-v2.jpg`. No file names `opengraph.jpg`.
4. The smoke's preview step passes on the staging preview and on production after the Release. With
   the image removed, the step fails and names `og:image`.
5. The Owner shares the bare https://mystarsdecoded.com/ on WhatsApp after the Release and sees
   cover B with the title. That is the Owner's yes or no.

## Screens
Artifact: https://claude.ai/artifact/UVrFGzzXDJkDVbTkKxKgYR. It shows the Owner's screenshot, the
three covers (B wheel centred, A headline and wheel, C today's card) in WhatsApp's full and small
layouts, and the build list. A and C fail the centre-square crop.

## Open questions
- **Q1. Which cover?** Recommendation B. Default B.
- **Q2. The Owner's test.** Send `mystarsdecoded.com/?v=2` to yourself on WhatsApp: does today's card
  show? Yes means a cached preview, and the new file name fixes it. No means a block, and the smoke
  finds what kind. Default: the smoke answers it on its first deploy.

## Decisions to record
1. The share cover is the home page's wheel centred, for one stated minute over London, with the
   wordmark and "What does yours say about you?"; it supersedes the type-only card (MB-13, Review
   01/10 §10). It is a still, so it never says "Live".
2. A new cover ships under a new file name, never over the old one.
3. The deploy smoke fetches the home page and the cover as WhatsApp and Facebook's crawler, and a
   missing or blocked preview fails the run.

Tier hint for /plan: one card, builder-sonnet (render script, `head.ts` and its test, smoke step).
Touches no brain file; no dry lab.

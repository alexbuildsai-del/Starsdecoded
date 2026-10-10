# R20 plan — the design system, whole

Planned 2026-10-10 on `claude/plan-r20-tl88ac` from `main` at 7d70ace (PR #142: `design-system` locked); revised the same day on the
Owner's answer "All in r20" (ADR-439, superseding ADR-437). **Spec:** `design-system` whole (locked 2026-10-10, ADR-423 to 436): its R20
and R21 lists, every part of Scope 2, Scope 8's Chart part with its check rule and critical test, emails, share image and post kit on
`tokens.ts`, `check:ds` to zero. **Fixes:** B-09, B-12 and B-99 in the cards whose files they share; QA-08's sev-1 confirmed at Round
start. **Size:** 36 cards in three groups (12, 11, 13). **Tiers:** 6 Opus, 29 Sonnet, 1 Haiku. **Tags:** INTERNAL are R20-01, 02, 04,
21, 35 and 36; the other 30 are USER-FACING (the look moves on every screen within the spec's list; the house card's planet row comes
back). **The brain is not touched** (no prompt, engine or `models.ts` file), so no version moves and the dry lab does not run (spec
Out of scope). **No schema change, no contract change, no new npm dependency**: `@workspace/design` is a workspace link, so the
lockfile moves only in its importer lines. `web/test.critical` gains one test (R20-21, the Owner asked for it, ADR-273). Nothing
spends, nothing needs a credential, nothing goes on GitHub, production sells nothing (ADR-167).

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12, no error reporting or alerting. No card waits on it. (Ages from each row's Raised date; MB-102, raised
2026-09-26, is 14 days old today, not over.)

## Round number, size and order
R19 is the last round and has its report (closed 2026-10-09, lessons in db5ccaf, 945cb2b). Since then: QA-08 (its sev-1, the walk
stopping at `buy`, was fixed by R19-51 in PR #134, after QA-08's commit) and the `design-system` lock. No Mailbox row is `blocking`
and no card sits on an open row. `design-system` is the only locked spec without a round, and R20 takes all of it (ADR-439). Three
groups, the most ADR-283 allows: the tokens, the check and the small parts (atoms and molecules) first; then the big parts that
compose them (organisms, the Chart part, templates) and the readers outside the web; then every screen onto all of it, its charts
drawn by the Chart part, with the docs. Leftover re-exports are deleted by the orchestrator after group 3. Pricing and launch stay
unplanned (ADR-230, 242).

## Round start (the orchestrator)
1. Branch `round/R20` from `main` with this plan. Re-read `lessons.md` for any line added after R19's close (ADR-265).
2. **QA-08 #1 (sev-1):** read `GET /api/qa/latest` on staging for `main`'s head. Green: noted in the report. Red at `buy` again: a
   fix card (Sonnet, `api/src/lib/qaWalk/browser.ts` only) runs before group 1, its done-when the walk green on staging.
3. **The artifact** (builders can't open claude.ai): from the Design System (https://claude.ai/artifact/1t3VBK8eqDmqC2pTZbWd8i, v4)
   extract into the scratchpad: `tokens.json`; every part's card (versions, states, access, do and don't, Today beside After); the
   numbered examples (B, C, K, T, P, W, X, F, O, N, R) with their fates; the Charts group (its 12 parts, the ChartStates table of 9
   states, the interactive states, `line-easy` and `line-tense`); Flows (60 steps, 11 cards, each with how it works, must keep, what
   changes); the Personal report (51), Compatibility (19) and Timeline (53) parts with their must-keep lists; Motion (52 motions and
   their still final frames). Where a draft differs, the artifact wins and the report says so. Its CSS is a picture, never copied.
4. **Before pictures** on the base commit: every public page at 390 px; the buyer walk run locally with its pictures (dashboard,
   account, checkout, the loading screens, the report, Timeline's setup); the admin pages at 1280. Kept in the scratchpad by screen.
5. **The baseline (ADR-440):** R20-02 counts it from the round's base commit in a scratch worktree, so no other card is in it.
6. `pnpm install --frozen-lockfile`. R20-01 alone adds a `package.json` (a workspace package; no registry package).

## What already stands (audit at 7d70ace)
- **Met, reused:** Tailwind v4 with `@theme inline` in `index.css`; shadcn and Radix in `components/ui`; `framer-motion`;
  `wheel-geometry.ts` (`wheelRadii`, `theta`) with its critical test; `NatalWheel`, `HouseObject`; `StatusDots` (25 importers), `Mark`,
  `Wordmark` (8), `ProgressBar`; the site's 46 px button; `check:shipped`, `check:callers`, `check:copies` in CI; the admin guard.
- **Not met:** everything in the spec: `packages/design`, `web/src/ds`, `check:ds`, `/admin/design`, the Chart part and its test;
  the shadcn map renders #6872CA; four palette copies; 23 copies of the curve; no `MotionConfig`; 29 files draw an `<svg>`.
- **Found while planning:** (1) `ui/tooltip` is mounted as `TooltipProvider` in `App.tsx` and `entry-server.tsx` though nothing
  renders a tooltip: R20-04 removes both lines with the file. (2) `EvidenceLine`, `SaveReportCta`, `AspectChip` have no importer. (3)
  16 native selects; Select is Field's look (ADR-439 keeps ADR-437's reading). (4) `render-brand.mjs` and the kit's `wheel.mjs` read
  `index.css`: R20-23 moves them to `tokens.json`. (5) No markdown library: `/admin/design` renders the doc pages with a small
  in-house renderer. (6) The Charts page can't be shot keylessly behind the admin: ADR-441. (7) The Timeline dial, the share image and
  print are open in Scope 2: ADR-442. (8) `.mjs` readers can't import `tokens.ts`: `tokens.json` is its plain mirror, both checked
  equal to `tokens.css` by `check:ds` (not a DTCG file). (9) B-99 (focus after Escape) is Dialog's focus return: R20-14.

## How this plan reads the spec
1. **Names** (ADR-439, keeping ADR-437's reading): Numeral is Numbers, Field is Input and Input with a button, Alert is InlineError
   and Alert, Text is the Inter text styles, Select is Field's look over a native select; AppHeader is TopBar; Popover is ClaimPopover.
2. **Lift, don't redraw** (ADR-440): a literal equal to a token takes it; a near copy (each channel within 6) snaps; an outlier takes
   its standard part's colour and is listed before and after. Visible changes are only the spec's: the floors, near copies, outliers
   on the standard part, indigo-lt for indigo text, white on indigo (B-09), 3:1 edges, Inter 500 buttons, the 46 px app button, Share
   at the card row's far end, the birth fields proposal, the house card's planet row, one Wordmark.
3. **The chart is one chart** (Scope 8): every chart on every page is drawn by `web/src/ds/organisms/chart/` on `wheelRadii`; a
   drawing whose look has no state in ChartStates keeps its drawing on `tokens.ts` values and is listed (ADR-442), never invented.
4. **Moves without breaking callers:** a part that replaces a shared file (`StatusDots`, `Mark`, `Wordmark`, `ProgressBar`,
   `NatalWheel`, `HouseObject`, `ui/sheet`, `ui/dialog`, `ui/alert-dialog`, `ui/dropdown-menu`, `ui/popover`, the report's
   `HouseCard`, `HouseBlocks`, `Checklist`, `Citation`, `EvidenceCard`, the birth fields) moves into `web/src/ds` and leaves a
   one-line re-export at the old path; group 3 switches every import; the orchestrator deletes the re-exports and `ui/*` files nobody
   imports after group 3.
5. **Motion:** one `--ease` and three durations replace each copy in a card's files; the 52 motions keep their timelines with a
   still final frame under reduced motion; loading stories, backgrounds and parallax keep their own timelines.

## Goals
1. **QA-08's sev-1 stays fixed:** the deploy walk green through `buy` on `main` before group 1 (R19-51), or a fix card first.
2. **Tokens, one source, read everywhere** (Scope 1; acceptance 1, 2, 4): `packages/design` with `tokens.css`, its checked
   `tokens.ts` and `tokens.json`; the shadcn map; the palette copies and leftovers gone; type, corners, motion, depth, one
   `MotionConfig`; the emails, `render-brand`, the share image and the post kit on `tokens.ts`; with B-09.
3. **Every part, with its page** (Scope 2, 3; acceptance 5): atoms, molecules, organisms, the Chart part's 12 parts in their states,
   templates, the flows on Sheet and Dialog, at `/admin/design` Today beside After; nothing tagged Removed kept.
4. **Every screen on the parts, every chart the one Chart** (Scope 2, 7, 8; acceptance 3, 7, 9): dashboard, report, Timeline and Ask,
   site, checkout, sign-in and the birth form, loading and share, admin; before and after at 390 px; `chart-consistency.test.ts` in
   the critical tier; with B-12 and B-99.
5. **The check at zero and the docs** (Scope 4 to 6; acceptance 6): `check:ds` in CI with its contrast pairs and chart rule, at zero
   outside the allow-listed drawings at the close; the Charts shot in site-checks (ADR-441); `/web-taste` and MASTERFILE §9 point at
   the library; the Design System artifact republished.

## Preconditions
1. Builders read MASTERFILE §0 and §9, `design-system.md`, their card, Pinned shapes and Round start 3's extracts for their parts or
   screens; UI cards read `/web-taste`.
2. **Single owners.** No file in two cards of a group. Across groups, one card a group: `web/src/App.tsx` → R20-04 (1), R20-32 (3,
   Clerk's appearance); each re-exported old path → its part's card (1 or 2), then the orchestrator after group 3;
   `web/test.critical` → R20-21 alone; `.github/workflows/site-checks.yml` → R20-21; `ci.yml` → R20-02; `scripts/ds-baseline.json` →
   R20-02, then the orchestrator.
3. Inside a group a card may land before one it imports from (pinned shapes): a red intermediate is accepted until the group ends;
   every group ends with typecheck, the critical tier, the buyer walk and `check:ds` green.
4. **The promoted rules** (`lessons.md`): grep every caller before changing a shared export or value; commit with a pathspec; never
   pkill or killall a shared process; stop the PIDs you started and leave no logs in the tree.
5. **No words move**, except the house card's planet row (R20-18, its spec's words). A part's accessible name keeps today's words.

## Pinned shapes
- **Tokens** (`@workspace/design`): `tokens.css` is a Tailwind v4 `@theme` with `--color-<name>` for the spec's 37 colours (void,
  ground, surface, raised, line, line-soft, line-strong, control-edge, paper, paper-dim, muted, label-dim, indigo, indigo-hover,
  on-indigo, indigo-lt, violet, brass, brass-dim, rose, back, error, teal, ...), chart data `line-easy`, `line-tense`, the chapter and
  element hues; `--text-<style>` for the named type styles; `--radius-inner|control|card|sheet|pill`; `--ease`, `--dur-fast|base|slow`;
  `--scrim`; `--shadow-card|raised`. `tokens.ts` exports `tokens` and `ROLE_PAIRS: { fg; bg; kind: "text" | "edge" }[]`;
  `tokens.json` the same values. Exports: `"./tokens.css"`, `"./tokens.json"`, `".": "./src/tokens.ts"`.
- **Parts** at `web/src/ds/<atoms|molecules|organisms|templates>/<Part>.tsx` with `<Part>.doc.md` and `<Part>.example.tsx`
  (default export: every version and state, Today beside After). No barrel. Import as `@/ds/atoms/Button`.
- `Button { variant?: "primary" | "secondary" | "danger"; size?: "default" | "compact"; full?; busy?: string; asChild? }`,
  `TextButton` · `Eyebrow { kind?: "kicker" | "label" }` · `Heading { style; as? }` · `Text { style?; as? }` · `Numbers { size? }`
  · `Chip { icon?; tone?; selected? }` · `ToneDot { tone }` · `RetrogradeBadge` · `PlanetBody { body; size }` · `SignRing`,
  `TriadRing` (drawn on `wheelRadii`) · `Input`, `InputWithButton { button }`, `Select`, `TickBox { checked; onChange; label }` ·
  `StatusDots`, `Skeleton`, `Progress` (today's `ProgressBar` props), `Loader`, `Mark`, `Wordmark`, `Logo`.
- `Card { variant?: "surface" | "glass" | "tint" | "tone"; tone? }`, `CardActions { share? }` · `Alert { tone }`, `InlineError` ·
  `SegmentedControl { options; value; onChange }` · `Well`, `Strip`, `EmptyState`, `PlacementLabel { body; deg; sign; house? }`,
  `ChoiceTile`.
- `Sheet { open; onOpenChange; peek? }` · `Dialog { open; onOpenChange; title }` (focus returns to the opener), `Confirm` · `Menu` ·
  `ClaimPopover` (a bottom sheet on touch) · `TopBar`, `Footer` · `BirthFields` (today's fields' values and callbacks) ·
  `ReportBlocks`, `HouseCard`, `Checklist` (today's props, plus the planet row) · templates `SitePage`, `ReportPage`, `TimelinePage`,
  `AppPage`, `LoadingStory`, `AdminPage` (slots, no data).
- **Chart** (`web/src/ds/organisms/chart/`): `buildScene(chart, state, size): Scene` (pure, no DOM; `Scene.layers`, each body's
  `{ id, angle, radius, retrograde }`); `<Chart chart state size />` renders a scene; `ChartState` is the 9 states of the artifact's
  ChartStates table; `wheel-geometry.ts` stays where it is.

## Parallel groups
**Group 1**, one message, 12 cards with no file in common: R20-01 to R20-12. The parts and R20-03 read R20-01's names as pinned; R20-02
reads `ROLE_PAIRS` and counts the base; R20-04 globs every doc and example. The orchestrator lowers the baseline. Push once.
**Group 2**, one message once group 1 is green, 11 cards: R20-13 to R20-23. The organisms compose group 1's parts; R20-15's
ClaimPopover uses R20-13's Sheet on touch; R20-21 tests R20-20's `buildScene`; R20-22 and 23 read `tokens.ts` and `tokens.json`.
Baseline lowered. Push once.
**Group 3**, one message once group 2 is green, 13 cards: R20-24 to R20-36, each an area with its own files, on every part, its
charts through the Chart part. Then the orchestrator deletes the unused re-exports and runs the gate. Push once.
A card that can't finish takes the roster's one Opus retry; what still can't finish is a backlog line at the close, with no round.

---

## Group 1 — tokens, the check, the base CSS, the admin page, atoms and molecules

### R20-01 — The tokens package (INTERNAL)
Tier: sonnet — every value is given by the spec and `tokens.json`; a package and three files
Objective: `@workspace/design` holds the one source: `tokens.css`, its mirrors `tokens.ts` and `tokens.json`, as pinned.
Files: new `packages/design/` (`package.json`, `tsconfig.json`, `src/tokens.css`, `src/tokens.ts`, `src/tokens.json`); root
`tsconfig.json`; `web/package.json`, `api/package.json` (the workspace dependency); `pnpm-lock.yaml` (importer lines only).
Refs: design-system Scope 1, Settled 4, 8; ADR-423 to 426; Round start 3; pinned Tokens; lessons R14-01, R14-14.
Done when: the colours, type styles, corners, motion, scrim and depths as pinned, chapter and element hues as a data group;
`ROLE_PAIRS` lists every pair the artifact's Colours card declares; the lockfile gains only the links (named in the report);
typecheck, `build:web` and `build:api` green.

### R20-02 — `pnpm check:ds`: the ratchet, the contrast pairs and the chart rule (INTERNAL)
Tier: sonnet — a keyless counting script like `check:shipped`, its rules written in the spec
Objective: count hex and rgb literals, arbitrary `text-[..]` and `rounded-[..]`, raw colour utilities and raw styled `<button>`s
outside `packages/design` and `web/src/ds`, per file, against `scripts/ds-baseline.json`; fail on a rise; `--write` lowers it;
`--suggest` names a literal's token within 6 (ADR-440); every `ROLE_PAIRS` pair at 4.5:1 text, 3:1 edge; `tokens.ts` and
`tokens.json` equal to `tokens.css`; the chart rule: a radius, ring or glyph outside `ds/organisms/chart/` and `wheel-geometry.ts`, or
a chart colour other than `line-easy`, `line-tense`, `back`, `rose`, `teal`, `brass`, fails; a drawing allow-list file (ADR-442).
Files: new `scripts/check-ds.ts`, `scripts/ds-baseline.json`, `scripts/ds-drawings.json`; `scripts/package.json`; root
`package.json`; `.github/workflows/ci.yml` (a step beside `check:shipped`).
Refs: design-system Scope 5, 8, acceptance 4, 6, 9; ADR-429, 435, 440, 442; ADR-192, 273.
Done when: the baseline counted on the base commit; a literal added to a screen fails and `--write` never raises a count; a pair
under its ratio fails naming both hexes; reads `.ts`, `.tsx`, `.css`, `.mjs` only; typecheck and the critical tier green.

### R20-03 — The base CSS onto the tokens: the shadcn map, one palette, one curve (USER-FACING)
Tier: opus — four palette copies disagree today; which value each role takes is seen on every screen and in Clerk's theme
Objective: `index.css` imports `tokens.css`; the shadcn names map onto the roles (`primary-foreground` → `on-indigo`), so
`bg-primary` is #5C6BC0; `sidebar-*`, `chart-1..5`, `elevate-*`, the outline variables and `@replit` comments go; `.rp-root` and
`.sd` read the tokens; every curve and duration here is `--ease`, `--dur-*`; the reduced-motion block (index.css:242-248) gives the
opening screen's cross-fade its still final frame; one `MotionConfig reducedMotion="user"` at the root; the print styles read the
tokens (ADR-442). B-09.
Files: `web/src/index.css`, `web/src/site/site.css`, `web/src/main.tsx`, `web/components.json`.
Refs: design-system Scope 1 (shadcn names, Motion, Hover, Depth), acceptance 1, 2, 4; ADR-424 to 426; B-09; the caller rule.
Done when: every reader of a removed variable grepped (Clerk's `shadcn.css`, `components/ui/*`) and none broken; `bg-primary` and
`text-[#5C6BC0]` compute the same colour in a real browser; public pages, dashboard and report at 390 px beside the before, only the
spec's changes; typecheck, both builds, the critical tier and `check:ds` green.

### R20-04 — `/admin/design`, and the Removed parts go (INTERNAL)
Tier: sonnet — an admin page on the existing guard, no API, no prerender; four deletions with no importer
Objective: an admin-gated page listing every part by level, its doc page rendered and its example live, Today beside After, with a
Charts section (one page per chart part); delete `EvidenceLine`, `SaveReportCta`, `AspectChip`, `ui/tooltip` and `TooltipProvider`.
Files: new `web/src/pages/AdminDesignPage.tsx`, new `web/src/lib/doc-page.ts` (headings, lists, paragraphs, code); `web/src/App.tsx`
(the route, the provider); `web/src/entry-server.tsx` (the provider); the four deleted files.
Refs: design-system Scope 2 (Removed), 3, 4, acceptance 5; Settled 6; ADR-430; lesson R15-16.
Done when: `import.meta.glob` finds every `ds/**/*.doc.md` and `*.example.tsx`, so a new part shows with no edit; a non-admin gets
what the other admin routes give; not prerendered; no new dependency; at 1280 and 390 px on real shots; typecheck, both builds,
prerender and the critical tier green.

### R20-05 — Button, TextButton and StatusDots (USER-FACING)
Tier: sonnet — the artifact's Button card and the site's 46 px button are the spec; props pinned
Objective: Button (primary, secondary, danger, full; compact 36 px with a 44 px tap; `busy` as StatusDots with its word, keeping an
accessible name: B-11's button half) in Inter 500, hover on `indigo-hover`; TextButton; StatusDots moved, its old path re-exported.
Files: new `web/src/ds/atoms/{Button,TextButton,StatusDots}.{tsx,doc.md,example.tsx}`; `web/src/components/StatusDots.tsx`.
Refs: design-system Scope 2 (Button), 3, 7; Settled 5; ADR-434, 436; ADR-130, 333; pinned shapes; the caller rule.
Done when: each version and state in its example; 44 px tap measured; text 4.5:1 in every state; the doc page has every heading
Scope 3 lists; StatusDots' 25 importers unchanged; typecheck and the critical tier green.

### R20-06 — Eyebrow, Heading, Text and Numbers (USER-FACING)
Tier: sonnet — the named type styles are in the tokens; four thin parts
Objective: Eyebrow (Space Grotesk kicker and label), Heading (the Newsreader styles, any tag), Text (the Inter styles), Numbers
(Plex Mono, tabular, three sizes); nothing below 11 px.
Files: new `web/src/ds/atoms/{Eyebrow,Heading,Text,Numbers}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 1 (Type), 2, 3; Settled 8; ADR-425, 436.
Done when: each style beside the K and T examples it replaces, by number; doc pages complete; typecheck and the critical tier green.

### R20-07 — Chip, ToneDot, RetrogradeBadge (USER-FACING)
Tier: sonnet — the artifact's P examples and the chart system's `back` settle all three
Objective: Chip with its icon slot (ToneDot, RetrogradeBadge, PlanetBody), selected and disabled, a 44 px tap as a control; ToneDot
for Heavy, Mixed, Light and a hue; RetrogradeBadge in `back`.
Files: new `web/src/ds/atoms/{Chip,ToneDot,RetrogradeBadge}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 1 (back, rose), 2 (Chip), 3, 7; ADR-426, 432.
Done when: every P example's fate shown; label at least 11 px; contrast passes on each tone; typecheck and the critical tier green.

### R20-08 — Input, Input with a button, Select, TickBox (USER-FACING)
Tier: sonnet — the F examples, `control-edge` and ADR-439's Select reading settle them
Objective: Input (one label style, a 3:1 edge, focus ring, error), InputWithButton (Share, Join the waitlist), Select (native,
Field's look, 44 px), TickBox (the check stays shown when ticked, a 44 px row, silent).
Files: new `web/src/ds/atoms/{Input,InputWithButton,Select,TickBox}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 1, 2, 3, 7; ADR-426, 439; ADR-24, 48.
Done when: edge 3:1 and text 4.5:1 in every state; label and keyboard wiring on real shots; typecheck and the critical tier green.

### R20-09 — Skeleton and Progress, Loader, Mark, Wordmark, Logo (USER-FACING)
Tier: sonnet — moves three parts and adds three from the W examples and the logo spec
Objective: ProgressBar becomes Progress; Mark and Wordmark move (old paths re-exported); Skeleton; Loader (StatusDots under 3 s, a step
bar over 5 s); Logo (Mark, Wordmark, app icon; one Wordmark replaces three copies).
Files: new `web/src/ds/atoms/{Skeleton,Progress,Loader,Mark,Wordmark,Logo}.{tsx,doc.md,example.tsx}`;
`web/src/components/loading/ProgressBar.tsx`, `web/src/components/Mark.tsx`, `web/src/components/Wordmark.tsx`.
Refs: design-system Scope 2 (atoms), 3; logo spec; ADR-394; the caller rule.
Done when: Mark's SVG paths byte for byte; `progress.test.ts` and `OpeningOverlay.test.ts` green; every importer works through the
re-exports; typecheck, `build:web` and the critical tier green.

### R20-10 — PlanetBody, SignRing, TriadRing (USER-FACING)
Tier: sonnet — three drawings from the artifact on `wheelRadii`, replacing four sign rings and three triad rings
Objective: PlanetBody (a render, never UI), SignRing and TriadRing as the one drawing of each, on `wheel-geometry.ts`, colours from
`tokens.ts`.
Files: new `web/src/ds/atoms/{PlanetBody,SignRing,TriadRing}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 2, 8; MASTERFILE §9 (the picture is the chart; renders are bodies); ADR-435.
Done when: each beside the copies it replaces (files named in the report); every glyph at `theta(longitude)` on audrey-hepburn and
one fixture with no birth time; typecheck and the critical tier green.

### R20-11 — Card, Alert and InlineError, SegmentedControl (USER-FACING)
Tier: sonnet — today's favourite card is the standard; the C and X examples give every version
Objective: Card (surface, glass, tint, tone; label, title, body, data line, actions; Share at the row's far end), Alert and
InlineError, SegmentedControl (arrow keys, 44 px segments).
Files: new `web/src/ds/molecules/{Card,Alert,SegmentedControl}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 2, 3, 7; Settled 8; ADR-432; ADR-333.
Done when: every C and X example's fate shown; titles 20 and 17 px; Enter never submits from the control; typecheck and the critical
tier green.

### R20-12 — Well and Strip, EmptyState, PlacementLabel, ChoiceTile (USER-FACING)
Tier: sonnet — each drawn in the artifact with its states; PlacementLabel's format is the spec's
Objective: Well and Strip; EmptyState; PlacementLabel ("Mercury · 0°19′ · Gemini · 5th house", a row version, no house without a
birth time); ChoiceTile (its title in Inter).
Files: new `web/src/ds/molecules/{Well,Strip,EmptyState,PlacementLabel,ChoiceTile}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 2, 3; Settled 9; MASTERFILE §9 (Plex Mono for degrees).
Done when: every state in its example, degrees from a fixture computed at run time; typecheck and the critical tier green.

---

## Group 2 — organisms, the Chart part, templates, and the readers outside the web

### R20-13 — Sheet: one bottom sheet and the peek version (USER-FACING)
Tier: sonnet — the O examples and HIG Sheets settle it; four sheets become one
Objective: Sheet on Radix with `--scrim`, `--dur-base` in and 200 ms out, the dashboard's peek version, one at a time; `ui/sheet`
re-exported.
Files: new `web/src/ds/organisms/Sheet.{tsx,doc.md,example.tsx}`; `web/src/components/ui/sheet.tsx`.
Refs: design-system Scope 1 (Motion), 2 (Sheet), 7; ADR-426.
Done when: focus trapped and returned; reduced motion's still frame; the four sheets' examples' fates; typecheck and the critical
tier green.

### R20-14 — Dialog and Confirm, with B-99 (USER-FACING)
Tier: sonnet — today's Share frame is the standard; focus return is the WAI-ARIA dialog pattern
Objective: Dialog (the Share frame), Confirm (today's alert dialogs); focus returns to the opener on close, Escape included (B-99);
`ui/dialog` and `ui/alert-dialog` re-exported.
Files: new `web/src/ds/organisms/{Dialog,Confirm}.{tsx,doc.md,example.tsx}`; `components/ui/{dialog,alert-dialog}.tsx`.
Refs: design-system Scope 2 (Dialog, Confirms), 7; B-99; lesson R14-12.
Done when: Escape returns focus to the control that opened it; Enter never closes; typecheck and the critical tier green.

### R20-15 — Menu and ClaimPopover (USER-FACING)
Tier: sonnet — the Menu card's four states and the citation's evidence card are drawn
Objective: Menu (closed, open, hovered, disabled; `ui/dropdown-menu` re-exported); ClaimPopover (the citation mark and its
evidence card, a Sheet on touch; `Citation`, `EvidenceCard` and `ui/popover` re-exported).
Files: new `web/src/ds/organisms/{Menu,ClaimPopover}.{tsx,doc.md,example.tsx}`; `components/ui/{dropdown-menu,popover}.tsx`;
`components/report/{Citation,EvidenceCard}.tsx`.
Refs: design-system Scope 2; MASTERFILE §9 (evidence looks like the report's, ADR-172); ADR-60.
Done when: a claim's evidence opens by tap and keyboard at 390 and 1440 px; typecheck and the critical tier green.

### R20-16 — TopBar and Footer (USER-FACING)
Tier: sonnet — the N examples give each top bar's fate
Objective: TopBar (the app's, the site's, checkout's and the admin's as versions) and Footer, on Logo and Button.
Files: new `web/src/ds/organisms/{TopBar,Footer}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 2 (TopBar, Footer); ADR-439.
Done when: every N example's fate shown; taps 44 px; typecheck and the critical tier green.

### R20-17 — The six templates (USER-FACING)
Tier: sonnet — layout shells with slots, from the artifact's templates
Objective: SitePage, ReportPage, TimelinePage, AppPage, LoadingStory (the one loading grid's slots, ADR-351), AdminPage.
Files: new `web/src/ds/templates/{SitePage,ReportPage,TimelinePage,AppPage,LoadingStory,AdminPage}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 2 (Templates); MASTERFILE §9 (two tempos, the loading grid); ADR-351.
Done when: each holds its slots with no data; at 390 and 1440 px; typecheck and the critical tier green.

### R20-18 — ReportBlocks, HouseCard with its planet row, Checklist (USER-FACING)
Tier: opus — words a reader sees come back on every house card, and the R19 block order must hold
Objective: the house card as an organism, its planet row restored (removed by R19-48) as the artifact draws it, R19's blocks and order
kept (Often noticed, stellium, going backwards; no "Opposite:"); ReportBlocks; Checklist (ticks silent); the old paths re-exported.
Files: new `web/src/ds/organisms/{HouseCard,ReportBlocks,Checklist}.{tsx,doc.md,example.tsx}`;
`components/report/{HouseCard,HouseBlocks,Checklist}.tsx`; `components/report/HouseCard.test.ts`.
Refs: design-system Scope 2 (HouseCard, "must keep"); review-08-10; ADR-48, 396, 402; the caller rule.
Done when: on audrey-hepburn computed at run time the row lists each house's bodies and matches the wheel; no card prints
"Opposite:" or imports `RetrogradeLine`; typecheck, the critical tier and the buyer walk green.

### R20-19 — BirthFields (USER-FACING)
Tier: sonnet — the Owner took the proposal (Settled 7); behaviour is today's, only the look moves
Objective: one BirthFields part: date, time, place with our own place search; one label style, visible edges, four pills instead of
the part-of-day select (today's options and values), Search as a compact Button; the old fields re-exported.
Files: new `web/src/ds/molecules/BirthFields.{tsx,doc.md,example.tsx}`; `components/{BirthDateField,BirthTimeField,BirthTimeControl,
PlaceField}.tsx` and their tests; the reduced-motion fixes at `PlaceField.tsx:236/292/315`.
Refs: design-system Scope 1 (Motion fixes), 2 (BirthFields), Settled 7; ADR-107 (London stands in).
Done when: the same values reach every caller (`BirthFormPage`, `SkyForm`, Add someone); `BirthDateField.test.ts` and
`BirthTimeField.test.ts` green; typecheck, the critical tier and the buyer walk green.

### R20-20 — The Chart part: 12 parts, one chart in 9 states (USER-FACING)
Tier: opus — the picture is the chart; every chart on every page will be this one, on true degrees
Objective: `ds/organisms/chart/` with `buildScene` (pure) and `<Chart>` in the ChartStates table's 9 states, the 12 parts of the
Charts group each with its page, the interactive states, `line-easy` and `line-tense`, brass for lit; `NatalWheel` and
`HouseObject` re-exported from it.
Files: new `web/src/ds/organisms/chart/*`; `components/chart/{NatalWheel,HouseObject}.tsx`.
Refs: design-system Scope 2 (Charts), 8; MASTERFILE §9 (the picture is the chart); ADR-22, 27, 49, 98, 395, 435; pinned Chart.
Done when: every body at `theta(longitude)` on `wheelRadii(S)` in every state and size; No birth time drops houses and rising; R
only where the engine marks it; `wheel-geometry.test.ts` green; typecheck and the critical tier green.

### R20-21 — `chart-consistency.test.ts` and the Charts shot (INTERNAL)
Tier: sonnet — the test's five assertions are written in Scope 8; the shot follows ADR-441
Objective: for each committed fixture and each of the 9 states, build the scene without a browser and assert Scope 8's five points;
join `test.critical`; a dev-only harness of the chart examples shot at 390 and 880 px in site-checks beside the web probe.
Files: new `web/src/ds/organisms/chart/chart-consistency.test.ts`; `web/test.critical`; new `web/scripts/charts-harness.*`;
`.github/workflows/site-checks.yml`.
Refs: design-system Scope 8, acceptance 9; ADR-273 (the Owner asked), 435, 441.
Done when: the test fails when a body's angle is moved in one state; the harness is not in the production build; site-checks keyless;
the critical tier green.

### R20-22 — The emails on `tokens.ts` (USER-FACING)
Tier: sonnet — colour and size values swapped for token values; the emails' words and layout stay
Objective: `mailer.ts` reads its colours, sizes and corners from `@workspace/design`.
Files: `api/src/lib/mailer.ts`; `api/src/lib/mailer.test.ts`.
Refs: design-system Scope 1, acceptance 1; R21's list (now R20, ADR-439).
Done when: no literal left in `mailer.ts`; each email rendered before and after, the same but for near copies; typecheck,
`build:api` and the critical tier green.

### R20-23 — `render-brand`, the share image and the post kit on `tokens.json` (USER-FACING)
Tier: sonnet — readers of `index.css` moved to `tokens.json`; the cover's drawing stays (ADR-442)
Objective: `render-brand.mjs` and the kit's `wheel.mjs`, `sky.mjs`, `slide.css` read `tokens.json`; `share-card.ts` reads
`tokens.ts`; a changed cover ships under a new file name.
Files: `scripts/render-brand.mjs`; `.claude/skills/marketing/kit/{wheel.mjs,sky.mjs,slide.css,render.mjs}`; `web/src/lib/share-card.ts`.
Refs: design-system Scope 1, 2 (Open: the share image), acceptance 1; ADR-227, 228, 442; MB-193 (no new picture).
Done when: `pnpm brand:render` gives the same pictures but for near copies, or new file names; typecheck and the critical tier green.

---

## Group 3 — every screen onto the parts, every chart through the Chart part, and the docs

Each area card switches its files to the parts, templates and token classes as readings 1 to 5 say, examples by number with their
fates, every import moved off the re-exported paths, every chart drawn by the Chart part or listed (ADR-442); no string changes.
**Done when, for every area:** after pictures at 390 px beside Round start 4's before (whole screens, R19-47), only the spec's
changes; `check:ds` at zero in its files (allow-listed drawings on `tokens.ts`); outliers listed before and after; typecheck and the
critical tier green.

### R20-24 — Dashboard home and Quick look (USER-FACING)
Tier: sonnet — the area's done-when is written above; every part pinned
Objective: the home on AppPage, TopBar, Card, Chip, Numbers; Quick look on Sheet; the circle plain, its colours on `tokens.ts`.
Files: `pages/DashboardPage.tsx`; `components/dashboard/{SkyCard,QuickLook,PeopleRows,CompatibilityRows,PairBlock,YourPairs,
YourWeek,Practising,FirstSteps,Nudge,CardSections,TimelineTeaser,RowMenu,Orbit}.tsx`, `orbit.css`.
Refs: design-system Scope 2 (Flows: Quick look), 7; MASTERFILE §9 (the circle is not a chart, ADR-89 to 96).
Done when: the area's done-when; the buyer walk green.

### R20-25 — Dashboard flows, account and the picker (USER-FACING)
Tier: sonnet — the area's done-when is written above; every flow step is in the artifact
Objective: Add someone, Payments (credits), Gift, New Compatibility (every choice), Confirms on Sheet and Dialog, every step kept;
Account on AppPage.
Files: `components/dashboard/{AddSomeoneSheet,CreditsSheet,CreditPill,GiftFlow,GiftCover,WaitingGiftCard,HandBackDialog,
StopSharingDialog}.tsx`; `components/{BundleList,CompatibilityPicker,AccountMenu}.tsx`; `pages/AccountPage.tsx`.
Refs: design-system Scope 2 (Flows), 7.
Done when: the area's done-when; every flow step's picture beside the artifact's; the buyer walk green.

### R20-26 — The report pages, with B-12 (USER-FACING)
Tier: sonnet — the area's done-when is written above; every part pinned
Objective: Personal and Compatibility reports on ReportPage, the organisms and ClaimPopover; every "must keep" (chapter numbers, the
rail, chapter accents); B-12: with reduced motion the closing Sun no longer sits over every chapter.
Files: `pages/{ReportPage,CompatibilityReportPage}.tsx`; `components/report/*.tsx` but R20-27's, R20-33's, R20-34's and group 2's;
`components/{ReportSections,FactCard,MethodologyBox,DraftBanner,DeleteReportDialog}.tsx`.
Refs: design-system Scope 2 (Personal report, Compatibility), 7; MASTERFILE §9; B-12.
Done when: the area's done-when on audrey-hepburn with a canned v12 interpretation; the buyer walk green.

### R20-27 — The report's charts through the Chart part (USER-FACING)
Tier: opus — the hero's label solver and every report drawing move onto one chart; R19-47 shows how a fix can make another overlap
Objective: the hero, the pair hero, the triad plate and row, the angle glyph, House by House's wheel, the two charts' ledger and the
report sky drawn by Chart, SignRing, TriadRing, PlanetBody.
Files: `components/report/{ReportHero,PairHero,TriadPlate,AngleGlyph,HouseDeck,TwoChartsLedger,ReportSky,hero-layout.ts,
pair-hero-layout.ts}`; `components/TriadRow.tsx`.
Refs: design-system Scope 8; MASTERFILE §9; ADR-49, 70, 97, 99, 395; `hero-layout.test.ts`.
Done when: the area's done-when; no label over a body or marker at 390, 900, 1366 and 1440 px on every fixture; the buyer walk green.

### R20-28 — Timeline's views (USER-FACING)
Tier: sonnet — the area's done-when is written above; every part pinned
Objective: Timeline on TimelinePage; cards, week, strips and legend on the parts; the reading sheet on Sheet; Heavy · Mixed · Light on
ToneDot.
Files: `pages/TimelineAppPage.tsx`; `components/timeline/{NowAhead,ContactCard,CycleCard,ReadingSheet,PassStrip,RetrogradeLine,
ToneLegend,DayCells,MixBar,WeekBars}.tsx`; `lib/timeline-view.ts`.
Refs: design-system Scope 2 (Timeline's 53 parts), 7; ADR-322.
Done when: the area's done-when; `timeline-access.test.ts` green.

### R20-29 — Ask, Life, Timeline's setup and its drawings (USER-FACING)
Tier: sonnet — the area's done-when is written above; the dial is open, so only its colours move (ADR-442)
Objective: Ask's panel on its own panel, Life, the setup on LoadingStory; the dial, age ring and waves on `tokens.ts`, not redrawn.
Files: `components/ask/*.tsx`; `components/timeline/{Life,TimelineSetup,Dial,AgeRing,Waves}.tsx`.
Refs: design-system Scope 2 (Open, Flows: Ask), 7; ADR-320, 394, 442.
Done when: the area's done-when; `timeline-setup.test.ts` and `ask-offer.test.ts` green; the buyer walk green.

### R20-30 — The site and the legal pages (USER-FACING)
Tier: sonnet — the area's done-when is written above; every part pinned
Objective: the public pages on SitePage, TopBar and Footer; sections, FAQ, pricing on the parts; the waitlist on Dialog.
Files: `site/{SiteLayout,WaitlistDialog,cta}.tsx`; `site/pages/*.tsx`; `site/sections/**/*.tsx` but `Claims`, `YourPeople`;
`site/components/{CycleFinder,Placements,ReferenceCheck,SampleRail,SkyForm}.tsx`; `components/waitlist/*.tsx`;
`pages/legal/*.tsx`; `pages/not-found.tsx`; `components/{PrelaunchRibbon,StagingRibbon}.tsx`.
Refs: design-system Scope 2 (Flows: Waitlist), 7; ADR-116, 167; R-7.6.
Done when: the area's done-when at 390 and 1440 px; no inline style or script added (the CSP's hashes hold); prerender green; no
sideways scroll at 320 px.

### R20-31 — The site's charts through the Chart part (USER-FACING)
Tier: opus — the home's live sky, the two plates on one horizon and the free chart are the public proof
Objective: the horizon wheel, house ring, two plates, claims, your people, the sample head, the film still and Read the wheel drawn by
Chart; the free chart dialog's labels whole at every size (B-98).
Files: `site/components/{HorizonWheel,HouseRing,TwoPlates,ReadTheWheel,SampleHead,FilmStill}.tsx`;
`site/sections/{Claims,YourPeople}.tsx`.
Refs: design-system Scope 8; MASTERFILE §9 (two plates on one horizon, ADR-113); B-98.
Done when: the area's done-when; "EAST · RISING" whole at 1280 × 900; prerender green.

### R20-32 — Checkout, sign-in, the claim and the birth form (USER-FACING)
Tier: sonnet — the area's done-when is written above; Stripe's iframe is not ours
Objective: checkout and its done page, the claim and the birth form on AppPage with BirthFields; Clerk's appearance on the mapped
names; `BirthFormPage.tsx:193` honours reduced motion.
Files: `pages/{CheckoutPage,CheckoutDonePage,ClaimPage,BirthFormPage}.tsx`; `components/{BirthTimeDialog,ClerkStalled}.tsx`;
`web/src/App.tsx` (Clerk's `appearance` only).
Refs: design-system Scope 1 (Motion fixes), 2 (Flows: Payments, Add birth time), 7; ADR-274.
Done when: the area's done-when; `checkout-view.test.ts` and `return-to.test.ts` green; the buyer walk green through `buy`.

### R20-33 — The loading screens' frame and the Share window (USER-FACING)
Tier: sonnet — the area's done-when is written above; the stories' timelines stay
Objective: the loading frame on LoadingStory, the door's Start reading, the Share window on Dialog, the share card on the parts.
Files: `components/loading/LoadingFrame.tsx`; `components/report/{OpeningOverlay,ShareCard}.tsx`; `components/share/ShareWindow.tsx`;
`components/LoadingState.tsx`.
Refs: design-system Scope 1 (loading stories keep their timelines), 2 (Flows: Share); ADR-351, 393, 394.
Done when: the area's done-when; `OpeningOverlay.test.ts` green; the buyer walk green (Start reading).

### R20-34 — The loading stories' drawings through the Chart part (USER-FACING)
Tier: opus — the five-step story draws the chart as it is made; its timings and the bar must not move
Objective: the Personal and Compatibility stories' stages and Did you know's drawing by Chart (its states), timings unchanged.
Files: `components/report/{BuildStory,PairStory}.tsx`; `components/loading/DidYouKnow.tsx`.
Refs: design-system Scope 8; MASTERFILE §9 (the generation screen); ADR-316 to 319, 347 to 351.
Done when: the area's done-when; `build-story.test.ts` and `pair-story.test.ts` green; labels at least 11 px (B-75).

### R20-35 — The admin pages and the Lab (INTERNAL)
Tier: sonnet — the area's done-when is written above; dense tempo kept
Objective: the admin pages on AdminPage and TopBar, the Lab's views on the parts (Select for its selects), at the 11 px floor.
Files: `pages/{AdminLabPage,AdminPromptsPage,AdminSalesPage,AdminWaitlistPage}.tsx`; `components/lab/*.tsx`.
Refs: design-system Scope 2, 7; MASTERFILE §9 (two tempos).
Done when: the area's done-when at 1280 px.

### R20-36 — `/web-taste` and MASTERFILE §9 point at the library (INTERNAL)
Tier: haiku — docs only, the spec's own sentences
Objective: `/web-taste` names `web/src/ds` and `/admin/design` as the source and adds Scope 7's floors to its checks; MASTERFILE §9's
"Tokens live in `web/src/index.css` until R20" line says `packages/design`.
Files: `.claude/skills/web-taste/SKILL.md`; `MASTERFILE.md` (§9's first paragraph only).
Refs: design-system Scope 6, 7; ADR-427, 431.
Done when: both files within budget; no other section edited.

---

## After the builders: the orchestrator's steps, not cards
1. **The sweep:** delete every re-exported old path and `ui/*` file nothing imports (grep and `check:callers`); any still imported is
   named in the report. Then `check:ds` must read zero outside `ds-drawings.json`, and the baseline is written at zero.
2. **The gate:** install, typecheck, both builds, prerender, the critical tier (with `chart-consistency.test.ts`), the buyer walk on a
   scratch Postgres, `check:shipped`, `check:copies`, `check:callers`, `check:ds`, `pnpm audit --prod`, `csp:write` once on a fresh
   build, gitleaks over `main...round/R20`; smoke, the probe, Lighthouse, axe and the Charts shot on the preview. No tester: no flow
   step changes behaviour and no bug came back (ADR-273). No dry lab: a grep of the diff against `BRAIN_PATHS` is empty.
3. **The sentinel** on `main...round/R20`: `/admin/design` (admin only, not prerendered, no API), the harness kept out of the
   production build, the CSP, CI's new steps keyless, `api/package.json`'s new link.
4. **Before and after** at 390 px for every screen, the outliers' list and the emails' and cover's pictures in the report.
5. **Design System artifact** republished from the doc pages (Scope 4, ADR-430).

## Staging confirmation, after the merge
The deploy walk's verdict and pictures; `/admin/design`; the public pages at 390 px; `/qa` on staging (signed-in steps once MB-227's
`QA_ACCOUNT_EMAIL` is set). The Owner's look: the before and after pictures, a house card's planet row, `/admin/design`.

## What it costs
Nothing in the round: no lab, no model call, no paid service. A staging deploy's walk is 0 ¢.

## Risks
1. **Schema, contract, dependencies:** none; `@workspace/design` is a workspace link in `web` and `api` (R20-01).
2. **User-visible, under the locked spec:** every screen's look within reading 2's list; outliers take the standard part's colour and
   are shown before and after (ADR-440); Clerk's theme moves with the shadcn map; the birth fields' pills; the house card's planet row
   (R20-18, the one place words return). The Owner sees all of it in the report's pictures.
3. **Report content:** none; no brain file, no prompt version.
4. **Regressions:** about 160 files rewritten and every chart moved onto one part. Guards: the Chart part's test in the critical tier,
   the buyer walk after each group (its selectors read roles and names, which no card changes), whole-screen pictures, R20-27's hero
   checked at four widths on every fixture, one Opus retry a card.
5. **Unsettled parts:** the Timeline dial, the share image's picture and print stay as drawn, on `tokens.ts`, allow-listed
   (ADR-442); any chart drawing with no ChartStates state is kept and listed, never invented. B-103 holds the ideation to raise.
6. **Size:** 36 cards, 6 on Opus, in three groups; a card that can't finish leaves its screen on the re-export and `check:ds` above
   zero there, named in the report.
7. **Escalations:** none in R18 or R19, so no card or kind of card was escalated to Opus in two rounds running.
8. **Mailbox load:** twelve rows are open for the Owner, over the ten R-12.3 allows; this plan adds none.

## Lessons this plan guards
- **Promoted, the caller rule** (`builder.md`, `check:callers`): R20-03 (every reader of a removed CSS variable), R20-05, 09, 13, 14,
  15, 18, 19, 20 (each re-exported old path keeps its callers), R20-23 (the kit's readers of `index.css`), every group 3 card (imports
  moved off the old paths), the orchestrator's sweep (no deletion while an importer stands).
- **Promoted, the log rule:** no card adds a log line or a route.
- **Promoted, the pathspec and pkill rules:** every builder; each group shares one tree.
- **Applied:** builders commit as they go; the planner commits once; one push per group.
- R13 · R13-05 (a card editing the running /round skill refused) → no card edits `.claude/skills/round/`; R20-36 edits `/web-taste`.
- R14 · R14-01 (a dependency's packages unnamed) → no registry package; R20-01 names the lockfile's lines.
- R14 · R14-12 (a stray Enter closed a dialog) → R20-14's Dialog never closes on Enter; R20-11's control never submits.
- R14 · R14-14 (one tsconfig in the gate, another on Vercel) → R20-01 adds the root reference and runs both builds.
- R15 · R15-16, 17 (a public page on a route the gate closes) → R20-04 on the admin route only; R20-21's harness never deployed.
- R16 · R16-01 (a spec promising what the engine can't meet) → R20-20 and 21 assert only what `wheelRadii` and the engine give.
- R17 · R17-05, 19 (a shape guessed by another card of the group) → every part's props and the Chart's scene pinned; the organisms
  wait for group 2, the screens for group 3.
- R17 · R17-08, 18 (a shipped line stating what our checks refuse) → doc pages and examples sit inside `web/src/ds`, where literals
  are allowed; R20-02 reads code files only.
- R18 · R18-09 (artifact CSS collapsing a grid) → parts take the artifact's values and shapes, never its CSS; real browser shots.
- R19 · R19-47 (a fix measuring only its own overlap) → whole-screen pictures; R20-27 checks labels against every body and marker.
- R19 · builders' leftover dev servers and stale `csp:write` → Precondition 4; `csp:write` once by the orchestrator.

**Lessons read through R19.** R19's close wrote `lessons.md` (db5ccaf, 2026-10-09; 945cb2b the same day); this plan was written,
and revised, after R19 closed.

## Questions raised (Notion, 2026-10-10, sorted by R-12.3)
- **Decided by Alex:** ADR-439, the whole spec in R20 ("All in r20"), superseding ADR-437
  (https://app.notion.com/p/3f5fefe749318193a3aed375ccba664f).
- **Decided by me** (`Decided by: Claude`): ADR-440, the ratchet kept and zero at the close, outliers on the standard part, superseding
  ADR-438 (https://app.notion.com/p/3f5fefe7493181c6bbd8db4d930283b2); ADR-441, the Charts shot from a keyless harness in site-checks
  (https://app.notion.com/p/3f5fefe749318194acaef88cead1cd17); ADR-442, the dial, share image and print kept and allow-listed until an
  ideation (https://app.notion.com/p/3f5fefe749318124b43fc6dc456230ec).
- **Needs you (Mailbox):** no new row; MB-193 already holds the share image's wish.
- **Backlog:** QA-08 #2 joins B-27; #5 joins B-88; #8 joins B-79; added B-98 to B-102 and B-103 (ideate the Timeline dial and print
  inside the chart system). **Done by R20:** B-09, B-12, B-98, B-99, B-11's button half (B-11 stays for the toast).

## Close (the orchestrator)
B-09, B-12, B-98 and B-99 leave `docs/backlog.md`; B-11 keeps its toast half; B-75 closes if R20-34 met it. INDEX: `packages/design`,
`web/src/ds`, `/admin/design`, `check:ds`, the Chart part, the artifact; specs: `design-system` built. CLAUDE.md: the focus line
drops "Locked, unplanned: `design-system` (R20, R21)"; commands gain `pnpm check:ds`. MASTERFILE §10's repo map gains
`packages/design` and `web/src/ds`. `lessons.md` takes each failure's cause. `/qa` on staging after the deploy.

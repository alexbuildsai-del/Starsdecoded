# R20 plan — the design system's foundations and small parts

Planned 2026-10-10 on `claude/plan-r20-tl88ac` from `main` at 7d70ace (PR #142: `design-system` locked). **Spec:** `design-system`
(locked 2026-10-10, ADR-423 to 436), its R20 part as its Rounds section names it, read by ADR-437; the R21 part stays in the spec.
**Fixes:** B-09 (one token) and B-12 in the cards whose files they share; QA-08's sev-1 confirmed at Round start. **Size:** 21 cards
in three groups (10, 9, 2). **Tiers:** 1 Opus, 18 Sonnet, 2 Haiku. **Tags:** USER-FACING are R20-03 and R20-05 to 18 (the look moves on
every screen: the floors, near-copy colours, Inter buttons, the 46 px app button, Share at the row's end); INTERNAL are R20-01, 02,
04, 19, 20, 21. **The brain is not touched**, so no prompt version moves and the dry lab does not run (spec Out of scope). **No schema
change, no contract change, no new npm dependency**; `@workspace/design` is a workspace link, so the lockfile moves only in its
importer lines. Nothing spends, nothing needs a credential, nothing goes on GitHub, production sells nothing (ADR-167).

## Open Mailbox rows created more than 14 days ago (oldest first, ADR-186)
**2026-09-09:** MB-12, no error reporting or alerting. No card waits on it. (Ages read from each row's Raised date; MB-102, raised
2026-09-26, is 14 days old today, not over.)

## Round number, size and order
R19 is the last round and has its report (closed 2026-10-09, lessons in db5ccaf, 945cb2b). Since then: QA-08 (its sev-1, the walk
stopping at `buy`, was fixed by R19-51 in PR #134, after QA-08's commit) and the `design-system` lock. No Mailbox row is `blocking`
and no card sits on an open row. The only locked spec without a round is `design-system`; R20 builds its R20 list, and R21's list
(Sheet, Dialog, Menu, Popover, AppHeader, templates, the drawings, emails and share image on `tokens.ts`, `check:ds` to zero) stays in
the spec for the next plan (the Owner's rule of 2026-10-08: plan this round only). Order: tokens, the check and the parts (group 1);
every screen onto them by area (group 2); the sweep and the docs (group 3). Pricing and launch stay unplanned (ADR-230, 242).

## Round start (the orchestrator)
1. Branch `round/R20` from `main` with this plan. Re-read `lessons.md` for any line added after R19's close (ADR-265).
2. **QA-08 #1 (sev-1):** read `GET /api/qa/latest` on staging for `main`'s head. Green: noted in the report. Red at `buy` again: a
   fix card (Sonnet, `api/src/lib/qaWalk/browser.ts` only) runs before group 1, its done-when the walk green on staging.
3. **The artifact** (builders can't open claude.ai): from the Design System (https://claude.ai/artifact/1t3VBK8eqDmqC2pTZbWd8i, v4)
   extract into the scratchpad `tokens.json`; each R20 part's card (versions, states, access, do and don't, Today beside After); the
   numbered examples B, C, K, T, P, W, X, F with their fates; the Foundations cards (Colours, TypeScale, MotionTokens). Where a builder's
   draft differs from the artifact, the artifact wins and the report says so. Its CSS is a picture, never copied (R18-09).
4. **Before pictures**, on the base commit: every public page at 390 px, and the buyer walk run locally with its pictures (dashboard,
   account, checkout, the loading screens, the report, Timeline's setup); the admin pages at 1280. Kept in the scratchpad by screen.
5. **The baseline (ADR-438):** R20-02 writes `scripts/ds-baseline.json` from the round's base commit (a scratch worktree), so no
   other card's change is in it; the orchestrator checks its counts against the audit's before group 2.
6. `pnpm install --frozen-lockfile`. R20-01 alone adds a `package.json` (a workspace package, no registry package).

## What already stands (audit at 7d70ace)
- **Met, reused:** Tailwind v4 with `@theme inline` in `web/src/index.css`; shadcn and Radix under `web/src/components/ui`;
  `framer-motion`; `StatusDots.tsx` (25 importers), `Mark.tsx`, `Wordmark.tsx` (8 importers), `loading/ProgressBar.tsx`; the site's
  46 px button (`site.css`); `check:shipped`, `check:callers`, `check:copies` in CI (`ci.yml`); the admin guard on `AppRoute`.
- **Not met:** `packages/design`; `web/src/ds`; `check:ds`; `/admin/design`; the shadcn HSL map renders off-palette (#6872CA); the
  palette sits in four copies (`.rp-root`, `.sd`, `WaitlistDialog`, `DidYouKnow`); 23 copies of the house curve; no `MotionConfig`.
- **Found while planning:** (1) `ui/tooltip` is not importer-free as the spec says: `App.tsx` and `entry-server.tsx` mount
  `TooltipProvider` while nothing renders a tooltip, so R20-20 removes both lines with the file. (2) `EvidenceLine`, `SaveReportCta`
  and `AspectChip` have no importer. (3) 16 native `<select>`s (lab, Sales, `BirthTimeControl`, `CompatibilityPicker`), which the
  spec's Scope 2 does not draw: Select is Field's version inside the tokens (ADR-437); the part-of-day select becomes pills only with
  R21's BirthFields. (4) `render-brand.mjs` and the marketing kit's `wheel.mjs` read `index.css` directly; they keep working in R20 and
  move to `tokens.ts` in R21. (5) No markdown library is installed: `/admin/design` renders the doc pages with a small in-house
  renderer (headings, lists, paragraphs, code), never a new dependency. (6) Scope 8's chart test needs the Charts group's nine states
  and the Chart part: R21 (ADR-437).

## How this plan reads the spec
1. **R20's names** (ADR-437): Numeral is Numbers, Field is Input and Input with a button (plus Select and TickBox), Alert is
   InlineError and Alert, Text is the Inter text styles. Small parts are Scope 2's atoms but PlanetBody, and Card, Alert and
   SegmentedControl. Any part a screen needs beyond these stays as it is until R21; nothing is invented in the round (Scope 6).
2. **Drawings stay:** nothing inside an `<svg>` changes in R20 (the wheel, plates, orbit, dial, rings, story stages, horizon wheels).
   Their literals stay counted; R21 moves them to `tokens.ts`.
3. **Lift, don't redraw:** a literal equal to a token takes its class; a near copy (every channel within 6, ADR-438) snaps; anything
   further stays and is listed. Visible changes are only the spec's: 11 px floor, 44 px taps, indigo-lt for indigo text, white on
   indigo (B-09), control edges 3:1, Inter 500 on buttons, the 46 px app button, Share at the card row's far end.
4. **Moves without breaking callers:** a part that replaces a shared file (`StatusDots`, `Mark`, `Wordmark`, `ProgressBar`) moves into
   `web/src/ds` and leaves a one-line re-export at the old path; area cards switch imports; R20-20 deletes each shim and `ui/button`
   once nothing imports them. `ui/input`, `ui/label` and `ui/textarea` stay for R21's BirthFields and flows.
5. **One curve:** `--ease` (`cubic-bezier(.16,1,.3,1)`) and `--dur-fast/base/slow` replace each copy in the files a card owns.

## Goals
1. **QA-08's sev-1 stays fixed:** the deploy walk green through `buy` on `main` before group 1 (R19-51), or a fix card first.
2. **Tokens, one source** (Scope 1, acceptance 1 and 2): `packages/design` with `tokens.css` and its checked `tokens.ts`; the shadcn
   names mapped onto the roles; the four palette copies, `sidebar-*`, `chart-1..5`, `elevate-*` and `@replit` gone; type, corners,
   motion, depth and one `MotionConfig`; with B-09.
3. **The small parts with their pages** (Scope 2, 3; acceptance 5): R20's parts in `web/src/ds` by level, each with its doc page and
   live example, seen at `/admin/design` Today beside After.
4. **Every screen on the parts, by area** (Scope 2, 7; acceptance 3, 4, 7): dashboard, report, Timeline and Ask, site, checkout and
   sign-in, loading and share, admin; before and after at 390 px in the report; nothing else on a screen moved; with B-12.
5. **The ratchet and the docs** (Scope 4, 5, 6): `check:ds` in CI with its baseline and contrast pairs, lowered after each group;
   `/web-taste` and MASTERFILE §9 point at the library; Design System artifact v1 at the close.

## Preconditions
1. Builders read MASTERFILE §0 and §9, `design-system.md` Scope 1 to 3 and 7, their card, Pinned shapes, and Round start 3's
   extracts for their parts or screens. UI cards read `/web-taste`.
2. **Single owners.** No file in two cards of a group. Across groups: `web/src/App.tsx` → R20-04 (1), R20-17 (2, Clerk's
   appearance only), R20-20 (3, `TooltipProvider` only); `web/src/index.css` → R20-03 (1) only; the shims `components/StatusDots.tsx`,
   `Mark.tsx`, `Wordmark.tsx`, `loading/ProgressBar.tsx` → R20-05 or R20-10 (1), R20-20 (3); `scripts/ds-baseline.json` → R20-02 (1),
   then the orchestrator. No card changes `api/test.critical` or `web/test.critical`.
3. Inside a group a card may land before the one it imports from (pinned shapes): a red intermediate is accepted until the group
   ends; every group ends with typecheck, the critical tier, the buyer walk and `check:ds` green.
4. **The promoted rules** (`lessons.md`): grep every caller before changing a shared export or value; commit with a pathspec; never
   pkill or killall a shared process; stop the PIDs you started and leave no logs in the tree (R19's leftovers).
5. **No words move.** No card changes a string a reader sees; a part's accessible name keeps today's words. One push per group.

## Pinned shapes
- **Tokens** (`@workspace/design`): `tokens.css` is a Tailwind v4 `@theme` giving `--color-<name>` for the 37 palette names in the
  spec (void, ground, surface, raised, line, line-soft, line-strong, control-edge, paper, paper-dim, muted, label-dim, indigo,
  indigo-hover, on-indigo, indigo-lt, violet, brass, brass-dim, rose, back, error, teal, ...) plus chart-data `line-easy`, `line-tense`
  and the chapter and element hues; `--text-<style>` for the spec's named type styles (hero, section, page-title, sheet-title, card-title,
  card-title-sm, lede, prose, ui, small, caption, button, button-compact, kicker, label, data, data-sm, stat, each with line height,
  weight, tracking); `--radius-inner|control|card|sheet|pill`; `--ease`, `--dur-fast|base|slow`; `--scrim`; `--shadow-card|raised`.
  `tokens.ts` exports `tokens` (the same values as plain objects) and `ROLE_PAIRS: { fg, bg, kind: "text" | "edge" }[]`.
  Package exports: `"./tokens.css"`, `".": "./src/tokens.ts"`.
- **Parts** live at `web/src/ds/<atoms|molecules>/<Part>.tsx` with `<Part>.doc.md` and `<Part>.example.tsx` (default export: every
  version and state, Today beside After). No barrel file. Import as `@/ds/atoms/Button`.
- `Button { variant?: "primary" | "secondary" | "danger"; size?: "default" | "compact"; full?: boolean; busy?: string; asChild? }`
  (46 px; compact 36 px seen with a 44 px tap; `busy` shows StatusDots with that word and keeps an accessible name); `TextButton`.
- `Eyebrow { kind?: "kicker" | "label" }` · `Heading { style: <display style>; as? }` · `Text { style?: "prose" | "ui" | "small" |
  "caption"; as? }` · `Numbers { size?: "data" | "data-sm" | "stat" }` (Plex Mono, tabular).
- `Chip { icon?: ReactNode; tone?; selected? }` · `ToneDot { tone: "heavy" | "mixed" | "light" | <hue> }` · `RetrogradeBadge`.
- `Input`, `InputWithButton { button: ReactNode }`, `Select` (native, Field's look), `TickBox { checked; onChange; label }` (the
  check stays shown when ticked) · `StatusDots`, `Skeleton`, `Progress` (the one bar, today's `ProgressBar` props), `Loader`, `Mark`,
  `Wordmark`, `Logo`.
- `Card { variant?: "surface" | "glass" | "tint" | "tone"; tone? }` with `CardActions { share?: ReactNode }` (Share at the far end)
  · `Alert { tone: "info" | "error" }`, `InlineError` · `SegmentedControl { options; value; onChange }` (arrow keys move).

## Parallel groups
**Group 1**, one message, 10 cards with no file in common: R20-01 to R20-10. R20-03 and the parts read R20-01's names as pinned;
R20-02 reads R20-01's `ROLE_PAIRS` and counts the base (Round start 5); R20-04 globs the parts' docs and examples. The
orchestrator lowers the baseline after the group. Push once.
**Group 2**, one message once group 1 is green, 9 cards: R20-11 to R20-19, each an area with its own files, on group 1's parts.
`check:ds --write` lowers the baseline after the group. Push once.
**Group 3**, one message once group 2 is green, 2 cards: R20-20 and R20-21. Push once; then the orchestrator's steps and the gate.
A card that can't finish takes the roster's one Opus retry; what still can't finish is a backlog line at the close, with no round.

---

## Group 1 — tokens, the check, the base CSS, the admin page and the parts

### R20-01 — The tokens package (INTERNAL)
Tier: sonnet — every value is given by the spec and `tokens.json`; a package and two files
Objective: `@workspace/design` holds the one source: `tokens.css` (`@theme`) and its mirror `tokens.ts`, as pinned.
Files: new `packages/design/` (`package.json`, `tsconfig.json`, `src/tokens.css`, `src/tokens.ts`, `src/tokens.json`); root
`tsconfig.json` (reference); `web/package.json` (the workspace dependency); `pnpm-lock.yaml` (importer lines only).
Refs: design-system Scope 1, Settled 4, 8, ADR-423 to 425; Round start 3's `tokens.json`; pinned Tokens; lessons R14-01, R14-14.
Done when:
- The 37 colours, the named type styles, five corners, motion, scrim and depths as pinned; chapter and element hues as their own group;
  `ROLE_PAIRS` lists every text-on-ground and edge-on-ground pair the artifact's Colours card declares.
- The lockfile gains only the workspace link (diff named in the report); typecheck (root references) and `build:web` green.

### R20-02 — `pnpm check:ds`, the ratchet and the contrast pairs (INTERNAL)
Tier: sonnet — a keyless counting script like `check:shipped`, its rules written in the spec
Objective: count hex and rgb literals, arbitrary `text-[..]` and `rounded-[..]`, raw colour utilities and raw styled `<button>`s
outside `packages/design` and `web/src/ds`, per file, against `scripts/ds-baseline.json`; fail when any count rises; `--write`
lowers it; check each `ROLE_PAIRS` pair (text 4.5:1, edge 3:1); `--suggest` names each literal's token within 6 (ADR-438).
Files: new `scripts/check-ds.ts`, `scripts/ds-baseline.json`; `scripts/package.json`; root `package.json`; `.github/workflows/ci.yml`
(a step beside `check:shipped`).
Refs: design-system Scope 5, acceptance 4, 6; ADR-429, 438; ADR-192, 273 (a check, not a test).
Done when: on the base tree it writes the baseline and passes; a test literal added to a screen fails it and `--write` never raises
a count; a pair under its ratio fails with both hexes named; reads `.ts`, `.tsx`, `.css` only; typecheck and the critical tier green.

### R20-03 — The base CSS onto the tokens: the shadcn map, one palette, one curve (USER-FACING)
Tier: opus — four palette copies disagree today; which value each role takes is seen on every screen and in Clerk's theme
Objective: `index.css` imports `tokens.css`; the shadcn names (`primary`, `muted-foreground`, `card`, `border`, `input`, `ring`,
`destructive`, `primary-foreground` → `on-indigo`) map onto the roles so `bg-primary` is #5C6BC0; `sidebar-*`, `chart-1..5`,
`elevate-*`, `--button-outline`, `--badge-outline` and the `@replit` comments go; `.rp-root` and `.sd` read the tokens; every curve
and duration in these files is `--ease` and `--dur-*`; the opening screen's 350 ms cross-fade is no longer cancelled by the
reduced-motion block (index.css:242-248, made a still final frame); one `MotionConfig reducedMotion="user"` at the root. B-09.
Files: `web/src/index.css`, `web/src/site/site.css`, `web/src/main.tsx`, `web/components.json`.
Refs: design-system Scope 1 (shadcn names, Motion, Hover, Depth), acceptance 1, 2, 4; ADR-424, 425, 426; B-09; the caller rule.
Done when:
- Every reader of a removed variable grepped (Clerk's `shadcn.css`, `components/ui/*`, `render-brand.mjs`, the kit's `wheel.mjs`) and
  none left broken; `bg-primary` and `text-[#5C6BC0]` compute the same colour in a real browser.
- The public pages, the dashboard and the report at 390 px beside the before pictures: only the spec's changes; typecheck, both
  builds, the critical tier and `check:ds` green.

### R20-04 — `/admin/design`: every part live, its page beside it (INTERNAL)
Tier: sonnet — an admin page on the existing guard, no API, no prerender
Objective: an admin-gated page listing the parts by level, each with its doc page rendered and its example live, Today beside After.
Files: new `web/src/pages/AdminDesignPage.tsx`, new `web/src/lib/doc-page.ts` (a small markdown subset: headings, lists,
paragraphs, code); `web/src/App.tsx` (the route beside `/admin/sales`, on `AppRoute`).
Refs: design-system Scope 3, 4, acceptance 5; ADR-430; Found while planning (5); lesson R15-16.
Done when: `import.meta.glob` finds every `web/src/ds/**/*.doc.md` and `*.example.tsx`, so a new part shows with no edit here; a
signed-out or non-admin visitor gets what the other admin routes give; not in `entry-server.tsx`'s pages; no new dependency;
at 1280 and 390 px on real shots; typecheck, `build:web` and the critical tier green.

### R20-05 — Button, TextButton and StatusDots (USER-FACING)
Tier: sonnet — the artifact's Button card and the site's 46 px button are the spec; props pinned
Objective: `Button` (primary, secondary, danger, full; compact 36 px with a 44 px tap; `busy` as StatusDots with its word, ADR-130)
in Inter 500, hover on `indigo-hover`, never `filter: brightness`; `TextButton`; `StatusDots` moved into `ds/atoms`, its old path a
one-line re-export. B-11's button half: a busy button keeps an accessible name.
Files: new `web/src/ds/atoms/{Button,TextButton,StatusDots}.{tsx,doc.md,example.tsx}`; `web/src/components/StatusDots.tsx` (shim).
Refs: design-system Scope 2 (Button), 3, 7; Settled 5; ADR-434, 436; ADR-130, 333; pinned Button; the caller rule (25 importers).
Done when: each version and state in its example; 44 px tap measured on a real shot; text 4.5:1 in every state; the doc page has
every heading Scope 3 lists; StatusDots' importers unchanged and working; typecheck and the critical tier green.

### R20-06 — Eyebrow, Heading, Text and Numbers (USER-FACING)
Tier: sonnet — the named type styles are in the tokens; four thin parts
Objective: one part per family: Eyebrow (Space Grotesk kicker and label), Heading (the seven Newsreader styles, any tag), Text (the
four Inter styles), Numbers (Plex Mono, tabular, three sizes); nothing below 11 px.
Files: new `web/src/ds/atoms/{Eyebrow,Heading,Text,Numbers}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 1 (Type), 2, 3; Settled 8; ADR-425, 436; pinned shapes.
Done when: each style in its example beside the Today recipe it replaces (the K and T examples by number); the doc pages complete;
typecheck and the critical tier green.

### R20-07 — Chip, ToneDot and RetrogradeBadge (USER-FACING)
Tier: sonnet — the artifact's P examples and the chart system's `back` colour settle all three
Objective: Chip with its icon slot (ToneDot, RetrogradeBadge, or PlanetBody once R21 draws it), selected and disabled states, a
44 px tap when it is a control; ToneDot for Heavy, Mixed, Light and a hue; RetrogradeBadge in `back` (#E24D4D).
Files: new `web/src/ds/atoms/{Chip,ToneDot,RetrogradeBadge}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 1 (palette: back, rose), 2 (Chip), 3, 7; ADR-426, 432; pinned shapes.
Done when: every P example's fate shown; label at least 11 px; contrast passes on each tone; typecheck and the critical tier green.

### R20-08 — Field: Input, Input with a button, Select and TickBox (USER-FACING)
Tier: sonnet — the F examples, the control-edge token and ADR-437's Select reading settle them
Objective: Input (one label style, `control-edge` 3:1 edge, focus ring, error state), InputWithButton (Share, Join the waitlist, a
compact Button inside), Select (native, Field's look, 44 px), TickBox (the check stays shown when ticked, a 44 px row).
Files: new `web/src/ds/atoms/{Input,InputWithButton,Select,TickBox}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 1 (control-edge), 2 (TickBox, Input), 3, 7; ADR-426, 437; ADR-24, 48 (a tick is silent); pinned shapes.
Done when: edge 3:1 and text 4.5:1 in every state; keyboard and label wiring on real shots; typecheck and the critical tier green.

### R20-09 — Card, Alert and InlineError, SegmentedControl (USER-FACING)
Tier: sonnet — today's favourite card is the standard; the artifact's C and X examples give every version
Objective: Card (surface, glass, tint, tone; label, title, body, data line, actions; Share at the row's far end), Alert (info,
error) and InlineError, SegmentedControl (arrow keys, one selected, 44 px segments).
Files: new `web/src/ds/molecules/{Card,Alert,SegmentedControl}.{tsx,doc.md,example.tsx}`.
Refs: design-system Scope 2 (Card, InlineError and Alert, SegmentedControl), 3, 7; ADR-432; ADR-333 (buttons by weight).
Done when: "Keep C5"-style fates shown for every C and X example; the card's title 20 px big, 17 px small; Enter never submits from
the segmented control; typecheck and the critical tier green.

### R20-10 — Skeleton and Progress, Loader, Mark, Wordmark and Logo (USER-FACING)
Tier: sonnet — moves three existing parts and adds two from the W examples; no drawing changes
Objective: `ProgressBar` becomes `Progress` and `Mark`, `Wordmark` move into `ds/atoms`, each old path a one-line re-export;
Skeleton; Loader (StatusDots under 3 s, a step bar over 5 s); Logo (Mark, Wordmark, app icon; one Wordmark replaces three copies).
Files: new `web/src/ds/atoms/{Skeleton,Progress,Loader,Mark,Wordmark,Logo}.{tsx,doc.md,example.tsx}`;
`web/src/components/loading/ProgressBar.tsx`, `web/src/components/Mark.tsx`, `web/src/components/Wordmark.tsx` (shims).
Refs: design-system Scope 2 (atoms), 3; logo spec; ADR-394 (one bar); the caller rule.
Done when: the SVG paths of Mark unchanged byte for byte; `progress.test.ts` and `OpeningOverlay.test.ts` green; every importer of
the three works through the shims; typecheck, `build:web` and the critical tier green.

---

## Group 2 — every screen onto the parts, by area

Each area card: switch its files to group 1's parts and token classes as reading 1 to 5 say, the B, C, K, T, P, W, X, F examples by
number with their fates; nothing inside an `<svg>`; no string changes. Done when, for every area: its after pictures at 390 px
beside Round start 4's before (whole screens, not only the moved part, R19-47), only the spec's changes visible; `check:ds --suggest`
shows no near copy left in its files and every count fell or held; the literals left are listed; typecheck and the critical tier green.

### R20-11 — Dashboard home (USER-FACING)
Tier: sonnet — the reading and the area's done-when are written above; parts pinned
Objective: the home's cards, rows and pills on Card, Button, Chip, Eyebrow, Heading, Numbers, StatusDots.
Files: `web/src/pages/DashboardPage.tsx`; `components/dashboard/{SkyCard,QuickLook,PeopleRows,CompatibilityRows,PairBlock,YourPairs,
YourWeek,Practising,FirstSteps,Nudge,CardSections,TimelineTeaser,RowMenu}.tsx` (`Orbit.tsx`, `orbit.css` untouched).
Refs: design-system Scope 2, 7, acceptance 3, 4, 7; MASTERFILE §9 (two tempos, the circle plain).
Done when: the area's done-when; the buyer walk green (its first-steps and picker steps read these rows).

### R20-12 — Dashboard sheets, account and the picker (USER-FACING)
Tier: sonnet — the reading and the area's done-when are written above; parts pinned
Objective: the sheets' and dialogs' insides (buttons, fields, cards, alerts) on the parts; their frames stay for R21's Sheet and Dialog.
Files: `components/dashboard/{AddSomeoneSheet,CreditsSheet,CreditPill,GiftFlow,GiftCover,WaitingGiftCard,HandBackDialog,
StopSharingDialog}.tsx`; `components/{BundleList,CompatibilityPicker,AccountMenu}.tsx`; `pages/AccountPage.tsx`.
Refs: design-system Scope 2 (Input, Select, TickBox, Alert), 7; ADR-437 (the picker's select).
Done when: the area's done-when; the buyer walk green (credits sheet, bundles, gift, the picker).

### R20-13 — The report pages, with B-12 (USER-FACING)
Tier: sonnet — the reading and the area's done-when are written above; parts pinned
Objective: Personal and Compatibility report chrome, chapters, house cards' text, rail, checklist, claims and Did you know cards on
the parts, keeping every "must keep" (chapter numbers, the rail, chapter accents from `chapter-accent.ts`); B-12: with reduced
motion the closing Sun stops sitting over every chapter.
Files: `pages/{ReportPage,CompatibilityReportPage}.tsx`; `components/report/*.tsx` but `AngleGlyph`, `TriadPlate`, `ReportSky`,
`BuildStory`, `PairStory`, `OpeningOverlay`, `ShareCard`; `components/{ReportSections,FactCard,TriadRow,MethodologyBox,DraftBanner,
DeleteReportDialog}.tsx`.
Refs: design-system Scope 2, 7, "must keep"; MASTERFILE §9 (one accent per chapter, asides); B-12.
Done when: the area's done-when on audrey-hepburn's report with a canned v12 interpretation; the buyer walk green.

### R20-14 — Timeline's views (USER-FACING)
Tier: sonnet — the reading and the area's done-when are written above; parts pinned
Objective: Timeline's cards, week, reading sheet's insides, strips and legend on the parts; Heavy · Mixed · Light on ToneDot.
Files: `pages/TimelineAppPage.tsx`; `components/timeline/{NowAhead,ContactCard,CycleCard,ReadingSheet,PassStrip,RetrogradeLine,
ToneLegend,DayCells,MixBar,WeekBars}.tsx` (`Dial`, `AgeRing`, `Waves` untouched; `timeline-view.ts`'s tone classes stay).
Refs: design-system Scope 2 (Chip, ToneDot, RetrogradeBadge), 7; ADR-322 (voice unchanged).
Done when: the area's done-when; `timeline-access.test.ts` green.

### R20-15 — Ask, Life and Timeline's setup (USER-FACING)
Tier: sonnet — the reading and the area's done-when are written above; parts pinned
Objective: Ask's panel and launcher, Life, and the setup screen's controls on the parts; the setup's stage and bar timeline unchanged.
Files: `components/ask/*.tsx`; `components/timeline/{Life,TimelineSetup}.tsx`.
Refs: design-system Scope 2, 7 (Loading stories keep their timelines); ADR-320, 394.
Done when: the area's done-when; `timeline-setup.test.ts` and `ask-offer.test.ts` green; the buyer walk green (Timeline's setup).

### R20-16 — The site and the legal pages (USER-FACING)
Tier: sonnet — the reading and the area's done-when are written above; parts pinned
Objective: the public pages' sections, forms, FAQ, pricing and waitlist on the parts; `WaitlistDialog`'s palette copy gone.
Files: `site/{SiteLayout,WaitlistDialog,cta}.tsx`; `site/pages/*.tsx`; `site/sections/**/*.tsx`; `site/components/{CycleFinder,
Placements,ReferenceCheck,SampleHead,SampleRail,SkyForm,FilmStill}.tsx` (`HorizonWheel`, `HouseRing`, `TwoPlates`, `ReadTheWheel`
untouched); `components/waitlist/*.tsx`; `pages/legal/*.tsx`; `pages/not-found.tsx`; `components/{PrelaunchRibbon,StagingRibbon}.tsx`.
Refs: design-system Scope 2, 7; ADR-116, 167; R-7.6 (prerendered).
Done when: the area's done-when at 390 and 1440 px; no inline style or script added (the CSP's hashes hold; `csp:write` is the
orchestrator's, once); prerender green; no sideways scroll at 320 px.

### R20-17 — Checkout, sign-in, the claim and the birth form (USER-FACING)
Tier: sonnet — the reading and the area's done-when are written above; parts pinned; Stripe's iframe is not ours
Objective: checkout, its done page, the claim, the birth form and its fields on the parts (inputs on Input, the part-of-day select on
Select until R21's pills); Clerk's appearance reads the mapped names; the motion fixes at `PlaceField.tsx:236/292/315` and
`BirthFormPage.tsx:193` honour reduced motion.
Files: `pages/{CheckoutPage,CheckoutDonePage,ClaimPage,BirthFormPage}.tsx`; `components/{BirthDateField,BirthTimeField,
BirthTimeControl,BirthTimeDialog,PlaceField,ClerkStalled}.tsx`; `web/src/App.tsx` (Clerk's `appearance` only).
Refs: design-system Scope 1 (Motion fixes), 2 (Input, Select), 7; ADR-274 (the tick first).
Done when: the area's done-when; `checkout-view.test.ts` and `return-to.test.ts` green; the buyer walk green through `buy`.

### R20-18 — The loading screens and the Share window (USER-FACING)
Tier: sonnet — the reading and the area's done-when are written above; the stories' timelines stay
Objective: the loading frame's slots, Did you know, the door's Start reading and the Share window's controls on the parts;
`DidYouKnow`'s palette copy gone; the stories' stages, timings and bar unchanged.
Files: `components/loading/{LoadingFrame,DidYouKnow}.tsx`; `components/report/{OpeningOverlay,ShareCard}.tsx`;
`components/share/ShareWindow.tsx`; `components/LoadingState.tsx`.
Refs: design-system Scope 1 (Motion: loading stories keep their own timelines), 2; ADR-351, 393, 394; sharing-and-circle.
Done when: the area's done-when; `OpeningOverlay.test.ts`, `build-story.test.ts`, `pair-story.test.ts` green; the buyer walk green
(Start reading).

### R20-19 — The admin pages and the Lab (INTERNAL)
Tier: sonnet — the reading and the area's done-when are written above; dense tempo kept
Objective: the admin pages and the Lab's views on the parts (Select for its native selects), at the 11 px floor, dense.
Files: `pages/{AdminLabPage,AdminPromptsPage,AdminSalesPage,AdminWaitlistPage}.tsx`; `components/lab/*.tsx`.
Refs: design-system Scope 2, 7; MASTERFILE §9 (two tempos).
Done when: the area's done-when at 1280 px; typecheck and the critical tier green.

---

## Group 3 — the sweep and the docs

### R20-20 — The sweep: Removed, the shims and `ui/button` (INTERNAL)
Tier: haiku — deletions of files nothing imports, two provider lines
Objective: delete `EvidenceLine`, `SaveReportCta`, `AspectChip` and `ui/tooltip` with its `TooltipProvider` in `App.tsx` and
`entry-server.tsx`; delete each shim (`StatusDots`, `Mark`, `Wordmark`, `ProgressBar`) and `ui/button` whose importers are now zero.
Files: those files; `web/src/App.tsx`, `web/src/entry-server.tsx` (the provider lines only).
Refs: design-system Scope 2 (Removed), Settled 6; reading 4; the caller rule.
Done when: a grep shows no importer of a deleted file; any shim or `ui/button` still imported is kept and its importers listed;
typecheck, both builds, prerender, the critical tier and `check:ds` green.

### R20-21 — `/web-taste` and MASTERFILE §9 point at the library (INTERNAL)
Tier: haiku — docs only, the spec's own sentences
Objective: `/web-taste` names `web/src/ds` and `/admin/design` as the source and adds Scope 7's floors to its checks (44 × 44 tap,
11 px text, 4.5:1 text aiming at 7:1, 3:1 edges, one or two prominent buttons, base and raised surfaces, sheets one at a time,
motion optional); MASTERFILE §9's "Tokens live in `web/src/index.css` until R20" line says they live in `packages/design`.
Files: `.claude/skills/web-taste/SKILL.md`; `MASTERFILE.md` (§9's first paragraph only).
Refs: design-system Scope 6, 7, Rounds (R20); ADR-427, 431.
Done when: both files within budget; no other section edited.

---

## After the builders: the orchestrator's steps, not cards
1. **The baseline** lowered with `check:ds --write` after groups 1 and 2, never raised; the report gives each count at the base and
   at the close.
2. **The gate:** install, typecheck, both builds, the critical tier, the buyer walk on a scratch Postgres, `check:shipped`,
   `check:copies`, `check:callers`, `check:ds`, `pnpm audit --prod`, `csp:write` once on a fresh build, gitleaks over
   `main...round/R20`; smoke, the probe, Lighthouse and axe on the preview. No tester: no step of the buyer's flow changes behaviour
   and no bug came back (ADR-273). No dry lab: no brain file changed (spec Out of scope; a grep of the diff against `BRAIN_PATHS`).
3. **The sentinel** on `main...round/R20`, its eye on `/admin/design` (behind the admin guard, not prerendered, no API, nothing of a
   reader's), the CSP after any inline style, and CI's new step (keyless).
4. **Before and after** at 390 px for every screen in the report (acceptance 7), signed-in screens from the walk's pictures.
5. **Design System artifact v1** republished from the parts' doc pages (Scope 4, ADR-430), like the bible.

## Staging confirmation, after the merge
The deploy walk's verdict and pictures; `/admin/design` on staging; the public pages at 390 px; `/qa` on staging (signed-in steps
played once MB-227's `QA_ACCOUNT_EMAIL` is set). The Owner's look: the before and after pictures and `/admin/design`.

## What it costs
Nothing in the round: no lab, no model call, no paid service. A staging deploy's walk is 0 ¢.

## Risks
1. **Schema, contract, dependencies:** none. `@workspace/design` is a workspace package; the lockfile gains its link only (R20-01).
2. **User-visible, under the locked spec:** every screen's look moves within the spec's list (reading 3); colours further than 6 off
   their token stay as they are (ADR-438), so no unlisted colour change ships. Clerk's sign-in theme moves with the shadcn map
   (R20-03, R20-17). Before and after pictures go to the Owner.
3. **Report content:** none; no brain file, no prompt version (spec Out of scope). Nothing USER-FACING in what a report says.
4. **Regressions:** nine area cards rewrite class names over about 160 files; the walk's selectors read roles and names, which no card
   changes; whole-screen pictures beside the before (R19-47); one Opus retry per card.
5. **Partly met until R21:** acceptance 3 (text inside drawings, B-75's 6.5 px labels), 6 (`check:ds` to zero) and 9 (the Chart
   part) close with R21's drawings (ADR-437); R20's report says which counts are left and where.
6. **Open in the spec for R21:** the Timeline dial, the share image and print are named open in Scope 2; R21's planner sends any part
   still unsettled back to ideation (Scope 6).
7. **Escalations:** none in R18 or R19, so no card or kind of card was escalated to Opus in two rounds running.
8. **Mailbox load:** twelve rows are open for the Owner, over the ten R-12.3 allows; this plan adds none.

## Lessons this plan guards
- **Promoted, the caller rule** (`builder.md`, `check:callers`): R20-03 (every reader of a removed CSS variable, Clerk's theme and
  the two scripts included), R20-05 (StatusDots' 25 importers), R20-10 (Mark, Wordmark, ProgressBar), R20-16 and R20-18 (the
  palette copies' readers), R20-20 (no deletion while an importer stands).
- **Promoted, the log rule:** no card adds a log line or a route.
- **Promoted, the pathspec and pkill rules:** every builder; group 2's nine share one tree.
- **Applied:** builders commit as they go; the planner commits once; one push per group.
- R13 · R13-05 (a card editing the running /round skill refused) → no card edits `.claude/skills/round/`; R20-21 edits `/web-taste`.
- R14 · R14-01 (a dependency's packages unnamed) → no registry package; R20-01 names the lockfile's lines.
- R14 · R14-14 (one tsconfig in the gate, another on Vercel) → R20-01 adds the root reference and runs `build:web`.
- R15 · R15-16, 17 (a public page on a route the gate closes) → R20-04's page sits on the admin route only, never prerendered.
- R17 · R17-05, 19 (a shape guessed by another card of the group) → every part's props pinned; areas start only in group 2.
- R17 · R17-08, 18 (a shipped line stating what our checks refuse) → doc pages and examples live inside `web/src/ds`, where
  `check:ds` allows literals; R20-02 reads code files only.
- R18 · R18-09 (artifact CSS collapsing a grid) → parts take the artifact's values and shapes, never its CSS; real browser shots.
- R19 · R19-47 (a fix measuring only its own overlap) → each area's after pictures are whole screens beside the before.
- R19 · builders' leftover dev servers and stale `csp:write` → Precondition 4; `csp:write` once by the orchestrator on a fresh build.

**Lessons read through R19.** R19's close wrote `lessons.md` (db5ccaf, 2026-10-09; 945cb2b the same day, the caller rule's check);
this plan was written after R19 closed.

## Questions raised (Notion, 2026-10-10, sorted by R-12.3)
- **Decided by me** (Decisions, `Decided by: Claude`): ADR-437, R20's names read onto Scope 2's parts, small parts as the atoms
  (PlanetBody aside) with Card, Alert and SegmentedControl, Select as Field's version, every other part and Scope 8 with R21
  (https://app.notion.com/p/3f5fefe74931819f95dcc1706e1e930c); ADR-438, `check:ds`'s ratchet and the near-copy distance
  (https://app.notion.com/p/3f5fefe7493181fcabd4c44ba513b220).
- **Needs you (Mailbox):** no new row.
- **Backlog:** QA-08 #2 joins B-27 (/sample before R19's rule); #5 joins B-88; #8 joins B-79; added B-98 (#3), B-99 (#4),
  B-100 (#6), B-101 (#7), B-102 (#9). **Done by R20:** B-09, B-12, B-11's button half (B-11 stays for the toast).

## Close (the orchestrator)
B-09 and B-12 leave `docs/backlog.md`; B-11 keeps its toast half. INDEX: `packages/design`, `web/src/ds`, `/admin/design`,
`check:ds`, the artifact; specs: `design-system` R20 built, R21 left. CLAUDE.md's focus and commands (`pnpm check:ds`). MASTERFILE
§10's repo map gains `packages/design` and `web/src/ds`. `lessons.md` takes each failure's cause. `/qa` on staging after the deploy.

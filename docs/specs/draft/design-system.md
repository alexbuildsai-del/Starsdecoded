# Design system (draft)

Status: draft, 2026-10-09 · Design System (Today beside After, every part): https://claude.ai/artifact/1t3VBK8eqDmqC2pTZbWd8i ·
first ideation page: https://claude.ai/artifact/CubRdNjHxtkGRQeowTnA49 · Supersedes nothing; extends MASTERFILE §9 and `/web-taste`.

**The Owner's direction (2026-10-09):** lift today's look, don't redraw it. Today's best card is the standard (a quiet
grey label, a big title, the body, a mono data line, two buttons); only Share moves, to the far end of the row. The
birth fields keep how they work; their look may change (proposal in the BirthFields card). Chips keep their icon slot.
Big buttons move off Space Grotesk to Inter; Space Grotesk stays small (labels, chips, compact buttons).
Code first: keep Tailwind, shadcn and Radix, adapt what exists. Every removed or merged example is shown by number.

## Why

We have a style but no set of parts. The audit of 165 `.tsx` files (2026-10-09) measured:
- 95 opaque colours (about 210 with alpha) against about 12 documented; 756 of 978 hex uses equal a token
  exactly; the palette defined four times (`index.css` `.rp-root`, `site.css` `.sd`, `WaitlistDialog`, `DidYouKnow`).
- The shadcn HSL tokens render off-palette: `--primary` gives #6872CA, not #5C6BC0; violet #8967C1, not #9575CD.
- 30 text sizes (120 uses below 11 px), 17 corner sizes, 92 card recipes, 131 hand-drawn buttons, 41 eyebrow
  recipes, 4 bottom sheets, 4 sign rings, 3 triad rings, 12 copies of the house easing, 47 spinners against ADR-130.
- Contrast fails: indigo text #5C6BC0 on ground 3.9:1, report muted #6E7789 4.2:1, button text #F2F4F9 on
  indigo 4.4:1, field borders #242C3B 1.4:1 (needs 3:1).

## Scope

1. **Tokens** in `packages/design` (`@workspace/design`): the source is a Tailwind v4 `@theme` file, `tokens.css`
   (classes like `bg-surface`, `text-paper-dim`, `border-line`, `rounded-card`, `text-card-title`), the best practice
   for our stack. A `tokens.ts` mirror, checked equal to it by `check:ds`, feeds the SVG drawings,
   `api/src/lib/mailer.ts`, `scripts/render-brand.mjs` and the marketing kit. No DTCG file.
   - Palette (37 tokens, the artifact's `tokens.json`): void #06080C, ground #0D1117, surface #11161F, raised #171D29,
     line #242C3B, line-soft #1A202C, line-strong for things over the page, control-edge #5A6684 (new, 3.3:1), paper
     #E8EBF2, paper-dim #AEB6C6, muted #7E889A, label-dim #767F92 (the barely-there label, 4.5:1; open question 4),
     indigo #5C6BC0 (fills only), on-indigo #FFFFFF (4.9:1), indigo-lt #9FA8DA (indigo text and links), violet
     #9575CD, brass #D4B06A, brass-dim #8A7343, rose #C46B78, back #D98C8C (a planet going backwards), error #E79AB2,
     teal #3FA796. Chapter and element hues stay as their own data group (`chapter-accent.ts` reads them).
   - shadcn names (`primary`, `muted-foreground`, `card`, `border`, `ring`, `destructive`) map onto these roles;
     `sidebar-*`, `chart-1..5`, `elevate-*`, the four palette copies and the `@replit` comments go.
   - Type: 15 named styles taken from today's best uses. Display (Newsreader 400): hero 40, section 34, page-title 30,
     sheet-title 24, card-title 20, lede 18. Text (Inter): prose 15, ui 14, small 13.5, caption 12. Label (Space
     Grotesk, only small): kicker 11 at .24em, label 11 at .16em, button-compact 13. Button (Inter 500): 15. Numbers (Plex Mono, tabular):
     data 12, data-sm 11, stat 28. Floor 11 px. Fonts unchanged.
   - Corners: inner 6 · control 8 · card 14 · sheet 20 · pill. Spacing: the 4 px scale only.
   - Motion: one curve `cubic-bezier(.16,1,.3,1)`, three durations 150 · 300 · 600 ms; loading stories keep their
     own timelines. Depth: page, card, raised (sheets, menus, windows).
2. **The library** in `web/src/ds/` by level: `atoms/`, `molecules/`, `organisms/`, `templates/`. Feature folders
   (`components/report`, `dashboard`, `timeline`, `site/`) compose parts only.
   - Atoms: Button (`ui/button` reworked onto the site's 46 px button: primary, secondary, danger, full; compact 36 px
     seen with a 44 px tap area; busy state is StatusDots), TextButton, Eyebrow, Heading, Numbers, Chip (with its icon
     slot: ToneDot, RetrogradeBadge or PlanetBody), ToneDot, RetrogradeBadge, StatusDots, Skeleton and Progress,
     TickBox, Input, Mark, PlanetBody.
   - Molecules: Card (surface, glass, tint, tone; today's favourite card is the standard, Share at the row's far end),
     Well and Strip, SegmentedControl, ChoiceTile, BirthFields (same behaviour and our own place search; one label style,
     visible edges, four pills instead of the part-of-day select, Search as ButtonCompact; open question 7), InlineError and
     Alert, Menu and Popover, EmptyState. Atoms also hold Logo (Mark, Wordmark, app icon; one Wordmark part replaces three copies).
   - Organisms: Sheet (one bottom sheet), Dialog, TopBar, ReportBlocks, HouseCard, Checklist, ChartDrawings
     (SignRing, TriadRing on `chart/wheel-geometry.ts`), Footer; ShareWindow, AskPanel, GiftFlow, QuickLook rebuilt
     on Sheet and Dialog.
   - Templates: SitePage, ReportPage, TimelinePage, AppPage, LoadingStory, AdminPage.
   - Removed: EvidenceLine, SaveReportCta, AspectChip, `ui/tooltip` (no importers).
   - Every today example has a number and a fate (The standard, Becomes, Kept as is, Small change, Removed, New)
     in the Design System: B buttons, C cards, K labels, T titles, P chips, W loading, X errors, O overlays, F fields,
     N top bars, R removed. "Keep C5" keeps one.
3. **A page per part**, beside its file (`Button.doc.md`): level, what it replaces, use it for, not for,
   versions, states, access (tap size, contrast, keyboard), do and don't, and a live example.
4. **Where it is seen**: `/admin/design` on staging, the real parts live (admin-gated, not prerendered); and a
   Design System artifact on claude.ai (the "Claude Design" type) built from the same docs and parts,
   republished by the orchestrator at each round's close, like the bible (R-8.1).
5. **The check** `pnpm check:ds`, keyless, in CI beside `check:shipped`: counts hex and rgb literals, arbitrary
   `text-[..]`, `rounded-[..]`, colour utilities and raw styled `<button>` outside `packages/design` and `web/src/ds`,
   against a baseline file. The count may only fall; it reaches zero at R21's close (drawings read `tokens.ts`).
   It also checks every declared role pair for contrast: text 4.5:1, control edges 3:1.
6. **Process**: every task card lists the parts it uses; a mock shows real parts. A missing part follows the
   five steps (look, use, add a version, propose, build once with its page). A version inside the tokens is
   Decided by Claude and shown in the round report; a new look is the Owner's.
7. **Apple and WCAG floors** (verified 2026-10-09) go into the part pages and `/web-taste`'s checks: 44 × 44 pt
   tap area, 11 pt smallest text and 17 pt body, 4.5:1 text and aim for 7:1 with custom colours, 3:1 control
   edges, one or two prominent buttons per view, a base and a raised surface in dark mode, sheets for a short
   task and one at a time, motion optional and never the only signal.

## Out of scope

- Any change to what the report says (no brain file touched; the dry lab does not run).
- A new look: colours, fonts and layout stay as approved; the visible changes are the floors in Scope 7,
  near-copy colours snapping to their token, outliers taking the standard part, and Share moving to the row's end,
  each shown in the Design System and again at 390 px in the round report.
- Figma. It can be fed later from `tokens.json`.
- Installing a third-party HIG review skill (see Decisions).
- Light mode.

## Acceptance criteria

1. `tokens.css` (with its checked `tokens.ts` mirror) is the only place a colour, size, corner, shadow or duration is written; `index.css`,
   `site.css`, `mailer.ts`, `render-brand.mjs` and the marketing kit read the generated files.
2. `bg-primary` and `text-[#5C6BC0]` render the same indigo; no off-palette colour remains in the shadcn tokens.
3. No text below 11 px on any page; every button and tappable row is at least 44 px tall or has a 44 px tap area.
4. Every role pair passes `check:ds` contrast; field and control edges are at least 3:1.
5. Every part in `web/src/ds` has its page; `/admin/design` and the Design System artifact show all of them,
   Today beside After.
6. `check:ds` runs in CI; its count never rises; at R21's close it is zero outside the allow-listed drawings,
   which use `tokens.ts` values.
7. Each screen's before and after at 390 px sits in the round report, signed-in pages included (dashboard,
   account, Timeline app, checkout: not shot in the ideation); nothing else on a screen moved.
8. The buyer walk, `check:shipped`, typecheck and both builds pass at every round's close.

## Screens

The Design System (https://claude.ai/artifact/1t3VBK8eqDmqC2pTZbWd8i) holds 40 part cards, each with Today
(real class names compiled with today's tokens, or a staging screenshot at 390 px) beside After: Foundations
(Colours, TypeScale), 15 atoms, 8 molecules, 8 organisms, 6 templates, and Removed; plus the brand book, the
tokens, and the screens, planets and logos as assets. The first ideation page holds the audit in numbers, the
two indigos, the Apple table and the rounds: https://claude.ai/artifact/CubRdNjHxtkGRQeowTnA49

## Rounds

- **R20, foundations and small parts**: the tokens package and generated files; the shadcn map fixed; type,
  corners, motion; Button, Eyebrow, Heading, Text, Numeral, Chip, ToneDot, Card, Field, Alert, SegmentedControl,
  Select; every screen moved onto them by area in parallel (dashboard, report, Timeline, site, checkout and
  sign-in, loading and share, admin); `check:ds` with its baseline; `/admin/design`; Design System artifact v1;
  `/web-taste` and MASTERFILE §9 point at the library.
- **R21, big parts and drawings**: Sheet, Dialog, Menu, Popover, AppHeader, templates; SignRing, PlanetBody,
  TriadRing; emails, share image and post kit on `tokens.ts`; `check:ds` to zero.

## Open questions

1. **When does it run?** Recommendation: R20 is the next round, planned once this locks; the first Release still
   goes whenever the Owner says promote. Default: R20 planned next.
2. **Can the small fixes show?** Text under 11 px grows to 11, buttons to 44 px, indigo text lightens to
   indigo-lt, button text turns white. Recommendation: yes. Default: yes, with before and after in the report.
3. **Where does the Owner browse it?** Recommendation: the Design System artifact plus `/admin/design`; no Figma
   for now. Default: both, no Figma.
4. **The barely-there label:** #6E7789 (today, 4.0:1 on a card) or #767F92 (4.5:1, looks almost the same)?
   Recommendation: #767F92. Default: #767F92.
5. **App buttons take the site's 46 px button?** It moves the dashboard, sheets and report bar the most.
   Recommendation: yes. Default: yes.
6. **Anything tagged Removed or Becomes to keep?** Say its number. Default: none.
7. **The birth fields proposal?** Recommendation: take it. Default: take it; any field kept by its number (F1 to F4).
8. **Big buttons in Inter?** Compared with Space Grotesk and Newsreader in the Button card. Recommendation: Inter 500
   15px. Default: Inter.

## Decisions to record

All Decided by Claude unless the Owner changes them; the rule each follows is in brackets.
1. The design system lives in `packages/design` (tokens) and `web/src/ds` (parts by atomic level); it is the only
   source for any value or part (one kind of thing, one look, ADR-172).
2. Tokens as a Tailwind v4 `@theme` file with a checked `tokens.ts` mirror, not DTCG; the documented hexes are the
   palette; shadcn names map onto roles; leftovers deleted (the Owner: code first, Tailwind best practice).
3. 15 named type styles with an 11 px floor; corners 6, 8, 14, 20, pill; one curve and three durations; three
   depths (HIG Typography, Dark Mode).
4. New palette entries: control-edge #5A6684, on-indigo white, indigo-lt for indigo text, error #E79AB2, back
   #D98C8C, label-dim #767F92 (WCAG 1.4.3, 1.4.11; HIG Dark Mode).
5. Every part has its page: use for, not for, versions, states, access, do and don't (GOV.UK and Material
   practice; the Owner's ask, 2026-10-09).
6. A new part only through the five steps; a version inside the tokens is Claude's, a new look is the Owner's
   (R-12.3, the Owner's ask).
7. `check:ds`, a keyless ratchet in CI, and a contrast check of role pairs (ADR-192, ADR-273: a check, not a test).
8. Seen at `/admin/design` and a Design System artifact republished each round close (R-8.1 pattern).
9. No third-party HIG skill: `dickwu/apple-design-skill` targets native apps and has no licence file;
   `gotired/apple-design-skills` has no licence; the verified rules go into our pages and `/web-taste` instead.
10. The migration lifts today's look; today's favourite card is the standard, Share moves to the row's far end,
    the birth fields stay, chips keep their icon slot (the Owner, 2026-10-09).
11. Two rounds, R20 and R21; no brain change, no lab.

## Sources (verified 2026-10-09, supported only)

- HIG Buttons (44 × 44 pt hit region; one or two prominent buttons per view; style, not size):
  developer.apple.com/design/human-interface-guidelines/buttons
- HIG Accessibility (44 × 44 pt default control, 11 pt minimum text, contrast table) and Typography (17 pt body,
  the Dynamic Type sizes): developer.apple.com/design/human-interface-guidelines/accessibility, /typography
- HIG Dark Mode (4.5:1 minimum, aim for 7:1 with custom colours; base and elevated backgrounds): /dark-mode
- HIG Sheets (a scoped task; one at a time), Alerts (sparingly), Motion (optional): /sheets, /alerts, /motion
- WCAG 2.2 SC 1.4.3, 1.4.11, 2.5.8 (24 px AA), 2.5.5 (44 px AAA): w3.org/TR/WCAG22
- Atomic design, five levels, "not rigid dogma", names may change: atomicdesign.bradfrost.com/chapter-2
- Material Web theming, reference, system and component tokens: github.com/material-components/material-web
- GOV.UK Design System pages ("When to use", "When not to use", "How it works"): design-system.service.gov.uk
- Skills: github.com/dickwu/apple-design-skill (1.1k stars, 383-line SKILL.md, no LICENSE),
  github.com/gotired/apple-design-skills (112 lines, web-aware, no licence shown)

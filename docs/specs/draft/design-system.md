# Design system (draft)

Status: draft, 2026-10-09 · Artifact: https://claude.ai/artifact/CubRdNjHxtkGRQeowTnA49 · Supersedes nothing;
extends MASTERFILE §9 and `/web-taste`.

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

1. **Tokens** in `packages/design` (`@workspace/design`): `tokens.json` in DTCG 2025.10 format, three tiers
   (palette, roles, component tokens only where a part needs one). Generated `tokens.css` (Tailwind v4 `@theme`,
   classes like `bg-surface`, `text-paper-dim`, `border-line`) and `tokens.ts` (SVG drawings, `api/src/lib/mailer.ts`,
   `scripts/render-brand.mjs`, the marketing kit). Generated files are never hand-edited.
   - Palette: void #06080C, ground #0D1117, surface #11161F, raised #171D29, line #242C3B, line-soft #1A202C,
     line-strong #5A6684 (new, 3.3:1, control edges), paper #E8EBF2, paper-dim #AEB6C6, muted #7E889A, indigo
     #5C6BC0 (fills only, white text 4.9:1), indigo-lt #9FA8DA (indigo text and links), violet #9575CD, brass
     #D4B06A, brass-dim #8A7343, rose #C46B78, rose-lt #E79AB2 (error text), teal #3FA796. Chapter and element hues
     stay as their own data group (`chapter-accent.ts` reads them from tokens).
   - shadcn names (`primary`, `muted-foreground`, `card`, `border`, `ring`, `destructive`) map onto these roles;
     `sidebar-*`, `chart-1..5`, `elevate-*`, the four palette copies and the `@replit` comments go.
   - Type: eight sizes 11 · 12 · 13 · 15 · 17 · 20 · 28 · 34 (display grows to 56 on wide screens). Floor 11 px.
     Fonts unchanged (Newsreader, Inter, Space Grotesk, IBM Plex Mono), one name each.
   - Corners 6 (controls) · 12 (cards) · 20 (sheet tops) · full (chips). Spacing: the 4 px scale only.
   - Motion: one curve `cubic-bezier(.16,1,.3,1)`, three durations 150 · 300 · 600 ms; loading stories keep their
     own timelines. Depth: page, card, raised (sheets, menus, windows).
2. **The library** in `web/src/ds/` by level: `atoms/`, `molecules/`, `organisms/`, `templates/`. Feature folders
   (`components/report`, `dashboard`, `timeline`, `site/`) compose parts only.
   - Atoms: Button (rework of `ui/button`: primary, secondary, text, danger; regular 44 px, compact 32 px seen with
     a 44 px tap area; busy state is StatusDots), Eyebrow, Heading, Text, Numeral, Chip, StatusDots, ToneDot, TickBox,
     Input, Textarea, Label, Select (new), Mark, Wordmark.
   - Molecules: Card (surface, glass, tint), Field, Alert and InlineError, SegmentedControl, ListRow, Menu, Popover,
     EmptyState, EvidenceCard, FactCard, TriadRow, ProgressBar.
   - Organisms: Sheet (one bottom sheet), Dialog and ConfirmDialog, AppHeader, drawing layers SignRing, PlanetBody,
     TriadRing on `chart/wheel-geometry.ts`; ShareWindow, AskPanel, GiftFlow, QuickLook rebuilt on Sheet and Dialog.
   - Templates: SiteLayout, AppPage, ReportChapter, LoadingFrame, AdminPage, LegalLayout.
   - Removed: EvidenceLine, SaveReportCta, AspectChip, `ui/tooltip` (no importers).
   - The full keep, rework, merge, new and remove list is in the artifact's Library section.
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
- A new look: colours, fonts and layout stay as approved; the only visible changes are the floors in Scope 7
  and near-copy colours snapping to their token, each shown before and after at 390 px.
- Figma. It can be fed later from `tokens.json`.
- Installing a third-party HIG review skill (see Decisions).
- Light mode.

## Acceptance criteria

1. `tokens.json` is the only place a colour, size, corner, shadow or duration is written; `index.css`,
   `site.css`, `mailer.ts`, `render-brand.mjs` and the marketing kit read the generated files.
2. `bg-primary` and `text-[#5C6BC0]` render the same indigo; no off-palette colour remains in the shadcn tokens.
3. No text below 11 px on any page; every button and tappable row is at least 44 px tall or has a 44 px tap area.
4. Every role pair passes `check:ds` contrast; field and control edges are at least 3:1.
5. Every part in `web/src/ds` has its page; `/admin/design` and the Design System artifact show all of them.
6. `check:ds` runs in CI; its count never rises; at R21's close it is zero outside the allow-listed drawings,
   which use `tokens.ts` values.
7. Each screen's before and after at 390 px sits in the round report; nothing else on a screen moved.
8. The buyer walk, `check:shipped`, typecheck and both builds pass at every round's close.

## Screens

The artifact holds: the audit in numbers, every colour in use, the two indigos, the text sizes in use, one card
before and after, how the pieces connect, the palette with contrast, the type scale, corners and motion, the
library with each part's fate, the Button page in full, Card, Field and the small parts, the five rules, the
Apple table, and the two rounds. https://claude.ai/artifact/CubRdNjHxtkGRQeowTnA49

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

## Decisions to record

All Decided by Claude unless the Owner changes them; the rule each follows is in brackets.
1. The design system lives in `packages/design` (tokens) and `web/src/ds` (parts by atomic level); it is the only
   source for any value or part (one kind of thing, one look, ADR-172).
2. Tokens in DTCG 2025.10 format, three tiers; the documented hexes are the palette; shadcn names map onto roles;
   leftovers deleted (MASTERFILE §9, consistency over novelty).
3. Eight text sizes with an 11 px floor; corners 6, 12, 20, full; one curve and three durations; three depths
   (HIG Typography, Dark Mode).
4. New palette entries: line-strong #5A6684 for control edges, white text on indigo fills, indigo-lt for indigo
   text, rose-lt for error text (WCAG 1.4.3, 1.4.11; HIG Dark Mode).
5. Every part has its page: use for, not for, versions, states, access, do and don't (GOV.UK and Material
   practice; the Owner's ask, 2026-10-09).
6. A new part only through the five steps; a version inside the tokens is Claude's, a new look is the Owner's
   (R-12.3, the Owner's ask).
7. `check:ds`, a keyless ratchet in CI, and a contrast check of role pairs (ADR-192, ADR-273: a check, not a test).
8. Seen at `/admin/design` and a Design System artifact republished each round close (R-8.1 pattern).
9. No third-party HIG skill: `dickwu/apple-design-skill` targets native apps and has no licence file;
   `gotired/apple-design-skills` has no licence; the verified rules go into our pages and `/web-taste` instead.
10. The migration keeps the approved look; only the floors and colour snaps change, shown before and after
    (playbook: never redesign what is approved).
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
- DTCG format 2025.10 stable, released 2025-10-28: github.com/design-tokens/community-group
- Material Web theming, reference, system and component tokens: github.com/material-components/material-web
- GOV.UK Design System pages ("When to use", "When not to use", "How it works"): design-system.service.gov.uk
- Skills: github.com/dickwu/apple-design-skill (1.1k stars, 383-line SKILL.md, no LICENSE),
  github.com/gotired/apple-design-skills (112 lines, web-aware, no licence shown)

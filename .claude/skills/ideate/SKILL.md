---
name: ideate
description: Stars Decoded ideation session with the Owner on a feature or topic. Explores it, publishes one HTML artifact rendering the proposal, and writes a single draft spec to docs/specs/draft/. Use when the Owner types /ideate or asks to ideate, explore, design or scope a feature. Never builds anything.
---

The topic is the text after the command. With none, ask the Owner for one.

Read `CLAUDE.md`, `docs/INDEX.md`, `MASTERFILE.md` sections the topic touches,
and any `docs/specs/draft/` file for the same topic. Check the Notion Mailbox
for open rows on it.

The Owner decides visually. Every ideation publishes one HTML artifact that
renders the proposal: mock screens for anything that touches the UI, a flow
or structure diagram otherwise, options side by side when there are options.
Publish it before asking any question and before proposing to lock; link it
from the spec. An ideation without an artifact is not finished. Use the
`artifact-design` skill; the `design` skill when the Owner wants to tweak
screens by hand.

Ask at most three questions, each with a recommendation and a default.

Output exactly one file, `docs/specs/draft/<slug>.md`, at most 200 lines, with:
scope, out of scope, acceptance criteria, screens (linked to the artifact),
open questions, and every new decision the session produced listed under
"Decisions to record".

Do not build anything. When the Owner says "lock it", run the `lock` skill
for that slug.

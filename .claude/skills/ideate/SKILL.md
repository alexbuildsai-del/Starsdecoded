---
name: ideate
description: Stars Decoded ideation session with the Owner on a feature or topic. Explores it, publishes one HTML artifact rendering the proposal, and writes a single draft spec to docs/specs/draft/. Use when the Owner types /ideate or asks to ideate, explore, design or scope a feature. Never builds anything.
---

The topic is the text after the command. With none, ask the Owner for one.

Read `docs/annex/owner-playbook.md` first: it is how the Owner decides. Propose
what it says they would pick, and skip any question it already answers,
saying which rule you followed.

Then read `CLAUDE.md`, `docs/INDEX.md`, `MASTERFILE.md` sections the topic
touches, and any `docs/specs/draft/` file for the same topic. Check `docs/backlog.md`
and the Mailbox rows its *Waiting on Alex* list links for this topic.

Outside evidence (a price, a vendor's limit, a standard, what a competitor
does) goes to the `researcher` agent, on Sonnet, not into your own searching
(ADR-190). Give it the question, not the topic: one agent for a lookup, two to
four in parallel for a comparison, never more.

Research that feeds a decision or the spec goes on to the `verifier`, with the
researcher's claims table whole. It re-fetches each URL and marks each claim
supported, unsupported or misattributed. Only supported claims reach the Owner,
in the artifact or a message, or the spec, each with its source and its
verdict; the rest are dropped. A quick lookup that feeds no decision skips the
verifier; say its claims are unverified.

Spawn both with the Agent tool, `subagent_type` `researcher` and `verifier`.
If a type is not registered in this session, spawn `general-purpose` with the
full text of its `.claude/agents/` file as the brief, the researcher on Sonnet
and the verifier on Sonnet.

The Owner decides visually. Every ideation publishes one HTML artifact that
renders the proposal: mock screens for anything that touches the UI, a flow
or structure diagram otherwise, options side by side when there are options.
Publish it before asking any question and before proposing to lock; link it
from the spec. An ideation without an artifact is not finished. Use the
`artifact-design` skill; the `design` skill when the Owner wants to tweak
screens by hand.

Parts are settled here, never in the round (the Owner, 2026-10-09). Any UI
change names the design system parts it uses (the Design System artifact and
`design-system` spec): reused as is, a version inside the tokens, or a new
part with its mock and its page (use for, not for, states, do and don't). For
each screen or part it changes, the artifact shows today beside after, every
state, and the spec says exactly what changes and what must not be lost, so
the planner and the orchestrator never invent or redraw a part.

Ask at most three questions, each with a recommendation and a default.

Output exactly one file, `docs/specs/draft/<slug>.md`, at most 200 lines, with:
scope, out of scope, acceptance criteria, screens (linked to the artifact),
open questions, and every new decision the session produced listed under
"Decisions to record".

Write the draft as soon as the artifact is up, then update it after every
answer the Owner gives, so the file always holds what is decided and what is
still open. Commit and push it to the session branch each time, so it outlives
the session even if the Owner never says lock. Long ideations get compacted,
and the summary drops detail; the file does not. After a compaction, re-read
the draft and the artifact before you reply.

At the close, once the Owner has answered and the draft is final, add what the
session taught to `docs/annex/owner-playbook.md` (ADR-195), the one file you
edit besides the draft: the recommendations they took as they were, what they
changed and why, the questions they found unnecessary, the formats they liked.
Write rules, not a diary: each dated, drawn from what the Owner said or did and
never guessed, a repeat merged into the rule it repeats, the file at most 60
lines. Then end with one report line, `Owner turns N · recommendations taken as
they were X of Y`, where N counts the Owner's messages in the session, Y the
recommendations you put to them and X those they took unchanged, so the trend
shows from one ideation to the next.

Do not build anything. When the Owner says "lock it", run the `lock` skill
for that slug.

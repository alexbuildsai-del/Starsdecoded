---
name: qa
description: Stars Decoded QA session. Spawns the qa agent to play the buyer, returning user, invitee, admin and skeptic personas against a running build with real computed charts and write findings to docs/qa/QA-NN.md. Use when the Owner types /qa [url], when a round's merge reaches staging, or when asked to QA, test or check a preview or deploy. Not for unit tests or code review.
---

The target is the text after the command, a URL. With none, use staging,
`https://starsdecoded-staging.vercel.app`: every round's merge lands there,
and after the deploy the orchestrator runs this skill on it (ADR-194). Use the
local dev servers (`pnpm run dev:api` and `pnpm run dev:web`) only when the
Owner asks for them. Before production, the QA agent runs itself in the admin
Release view on staging (ADR-86); this skill is the hand-played session.

Spawn the `qa` agent with that target, on Sonnet at high effort: Agent tool,
`subagent_type` `qa`, `model` `sonnet`; its file pins both. If that type is not
registered in this session, spawn `general-purpose` on Sonnet with the full
text of `.claude/agents/qa.md` as its brief. When it returns, relay the sev-1
findings in full and the count of sev-2 and sev-3, and name the report file.

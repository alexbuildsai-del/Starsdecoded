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

First, before any page is opened (ADR-272, 315, 360):

1. **Read the walk.** Fetch `<target>/api/qa/latest` (the verdict: sha, mode,
   status, steps, findings, `shots`). On staging also fetch each step's
   picture from `<target>/api/qa/latest/shots/<step>` for the steps in `shots`.
   A 404 means none yet; say so and go on. Other targets answer 404 here.
2. **Check the hosts.** Request each of these once (`curl -sS -m 10 -o
   /dev/null -w '%{http_code}'`, through `HTTPS_PROXY`); any answer from the
   site counts as reachable, a refusal, a proxy 403 or a timeout does not:
   Clerk's frontend host (the `*.clerk.accounts.dev` one the page loads),
   `js.stripe.com`, `api.stripe.com`, and the four in MB-227:
   `challenges.cloudflare.com`, `hcaptcha.com`, `pm-redirects.stripe.com`,
   `billing.stripe.com`.
3. **Plan the session.** Every host that answers: play its steps by hand, as
   before. Each one that does not: do not play or file those steps; read them
   from the walk's verdict and pictures, and list the host in the report as
   "not reachable from this session", never as a product finding.

Hand the agent the target, the verdict, the picture list and the unreachable
hosts. Spawn the `qa` agent with that, on Sonnet at high effort: Agent tool,
`subagent_type` `qa`, `model` `sonnet`; its file pins both. If that type is not
registered in this session, spawn `general-purpose` on Sonnet with the full
text of `.claude/agents/qa.md` as its brief. When it returns, relay the sev-1
findings in full and the count of sev-2 and sev-3, and name the report file.

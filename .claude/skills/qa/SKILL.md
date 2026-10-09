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

First, before any page is opened (ADR-272, 315, 360, 387):

1. **Read the walk.** Fetch `<target>/api/qa/latest` (the verdict: sha, mode,
   status, steps, findings, `shots`). On staging also fetch each step's
   picture from `<target>/api/qa/latest/shots/<step>` for the steps in `shots`.
   A 404 means none yet; say so and go on. Other targets answer 404 here.
2. **Check the hosts.** Request each of these once (`curl -sS -m 10 -o
   /dev/null -w '%{http_code}'`, through `HTTPS_PROXY`); any answer from the
   site counts as reachable, a refusal, a proxy 403 or a timeout does not:
   Clerk's frontend host (the `*.clerk.accounts.dev` one the page loads),
   `js.stripe.com`, `api.stripe.com`, and three in MB-227: `hcaptcha.com`,
   `pm-redirects.stripe.com`, `billing.stripe.com`. No Cloudflare host: /qa
   signs in, and only sign-up loads Turnstile (B-74).
3. **Check the account.** On staging, /qa signs in as its own account, whose
   address is `QA_ACCOUNT_EMAIL` in this session's environment (ADR-387).
   Test that it is set (`[ -n "$QA_ACCOUNT_EMAIL" ]`) and never print it.
   When it is not, say so plainly: "QA_ACCOUNT_EMAIL isn't set in this
   session, so /qa can't sign in. Copy the address from the QA account row on
   the staging Sales page into this session's environment." Then read every
   signed-in step from the walk.
4. **Known findings.** List every finding of the last `docs/qa/` report and
   every `docs/backlog.md` line citing a QA report that is still open, one
   line each with its number. The agent re-checks each in one line (still open
   or fixed) and never files it again as new (ADR-422).
5. **Plan the session.** Every host that answers: play its steps by hand, as
   before. Each one that does not: do not play or file those steps; read them
   from the walk's verdict and pictures, and list the host in the report as
   "not reachable from this session", never as a product finding.

Hand the agent the target, the verdict, the picture list, the unreachable
hosts, the known findings and whether `QA_ACCOUNT_EMAIL` is set, never the
address itself. Spawn the `qa` agent with that, on Sonnet at medium effort: Agent tool,
`subagent_type` `qa`, `model` `sonnet`; its file pins both. If that type is not
registered in this session, spawn `general-purpose` on Sonnet with the full
text of `.claude/agents/qa.md` as its brief. When it returns, relay the sev-1
findings in full and the count of sev-2 and sev-3, and name the report file.

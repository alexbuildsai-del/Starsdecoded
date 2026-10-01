# Agent roster

Ideation 2026-10-01 with the Owner, after a read of Ruflo (ruvnet/ruflo, ex
claude-flow). Status: locked 2026-10-01 (ADR-187 to 196), built in R13. Artifact: https://claude.ai/artifact/6gBLyAD4yNBzhLJ82Ut8xp

Ruflo's routing turned out to be keyword matching that only prints a suggestion,
and its savings figures are marked unverified in its own repo. Its 300 MCP tools
add 15k to 25k tokens to every session. We copy three ideas and install nothing:
a task goes to the cheapest model that can do it, a failed check moves it up a
tier, and spend is counted from real usage. The planner sets the tier, because it
has read the spec and judges difficulty better than a keyword list.

## Scope

1. **Tier on every card.** The planner gives each task card a line
   `Tier: opus | sonnet | haiku — <one reason>`, using this rubric, which makes
   R-0.7 concrete:
   - **Opus** for the brain paths, schema, money, credits, access and consent
     (`access.ts`, `credits.ts`, checkout, webhook), auth, anything security,
     a new screen or flow, and any card touching more than one package.
   - **Sonnet** for a change inside one package with its tests, copy and style
     edits, a UI tweak to an existing component, and tests on their own.
   - **Haiku** for mechanical work: renames, codegen re-runs, formatting,
     INDEX regeneration, file moves.
   - A card the planner is unsure of is Opus.
2. **The orchestrator obeys the tier.** `/round` spawns each builder with the
   card's `model`. Opus builders keep max effort; Sonnet builders run at high and
   Haiku builders at medium.
3. **Escalation.** A Sonnet or Haiku builder that fails its own gate twice, or
   stops on a question, is re-dispatched once on Opus with the failure attached.
   A card escalated in two rounds running teaches the planner: the round report
   names the pattern.
4. **The spend line.** Every round report gets one `Spend` line: subagent tokens
   per tier, taken from the Agent tool's own usage figures; the number of cards
   per tier; and the escalations. This replaces R-13.3's "when a round felt heavy".
5. **Every agent file pins its model and effort.** `qa` gets Sonnet at high.
6. **Four new agents**, each at most 50 lines, read-only unless stated:

   | Agent | Model | Tools | Runs at |
   |---|---|---|---|
   | `researcher` | Opus, high | Read, Grep, Glob, WebSearch, WebFetch | `/ideate` when the topic needs outside evidence; prompt research |
   | `verifier` | Sonnet, medium | Read, WebFetch | after a researcher whose findings feed a spec or a decision |
   | `tester` | Sonnet, high | Read, Grep, Glob, Bash, Edit, Write (test files only) | `/round`, once per parallel group with logic changes |
   | `sentinel` | Opus, max | Read, Grep, Glob, Bash | `/round` gate on the round's diff; full audit before a Release |

   - **researcher** works from the question, not a topic. One agent for a
     lookup, two to four in parallel for a comparison, never more. It prefers
     primary sources (vendor docs, standards, advisories, source code) and
     returns a claims table: claim, URL, source type, date, and whether it was
     read in full.
   - **verifier** checks research, not the report: the report's citations are
     the brain's job (`evidence.ts`). Research agents invent or misquote
     sources. One false fact in an ideation, such as a price, a library's
     limit or what a competitor does, becomes a locked decision. The verifier
     splits the findings into single claims, re-fetches each URL and marks
     each claim supported, unsupported or misattributed. Only supported
     claims reach the Owner or a spec. It is skipped for a quick lookup.
   - **tester** writes the tests the builders' cards did not, for the files a
     group changed in `api/src/lib/`, `packages/*` and `web/src/lib/`. It never
     edits a non-test file; a bug it finds goes to the orchestrator as a failing
     test.
   - **sentinel** reviews code, not a running site, so it needs no deploy. It
     reads the checklist in `docs/specs/locked/security-hardening.md` (scope 9)
     and runs the built-in `/security-review`. A blocking finding stops the
     round until a builder card fixes it, and the sentinel re-reads the fix. A
     non-blocking finding becomes a Mailbox row. It cannot run in GitHub CI,
     which holds no key, so the orchestrator runs it in the session. It runs at
     two points:
     - **Round gate.** It reads the round's diff (`main...round/RNN`) after the
       builders, the tester and the green gate commands, before the PR opens.
       A finding never reaches `main` or staging.
     - **Before a Release.** When the Owner says "promote", it audits all of
       `main`, not a diff, before the Release view runs. Its first run is such
       an audit, which covers every round built before it existed.
7. **Hooks** in `.claude/settings.json`. A `PreToolUse` script exits 2, which
   blocks the call, on:
   - an Edit or Write to `.env*` or to the generated client and zod files
     (`packages/api-client-react/src/generated/**`,
     `packages/api-zod/src/generated/**`), which CLAUDE.md already forbids;
   - a Bash `git push` to `production` or `main`, or a `curl … | sh` style
     install.

   `permissions.deny` also blocks reading `.env*`.
8. **Shipped-code check**, `scripts/check-shipped.ts`, run in CI. Outside
   tests, fixtures and docs it fails on:
   - `console.log`;
   - `localhost` or `127.0.0.1`;
   - a TODO without an `MB-NN` ref;
   - a new use of "Astra";
   - an import from `api/` inside `web/`.

   It names the file and line.
9. **Site checks on the Vercel preview**, keyless, in a new
   `site-checks.yml` after `smoke.yml`:
   - **Lighthouse CI** on home, /sample and /faq, with budgets LCP ≤ 2.5 s,
     CLS ≤ 0.1, accessibility ≥ 95, and reports kept as workflow artifacts,
     never on a public link;
   - **axe on Playwright** over every prerendered public page, failing on
     serious or critical WCAG 2.2 AA violations.

   The `qa` agent adds a keyboard pass to the Skeptic persona.

10. **The running site is checked by code, not an agent.** These checks run in
    CI on the PR's Vercel preview, with no key:
    - `site-checks.yml` (scope 9) runs Lighthouse and axe;
    - a security probe in `smoke.yml` asserts the headers, and asserts that no
      CORS header is sent and a foreign-Origin POST gets 403.

    The same probe runs again on staging after the merge.
11. **QA after every round.** Once a round's merge reaches staging, the
    orchestrator runs `/qa` on the staging URL. The qa agent plays the
    personas and writes `docs/qa/QA-NN.md`. The Owner gets the URL and that
    report together, and the next plan takes every sev-1 as a goal.

12. **The learning loop.** Two files, each at most 60 lines of rules, not a
    diary. Both are kept in `docs/annex/`.
    - **`owner-playbook.md`** is how the Owner decides. `/ideate` reads it
      first and, at its close, adds what this session taught. That covers
      which recommendations the Owner took as they were, what they changed
      and why, the questions they found unnecessary, and the formats they liked.
      The next ideation uses it to propose closer to their answer and to ask
      fewer questions. Each ideation's report line counts the Owner's turns
      and the recommendations taken as they were, so the trend shows.
    - **`lessons.md`** is what the workers got wrong. At each round's close
      the orchestrator reviews every card: each gate failure, escalation,
      sentinel finding and QA sev-1 traced back to its card. It writes one
      line per cause. A cause seen in two rounds becomes a rule in the agent
      file or skill it belongs to, for example a builder line ("run codegen
      after `openapi.yaml`") or a planner tier rule. The round report lists
      the rules promoted. A rule that has not recurred for 5 rounds after
      promotion is retired, to keep the agent files within budget.

## Out of scope

- Installing Ruflo or any agent framework, MCP server or background daemon.
- Learned or bandit routing. Revisit when the spend line has 3 rounds of data.
- An Anthropic key on GitHub (the security-review Action) or agent teams.
- Visual regression screenshots: baselines flake until the pages settle.
- Playwright on app routes or anything that signs in or generates.

## Acceptance criteria

1. The next plan carries a `Tier:` line on every card, and its round report has
   a `Spend` line with tokens per tier, cards per tier and escalations.
2. A Sonnet builder whose card fails the gate twice is re-run on Opus and the
   report says so.
3. `.claude/agents/` holds builder, planner, qa, researcher, verifier, tester and
   sentinel, every file pinning `model` and `effort`, none over 50 lines.
4. Asking a session to edit `.env` or a generated zod file is refused by the
   hook with its reason. `git push origin production` is refused the same way.
5. `ci.yml` fails on a planted `console.log` in `api/src/lib/`, naming file and
   line, and passes on main.
6. `site-checks.yml` runs on a preview, posts Lighthouse and axe results as
   artifacts, and fails on a planted missing `alt`.
7. An `/ideate` that needs outside evidence shows the verifier's verdict for
   each claim it relays.
8. MASTERFILE R-0.7, §11.2 and R-13.3 and CLAUDE.md's agent line describe the
   roster; INDEX.md lists the four new agents.
9. The round that builds this spec closes with the sentinel's first full
   audit of `main` in its report, and with a `docs/qa/QA-NN.md` from staging.
10. A PR whose preview sends `Access-Control-Allow-Origin`, or lacks HSTS,
    fails the probe in CI.
11. The first ideation after the lock reads `owner-playbook.md` and adds to
    it. The round after the lock writes `lessons.md`, and its report lists
    any rule promoted.

## Screens

No product screen changes. The artifact draws the pipeline with each agent at
its step and model, the tier rubric, the escalation path and a sample `Spend`
line. Artifact: https://claude.ai/artifact/6gBLyAD4yNBzhLJ82Ut8xp

## Open questions

None. Playwright in CI for axe on public pages was approved by the Owner on
2026-10-01, with no key and no sign-in.

## Decisions to record

Recorded as ADR-187 to 196, in this order.

- Planner sets a model tier per card using the rubric in scope 1; the
  orchestrator spawns by it (amends R-0.7).
- Cheap-first with one escalation to Opus after two gate failures.
- Every round report carries a Spend line (amends R-13.3).
- Four agents join the roster: researcher, verifier, tester and sentinel, with
  their models and tools as above.
- A PreToolUse hook guards secrets, generated files and protected branches.
- CI adds the shipped-code check, and a keyless site-checks workflow runs
  Lighthouse and axe on the preview (amends CLAUDE.md's "no Playwright").
- The sentinel runs in the session at two points: on the round diff before
  the PR opens, and as a full audit of `main` before every Release.
  Runtime security is checked by a keyless probe on the preview and staging.
- Ideation research runs on Opus; the verifier checks research that feeds a
  decision, never the report.
- A learning loop: an Owner playbook updated by every ideation, and a lessons
  file updated by every round, whose repeats become agent rules.
- Every round closes with `/qa` on staging, and the Owner gets the QA report
  with the URL (amends §11.2 step 6).
- No agent framework is installed. Ruflo is read for ideas only.

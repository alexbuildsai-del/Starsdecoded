# Owner playbook

How the Owner decides. `/ideate` reads it before it proposes, to put forward what he would pick, to skip a question a rule
already answers and to say which rule it followed, and at its close edits it with what the session taught (agent-roster
scope 12, ADR-195). Rules, not a diary: at most 60 lines, each rule dated or tied to its document, nothing guessed, a repeat
merged into the rule it repeats.

## Took as proposed
- **Keyless checks, narrowly scoped.** Playwright for axe on the public pages, no key, no sign-in: the default, approved
  2026-10-01 (agent-roster, Open questions; ADR-192). Propose a check that way and do not re-ask.
- **The default carries an ask.** "go", with MB-93, 128 and 129 left at their defaults (R12 report, built 2026-10-01). Write
  each ask so that his silence is safe.
- **Housekeeping on a yes.** The /round skill swap, removing a promise from the site, /sample refreshed from each
  Release, the round order at its default (Review 02/10, 2026-10-02). Small, reversible operations need one line, not a
  question.

## Changed, and why
- **No hotfix.** Production serves non-admins only healthz, the waitlist and the admin (ADR-167), and the app's session data
  lives on staging, which has no real visitors, so the security fixes wait for R13, then a QA, then the first Release
  (security-hardening, Open questions, 2026-10-01; ADR-204).
- **He orders the rounds.** Pricing and launch went behind the website (R11 plan, 2026-09-30), Review 01/10 (R12 plan,
  2026-10-01) and security with the roster (ADR-204): deferred three times (R14-plan header). Offer an order as a recommendation.
- **Less text on public pages.** Three quote cards with counts became one annotated line: "simple", one actionable
  example, no figures "no one's gonna read" (Review 02/10, 2026-10-02). Propose the shortest version first.
- **Speed of entry beats pickers.** Three date boxes with a month list became one typed field that jumps ahead
  (Review 02/10). Forms are judged by how fast a birth date goes in.
- **The real fix, never a fallback.** A Chiron formula offered as a stopgap read as "a workaround" (Review 02/10):
  propose the proper fix alone and say what it needs.
- **Don't redraw what was only misread.** The look-alike nodes stay; the answer was the explanation (Review 02/10).

## Asked for
- **Opus for orchestrating, planning and research.** The orchestrator (the Owner, ADR-137), planning (R-0.7) and, from
  2026-10-01, research, with the verifier on any claim that feeds a decision (agent-roster scope 6; MASTERFILE §11.1).
- **A process that learns.** This file after every ideation, `lessons.md` after every round (agent-roster scope 12, ADR-195,
  2026-10-01).
- **Fewer questions, each with a default.** At most three, highest stakes first, each with a recommendation and what happens
  if he is silent (R-12.1; "For the Owner" in the R11, R12 and R13 plans). Never a chore: he tests the site and says yes or
  no, and operations are Claude's (R-12.5; CLAUDE.md).
- **What only he holds, he supplies or defers.** A name, a contact address, Resend's domain, a token: given before R11 began
  (R11 report, built 2026-09-30). Otherwise "Continue without this for now" (2026-09-27): build the rest behind marked
  seams (R-12.4) and never hold the round.
- **No secret on GitHub, ever** (the Owner, 2026-09-25; CLAUDE.md): no proposal may need one (agent-roster, Out of scope).
- **Keep what already looks great, and don't repeat a promise.** Add to a section the Owner likes without touching its
  visuals, and check a new line against every section on the page (Review 02/10, 2026-10-02).

## Formats he likes
- **An HTML artifact before any question or lock.** He decides visually (MASTERFILE §11.1). Phone first, 390 px before
  desktop (§9, ADR-171).
- **The annotated line** (moment, chart, something to try) also as a marketing post (Review 02/10).

## His own lines, verbatim
- "Continue without this for now." The Owner, 2026-09-27, `docs/rounds/R14-plan.md` (pricing and launch, first written as
  R11): his name, address and accounts were not supplied.
- "I would like the new website and the waitlist overlay on top of it. Let's leave Stripe settings on the side, I will handle
  that in another round, and yes, we're going to keep going with Stripe." The Owner, 2026-09-30, `docs/rounds/R11-plan.md`.
- "go". R12's approval, with MB-93, 128 and 129 at their defaults (`docs/rounds/R12-report.md`, built 2026-10-01).
- The two writers: "sol on the foundation, luna on everything else for the brain/prose". The Owner, 2026-10-01,
  `docs/rounds/R12-plan.md`; his word settled the mix and the gate still ran (ADR-184).
- The coffee voice: "two friends talking over coffee". The Owner, 2026-10-01, verbatim in ADR-185 (`docs/rounds/R12-plan.md`),
  which the plan reads as neither too high nor too low.

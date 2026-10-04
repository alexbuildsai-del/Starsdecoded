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
- **Housekeeping on a yes.** The /round skill swap, a promise removed, /sample from each Release (Review 02/10); fifteen
  built-at-default rows closed in one line (sweep 03/10). Small, reversible operations need one line, not a question.

## Changed, and why
- **No hotfix.** Production serves non-admins only healthz, the waitlist and the admin (ADR-167) and staging has no real
  visitors, so security fixes waited for R13, a QA, then the first Release (security-hardening, 2026-10-01; ADR-204).
- **He orders the rounds.** Pricing went behind the website, Review 01/10, security and Review 02/10, then "don't plan it",
  Timeline first, pricing "whenever I say" (sweep 03/10); then R16 Timeline, Stripe, a fixes round (stripe-payments, 04/10).
- **Less text, never fewer parts.** One annotated line read "nor understandable" (Review 02/10): the fewest examples, each
  whole, picked by hand (home-report-section); "just remove that line", "Not me" kept two buttons (sweep 03/10).
- **Speed of entry beats pickers.** One typed date field that jumps ahead, not three boxes (Review 02/10).
- **The real fix, never a fallback.** A Chiron formula offered as a stopgap read as "a workaround" (Review 02/10):
  propose the proper fix alone and say what it needs.
- **A visual that says what we sell beats the safest layout.** Share cover: the centred wheel was "nice" but "not wow"; he
  took the headline beside it (share-cover, 03/10); our own checkout page over Stripe's branded one (stripe-payments, 04/10).
- **Out of scope is not "never".** Campaigns on Timeline: "I don't want to say always… right now, it's out of scope"
  (stripe-payments, 2026-10-04). Record such a cut as out of scope, never as a rule.
- **One home for a service's keys.** He put Stripe's publishable key on Railway, where the plan said Vercel; the plan moved:
  every key of a service on Railway, the web given what it needs by the API (stripe-payments, 2026-10-04).
- **Don't redraw what was only misread.** The look-alike nodes stay; the answer was the explanation (Review 02/10).

## Asked for
- **Opus for orchestrating, planning and research**, the verifier on claims that feed a decision (ADR-137, R-0.7, §11.1).
- **A process that learns.** This file after every ideation, `lessons.md` after every round (ADR-195, 2026-10-01).
- **Fewer questions, each with a default.** At most three, highest stakes first, a recommendation and the silent default
  (R-12.1); never a chore (R-12.5); never re-ask what a lock on any branch settled (release-one-findings, 2026-10-03).
- **What only he holds, he supplies or defers.** Given before R11 (name, contact, a token), else "Continue without this for
  now" (2026-09-27): build behind marked seams (R-12.4), never hold the round. Give it as one checklist, when each item is
  due, sandbox first and the rest "after" (stripe-payments, 2026-10-04).
- **Testing is ours, never his.** Steps for a second account met "I don't want to be testing by myself. You should be
  testing automatically" (2026-10-04): propose server-made test accounts and a walk after each deploy, never clicks for him.
- **No secret on GitHub, ever** (the Owner, 2026-09-25; CLAUDE.md): no proposal may need one (agent-roster, Out of scope).
- **Keep what already looks great, and don't repeat a promise** across a page's sections (Review 02/10, 2026-10-02).

## Formats he likes
- **An HTML artifact before any question or lock.** He decides visually (MASTERFILE §11.1). Phone first, 390 px before
  desktop (§9, ADR-171).
- **The workbook card** (moment, chart, check, something to try), also as a marketing post; "go with A" (03/10).
- **Dashboards screen by screen.** He sets up Stripe from screenshots: name the option to pick on that screen and what the
  next one will ask, with exact values to paste (stripe-payments, 2026-10-04).

## His own lines, verbatim
- "Continue without this for now." The Owner, 2026-09-27, `docs/rounds/R14-plan.md` (pricing and launch, first written as
  R11): his name, address and accounts were not supplied.
- "Let's leave Stripe settings on the side, I will handle that in another round." 2026-09-30, `docs/rounds/R11-plan.md`.
- "go". R12's approval, with MB-93, 128 and 129 at their defaults (`docs/rounds/R12-report.md`, built 2026-10-01).
- "sol on the foundation, luna on everything else for the brain/prose". 2026-10-01, R12 plan; the gate still ran (ADR-184).
- "two friends talking over coffee". 2026-10-01, the voice, verbatim in ADR-185 (R12 plan).

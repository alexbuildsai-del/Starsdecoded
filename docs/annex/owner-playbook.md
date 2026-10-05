# Owner playbook

How the Owner decides. `/ideate` reads it before it proposes, to put forward what he would pick, to skip a question a rule
already answers and to say which rule it followed, and at its close edits it with what the session taught (agent-roster
scope 12, ADR-195). Rules, not a diary: at most 60 lines, each rule dated or tied to its document, nothing guessed, a repeat
merged into the rule it repeats.

## Took as proposed
- **Keyless checks, narrowly scoped.** Playwright for axe on the public pages, no key, no sign-in (agent-roster; ADR-192).
- **The default carries an ask.** "go", with MB-93, 128 and 129 at their defaults (R12); "lock it" with Mixed's wording
  left at its default (review-05-10, 2026-10-05). Write each ask so that silence is safe.
- **Housekeeping on a yes.** Small, reversible operations need one line, not a question (Review 02/10; sweep 03/10).

## Changed, and why
- **No hotfix.** Staging has no real visitors and production is the waitlist, so fixes wait for a round, a QA, then a
  Release (security-hardening, 2026-10-01; ADR-204).
- **He orders the rounds.** Pricing "whenever I say" (sweep 03/10). Never slot pricing in between rounds; read the latest
  Decisions rows before reading his words about rounds (ADR-254, a misread).
- **Less text, simple words, everywhere.** One annotated line, not three quote cards (Review 02/10); the fewest examples,
  each whole (home-report-section); a "so dramatic" line made plain (timeline-page). Never make him ask again.
- **Name it, never "things".** "I hate when we do things": say transits, cycles, items (review-05-10, 2026-10-05).
- **Spans, not counts.** Week cells of day totals were "a clusterfuck of numbers"; one bar per transit across Monday to
  Sunday, its start and end marked, was loved (review-05-10). Show how long something lasts, not how many.
- **Prose is fixed in the prompt, not with a new test.** "I don't want to invent new tests"; a rule for a headline or a
  1st-house line goes into the prompt's instruction (review-05-10, 2026-10-05).
- **Reuse, never redesign what is approved.** The hero: "please don't make this different", only the value replaces the
  sentence; Life's card is the Your cycles card; Did you know reuses the product's drawings and leaves the loading
  progress alone; bundles keep their names (review-05-10). Keep what already looks great (Review 02/10).
- **Speed of entry beats pickers.** One typed date field, not three boxes (Review 02/10).
- **Ship it as normal, not behind a flag.** A subscriber gets it all, everyone else a teaser (timeline; ADR-262 to 264).
- **The real fix, never a fallback.** A stopgap read as "a workaround" (Review 02/10): propose the proper fix alone.
- **A visual that says what we sell beats the safest layout** (share-cover, 2026-10-03).
- **Don't redraw what was only misread.** The look-alike nodes stay; the answer was the explanation (Review 02/10).

## Asked for
- **Opus for orchestrating, planning and research**, with the verifier on any claim that feeds a decision (ADR-137, R-0.7).
- **A process that learns.** This file after every ideation, `lessons.md` after every round (ADR-195).
- **Fewer questions, each with a default.** At most three, each with a recommendation and what silence means (R-12.1).
  Read the day's locks on every branch first: never re-ask what one settled (release-one-findings, 2026-10-03).
- **What only he holds, he supplies or defers.** "Continue without this for now" (2026-09-27): build the rest behind
  marked seams (R-12.4) and never hold the round.
- **No secret on GitHub, ever** (2026-09-25): no proposal may need one. Staging's database key stays on Railway too.
- **Evidence before a claim.** "Are you sure? Can you give me an example": check a stored report or the engine before
  saying what the product does; a wrong "it already explains retrograde" was caught (review-05-10, 2026-10-05).
- **Astrology calls are ours.** "You are the specialist in astrology": propose which chapters explain what, for every
  planet the chart shows, and why it matters (review-05-10). Known ideas (retrograde) may be explained; the method may not.
- **A card reads top-down.** The idea, then "for you", then the value, then the date; the science behind an ⓘ; explicit
  enough that Read more is not needed (review-05-10, Life).
- **A promise needs its proof.** Every feature on a product page is a promise, why you'd care and a visible example
  (timeline-page v3, 2026-10-03). Start from visuals an earlier ideation already drew.
- **No price before it's real.** "Keep it as coming soon" (timeline-page, 2026-10-03).
- **Keep a log of what he asks to have explained.** It feeds the Did you know card (review-05-10, 2026-10-05).

## Formats he likes
- **An HTML artifact before any question or lock**, phone first, 390 px before desktop (§11.1, §9, ADR-171); live mocks
  he can drag and watch (the Life line, the rotating card) and a green box showing what changed after each answer.
- **The workbook card** (moment, chart, check, something to try), also as a post (home-report-section, 2026-10-03).
- **Before and after tables** for any wording change: "I really like your before and after" (2026-10-03).
- **A fixed small label over a title that finishes it**: "DID YOU KNOW" in brass, then "Why east is on the left?", no
  leading dots, no icons, no close button (review-05-10, 2026-10-05).

## His own lines, verbatim
- "Continue without this for now." 2026-09-27 (`R14-plan.md`). "go". R12's approval (`R12-report.md`).
- "sol on the foundation, luna on everything else for the brain/prose". 2026-10-01 (ADR-184).
- "two friends talking over coffee". 2026-10-01 (ADR-185).
- "Just add the bloody Gemini … degree, just like the moon and the sun has it." 2026-10-05 (review-05-10, the hero).

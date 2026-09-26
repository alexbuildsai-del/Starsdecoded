---
name: ux-copy
description: Write or review any words a Stars Decoded user reads outside the report itself: landing and marketing pages, artifact mocks, UI labels, buttons, empty states, errors, emails, FAQ. Plain, human language that passes the coffee test, grounded in the report's style contract. Use before writing or editing any user-facing copy, when the Owner types /ux-copy, or when copy is called AI-sounding, slop or too high level. Not for report prose, which the brain's prompts own.
---

The target is the text after the command: a page, a file or pasted copy. With none,
review the copy touched in this session.

Read first: the style contract and the writer line in `api/src/prompts/system.ts`
(rules 1 to 12), MASTERFILE R-5.1, R-5.2, R-6.3 and §9 Voice, the names in
`web/src/lib/product.ts`, and `api/src/lib/failureReasons.ts` as the model for how an
error talks. Marketing and UI copy keep the report's discipline in an everyday
register: "You're not selling astrology. You're selling a structured self-knowledge
report that happens to use planetary data" (MASTERFILE §1).

**The coffee test.** Read each line out loud as if to a friend across the table. If
you would not say it like that, rewrite it. Warm and simple, never slangy.

1. **Say what it is.** A birth chart, a report, the people in your life. No slogan the
   reader has to decode: "Your birth chart, explained in plain words", not "The sky
   you were born under, read closely".
2. **About the reader, in behaviour.** Say what they will see or do (style contract
   rule 2). No abstract summary sentences (rule 5); give the concrete instance.
3. **People are people.** You read a report, not a person; nobody "joins your sky".
   Name them: your partner, your kids, your friends.
4. **Your, not the.** Your body, your home, your family. Never "the body", "the self",
   "the private world" or "one's".
5. **Plainer beats cleverer** (rule 7). Everyday words: work out, check, show, add,
   pick. Not compute, surface, unlock, navigate, lean into, resonate, journey,
   profound. No coined phrases or figurative pairings (rule 12). An astrology word
   only with its plain meaning in the same sentence, and never method talk (rule 1).
6. **Short** (rule 8, R-5.1). One idea per sentence, 15 words on average, none over
   25. Headlines under eight words. Say it once.
7. **No rhythm tricks.** No "X first. Y second.", no "not X but Y", no lists of three
   for the sound, no rhetorical questions, no poetic inversions like "read closely".
8. **Honest and exact.** Facts and numbers come from code, never typed (R-6.3). No word
   counts, predictions, dates, fate, destiny, energy or hype (R-5.2). Promise only
   what ships; say "an AI writes it" plainly.
9. **Punctuation.** No em dashes, no semicolons, no exclamation marks, no emojis.
   Small-caps labels are fine; whole sentences in capitals are not.
10. **Buttons and errors.** A button says what happens next: "Show my chart", "Get my
    report". An error says what happened and what to do, like "Our writing service
    didn't answer. Try again in a few minutes."
11. **Names as the product says them:** Personal natal report, Compatibility report.
    Never synastry; never the retired name.
12. **Report text is quoted, never edited.** If a real sentence from a report fails
    these rules, show a different real one and raise the prompt rule it breaks (report
    lab or Mailbox). The UI writes no astrological prose of its own (ADR-18).

**How to work.** List every string you write or review, including labels, buttons,
alt text and errors. Mark each pass or fail with the rule it breaks, rewrite the
fails, then read the whole page aloud once more. A review answers with a table:
where, current, problem, rewrite. Keep lines the Owner approved unless they fail a
rule; then name the rule and offer the rewrite.

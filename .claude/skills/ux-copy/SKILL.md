---
name: ux-copy
description: Write or review any words a Stars Decoded user reads outside the report itself: landing and marketing pages, artifact mocks, UI labels, buttons, empty states, errors, emails, FAQ. Plain, human language that passes the coffee test, grounded in the report's style contract. Use before writing or editing any user-facing copy, when the Owner types /ux-copy, or when copy is called AI-sounding, slop, marketing-y or too high level. Not for report prose, which the brain's prompts own.
---

The target is the text after the command: a page, a file or pasted copy. With none,
review the copy touched in this session.

Read first: the style contract and the writer line in `api/src/prompts/system.ts`
(rules 1 to 12), MASTERFILE R-5.1, R-5.2, R-6.3 and §9 Voice, the names in
`web/src/lib/product.ts`, and `api/src/lib/failureReasons.ts` as the model for how an
error talks. Marketing and UI copy keep the report's discipline in an everyday
register: "You're not selling astrology. You're selling a structured self-knowledge
report that happens to use planetary data" (MASTERFILE §1).

**The coffee test.** Ask the question a line answers, answer it out loud as you would
to a friend across the table, and write down what you actually said. Then cut words,
never meaning. Warm and simple, never slangy.

1. **Headings are said, not styled.** Write the sentence you would say, with a subject
   and a verb: "Find out what your birth chart says about you", "You can see where every
   line comes from", "Here's what your report covers". Never the "noun, phrase" fragment
   every marketing site uses ("Your birth chart, explained in plain words", "Three steps,
   from X to Y"), in a heading, a tagline or anywhere else. No full stop at the end of a
   heading or of a description that is not a full sentence.
2. **Don't chop.** No strings of short sentences or fragments for effect ("No scores.",
   "Free.", "Ten chapters about you."). Join them the way people talk, with and, but, so.
   One idea per sentence, 15 words on average, none over 25 (rule 8, R-5.1).
3. **No rhythm tricks.** No "X first. Y second.", no "not X but Y", no lists of three for
   the sound, no "Question? Short answer." pairs, no poetic inversions like "read
   closely".
4. **Say what it is, about the reader.** A birth chart, a report, the people in your
   life, and what the reader will see or do (rule 2). No abstract summary sentences
   (rule 5); give the concrete instance.
5. **People are people.** You read a report, not a person; nobody "joins your sky".
   Name them: your partner, your kids, your friends.
6. **Your, not the.** Your body, your home, your family. Never "the body", "the self",
   "the private world" or "one's".
7. **Plainer beats cleverer** (rule 7). Work out, check, show, add, pick. Not compute,
   surface, unlock, navigate, lean into, resonate, journey, profound. No coined phrases
   (rule 12). An astrology word only with its plain meaning nearby; no method talk.
8. **Name the report.** Where two reports could be meant, use the names: "When you both
   have a Personal natal report, you can get a Compatibility report about the two of
   you." Never "one", "a report" for the second, or "the pair of you". Never synastry.
9. **Keep the method simple.** We work out your chart, note what stands out, write your
   report and check it. No vendor or model names, and never lead with AI: the report
   must not feel machine-made. Asked directly (the FAQ), say plainly that AI helps
   write it; never suggest a person writes it (no astrologer, nothing "hand-written").
10. **Honest and exact.** Facts and numbers come from code, never typed (R-6.3). No word
    counts, predictions, dates, fate, destiny, energy or hype (R-5.2).
11. **Punctuation.** No em dashes, semicolons, exclamation marks or emojis. Small-caps
    labels are fine; whole sentences in capitals are not.
12. **Buttons and errors.** A button says what happens next: "Show my chart". An error
    says what happened and what to do: "Our writing service didn't answer. Try again
    in a few minutes."
13. **Report text is quoted, never edited.** If a real sentence from a report fails
    these rules, show a different real one and raise the prompt rule it breaks (report
    lab or Mailbox). The UI writes no astrological prose of its own (ADR-18).

**How to work.** List every string you write or review, including headings, labels,
buttons, alt text and errors. Mark each pass or fail with the rule it breaks, rewrite
the fails with the coffee test, then read the whole page aloud once more. A review
answers with a table: where, current, problem, rewrite. Keep lines the Owner approved
unless they fail a rule; then name the rule and offer the rewrite.

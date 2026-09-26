---
name: ux-copy
description: Write or review any words a Stars Decoded user reads outside the report itself, so they read like a person wrote them and get quoted by AI search. Landing and public pages, artifact mocks, UI labels, buttons, empty states, errors, emails, FAQ. Marks AI-writing patterns strongest first and limits them rather than banning every short line, then checks the page for answer-first sentences ChatGPT and other answer engines can lift. Use before writing or editing user-facing copy, when the Owner types /ux-copy, or when copy is called AI-sounding, slop, marketing-y, dated or too high level. Not for report prose, which the brain's prompts own.
---

The target is the text after the command: a page, a file or pasted copy. With none,
review the copy touched in this session.

Read first: the style contract and the writer line in `api/src/prompts/system.ts`
(rules 1 to 12), MASTERFILE R-5.1, R-5.2, R-6.3 and §9 Voice, the names in
`web/src/lib/product.ts`, and `api/src/lib/failureReasons.ts` as the model for how an
error talks. Then `references/patterns.md` every time, and `references/ai-search.md`
for any public page. "You're not selling astrology. You're selling a structured
self-knowledge report that happens to use planetary data" (MASTERFILE §1).

## Why copy reads as machine-made

A model picks the choice that fits the most readers, so its copy stages importance
instead of adding a fact, puts things in threes and fragments for rhythm, and dresses
ordinary facts up. A person writes for one reader about one thing, so their choices
are uneven and specific. The fix is never a banned-word list alone: say the specific
thing to the specific reader.

## How to work

1. **Know the reader and the job.** Privately finish two sentences: "This reader is
   trying to find out ___" and "After reading, they can ___". A visitor on /sky wants
   their chart; someone on /method wants to know if they can trust it.
2. **Mark the tells.** Read everything once, including headings, labels, buttons, alt
   text and errors, and mark each pattern from `references/patterns.md`, strongest
   first. Look at the page as well as the line: the same shape in every section is the
   tell at page scale.
3. **Say it out loud.** For each line you keep or rewrite, ask the question it answers,
   answer it as you would to a friend across the table, and write down what you said.
   Then cut words, never meaning. Warm and simple, never slangy.
4. **Check.** No fact, number, name or date added or lost; every number comes from code
   (R-6.3). Then search once more for the tells that survive a rewrite: the "noun,
   phrase" tagline, not X but Y, a row of fragments, a triad, a dash.
5. **Keep what works.** If a line already does its job, say KEEP and leave it. Lines the
   Owner approved stay unless they break a rule; then name the rule and offer the fix.

## House rules

- **Labels can be labels.** Eyebrows, buttons, table heads, fact titles and short
  headings don't have to be sentences: "No predictions", "Start with your birth date."
  The patterns are what we limit. The tagline shape may appear once on a page, on
  purpose, never as the default.
- **About the reader.** Say what it is and what they will see or do. Your, not the:
  your body, your home. People are people: you add your partner, you don't "read" them.
- **Plain words.** Work out, check, show, add, pick. An astrology word only with its
  plain meaning nearby; no coined phrases (style contract rules 7 and 12).
- **Name the report.** Wherever two could be meant: "When you both have a Personal
  natal report, you can get a Compatibility report about the two of you." Never "one"
  for the second report, never "the pair of you".
- **Keep the method simple.** We work out your chart, note what stands out, write your
  report and check it. No model or vendor names, and AI never leads. Asked directly,
  say plainly that AI helps write it; never suggest a person does.
- **Honest and exact.** No word counts, predictions, dates, fate or hype (R-5.2). No
  fake counters, reviews or experts. Product names and chapter titles come from code.
- **Punctuation.** No em dashes, semicolons, exclamation marks or emoji. Sentence case.
- **Buttons and errors.** A button says what happens next ("Show my chart"). An error
  says what happened and what to do ("Our writing service didn't answer. Try again in a
  few minutes.").
- **Report text is quoted, never edited** (ADR-18). If a real line fails these rules,
  show a different real one and raise the prompt rule it breaks.

## Written to be quoted

AI search lifts passages, not pages, and plain specific writing is what it lifts. On
every public page, follow `references/ai-search.md`: the first sentence under the H1
answers the page's question on its own; ledes say "Stars Decoded", not "we"; titles
and headings use the reader's own nouns, as questions only on /faq and the Learn pages;
each section makes sense read alone; facts come from code with their source named;
show what only we can (computed degrees, real report lines); one page per real
question, never variants; an Updated date that moves only with the words.

## What to return

Writing: the copy first, then a line on any choice the Owner should make. Review: a
table of where, current, pattern or rule, rewrite, with KEEP rows left out. Then read
the whole page aloud once more.

Sources: humanizer (MIT) and Wikipedia's "Signs of AI writing" for the patterns;
speak-human (gitlab.com/LucioLiu/speak-human, the one writing skill on GitLab) for the
reader-first step, ideas only, since its licence is non-commercial; `ai-search.md`
lists its own.

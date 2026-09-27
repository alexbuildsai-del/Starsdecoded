---
name: ux-copy
description: Write or review any words a Stars Decoded user reads outside the report itself, against four standards (purposeful, concise, conversational, clear) with patterns for every kind of interface text, a voice chart and a tone map, then check them for AI-writing habits and for AI search. Landing and public pages, artifact mocks, titles, buttons, links, forms, errors, empty states, confirmations, notifications, emails, FAQ. Use before writing or editing user-facing copy, when the Owner types /ux-copy, or when copy is called AI-sounding, slop, marketing-y, dated, robotic or too high level. Not for report prose, which the brain's prompts own.
---

The target is the text after the command: a page, a file or pasted copy. With none,
review the copy touched in this session. The framework follows the UX writing skill
the Owner chose (content-designer/ux-writing-skill, MIT); the house rules, examples
and the two extra checks are ours.

Read first: the style contract and the writer line in `api/src/prompts/system.ts`,
MASTERFILE R-5.1, R-5.2, R-6.3 and §9 Voice, the names in `web/src/lib/product.ts`,
and `api/src/lib/failureReasons.ts`. Load a reference when its step comes up:
`voice-chart.md` (always), `elements.md` (any interface text), `ai-tells.md` (step 3),
`ai-search.md` (any public page), `checklist.md` (reviews).

## The four standards

Every string is:
1. **Purposeful.** It helps the reader do what they came for and moves the product
   forward: see their chart, trust the method, get their report. On a public page,
   being found and quoted by AI search is part of the purpose (`ai-search.md`).
2. **Concise.** Every word has a job, and the point comes first. Answer first on a
   page; the action first in a sentence; no filler ("simply", "just", "actually").
3. **Conversational.** It sounds like one person talking to another. Read it aloud,
   the way you'd tell a friend across the table. Active voice, articles and small
   words kept, no system speak ("an error has occurred"), no AI habits (`ai-tells.md`).
4. **Clear.** Plain words at a grade 7 to 8 reading level, specific verbs, one name
   per thing (`product.ts`), and every number from code (R-6.3).

## Voice and tone

The voice never changes: **exact, plain, warm and honest** (`voice-chart.md`, with
do and don't lines from our own pages). The tone moves with what the reader is doing
and how they feel:
- **Curious** (landing, sample, Learn pages): confident and concrete. Show the real
  thing: a computed chart, a real report line.
- **Doing** (the free chart, the birth form): efficient. Labels, one hint, no pitch.
- **Unsure** (no birth time, a rough time, a compatibility lens): patient. Say what
  they still get before what they lose.
- **Waiting** (a report being written): calm and specific about what happens next.
- **Let down** (a failure): own it, say what happened and what now, and that the credit
  is back when it is. Never blame the reader.
- **Deciding** (delete, pay, invite someone): serious. Name what goes and whether it
  comes back.
- **Finished**: brief. "Saved", "Report ready". No celebration.

## Patterns by element (`elements.md` has the full set and our examples)

- **Titles and headings.** Where you are or what you get, in sentence case: a noun
  phrase ("Free birth chart", "Questions people ask") or the sentence you'd say ("Find
  out what your birth chart says about you"). Not every line has to be a sentence.
  A question only where the reader asks it: the FAQ and the Learn pages.
- **Buttons and links.** Verb and object for what happens next: "Show my chart", "Get
  my report", "Try another date". Link text makes sense alone: "What whole-sign houses
  are", never "Click here" or "Learn more".
- **Forms.** Visible noun labels ("Birth date"); helper text says why or what's fine
  ("If you don't know your birth time, leave it blank."). Placeholders only as examples.
- **Errors.** What happened, why if known, what to do: "Pick your birth place from the
  list. A town nearby is fine." Inline for a field, a banner for the system.
- **Empty and no-result states.** Why it's empty and the next step: "No town by that
  name. Try another spelling, or the nearest town."
- **Confirmations.** The consequence in the question: "Delete Mira's report? Her birth
  details go too, unless another report uses them."
- **Ledes and FAQ answers.** The first sentence answers on its own and names the thing:
  "Stars Decoded works out…", "A Compatibility report from Stars Decoded looks at…".

## How to work

1. **Understand the moment.** Who is reading, what they're trying to do, how they
   feel, and what's at stake. Finish "After reading, they can ___".
2. **Draft by talking.** Say it out loud first, then fit it to the element's pattern
   and the tone for that moment.
3. **Edit in four passes**, one per standard: purposeful, concise, conversational
   (including the `ai-tells.md` scan, strongest first), clear.
4. **Public pages: the AI-search pass** (`ai-search.md`): answer-first lede with the
   brand in it, the reader's nouns in headings, facts with their source, one page per
   question, an honest Updated date, every fact in the HTML.
5. **Check and keep.** No fact, number, name or date added or lost. If a line already
   works, say KEEP. Lines the Owner approved stay unless they break a rule; then name
   the rule and offer the fix.

## House rules

- **Name the report.** Personal natal report and Compatibility report wherever either
  could be meant; never "one" for the second report, never "the pair of you".
- **Keep the method simple.** We work out your chart, note what stands out, write your
  report and check it. No model or vendor names; AI never leads. Asked directly, say
  plainly that AI helps write it; never suggest a person does.
- **About the reader.** Your, not the: your body, your home. People are people: you add
  your partner, you don't "read" them.
- **Honest and exact.** No word counts, predictions, dates, fate or hype (R-5.2); no
  fake counters, reviews or experts. Product names and chapter titles come from code.
- **Report text is quoted, never edited** (ADR-18). If a real line fails, show another
  real one and raise the prompt rule it breaks.
- **Punctuation.** No em dashes, semicolons, exclamation marks or emoji. Sentence case.

## Benchmarks

Buttons two to four words. Titles three to six words. Errors 12 to 18 words with the
fix. Body sentences 15 words on average and none over 25 (R-5.1); 14 or fewer where
the reader is stressed. Lines of 40 to 75 characters in reading columns.

## Accessibility

Every control is named for what it does; link text stands alone; an error sits next
to its field and is read with its label; no meaning by colour alone; every chart has
a text equivalent that states its facts ("Sun in Taurus, Moon in Pisces, Aquarius
rising"); decorative images have empty alt text.

## What to return

Writing: the copy first, then a line on any choice the Owner should make. Review: a
table of where, current, standard or rule, rewrite, with KEEP rows left out, and the
four scores from `checklist.md` for the page before and after. Then read it aloud once.

Sources: content-designer/ux-writing-skill (MIT) for the four standards, the element
patterns, voice and tone and the checklist; humanizer (MIT) and Wikipedia's "Signs of
AI writing" for `ai-tells.md`; `ai-search.md` lists its own.

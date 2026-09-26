# Elements: patterns for every kind of interface text

Each element: its job, its shape, our examples. Shapes follow
content-designer/ux-writing-skill (MIT); the examples are ours. A fix that needs a fact
you don't have gets a slot, `<like this>`, and a question to the Owner, never a guess.

## Titles and headings
- **Job:** tell people where they are or what they get.
- **Shape:** sentence case; a noun phrase or the sentence you'd say; three to six words
  where possible. Question headings only on /faq and the Learn pages.
- Page titles: "Free birth chart", "Questions people ask", "What are whole-sign houses?"
- Section headings: "Add the people you care about", "Tell us what you have".
- Limit the "noun, phrase" tagline ("Your birth chart, explained in plain words") to one
  deliberate use a page (`ai-tells.md` 1).

## Buttons
- **Job:** start the next step. **Shape:** verb and object, two to four words.
- Primary: "Show my chart", "Get my report". Secondary: "Try another date", "Read a
  sample". Destructive: "Delete report", never "OK".
- The button names the result, not the mechanism: "Show my chart", not "Submit".

## Links
- **Job:** go somewhere, and say where. **Shape:** stands alone out of context.
- "What whole-sign houses are", "Read her whole report", "About the Compatibility
  report". Never "here", "Learn more" or "Click here".

## Form fields
- **Labels:** visible noun phrases: "Birth date", "Birth time", "Birth place".
- **Helper text:** what's fine or why we ask: "If you don't know your birth time, leave
  it blank." "A town nearby is fine."
- **Placeholders:** an example only, never the label: "Type a city name, e.g. Milan".

## Errors
- **Inline (a field):** `<field> <what it needs>`: "Enter a birth date from 1900 to
  today."
- **Detour (recoverable):** `<what happened>. <what to do>`: "Pick your birth place from
  the list. A town nearby is fine."
- **System:** `<what failed>. <what now>`, from `failureReasons.ts`: "Our writing service
  didn't answer. Try again in a few minutes."
- **A report that fails:** say what happened and that the credit is back (R-4.3).
- Never: codes alone, "invalid", blame, "Oops", "Something went wrong" with no next step.

## Empty and no-result states
- **Shape:** why it's empty, then the next step.
- No results: "No town by that name. Try another spelling, or the nearest town."
  "No question matches that. Try a shorter word."
- First use: the dashboard with only you on it names the first action ("Add someone").

## Confirmations
- **Shape:** the question with its consequence, then two plain choices.
- "Delete Mira's report? Her birth details go too, unless another report uses them."
  Buttons: "Delete report", "Keep it".

## Success and progress
- **Shape:** past tense, specific, proportional. "Birth time added", "Report ready".
- Progress says what's happening: "Writing chapter 3 of 10".

## Notifications and emails
- **Shape:** a subject or title that says what it's about, then one action.
- Invite: "Mira invited you to see how you get along" and one button, "See the invite".

## Chart labels and readouts
- Mono, uppercase, numbers from code, one fact each: "SUN 13.12° TAURUS · 4TH",
  "SUN 16.6° BELOW THE HORIZON", "WHOLE SIGN · TROPICAL".
- House words with the number where a reader meets them: "4th house (home)".

## Ledes and FAQ answers (public pages)
- The first sentence answers on its own and names the thing (`ai-search.md` 1, 2):
  "A Compatibility report from Stars Decoded looks at how two people get along, using
  both of your birth charts."
- FAQ answers open with the answer ("Yes.", "No.", or the fact), then one link on.

# Explain it like a friend (draft)

Status: draft, ideation 2026-10-07. Artifact: https://claude.ai/artifact/URGEFLx2S8KHTe2WrPV3XD
Brain change. Extends Review 05/10 §7 and §10 (ADR-297 to 312) and ADR-104; supersedes rule 1's "never explain the method".

## Why

The Owner studied @the_innercosmos on TikTok (10 videos, plus @moscowmuse.astro on empty houses and @gldnhny on Jupiter)
and wants the report and posts to explain the way she does: "so easy to understand… straight to the point… very
practical, real life examples." Our report hides the astrology instead: rules 1, 3 and 8 ban naming a placement in prose.
Owner, 2026-10-07: "We should never ban, but we should try to make things simpler… If the level of quality and the
examples from daily life… is just like she does it, I don't care that you mention the word trine."

## Her four moves (the pattern we adopt)

1. **Name it**: one placement, house or ruler. "Look at your 6th house."
2. **Say it plain**: one sentence. "It's the architecture of your day-to-day life."
3. **Show it in a day**: a scene the reader can check. "You probably hated group projects."
4. **One thing to do**: "Be honest with yourself."

Also: a house is read with its sign, the planets in it and its ruler; one everyday picture per idea (retrograde as going
home to change an outfit); the gift after the hard part; one label at a time on screen.

## Doctrine check (every claim, 52 total)

About 21 match, 18 match with a condition our doctrine adds, 8 don't, 5 are outside what we compute or use. We take her
way of saying things, never a claim our doctrine doesn't hold. Dropped: "natural house" rulers (10th = Saturn, 12th =
Neptune, 11th = Uranus), event predictions (ending a relationship, children under a Jupiter transit), Sun = father and
Moon = mother, shadow periods, Chiron by sign, "any planet in the 1st complicates you".

**Two columns, not one** (Owner, 2026-10-07: "I wouldn't say same"): "true by our doctrine" is not "said by our report".
Mercury at a party is true but our report says it long and general; Chiron is true and our report says nothing (Audrey:
Chiron in the 4th, zero sentences); retrograde, zero of three. Root cause: `vocabulary.ts` meanings read like a textbook,
and the writer can only be as crisp as what it is fed.

**Empty houses, in plain words** (Owner: "this doesn't tell me anything"): every house has a planet in charge. Ask (1) is
that planet comfortable in its sign, like a guest in a house they like or can't stand, and (2) which part of life it sits
in; that is where the empty house's story happens. Audrey: empty 8th, Mercury at home in Gemini, joint money goes smoothly
on paper; empty 9th, Venus uneasy in Aries in the 3rd, big ideas come from everyday talk, not a course.

## Scope

0. **Crisp line first** (Owner: "lead with Capricorn is the one that would skip the small talk, then explain it deeper"):
   every idea opens with the one line you'd repeat to a friend. `vocabulary.ts` gets, per sign, planet and house, a crisp
   line and a scene in her style; this comes before any rule change.
1. **Rule 1 rewritten** (`api/src/prompts/system.ts`): "Name it, say it plain, show it in a day." Any placement, house,
   ruler, aspect or idea (retrograde, rising sign, a return) may be named once where it first matters, followed by its
   plain meaning in the next sentence, then a real moment from the reader's life. Sentences about astrology as a subject
   with no reader in them stay out ("in traditional practice", "astrologically").
2. **Rules 3 and 8**: a name may sit inside a sentence, never as a heading, never alone on a line. Evidence under every
   claim stays. Sentence limits stay (15 words on average, none over 25).
3. **Technical terms become plain ideas**: dignity and sect words are never written (domicile, exaltation, detriment,
   fall, peregrine, sect, cadent, succedent, angular). The idea is said plainly: "in its own sign", "less at ease here".
4. **Taught by good examples** (Owner: "I would rather give good examples"): 8 to 10 short model passages in the four
   moves, on real fixture charts, rotated per call so no single model is copied (MB-92's lesson).
5. **Vocabulary**: `vocabulary.ts` short lines (house cards) rewritten in her plain style; `empty_house` gets the
   reconciled rule; `retrograde` gets the plain picture.
6. **Same rule everywhere**: Personal report, Compatibility (pair rule-8 checks `chk-20`, 21a, 21b, 24 relaxed to match),
   Timeline, Ask (already does this, `ask/index.ts:46`).
7. **Lab rules**: `METHOD_TALK` (`api/src/lib/labRules.ts`) pruned to talk with no reader in it.
8. **Possibilities, not forecasts** (Owner: "we just talk in possibilities"): could, might, you may notice, a good time
   to. Never will, is going to, very likely, or a named event as the outcome (break-up, job loss, pregnancy). Always end
   on something to do. Timeline reads a slow planet or retrograde by the house it moves through (her core move), which
   widens `packages/engine/src/doctrine.ts` (today: contacts to natal points only).
9. **Did you know cards**: ideas we don't read the chart by (Sun = father and Moon = mother in Family, Mercury's shadow
   in Timeline, Mercury signs at a party, a retrograde at birth), a small card outside the prose, "some astrologers say",
   then what it could mean for this chart. At most one per chapter (Owner, 2026-10-07). Always worded as a tradition,
   never as a fact (Owner: "make it sound like it's not a fact, but it's often said this way"): "is often read as",
   "old astrology tends to", "many people find". The shadow needs shadow dates in the engine.
10. **No repeats** (Owner: "if we say what to write, it's gonna just write that all the time"): a pool of several
   scenes per sign, planet and house (party, group chat, work meeting, family dinner, first date), a few picked per
   chart, never the whole list; a warn-class check for a scene reused word for word. Her whole profile (114 videos,
   transcribed 2026-10-07) is studied for scene types and planet framings, kept out of the repo (her text, public repo);
   her lines never enter a prompt. Saturn and Jupiter get the same crisp treatment: used everywhere today, never said
   plainly (Audrey: "you can carry a frightening amount alone" with no Saturn behind it).
11. **Chiron gets a sentence**: read by house, the sore spot then the gift, in possibility words.
12. **Posts**: new Content board pillar **Explained**, ten ideas added as Idea (done 2026-10-07).

## Out of scope

- New astrology the engine doesn't compute (shadow periods, Saturn retrograde in Timeline, parent significators).
- Forecasts stated as fact. Possibilities in soft words are in scope (above).
- Copying her lines. We learn the pattern; every sentence is ours.
- A new check that blocks. Warn only, per ADR-81.

## Acceptance

1. On the dry lab render, every chapter names at most one placement per paragraph (Q1 default), each followed by a plain
   sentence and a reader behaviour.
2. No dignity or sect term appears in any prose field; a warn-class check logs any that do.
3. Every retrograde planet in the chart is named and explained once (Review 05/10 §10 holds).
4. An empty house reads through its ruler's strength, never "easy" or "quiet" alone.
5. The spot run on audrey-hepburn and two other fixtures reads at grade 6 to 8, no sentence over 25 words.
6. `PROMPT_VERSION` bumps; pair, Ask and Timeline versions bump where their prompts change.

## Screens

No UI change. Before and after on Audrey Hepburn's computed chart: see the artifact (empty 8th, Mars in the 6th,
retrograde Venus, Venus square Mars).

## Open questions (each with its default)

Taken at their defaults (no objection, 2026-10-07): at most one named placement per paragraph; all five aspect names,
each explained the first time; only The Inner Cosmos is the voice model.

Answered 2026-10-07: Did you know, at most one per chapter; no hand-written chapter before lock. None open.

## Decisions to record

- Rule 1 becomes "Name it, say it plain, show it in a day"; naming a placement is allowed when the plain meaning and a
  daily example follow (Decided by Alex, 2026-10-07). Supersedes rule 1 of ADR-104 and widens ADR-297 to 312's list.
- Dignity and sect words stay out of prose, said as plain ideas (Decided by Claude, from the Owner's 2026-10-07 words).
- Every claim from outside sources passes the doctrine check before it reaches a prompt or a post (Decided by Alex).
- Empty houses read through the ruler's strength (Decided by Claude, doctrine reconciliation).
- New Content pillar Explained (Decided by Alex, 2026-10-07).
- Possibilities in soft words are allowed; forecasts stated as fact are not. Rewords MASTERFILE V1's "predictions"
  exclusion (Decided by Alex, 2026-10-07).
- Crisp line first, then deeper; `vocabulary.ts` rewritten with a crisp line and a scene each (Decided by Alex).
- Did you know cards for traditions we don't read by, one per chapter at most (Decided by Alex; count by Claude).
- Timeline reads retrogrades and slow planets by house, and computes shadow dates (Decided by Claude, astrology call).
- Chiron is read in the Personal report, by house (Decided by Claude).
- Did you know is worded as tradition, never fact (Decided by Alex, 2026-10-07).
- Scene pool rotated per chart, a warn check for reused scenes; creators' text never enters a prompt (Decided by Claude).
- The Owner keeps sending creator videos; each is doctrine-checked, then filed as a Did you know or an Explained post
  (Decided by Alex, 2026-10-07).

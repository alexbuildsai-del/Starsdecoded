# French edition

Ideation 2026-10-08 with the Owner. Status: **draft**, three questions open.
Artifact: https://claude.ai/artifact/2Woxy6WH6CZFRsoFB9vz81

The Owner's ask: everything in French, sounding like French people talking over coffee, never
Google Translate. How it changes the prose, whether a translator joins the planner and the
writer, and which model writes it.

## The proposal in one line

The writer writes French from the start, under a French style contract. No translator stage. The
planner (Sol, the foundation) keeps thinking in English, which no reader sees. Site, app and
email words get one French file, written once and read by a native speaker.

## Why not a translator (option A) or a polisher (option C)

- Each claim's `quote` is a verbatim substring of its own prose (`api/src/prompts/evidence.ts`).
  Translating after the writer breaks every quote, so every citation would need re-matching.
- The horizon pass amends sentences by quote match (R-4.6, `horizonPass.ts`). Same break.
- A translation keeps English sentence shapes; a French writer writes French ones.
- One more call per section: slower, about $0.20 more a report on Sol, one more place to fail.
- C (write, then polish) changes words after the claims are made, so the claims run again. It
  stays as a lab tool only: a French judge scoring naturalness in the prose study.

## Scope

### The report (the brain)
- A report carries a language, `en` or `fr`, set when it is created and never changed. A
  compatibility report takes the buyer's language. Timeline readings and Ask follow the reader's
  language.
- The foundation stays English JSON. Every section call gets the French writer block: the style
  contract, SIMPLE_WORDS and the WRITER line written in French (not translated), with the
  model sentences rewritten in French. Doctrine may stay English (it is never written down).
- Register: "tu" throughout (pending Q1). Spoken French written properly: "le boulot" yes,
  "t'es" no; no anglicism the reader has to translate back.
- Checks get French lists beside the English: too fancy (paradigme, dichotomie, prédisposé,
  appréhender, problématique), too trendy (vibes, toxique, red flag, mood, énergie as a mood,
  le délire), figures (ancre, boussole, carburant, étincelle, moteur, feuille de route), and
  French joins for the one-idea-a-sentence check. The checks keep their classes (ADR-81).
- Sentence limits (15 average, 25 max) hold for French until the prose study sets French
  numbers on the first French lab runs.
- French typography in code, never asked of the model: « », a narrow no-break space before
  ; : ! ?, "11e" for houses.
- One glossary in code (`vocabulary.ts` labels, house words, evidence lines): thème astral,
  Ascendant, Milieu du Ciel, maisons, conjonction, carré, trigone, opposition, sextile,
  Nœud Nord, compatibilité, transits. The evidence line a reader sees is composed from it.
- The vocabulary `full` entries a writer echoes get French versions, written by hand.

### Everything else
- UI strings move out of components into one English and one French catalogue. French written
  once by Sol against the `/ux-copy` voice chart and the glossary, then read by a native reader.
- Public pages prerendered again under `/fr/`, each with its alternate-language link, so French
  search and AI search find them (R-7.6).
- Language from the browser, switchable in the footer and the account.
- Emails from the same catalogue; Stripe checkout locale set to French.
- Legal pages (terms, privacy, refunds) in French before any sale in French.
- The lab: the five matrix charts run in French too; the QA personas get a French reader.

## Out of scope
- Other languages (the structure allows them; nothing else is planned).
- Translating reports already written. A report keeps its language.
- Québécois, Belgian or Swiss variants (France French only, pending Q1).
- Any change to the English prose.
- When it ships, and French pricing (the Owner orders rounds, ADR-230, 242).

## Acceptance criteria
- A French report reads as written in French: a native reader marks no sentence as translated
  on three lab reports.
- Every claim in a French report snaps to a verbatim French quote, as in English.
- The horizon pass amends a French report by quote match.
- The French checks fire on the French lists and log as `generation_failures` rows, like English.
- No English word left on any French screen, email or public page (a check over the catalogue).
- `/fr/` public pages prerender as real HTML with alternate-language links.
- The lab runs the five charts in French with both writers and shows them side by side.

## Model
- No published French score exists for gpt-6-sol or gpt-6-luna (researcher, 2026-10-08,
  unverified: every fetch was blocked).
- Estimated writing cost a report, from R02's measured 13,739 output tokens plus 20% for French,
  at press prices (MB-70 provisional): Luna about $0.01 to 0.02, Sol about $0.25.
- Proposal: the lab runs Luna-FR and Sol-FR on the five charts; a French judge scores
  naturalness and the Owner reads two side by side. Luna ships if it passes, Sol if not
  (quality over cost, MASTERFILE §1).

## Screens
In the artifact: the three pipelines side by side, the same line three ways, the prose rule
changes, the surfaces list, the model table, the three questions. No UI mock yet: the only new
control is a language switch in the footer and account.

## Research
Three researchers ran (localization practice, French astrology words and register, models). The
verifier could open none of the 20 sources: the session's network blocks every host
(aclanthology.org, arxiv.org, openai.com, apps.apple.com, astrotheme.fr, horoscope.fr, ...).
Supported 0 of 20, so no outside claim is in this spec. Re-run the verifier once those hosts are
allowed. The decision to write in French rests on our own code, not on research.

## Open questions
1. **Which French.** France French with "tu", or "vous"? Recommend tu. Default: tu.
2. **Which writer.** Lab first between Luna and Sol, Luna if it passes? Recommend yes. Default: yes.
3. **A native reader.** Pay a native French reader once (site words and three lab reports)
   before French goes live? Recommend yes. Default: build behind `// MB-NN provisional` and ask
   again before the French launch.

## Decisions to record
- D1 (Claude): the French report is written in French by the writer, never translated after it;
  the planner stays English. Reason: verbatim claim quotes and the horizon pass's quote match.
- D2 (Claude): a report carries its language for life; a pair report takes the buyer's.
- D3 (Claude): French checks mirror the English classes; French typography is applied in code.
- D4 (Claude): one glossary in code feeds the writer, the site and the evidence lines.
- D5 (Claude): a polisher stage is a lab judge only, never in the production line.
- Pending the Owner: Q1 register, Q2 writer model, Q3 native reader.

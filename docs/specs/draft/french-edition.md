# French edition

Ideation 2026-10-08 with the Owner. Status: **draft**, two questions open (round two, 2026-10-08: Luna, no lab comparison, one prompt set).
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
- C (write, then polish) changes words after the claims are made, so the claims run again.
  Dropped, and no French judge in the lab either (the Owner, 2026-10-08).

## Scope

### The report (the brain)
- A report carries a language, `en` or `fr`: the site's language when it was ordered, never
  changed. A compatibility report takes the buyer's language. Timeline readings and Ask follow
  the reader's language.
- The writer is Luna (`MODELS.sections`), as for English. No Luna-versus-Sol comparison, no lab
  run in French, nothing new on the admin Lab page (the Owner, 2026-10-08).
- One set of prompts. The English prompts stay the only source; a French report appends one
  French block (about 40 lines, written in French) to the section calls: write in French, tu,
  spoken French written properly; the model sentences in French and "never translate the English
  examples"; the French words to avoid; the glossary. Two full versions were weighed and dropped:
  every change twice, drift, the admin prompt page doubled. The foundation stays English JSON.
  The block lives in the section registry and is overridable in `/admin/prompts` like any key.
- Register: "tu" throughout (pending Q1). Spoken French written properly: "le boulot" yes,
  "t'es" no; no anglicism the reader has to translate back.
- Checks get French lists beside the English: too fancy (paradigme, dichotomie, prédisposé,
  appréhender, problématique), too trendy (vibes, toxique, red flag, mood, énergie as a mood,
  le délire), figures (ancre, boussole, carburant, étincelle, moteur, feuille de route), and
  French joins for the one-idea-a-sentence check. The checks keep their classes (ADR-81).
- Sentence limits (15 average, 25 max) hold for French as they are.
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
- Language, first that applies: the reader's own pick (cookie), their account setting, a `/fr/`
  URL, the browser's language (`Accept-Language` / `navigator.languages`, French first means
  French), else English. Never the IP address: an English speaker in Paris, a French traveller,
  Belgium, Switzerland and Quebec, and crawlers that visit from the US all break it.
  An EN · FR switch in the footer and on the account page.
- Emails from the same catalogue; Stripe checkout locale set to French.
- Legal pages (terms, privacy, refunds) in French before any sale in French.
- The lab: nothing new. The free dry render shows the French block like every prompt (R-4.4).

## Out of scope
- Other languages (the structure allows them; nothing else is planned).
- Translating reports already written. A report keeps its language.
- Québécois, Belgian or Swiss variants (France French only, pending Q1).
- Any change to the English prose.
- When it ships, and French pricing (the Owner orders rounds, ADR-230, 242).

## Acceptance criteria
- A French report reads as written in French: a native reader marks no sentence as translated
  on two or three real staging reports.
- Every claim in a French report snaps to a verbatim French quote, as in English.
- The horizon pass amends a French report by quote match.
- The French checks fire on the French lists and log as `generation_failures` rows, like English.
- No English word left on any French screen, email or public page (a check over the catalogue).
- `/fr/` public pages prerender as real HTML with alternate-language links.
- A reader whose browser asks for French and who has never picked lands on French; a pick
  overrides it and is remembered.

## Model
Luna writes French (decided by the Owner, 2026-10-08). Estimated writing cost about $0.01 to 0.02
a report, from R02's 13,739 output tokens plus 20% for French, at press prices (MB-70
provisional). A French report that reads badly is fixed in the French block.

## Screens
In the artifact: the three pipelines side by side, the same line three ways, the prose rule
changes, the surfaces list, the language order, one prompt set against two, the two questions. No
UI mock yet: the only new control is the EN · FR switch in the footer and account.

## Research
Three researchers ran (localization practice, French astrology words and register, models). The
verifier could open none of the 20 sources: the session's network blocks every host
(aclanthology.org, arxiv.org, openai.com, apps.apple.com, astrotheme.fr, horoscope.fr, ...).
Supported 0 of 20, so no outside claim is in this spec. Re-run the verifier once those hosts are
allowed. The decision to write in French rests on our own code, not on research.

## Open questions
1. **Tu or vous.** France French with "tu"? Recommend tu. Default: tu.
2. **A native reader.** With no lab test, a person is the one check. Pay a native French reader
   once (site words and two or three real reports) before French goes live? Recommend yes.
   Default: build behind `// MB-NN provisional` and ask again before French goes live.

## Decisions to record
- D1 (Claude): the French report is written in French by the writer, never translated after it;
  the planner stays English. Reason: verbatim claim quotes and the horizon pass's quote match.
- D2 (Claude): a report carries its language for life; a pair report takes the buyer's.
- D3 (Claude): French checks mirror the English classes; French typography is applied in code.
- D4 (Claude): one glossary in code feeds the writer, the site and the evidence lines.
- D5 (Alex, 2026-10-08): Luna writes French; no model comparison and no French lab runs or
  judge; nothing added to the admin Lab page.
- D6 (Alex, 2026-10-08): one set of prompts plus one French block, never two full versions.
- D7 (Claude): language from the reader's pick, account, `/fr/` URL, then the browser; never the IP.
- Pending the Owner: Q1 register, Q2 native reader.

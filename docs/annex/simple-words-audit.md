# Simple words audit (2026-10-03)

The Owner's standing rule, "simple words, everywhere" (CLAUDE.md; `/ux-copy` voice chart), applied to the
shipped site and app by three read-only passes. **The Owner approved every proposal here (2026-10-03) except one:
"Key Paradoxes & Discoveries" keeps its title.** Built in its own small round, set at the next /plan (ADR-258); R15's cleanup round, which already holds one brain
pass (ADR-242), is the natural home if he agrees. Nothing here is built yet; that round turns each group into cards. Paths under `web/src/` unless given. Rendered for the Owner:
https://claude.ai/artifact/VqW2umpB8JCyFfmwFS7Gcn

Shared strings change more than one surface; they are marked **[shared]**. `/method` line 192 must keep matching
`site/data/faq.ts:47`. Strings copied from a stored report (`site/data/sample.ts`, `differences.ts`, the Claims
quotes) are the brain's and change only through the prompts.

## Patterns
1. Two ideas in one sentence (about 35 lines): split.
2. "The horizon is drawn / not drawn" (about 15): say "your rising sign and houses".
3. Labels that sound deep (about 25): say the plain thing.
4. Jargon: natal, sect, ecliptic, "quality bar", "generated".
5. "Every claim shows its source" said seven times on the home page, as "claim" and as "reference": say it twice,
   always "claim". Also near-duplicates: sample fine print (`Claims.tsx:726`, `Method.tsx:111`), "No predictions"
   (`Method.tsx:121`, `faq.ts:60`), birth-time copy (`BirthTime.tsx:39`, `faq.ts:78`, `SkyScreen.tsx:225`,
   `Dawn.tsx:23`), the compatibility pitch (`TwoCharts.tsx:171`, `faq.ts:98`).

## Home page
| Where | Now | Proposed |
| --- | --- | --- |
| `site/site.ts:54` | …when you were born and writes you a report about how you think, work and love. | …when you were born. Then it writes you a report about how you think, work and love. |
| `site/lib/sky.ts:468` [shared /sky] | Whole sign · tropical / Tropical · no horizon without a time | Whole-sign houses · tropical zodiac / No rising sign or houses without a birth time |
| `site/sections/Differences.tsx:54` | A moment you'd recognise. | Something from your everyday life. |
| `site/sections/Claims.tsx:49-50` [shared /sample] | Sect / Lot | Day or night / Lot (or Calculated point) |
| `site/sections/Inside.tsx:81-82` | There are ten chapters, starting with… In between they cover… | There are ten chapters. They start with the big picture and end with what to try next. In between… |
| `lib/chapters.ts:14-15` [shared report, /sample, /method] | Superpowers, Chronic Patterns & Growing Edges / Key Paradoxes & Discoveries | Strengths, Habits & Where You Can Grow / Key Paradoxes & Discoveries kept (the Owner) |
| `site/data/inside.ts:18-54` [shared report section heads via `components/ReportSections.tsx:58-59,110,112,148,176-177`, `lib/home-view.ts:45`] | Where it all points · Where the weight sits · How you run · How you are understood · A practice · Vocational pull · How you show up · Growth through work · Your relationship to resources · The challenge · What partnership asks · What you carry · What roots you · The inherited edge · The pattern you will always navigate · Your growing edge · Two or three paradoxes · A way through each · Lean into · Notice · Practice | What it all adds up to · What stands out · How you get through your days · How people see you · Something to try · Work that suits you · How you come across at work · How work helps you grow · How you handle money · What keeps going wrong · What a relationship needs from you · What you got from your family · What keeps you steady · What you'd do differently · A habit you'll always have to manage · Where you can grow · Two or three ways you feel torn · What helps with each · Do more of · Watch for · Try next |
| `site/sections/YourPeople.tsx:360` | …on your dashboard, so you can tap anyone to see their chart. | …on your dashboard. Tap anyone to see their chart. |
| `site/sections/YourPeople.tsx:81` | They get a credit and write their own Personal natal report… | They get a credit for their own Personal natal report… |
| `site/sections/TwoCharts.tsx:29-30` [shared /compatibility] | Whose standards run the house, and who ends up doing the list / …planning or winging it | Who sets the rules at home, and who ends up doing the chores / …planning ahead or not |
| `site/sections/TwoCharts.tsx:172` | …what you can try, and it never gives you a score. | …what you can try. It never gives you a score. |
| `lib/lenses.ts:36-75` [shared report, /compatibility] | How you fight and repair · Feelings and the big reactions · Home, chores and contributing · In a room together · The hard talk · What to practise | How you argue and make up · Big feelings and what helps · Home and helping out · Being together · Hard conversations · Things to try |
| `site/sections/Method.tsx:42-43` | …really were, then write your report from it using our own rules… | …really were. Then we write your report from it, using our own rules… |
| `site/sections/Method.tsx:54` | …your birth town's clock history, so summer time is right. | …past clock changes in your birth town, so summer time is right. |
| `lib/sky-card.ts:33` [shared] | Spread across the four | Spread evenly across the four elements |
| `site/sections/Method.tsx:102-103` | Then every reference is checked against your chart, and anything… | Then we check every claim against your chart. Anything that doesn't match is fixed or taken out before you see it. |
| `site/sections/BirthTime.tsx:39-41` | Lots of people only know roughly…, and some don't know at all. … only uses what that time can support, and tells you what it can't. | Many people only know roughly, from what a parent remembers. Some don't know at all. … only uses what your answer can tell us. It says what it leaves out. |
| `site/lib/readouts.ts:187,189` | There's no rising sign, and your Moon is somewhere in that range. / Your rising sign holds either way, so it's shown. | There's no rising sign. Your Moon is somewhere in the range above. / Your rising sign is the same either way, so we show it. |
| `site/data/faq.ts:54,66,78,98,139` | (two ideas per sentence; "what that supports") | Split each in two; "what your answer can tell us"; "It also removes your birth details, unless another report uses them." |

## Other public pages
| Where | Now | Proposed |
| --- | --- | --- |
| `site/site.ts:65` (/sky) | …seen from where you were born. Put in your birth details to see yours, worked out from real astronomy. It's free, and nothing you type is saved. | …seen from the place you were born. Enter your birth details to see yours. We work it out from real astronomy. It's free, and we don't save anything you type. |
| `site/site.ts:89` (/method) | …and notes what stands out in it. Then it writes your report from those notes and checks every reference… | …really were. It notes what stands out. It writes your report from those notes. Then it checks every claim against your chart before you see it. |
| `site/site.ts:100` (/compatibility) | …looks at how two people get along, using both of your birth charts. When you both have… | …uses both of your birth charts to show how the two of you get along. You each need a Personal natal report first. Then you pick… |
| `site/site.ts:111` (/learn/whole-sign-houses) | (two long sentences) | Split into four. |
| `site/pages/SkyPage.tsx:147, 48, 45` (and `FaqPage.tsx:89`) | …money, and every claim shows… / the range the Moon covered / From the positions of the planets to the last check | Split / where the Moon moved during it / Each step, from working out your chart to the final check |
| `site/pages/MethodPage.tsx:86-88, 91-92, 113-117, 144-145, 160` | (four ideas in one sentence; "clock history"; "crowded"; "built around"; passive; "can't pass") | Split; past clock changes; hold the most planets; comes from your chart, not a template; we write…; fails the check |
| `site/data/faq.ts:47` (keep `/method:192` matching) | Your report is then written from those notes with the help of AI… Every reference is checked… | Then AI helps us write your report from those notes, following our own rules. We check every claim… |
| `site/data/faq.ts:85, 117` | where your houses fall; answer at the end | where your houses are; "No. It never rates the two of you." first |
| `site/pages/CompatibilityPage.tsx:307, 248` | play out one scene between you and end with… / Add theirs from your dashboard with their birth details. | show one everyday moment between you. Each ends with… / To add theirs, enter their birth details on your dashboard. |
| `site/pages/LearnHousesPage.tsx:94-95, 123, 182-184, 239` | stay put… shows the system only / forgive a slightly wrong birth time | The houses don't move… It only shows how the houses work. / still work if your birth time is a little off |
| `site/pages/LearnBirthTimePage.tsx:249-252, 255, 286` and `site/lib/learn.ts:235-240` | settles / holds / a few minutes out / Slide through today | tells us / stays the same / a few minutes off / Move the slider through today |
| `site/pages/SamplePage.tsx:230-231, 254-255, 288` [shared] | Where the weight sits · How you run · The pattern you will always navigate · Your growing edge · A way through | As the report heads above. |
| `site/pages/WaitlistPage.tsx:28` | We use your address for nothing else. | We don't use your address for anything else. |

## The app
| Where | Now | Proposed |
| --- | --- | --- |
| `pages/BirthFormPage.tsx:149, 228` | Accurate birth time and place are essential for a precise chart. / This is my natal chart | Your birth time and place make your chart exact. / This is my own chart |
| `lib/birth-time.ts:58, 108-111` | …from the date alone. Add the time later, free, and every change is marked. / The horizon is (not) drawn; the report reads the date. | We write the report from your birth date. You can add the time later for free. We'll show you what changed. / We can't tell your rising sign without a time. The report uses your birth date. |
| `components/BirthTimeControl.tsx:133-137` | to see what it settles / Sweeping the sky… / horizon not drawn · holds across the window · horizon drawn | to see your rising sign / Working it out… / needs a birth time · same across your time range · set |
| `components/BirthTimeDialog.tsx:78, 97, 102` and `report/HouseCard.tsx:152` | The hour draws the horizon… / Free. Every change is marked. / Save and redraw | Your birth time gives you your rising sign, your houses and day or night… / Free. We'll show you what changed. / Save and update |
| `lib/progress.ts:14-15`; `report/OpeningOverlay.tsx:111` | Analysing your inputs · Computing your chart / The last chapters will be there when you reach them. | Checking your details · Working out your chart / We'll finish the last chapters while you read. |
| `report/ReportHero.tsx:127, 324, 529`; `lib/home-view.ts:41`; `report/HouseCard.tsx:121-124, 138-139` | draw the horizon / horizon · not drawn / What the hour adds / where each planet does its work / which planets carry weight / The Lots, drawn from the horizon | see your rising sign and houses / rising sign · needs a birth time / What your birth time adds / which part of life each planet affects / which planets matter most / The Lots, points worked out from your rising sign |
| `report/HouseCard.tsx:106`, `report/LinkCard.tsx:44`, `lib/charts-meet.ts:58` | Behaviour check | Does this sound like you? |
| `report/TwoChartsLedger.tsx:128`; `report/PairSections.tsx:30, 86`; `report/DawnClosing.tsx:23` | The paradox / each chapter plays out one scene between you… / The pattern under it / Lean into | Where you pull two ways / Each chapter from here shows one everyday moment between you… / What's behind it / Do more of |
| `report/RevisionLedger.tsx:70`; `report/ShareCard.tsx:348` | Before · kept · compare any time / …the verdict and your three strengths. Nothing from either… | Old version saved · compare any time / a short summary and your three strengths. It shows nothing from either birth chart. Nothing is uploaded. |
| `lib/evidence-glossary.ts:15-17, 50-61, 69-121, 172, 202` | Mind & exchange · Friends & collective · Solitude & the unseen; Fused…; A see-saw… hold both; Friction that forces development…; the chart's grain; meaning-hungry, systemic, permeable, tidal; ecliptic; not a body | Mind & talk · Friends & groups · Time alone & hidden things; Joined…; pulled two ways and need room for both; Tension that pushes you to grow. It doesn't go away. It gets easier with time.; out of step with your chart; looking for meaning, big-picture, sensitive, moody; the highest point in the sky at your birth; not a planet (HOUSE_THEMES also feeds `LearnHousesPage.tsx:166`) |
| `components/CompatibilityPicker.tsx:234`; `lib/credits-view.ts:250, 254`; `lib/nudges.ts:89, 96`; `dashboard/CardSections.tsx:25` | …written on the house until pricing lands. / one balance / One credit stays for whoever comes next. / Read the two of you · 1 credit / It is about {name} | No credits yet. This report is free until prices are set. / all in one balance / One credit is left for someone else later. / Get a report on you two · 1 credit / {name}'s report is ready |
| `api/src/lib/failureReasons.ts:15`; `components/MethodologyBox.tsx:11`; `pages/ClaimPage.tsx:163, 200-201`; `pages/ReportPage.tsx:140`; `report/HouseSystemSheet.tsx:6` | quality bar / no sect is read / invalid, expired, or already claimed / redraws the horizon / generated… regenerated / long Placidus sentences | We couldn't get one chapter right after several tries. Please try again. / Without a birth time, we can't tell if you were born by day or night. / This link doesn't work. It may have expired or already been used. / we update your rising sign and houses / made with an older version. Write it again to read it. / split into short sentences |

Emails (`api/src/lib/mailer.ts`) were judged plain.

## The writer's prompts (the brain)
- Present: `api/src/prompts/system.ts:21` (rule 7, "Plainer beats cleverer"), `:22` (rule 8, 15 words on average,
  none over 25), `:18` (rule 5), `:26` (rule 12, no figurative pairings, why clauses only), `:27` (rule 13, coffee voice
  with too-fancy and too-trendy lists), `:43` (the writer line).
- Missing: a reading level, one idea per sentence, a general ban on metaphor and drama.
- Against it: `api/src/prompts/vocabulary.ts` `full` entries (`:74, 82, 86-98, 106`) in textbook register, pasted into
  the shared block (`:281-296`, `system.ts:46`); rewrite them in everyday words or mark them reasoning-only.
- Proposed rule: "Simple words, everywhere. Write the way you'd talk to a friend across a table: everyday words, one
  idea per sentence, a reading level of grade 6 to 8. No metaphor or poetic phrase the reader has to decode, and no
  drama. If a sentence sounds deep, rewrite it until it sounds normal." Plus a logging check (two ideas, a metaphor).
  Dry lab at the change, a spot run before a Release.

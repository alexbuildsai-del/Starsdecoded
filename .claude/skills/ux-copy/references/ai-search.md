# Written to be quoted: copy rules for AI search

ChatGPT search, Perplexity, Copilot and Google's AI Overviews answer from an index and
quote passages. Google says AI features run on core ranking and need no special tricks;
Microsoft is the only operator with detailed writing advice. The rules below are the
ones the evidence supports, each labelled: **E** evidence-backed (observational or lab),
**V** vendor guidance. Research of 26 Sep 2026; sources at the end.

1. **Answer first (E).** The first sentence under the H1 answers the page's question on
   its own and names its subject. Most ChatGPT citations come from the first third of a
   page. "Whole-sign houses give each of the twelve houses one whole zodiac sign…"
2. **Name inside the claim (E).** In ledes and key sentences, write "Stars Decoded works
   out your chart", not "we": engines often quote a line without the brand around it.
3. **The reader's words in titles and headings (E).** Titles, H1s and H2s use the nouns
   people search with ("birth chart", "rising sign", "birth time"). Question headings
   only where people literally ask: /faq and the Learn pages. Elsewhere, a said
   statement with the same nouns. The match matters, not the question mark.
4. **Sections that stand alone, not chunks (V).** Each section names its subject and
   makes sense if it is the only part read. Complete, not short: a few paragraphs.
5. **What it is, who it's for, how you pay, what it won't do (V).** In the first
   paragraph of every commercial page, in plain words.
6. **Real, checkable specifics with their source (E).** Numbers, dates and names from
   code, and the source named in the sentence ("accurate to within one arcminute,
   tested against NASA's JPL Horizons"). Never a number, quote or source that isn't real.
7. **What only we can show (V, E).** Computed degrees, the minutes a rising sign holds on
   a real day, a real report sentence with its placement. Non-commodity content is the
   lever Google names first.
8. **Define and compare (E).** One plain sentence per term; a small table where the
   reader chooses (Personal natal against Compatibility, whole sign against Placidus).
9. **One page per real question (V).** Deep enough to settle it and the next three to
   five questions. Never variant pages for the same question, never templated pages per
   placement: that is scaled content abuse.
10. **An honest date (E).** A visible Updated date, the same in `dateModified`, moved only
    when the words change.
11. **Facts, not adjectives (V).** Vague adjectives and promotional filler are named as
    reasons content isn't picked.
12. **Every fact in the text (V).** Claims, placements and answers are plain text in the
    prerendered HTML; alt text states the same fact. Crawlers run no JavaScript.
13. **Say how it's made (V).** One plain sentence that AI helps write the report and code
    checks it, where readers would wonder (the method page and the FAQ). It never leads.
14. **One name per thing (V).** The names in `product.ts`, one form per term, no two
    pages disagreeing on a fact.

**What backfires.** Keyword stuffing and synonym lists; mass-produced or variant pages;
invented statistics, quotes or sources; fake FAQs, reviews or testimonials; text hidden
for bots or instructions aimed at AI; "authoritative" persuasion rewrites (end-to-end
tests found they often lower retrieval); chunking pages or writing AI-only versions;
bumping dates without a change; schema as a citation lever. "Synastry" stays out:
engines understand the synonym.

**Sources.** Google, "AI features and your website" and "Succeeding in AI search"
(developers.google.com/search); Microsoft Advertising, "Optimizing your content for
inclusion in AI search answers" (Oct 2025); Bing Webmaster Guidelines; GEO, Aggarwal et
al., KDD 2024 (arxiv.org/abs/2311.09735), read with SAGEO Arena (arxiv 2602.12187) and
C-SEO Bench (arxiv 2506.11097); Search Engine Land and Growth Memo on 18,012 ChatGPT
citations; Ahrefs on 1.4M prompts, freshness and schema; Semrush on ghost citations;
Surfer on key facts and fan-out; astronomy-engine's README for its accuracy.

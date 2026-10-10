# ReportPage

Level: template. The reading tempo: a narrow column, lines at 64ch.

## What it replaces
The report's hand-built frame (hero, rail, chapters with their accent, the closing).

## Slots
`header`, `hero`, `rail` (chapter links, from 1024 px only), chapters as children (each a `ReportPageChapter` with `accent` 1 to 6, the chapter hue on a 3 px left edge), `closing`, `footer`. No data.

## Use it for
The Personal, Compatibility and Timeline reports.

## Not for
Pages that are not read top to bottom.

## States
Static. On a phone the rail is hidden and the chapters take the full column.

## Access
The rail is a `nav` named "Chapters". The accent edge is decoration; a chapter's title carries the meaning.

## Do and don't
- Do keep the column at 880 px and the text at 64ch.
- Don't add a second column beside the words.

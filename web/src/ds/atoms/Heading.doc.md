# Heading

Five title sizes, plus a small card title and a lede, in Newsreader 400.

## Use it for
- `hero` once per public page, `section` per section, `page-title` per signed-in page.
- `sheet-title` in a sheet or a feature card, `card-title` in a card, `card-title-sm` in a small grid card.
- `lede` for the opening line of a chapter.

## Props
- `style`: the style name (required).
- `as`: any tag. The default is h1 for hero and page-title, h2 for section and sheet-title, h3 for the card titles, p for lede.
- Hero and section grow on desktop, to 68 px and 54 px.

## Don't
- Bold Newsreader.
- A title without the label rule: label, then title, then body.

## Accessibility
- Pick the tag for the page outline, then the style for the look; they are separate choices.
- One h1 per page.

## Versions today and after
T4 big public title: hero. T1 public sections: section. T5 app page title: page-title. T6 side sheets, T7 card headings, T2 admin
page title: sheet-title. T3 and T8 card titles: card-title.

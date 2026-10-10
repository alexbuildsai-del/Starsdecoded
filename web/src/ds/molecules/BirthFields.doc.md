# BirthFields

The birth date, the birth time and the birth place: the same fields and rules as before, in one label style, with edges you can see.

## Use it for
- The birth form, the home hero's free chart, the Timeline cycle finder, Add birth time.
- `BirthDateField` (typed, no calendar), `BirthTimeField` (typed, with AM and PM on a 12-hour clock), `BirthTimeControl` (I know it, Roughly, I don't know, and the rising-sign line) and `PlaceField` (our own search, with the OpenStreetMap credit at the foot of the list).

## Props
- Today's props, unchanged: `value`, `onChange`, `onComplete`, `describedBy` on the date and time; `value`, `onChange` and the birth date, place and zone for the control; `value`, `onChange`, `label`, `birthDate`, `birthTime` for the place.
- The same values reach every caller: "YYYY-MM-DD", "HH:MM" on the 24-hour clock, the same answer and the same place.

## Don't
- A browser select inside the form: "Roughly, a part of the day" is four pills (Morning, Afternoon, Evening, Night), with today's values.
- A calendar picker: a birth date is years back and typing is faster.
- A field label in another style from its neighbours.

## Accessibility
- Fields use Input's 3:1 edge and 2 px focus ring; the pills and the AM and PM halves are radios, with arrow keys and a 44 px tap.
- Search is a compact Button (36 px seen, 44 px tapped). While a search runs it keeps its place and says it is disabled.
- The suggestion list and the chosen-place card appear at once under reduced motion.

## Versions today and after
F1 the date, F2 the time, F3 the part-of-day select (now four pills), F4 the place with Search: one part, `BirthFields`. The old component files re-export from here.

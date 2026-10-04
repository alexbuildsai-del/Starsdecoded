/**
 * The edges date-entry.test.ts and the two fields' keystroke tests leave: leap years across the centuries, the range's
 * first and last allowed day and the first refused one, "today" on a device whose day has already turned, a date
 * edited a part at a time, a paste in mixed separators, Backspace and Delete at every position of a field with repeated
 * digits, and a time on every minute of both clocks (ADR-222, review-02-10 §5, acceptance 3).
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  clockWords, dateDigits, dateNote, dateText, dateValue, entryFormat, localDay, pickHalf, readDate, readTime, stepDate,
  stepTime, timeNote, timeState, timeText, timeValue,
  type Clock, type DateOrder, type Half,
} from "./date-entry";

const ORDERS: DateOrder[] = ["dmy", "mdy", "ymd"];
const two = (n: number) => String(n).padStart(2, "0");
/** What a reader types for a date in their order. */
const typed = (order: DateOrder, y: number, m: number, d: number) =>
  order === "ymd" ? `${y}${two(m)}${two(d)}` : order === "dmy" ? `${two(d)}${two(m)}${y}` : `${two(m)}${two(d)}${y}`;

describe("the order and clock for tags the language list does not name", () => {
  it.each<[string, DateOrder, Clock]>([
    ["ja-JP", "ymd", 24],
    ["zh-CN", "ymd", 24],
    ["zh-TW", "ymd", 12],
    ["ko-KR", "ymd", 12],
    ["fr-CA", "ymd", 24],
    ["de-AT", "dmy", 24],
    ["EN-us", "mdy", 12],
  ])("%s", (lang, order, clock) => {
    expect(entryFormat(lang)).toEqual({ order, clock });
  });

  it("takes the hour cycle a tag asks for, on any language, and leaves the order alone", () => {
    expect(entryFormat("en-GB-u-hc-h12")).toEqual({ order: "dmy", clock: 12 });
    expect(entryFormat("ja-JP-u-hc-h12")).toEqual({ order: "ymd", clock: 12 });
    expect(entryFormat("ko-KR-u-hc-h23")).toEqual({ order: "ymd", clock: 24 });
  });

  it("reads the Gregorian order whatever calendar the tag names, so a typed date is never a Buddhist year", () => {
    expect(entryFormat("en-US-u-ca-buddhist").order).toBe("mdy");
    expect(entryFormat("th-TH-u-ca-buddhist").order).toBe("dmy");
    expect(entryFormat("ja-JP-u-ca-japanese").order).toBe("ymd");
  });

  it("answers the same two fields for every language, and only ever a known order and clock", () => {
    for (const lang of ["en", "ar-EG", "hi", "he", "ru", "tr", "pt-BR", "es-MX", "pl", "vi", "id", "sw"]) {
      const format = entryFormat(lang);
      expect(["dmy", "mdy", "ymd"], lang).toContain(format.order);
      expect([12, 24], lang).toContain(format.clock);
    }
  });
});

describe("leap years", () => {
  const YEARS: [number, boolean][] = [
    [1700, false], [1800, false], [1900, false], [1904, true], [1996, true], [2000, true], [2023, false], [2024, true],
    [2100, false], [2400, true],
  ];

  it.each(YEARS)("29 February %i is a date: %s, in every order", (year, leap) => {
    for (const order of ORDERS) {
      expect(dateValue(typed(order, year, 2, 29), order), order).toBe(leap ? `${year}-02-29` : "");
    }
  });

  it("is a readout in a leap year and a named problem in any other, the century years included", () => {
    for (const order of ORDERS) {
      expect(dateNote(typed(order, 2000, 2, 29), order, { today: "2026-10-02", left: false })).toEqual({ kind: "readout", text: "29 Feb 2000" });
      expect(dateNote(typed(order, 1900, 2, 29), order, { today: "2026-10-02", left: false })).toEqual({
        kind: "problem", text: "There's no 29 February in 1900. Check the day.",
      });
    }
  });

  it("keeps 28 February real in every year and 1 March after it", () => {
    for (const year of [1900, 2000, 2100]) {
      expect(dateValue(typed("dmy", year, 2, 28), "dmy")).toBe(`${year}-02-28`);
      expect(dateValue(typed("dmy", year, 3, 1), "dmy")).toBe(`${year}-03-01`);
    }
  });

  it("knows each month's last day, and that the next one does not exist", () => {
    const LAST = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    LAST.forEach((last, i) => {
      expect(dateValue(typed("dmy", 2000, i + 1, last), "dmy"), `month ${i + 1}`).not.toBe("");
      expect(dateValue(typed("dmy", 2000, i + 1, last + 1), "dmy"), `month ${i + 1} + 1`).toBe("");
    });
  });
});

describe("the range's own days", () => {
  const range = { min: "1900-01-01", max: "2026-10-02" };

  it("takes the first and the last allowed day and refuses the one on either side, in every order", () => {
    for (const order of ORDERS) {
      expect(dateValue(typed(order, 1900, 1, 1), order, range), `${order} min`).toBe("1900-01-01");
      expect(dateValue(typed(order, 1899, 12, 31), order, range), `${order} min - 1`).toBe("");
      expect(dateValue(typed(order, 2026, 10, 2), order, range), `${order} max`).toBe("2026-10-02");
      expect(dateValue(typed(order, 2026, 10, 3), order, range), `${order} max + 1`).toBe("");
    }
  });

  it("holds a range that is one day, and one that starts on a leap day", () => {
    expect(dateValue("02102026", "dmy", { min: "2026-10-02", max: "2026-10-02" })).toBe("2026-10-02");
    expect(dateValue("01102026", "dmy", { min: "2026-10-02", max: "2026-10-02" })).toBe("");
    expect(dateValue("29022000", "dmy", { min: "2000-02-29" })).toBe("2000-02-29");
    expect(dateValue("28022000", "dmy", { min: "2000-02-29" })).toBe("");
  });

  it("sends nothing and says the range, not an impossible day, for a real date outside it", () => {
    const note = dateNote("03102026", "dmy", { range, today: "2026-10-02", left: false });
    expect(note).toEqual({ kind: "problem", text: "Enter a birth date from 1900 to today." });
  });

  it("says a day that is not today in full, once the range's end is no longer today", () => {
    const note = dateNote("01012031", "dmy", { range: { max: "2030-12-31" }, today: "2026-10-02", left: false });
    expect(note).toEqual({ kind: "problem", text: "Enter a birth date up to 31 Dec 2030." });
  });

  it("checks a date against the range by its own digits, whatever order they were typed in", () => {
    expect(dateValue("10022026", "mdy", range)).toBe("2026-10-02");
    expect(dateValue("10032026", "mdy", range)).toBe("");
    expect(dateValue("20261003", "ymd", range)).toBe("");
  });
});

describe("today is the device's own day, even where it has already turned past UTC's", () => {
  const saved = process.env.TZ;
  afterEach(() => {
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  });
  const elsewhere = (zone: string, iso: string) => {
    process.env.TZ = zone;
    return localDay(new Date(iso));
  };

  it("is the date on the wall of the zone the device is set to, across UTC midnight", () => {
    for (const [zone, iso] of [
      ["Pacific/Kiritimati", "2026-10-02T23:30:00Z"],
      ["Pacific/Kiritimati", "2026-10-03T00:30:00Z"],
      ["Pacific/Pago_Pago", "2026-10-02T23:30:00Z"],
      ["Pacific/Pago_Pago", "2026-10-03T00:30:00Z"],
      ["America/New_York", "2026-10-03T03:59:59Z"],
      ["America/New_York", "2026-10-03T04:00:00Z"],
      ["Asia/Kolkata", "2026-10-02T18:29:59Z"],
      ["Asia/Kolkata", "2026-10-02T18:30:00Z"],
      ["UTC", "2026-10-02T23:59:59Z"],
      ["UTC", "2026-10-03T00:00:00Z"],
    ] as const) {
      const wall = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
      expect(elsewhere(zone, iso), `${zone} at ${iso}`).toBe(wall);
    }
  });

  it("lets a reader east of UTC enter tomorrow-in-UTC's today, and refuses it to one west of it, at the same instant", () => {
    const instant = "2026-10-02T23:30:00Z";
    const east = elsewhere("Pacific/Kiritimati", instant);
    const west = elsewhere("Pacific/Pago_Pago", instant);
    expect([east, west]).toEqual(["2026-10-03", "2026-10-02"]);
    expect(dateValue("03102026", "dmy", { max: east })).toBe("2026-10-03");
    expect(dateValue("03102026", "dmy", { max: west })).toBe("");
    expect(dateNote("03102026", "dmy", { range: { max: west }, today: west, left: false })?.text).toBe("Enter a birth date up to today.");
  });

  it("pads the month and the day, and keeps the year's four digits", () => {
    expect(localDay(new Date(2001, 0, 5, 9))).toBe("2001-01-05");
    expect(localDay(new Date(2026, 11, 31, 23, 59, 59))).toBe("2026-12-31");
    expect(localDay(new Date(2024, 1, 29, 0, 0, 0))).toBe("2024-02-29");
  });
});

/** A date field as the browser plays it, one edit at a time, through the same step the component calls. */
class DateTyper {
  digits = "";
  text = "";
  caret = 0;
  value = "";
  done = 0;
  refused = false;
  sent: string[] = [];

  constructor(readonly order: DateOrder = "dmy", readonly range: { min?: string; max?: string } = {}, value = "") {
    this.value = value;
    this.digits = dateDigits(value, order);
    this.text = dateText(this.digits, order);
    this.caret = this.text.length;
  }

  edit(text: string, caret: number, inputType = "insertText") {
    const step = stepDate(this.digits, { shown: this.text, text, caret, inputType }, this.order, this.range);
    if (step.refused) expect(step.digits, `a refused ${JSON.stringify(text)} keeps the digits`).toBe(this.digits);
    this.digits = step.digits;
    this.text = step.text;
    this.caret = step.caret;
    this.refused = step.refused;
    if (step.value !== this.value) {
      this.value = step.value;
      this.sent.push(step.value);
    }
    if (step.done) this.done++;
    return this;
  }

  type(keys: string) {
    for (const key of keys) this.edit(this.text.slice(0, this.caret) + key + this.text.slice(this.caret), this.caret + 1);
    return this;
  }

  /** Selects start to end and types over it. */
  over(start: number, end: number, keys: string) {
    const text = this.text.slice(0, start) + keys + this.text.slice(end);
    return this.edit(text, start + keys.length, keys.length > 1 ? "insertFromPaste" : "insertText");
  }

  at(caret: number) {
    this.caret = caret;
    return this;
  }
}

describe("a date edited a part at a time", () => {
  it("replaces a selected day with two digits, and the date is whole again at once", () => {
    const field = new DateTyper("dmy").type("04051929");
    field.over(0, 2, "31");
    expect(field.text).toBe("31 / 05 / 1929");
    expect(field.value).toBe("1929-05-31");
  });

  it("holds the date back while an edit makes it impossible, and sends it again when the next edit mends it", () => {
    const field = new DateTyper("dmy").type("30012000");
    field.over(5, 7, "02");
    expect(field.text).toBe("30 / 02 / 2000");
    expect(field.value).toBe("");
    expect(field.sent).toEqual(["2000-01-30", ""]);
    field.over(0, 2, "29");
    expect(field.value).toBe("2000-02-29");
    expect(field.sent).toEqual(["2000-01-30", "", "2000-02-29"]);
  });

  it("takes a leap day away when its year is retyped as 1900 and back when it is retyped as 2000", () => {
    const field = new DateTyper("dmy").type("29022000");
    expect(field.value).toBe("2000-02-29");
    field.over(10, 14, "1900");
    expect(field.text).toBe("29 / 02 / 1900");
    expect(field.value).toBe("");
    field.over(10, 14, "2000");
    expect(field.value).toBe("2000-02-29");
    expect(field.sent).toEqual(["2000-02-29", "", "2000-02-29"]);
  });

  it("replaces a whole month, year or day in the other two orders the same way", () => {
    const us = new DateTyper("mdy").type("05041929");
    us.over(0, 2, "12");
    expect(us.value).toBe("1929-12-04");
    const iso = new DateTyper("ymd").type("19290504");
    iso.over(0, 4, "2000");
    iso.over(12, 14, "29");
    iso.over(7, 9, "02");
    expect(iso.text).toBe("2000 / 02 / 29");
    expect(iso.value).toBe("2000-02-29");
  });

  it("does not call a middle edit done, so focus stays where the reader is mending", () => {
    const field = new DateTyper("dmy").type("04051929");
    expect(field.done).toBe(1);
    field.over(0, 2, "31");
    field.over(5, 7, "12");
    expect(field.done).toBe(1);
  });

  it("is done only when the edit that finishes the date is at its end, and again each time that happens", () => {
    const field = new DateTyper("dmy").type("0405192");
    expect(field.done).toBe(0);
    field.type("9");
    expect(field.done).toBe(1);
    field.edit("04 / 05 / 192", 13, "deleteContentBackward");
    field.type("9");
    expect(field.done).toBe(2);
  });

  it("selecting everything and typing one digit starts the date again from it", () => {
    const field = new DateTyper("dmy").type("04051929");
    field.over(0, field.text.length, "1");
    expect(field.text).toBe("1");
    expect(field.value).toBe("");
    expect(field.sent).toEqual(["1929-05-04", ""]);
  });

  it("selecting everything and pasting a date replaces the date and finishes it", () => {
    const field = new DateTyper("dmy").type("04051929");
    field.over(0, field.text.length, "2000-02-29");
    expect(field.text).toBe("29 / 02 / 2000");
    expect(field.value).toBe("2000-02-29");
  });

  it("a range holds the field's value back at the last refused day and gives it at the last allowed one", () => {
    const field = new DateTyper("dmy", { min: "1900-01-01", max: "2026-10-02" }).type("03102026");
    expect(field.value).toBe("");
    field.over(0, 2, "02");
    expect(field.value).toBe("2026-10-02");
    field.over(0, 2, "03");
    expect(field.value).toBe("");
  });
});

describe("a pasted date in mixed separators", () => {
  it("reads the three groups whatever the separators between them are, even when they differ", () => {
    for (const clip of ["4/5.1929", "4-5/1929", "4 . 5 , 1929", "04/05 1929", "4\t5\t1929", "4／5／1929", "4·5·1929", "4/5/1929."]) {
      expect(readDate(clip, "dmy"), JSON.stringify(clip)).toBe("04051929");
    }
    for (const clip of ["1929/05-04", "1929.5 4", "1929 05 04", "1929年5月4日", "1929-05-04, 03:00"]) {
      expect(readDate(clip, "dmy"), JSON.stringify(clip)).toBe("04051929");
      expect(readDate(clip, "mdy"), JSON.stringify(clip)).toBe("05041929");
      expect(readDate(clip, "ymd"), JSON.stringify(clip)).toBe("19290504");
    }
  });

  it("reads the field's own order, so the same clip is two different days in two orders", () => {
    expect(readDate("4/5/1929", "dmy")).toBe("04051929");
    expect(readDate("4/5/1929", "mdy")).toBe("04051929");
    expect(dateValue(readDate("4/5/1929", "dmy")!, "dmy")).toBe("1929-05-04");
    expect(dateValue(readDate("4/5/1929", "mdy")!, "mdy")).toBe("1929-04-05");
  });

  it("reads a year-first clip into any field without guessing which of the other two is the month", () => {
    expect(readDate("1929-12-01", "dmy")).toBe("01121929");
    expect(readDate("1929-12-01", "mdy")).toBe("12011929");
  });

  it("leaves a clip that is not three whole parts to be typed", () => {
    for (const clip of ["", "   ", "4/5", "4", "/", "4//", "1929", "19290", "1929050", "190504", "123/5/1929", "4/5/19290", "1929-1929-1929", "May 4", "4th May", "tomorrow"]) {
      expect(readDate(clip, "dmy"), JSON.stringify(clip)).toBeNull();
    }
    expect(readDate("29-5-4", "ymd")).toBeNull();
    expect(readDate("5/4/1929", "ymd")).toBeNull();
  });

  it("hands an impossible date on as digits for the field to refuse, never as a value", () => {
    const digits = readDate("31/4/1929", "dmy")!;
    expect(digits).toBe("31041929");
    expect(dateValue(digits, "dmy")).toBe("");
    expect(dateValue(readDate("1929-13-45", "dmy")!, "dmy")).toBe("");
  });

  it("reads a clip's digits in any script, the ideographic and the Arabic-Indic kinds mixed", () => {
    expect(readDate("４／５／１９２９", "dmy")).toBe("04051929");
    expect(readDate("۴/۵/۱۹۲۹", "dmy")).toBe("04051929");
    expect(readDate("1929-٠٥-０４", "dmy")).toBe("04051929");
  });

  it("through the field: a mixed clip fills it and finishes the date", () => {
    const field = new DateTyper("dmy").over(0, 0, "4/5.1929");
    expect(field.text).toBe("04 / 05 / 1929");
    expect(field.value).toBe("1929-05-04");
    expect(field.done).toBe(1);
  });
});

describe("a pasted date in words, through the field (MB-185, QA-02 #12)", () => {
  it("reads the site's own readout back in, in every order, never as 41 / 92 / 9", () => {
    for (const order of ORDERS) {
      const field = new DateTyper(order).over(0, 0, "4 May 1929");
      expect(field.digits, order).toBe(typed(order, 1929, 5, 4));
      expect(field).toMatchObject({ value: "1929-05-04", done: 1, refused: false });
    }
  });

  it("reads a date in words over a selection, replacing the date that was there", () => {
    const field = new DateTyper("mdy").type("01011990");
    field.over(0, field.text.length, "May 4, 1929");
    expect(field).toMatchObject({ text: "05 / 04 / 1929", value: "1929-05-04", sent: ["1990-01-01", "1929-05-04"], done: 2 });
  });

  it("keeps what the field held when the words are not a date it can read, and the next edit clears the refusal", () => {
    const field = new DateTyper("dmy").type("0405");
    field.over(field.text.length, field.text.length, "4 Mai 1929");
    expect(field).toMatchObject({ text: "04 / 05 / ", caret: "04 / 05 / ".length, value: "", refused: true, done: 0 });
    field.type("1929");
    expect(field).toMatchObject({ text: "04 / 05 / 1929", value: "1929-05-04", refused: false, done: 1 });
  });

  it("keeps a whole date when words over all of it cannot be read, and sends nothing new", () => {
    const field = new DateTyper("dmy").type("04051929");
    field.over(0, field.text.length, "the fourth of May");
    expect(field).toMatchObject({ text: "04 / 05 / 1929", value: "1929-05-04", sent: ["1929-05-04"], refused: true });
  });

  it("reads a month named in any case or cut short, with the day and year in any script", () => {
    for (const clip of ["4 MAY 1929", "4\u00a0May\u00a01929", "４ May １９２９", "٤ may ١٩٢٩", " 4 May 1929. "]) {
      expect(readDate(clip, "dmy"), clip).toBe("04051929");
    }
    for (const [clip, digits] of [["4 Jan 1990", "04011990"], ["4 Febr. 1990", "04021990"], ["4 Sep 1990", "04091990"], ["4 Sept 1990", "04091990"]] as const) {
      expect(readDate(clip, "dmy"), clip).toBe(digits);
    }
  });

  it("never takes a word that only starts like a month, nor two letters, for one", () => {
    for (const clip of ["4 Mayo 1929", "4 Ma 1929", "4 Junio 1929", "4 Marzo 1929", "4 Augusta 1929", "Mai 4, 1929"]) {
      expect(readDate(clip, "dmy"), clip).toBeNull();
    }
  });

  it("falls back to the numbers when a word that is also a month cannot be read as one", () => {
    expect(readDate("Jan, 04.05.1929", "dmy")).toBe("04051929");
    expect(readDate("you may type 4/5/1929", "dmy")).toBe("04051929");
  });
});

describe("Backspace and Delete at every position of a field, repeated digits and all", () => {
  const cases: [DateOrder, string][] = [
    ["dmy", "11111111"], ["dmy", "12121212"], ["dmy", "00000000"], ["dmy", "04051929"], ["ymd", "19291929"],
    ["mdy", "22222222"], ["dmy", "0405192"], ["dmy", "040"], ["ymd", "19290"], ["dmy", "04"],
  ];

  it.each(cases)("%s %s: Backspace takes the digit before the caret, or the digit before a separator it removes", (order, digits) => {
    const text = dateText(digits, order);
    for (let caret = 1; caret <= text.length; caret++) {
      const field = new DateTyper(order);
      field.digits = digits;
      field.text = text;
      field.caret = caret;
      field.edit(text.slice(0, caret - 1) + text.slice(caret), caret - 1, "deleteContentBackward");
      const before = text.slice(0, caret).replace(/\D/g, "").length;
      expect(field.digits, `${JSON.stringify(text)} at ${caret}`).toBe(digits.slice(0, before - 1) + digits.slice(before));
    }
  });

  it.each(cases)("%s %s: Delete takes the digit after the caret, or the digit after a separator it removes", (order, digits) => {
    const text = dateText(digits, order);
    for (let caret = 0; caret < text.length; caret++) {
      const field = new DateTyper(order);
      field.digits = digits;
      field.text = text;
      field.caret = caret;
      field.edit(text.slice(0, caret) + text.slice(caret + 1), caret, "deleteContentForward");
      const before = text.slice(0, caret).replace(/\D/g, "").length;
      expect(field.digits, `${JSON.stringify(text)} at ${caret}`).toBe(digits.slice(0, before) + digits.slice(before + 1));
    }
  });

  it("types a digit at every position of a part-typed field into that place, however many digits repeat", () => {
    for (const digits of ["1111", "0405", "04051"]) {
      const text = dateText(digits, "dmy");
      for (const key of ["7", "1"]) {
        for (let caret = 0; caret <= text.length; caret++) {
          const field = new DateTyper("dmy");
          field.digits = digits;
          field.text = text;
          field.caret = caret;
          field.edit(text.slice(0, caret) + key + text.slice(caret), caret + 1);
          const before = text.slice(0, caret).replace(/\D/g, "").length;
          expect(field.digits, `${key} into ${JSON.stringify(text)} at ${caret}`).toBe((digits.slice(0, before) + key + digits.slice(before)).slice(0, 8));
        }
      }
    }
  });

  it("a whole field types over the digit at the caret: it never grows and never loses its length", () => {
    for (const digits of ["11111111", "04051929", "12121212"]) {
      const text = dateText(digits, "dmy");
      for (let caret = 0; caret < text.length; caret++) {
        const field = new DateTyper("dmy");
        field.digits = digits;
        field.text = text;
        field.caret = caret;
        field.edit(text.slice(0, caret) + "7" + text.slice(caret), caret + 1);
        expect(field.digits.length, `${JSON.stringify(text)} at ${caret}`).toBe(8);
      }
    }
  });
});

describe("every minute of the day, on both clocks", () => {
  const MINUTES = Array.from({ length: 1440 }, (_, i) => `${two(Math.floor(i / 60))}:${two(i % 60)}`);

  it.each<Clock>([12, 24])("a stored time comes back out of the field as it went in, on the %i-hour clock", (clock) => {
    for (const hhmm of MINUTES) {
      expect(timeValue(timeState(hhmm, clock), clock), hhmm).toBe(hhmm);
    }
  });

  it("shows every 12-hour time with an hour from 1 to 12, and its half of the day on the switch", () => {
    for (const hhmm of MINUTES) {
      const { digits, half } = timeState(hhmm, 12);
      const hour = Number(digits.slice(0, 2));
      expect(hour >= 1 && hour <= 12, `${hhmm} as ${digits}`).toBe(true);
      expect(half, hhmm).toBe(Number(hhmm.slice(0, 2)) < 12 ? "am" : "pm");
      expect(digits.slice(2), hhmm).toBe(hhmm.slice(3));
    }
  });

  it("reads back, in words, as the time it is: noon and midnight, the hours after them, the last minute of the day", () => {
    for (const hhmm of MINUTES) {
      const twelve = clockWords(hhmm, 12);
      const match = /^(\d{1,2})(?::(\d{2}))? (am|pm)$/.exec(twelve);
      expect(match, `${hhmm} as ${JSON.stringify(twelve)}`).not.toBeNull();
      const hour = Number(match![1]);
      expect(hour >= 1 && hour <= 12, twelve).toBe(true);
      const back = `${two((hour % 12) + (match![3] === "pm" ? 12 : 0))}:${match![2] ?? "00"}`;
      expect(back, twelve).toBe(hhmm);
      expect(clockWords(hhmm, 24), hhmm).toBe(hhmm);
    }
  });

  it("names the two ends of the day and noon as 12 am, 11:59 pm and 12 pm, never as 0 or 24", () => {
    expect(clockWords("00:00", 12)).toBe("12 am");
    expect(clockWords("00:01", 12)).toBe("12:01 am");
    expect(clockWords("12:00", 12)).toBe("12 pm");
    expect(clockWords("12:59", 12)).toBe("12:59 pm");
    expect(clockWords("13:00", 12)).toBe("1 pm");
    expect(clockWords("23:59", 12)).toBe("11:59 pm");
  });
});

/** A time field as the browser plays it, through the same step the component calls. */
class TimeTyper {
  digits: string;
  half: Half;
  halfSet = false;
  text: string;
  caret: number;
  value = "";
  done = 0;

  constructor(readonly clock: Clock, value = "") {
    ({ digits: this.digits, half: this.half } = timeState(value, clock));
    this.text = timeText(this.digits);
    this.caret = this.text.length;
    this.value = value;
  }

  edit(text: string, caret: number, inputType = "insertText") {
    const state = { digits: this.digits, half: this.half, halfSet: this.halfSet };
    const step = stepTime(state, { shown: this.text, text, caret, inputType }, this.clock);
    ({ digits: this.digits, half: this.half, halfSet: this.halfSet, text: this.text, caret: this.caret, value: this.value } = step);
    if (step.done) this.done++;
    return this;
  }

  type(keys: string) {
    for (const key of keys) this.edit(this.text.slice(0, this.caret) + key + this.text.slice(this.caret), this.caret + 1);
    return this;
  }

  paste(clip: string) {
    return this.edit(this.text.slice(0, this.caret) + clip + this.text.slice(this.caret), this.caret + clip.length, "insertFromPaste");
  }

  pick(half: Half) {
    const step = pickHalf({ digits: this.digits, half: this.half, halfSet: this.halfSet }, half, this.clock);
    ({ half: this.half, halfSet: this.halfSet, value: this.value } = step);
    if (step.done) this.done++;
    return this;
  }
}

describe("typing a time on the 12-hour clock", () => {
  it("12 with the switch on AM is midnight, with it on PM is noon, and the switch decides it after the digits too", () => {
    expect(new TimeTyper(12).type("1200").value).toBe("00:00");
    expect(new TimeTyper(12).type("1200").pick("pm").value).toBe("12:00");
    expect(new TimeTyper(12).pick("pm").type("1200").value).toBe("12:00");
    expect(new TimeTyper(12).type("1230").pick("pm").value).toBe("12:30");
    expect(new TimeTyper(12).type("1230").value).toBe("00:30");
  });

  it("types the A or the P of 12 AM and 12 PM into the field", () => {
    expect(new TimeTyper(12).type("1200p").value).toBe("12:00");
    expect(new TimeTyper(12).type("1200pm").value).toBe("12:00");
    expect(new TimeTyper(12).type("1200p").type("a").value).toBe("00:00");
    expect(new TimeTyper(12).type("0159P").value).toBe("13:59");
  });

  it("is done once, when the half is set on a whole time, whichever comes last (MB-173)", () => {
    for (const keys of ["1200p", "p1200", "1200a", "0159P"]) {
      expect(new TimeTyper(12).type(keys).done, keys).toBe(1);
    }
    expect(new TimeTyper(12).type("1200").done).toBe(0);
    expect(new TimeTyper(12).type("1200").pick("am").done).toBe(1);
    expect(new TimeTyper(12).pick("pm").type("1200").done).toBe(1);
    expect(new TimeTyper(12).type("1200pa").pick("pm").done).toBe(1);
  });

  it("is done again when the last digit is typed again at the end, once the half is set", () => {
    const field = new TimeTyper(12).type("0300p");
    field.edit("03 : 0", 6, "deleteContentBackward");
    expect(field.value).toBe("");
    field.type("5");
    expect(field).toMatchObject({ value: "15:05", done: 2 });
  });

  it("is never done mid-edit, even when typing over the hour reads it as a 24-hour time", () => {
    const field = new TimeTyper(12).type("0330");
    field.edit("13 : 30", 1);
    expect(field).toMatchObject({ half: "pm", halfSet: true, done: 0 });
  });

  it("sends nothing for hour 00 typed as 00 on a 12-hour clock: it is read as 12, never left as an hour that is not there", () => {
    const field = new TimeTyper(12).type("0030");
    expect(field.digits).toBe("1230");
    expect(field.half).toBe("am");
    expect(field.value).toBe("00:30");
  });

  it("reads 13 to 23 as that 24-hour time and PM, and 24 as no time at all", () => {
    expect(new TimeTyper(12).type("1300").value).toBe("13:00");
    expect(new TimeTyper(12).type("2359").value).toBe("23:59");
    expect(new TimeTyper(12).type("2359").half).toBe("pm");
    const late = new TimeTyper(12).type("2400");
    expect(late.value).toBe("");
    expect(timeNote(late.digits, 12, true)).toBe("There's no 24:00. Check the hour.");
  });

  it("holds the minutes to 59 on both clocks, and never calls a time with minutes 60 done", () => {
    for (const clock of [12, 24] as const) {
      const field = new TimeTyper(clock).type("0360");
      expect(field.value, `${clock}`).toBe("");
      expect(field.done, `${clock}`).toBe(0);
      expect(timeNote(field.digits, clock, false)).toBe("There's no 03:60. Check the minutes.");
    }
  });

  it("keeps the switch where the reader left it when a time is pasted without an am or a pm", () => {
    const field = new TimeTyper(12).pick("pm");
    field.paste("3:30");
    expect(field.value).toBe("15:30");
    expect(new TimeTyper(12).paste("3:30").value).toBe("03:30");
  });

  it("on the 24-hour clock a pasted am or pm still decides the half of the day", () => {
    expect(new TimeTyper(24).paste("3:30 pm").value).toBe("15:30");
    expect(new TimeTyper(24).paste("12:15 AM").value).toBe("00:15");
    expect(new TimeTyper(24).paste("12:15 PM").value).toBe("12:15");
  });
});

describe("a pasted time in the forms people write it", () => {
  it("reads 12 am and 12 pm as midnight and noon, with or without minutes, on either clock", () => {
    for (const clock of [12, 24] as const) {
      expect(timeValue(readTime("12:00 am", clock)!, clock), `12:00 am on ${clock}`).toBe("00:00");
      expect(timeValue(readTime("12:00 pm", clock)!, clock), `12:00 pm on ${clock}`).toBe("12:00");
      expect(timeValue(readTime("12:30 AM", clock)!, clock), `12:30 AM on ${clock}`).toBe("00:30");
      expect(timeValue(readTime("12:30 PM", clock)!, clock), `12:30 PM on ${clock}`).toBe("12:30");
      expect(timeValue(readTime("11:59 pm", clock)!, clock), `11:59 pm on ${clock}`).toBe("23:59");
      expect(timeValue(readTime("1:00 am", clock)!, clock), `1:00 am on ${clock}`).toBe("01:00");
    }
  });

  it("reads the marks people write after the time: p.m., P.M., 3pm, 3 p, a.m.", () => {
    for (const [clip, value] of [
      ["3:30 p.m.", "15:30"], ["3:30 P.M.", "15:30"], ["3:30pm", "15:30"], ["3:30 p", "15:30"], ["3:30 a.m.", "03:30"],
      ["3:30am", "03:30"], ["3:30 A", "03:30"],
    ] as const) {
      expect(timeValue(readTime(clip, 24)!, 24), clip).toBe(value);
      expect(timeValue(readTime(clip, 12)!, 12), clip).toBe(value);
    }
  });

  it("never takes the a or p inside a word for a half of the day", () => {
    expect(readTime("Sat 3:30", 24)).toEqual({ digits: "0330", half: "am" });
    expect(readTime("3:30 Paris", 24)).toEqual({ digits: "0330", half: "am" });
    expect(readTime("3:30 apple", 24)).toEqual({ digits: "0330", half: "am" });
  });

  it("holds an hour that is no hour to the field's refusal, not to a guess", () => {
    expect(timeValue(readTime("24:00", 24)!, 24)).toBe("");
    expect(timeValue(readTime("13:00 pm", 12)!, 12)).toBe("13:00");
    expect(timeValue(readTime("0:30 am", 24)!, 24)).toBe("00:30");
    expect(timeValue(readTime("15:75", 24)!, 24)).toBe("");
  });

  it("leaves what is not a time to be typed", () => {
    for (const clip of ["", "noon", "12345", "123:456", "a.m."]) {
      expect(readTime(clip, 24), JSON.stringify(clip)).toBeNull();
    }
  });
});

/** A fixed pseudo-random run, so a failure names the same edit every time. */
function randoms(seed: number) {
  let state = seed;
  const next = () => (state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296) / 4_294_967_296;
  return { int: (n: number) => Math.floor(next() * n), pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)] };
}

const KEYS = [..."0123456789", "/", " ", ".", "-", "p", "a", "m", "h", ":", "x", "٣", "４"];
const CLIPS = [
  "1929-05-04", "4/5/1929", "04051929", "3:30 pm", "15h30", "0300", "12:00 am", "", "abc", "4/5", "1929-13-45", "２４", "9999999999",
  "4 May 1929", "May 4, 1929", "4 Mai 1929", "31 Feb 1999",
];

describe("whatever is typed, pasted or deleted, the date field's step stays whole", () => {
  it.each(ORDERS)("%s: digits, text, value and caret agree after every one of 3000 random edits", (order) => {
    const random = randoms(order.length * 7919);
    const range = { min: "1900-01-01", max: "2026-10-02" };
    const field = new DateTyper(order, range);
    for (let i = 0; i < 3000; i++) {
      const caret = random.int(field.text.length + 1);
      const other = Math.min(field.text.length, caret + random.int(4));
      const op = random.int(5);
      if (op === 0) field.edit(field.text.slice(0, caret) + random.pick(KEYS) + field.text.slice(caret), caret + 1);
      else if (op === 1 && caret > 0) field.edit(field.text.slice(0, caret - 1) + field.text.slice(caret), caret - 1, "deleteContentBackward");
      else if (op === 2 && caret < field.text.length) field.edit(field.text.slice(0, caret) + field.text.slice(caret + 1), caret, "deleteContentForward");
      else if (op === 3) {
        const clip = random.pick(CLIPS);
        field.edit(field.text.slice(0, caret) + clip + field.text.slice(other), caret + clip.length, "insertFromPaste");
      } else field.edit(field.text.slice(0, caret) + random.pick(KEYS) + field.text.slice(other), caret + 1);
      const at = `edit ${i}: ${JSON.stringify(field.text)}`;
      expect(field.digits, at).toMatch(/^\d{0,8}$/);
      expect(field.text, at).toBe(dateText(field.digits, order));
      expect(field.value, at).toBe(dateValue(field.digits, order, range));
      expect(field.caret >= 0 && field.caret <= field.text.length, at).toBe(true);
    }
  });
});

describe("whatever is typed, pasted or deleted, the time field's step stays whole", () => {
  it.each<Clock>([12, 24])("the %i-hour clock: digits, text and value agree after every one of 3000 random edits", (clock) => {
    const random = randoms(clock * 104_729);
    const field = new TimeTyper(clock);
    for (let i = 0; i < 3000; i++) {
      const caret = random.int(field.text.length + 1);
      const op = random.int(4);
      if (op === 0) field.edit(field.text.slice(0, caret) + random.pick(KEYS) + field.text.slice(caret), caret + 1);
      else if (op === 1 && caret > 0) field.edit(field.text.slice(0, caret - 1) + field.text.slice(caret), caret - 1, "deleteContentBackward");
      else if (op === 2 && caret < field.text.length) field.edit(field.text.slice(0, caret) + field.text.slice(caret + 1), caret, "deleteContentForward");
      else {
        const clip = random.pick(CLIPS);
        field.edit(field.text.slice(0, caret) + clip + field.text.slice(caret), caret + clip.length, "insertFromPaste");
      }
      const at = `edit ${i}: ${JSON.stringify(field.text)} ${field.half}`;
      expect(field.digits, at).toMatch(/^\d{0,4}$/);
      expect(field.text, at).toBe(timeText(field.digits));
      expect(field.value, at).toBe(timeValue({ digits: field.digits, half: field.half }, clock));
      expect(field.value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(field.value), at).toBe(true);
    }
  });
});

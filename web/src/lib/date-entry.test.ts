import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENTRY, TIME_PATTERN, clockWords, dateDigits, dateNote, datePattern, dateText, dateValue, entryFormat, localDay,
  pickHalf, readDate, readTime, stepDate, stepTime, timeNote, timeState, timeText, timeValue,
  type Clock, type DateOrder,
} from "./date-entry";

// Acceptance 3 of review-02-10: the order Intl gives, and the 12-hour clock where the hour cycle is h11 or h12.
const LANGUAGES: [lang: string, order: DateOrder, clock: Clock][] = [
  ["en-US", "mdy", 12],
  ["en-GB", "dmy", 24],
  ["fr", "dmy", 24],
  ["de", "dmy", 24],
  ["sk", "dmy", 24],
  ["en-AU", "dmy", 12],
  ["en-IN", "dmy", 12],
  ["ja", "ymd", 24],
  ["zh", "ymd", 24],
  ["ko", "ymd", 12],
  ["en-CA", "ymd", 12],
];

const ORDERS: DateOrder[] = ["dmy", "mdy", "ymd"];
const PATTERN: Record<DateOrder, string> = { dmy: "DD / MM / YYYY", mdy: "MM / DD / YYYY", ymd: "YYYY / MM / DD" };
// 4 May 1929, Audrey Hepburn's birth date, as each order types and writes it.
const TYPED: Record<DateOrder, string> = { dmy: "04051929", mdy: "05041929", ymd: "19290504" };
const WRITTEN: Record<DateOrder, string> = { dmy: "4/5/1929", mdy: "5/4/1929", ymd: "1929/5/4" };
const TODAY = "2026-10-02";
// A pattern inside a sentence is bound by no-break spaces, so it never splits across lines.
const nb = (pattern: string) => pattern.replace(/ /g, "\u00a0");

describe("the order and the clock come from the browser's language", () => {
  it.each(LANGUAGES)("%s writes %s on a %s-hour clock", (lang, order, clock) => {
    expect(entryFormat(lang)).toEqual({ order, clock });
  });

  it("falls back to DD / MM / YYYY and 24-hour for a language Intl does not know or cannot read", () => {
    expect(DEFAULT_ENTRY).toEqual({ order: "dmy", clock: 24 });
    for (const lang of ["", "xx", "zz-ZZ", "en_US", "*"]) expect(entryFormat(lang)).toEqual(DEFAULT_ENTRY);
  });

  it("keeps a language's own hour cycle when the browser asks for one", () => {
    expect(entryFormat("en-US-u-hc-h23")).toEqual({ order: "mdy", clock: 24 });
  });

  it("reads the Gregorian order where the language's own calendar is another", () => {
    expect(entryFormat("fa").order).toBe("ymd");
    expect(entryFormat("th").order).toBe("dmy");
  });
});

describe("whatever the language, the value is YYYY-MM-DD and HH:MM", () => {
  it.each(LANGUAGES)("%s: typed, pasted as ISO and pasted in its own order", (lang) => {
    const { order, clock } = entryFormat(lang);
    expect(datePattern(order)).toBe(PATTERN[order]);
    expect(dateValue(TYPED[order], order)).toBe("1929-05-04");
    expect(dateValue(readDate("1929-05-04", order)!, order)).toBe("1929-05-04");
    expect(dateValue(readDate(WRITTEN[order], order)!, order)).toBe("1929-05-04");
    expect(dateText(dateDigits("1929-05-04", order), order)).toBe(PATTERN[order].replace("DD", "04").replace("MM", "05").replace("YYYY", "1929"));

    expect(timeValue({ digits: "0300", half: "am" }, clock)).toBe("03:00");
    expect(timeValue(readTime("15:30", clock)!, clock)).toBe("15:30");
    expect(timeValue(readTime("3:30 pm", clock)!, clock)).toBe("15:30");
    expect(timeValue(timeState("15:30", clock), clock)).toBe("15:30");
  });
});

describe("times in words", () => {
  it("reads the site's 12-hour style with a no-break space, and 24-hour as HH:MM", () => {
    const cases: [string, string, string][] = [
      ["03:00", "3\u00a0am", "03:00"],
      ["15:30", "3:30\u00a0pm", "15:30"],
      ["00:00", "12\u00a0am", "00:00"],
      ["12:00", "12\u00a0pm", "12:00"],
      ["23:59", "11:59\u00a0pm", "23:59"],
      ["09:05", "9:05\u00a0am", "09:05"],
    ];
    for (const [hhmm, twelve, twentyFour] of cases) {
      expect(clockWords(hhmm, 12)).toBe(twelve);
      expect(clockWords(hhmm, 24)).toBe(twentyFour);
    }
  });

  it("pads a short hour on the 24-hour clock and leaves anything else alone", () => {
    expect(clockWords("3:00", 24)).toBe("03:00");
    expect(clockWords("noon", 12)).toBe("noon");
  });
});

describe("the date field's layout", () => {
  it("puts each separator in once a part is whole", () => {
    expect(["", "0", "04", "040", "0405", "04051", "04051929"].map((d) => dateText(d, "dmy")))
      .toEqual(["", "0", "04 / ", "04 / 0", "04 / 05 / ", "04 / 05 / 1", "04 / 05 / 1929"]);
    expect(["1929", "19290", "192905", "19290504"].map((d) => dateText(d, "ymd")))
      .toEqual(["1929 / ", "1929 / 0", "1929 / 05 / ", "1929 / 05 / 04"]);
  });

  it("reads a stored date in the reader's order, and nothing else", () => {
    expect(dateDigits("1929-05-04", "dmy")).toBe("04051929");
    expect(dateDigits("1929-05-04", "mdy")).toBe("05041929");
    expect(dateDigits("1929-05-04", "ymd")).toBe("19290504");
    expect(dateDigits("", "dmy")).toBe("");
    expect(dateDigits("1929-5-4", "dmy")).toBe("");
  });
});

describe("only a whole, real date in range leaves the field", () => {
  it("holds back an unfinished or impossible date", () => {
    expect(dateValue("0405192", "dmy")).toBe("");
    expect(dateValue("31041990", "dmy")).toBe("");
    expect(dateValue("01131990", "dmy")).toBe("");
    expect(dateValue("00051990", "dmy")).toBe("");
    expect(dateValue("29021929", "dmy")).toBe("");
  });

  it("knows the leap years", () => {
    expect(dateValue("29022000", "dmy")).toBe("2000-02-29");
    expect(dateValue("29022024", "dmy")).toBe("2024-02-29");
    expect(dateValue("29021900", "dmy")).toBe("");
  });

  it("holds back a date outside the form's range", () => {
    const range = { min: "1900-01-01", max: TODAY };
    expect(dateValue("31121899", "dmy", range)).toBe("");
    expect(dateValue("01011900", "dmy", range)).toBe("1900-01-01");
    expect(dateValue("02102026", "dmy", range)).toBe("2026-10-02");
    expect(dateValue("03102026", "dmy", range)).toBe("");
  });
});

describe("the line under the date", () => {
  const note = (digits: string, order: DateOrder = "dmy", left = false, range = {}) => dateNote(digits, order, { range, today: TODAY, left });

  it("spells a whole date out in the site's one style, in every order (reading 6)", () => {
    for (const order of ["dmy", "mdy", "ymd"] as const) expect(note(TYPED[order], order)).toEqual({ kind: "readout", text: "4 May 1929" });
  });

  it("says nothing while empty, shows the order while the digits go in, and asks for the rest once the reader leaves", () => {
    expect(note("")).toBeNull();
    expect(note("0405", "mdy")).toEqual({ kind: "order", text: "MM / DD / YYYY" });
    expect(note("040519", "dmy", true)).toEqual({ kind: "problem", text: `Type the full date as ${nb("DD / MM / YYYY")}.` });
  });

  it("names what is wrong with an impossible date", () => {
    expect(note("12251990", "dmy")?.text).toBe(`There's no month 25. Type the date as ${nb("DD / MM / YYYY")}.`);
    expect(note("25121990", "mdy")?.text).toBe(`There's no month 25. Type the date as ${nb("MM / DD / YYYY")}.`);
    expect(note("32011990")?.text).toBe("There's no day 32. Check the day.");
    expect(note("00011990")?.text).toBe("There's no day 00. Check the day.");
    expect(note("31041990")?.text).toBe("There's no 31 April. Check the day.");
    expect(note("30021990")?.text).toBe("There's no 30 February. Check the day.");
    expect(note("29021929")?.text).toBe("There's no 29 February in 1929. Check the day.");
    expect(note("29021929")?.kind).toBe("problem");
  });

  it("says the range in the words the sky form already uses", () => {
    expect(note("31121899", "dmy", false, { min: "1900-01-01", max: TODAY })?.text).toBe("Enter a birth date from 1900 to today.");
    expect(note("03102026", "dmy", false, { max: TODAY })?.text).toBe("Enter a birth date up to today.");
    expect(note("31121899", "dmy", false, { min: "1900-01-01" })?.text).toBe("Enter a birth date from 1900 on.");
    expect(note("01012031", "dmy", false, { min: "1900-03-15", max: "2030-12-31" })?.text).toBe("Enter a birth date from 15 Mar 1900 to 31 Dec 2030.");
  });
});

describe("a pasted date", () => {
  it("reads ISO in any order, even with a time after it", () => {
    expect(readDate("1929-05-04", "dmy")).toBe("04051929");
    expect(readDate("1929-05-04", "mdy")).toBe("05041929");
    expect(readDate("1929-05-04", "ymd")).toBe("19290504");
    expect(readDate("1929-05-04T03:00:00Z", "dmy")).toBe("04051929");
    expect(readDate(" 1929.5.4 ", "dmy")).toBe("04051929");
  });

  it("reads the field's own order with any separator, and keeps a short year short", () => {
    expect(readDate("4/5/1929", "dmy")).toBe("04051929");
    expect(readDate("04.05.1929", "dmy")).toBe("04051929");
    expect(readDate("04. 05. 1929", "dmy")).toBe("04051929");
    expect(readDate("5/4/1929", "mdy")).toBe("05041929");
    expect(readDate("4/5/29", "dmy")).toBe("040529");
    expect(readDate("04051929", "dmy")).toBe("04051929");
  });

  it("reads digits from any keypad as ASCII", () => {
    expect(readDate("１９２９－０５－０４", "dmy")).toBe("04051929");
    expect(readDate("٤/٥/١٩٢٩", "dmy")).toBe("04051929");
  });

  it("leaves what is not a date to be typed", () => {
    expect(readDate("0405", "dmy")).toBeNull();
    expect(readDate("4/5", "dmy")).toBeNull();
    expect(readDate("4/5/1929", "ymd")).toBeNull();
    expect(readDate("May 4", "dmy")).toBeNull();
  });
});

describe("a date pasted in words (MB-185, QA-02 #12)", () => {
  it("reads 4 May 1929, May 4 1929 and 4 may 1929 in every field order, since the month's name says which part it is", () => {
    for (const order of ORDERS) {
      for (const clip of ["4 May 1929", "May 4 1929", "4 may 1929"]) {
        expect(readDate(clip, order), `${clip} into ${order}`).toBe(TYPED[order]);
      }
    }
  });

  it("reads the ways a date is written out: a comma, 4th, a short month, a weekday, the year first, all capitals", () => {
    for (const clip of [
      "May 4, 1929", "4th May 1929", "May 4th, 1929", "4th of May, 1929", "Saturday, 4 May 1929", "Sat, May 4, 1929",
      "04-May-1929", "04MAY1929", "1929 May 4", "MAY 4 1929", "4 May 1929 at 03:00", "May 4, 1929, 3:00 pm",
    ]) {
      expect(readDate(clip, "dmy"), clip).toBe("04051929");
      expect(readDate(clip, "mdy"), clip).toBe("05041929");
    }
    expect(readDate("Sept. 30, 1929", "dmy")).toBe("30091929");
    expect(readDate("31 Dec 1999", "ymd")).toBe("19991231");
    expect(readDate("2 february 2000", "mdy")).toBe("02022000");
  });

  it("reads a month's name ahead of the numbers around it, so a year-first date with a time after it is not misread", () => {
    expect(readDate("1929 May 4 03:00", "dmy")).toBe("04051929");
  });

  it("hands an impossible day on as digits for the field to refuse, as it does for one in numbers", () => {
    expect(readDate("31 April 1990", "dmy")).toBe("31041990");
    expect(dateValue(readDate("31 April 1990", "dmy")!, "dmy")).toBe("");
  });

  it("reads nothing it would have to guess: a month in another language, a missing part, a short year, two months", () => {
    for (const clip of ["4 Mai 1929", "4 de mayo de 1929", "May 1929", "4 May", "4 May 29", "4 May 1929 to 5 June 1930", "tomorrow"]) {
      expect(readDate(clip, "dmy"), clip).toBeNull();
    }
  });
});

describe("a paste the date field cannot read", () => {
  const paste = (digits: string, shown: string, clip: string, order: DateOrder = "dmy") =>
    stepDate(digits, { shown, text: shown + clip, caret: (shown + clip).length, inputType: "insertFromPaste" }, order);

  it("fills an empty field from words and finishes the date, so focus moves on to the time", () => {
    for (const order of ORDERS) {
      expect(paste("", "", "4 May 1929", order), order).toMatchObject({ digits: TYPED[order], value: "1929-05-04", done: true, refused: false });
    }
  });

  it("leaves the field as it was, its caret after what it held, never 41 / 92 / 9", () => {
    expect(paste("", "", "4 Mai 1929")).toMatchObject({ digits: "", text: "", caret: 0, value: "", done: false, refused: true });
    expect(paste("0405", "04 / 05 / ", "nineteen")).toMatchObject({ digits: "0405", text: "04 / 05 / ", caret: 10, done: false, refused: true });
  });

  it("still takes a paste of digits alone as typed, as the keypad would", () => {
    expect(paste("0405", "04 / 05 / ", "1929")).toMatchObject({ digits: "04051929", value: "1929-05-04", refused: false });
    expect(paste("", "", "0405")).toMatchObject({ digits: "0405", refused: false });
  });

  it("says why on the line under the field, in the field's order, until the next change (MB-185)", () => {
    for (const order of ORDERS) {
      expect(dateNote("", order, { today: TODAY, left: false, refused: true }), order)
        .toEqual({ kind: "problem", text: `We couldn't read that as a date. Type it as ${nb(PATTERN[order])}.` });
    }
    expect(dateNote(TYPED.dmy, "dmy", { today: TODAY, left: true, refused: true })?.kind).toBe("problem");
    expect(dateNote(TYPED.dmy, "dmy", { today: TODAY, left: false, refused: false })).toEqual({ kind: "readout", text: "4 May 1929" });
  });
});

describe("the time field", () => {
  it("lays the time out and shows the pattern", () => {
    expect(TIME_PATTERN).toBe("HH : MM");
    expect(["", "0", "03", "030", "0300"].map(timeText)).toEqual(["", "0", "03 : ", "03 : 0", "03 : 00"]);
  });

  it("shows a stored time on the reader's clock, its switch on the right half", () => {
    expect(timeState("15:30", 24)).toEqual({ digits: "1530", half: "pm" });
    expect(timeState("15:30", 12)).toEqual({ digits: "0330", half: "pm" });
    expect(timeState("00:15", 12)).toEqual({ digits: "1215", half: "am" });
    expect(timeState("12:00", 12)).toEqual({ digits: "1200", half: "pm" });
    expect(timeState("", 12)).toEqual({ digits: "", half: "am" });
  });

  it("sends the 24-hour time whatever the clock", () => {
    expect(timeValue({ digits: "0330", half: "pm" }, 12)).toBe("15:30");
    expect(timeValue({ digits: "1200", half: "am" }, 12)).toBe("00:00");
    expect(timeValue({ digits: "1200", half: "pm" }, 12)).toBe("12:00");
    expect(timeValue({ digits: "2359", half: "am" }, 24)).toBe("23:59");
    expect(timeValue({ digits: "2400", half: "am" }, 24)).toBe("");
    expect(timeValue({ digits: "1300", half: "am" }, 12)).toBe("");
    expect(timeValue({ digits: "0360", half: "am" }, 24)).toBe("");
    expect(timeValue({ digits: "030", half: "am" }, 24)).toBe("");
  });

  it("reads a pasted time in the forms people write it", () => {
    expect(readTime("15:30", 24)).toEqual({ digits: "1530", half: "pm" });
    expect(readTime("3:30 pm", 24)).toEqual({ digits: "1530", half: "pm" });
    expect(readTime("3:30 AM", 24)).toEqual({ digits: "0330", half: "am" });
    expect(readTime("12:10 am", 24)).toEqual({ digits: "0010", half: "am" });
    expect(readTime("0330", 24)).toEqual({ digits: "0330", half: "am" });
    expect(readTime("330", 24)).toEqual({ digits: "0330", half: "am" });
    expect(readTime("15h30", 24)).toEqual({ digits: "1530", half: "pm" });
    expect(readTime("03:30:00", 24)).toEqual({ digits: "0330", half: "am" });
    expect(readTime("15:30", 12)).toEqual({ digits: "0330", half: "pm" });
    expect(readTime("3:30", 12, "pm")).toEqual({ digits: "0330", half: "pm" });
    expect(readTime("00:30", 12, "pm")).toEqual({ digits: "1230", half: "am" });
    expect(readTime("１５：３０", 24)).toEqual({ digits: "1530", half: "pm" });
    expect(readTime("1929-05-04", 24)).toBeNull();
    expect(readTime("soon", 24)).toBeNull();
  });

  it("names what is wrong with a time, and asks for the rest once the reader leaves", () => {
    expect(timeNote("", 24, true)).toBeNull();
    expect(timeNote("03", 24, false)).toBeNull();
    expect(timeNote("03", 24, true)).toBe(`Type the full time as ${nb("HH : MM")}.`);
    expect(timeNote("2500", 24, false)).toBe("There's no 25:00. Check the hour.");
    expect(timeNote("2500", 12, false)).toBe("There's no 25:00. Check the hour.");
    expect(timeNote("0375", 24, false)).toBe("There's no 03:75. Check the minutes.");
    expect(timeNote("0300", 12, false)).toBeNull();
  });
});

describe("the half of the day on a 12-hour clock (MB-173)", () => {
  const key = (shown: string, typed: string) => ({ shown, text: shown + typed, caret: (shown + typed).length, inputType: "insertText" });

  it("holds a whole time back from moving on until its half is set, and lets it go once an A or P is typed", () => {
    expect(stepTime({ digits: "030", half: "am" }, key("03 : 0", "0"), 12)).toMatchObject({ value: "03:00", halfSet: false, done: false });
    expect(stepTime({ digits: "0300", half: "am" }, key("03 : 00", "p"), 12)).toMatchObject({ value: "15:00", halfSet: true, done: true });
    expect(stepTime({ digits: "030", half: "pm", halfSet: true }, key("03 : 0", "0"), 12)).toMatchObject({ value: "15:00", done: true });
  });

  it("takes an hour only one half has, 13 to 23 or 00, as the half set", () => {
    expect(stepTime({ digits: "1", half: "am" }, key("1", "5"), 12)).toMatchObject({ digits: "03", half: "pm", halfSet: true, done: false });
    expect(stepTime({ digits: "0", half: "am" }, key("0", "0"), 12)).toMatchObject({ digits: "12", half: "am", halfSet: true });
    expect(stepTime({ digits: "1", half: "am" }, key("1", "2"), 12)).toMatchObject({ digits: "12", halfSet: false });
  });

  it("moves on at the fourth digit on the 24-hour clock, as before", () => {
    expect(stepTime({ digits: "030", half: "am" }, key("03 : 0", "0"), 24)).toMatchObject({ value: "03:00", done: true });
  });

  it("calls a tap on the switch done once the time is whole, on the half it already shows too, and only the first time", () => {
    expect(pickHalf({ digits: "0300", half: "am" }, "am", 12)).toMatchObject({ half: "am", halfSet: true, value: "03:00", done: true });
    expect(pickHalf({ digits: "0300", half: "am" }, "pm", 12)).toMatchObject({ half: "pm", halfSet: true, value: "15:00", done: true });
    expect(pickHalf({ digits: "0300", half: "pm", halfSet: true }, "am", 12)).toMatchObject({ value: "03:00", done: false });
    expect(pickHalf({ digits: "03", half: "am" }, "pm", 12)).toMatchObject({ halfSet: true, value: "", done: false });
  });
});

describe("today", () => {
  it("is the device's own date", () => {
    expect(localDay(new Date(2026, 9, 2, 23, 59))).toBe("2026-10-02");
    expect(localDay(new Date(1929, 4, 4))).toBe("1929-05-04");
  });
});

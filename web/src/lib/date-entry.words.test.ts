/**
 * A date pasted in words at its edges (R15-07, MB-185): the shortest month a
 * word may name, May as a word beside another month, the year's four digits,
 * the day's bounds, and what the field and the line under it do with each.
 */
import { describe, expect, it } from "vitest";
import { dateNote, dateValue, readDate, stepDate, type DateOrder } from "./date-entry";

const ORDERS: DateOrder[] = ["dmy", "mdy", "ymd"];
const TODAY = "2026-10-03";
const paste = (clip: string, order: DateOrder = "dmy", range = {}) =>
  stepDate("", { shown: "", text: clip, caret: clip.length, inputType: "insertFromPaste" }, order, range);

describe("which words name a month", () => {
  it("takes three letters or more of the English name, in any case, and each month from its own three", () => {
    const short = ["jan", "FEB", "Mar", "aPr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    short.forEach((word, i) => {
      expect(readDate(`4 ${word} 1929`, "dmy"), word).toBe(`04${String(i + 1).padStart(2, "0")}1929`);
    });
    expect(readDate("4 Augus 1929", "dmy")).toBe("04081929");
    expect(readDate("4 Novemb. 1929", "dmy")).toBe("04111929");
  });

  it("refuses two letters, a word longer than the month, and the months other languages write", () => {
    for (const clip of ["4 Ju 1929", "4 De 1929", "4 Junee 1929", "4 Mays 1929", "4 Juni 1929", "4 Okt 1929", "4 Dez 1929", "4 Avr 1929", "4 Mär 1929"]) {
      expect(readDate(clip, "dmy"), clip).toBeNull();
      expect(paste(clip), clip).toMatchObject({ digits: "", refused: true });
    }
  });

  it("passes over every weekday, short or whole, since none starts like a month", () => {
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Monday", "Thursday", "Sunday"]) {
      expect(readDate(`${day} 4 May 1929`, "dmy"), day).toBe("04051929");
      expect(readDate(`${day}, May 4, 1929`, "mdy"), day).toBe("05041929");
    }
  });
});

describe("May as a word beside a month", () => {
  it("a sentence with may and another month names two months, so nothing is guessed: refused, the field kept", () => {
    expect(readDate("you may type 4 June 1929", "dmy")).toBeNull();
    expect(paste("you may type 4 June 1929")).toMatchObject({ digits: "", value: "", refused: true, done: false });
    expect(readDate("4 May 1929, or May 5", "dmy")).toBeNull();
  });

  it("may alone with a date in numbers falls back to the numbers in the field's order", () => {
    expect(readDate("may be 4/5/1929", "mdy")).toBe("04051929");
    expect(readDate("may be 1929-05-04", "ymd")).toBe("19290504");
  });
});

describe("the year and the day in words", () => {
  it("takes any four-digit year and nothing shorter or longer, so a century is never guessed", () => {
    expect(readDate("4 May 0999", "dmy")).toBe("04050999");
    expect(readDate("4 May 2026", "ymd")).toBe("20260504");
    for (const clip of ["4 May 929", "4 May 19290", "May 4, '29", "4 May"]) {
      expect(readDate(clip, "dmy"), clip).toBeNull();
      expect(paste(clip).refused, clip).toBe(true);
    }
  });

  it("takes a one- or two-digit day, and refuses three", () => {
    expect(readDate("09 May 1929", "dmy")).toBe("09051929");
    expect(readDate("9 May 1929", "mdy")).toBe("05091929");
    expect(readDate("009 May 1929", "dmy")).toBeNull();
  });

  it("hands day 0 and day 32 on as digits that make no date, and the line names the day", () => {
    for (const [clip, day] of [["0 May 1929", "00"], ["32 May 1929", "32"]] as const) {
      const step = paste(clip);
      expect(step, clip).toMatchObject({ value: "", done: false, refused: false });
      expect(dateNote(step.digits, "dmy", { today: TODAY, left: true }), clip).toEqual({ kind: "problem", text: `There's no day ${day}. Check the day.` });
    }
  });

  it("reads 29 February only in a leap year, 1900 not being one and 2000 being one", () => {
    expect(paste("29 Feb 2000")).toMatchObject({ value: "2000-02-29", done: true });
    expect(paste("February 29, 2024", "mdy")).toMatchObject({ value: "2024-02-29", done: true });
    const step = paste("29 Feb 1900");
    expect(step).toMatchObject({ value: "", done: false });
    expect(dateNote(step.digits, "dmy", { today: TODAY, left: true })).toEqual({ kind: "problem", text: "There's no 29 February in 1900. Check the day." });
    expect(dateNote(paste("31 April 1990").digits, "dmy", { today: TODAY, left: true })).toEqual({ kind: "problem", text: "There's no 31 April. Check the day." });
  });

  it("a date in words outside the form's range is read, sends no value, and the line gives the range", () => {
    const range = { min: "1900-01-01", max: TODAY };
    for (const order of ORDERS) {
      const step = paste("4 May 1899", order, range);
      expect(step, order).toMatchObject({ value: "", done: false, refused: false });
      expect(dateNote(step.digits, order, { range, today: TODAY, left: true }), order).toEqual({ kind: "problem", text: "Enter a birth date from 1900 to today." });
    }
    expect(paste("3 October 2026", "dmy", range)).toMatchObject({ value: "2026-10-03", done: true });
    expect(dateValue(paste("4 October 2026", "dmy", range).digits, "dmy", range)).toBe("");
  });
});

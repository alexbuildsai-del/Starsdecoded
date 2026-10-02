/**
 * The date field's keystrokes. Web tests render no components (MB-47), so the
 * browser's part is played by plain string edits and the field's by the same
 * calls BirthDateField makes on each change: stepDate, then onChange when the
 * value moves and onComplete when the step says the date is done.
 */
import { describe, expect, it } from "vitest";
import { dateDigits, dateNote, datePattern, dateText, stepDate, type DateOrder, type DateRange } from "@/lib/date-entry";

const TODAY = "2026-10-02";
// A pattern inside a sentence is bound by no-break spaces, so it never splits across lines.
const nb = (pattern: string) => pattern.replace(/ /g, "\u00a0");

class DateField {
  digits: string;
  text: string;
  caret: number;
  value: string;
  sent: string[] = [];
  completed = 0;
  left = false;
  shown: string[] = [];

  constructor(readonly order: DateOrder = "dmy", readonly range: DateRange = {}, value = "") {
    this.value = value;
    this.digits = dateDigits(value, order);
    this.text = dateText(this.digits, order);
    this.caret = this.text.length;
  }

  private edit(text: string, caret: number, inputType: string) {
    const step = stepDate(this.digits, { shown: this.text, text, caret, inputType }, this.order, this.range);
    this.digits = step.digits;
    this.text = step.text;
    this.caret = step.caret;
    this.left = false;
    this.shown.push(step.text);
    if (step.value !== this.value) {
      this.value = step.value;
      this.sent.push(step.value);
    }
    if (step.done) this.completed++;
    return this;
  }

  type(keys: string) {
    for (const key of keys) this.edit(this.text.slice(0, this.caret) + key + this.text.slice(this.caret), this.caret + 1, "insertText");
    return this;
  }

  backspace(times = 1) {
    for (let i = 0; i < times; i++) {
      if (this.caret > 0) this.edit(this.text.slice(0, this.caret - 1) + this.text.slice(this.caret), this.caret - 1, "deleteContentBackward");
    }
    return this;
  }

  del() {
    return this.edit(this.text.slice(0, this.caret) + this.text.slice(this.caret + 1), this.caret, "deleteContentForward");
  }

  /** Replaces the selection from start to end, as a paste or a key over a selection does. */
  replace(start: number, end: number, insert: string, inputType = "insertFromPaste") {
    return this.edit(this.text.slice(0, start) + insert + this.text.slice(end), start + insert.length, inputType);
  }

  paste(clip: string) {
    return this.replace(this.caret, this.caret, clip);
  }

  at(caret: number) {
    this.caret = caret;
    return this;
  }

  leave() {
    this.left = true;
    return this;
  }

  get note() {
    return dateNote(this.digits, this.order, { range: this.range, today: TODAY, left: this.left });
  }
}

describe("typing a date straight through", () => {
  it("fills the separators in as the digits go in, and sends the date once, when it is whole", () => {
    const field = new DateField("dmy").type("04051929");
    expect(field.shown).toEqual([
      "0", "04 / ", "04 / 0", "04 / 05 / ", "04 / 05 / 1", "04 / 05 / 19", "04 / 05 / 192", "04 / 05 / 1929",
    ]);
    expect(field.caret).toBe(field.text.length);
    expect(field.sent).toEqual(["1929-05-04"]);
    expect(field.completed).toBe(1);
    expect(field.note).toEqual({ kind: "readout", text: "4 May 1929" });
  });

  it("takes the digits in the reader's order and sends the same value", () => {
    expect(new DateField("mdy").type("05041929")).toMatchObject({ text: "05 / 04 / 1929", sent: ["1929-05-04"], completed: 1 });
    expect(new DateField("ymd").type("19290504")).toMatchObject({ text: "1929 / 05 / 04", sent: ["1929-05-04"], completed: 1 });
  });

  it("shows the order in the placeholder", () => {
    expect(datePattern("dmy")).toBe("DD / MM / YYYY");
    expect(datePattern("mdy")).toBe("MM / DD / YYYY");
    expect(datePattern("ymd")).toBe("YYYY / MM / DD");
  });

  it("fills a part out with a 0 when a separator follows its one digit, so 4/5/1929 types too", () => {
    const field = new DateField("dmy").type("4/5/1929");
    expect(field.text).toBe("04 / 05 / 1929");
    expect(field.sent).toEqual(["1929-05-04"]);
    expect(new DateField("dmy").type("4.").text).toBe("04 / ");
    expect(new DateField("dmy").type("04/").text).toBe("04 / ");
    expect(new DateField("dmy").type("04051/").text).toBe("04 / 05 / 1");
  });

  it("ignores a letter", () => {
    expect(new DateField("dmy").type("04x05").text).toBe("04 / 05 / ");
  });

  it("stops at eight digits", () => {
    const field = new DateField("dmy").type("040519299");
    expect(field.text).toBe("04 / 05 / 1929");
    expect(field.completed).toBe(1);
  });

  it("reads digits from a full-width keypad", () => {
    expect(new DateField("dmy").type("０４０５１９２９").sent).toEqual(["1929-05-04"]);
  });
});

describe("Backspace", () => {
  it("walks back over a separator, taking the digit before it", () => {
    const field = new DateField("dmy").type("04");
    expect(field.text).toBe("04 / ");
    field.backspace();
    expect(field.text).toBe("0");
    expect(field.caret).toBe(1);
    expect(new DateField("dmy").type("0405").backspace().text).toBe("04 / 0");
  });

  it("takes the date back out of the form as soon as it is no longer whole", () => {
    const field = new DateField("dmy").type("04051929").backspace();
    expect(field.text).toBe("04 / 05 / 192");
    expect(field.sent).toEqual(["1929-05-04", ""]);
    field.type("9");
    expect(field.sent).toEqual(["1929-05-04", "", "1929-05-04"]);
    expect(field.completed).toBe(2);
  });

  it("empties the field one digit at a time", () => {
    expect(new DateField("dmy").type("04051929").backspace(8).text).toBe("");
  });

  it("and Delete takes the digit after a separator", () => {
    expect(new DateField("dmy").type("04051929").at(2).del().text).toBe("04 / 51 / 929");
  });
});

describe("pasting", () => {
  it("fills the field from ISO in any order", () => {
    for (const order of ["dmy", "mdy", "ymd"] as const) {
      const field = new DateField(order).paste("1929-05-04");
      expect(field.sent).toEqual(["1929-05-04"]);
      expect(field.completed).toBe(1);
    }
  });

  it("fills the field from a date in its own order", () => {
    expect(new DateField("dmy").paste("4/5/1929").text).toBe("04 / 05 / 1929");
    expect(new DateField("mdy").paste("5/4/1929").sent).toEqual(["1929-05-04"]);
    expect(new DateField("ymd").paste("1929/5/4").sent).toEqual(["1929-05-04"]);
  });

  it("replaces what the field held", () => {
    const field = new DateField("dmy").type("1203").paste("1929-05-04");
    expect(field.text).toBe("04 / 05 / 1929");
    expect(field.sent).toEqual(["1929-05-04"]);
  });

  it("keeps a two-digit year short and sends nothing", () => {
    const field = new DateField("dmy").paste("4/5/29");
    expect(field.text).toBe("04 / 05 / 29");
    expect(field.sent).toEqual([]);
    expect(field.leave().note).toEqual({ kind: "problem", text: `Type the full date as ${nb("DD / MM / YYYY")}.` });
  });

  it("takes the digits of anything else as typed", () => {
    expect(new DateField("dmy").paste("0405").text).toBe("04 / 05 / ");
  });
});

describe("an impossible date never reaches the form", () => {
  it.each([
    ["31041990", "There's no 31 April. Check the day."],
    ["29021929", "There's no 29 February in 1929. Check the day."],
    ["01131990", `There's no month 13. Type the date as ${nb("DD / MM / YYYY")}.`],
    ["00051990", "There's no day 00. Check the day."],
  ])("%s", (typed, problem) => {
    const field = new DateField("dmy").type(typed);
    expect(field.sent).toEqual([]);
    expect(field.completed).toBe(0);
    expect(field.note).toEqual({ kind: "problem", text: problem });
  });

  it("nor does one outside the form's range, which says the range", () => {
    const field = new DateField("dmy", { min: "1900-01-01", max: TODAY }).type("31121899");
    expect(field.sent).toEqual([]);
    expect(field.completed).toBe(0);
    expect(field.note?.text).toBe("Enter a birth date from 1900 to today.");
  });

  it("a US order typed day first says which order the field reads", () => {
    expect(new DateField("mdy").type("25121990").note?.text).toBe(`There's no month 25. Type the date as ${nb("MM / DD / YYYY")}.`);
  });
});

describe("fixing a whole date", () => {
  it("types over the digit at the caret and stays put, so focus does not jump", () => {
    const field = new DateField("dmy").type("04051929").at(6).type("6");
    expect(field.text).toBe("04 / 06 / 1929");
    expect(field.sent).toEqual(["1929-05-04", "1929-06-04"]);
    expect(field.completed).toBe(1);
    expect(field.caret).toBe("04 / 06 / ".length);
  });

  it("replaces a selected part", () => {
    const field = new DateField("dmy").type("04051929").replace(5, 7, "1", "insertText").type("1");
    expect(field.text).toBe("04 / 11 / 1929");
    expect(field.value).toBe("1929-11-04");
  });
});

describe("the line under the field", () => {
  it("shows the order while the digits go in, and asks for the rest only once the reader leaves", () => {
    const field = new DateField("mdy").type("0504");
    expect(field.note).toEqual({ kind: "order", text: "MM / DD / YYYY" });
    expect(field.leave().note).toEqual({ kind: "problem", text: `Type the full date as ${nb("MM / DD / YYYY")}.` });
    field.type("1");
    expect(field.note?.kind).toBe("order");
  });

  it("is empty while the field is", () => {
    expect(new DateField("dmy").leave().note).toBeNull();
  });
});

describe("a date the form already has", () => {
  it("shows in the reader's order and spells out", () => {
    const field = new DateField("mdy", {}, "1929-05-04");
    expect(field.text).toBe("05 / 04 / 1929");
    expect(field.note).toEqual({ kind: "readout", text: "4 May 1929" });
  });
});

/**
 * The time field's keystrokes and its AM/PM switch. Web tests render no
 * components (MB-47), so the browser's part is played by plain string edits
 * and the field's by the same calls BirthTimeField makes: stepTime on each
 * change, timeValue when the switch is tapped, onChange when the value moves
 * and onComplete when the step says the time is done.
 */
import { describe, expect, it } from "vitest";
import { stepTime, timeNote, timeState, timeText, timeValue, type Clock, type Half } from "@/lib/date-entry";

// A pattern inside a sentence is bound by no-break spaces, so it never splits across lines.
const nb = (pattern: string) => pattern.replace(/ /g, "\u00a0");

class TimeField {
  digits: string;
  half: Half;
  text: string;
  caret: number;
  value: string;
  sent: string[] = [];
  completed = 0;
  left = false;
  shown: string[] = [];

  constructor(readonly clock: Clock = 24, value = "") {
    this.value = value;
    ({ digits: this.digits, half: this.half } = timeState(value, clock));
    this.text = timeText(this.digits);
    this.caret = this.text.length;
  }

  private send(value: string) {
    if (value === this.value) return;
    this.value = value;
    this.sent.push(value);
  }

  private edit(text: string, caret: number, inputType: string) {
    const step = stepTime({ digits: this.digits, half: this.half }, { shown: this.text, text, caret, inputType }, this.clock);
    ({ digits: this.digits, half: this.half, text: this.text, caret: this.caret } = step);
    this.left = false;
    this.shown.push(step.text);
    this.send(step.value);
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

  paste(clip: string) {
    return this.edit(this.text.slice(0, this.caret) + clip + this.text.slice(this.caret), this.caret + clip.length, "insertFromPaste");
  }

  /** A tap on the switch. */
  pick(half: Half) {
    this.half = half;
    this.send(timeValue({ digits: this.digits, half }, this.clock));
    return this;
  }

  leave() {
    this.left = true;
    return this;
  }

  get note() {
    return timeNote(this.digits, this.clock, this.left);
  }
}

describe("typing a time straight through", () => {
  it("reads 0300 as 03 : 00 as it goes in, and sends 03:00 once, when it is whole", () => {
    const field = new TimeField(24).type("0300");
    expect(field.shown).toEqual(["0", "03 : ", "03 : 0", "03 : 00"]);
    expect(field.sent).toEqual(["03:00"]);
    expect(field.completed).toBe(1);
  });

  it("takes a first digit from 3 to 9 as the whole hour", () => {
    expect(new TimeField(24).type("3").text).toBe("03 : ");
    expect(new TimeField(24).type("330")).toMatchObject({ text: "03 : 30", sent: ["03:30"], completed: 1 });
    expect(new TimeField(24).type("2").text).toBe("2");
    expect(new TimeField(24).type("23").text).toBe("23 : ");
  });

  it("fills the hour out with a 0 when a separator follows its one digit", () => {
    expect(new TimeField(24).type("1:").text).toBe("01 : ");
    expect(new TimeField(24).type("1.").text).toBe("01 : ");
    expect(new TimeField(24).type("1h30")).toMatchObject({ text: "01 : 30", sent: ["01:30"] });
  });

  it("walks back over the separator with Backspace", () => {
    const field = new TimeField(24).type("03").backspace();
    expect(field.text).toBe("0");
    expect(field.caret).toBe(1);
  });

  it("takes the time back out of the form as soon as it is no longer whole", () => {
    expect(new TimeField(24).type("0300").backspace().sent).toEqual(["03:00", ""]);
  });

  it("ignores a letter on the 24-hour clock, so a stray key never moves the time by twelve hours", () => {
    expect(new TimeField(24).type("0300p")).toMatchObject({ text: "03 : 00", sent: ["03:00"] });
  });

  it("sends nothing for a time that is not one, and says why", () => {
    const late = new TimeField(24).type("2500");
    expect(late.sent).toEqual([]);
    expect(late.completed).toBe(0);
    expect(late.note).toBe("There's no 25:00. Check the hour.");
    expect(new TimeField(24).type("0375").note).toBe("There's no 03:75. Check the minutes.");
  });

  it("asks for the rest only once the reader leaves", () => {
    const field = new TimeField(24).type("03");
    expect(field.note).toBeNull();
    expect(field.leave().note).toBe(`Type the full time as ${nb("HH : MM")}.`);
  });
});

describe("on a 12-hour clock", () => {
  it("starts the switch on AM and sends the 24-hour time", () => {
    const field = new TimeField(12).type("0300");
    expect(field).toMatchObject({ text: "03 : 00", half: "am", sent: ["03:00"], completed: 1 });
  });

  it("sets the switch from an A or P typed in the field, without moving on", () => {
    const field = new TimeField(12).type("0300").type("p");
    expect(field).toMatchObject({ text: "03 : 00", half: "pm", sent: ["03:00", "15:00"], completed: 1 });
    field.type("A");
    expect(field).toMatchObject({ half: "am", sent: ["03:00", "15:00", "03:00"] });
    expect(new TimeField(12).type("p0300")).toMatchObject({ half: "pm", sent: ["15:00"], completed: 1 });
  });

  it("sets it from a tap, without moving on", () => {
    const field = new TimeField(12).type("0300").pick("pm");
    expect(field).toMatchObject({ value: "15:00", completed: 1 });
    expect(field.pick("am").value).toBe("03:00");
  });

  it("reads an hour from 13 to 23 as that 24-hour time and sets PM (reading 9)", () => {
    const field = new TimeField(12).type("1530");
    expect(field.shown).toEqual(["1", "03 : ", "03 : 3", "03 : 30"]);
    expect(field).toMatchObject({ half: "pm", sent: ["15:30"], completed: 1 });
  });

  it("reads 00 as 12 AM", () => {
    const field = new TimeField(12).pick("pm").type("0030");
    expect(field).toMatchObject({ text: "12 : 30", half: "am", sent: ["00:30"] });
  });

  it("takes 12 with the switch as it stands: midnight on AM, noon on PM", () => {
    expect(new TimeField(12).type("1200").value).toBe("00:00");
    expect(new TimeField(12).pick("pm").type("1200").value).toBe("12:00");
  });

  it("shows a time the form already has on the 12-hour clock", () => {
    const field = new TimeField(12, "15:30");
    expect(field).toMatchObject({ text: "03 : 30", half: "pm" });
  });
});

describe("pasting a time", () => {
  it("reads it whole, its am or pm included, on either clock", () => {
    expect(new TimeField(24).paste("15:30")).toMatchObject({ text: "15 : 30", sent: ["15:30"], completed: 1 });
    expect(new TimeField(24).paste("3:30 pm").sent).toEqual(["15:30"]);
    expect(new TimeField(12).paste("3:30 pm")).toMatchObject({ text: "03 : 30", half: "pm", sent: ["15:30"] });
    expect(new TimeField(12).paste("15:30")).toMatchObject({ text: "03 : 30", half: "pm", sent: ["15:30"] });
    expect(new TimeField(24).paste("0330").sent).toEqual(["03:30"]);
  });

  it("replaces what the field held", () => {
    expect(new TimeField(24).type("12").paste("03:00")).toMatchObject({ text: "03 : 00", sent: ["03:00"] });
  });
});

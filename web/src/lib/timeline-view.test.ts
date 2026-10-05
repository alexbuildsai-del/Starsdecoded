/**
 * Timeline's shared words and dates (R16-07): every date prints in the
 * reader's language order with no clock time (reading 4), a date drops its
 * year only where it can't be mistaken, and the contact card's lines are built
 * from computed dates alone. The days are Mira's snapshot week of 5 October
 * 2026 (timeline-page §2), Saturn's three passes over her Ascendant among them.
 */
import { describe, expect, it } from "vitest";
import {
  READ_LINE,
  TONE_ORDER,
  contactView,
  dateList,
  dayIn,
  dayLabel,
  dayMonth,
  dayNumber,
  dayTones,
  factsLine,
  fullDate,
  lastsLine,
  listOf,
  longDay,
  mixLabel,
  mixOf,
  monthYear,
  nearDate,
  readLabel,
  toneClass,
  weekdayOf,
} from "./timeline-view";

// What a reader sees: a date never breaks inside, so the tests read it back with plain spaces.
const seen = (text: string) => text.replace(/\u00a0/g, " ");
const TODAY = "2026-10-05";

describe("a date in the reader's order", () => {
  it("puts the day, month and year where the reader's language does, with the site's month names", () => {
    expect(seen(dayMonth("2026-10-19", "dmy"))).toBe("19 Oct");
    expect(seen(dayMonth("2026-10-19", "mdy"))).toBe("Oct 19");
    expect(seen(dayMonth("2026-10-19", "ymd"))).toBe("Oct 19");
    expect(seen(fullDate("2026-10-19", "dmy"))).toBe("19 Oct 2026");
    expect(seen(fullDate("2026-10-19", "mdy"))).toBe("Oct 19, 2026");
    expect(seen(fullDate("2026-10-19", "ymd"))).toBe("2026 Oct 19");
    expect(seen(monthYear("2021-01-19", "dmy"))).toBe("January 2021");
    expect(seen(monthYear("2021-01-19", "mdy"))).toBe("January 2021");
    expect(seen(monthYear("2021-01-19", "ymd"))).toBe("2021 January");
  });

  it("never breaks a date across two lines", () => {
    expect(fullDate("2026-10-19", "dmy")).not.toContain(" ");
    expect(fullDate("2026-10-19", "mdy")).not.toContain(" ");
    expect(dayMonth("2026-10-19", "dmy")).not.toContain(" ");
  });

  it("prints no clock time, and hands back anything that isn't a day as it came", () => {
    for (const order of ["dmy", "mdy", "ymd"] as const) expect(fullDate("2026-10-19", order)).not.toMatch(/\d:\d/);
    expect(fullDate("2026-10-19T12:00:00Z", "dmy")).toBe("2026-10-19T12:00:00Z");
    expect(dayMonth("2026-13-01", "dmy")).toBe("2026-13-01");
  });

  it("drops the year in this calendar year or under six months ahead, and keeps it otherwise", () => {
    expect(seen(nearDate("2026-05-30", TODAY, "dmy"))).toBe("30 May");
    expect(seen(nearDate("2026-12-31", TODAY, "dmy"))).toBe("31 Dec");
    expect(seen(nearDate("2027-03-09", TODAY, "dmy"))).toBe("9 Mar");
    expect(seen(nearDate("2027-04-01", TODAY, "dmy"))).toBe("1 Apr 2027");
    expect(seen(nearDate("2025-12-20", TODAY, "dmy"))).toBe("20 Dec 2025");
    expect(seen(nearDate("2027-04-01", TODAY, "mdy"))).toBe("Apr 1, 2027");
  });

  it("lists days the way a person would say them", () => {
    expect(listOf([])).toBe("");
    expect(listOf(["a"])).toBe("a");
    expect(listOf(["a", "b"])).toBe("a and b");
    expect(listOf(["a", "b", "c"])).toBe("a, b and c");
    expect(seen(dateList(["2026-05-30", "2026-09-23", "2027-02-20"], TODAY, "dmy"))).toBe("30 May, 23 Sep and 20 Feb");
    expect(seen(dateList(["2026-05-30", "2026-09-23", "2027-02-20"], TODAY, "mdy"))).toBe("May 30, Sep 23 and Feb 20");
  });

  it("gives every date in a list its year once one of them needs it, so no year is left to guess", () => {
    const neptune = ["2026-05-27", "2026-08-18", "2027-03-21", "2027-11-25", "2028-01-04"];
    expect(seen(dateList(neptune, TODAY, "dmy"))).toBe("27 May 2026, 18 Aug 2026, 21 Mar 2027, 25 Nov 2027 and 4 Jan 2028");
    expect(seen(dateList(neptune, TODAY, "mdy"))).toBe("May 27, 2026, Aug 18, 2026, Mar 21, 2027, Nov 25, 2027 and Jan 4, 2028");
    expect(seen(dateList(neptune, TODAY, "ymd"))).toBe("2026 May 27, 2026 Aug 18, 2027 Mar 21, 2027 Nov 25 and 2028 Jan 4");
    expect(seen(factsLine({ sky: "Neptune trine to your Jupiter", house: "5th house" }, neptune, TODAY, "dmy"))).toBe(
      "Neptune trine to your Jupiter · 5th house · exact 27 May 2026, 18 Aug 2026, 21 Mar 2027, 25 Nov 2027 and 4 Jan 2028",
    );
    const pluto = ["2025-04-15", "2025-05-24", "2026-02-02", "2026-08-20", "2026-12-08"];
    expect(seen(dateList(pluto, TODAY, "dmy"))).toBe("15 Apr 2025, 24 May 2025, 2 Feb 2026, 20 Aug 2026 and 8 Dec 2026");
  });

  it("names a day in full for a screen reader, and heads a day cell with three letters and the date", () => {
    expect(longDay(TODAY, "dmy")).toBe("Monday 5 October");
    expect(longDay(TODAY, "mdy")).toBe("Monday, October 5");
    expect(longDay(TODAY, "ymd")).toBe("Monday, October 5");
    expect(["2026-10-05", "2026-10-06", "2026-10-11"].map(weekdayOf)).toEqual(["Mon", "Tue", "Sun"]);
    expect(dayNumber("2026-10-05")).toBe("5");
  });

  it("reads an instant as the reader's own day in their zone, and as UTC when the zone is unknown", () => {
    expect(dayIn("2026-10-05T23:30:00Z", "Europe/Lisbon")).toBe("2026-10-06");
    expect(dayIn("2026-10-05T23:30:00Z", "America/New_York")).toBe("2026-10-05");
    expect(dayIn(new Date("2026-10-05T23:30:00Z"), "Asia/Tokyo")).toBe("2026-10-06");
    expect(dayIn("2026-10-05T23:30:00Z", "Not/AZone")).toBe("2026-10-05");
  });
});

describe("the contact card's lines", () => {
  it("says how long a contact lasts, and when it comes back, by the month while that can't be misread", () => {
    expect(seen(lastsLine({ end: "2026-10-19" }, TODAY, "dmy"))).toBe("Until 19 Oct");
    expect(seen(lastsLine({ end: "2026-10-19", back: "2027-02-01" }, TODAY, "dmy"))).toBe("Until 19 Oct, back in February");
    expect(seen(lastsLine({ end: "2026-10-19", back: "2027-02-01" }, TODAY, "mdy"))).toBe("Until Oct 19, back in February");
    expect(seen(lastsLine({ end: "2026-10-19", back: "2027-10-02" }, TODAY, "dmy"))).toBe("Until 19 Oct, back in October 2027");
    expect(seen(lastsLine({ end: "2028-01-15" }, TODAY, "dmy"))).toBe("Until 15 Jan 2028");
    expect(lastsLine({ end: TODAY, back: null }, TODAY, "dmy")).toBe("Eases today");
  });

  it("puts the astronomy last: the contact, its house, the orb if sent, and the exact passes", () => {
    const facts = { sky: "Saturn on your Ascendant", house: "1st house" };
    expect(seen(factsLine(facts, ["2026-09-23"], TODAY, "dmy"))).toBe("Saturn on your Ascendant · 1st house · exact 23 Sep");
    expect(seen(factsLine(facts, ["2026-05-30", "2026-09-23", "2027-02-20"], TODAY, "mdy", 0.4))).toBe(
      "Saturn on your Ascendant · 1st house · orb 0.40° · exact May 30, Sep 23 and Feb 20",
    );
    expect(factsLine({ sky: "Pluto on your Saturn", house: null }, [], TODAY, "dmy")).toBe("Pluto on your Saturn · never exact");
  });

  it("builds a whole card from computed dates, with no everyday line until a reading writes one", () => {
    const view = contactView(
      {
        key: "contact.saturn.conjunction.ascendant.20260530",
        tone: "intense",
        headline: "Taking yourself more seriously",
        end: "2026-10-19",
        back: "2027-02-01",
        exact: ["2026-09-23"],
        facts: { sky: "Saturn on your Ascendant", house: "1st house" },
      },
      TODAY,
      "dmy",
    );
    expect({ ...view, lasts: seen(view.lasts), facts: seen(view.facts) }).toEqual({
      key: "contact.saturn.conjunction.ascendant.20260530",
      tone: "intense",
      headline: "Taking yourself more seriously",
      line: null,
      lasts: "Until 19 Oct, back in February",
      facts: "Saturn on your Ascendant · 1st house · exact 23 Sep",
    });
  });

  it("names each open button by its card", () => {
    expect(READ_LINE).toBe("Read what this means for you");
    expect(readLabel("Taking yourself more seriously")).toBe("Taking yourself more seriously: read what this means for you");
    expect(readLabel("Saturn return").toLowerCase()).toContain(READ_LINE.toLowerCase());
  });
});

describe("tones", () => {
  it("lists intense first and colours through index.css's classes", () => {
    expect(TONE_ORDER).toEqual(["intense", "mixed", "easy"]);
    expect(TONE_ORDER.map(toneClass)).toEqual(["sd-tone-intense", "sd-tone-mixed", "sd-tone-easy"]);
  });

  it("counts the day's mix, intense first, and says it in words", () => {
    expect(mixOf(["easy", "intense", "intense"])).toEqual([
      { tone: "intense", count: 2 },
      { tone: "easy", count: 1 },
    ]);
    expect(mixLabel(["easy", "intense", "intense"])).toBe("2 intense and 1 easy");
    expect(mixLabel(["mixed", "easy", "intense"])).toBe("1 intense, 1 mixed and 1 easy");
    expect(mixOf([])).toEqual([]);
    expect(mixLabel([])).toBe("A quiet day");
  });

  it("gives a day one dot per tone, and tells a screen reader the day and its tones", () => {
    expect(dayTones(["easy", "intense", "easy", "intense"])).toEqual(["intense", "easy"]);
    expect(dayLabel({ date: TODAY, tones: ["easy", "intense", "easy"] }, "dmy")).toBe("Monday 5 October: intense and easy");
    expect(dayLabel({ date: "2026-10-06", tones: [] }, "mdy")).toBe("Tuesday, October 6: quiet");
  });
});

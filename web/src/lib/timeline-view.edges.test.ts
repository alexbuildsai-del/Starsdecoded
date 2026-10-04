/**
 * Timeline's shared words and dates at their edges (R16-07, reading 4): every date in each language order across a
 * year, the six-month line where the year is dropped, the month a return is named by, a reader's day across zones that
 * sit on the date line, a half hour off UTC or change their clocks, and anything that is not a day handed back as it
 * came. `timeline-view.test.ts` holds the lines to Mira's snapshot week.
 */
import { describe, expect, it } from "vitest";
import {
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
  TONE_ORDER,
  TONE_WORDS,
} from "./timeline-view";
import type { DateOrder } from "./date-entry";

const seen = (text: string) => text.replace(/\u00a0/g, " ");
const ORDERS: DateOrder[] = ["dmy", "mdy", "ymd"];
const TODAY = "2026-10-05";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

describe("a date in each order, over the whole year", () => {
  it("names every month and keeps the day, in each order, for the first and last day of each", () => {
    const lastDay = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 9, lastDay[m - 1]]) {
        const day = `2027-${pad(m)}-${pad(d)}`;
        expect(seen(dayMonth(day, "dmy")), day).toBe(`${d} ${MONTHS[m - 1]}`);
        expect(seen(dayMonth(day, "mdy")), day).toBe(`${MONTHS[m - 1]} ${d}`);
        expect(seen(fullDate(day, "dmy")), day).toBe(`${d} ${MONTHS[m - 1]} 2027`);
        expect(seen(fullDate(day, "mdy")), day).toBe(`${MONTHS[m - 1]} ${d}, 2027`);
        expect(seen(fullDate(day, "ymd")), day).toBe(`2027 ${MONTHS[m - 1]} ${d}`);
        expect(seen(monthYear(day, "dmy")), day).toBe(`${LONG[m - 1]} 2027`);
        expect(seen(monthYear(day, "ymd")), day).toBe(`2027 ${LONG[m - 1]}`);
      }
    }
  });

  it("writes the day without a leading nought and never prints a clock time, a zone or a numeric month", () => {
    for (const order of ORDERS) {
      for (const text of [dayMonth("2026-03-07", order), fullDate("2026-03-07", order), monthYear("2026-03-07", order)]) {
        expect(seen(text)).not.toMatch(/\b0\d\b|\d:\d|UTC|GMT|\d\/\d|\d-\d/);
      }
    }
  });

  it("never breaks a date, in any order, across two lines, while a list of dates may break between its dates", () => {
    for (const order of ORDERS) {
      expect(dayMonth("2026-10-19", order)).not.toContain(" ");
      expect(fullDate("2026-10-19", order)).not.toContain(" ");
      expect(monthYear("2026-10-19", order)).not.toContain(" ");
    }
    expect(dateList(["2026-05-30", "2026-09-23"], TODAY, "dmy")).toContain(" and ");
  });

  it("hands back anything that is not a four-digit year, two-digit month and day as it came, in every function", () => {
    for (const bad of ["", "garbage", "2026-1-5", "2026-10-5", "20261005", "2026/10/05", "2026-00-10", "2026-13-10", "2026-10-00", "2026-10-32", "2026-10-05T00:00:00Z", " 2026-10-05", "2026-10-05 ", "26-10-05"]) {
      for (const order of ORDERS) {
        expect(dayMonth(bad, order), bad).toBe(bad);
        expect(fullDate(bad, order), bad).toBe(bad);
        expect(monthYear(bad, order), bad).toBe(bad);
        expect(longDay(bad, order), bad).toBe(bad);
        expect(nearDate(bad, TODAY, order), bad).toBe(bad);
        expect(nearDate(TODAY, bad, order), bad).toBe(TODAY);
      }
      expect(weekdayOf(bad), bad).toBe("");
      expect(dayNumber(bad), bad).toBe(bad);
    }
  });
});

describe("the year is dropped only where it cannot be mistaken", () => {
  it("keeps it for last year and for six months ahead or more, drops it for this year and for under six months ahead", () => {
    const near = (day: string, today: string) => !/\d{4}/.test(seen(nearDate(day, today, "dmy")));
    expect(near("2026-12-31", "2026-01-01")).toBe(true);
    expect(near("2026-01-01", "2026-12-31")).toBe(true);
    expect(near("2026-10-05", "2026-10-05")).toBe(true);
    expect(near("2025-12-31", "2026-01-01")).toBe(false);
    expect(near("2025-10-05", "2026-10-05")).toBe(false);
    expect(near("2027-01-01", "2026-12-31")).toBe(true);
    expect(near("2027-03-31", "2026-10-05")).toBe(true);
    expect(near("2027-04-01", "2026-10-05")).toBe(false);
    expect(near("2027-05-31", "2026-12-15")).toBe(true);
    expect(near("2027-06-01", "2026-12-15")).toBe(false);
    expect(near("2028-01-01", "2026-12-31")).toBe(false);
    expect(near("2029-06-15", "2026-10-05")).toBe(false);
  });

  it("prints a kept year in the reader's order", () => {
    expect(seen(nearDate("2028-02-29", TODAY, "dmy"))).toBe("29 Feb 2028");
    expect(seen(nearDate("2028-02-29", TODAY, "mdy"))).toBe("Feb 29, 2028");
    expect(seen(nearDate("2028-02-29", TODAY, "ymd"))).toBe("2028 Feb 29");
    expect(seen(nearDate("2026-12-24", TODAY, "ymd"))).toBe("Dec 24");
  });

  it("lists nothing, one day or many with 'and' before the last and no comma before it", () => {
    expect(dateList([], TODAY, "dmy")).toBe("");
    expect(seen(dateList(["2026-12-24"], TODAY, "dmy"))).toBe("24 Dec");
    expect(seen(dateList(["2026-12-24", "2027-01-02"], TODAY, "dmy"))).toBe("24 Dec and 2 Jan");
    expect(seen(dateList(["2026-12-24", "2027-01-02", "2028-01-02", "2029-06-01"], TODAY, "dmy"))).toBe("24 Dec, 2 Jan, 2 Jan 2028 and 1 Jun 2029");
    expect(listOf(["a", "b", "c", "d"])).toBe("a, b, c and d");
  });
});

describe("how long it lasts", () => {
  it("names a return by its month while that cannot be read as this month or a year on, else with the year", () => {
    const back = (day: string, order: DateOrder = "dmy") => seen(lastsLine({ end: "2026-10-19", back: day }, TODAY, order));
    expect(back("2026-10-20")).toBe("Until 19 Oct, back in October 2026");
    expect(back("2026-11-01")).toBe("Until 19 Oct, back in November");
    expect(back("2027-08-31")).toBe("Until 19 Oct, back in August");
    expect(back("2027-09-01")).toBe("Until 19 Oct, back in September 2027");
    expect(back("2027-10-02")).toBe("Until 19 Oct, back in October 2027");
    expect(back("2028-01-01")).toBe("Until 19 Oct, back in January 2028");
    expect(back("2027-02-01", "ymd")).toBe("Until Oct 19, back in February");
    expect(back("2027-09-01", "ymd")).toBe("Until Oct 19, back in 2027 September");
    expect(back("2027-09-01", "mdy")).toBe("Until Oct 19, back in September 2027");
  });

  it("says it eases today on its last day or after, with a return still named", () => {
    expect(lastsLine({ end: TODAY }, TODAY, "dmy")).toBe("Eases today");
    expect(lastsLine({ end: "2026-10-04" }, TODAY, "dmy")).toBe("Eases today");
    expect(seen(lastsLine({ end: TODAY, back: "2027-02-01" }, TODAY, "dmy"))).toBe("Eases today, back in February");
    expect(seen(lastsLine({ end: "2026-10-06" }, TODAY, "dmy"))).toBe("Until 6 Oct");
    expect(lastsLine({ end: "2026-10-19", back: null }, TODAY, "dmy")).toBe(lastsLine({ end: "2026-10-19", back: undefined }, TODAY, "dmy"));
    expect(seen(lastsLine({ end: "2026-10-19", back: "" }, TODAY, "dmy"))).toBe("Until 19 Oct");
  });
});

describe("the facts line", () => {
  const facts = { sky: "Saturn on your Ascendant", house: "1st house" };

  it("prints the orb to two places as a positive number, and leaves out one that is missing or not a number", () => {
    expect(factsLine(facts, [], TODAY, "dmy", 0)).toBe("Saturn on your Ascendant · 1st house · orb 0.00° · never exact");
    expect(factsLine(facts, [], TODAY, "dmy", -0.4)).toBe("Saturn on your Ascendant · 1st house · orb 0.40° · never exact");
    expect(factsLine(facts, [], TODAY, "dmy", 1.999)).toBe("Saturn on your Ascendant · 1st house · orb 2.00° · never exact");
    for (const orb of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) expect(factsLine(facts, [], TODAY, "dmy", orb)).toBe("Saturn on your Ascendant · 1st house · never exact");
  });

  it("leaves the house out without a birth time, and lists exact passes across years in the reader's order", () => {
    expect(seen(factsLine({ sky: "Pluto on your Saturn", house: null }, ["2025-04-15", "2026-10-05"], TODAY, "mdy"))).toBe("Pluto on your Saturn · exact Apr 15, 2025 and Oct 5");
    expect(factsLine({ sky: "Pluto on your Saturn", house: "" }, [], TODAY, "dmy")).toBe("Pluto on your Saturn · never exact");
  });

  it("builds a card with an everyday line only when one was given, never an empty one", () => {
    const base = { key: "k", tone: "easy" as const, headline: "Room to dream", end: "2026-10-19", exact: [] as string[], facts };
    expect(contactView(base, TODAY, "dmy").line).toBeNull();
    expect(contactView({ ...base, line: undefined }, TODAY, "dmy").line).toBeNull();
    expect(contactView({ ...base, line: null }, TODAY, "dmy").line).toBeNull();
    expect(contactView({ ...base, line: "Ideas come easily." }, TODAY, "dmy").line).toBe("Ideas come easily.");
    const view = contactView({ ...base, orb: 1.23 }, TODAY, "dmy");
    expect(seen(view.facts)).toBe("Saturn on your Ascendant · 1st house · orb 1.23° · never exact");
    expect(Object.keys(view).sort()).toEqual(["facts", "headline", "key", "lasts", "line", "tone"]);
  });
});

describe("tones", () => {
  it("counts every mix, intense first, absent tones left out, and says it in words", () => {
    expect(mixOf(["easy", "easy", "mixed", "intense", "intense", "intense"])).toEqual([
      { tone: "intense", count: 3 },
      { tone: "mixed", count: 1 },
      { tone: "easy", count: 2 },
    ]);
    expect(mixLabel(["easy", "easy", "mixed", "intense", "intense", "intense"])).toBe("3 intense, 1 mixed and 2 easy");
    expect(mixLabel(["mixed"])).toBe("1 mixed");
    expect(mixLabel(["easy", "easy"])).toBe("2 easy");
    expect(mixOf(["mixed", "mixed"])).toEqual([{ tone: "mixed", count: 2 }]);
  });

  it("gives one dot a tone, intense first, and a quiet day none", () => {
    expect(dayTones([])).toEqual([]);
    expect(dayTones(["easy", "easy", "easy"])).toEqual(["easy"]);
    expect(dayTones(["easy", "mixed", "intense"])).toEqual(["intense", "mixed", "easy"]);
  });

  it("tells a screen reader the day and its tones, three of them with 'and', a quiet day as quiet", () => {
    expect(dayLabel({ date: "2026-10-07", tones: ["easy", "mixed", "intense", "intense"] }, "dmy")).toBe("Wednesday 7 October: intense, mixed and easy");
    expect(dayLabel({ date: "2026-10-07", tones: ["mixed"] }, "ymd")).toBe("Wednesday, October 7: mixed");
    expect(dayLabel({ date: "2026-10-07", tones: [] }, "dmy")).toBe("Wednesday 7 October: quiet");
  });

  it("has a class and a word for every tone and no other", () => {
    expect([...TONE_ORDER].sort()).toEqual(Object.keys(TONE_WORDS).sort());
    for (const tone of TONE_ORDER) {
      expect(toneClass(tone)).toBe(`sd-tone-${tone}`);
      expect(TONE_WORDS[tone]).toBe(tone.charAt(0).toUpperCase() + tone.slice(1));
    }
  });

  it("starts an open button's name with its card's headline, so a list of them can be told apart", () => {
    expect(readLabel("Room to dream").startsWith("Room to dream")).toBe(true);
    expect(readLabel("")).toBe(": read what this means for you");
    expect(readLabel("A")).not.toBe(readLabel("B"));
  });
});

describe("a day in the reader's zone", () => {
  it("is the date where the reader is, across the date line, a half hour off UTC and a clock change", () => {
    expect(dayIn("2026-10-05T10:30:00Z", "Pacific/Kiritimati")).toBe("2026-10-06");
    expect(dayIn("2026-10-05T10:30:00Z", "Pacific/Pago_Pago")).toBe("2026-10-04");
    expect(dayIn("2026-10-05T18:30:00Z", "Asia/Kolkata")).toBe("2026-10-06");
    expect(dayIn("2026-10-05T18:29:59Z", "Asia/Kolkata")).toBe("2026-10-05");
    expect(dayIn("2026-10-25T00:30:00Z", "Europe/Lisbon")).toBe("2026-10-25");
    expect(dayIn("2026-10-25T23:30:00Z", "Europe/Lisbon")).toBe("2026-10-25");
    expect(dayIn("2026-10-26T00:00:00Z", "Europe/Lisbon")).toBe("2026-10-26");
    expect(dayIn("2026-03-08T09:59:00Z", "America/Los_Angeles")).toBe("2026-03-08");
    expect(dayIn("2026-03-08T07:59:00Z", "America/Los_Angeles")).toBe("2026-03-07");
    expect(dayIn("2026-12-31T23:59:59Z", "Asia/Tokyo")).toBe("2027-01-01");
    expect(dayIn("2028-02-29T23:59:59Z", "UTC")).toBe("2028-02-29");
    expect(dayIn("2028-02-29T23:59:59Z", "America/New_York")).toBe("2028-02-29");
    expect(dayIn(new Date("2028-02-29T23:59:59Z"), "Europe/Lisbon")).toBe("2028-02-29");
    expect(dayIn(new Date("2028-06-30T23:30:00Z"), "Europe/Lisbon")).toBe("2028-07-01");
  });

  it("reads a zone Intl does not know, or an empty one, as UTC, the day the engine keys events by", () => {
    for (const zone of ["Not/AZone", "", "UTC+3", "europe/lisbon-ish"]) expect(dayIn("2026-10-05T23:30:00Z", zone), JSON.stringify(zone)).toBe("2026-10-05");
  });

  it("is always a day this file can print: four digits, two, two", () => {
    for (const zone of ["UTC", "Asia/Tokyo", "America/Sao_Paulo", "Pacific/Auckland"]) {
      for (let h = 0; h < 24; h += 5) expect(dayIn(`2026-06-30T${pad(h)}:15:00Z`, zone)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("weekdays and numbers for the day cells, over two whole years", () => {
  const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });
  it("agree with an independent calendar for every day of 2027 and 2028", () => {
    for (const year of [2027, 2028]) {
      for (let i = 0; i < 366; i++) {
        const d = new Date(Date.UTC(year, 0, 1 + i));
        if (d.getUTCFullYear() !== year) continue;
        const iso = d.toISOString().slice(0, 10);
        expect(weekdayOf(iso), iso).toBe(WEEKDAY.format(d).slice(0, 3));
        expect(dayNumber(iso), iso).toBe(String(d.getUTCDate()));
        expect(longDay(iso, "dmy"), iso).toBe(`${WEEKDAY.format(d)} ${d.getUTCDate()} ${LONG[d.getUTCMonth()]}`);
        expect(longDay(iso, "mdy"), iso).toBe(`${WEEKDAY.format(d)}, ${LONG[d.getUTCMonth()]} ${d.getUTCDate()}`);
      }
    }
  });
});

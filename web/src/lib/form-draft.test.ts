import { describe, expect, it } from "vitest";
import { DEFAULT_ANSWER, type BirthTimeAnswer } from "@/lib/birth-time";
import { FORM_DRAFT_KEY, parseFormDraft, saveFormDraft, takeFormDraft, type DraftStore, type FormDraft } from "@/lib/form-draft";
import type { GeocodeResult } from "@/lib/places";

// sessionStorage's three calls over a Map: no jsdom here (MB-47).
function memoryStore(stored?: string): DraftStore & { raw: () => string | null; size: () => number } {
  const data = new Map<string, string>();
  if (stored !== undefined) data.set(FORM_DRAFT_KEY, stored);
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    raw: () => data.get(FORM_DRAFT_KEY) ?? null,
    size: () => data.size,
  };
}

const MILAN: GeocodeResult = {
  name: "Milan, Lombardy, Italy",
  city: "Milan",
  region: "Lombardy",
  country: "Italy",
  latitude: 45.4642,
  longitude: 9.1896,
  timezoneOffset: 2,
  timezone: "Europe/Rome",
  placeType: "city",
};

const KNOWN: BirthTimeAnswer = { mode: "known", time: "14:30", part: "afternoon", kind: "part" };
const DRAFT: FormDraft = { birthDate: "1990-05-17", time: KNOWN, place: MILAN };

describe("the birth form's draft", () => {
  it("is written under the tab's one key and taken back whole, once", () => {
    expect(FORM_DRAFT_KEY).toBe("sd.form.draft");
    const store = memoryStore();
    saveFormDraft(DRAFT, store);
    expect(JSON.parse(store.raw() ?? "null")).toEqual(DRAFT);
    expect(takeFormDraft(store)).toEqual(DRAFT);
    expect(store.raw()).toBeNull();
    expect(takeFormDraft(store)).toBeNull();
  });

  it("writes the date, the time answer and the place, and nothing else a caller hands it", () => {
    const store = memoryStore();
    saveFormDraft({ ...DRAFT, name: "Ada", email: "ada@example.com" } as FormDraft, store);
    expect(Object.keys(JSON.parse(store.raw() ?? "{}")).sort()).toEqual(["birthDate", "place", "time"]);
    expect(store.size()).toBe(1);
  });

  it("carries every kind of time answer, and a date whose place is not chosen yet", () => {
    const answers: BirthTimeAnswer[] = [
      KNOWN,
      { mode: "roughly", time: "", part: "night", kind: "part" },
      { mode: "roughly", time: "06:45", part: "afternoon", kind: "about" },
      { mode: "unknown", time: "", part: "afternoon", kind: "part" },
    ];
    for (const time of answers) {
      const store = memoryStore();
      saveFormDraft({ birthDate: "1929-05-04", time, place: null }, store);
      expect(takeFormDraft(store)).toEqual({ birthDate: "1929-05-04", time, place: null });
    }
  });

  it("is deleted even when it cannot be read, and reads as nothing", () => {
    for (const raw of ["{not json", "null", "42", "\"1990-05-17\"", "[\"1990-05-17\"]", ""]) {
      const store = memoryStore(raw);
      expect(takeFormDraft(store)).toBeNull();
      expect(store.raw()).toBeNull();
    }
    expect(takeFormDraft(memoryStore())).toBeNull();
    expect(parseFormDraft(null)).toBeNull();
  });

  it("reads a bad field as the form's empty and keeps the good ones", () => {
    const read = (over: Record<string, unknown>) => parseFormDraft(JSON.stringify({ ...DRAFT, ...over }));
    expect(read({ birthDate: "17/05/1990" })).toEqual({ ...DRAFT, birthDate: "" });
    expect(read({ birthDate: "1990-02-31" })?.birthDate).toBe("");
    expect(read({ birthDate: 19900517 })?.birthDate).toBe("");
    expect(read({ time: { mode: "sometime", time: "14:30" } })).toEqual({ ...DRAFT, time: DEFAULT_ANSWER });
    expect(read({ time: "14:30" })?.time).toEqual(DEFAULT_ANSWER);
    expect(read({ time: { mode: "roughly", time: "25:00", part: "dusk", kind: "maybe" } })?.time).toEqual({
      mode: "roughly", time: "", part: "afternoon", kind: "part",
    });
    expect(read({ place: "Milan" })).toEqual({ ...DRAFT, place: null });
    expect(read({ birthDate: undefined, time: undefined, place: undefined })).toEqual({ birthDate: "", time: DEFAULT_ANSWER, place: null });
  });

  it("uses a place whole or not at all", () => {
    const place = (over: Record<string, unknown>) => parseFormDraft(JSON.stringify({ ...DRAFT, place: { ...MILAN, ...over } }))?.place;
    expect(place({})).toEqual(MILAN);
    expect(place({ latitude: "45.4642" })).toBeNull();
    expect(place({ latitude: 91 })).toBeNull();
    expect(place({ longitude: -181 })).toBeNull();
    expect(place({ timezoneOffset: 15 })).toBeNull();
    expect(place({ name: "  " })).toBeNull();
    expect(place({ country: undefined })).toBeNull();
    expect(place({ timezone: 2 })).toBeNull();
    expect(place({ timezone: undefined })).toBeNull();
    expect(place({ placeType: null })).toBeNull();
    expect(place({ osmId: 44915 })).toEqual(MILAN);
  });

  it("drops a place without a zone it can use, so the reader picks it again (reading 2, ADR-246)", () => {
    const place = (over: Record<string, unknown>) => parseFormDraft(JSON.stringify({ ...DRAFT, place: { ...MILAN, ...over } }))?.place;
    // A tab kept from before the zone came from our server: the longitude's hour and no zone, the guess MB-30 removed.
    const guessed = { name: "Ixelles, Brussels-Capital, Belgium", city: "Ixelles", region: "Brussels-Capital", country: "Belgium", latitude: 50.8333, longitude: 4.3667, timezoneOffset: 0, timezone: null, placeType: "municipality" };
    expect(parseFormDraft(JSON.stringify({ ...DRAFT, place: guessed }))).toEqual({ ...DRAFT, place: null });
    for (const timezone of [null, "", "Etc/GMT-1", "Mars/Olympus_Mons"]) expect(place({ timezone }), String(timezone)).toBeNull();
  });

  it("costs nothing where the browser refuses storage, and on the server", () => {
    const refuse = () => {
      throw new Error("SecurityError");
    };
    const refusing: DraftStore = { getItem: refuse, setItem: refuse, removeItem: refuse };
    expect(() => saveFormDraft(DRAFT, refusing)).not.toThrow();
    expect(takeFormDraft(refusing)).toBeNull();
    expect(() => saveFormDraft(DRAFT, null)).not.toThrow();
    expect(takeFormDraft(null)).toBeNull();
    expect(() => saveFormDraft(DRAFT)).not.toThrow();
    expect(takeFormDraft()).toBeNull();
  });

  it("is still read where it cannot be deleted", () => {
    const store = memoryStore(JSON.stringify(DRAFT));
    const stubborn: DraftStore = { ...store, removeItem: () => { throw new Error("SecurityError"); } };
    expect(takeFormDraft(stubborn)).toEqual(DRAFT);
  });
});

// R15 tester: a kept place at the limits of what a place can hold, and an old tab's place (ADR-246, reading 2).
describe("a draft's place at its limits", () => {
  const place = (over: Record<string, unknown>) => parseFormDraft(JSON.stringify({ ...DRAFT, place: { ...MILAN, ...over } }))?.place;

  it("keeps the globe's last points and the widest offsets, and drops the first past each", () => {
    for (const over of [{ latitude: 90 }, { latitude: -90 }, { longitude: 180 }, { longitude: -180 }, { timezoneOffset: 14 }, { timezoneOffset: -12 }, { timezoneOffset: 5.75 }]) {
      expect(place(over), JSON.stringify(over)).toEqual({ ...MILAN, ...over });
    }
    for (const over of [{ latitude: 90.0001 }, { longitude: 180.0001 }, { timezoneOffset: 14.25 }, { timezoneOffset: -14.5 }, { latitude: null }, { timezoneOffset: "2" }]) {
      expect(place(over), JSON.stringify(over)).toBeNull();
    }
  });

  it("keeps a place's zone as the server gave it, and drops a tab's place whose zone came from timeapi.io at sea", () => {
    expect(place({ timezone: "America/Argentina/Buenos_Aires" })?.timezone).toBe("America/Argentina/Buenos_Aires");
    for (const timezone of ["Etc/GMT+3", "Etc/UTC", "Etc/GMT"]) expect(place({ timezone }), timezone).toBeNull();
  });

  it("drops only the place of an old tab's draft, so the date and the time answer still fill the form", () => {
    const old = JSON.stringify({ birthDate: "1929-05-04", time: KNOWN, place: { ...MILAN, timezone: null, timezoneOffset: 1 } });
    expect(takeFormDraft(memoryStore(old))).toEqual({ birthDate: "1929-05-04", time: KNOWN, place: null });
  });
});

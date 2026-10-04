/**
 * What the sky screen carries to the birth form through sign-in (ADR-140, R11
 * reading 14): the date, the time answer and the place, in the tab's own
 * sessionStorage, deleted as the form reads it. It is birth data, so only these
 * three fields are written, only by the sky screen's Get my report after
 * launch, and it never leaves the browser; the privacy page names the key.
 */
import {
  DEFAULT_ANSWER,
  MODE_LABELS,
  PART_CENTRES,
  isTime,
  type BirthTimeAnswer,
  type BirthTimeMode,
  type PartOfDay,
} from "@/lib/birth-time";
import { placeZone, type GeocodeResult } from "@/lib/places";

export const FORM_DRAFT_KEY = "sd.form.draft";

export interface FormDraft {
  birthDate: string;
  time: BirthTimeAnswer;
  place: GeocodeResult | null;
}

/** The part of Storage the draft touches, so a test can hand in its own. */
export type DraftStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Null on the server, and where the browser refuses storage, which some private modes do on first touch. */
function sessionStore(): DraftStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveFormDraft(draft: FormDraft, store: DraftStore | null = sessionStore()): void {
  const kept: FormDraft = { birthDate: draft.birthDate, time: draft.time, place: draft.place };
  try {
    store?.setItem(FORM_DRAFT_KEY, JSON.stringify(kept));
  } catch {
    // The form then opens empty, as it does for anyone who comes to it directly.
  }
}

export function takeFormDraft(store: DraftStore | null = sessionStore()): FormDraft | null {
  let raw: string | null;
  try {
    raw = store?.getItem(FORM_DRAFT_KEY) ?? null;
  } catch {
    return null;
  }
  try {
    store?.removeItem(FORM_DRAFT_KEY);
  } catch {
    // Kept, it fills the form once more in this tab; it is still the reader's own.
  }
  return parseFormDraft(raw);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MODES = Object.keys(MODE_LABELS) as BirthTimeMode[];
const PARTS = Object.keys(PART_CENTRES) as PartOfDay[];

/**
 * A day the calendar has: "1990-02-31" would reach the date input and read as
 * empty there. Engines differ on such a day (V8 rolls it into March, Firefox
 * refuses it), hence the round trip after the parse.
 */
function isDate(s: string): boolean {
  if (!DATE.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().startsWith(s);
}

function timeAnswerOf(value: unknown): BirthTimeAnswer {
  if (!value || typeof value !== "object") return { ...DEFAULT_ANSWER };
  const v = value as Record<string, unknown>;
  const mode = MODES.find((m) => m === v.mode);
  if (!mode) return { ...DEFAULT_ANSWER };
  return {
    mode,
    time: typeof v.time === "string" && isTime(v.time) ? v.time : DEFAULT_ANSWER.time,
    part: PARTS.find((p) => p === v.part) ?? DEFAULT_ANSWER.part,
    kind: v.kind === "part" || v.kind === "about" ? v.kind : DEFAULT_ANSWER.kind,
  };
}

const finiteWithin = (n: unknown, limit: number): n is number =>
  typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= limit;

/**
 * A place is used whole or not at all: half of one would send a chart to the wrong town. One without a zone, which a
 * tab kept from before the zone came from our server (ADR-246), is dropped, so the reader picks it again (reading 2).
 */
function placeOf(value: unknown): GeocodeResult | null {
  if (!value || typeof value !== "object") return null;
  const { name, city, region, country, latitude, longitude, timezoneOffset, timezone, placeType } = value as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) return null;
  if (typeof city !== "string" || typeof region !== "string" || typeof country !== "string") return null;
  if (typeof placeType !== "string") return null;
  if (!finiteWithin(latitude, 90) || !finiteWithin(longitude, 180) || !finiteWithin(timezoneOffset, 14)) return null;
  if (!placeZone(timezone)) return null;
  return { name, city, region, country, latitude, longitude, timezoneOffset, timezone, placeType };
}

/** The stored value is whatever the tab last wrote, so each field is checked and a bad one read as the form's empty. */
export function parseFormDraft(raw: string | null): FormDraft | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  return {
    birthDate: typeof v.birthDate === "string" && isDate(v.birthDate) ? v.birthDate : "",
    time: timeAnswerOf(v.time),
    place: placeOf(v.place),
  };
}

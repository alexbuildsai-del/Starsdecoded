import type { Aspect, ContactBody, ContactEvent, EclipseEvent, RetrogradeEvent, SkyEvent } from "./doctrine.js";

/**
 * How a sky event tends to feel, from a fixed table (ADR-207). It colours a
 * time and is never a score: nothing adds tones up or ranks a reader by them
 * (reading 17).
 */
export type Tone = "easy" | "mixed" | "intense";

// MB-188 provisional: the row's recommendation, built as its default until the Owner answers.
// Mars makes no trine in the doctrine; its cell follows "every trine easy" so every row is whole.
export const TONE_TABLE = {
  contact: {
    mars: { conjunction: "mixed", square: "intense", opposition: "intense", trine: "easy" },
    jupiter: { conjunction: "easy", square: "mixed", opposition: "mixed", trine: "easy" },
    saturn: { conjunction: "intense", square: "intense", opposition: "intense", trine: "easy" },
    uranus: { conjunction: "intense", square: "intense", opposition: "intense", trine: "easy" },
    neptune: { conjunction: "mixed", square: "intense", opposition: "intense", trine: "easy" },
    pluto: { conjunction: "intense", square: "intense", opposition: "intense", trine: "easy" },
  },
  retrograde: "mixed",
  closeEclipse: "intense",
} as const satisfies {
  contact: Record<ContactBody, Record<Aspect, Tone>>;
  retrograde: Tone;
  closeEclipse: Tone;
};

type ContactTone = Pick<ContactEvent, "kind" | "body" | "aspect">;
type RetrogradeTone = Pick<RetrogradeEvent, "kind">;
type EclipseTone = Pick<EclipseEvent, "kind" | "near">;

/** An eclipse far from every natal point has no tone: it touches nothing in the chart. */
export function toneOf(event: ContactTone | RetrogradeTone): Tone;
export function toneOf(event: ContactTone | RetrogradeTone | EclipseTone): Tone | null;
export function toneOf(event: ContactTone | RetrogradeTone | EclipseTone): Tone | null {
  switch (event.kind) {
    case "contact":
      return TONE_TABLE.contact[event.body][event.aspect];
    case "retrograde":
      return TONE_TABLE.retrograde;
    case "eclipse":
      return event.near ? TONE_TABLE.closeEclipse : null;
  }
}

/** Most intense first, so a tie goes to the more intense tone. */
const BY_INTENSITY: readonly Tone[] = ["intense", "mixed", "easy"];

/**
 * A day's tone is the one most of its contacts hold, a tie going to the more
 * intense; a day with no contact is quiet, `null` (reading 17). Retrogrades
 * and eclipses passed in are left out, because reading 17 weighs contacts only.
 */
export function dayTone(events: readonly Pick<SkyEvent, "kind" | "tone">[]): Tone | null {
  const held: Record<Tone, number> = { easy: 0, mixed: 0, intense: 0 };
  for (const event of events) if (event.kind === "contact" && event.tone) held[event.tone]++;
  let tone: Tone | null = null;
  for (const t of BY_INTENSITY) if (held[t] > (tone ? held[tone] : 0)) tone = t;
  return tone;
}

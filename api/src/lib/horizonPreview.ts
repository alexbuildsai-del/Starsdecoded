/**
 * The readout under the time control: what the entered hour settles, before
 * anything is paid (ADR-33). Pure of the database and of any model. The sweep
 * is the engine's own, so the readout and the chart can never disagree.
 */
import { calculateNatalChart, type Horizon } from "./chartCalculation.js";

export interface HorizonPreviewInput {
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes: number;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset?: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A problem with the input, or null when it can be swept. */
export function validatePreviewInput(input: HorizonPreviewInput): string | null {
  if (!DATE.test(input.birthDate) || Number.isNaN(Date.parse(`${input.birthDate}T00:00:00Z`))) return "birthDate must be YYYY-MM-DD";
  if (!TIME.test(input.birthTime)) return "birthTime must be HH:MM";
  if (!Number.isInteger(input.birthTimeWindowMinutes) || input.birthTimeWindowMinutes < 0 || input.birthTimeWindowMinutes > 720) return "birthTimeWindowMinutes must be 0 to 720";
  if (!Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90) return "latitude must be -90 to 90";
  if (!Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180) return "longitude must be -180 to 180";
  if (input.timezone === undefined && input.timezoneOffset === undefined) return "timezone or timezoneOffset is required";
  if (input.timezone !== undefined) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: input.timezone });
    } catch {
      return `unknown timezone ${input.timezone}`;
    }
  }
  return null;
}

export function previewHorizon(input: HorizonPreviewInput): Horizon {
  const zoneOrOffset = input.timezone ?? input.timezoneOffset ?? 0;
  return calculateNatalChart(
    input.birthDate, input.birthTime, input.latitude, input.longitude, zoneOrOffset, input.birthTimeWindowMinutes,
  ).horizon;
}

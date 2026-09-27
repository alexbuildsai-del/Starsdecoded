/**
 * The product is called what it is called, everywhere it is named (ADR-61,
 * R-0.4): the natal report is the Personal natal report, and the pair's
 * lines read "from personal report". One constant; no copy repeats it.
 */
export const PERSONAL_REPORT = "Personal natal report";
export const COMPATIBILITY_REPORT = "Compatibility report";
export const PRODUCT = "Stars Decoded";

/** The kicker over a person's own words in the compatibility report. */
export function fromPersonalReport(firstName: string): string {
  return `${firstName} · from personal report`;
}

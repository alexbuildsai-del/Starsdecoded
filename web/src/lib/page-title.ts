import { useEffect } from "react";

export const SITE_NAME = "Stars Decoded";
export const DEFAULT_TITLE = "Stars Decoded — Natal Chart Reports";

export function usePageTitle(
  title?: string | null,
  opts?: { raw?: boolean },
) {
  const raw = opts?.raw ?? false;
  useEffect(() => {
    document.title = title
      ? raw
        ? title
        : `${title} — ${SITE_NAME}`
      : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, raw]);
}

// The report is exported with window.print(), and the browser offers
// document.title as the PDF filename — so this string is a filename, which
// is why it uses a plain hyphen and drops the characters browsers strip.
export function reportFileTitle(
  kind: "Natal Report" | "Synastry Report",
  ...names: string[]
): string {
  const clean = names.map((n) =>
    n.replace(/[/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim(),
  );
  return `${clean.join(" & ")} - ${kind} - ${SITE_NAME}`;
}

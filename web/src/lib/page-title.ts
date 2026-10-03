import { useEffect } from "react";

export const SITE_NAME = "Stars Decoded";
// The shell's own title (index.html), so a page that sets none reads the same however the reader reached it.
export const DEFAULT_TITLE = SITE_NAME;

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
// MB-138 provisional: the tab and the saved PDF call each report by the product's name (reading 13).
export function reportFileTitle(
  kind: "Personal Report" | "Compatibility Report",
  ...names: string[]
): string {
  const clean = names.map((n) =>
    n.replace(/[/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim(),
  );
  return `${clean.join(" & ")} - ${kind} - ${SITE_NAME}`;
}

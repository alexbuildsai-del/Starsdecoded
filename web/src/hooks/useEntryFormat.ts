/**
 * The date order and clock of the reader's browser (ADR-222, reading 5). The
 * prerender and the hydrating render draw DD / MM / YYYY and 24-hour, so the
 * server's markup and the first render match; React swaps in the browser's
 * own once hydration is done. A page drawn in the browser alone, never
 * prerendered, starts on the browser's, so it never flickers from one order
 * to the other.
 */
import { useSyncExternalStore } from "react";
import { DEFAULT_ENTRY, entryFormat, type Clock, type DateOrder, type EntryFormat } from "@/lib/date-entry";

// One answer per language, so React sees the same object until the language changes.
let read: { lang: string; format: EntryFormat } | undefined;

function browserEntry(): EntryFormat {
  const lang = navigator.language;
  if (read?.lang !== lang) read = { lang, format: entryFormat(lang) };
  return read.format;
}

function watchLanguage(onChange: () => void): () => void {
  window.addEventListener("languagechange", onChange);
  return () => window.removeEventListener("languagechange", onChange);
}

const serverEntry = (): EntryFormat => DEFAULT_ENTRY;

export function useEntryFormat(): { order: DateOrder; clock: Clock } {
  return useSyncExternalStore(watchLanguage, browserEntry, serverEntry);
}

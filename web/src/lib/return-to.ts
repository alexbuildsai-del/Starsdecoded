/**
 * Where a sign-in lands (reading 1, B-47). The sign-in and sign-up pages open with `return_to`, and Clerk's path router
 * keeps only its own redirect parameters when it moves on to a later step, such as /sign-in/factor-one or
 * /sign-up/verify-email-address. So the tab keeps the path while the reader is on those pages and lets it go on the
 * first page past them: a path is used once.
 */

/** A sessionStorage key, gone with the tab; exported for the privacy page's list of what the browser keeps (MB-43). */
export const RETURN_TO_KEY = "sd.return_to";

const FALLBACK = "/dashboard";

/** The part of Storage the code touches, so a test can hand in its own. */
export type ReturnToStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Null on the server, and where the browser refuses storage, which some private modes do on first touch. */
function tabStore(): ReturnToStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// A host that cannot exist stands in for ours, so a path that leaves it shows as another origin.
const HERE = "https://stars-decoded.invalid";
// A browser reads a backslash in an address as a slash and drops a tab or a line break from it, so any of them can
// turn a path into //another-host.
const UNSAFE = /[\\\u0000-\u001f\u007f]/;

/** The path itself when it can only lead to a page of this site, else null. */
export function safeReturnTo(path: unknown): string | null {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || UNSAFE.test(path)) return null;
  let url: URL;
  try {
    url = new URL(path, HERE);
  } catch {
    return null;
  }
  // "/..//host" settles on the path "//host", which a later address could read as another site.
  return url.origin === HERE && !url.pathname.startsWith("//") ? path : null;
}

function askedIn(search: string): string | null {
  return new URLSearchParams(search).get("return_to");
}

function kept(store: ReturnToStore | null): string | null {
  try {
    return safeReturnTo(store?.getItem(RETURN_TO_KEY));
  } catch {
    return null;
  }
}

/**
 * Keeps the address's `return_to` for the tab when it is a path of this site; any other value lets go of what an
 * earlier sign-in kept, so the page lands on /dashboard. An address with none, as Clerk's later steps have, changes
 * nothing.
 */
export function keepReturnTo(search: string, store: ReturnToStore | null = tabStore()): void {
  const asked = askedIn(search);
  if (asked === null) return;
  const path = safeReturnTo(asked);
  try {
    if (path) store?.setItem(RETURN_TO_KEY, path);
    else store?.removeItem(RETURN_TO_KEY);
  } catch {
    // A store the browser refuses keeps the path to the address, which the page's first step still has.
  }
}

/**
 * The page a sign-in that opened at this address lands on, read without letting go, so a render can ask: the address's
 * own `return_to`, else the path the tab kept, else /dashboard.
 */
export function returnPathFor(search: string, store: ReturnToStore | null = tabStore()): string {
  const asked = askedIn(search);
  if (asked !== null) return safeReturnTo(asked) ?? FALLBACK;
  return kept(store) ?? FALLBACK;
}

/** The kept path, else /dashboard, and the tab lets it go: a path is used once. */
export function takeReturnTo(store: ReturnToStore | null = tabStore()): string {
  const path = kept(store);
  try {
    store?.removeItem(RETURN_TO_KEY);
  } catch {
    // A store the browser refuses kept nothing to let go of.
  }
  return path ?? FALLBACK;
}

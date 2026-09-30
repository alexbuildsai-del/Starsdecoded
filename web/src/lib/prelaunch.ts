import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { LAUNCHED } from "@workspace/launch";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { APP_ENV } from "@/lib/appEnv";

/**
 * Production before launch shows everyone the public site, and every call to
 * write a report or sign in opens the waitlist over the page (ADR-141; the
 * Owner, 2026-09-30). The switch is the one the API reads too
 * (@workspace/launch), so both launch together.
 */
export const PRELAUNCH = !LAUNCHED && APP_ENV === "production";

/** The app routes a visitor still reaches before launch: the admin's way in. The public site needs no exception. */
export const OPEN_BEFORE_LAUNCH = /^\/(?:sign-in|admin)(?:\/|$)/;

/** The tab's own memory of the preview (reading 3): it lasts through the tab's navigations and ends with the tab. */
export const PREVIEW_KEY = "sd.prelaunch.preview";

/** The part of Storage the preview touches, so a test can hand in its own. */
export type PreviewStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Null on the server, and where the browser refuses storage, which some private modes do on first touch. */
function tabStore(): PreviewStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function pageSearch(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}

function remember(on: boolean, store: PreviewStore | null): void {
  try {
    if (on) store?.setItem(PREVIEW_KEY, "1");
    else store?.removeItem(PREVIEW_KEY);
  } catch {
    // A store the browser refuses keeps the preview to this page view.
  }
}

const previewListeners = new Set<(on: boolean) => void>();

/**
 * Whether this tab previews the visitor's view (reading 3): `?prelaunch=1`
 * turns it on for the tab, `?prelaunch=0` off, and with neither the tab's last
 * word stands. On any host, and even for the signed-in admin; the API never
 * sees it, so staging's stays open.
 */
export function previewFlag(search: string = pageSearch(), store: PreviewStore | null = tabStore()): boolean {
  const asked = new URLSearchParams(search).get("prelaunch");
  if (asked === "1" || asked === "0") {
    remember(asked === "1", store);
    return asked === "1";
  }
  try {
    return store?.getItem(PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

/** Turns the preview on or off for the tab and tells every mounted reader at once, so the ribbon's Exit needs no reload. */
export function setPreview(on: boolean, store: PreviewStore | null = tabStore()): void {
  remember(on, store);
  for (const listener of previewListeners) listener(on);
}

export function onPreviewChange(listener: (on: boolean) => void): () => void {
  previewListeners.add(listener);
  return () => {
    previewListeners.delete(listener);
  };
}

/** The query without the preview's parameter, so a reload after Exit does not turn the preview back on. */
export function withoutPreview(search: string): string {
  const params = new URLSearchParams(search);
  if (!params.has("prelaunch")) return search;
  params.delete("prelaunch");
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}

/** False on the server and at first paint, so hydration matches; true from the first effect on. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** The preview as the tab holds it, read after mount and kept current by `setPreview`. */
export function usePreviewFlag(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(previewFlag());
    return onPreviewChange(setOn);
  }, []);
  return on;
}

interface View {
  prelaunch: boolean;
  signedIn: boolean;
}

/** What the server renders and the client's first paint repeats: nobody is known yet. */
const FIRST_PAINT: View = { prelaunch: PRELAUNCH, signedIn: false };
const ViewContext = createContext<View>(FIRST_PAINT);

/**
 * Who is looking, learned after mount (readings 1 and 3): a visitor before
 * launch, and anyone in the preview, sees the site with the waitlist over its
 * buttons; the signed-in admin sees and uses everything. Client only, inside
 * Clerk: the prerender has no provider and renders the first paint.
 */
export function PrelaunchViewProvider({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const preview = usePreviewFlag();
  const admin = useIsAdmin();
  const { isSignedIn } = useAuth();
  const prelaunch = mounted ? preview || (PRELAUNCH && !admin) : PRELAUNCH;
  const signedIn = mounted && isSignedIn === true;
  const view = useMemo(() => ({ prelaunch, signedIn }), [prelaunch, signedIn]);
  return createElement(ViewContext.Provider, { value: view }, children);
}

/** True where the page shows the visitor's view: the waitlist over every call to write a report or sign in. */
export function usePrelaunchView(): boolean {
  return useContext(ViewContext).prelaunch;
}

/** Signed in, as the view knows it: false on the server and at first paint, so a label can change only after hydration. */
export function useSignedInView(): boolean {
  return useContext(ViewContext).signedIn;
}

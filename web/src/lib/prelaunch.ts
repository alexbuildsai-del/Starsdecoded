import { LAUNCHED } from "@workspace/launch";
import { APP_ENV } from "@/lib/appEnv";

/**
 * Production before launch is a waitlist (ADR-141): every visitor sees the
 * waitlist page, and only the admin, once signed in, sees the app. The switch
 * is the one the API reads too (@workspace/launch), so both launch together.
 */
export const PRELAUNCH = !LAUNCHED && APP_ENV === "production";

/** What stays reachable before launch: the admin's way in and the legal pages. */
export const OPEN_BEFORE_LAUNCH = /^\/(?:sign-in|admin|privacy|terms|refunds|company)(?:\/|$)/;

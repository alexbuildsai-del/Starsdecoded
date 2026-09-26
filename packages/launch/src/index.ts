/**
 * The launch switch (ADR-141). Until it is true, production is a waitlist:
 * the web shows every visitor the waitlist page and the API opens only to the
 * admin. Staging and local runs are never gated. The web and the API both read
 * this one constant, so launching is this line, shipped by a Release.
 */
export const LAUNCHED = false;

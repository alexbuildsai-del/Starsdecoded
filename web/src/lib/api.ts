// Where the API lives. In dev that is this same origin — Vite proxies /api
// to the local Express server. In production the API is a separate Railway
// deployment, so VITE_API_BASE_URL carries its origin.
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const apiOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";

export const API_ORIGIN = apiOrigin;
export const BASE_URL = apiOrigin ? `${apiOrigin}/api/` : `${basePath}/api/`;

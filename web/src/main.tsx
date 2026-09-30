import { createRoot, hydrateRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App, { type FirstPage } from "./App";
import { API_ORIGIN } from "./lib/api";
import { PUBLIC_ROUTES } from "./site/routes";
import "./index.css";

// The generated client requests relative paths like /api/reports. Same-origin
// in dev (Vite proxies them); in production they need the Railway origin
// prepended. Cookies still ride along — customFetch always sends credentials.
if (API_ORIGIN) {
  setBaseUrl(API_ORIGIN);
}

const root = document.getElementById("root")!;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const path = window.location.pathname.slice(basePath.length) || "/";
const route = PUBLIC_ROUTES.find((entry) => entry.path === path);

// A public page and 404.html arrive prerendered (R-7.6); app.html and the dev server's page arrive empty. The page's
// own chunk loads first, so the first render matches the HTML without suspending. Should it fail to load, the HTML
// stays as it is, and its links still work as plain links.
if (!root.hasChildNodes()) {
  createRoot(root).render(<App />);
} else if (!route) {
  hydrateRoot(root, <App />);
} else {
  route.load().then(
    ({ default: Page }) => {
      const first: FirstPage = { path: route.path, Page };
      hydrateRoot(root, <App first={first} />);
    },
    (error: unknown) => console.error("[hydrate] The page's script did not load:", error),
  );
}

import "./index.css";

const root = document.getElementById("root")!;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const path = window.location.pathname.slice(basePath.length) || "/";

// A tab opened in the background paints only once it is shown, so a page that has not painted by then starts anyway.
const PAINT_WAIT_MS = 5000;

/**
 * A public page and 404.html arrive prerendered (R-7.6) and paint from their HTML and stylesheets alone. The app's
 * scripts and the webfonts wait for that paint rather than take a phone's bandwidth from the stylesheets it waits on,
 * and Lighthouse's LCP, which counts every download that ends before the paint, no longer counts them (R13-C7). The
 * words show in their fallback faces until the fonts swap in.
 */
function afterFirstPaint(run: () => void): void {
  let started = false;
  let observer: PerformanceObserver | undefined;
  const start = () => {
    if (started) return;
    started = true;
    observer?.disconnect();
    run();
  };
  if (PerformanceObserver.supportedEntryTypes?.includes("paint")) {
    observer = new PerformanceObserver((list) => {
      if (list.getEntriesByName("first-contentful-paint").length > 0) start();
    });
    observer.observe({ type: "paint", buffered: true });
  } else {
    requestAnimationFrame(() => setTimeout(start));
  }
  setTimeout(start, PAINT_WAIT_MS);
}

async function startApp(prerendered: boolean): Promise<void> {
  // A face that fails to load leaves its words in the fallback, which the page already shows.
  import("./fonts.css").catch(() => {});
  // The page's own chunk loads beside the app, so the first render matches the HTML without suspending.
  const first = prerendered
    ? import("./site/routes").then(({ PUBLIC_ROUTES }) => {
        const route = PUBLIC_ROUTES.find((entry) => entry.path === path);
        return route?.load().then(({ default: Page }) => ({ path: route.path, Page }));
      })
    : Promise.resolve(undefined);
  const [{ createRoot, hydrateRoot }, { MotionConfig }, { setBaseUrl }, { API_ORIGIN }, { default: App }, firstPage] = await Promise.all([
    import("react-dom/client"),
    import("framer-motion"),
    import("@workspace/api-client-react"),
    import("./lib/api"),
    import("./App"),
    first,
  ]);

  // The generated client requests relative paths like /api/reports. Same-origin
  // in dev (Vite proxies them); in production they need the Railway origin
  // prepended. Cookies still ride along — customFetch always sends credentials.
  if (API_ORIGIN) {
    setBaseUrl(API_ORIGIN);
  }

  // One place decides reduced motion for every framer-motion part: each lands on its final frame when the reader asks.
  if (!prerendered) {
    createRoot(root).render(
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>,
    );
  } else {
    hydrateRoot(
      root,
      <MotionConfig reducedMotion="user">
        <App first={firstPage} />
      </MotionConfig>,
    );
  }
}

// app.html and the dev server's page arrive empty, with nothing to paint before the app, so they start at once. Should
// a prerendered page's scripts fail to load, the HTML stays as it is, and its links still work as plain links.
const prerendered = root.hasChildNodes();
const boot = () =>
  startApp(prerendered).catch((error: unknown) => console.error("[hydrate] The page's script did not load:", error));
if (prerendered) afterFirstPaint(boot);
else void boot();

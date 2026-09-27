/**
 * The QA agent's eyes (ADR-86, MB-77): headless Chromium through
 * playwright-core, found on the Railway image's PATH or at
 * QA_BROWSER_PATH; absent, the agent answers `unconfigured` and never
 * crashes. A walk opens pages, reads their text, keeps console errors and
 * a screenshot, and submits nothing.
 */
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import type { Persona, PersonaStep } from "./personas.js";

const CANDIDATES = ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"];

/** The executable the walk launches, or null when none is on the image. */
export function findChromium(env: NodeJS.ProcessEnv = process.env): string | null {
  const wanted = env.QA_BROWSER_PATH?.trim();
  const dirs = (env.PATH ?? "").split(delimiter).filter(Boolean);
  const onPath = (name: string): string | null => {
    if (name.includes("/")) return existsSync(name) ? name : null;
    for (const dir of dirs) if (existsSync(join(dir, name))) return join(dir, name);
    return null;
  };
  if (wanted) return onPath(wanted);
  for (const c of CANDIDATES) { const hit = onPath(c); if (hit) return hit; }
  return null;
}

export interface PageVisit {
  persona: string;
  path: string;
  status: number | null;
  title: string;
  /** The page's visible text, cut, never a report's prose: no report exists on these pages. */
  text: string;
  consoleErrors: string[];
  /** JPEG, base64, for the model's eyes. */
  screenshot: string | null;
  error: string | null;
  step: PersonaStep;
}

export interface Walker {
  walk(webOrigin: string, personas: Persona[], signal?: AbortSignal): Promise<PageVisit[]>;
}

/** The real walk: one browser, one page per step, GET only. */
export function chromiumWalker(executablePath: string): Walker {
  return {
    async walk(webOrigin, personas, signal) {
      const { chromium } = await import("playwright-core");
      const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
      const visits: PageVisit[] = [];
      try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, userAgent: "starsdecoded-qa-agent" });
        // A walk never submits: every non-GET request the page tries to make is refused at the door (MB-78).
        await context.route("**/*", (route) => (route.request().method() === "GET" ? route.continue() : route.abort()));
        for (const persona of personas) {
          for (const step of persona.steps) {
            if (signal?.aborted) return visits;
            const page = await context.newPage();
            const consoleErrors: string[] = [];
            page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
            page.on("pageerror", (e) => consoleErrors.push(String(e.message).slice(0, 200)));
            try {
              const res = await page.goto(`${webOrigin.replace(/\/+$/, "")}${step.path}`, { waitUntil: "networkidle", timeout: 45_000 });
              await page.waitForTimeout(800);
              const text = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 6_000);
              const screenshot = (await page.screenshot({ type: "jpeg", quality: 55 }).catch(() => null))?.toString("base64") ?? null;
              visits.push({ persona: persona.name, path: step.path, status: res?.status() ?? null, title: await page.title(), text, consoleErrors, screenshot, error: null, step });
            } catch (err) {
              visits.push({ persona: persona.name, path: step.path, status: null, title: "", text: "", consoleErrors, screenshot: null, error: err instanceof Error ? err.message : String(err), step });
            } finally {
              await page.close().catch(() => undefined);
            }
          }
        }
      } finally {
        await browser.close().catch(() => undefined);
      }
      return visits;
    },
  };
}

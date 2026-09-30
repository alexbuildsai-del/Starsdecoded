/**
 * Real HTML (R-7.6, ADR-114), the build's last step: every page the server entry renders goes into the built
 * index.html with its own head, stylesheets and chunks, so the words reach a crawler and the page is styled before its
 * script runs. Beside them: app.html, the empty shell vercel.json gives the app routes; 404.html; the crawl files. A
 * page whose HTML lacks its H1 or its lede fails the build.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.resolve(web, "..", "dist");
const server = await import(pathToFileURL(path.join(web, "dist-ssr", "entry-server.js")).href);

const HEAD = /<!--page-head-->[\s\S]*?<!--\/page-head-->/;
const ROOT = '<div id="root"></div>';
const NOINDEX = /<meta name="robots" content="noindex"/;

const template = await readFile(path.join(dist, "index.html"), "utf8");
if (!HEAD.test(template) || template.split(ROOT).length !== 2) {
  throw new Error("dist/index.html has lost its page-head block or its one empty root; see web/index.html.");
}
const manifestFile = path.join(dist, ".vite", "manifest.json");
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));

/** Every chunk the entry loads before any page does: their stylesheets and preloads are in the template already. */
const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
const loadedFirst = new Set();
(function reach(key) {
  if (loadedFirst.has(key)) return;
  loadedFirst.add(key);
  for (const next of manifest[key].imports ?? []) reach(next);
})(entryKey);

/** Without its stylesheets a page would show unstyled until its chunk loaded, and hydration waits on the chunk. */
function assetTags(source) {
  const css = new Set();
  const js = new Set();
  const seen = new Set();
  (function visit(key) {
    if (seen.has(key) || loadedFirst.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`The client manifest has no ${key}.`);
    seen.add(key);
    js.add(chunk.file);
    for (const file of chunk.css ?? []) css.add(file);
    for (const next of chunk.imports ?? []) visit(next);
  })(source);
  return [
    ...[...css].map((file) => `<link rel="stylesheet" crossorigin href="${server.base}${file}">`),
    ...[...js].map((file) => `<link rel="modulepreload" crossorigin href="${server.base}${file}">`),
  ]
    .map((tag) => `  ${tag}\n  `)
    .join("");
}

/** Functions, not strings, as replacements: a `$` in a page's words must stay a dollar sign. */
function documentOf({ head, html = "", assets = "" }) {
  return template
    .replace(HEAD, () => head.replace(/\n/g, "\n    "))
    .replace(ROOT, () => `<div id="root">${html}</div>`)
    .replace("</head>", () => `${assets}</head>`);
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (text) =>
  text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, name) => {
    if (name[0] !== "#") return ENTITIES[name] ?? whole;
    return String.fromCodePoint(name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
  });

/** What a reader gets of some HTML, with its spacing dropped, so markup inside a heading cannot fail the match. */
const words = (html) =>
  decode(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<[^>]*>/g, ""),
  ).replace(/\s+/g, "");

function problemsWith(page, html) {
  const problems = [];
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((found) => words(found[1]));
  if (!headings.includes(words(page.h1))) problems.push(`no <h1> reads "${page.h1}"`);
  if (!words(html).includes(words(page.lede))) problems.push("its lede is not in the page");
  // renderToString does not wait: a boundary handed to the browser means some of the page's words are not in its HTML.
  if (/<!--\$[?!]-->/.test(html)) problems.push("part of it suspended (a lazy import or a data read), so its words are missing");
  return problems.map((problem) => `${page.path}: ${problem}`);
}

async function write(file, text) {
  const out = path.join(dist, file);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, text);
}

const pages = await server.publicPages();
const failures = [];
for (const page of pages) {
  const { html, head } = await server.render(page.path);
  failures.push(...problemsWith(page, html));
  await write(page.path === "/" ? "index.html" : `${page.path.slice(1)}.html`, documentOf({ head, html, assets: assetTags(page.source) }));
}
if (failures.length > 0) {
  throw new Error(`A public page must carry its H1 and lede in its HTML (R-7.6):\n  ${failures.join("\n  ")}`);
}

const app = documentOf({ head: server.appHead() });
if (!NOINDEX.test(app)) throw new Error("app.html must ask not to be indexed (ADR-114).");
await write("app.html", app);

const missing = await server.render("/404");
await write("404.html", documentOf(missing));

await write("robots.txt", server.robotsTxt(server.env));
await write("sitemap.xml", server.sitemapXml(server.env));
await write("llms.txt", server.llmsTxt());
await rm(path.dirname(manifestFile), { recursive: true, force: true });

console.log(`prerender (${server.env}): ${pages.map((page) => page.path).join(" ")}, app.html, 404.html, robots.txt, sitemap.xml, llms.txt`);

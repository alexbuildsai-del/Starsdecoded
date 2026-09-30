// Builds the Friday proposal (rule 23): one page with every post of the week, every slide in both
// sizes, its caption, sound and alt text, and Approve or Ask for changes on each post. The page
// keeps the Owner's answers in its own db (`verdicts/<post id>`), which the session reads back.
//   node proposal.mjs week.json [--out dir]
// week.json: { "week": "5 to 11 Oct 2026", "posts": [{ "dir": "<render out>/p03-slug", "date": "2026-10-05" }] }
// Each dir is a render.mjs output: post.json (with "meta"), alt.txt, 3x4/ and 9x16/.
// Writes proposal.html and files.json ({ published path: source file }) for the Artifact tool's `files`.
// Publish with capabilities {db: {}} to the same artifact every week; a post's "rev" goes up when it
// changes, so an answer given to an older version never counts for the new one.
import fs from "node:fs";
import path from "node:path";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function load(entry) {
  const dir = path.resolve(entry.dir);
  const post = JSON.parse(fs.readFileSync(path.join(dir, "post.json"), "utf8"));
  const alt = fs.readFileSync(path.join(dir, "alt.txt"), "utf8").trim().split("\n").map((l) => l.replace(/^\d+\.\s*/, ""));
  const sizes = {};
  for (const f of ["3x4", "9x16"]) {
    const d = path.join(dir, f);
    if (fs.existsSync(d)) sizes[f] = fs.readdirSync(d).filter((n) => n.endsWith(".png")).sort().map((n) => path.join(d, n));
  }
  if (!sizes["3x4"]?.length) throw new Error(`${dir}: no 3x4 slides; render them first`);
  return { post, meta: post.meta ?? {}, alt, sizes, date: entry.date };
}

function reel(p, f, files) {
  const [w, h] = f === "3x4" ? [1080, 1440] : [1080, 1920];
  const imgs = p.sizes[f].map((src, i) => {
    const pub = `${p.post.id}/${f}/${String(i + 1).padStart(2, "0")}.png`;
    files[pub] = src;
    return `<figure><img src="${pub}" width="${w}" height="${h}" loading="lazy" alt="${esc(p.alt[i] ?? "")}"><figcaption>${i + 1} / ${p.sizes[f].length}</figcaption></figure>`;
  }).join("");
  const label = f === "3x4" ? "Instagram, 3:4" : "TikTok, 9:16";
  return `<div class="reel r${f}" data-size="${f}" tabindex="0" role="region" aria-label="${esc(p.meta.hook ?? p.post.id)}: slides, ${label}"${f === "3x4" ? "" : " hidden"}>${imgs}</div>`;
}

function section(p, n, files) {
  const m = p.meta, id = p.post.id, rev = m.rev ?? 1;
  const sound = m.sound ?? {};
  const tags = (m.hashtags ?? []).map((t) => `#${esc(t.replace(/^#/, ""))}`).join(" ");
  const sizes = Object.keys(p.sizes);
  return `<section class="post" id="${esc(id)}" data-id="${esc(id)}" data-rev="${rev}" aria-labelledby="h-${esc(id)}">
  <div class="post-head"><span class="num">${String(n).padStart(2, "0")}</span>${p.date ? `<span class="when">${esc(DAY.format(new Date(p.date + "T12:00:00Z")))}</span>` : ""}${m.pillar ? `<span class="chip">${esc(m.pillar)}</span>` : ""}<span class="state" data-state>Waiting</span></div>
  <h2 id="h-${esc(id)}">${esc(m.hook ?? id)}</h2>
  ${m.why ? `<p class="why">${esc(m.why)}</p>` : ""}
  ${sizes.length > 1 ? `<div class="sizes" role="group" aria-label="Size">${sizes.map((f, i) => `<button type="button" data-show="${f}" aria-pressed="${i === 0}">${f === "3x4" ? "Instagram 3:4" : "TikTok 9:16"}</button>`).join("")}</div>` : ""}
  ${sizes.map((f) => reel(p, f, files)).join("\n  ")}
  <div class="words">
    <div class="box"><h3>Caption</h3><p class="caption">${esc(m.caption ?? "")}</p>${tags ? `<p class="tags">${tags}</p>` : ""}</div>
    <div class="box"><h3>Sound</h3><dl><dt>TikTok</dt><dd>${esc(sound.tiktok ?? "")}</dd><dt>Instagram</dt><dd>${esc(sound.instagram ?? "")}</dd></dl>${m.notes ? `<h3>Sources</h3><p class="notes">${esc(m.notes)}</p>` : ""}${m.bends ? `<h3>Where it bends a guideline</h3><p class="notes">${esc(m.bends)}</p>` : ""}</div>
  </div>
  <details><summary>Alt text, slide by slide</summary><ol>${p.alt.map((a) => `<li>${esc(a)}</li>`).join("")}</ol></details>
  <div class="verdict" data-verdict hidden>
    <div class="acts"><button type="button" class="yes" data-act="approved">Approve</button><button type="button" class="no" data-act="changes">Ask for changes</button></div>
    <div class="ask" hidden><label for="note-${esc(id)}">What to change</label><textarea id="note-${esc(id)}" rows="3"></textarea><button type="button" class="send" data-act="send">Send</button></div>
    <p class="said" aria-live="polite"></p>
  </div>
</section>`;
}

const STYLE = `
/* One reading column; each post is a row of real slides you swipe, with its words and one answer under it. Dark only, the product's own tokens. */
:root {
  --void: #06080C; --ground: #0D1117; --surface: #11161F; --line: #242C3B; --line-soft: #1A202C;
  --paper: #E8EBF2; --paper-dim: #AEB6C6; --muted: #7C8599; --indigo: #5C6BC0; --indigo-lt: #9FA8DA;
  --brass: #D4B06A; --ok: #7FB08B; --warn: #E0845C;
  --serif: 'Newsreader', Georgia, serif; --sans: 'Inter', system-ui, sans-serif;
  --label: 'Space Grotesk', 'Inter', system-ui, sans-serif; --mono: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
  color-scheme: dark;
}
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
html { background: var(--void); }
body { background: var(--void); color: var(--paper); font: 15px/1.6 var(--sans); padding-inline: 16px; padding-block: 0 72px; -webkit-font-smoothing: antialiased; }
.wrap { max-width: 1040px; margin-inline: auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 56px; }
h1, h2, h3 { font-family: var(--serif); font-weight: 400; margin: 0; text-wrap: balance; }
h1 { font-size: clamp(2.2rem, 5vw, 3.2rem); line-height: 1.05; }
h2 { font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.15; }
h3 { font: 500 11px/1.2 var(--label); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
p { margin: 0; max-width: 68ch; }
header { padding-top: 44px; display: grid; gap: 14px; min-width: 0; }
.eyebrow { font: 500 11.5px/1.2 var(--label); letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.lede { font: 400 1.2rem/1.45 var(--serif); color: var(--paper-dim); }
.tally { font: 13px/1.4 var(--mono); color: var(--paper-dim); font-variant-numeric: tabular-nums; }
nav ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
nav a { color: var(--indigo-lt); text-underline-offset: 3px; }
a:focus-visible, button:focus-visible, .reel:focus-visible, textarea:focus-visible, summary:focus-visible { outline: 2px solid var(--indigo-lt); outline-offset: 3px; }
.post { display: grid; gap: 16px; min-width: 0; border-top: 1px solid var(--line); padding-top: 22px; }
.post-head { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; font: 13px/1.3 var(--mono); color: var(--paper-dim); }
.num { color: var(--paper); }
.chip, .state { font: 500 10.5px/1.2 var(--label); letter-spacing: .1em; text-transform: uppercase; padding: 4px 9px; border-radius: 20px; border: 1px solid var(--line); color: var(--paper-dim); }
.state.approved { border-color: var(--ok); color: var(--ok); }
.state.changes { border-color: var(--warn); color: var(--warn); }
.why { color: var(--paper-dim); }
.sizes { display: flex; gap: 8px; flex-wrap: wrap; }
.sizes button { font: 500 12px/1 var(--label); letter-spacing: .08em; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--ground); color: var(--paper-dim); cursor: pointer; }
.sizes button[aria-pressed="true"] { border-color: var(--indigo); color: var(--paper); }
.reel { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px; min-width: 0; overscroll-behavior-x: contain; }
.reel figure { margin: 0; flex: none; scroll-snap-align: start; display: grid; gap: 6px; }
.r3x4 figure { width: min(78vw, 330px); }
.r9x16 figure { width: min(62vw, 250px); }
.reel img { width: 100%; height: auto; display: block; border-radius: 10px; border: 1px solid var(--line-soft); background: var(--ground); }
.reel figcaption { font: 12px/1 var(--mono); color: var(--muted); }
.words { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 14px; }
.box { background: var(--ground); border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; display: grid; gap: 8px; align-content: start; min-width: 0; }
.caption { white-space: pre-wrap; color: var(--paper); }
.tags, .notes { color: var(--paper-dim); font-size: 14px; }
dl { margin: 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 12px; font-size: 14px; }
dt { color: var(--muted); } dd { margin: 0; color: var(--paper); }
details { color: var(--paper-dim); font-size: 14px; }
summary { cursor: pointer; color: var(--paper); }
details ol { padding-left: 20px; display: grid; gap: 4px; }
.verdict { display: grid; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
.acts { display: flex; gap: 10px; flex-wrap: wrap; }
.verdict button { font: 600 14px/1 var(--sans); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--line); background: var(--ground); color: var(--paper); cursor: pointer; }
.verdict .yes { border-color: var(--ok); }
.verdict .no { border-color: var(--warn); }
.verdict button:disabled { opacity: .5; cursor: default; }
.ask { display: grid; gap: 8px; }
.ask label { font-size: 13px; color: var(--paper-dim); }
textarea { width: 100%; font: 15px/1.5 var(--sans); color: var(--paper); background: var(--ground); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; resize: vertical; }
.said { font-size: 14px; color: var(--paper-dim); }
.fallback { color: var(--paper-dim); border-left: 2px solid var(--paper-dim); padding-left: 14px; }
@media (prefers-reduced-motion: no-preference) { .reel { scroll-behavior: smooth; } }
`;

const SCRIPT = `
document.querySelectorAll(".post").forEach((post) => {
  post.querySelectorAll(".sizes button").forEach((b) => b.addEventListener("click", () => {
    post.querySelectorAll(".sizes button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    post.querySelectorAll(".reel").forEach((r) => { r.hidden = r.dataset.size !== b.dataset.show; });
  }));
});
const posts = [...document.querySelectorAll(".post")];
const tally = document.querySelector("[data-tally]");
let answers = {};
function render() {
  let yes = 0, change = 0;
  for (const post of posts) {
    const a = answers[post.dataset.id], cur = a && String(a.rev) === post.dataset.rev ? a : null;
    const state = post.querySelector("[data-state]"), said = post.querySelector(".said");
    state.className = "state" + (cur ? " " + cur.verdict : "");
    state.textContent = cur ? (cur.verdict === "approved" ? "Approved" : "Changes asked") : "Waiting";
    if (cur?.verdict === "approved") yes++;
    if (cur?.verdict === "changes") change++;
    said.textContent = cur ? (cur.verdict === "approved" ? "You approved this version." : "You asked for: " + cur.note)
      : a ? "Updated since your last answer, which was: " + (a.verdict === "approved" ? "approved" : a.note) : "";
  }
  tally.textContent = yes + " of " + posts.length + " approved · " + change + " with changes · " + (posts.length - yes - change) + " waiting";
}
function fallback() {
  const p = document.querySelector("[data-fallback]");
  p.hidden = false;
}
(async () => {
  const db = window.claude?.use ? await window.claude.use("db") : null;
  if (!db) return fallback();
  for (const post of posts) {
    const box = post.querySelector("[data-verdict]"), ask = box.querySelector(".ask"), note = box.querySelector("textarea");
    box.hidden = false;
    const save = async (verdict, text) => {
      box.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        await db.doc("verdicts/" + post.dataset.id).set({ verdict, note: text, rev: Number(post.dataset.rev), at: new Date().toISOString() });
        ask.hidden = true;
      } catch (e) {
        box.querySelector(".said").textContent = "That didn't save (" + (e?.code || "error") + "). Reply in the chat instead.";
      } finally {
        box.querySelectorAll("button").forEach((b) => (b.disabled = false));
      }
    };
    box.querySelector(".yes").addEventListener("click", () => save("approved", ""));
    box.querySelector(".no").addEventListener("click", () => { ask.hidden = false; note.focus(); });
    box.querySelector(".send").addEventListener("click", () => {
      const text = note.value.trim();
      if (!text) { box.querySelector(".said").textContent = "Say what to change first."; note.focus(); return; }
      save("changes", text);
    });
  }
  db.collection("verdicts").onSnapshot((snap) => {
    answers = {};
    snap.docs.forEach((d) => { if (d.exists) answers[d.id] = d.data(); });
    render();
  }, () => fallback());
})();
render();
`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) { console.log("usage: node proposal.mjs week.json [--out dir]"); process.exit(1); }
  const opt = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const week = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = path.resolve(opt("--out", path.join(path.dirname(path.resolve(file)), "proposal")));
  const files = {};
  const list = week.posts.map(load);
  const body = list.map((p, i) => section(p, i + 1, files)).join("\n\n");
  const nav = list.map((p, i) => `<li><a href="#${esc(p.post.id)}">${String(i + 1).padStart(2, "0")} · ${esc(p.meta.hook ?? p.post.id)}</a></li>`).join("");
  const html = `<title>Social Week</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400&family=Space+Grotesk:wght@500&display=swap">
<style>${STYLE}</style>
<div class="wrap">
<header>
  <p class="eyebrow">For your yes · ${esc(week.week ?? "")}</p>
  <h1>Next week's posts</h1>
  <p class="lede">Every post as it will look, slide by slide, with its caption and sound. Approve each one or say what to change. Nothing is finished or scheduled until you approve it.</p>
  <p class="tally" data-tally aria-live="polite"></p>
  <p class="fallback" data-fallback hidden>Answers can't be saved on this page right now. Reply in the chat with the post number and "approve", or what to change.</p>
  <nav aria-label="Posts"><ol>${nav}</ol></nav>
</header>

${body}
</div>
<script>${SCRIPT}</script>
`;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "proposal.html"), html);
  fs.writeFileSync(path.join(out, "files.json"), JSON.stringify(files, null, 1) + "\n");
  const bytes = Object.values(files).reduce((n, f) => n + fs.statSync(f).size, 0);
  console.log(`${list.length} posts, ${Object.keys(files).length} slides (${(bytes / 1e6).toFixed(1)} MB) -> ${path.join(out, "proposal.html")}`);
  if (Object.keys(files).length > 250 || bytes > 60e6) console.log("Over one publish (255 files, 64 MB): publish the 9x16 slides in a second call to the same url.");
}

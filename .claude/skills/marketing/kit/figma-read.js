// A read-only use_figma call: every text layer of one post's frames on the Posts page, as the Owner left them.
// Replace POST_ID with the post's id (p01-moon-hurt) before passing the file. Nothing in the file changes.
const pg = figma.root.children.find((x) => x.name === "Posts");
await figma.setCurrentPageAsync(pg);
const frames = pg.findAll((n) => n.type === "FRAME" && n.name.startsWith("POST_ID · "));
return frames.map((f) => ({
  frame: f.name,
  texts: f.findAll((n) => n.type === "TEXT").map((t) => ({ role: t.name, characters: t.characters })),
}));

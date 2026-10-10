export type DocBlock =
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; text: string };

export type DocSpan = { code: boolean; text: string };

/** The few shapes a part's doc page uses, so the admin page needs no markdown dependency. */
export function parseDoc(source: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  let list: string[] | null = null;

  const flush = () => {
    if (para.length) blocks.push({ kind: "paragraph", text: para.join(" ") });
    if (list) blocks.push({ kind: "list", items: list });
    para = [];
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) {
      flush();
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].trimStart().startsWith("```"); i++) body.push(lines[i]);
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3 | 4, text: heading[2] });
      continue;
    }
    const item = /^\s*[-*]\s+(.*\S)\s*$/.exec(line);
    if (item) {
      if (para.length) flush();
      (list ??= []).push(item[1]);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    if (list) flush();
    para.push(line.trim());
  }
  flush();
  return blocks;
}

/** Splits a line at its `code` spans. */
export function spans(text: string): DocSpan[] {
  return text
    .split(/`([^`]+)`/)
    .map((part, i) => ({ code: i % 2 === 1, text: part }))
    .filter((s) => s.text);
}

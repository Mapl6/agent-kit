export type Frontmatter = Record<string, string | string[]>;

export type ParsedDocument = {
  /** null when the file has no `---` frontmatter block. */
  data: Frontmatter | null;
  body: string;
  error?: string;
};

function unquote(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

/**
 * Minimal YAML frontmatter reader for the fields Agent Kit uses: scalar
 * strings, `>`/`|` blocks, inline `[a, b]` lists and `- item` lists. Nested
 * maps (e.g. a skill's `metadata`) are skipped, not interpreted. No YAML
 * library: the input is untrusted and only a tiny subset is needed.
 */
export function parseFrontmatter(text: string): ParsedDocument {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { data: null, body: normalized };
  const end = normalized.indexOf("\n---", 4);
  if (end === -1)
    return { data: null, body: normalized, error: "frontmatter is not closed with ---" };
  const afterClose = normalized.indexOf("\n", end + 4);
  const body = afterClose === -1 ? "" : normalized.slice(afterClose + 1);

  const lines = normalized.slice(4, end).split("\n");
  const data: Frontmatter = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\s/.test(line)) continue; // nested content of a key we skipped
    const match = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (!match)
      return { data: null, body, error: `cannot read frontmatter line: ${line.slice(0, 60)}` };
    const key = match[1]!;
    const rest = match[2]!.trim();

    if (rest === ">" || rest === "|" || rest === ">-" || rest === "|-") {
      const block: string[] = [];
      while (i + 1 < lines.length && (/^\s/.test(lines[i + 1]!) || lines[i + 1] === "")) {
        block.push(lines[++i]!.trim());
      }
      data[key] = rest.startsWith(">") ? block.join(" ").trim() : block.join("\n").trim();
    } else if (rest.startsWith("[") && rest.endsWith("]")) {
      data[key] = splitList(rest.slice(1, -1)).map(unquote).filter(Boolean);
    } else if (rest === "") {
      const items: string[] = [];
      while (i + 1 < lines.length && /^\s+-\s/.test(lines[i + 1]!)) {
        items.push(unquote(lines[++i]!.replace(/^\s+-\s/, "")));
      }
      if (items.length > 0) data[key] = items;
      // otherwise a nested map we don't interpret (its indented lines are skipped above)
    } else {
      data[key] = unquote(rest);
    }
  }
  return { data, body };
}

/** Split on commas that aren't inside `{…}`, so `src/*.{ts,tsx}, lib/*` stays two globs. */
export function splitList(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "{") depth += 1;
    if (ch === "}") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      out.push(current);
      current = "";
    } else current += ch;
  }
  out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** A list field that may also be written as a comma-separated string. */
export function listField(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value.map((s) => s.trim()).filter(Boolean) : splitList(value);
}

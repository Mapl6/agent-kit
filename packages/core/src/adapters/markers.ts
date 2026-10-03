/**
 * Agent Kit only ever edits text between these two lines. Everything outside
 * them belongs to the developer and is preserved byte-for-byte.
 */
export const BEGIN_MARKER =
  '<!-- BEGIN AGENT-KIT: generated, edits inside this block are overwritten by "agent-kit sync" -->';
export const END_MARKER = "<!-- END AGENT-KIT -->";

const BEGIN_LINE = /^<!-- BEGIN AGENT-KIT\b.*-->[ \t]*$/gm;
const END_LINE = /^<!-- END AGENT-KIT -->[ \t]*$/gm;

export type BlockLocation =
  | { kind: "none" }
  | { kind: "block"; start: number; end: number; body: string }
  | { kind: "malformed"; reason: string };

/** Find the single Agent Kit block. `end` includes the END line's newline, if any. */
export function locateBlock(text: string): BlockLocation {
  const begins = [...text.matchAll(BEGIN_LINE)];
  const ends = [...text.matchAll(END_LINE)];
  if (begins.length === 0 && ends.length === 0) return { kind: "none" };
  if (begins.length !== 1 || ends.length !== 1) {
    return {
      kind: "malformed",
      reason: `expected one BEGIN/END AGENT-KIT pair, found ${begins.length} BEGIN and ${ends.length} END`,
    };
  }
  const begin = begins[0]!;
  const end = ends[0]!;
  if (end.index < begin.index)
    return { kind: "malformed", reason: "END AGENT-KIT comes before BEGIN" };

  const bodyStart = begin.index + begin[0].length + 1;
  let blockEnd = end.index + end[0].length;
  if (text[blockEnd] === "\n") blockEnd += 1;
  return {
    kind: "block",
    start: begin.index,
    end: blockEnd,
    body: text.slice(bodyStart, Math.max(bodyStart, end.index - 1)),
  };
}

/** Blank lines around the body keep the block stable under Markdown formatters (Prettier). */
export function renderBlock(body: string): string {
  return `${BEGIN_MARKER}\n\n${body.trim()}\n\n${END_MARKER}\n`;
}

/** Text outside the block (for "does the user already do X?" checks). */
export function outsideBlock(text: string): string {
  const loc = locateBlock(text);
  return loc.kind === "block" ? text.slice(0, loc.start) + text.slice(loc.end) : text;
}

/** Append a block to existing content; returns the new text and the separator used. */
export function appendBlock(text: string, body: string): { text: string; separator: string } {
  const separator = text.length === 0 ? "" : text.endsWith("\n") ? "\n" : "\n\n";
  return { text: text + separator + renderBlock(body), separator };
}

export function replaceBlock(text: string, start: number, end: number, body: string): string {
  return text.slice(0, start) + renderBlock(body) + text.slice(end);
}

/**
 * Remove the block. When it's still the last thing in the file, the separator
 * added on append is removed too, restoring the original bytes exactly.
 */
export function stripBlock(text: string, separator: string): string | null {
  const loc = locateBlock(text);
  if (loc.kind !== "block") return null;
  let before = text.slice(0, loc.start);
  const after = text.slice(loc.end);
  if (after.length === 0 && separator && before.endsWith(separator)) {
    before = before.slice(0, -separator.length);
  } else if (after.length > 0 && before.endsWith("\n\n") && after.startsWith("\n")) {
    before = before.slice(0, -1);
  }
  return before + after;
}

import fs from "node:fs/promises";
import path from "node:path";
import { createFileProbe, readInstallManifest } from "../adapters/installer.js";
import { outsideBlock } from "../adapters/markers.js";
import type { ProjectModel } from "../intelligence/types.js";

/**
 * Tool choices where a project normally picks exactly one. Package managers
 * only count when used as a command ("pnpm install", "use yarn"), because the
 * bare word "npm" also means the registry.
 */
const CATEGORIES: Array<{
  id: string;
  label: string;
  tools: Array<{ id: string; pattern: RegExp }>;
}> = [
  {
    id: "packageManager",
    label: "package manager",
    tools: ["npm", "pnpm", "yarn", "bun"].map((id) => ({
      id,
      pattern: new RegExp(
        `\\b(?:use|using|with|prefer)\\s+${id}\\b|\\b${id}\\s+(?:install|i|add|ci|run|exec|dlx|remove|test|x)\\b`,
        "i",
      ),
    })),
  },
  {
    id: "unitTest",
    label: "test runner",
    tools: ["vitest", "jest", "mocha"].map((id) => ({
      id,
      pattern: new RegExp(`\\b${id}\\b`, "i"),
    })),
  },
  {
    id: "e2eTest",
    label: "end-to-end test tool",
    tools: ["playwright", "cypress"].map((id) => ({ id, pattern: new RegExp(`\\b${id}\\b`, "i") })),
  },
  {
    id: "linter",
    label: "linter",
    tools: [
      { id: "eslint", pattern: /\beslint\b/i },
      { id: "biome", pattern: /\bbiome\b/i },
      { id: "oxlint", pattern: /\boxlint\b/i },
    ],
  },
  {
    id: "formatter",
    label: "formatter",
    tools: [
      { id: "prettier", pattern: /\bprettier\b/i },
      { id: "biome", pattern: /\bbiome\b/i },
      { id: "dprint", pattern: /\bdprint\b/i },
    ],
  },
];

const NEGATION =
  /\b(?:don't|dont|do not|never|avoid|instead of|rather than|not|no longer|stop using|replace[ds]?|migrat(?:e|ed|ing) (?:away )?from)\b/i;

/** Map repo detections onto conflict categories. */
const DETECTION_CATEGORY: Record<string, string> = {
  npm: "packageManager",
  pnpm: "packageManager",
  yarn: "packageManager",
  bun: "packageManager",
  vitest: "unitTest",
  jest: "unitTest",
  playwright: "e2eTest",
  cypress: "e2eTest",
  eslint: "linter",
  prettier: "formatter",
};

export type Statement = {
  file: string;
  line: number;
  tool: string;
  /** true: recommends the tool; false: rules it out ("don't use jest"). */
  positive: boolean;
  /** The line, trimmed and shortened. Terminal output only, never written to agent files. */
  text: string;
};

export type Conflict = {
  category: string;
  /** contradicts-repo: instructions disagree with what the repo uses. sources-disagree: files disagree with each other. */
  kind: "contradicts-repo" | "sources-disagree";
  /** The tool the repository actually uses, when known. */
  detected: string | null;
  message: string;
  statements: Statement[];
};

/** Instruction files developers and other tools write for agents. */
const SOURCE_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "CLAUDE.local.md",
  ".claude/CLAUDE.md",
  "GEMINI.md",
  ".cursorrules",
  ".github/copilot-instructions.md",
];
const SOURCE_DIRS: Array<{ dir: string; match: RegExp }> = [
  { dir: ".claude/rules", match: /\.md$/ },
  { dir: ".cursor/rules", match: /\.mdc$/ },
  { dir: ".github/instructions", match: /\.instructions\.md$/ },
  { dir: ".agent-kit/rules", match: /\.md$/ },
];

async function listFiles(root: string, dir: string, match: RegExp, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  const abs = path.join(root, dir);
  const st = await fs.lstat(abs).catch(() => null);
  if (!st?.isDirectory()) return [];
  const out: string[] = [];
  for (const entry of await fs.readdir(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await listFiles(root, rel, match, depth + 1)));
    else if (entry.isFile() && match.test(entry.name)) out.push(rel);
  }
  return out.sort();
}

function extract(file: string, text: string): Statement[] {
  const statements: Statement[] = [];
  const lines = text.split("\n");
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    for (const sentence of line.split(/(?<=[.;!?])\s+/)) {
      for (const category of CATEGORIES) {
        for (const tool of category.tools) {
          const match = tool.pattern.exec(sentence);
          if (!match) continue;
          const before = sentence.slice(0, match.index);
          statements.push({
            file,
            line: index + 1,
            tool: tool.id,
            positive: !NEGATION.test(before),
            text: line.length > 140 ? `${line.slice(0, 137)}...` : line,
          });
        }
      }
    }
  });
  return statements;
}

/**
 * Find instructions that contradict the repository or each other. Heuristic
 * and deliberately conservative: results are surfaced for a human to resolve,
 * never acted on automatically.
 */
export async function detectConflicts(root: string, model: ProjectModel): Promise<Conflict[]> {
  const probe = createFileProbe(root);
  const manifest = await readInstallManifest(root);
  const generated = new Set(
    Object.entries(manifest.files)
      .filter(([, e]) => e.kind === "file")
      .map(([p]) => p),
  );

  const files = [...SOURCE_FILES];
  for (const { dir, match } of SOURCE_DIRS) files.push(...(await listFiles(root, dir, match)));

  const statements: Statement[] = [];
  for (const file of files) {
    if (generated.has(file)) continue;
    const text = await probe.read(file);
    if (text === null) continue;
    statements.push(...extract(file, outsideBlock(text)));
  }

  const conflicts: Conflict[] = [];
  for (const category of CATEGORIES) {
    const ids = new Set(category.tools.map((t) => t.id));
    const inCategory = statements.filter((s) => ids.has(s.tool));
    if (inCategory.length === 0) continue;

    const detected =
      model.detections.find(
        (d) =>
          DETECTION_CATEGORY[d.id] === category.id &&
          d.source.type === "detected" &&
          d.location === ".",
      )?.id ?? null;

    if (detected) {
      // A recommendation for a different tool, from a file that never recommends the detected one.
      const byFile = new Map<string, Statement[]>();
      for (const s of inCategory) byFile.set(s.file, [...(byFile.get(s.file) ?? []), s]);
      const bad: Statement[] = [];
      for (const list of byFile.values()) {
        const endorsesDetected = list.some((s) => s.tool === detected && s.positive);
        bad.push(
          ...list.filter(
            (s) =>
              (s.tool !== detected && s.positive && !endorsesDetected) ||
              (s.tool === detected && !s.positive),
          ),
        );
      }
      if (bad.length > 0) {
        conflicts.push({
          category: category.id,
          kind: "contradicts-repo",
          detected,
          message: `Instructions disagree with the ${category.label} this repo uses (${detected}).`,
          statements: bad,
        });
      }
      continue;
    }

    const positives = inCategory.filter((s) => s.positive);
    const tools = new Set(positives.map((s) => s.tool));
    const files2 = new Set(positives.map((s) => s.file));
    if (tools.size > 1 && files2.size > 1) {
      conflicts.push({
        category: category.id,
        kind: "sources-disagree",
        detected: null,
        message: `Instruction files recommend different ${category.label}s (${[...tools].join(", ")}).`,
        statements: positives,
      });
    }
  }
  return conflicts;
}

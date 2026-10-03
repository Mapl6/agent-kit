import path from "node:path";
import type { Evidence } from "../../domain/types.js";
import type { Detector, DetectorOutput, ScanContext } from "../types.js";

type ConfigSpec = {
  id: string;
  label: string;
  /** Exact repo-relative files. */
  files?: string[];
  /** Instruction files that may also appear in subdirectories (matched by basename). */
  anyDepth?: string;
  /** Directories, reported with a file count. */
  dirs?: string[];
};

/**
 * Agent-facing configuration on disk. Reports presence, location and size only.
 * Contents are repository data and are never read or interpreted here: they
 * may contain prompt injection, and deciding what they mean is a later phase.
 * Labels name the file or directory, not an agent, so the scan makes no claims
 * about which agent honours which file.
 */
const SPECS: ConfigSpec[] = [
  { id: "agents-md", label: "AGENTS.md", anyDepth: "AGENTS.md" },
  { id: "claude-md", label: "CLAUDE.md", anyDepth: "CLAUDE.md", files: ["CLAUDE.local.md"] },
  { id: "gemini-md", label: "GEMINI.md", anyDepth: "GEMINI.md" },
  { id: "cursorrules", label: ".cursorrules", files: [".cursorrules"] },
  { id: "cursor-dir", label: ".cursor/", dirs: [".cursor"] },
  {
    id: "copilot-instructions",
    label: "Copilot instructions",
    files: [".github/copilot-instructions.md"],
    dirs: [".github/instructions"],
  },
  {
    id: "github-agent-dirs",
    label: ".github agent dirs",
    dirs: [".github/agents", ".github/skills", ".github/hooks", ".github/prompts"],
  },
  { id: "claude-dir", label: ".claude/", dirs: [".claude"] },
  { id: "agents-dir", label: ".agents/", dirs: [".agents"] },
  { id: "codex-dir", label: ".codex/", dirs: [".codex"] },
  {
    id: "mcp-config",
    label: "MCP config",
    files: [".mcp.json", ".cursor/mcp.json", ".vscode/mcp.json"],
  },
];

/** Test-fixture trees hold other projects' files, not this project's agent config. */
const FIXTURE_DIRS = new Set(["fixtures", "__fixtures__", "testdata"]);

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function collect(ctx: ScanContext, spec: ConfigSpec): Evidence[] {
  const evidence: Evidence[] = [];
  const seen = new Set<string>();
  const addFile = (p: string) => {
    const entry = ctx.get(p);
    if (!entry || seen.has(p)) return;
    seen.add(p);
    evidence.push({ kind: "file", path: p, detail: formatBytes(entry.sizeBytes) });
  };

  for (const f of spec.files ?? []) addFile(f);
  if (spec.anyDepth) {
    const matches = ctx.files
      .filter(
        (f) =>
          path.posix.basename(f.relativePath) === spec.anyDepth &&
          !f.relativePath.split("/").some((seg) => FIXTURE_DIRS.has(seg)),
      )
      .map((f) => f.relativePath)
      .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
    for (const p of matches) addFile(p);
  }
  for (const dir of spec.dirs ?? []) {
    const count = ctx.files.filter((f) => f.relativePath.startsWith(`${dir}/`)).length;
    if (count > 0)
      evidence.push({
        kind: "directory",
        path: `${dir}/`,
        detail: `${count} file${count === 1 ? "" : "s"}`,
      });
  }
  return evidence;
}

export const agentConfigDetector: Detector = {
  id: "agent-config",
  category: "agentConfig",
  scope: "repo",
  async detect(ctx) {
    const out: DetectorOutput[] = [];
    for (const spec of SPECS) {
      const evidence = collect(ctx, spec);
      if (evidence.length === 0) continue;
      out.push({
        id: spec.id,
        label: spec.label,
        confidence: "high",
        evidence,
      });
    }
    return out;
  },
};

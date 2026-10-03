import type { Evidence } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import type { ProjectModel } from "../intelligence/types.js";
import { AGENT_IDS, type AgentAdapter, type AgentId } from "./types.js";

const VERIFIED = "2026-10-03";

const evidenceFor =
  (ids: string[]) =>
  (model: ProjectModel): Evidence[] =>
    model.detections.filter((d) => ids.includes(d.id)).flatMap((d) => d.evidence);

/** The portable baseline: a managed block in the root AGENTS.md. Always on. */
const agentsMd: AgentAdapter = {
  id: "agents-md",
  label: "AGENTS.md (portable)",
  mode: "native",
  capabilities: { agentsMd: "yes", nestedAgentsMd: "yes", imports: "no", pathScopedRules: "no" },
  notes:
    "Canonical output. Read natively by Codex, Cursor, Copilot (most surfaces) and Claude Code.",
  docs: ["https://agents.md"],
  verifiedAt: VERIFIED,
  detect: evidenceFor(["agents-md"]),
  async targets({ context }) {
    return [{ adapter: "agents-md", path: "AGENTS.md", body: context, createIfMissing: true }];
  },
};

const IMPORTS_AGENTS_MD = /^@(\.\.\/)?AGENTS\.md[ \t]*$/m;

/**
 * Claude Code reads AGENTS.md only when there is no CLAUDE.md. When the repo has
 * one, add an `@AGENTS.md` import so the shared context still loads.
 */
const claudeCode: AgentAdapter = {
  id: "claude-code",
  label: "Claude Code",
  mode: "import",
  capabilities: {
    agentsMd: "partial",
    nestedAgentsMd: "yes",
    imports: "yes",
    pathScopedRules: "yes",
  },
  notes:
    "Reads AGENTS.md only when no CLAUDE.md exists (v2.1.277+); otherwise CLAUDE.md must import @AGENTS.md.",
  docs: ["https://code.claude.com/docs/en/memory"],
  verifiedAt: VERIFIED,
  detect: evidenceFor(["claude-md", "claude-dir"]),
  async targets({ files, explicit }) {
    const skipWhen = (outside: string) =>
      IMPORTS_AGENTS_MD.test(outside) ? "already imports AGENTS.md" : null;
    if (await files.isFile("CLAUDE.md")) {
      return [
        {
          adapter: "claude-code",
          path: "CLAUDE.md",
          body: "@AGENTS.md",
          createIfMissing: false,
          skipWhen,
        },
      ];
    }
    if (await files.isFile(".claude/CLAUDE.md")) {
      return [
        {
          adapter: "claude-code",
          path: ".claude/CLAUDE.md",
          body: "@../AGENTS.md",
          createIfMissing: false,
          skipWhen,
        },
      ];
    }
    // A personal CLAUDE.local.md also stops Claude reading AGENTS.md; don't edit
    // the personal file, add a shared CLAUDE.md instead. Same when asked explicitly,
    // which also covers Claude Code versions without native AGENTS.md support.
    if (explicit || (await files.isFile("CLAUDE.local.md"))) {
      return [
        { adapter: "claude-code", path: "CLAUDE.md", body: "@AGENTS.md", createIfMissing: true },
      ];
    }
    return [];
  },
};

/** Cursor reads root and nested AGENTS.md; nothing else to write until path rules (Phase 4). */
const cursor: AgentAdapter = {
  id: "cursor",
  label: "Cursor",
  mode: "native",
  capabilities: {
    agentsMd: "yes",
    nestedAgentsMd: "yes",
    imports: "unverified",
    pathScopedRules: "yes",
  },
  notes:
    "Reads AGENTS.md in the root and subdirectories. .cursor/rules (.mdc) are reserved for path rules.",
  docs: ["https://cursor.com/docs/context/rules"],
  verifiedAt: VERIFIED,
  detect: evidenceFor(["cursor-dir", "cursorrules"]),
  async targets() {
    return [];
  },
};

/** Codex concatenates AGENTS.md from the repo root down to the working directory. */
const codex: AgentAdapter = {
  id: "codex",
  label: "Codex",
  mode: "native",
  capabilities: {
    agentsMd: "yes",
    nestedAgentsMd: "yes",
    imports: "unverified",
    pathScopedRules: "unverified",
  },
  notes:
    "Reads AGENTS.md from the repo root down; stops at 32 KiB combined (project_doc_max_bytes).",
  docs: ["https://learn.chatgpt.com/docs/agent-configuration/agents-md"],
  verifiedAt: VERIFIED,
  detect: evidenceFor(["codex-dir"]),
  async targets() {
    return [];
  },
};

/**
 * `.github/copilot-instructions.md` is the one file every Copilot surface reads;
 * AGENTS.md is missing from Visual Studio, JetBrains chat and GitHub.com chat.
 */
const copilot: AgentAdapter = {
  id: "copilot",
  label: "GitHub Copilot",
  mode: "translated",
  capabilities: {
    agentsMd: "partial",
    nestedAgentsMd: "yes",
    imports: "no",
    pathScopedRules: "yes",
  },
  notes:
    "copilot-instructions.md works in every Copilot surface; AGENTS.md only in some, so the context is copied in.",
  docs: [
    "https://docs.github.com/en/copilot/reference/custom-instructions-support",
    "https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions",
  ],
  verifiedAt: VERIFIED,
  detect: evidenceFor(["copilot-instructions"]),
  async targets({ context }) {
    return [
      {
        adapter: "copilot",
        path: ".github/copilot-instructions.md",
        body: context,
        createIfMissing: true,
      },
    ];
  },
};

export const ADAPTERS: readonly AgentAdapter[] = [agentsMd, claudeCode, cursor, codex, copilot];

export function getAdapter(id: AgentId): AgentAdapter {
  return ADAPTERS.find((a) => a.id === id)!;
}

const ALIASES: Record<string, AgentId> = {
  claude: "claude-code",
  agents: "agents-md",
  generic: "agents-md",
};

/**
 * Parse a user's `--agents` list. `agents-md` is always included (other adapters
 * build on it), and so are native adapters: they read AGENTS.md themselves, so
 * they're covered whenever it exists.
 */
export function parseAgentList(input: string | string[]): AgentId[] {
  const raw = (Array.isArray(input) ? input : input.split(","))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const ids = new Set<AgentId>(ADAPTERS.filter((a) => a.mode === "native").map((a) => a.id));
  for (const name of raw) {
    const id = (ALIASES[name] ?? name) as AgentId;
    if (!AGENT_IDS.includes(id)) {
      throw new AppError({
        code: "UNSUPPORTED_OPERATION",
        message: `Unknown agent "${name}".`,
        suggestedAction: `Use any of: ${AGENT_IDS.join(", ")} (alias: claude).`,
      });
    }
    ids.add(id);
  }
  return AGENT_IDS.filter((id) => ids.has(id));
}

/** Default selection: AGENTS.md and native agents, plus every agent with config already in the repo. */
export function defaultAgents(model: ProjectModel): AgentId[] {
  return AGENT_IDS.filter(
    (id) => getAdapter(id).mode === "native" || getAdapter(id).detect(model).length > 0,
  );
}

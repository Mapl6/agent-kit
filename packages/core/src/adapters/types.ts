import type { Evidence } from "../domain/types.js";
import type { ProjectModel } from "../intelligence/types.js";
import type { Rule } from "../rules/rules.js";
import type { Skill } from "../rules/skills.js";

export const AGENT_IDS = ["agents-md", "claude-code", "cursor", "codex", "copilot"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

/** Whether the agent supports a capability, per its documentation on `verifiedAt`. */
export type Support = "yes" | "partial" | "no" | "unverified";

export type AgentCapabilities = {
  /** Reads a root `AGENTS.md` as project instructions. */
  agentsMd: Support;
  /** Reads `AGENTS.md` files in subdirectories. */
  nestedAgentsMd: Support;
  /** Its own instruction file can include another file. */
  imports: Support;
  /** Instructions scoped to file globs (used from Phase 4). */
  pathScopedRules: Support;
};

/**
 * How Agent Kit reaches the agent:
 * - native: the agent reads AGENTS.md itself, nothing else is written
 * - import: the agent's own file imports AGENTS.md
 * - translated: the context is copied into the agent's own file
 */
export type AdapterMode = "native" | "import" | "translated";

/** A managed block an adapter wants in a file. The installer owns merging and safety. */
export type BlockTarget = {
  kind: "block";
  adapter: AgentId;
  /** Repo-relative file path. */
  path: string;
  /** Block body, without the BEGIN/END marker lines. */
  body: string;
  /** Create the file if it doesn't exist. */
  createIfMissing: boolean;
  /**
   * Called with the file's content outside any Agent Kit block; returns a
   * reason to leave the file alone (e.g. it already imports AGENTS.md).
   */
  skipWhen?: (outsideBlock: string) => string | null;
};

/**
 * A whole file Agent Kit generates and owns (rule translations, skill copies).
 * Ownership is proven by the manifest's content hash, so a hand-edited copy is
 * never overwritten.
 */
export type FileTarget = {
  kind: "file";
  adapter: AgentId;
  path: string;
  content: Buffer;
};

export type AdapterTarget = BlockTarget | FileTarget;

/** Read-only, symlink-safe view of the files adapters may inspect. */
export type FileProbe = {
  isFile(relativePath: string): Promise<boolean>;
  read(relativePath: string): Promise<string | null>;
};

export type AdapterContext = {
  model: ProjectModel;
  /** The shared context, rendered once from the model. */
  context: string;
  files: FileProbe;
  /** True when the user asked for this adapter explicitly (vs. auto-detected). */
  explicit: boolean;
  /** Valid rules from .agent-kit/rules/. */
  rules: Rule[];
  /** Valid skills cleared for distribution (no scripts, or scripts approved). */
  skills: Skill[];
};

export interface AgentAdapter {
  id: AgentId;
  label: string;
  mode: AdapterMode;
  capabilities: AgentCapabilities;
  /** One-line, doc-backed summary of how this agent loads instructions. */
  notes: string;
  /** Provider documentation the capabilities were checked against. */
  docs: string[];
  verifiedAt: string;
  /** Evidence that this agent is in use in the repository (from the scan). */
  detect(model: ProjectModel): Evidence[];
  targets(ctx: AdapterContext): Promise<AdapterTarget[]>;
}

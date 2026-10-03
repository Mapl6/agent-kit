import type { PlannedWrite } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import { buildProjectIndex } from "../indexer/orchestrate.js";
import type {
  ConfigRepository,
  ProjectModelRepository,
  SnapshotRepository,
} from "../ports/repositories.js";
import { defaultAgents, parseAgentList } from "../adapters/registry.js";
import type { AgentId } from "../adapters/types.js";
import { changedRepoFiles, installAgents, toPlannedWrites } from "./agents.js";

export type SyncOptions = {
  path: string;
  /** Replace the enabled agents (comma list or array). Omit to keep the configured set. */
  agents?: string | string[];
  dryRun?: boolean;
};

export type SyncDeps = {
  configs: ConfigRepository;
  snapshots: SnapshotRepository;
  models: ProjectModelRepository;
  now?: () => Date;
};

export type SyncResult = {
  projectRoot: string;
  agents: AgentId[];
  writes: PlannedWrite[];
  warnings: string[];
  conflicts: number;
  dryRun: boolean;
};

/** Re-index, then regenerate every enabled agent's files from the fresh model. */
export async function syncProject(options: SyncOptions, deps: SyncDeps): Promise<SyncResult> {
  const projectRoot = await resolveProjectRoot(options.path);
  if (!(await deps.configs.exists(projectRoot))) {
    throw new AppError({
      code: "CONFIG_INVALID",
      message: "Project is not initialized (missing .agent-kit/config.json).",
      suggestedAction: "Run `agent-kit init` first (or `agent-kit init --dry-run` to preview).",
    });
  }
  const dryRun = Boolean(options.dryRun);
  const stored = await deps.configs.read(projectRoot);
  const config = { ...stored, projectRoot };

  const index = await buildProjectIndex(config, {
    snapshots: deps.snapshots,
    models: deps.models,
    now: deps.now,
    dryRun,
  });

  const explicit = options.agents !== undefined ? parseAgentList(options.agents) : [];
  const agents =
    options.agents !== undefined
      ? explicit
      : config.agents
        ? config.agents.length > 0
          ? parseAgentList(config.agents)
          : [] // set up with --no-agents
        : defaultAgents(index.model);

  const result = await installAgents({
    root: projectRoot,
    model: index.model,
    agents,
    explicit,
    dryRun,
    now: deps.now?.(),
  });

  if (!dryRun && changedRepoFiles(result.writes)) {
    await buildProjectIndex(config, {
      snapshots: deps.snapshots,
      models: deps.models,
      now: deps.now,
    });
  }

  const writes: PlannedWrite[] = [...index.writes, ...toPlannedWrites(result.writes)];
  const agentsChanged = JSON.stringify(stored.agents) !== JSON.stringify(agents);
  if (agentsChanged) {
    writes.unshift({ path: ".agent-kit/config.json", action: "update", reason: "agents" });
    if (!dryRun)
      await deps.configs.write({ ...stored, agents, updatedAt: new Date().toISOString() });
  }

  return {
    projectRoot,
    agents,
    writes,
    warnings: result.warnings,
    conflicts: result.conflicts,
    dryRun,
  };
}

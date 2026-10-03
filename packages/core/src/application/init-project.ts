import {
  CONFIG_SCHEMA_VERSION,
  DEFAULT_MAX_FILE_BYTES,
  type IndexResult,
  type PlannedWrite,
  type ProjectConfig,
} from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import type {
  ConfigRepository,
  ProjectModelRepository,
  SnapshotRepository,
} from "../ports/repositories.js";
import { buildProjectIndex } from "../indexer/orchestrate.js";
import { defaultAgents, parseAgentList } from "../adapters/registry.js";
import type { AgentId } from "../adapters/types.js";
import { changedRepoFiles, installAgents, toPlannedWrites } from "./agents.js";

export type InitOptions = {
  path: string;
  skipIndex?: boolean;
  force?: boolean;
  dryRun?: boolean;
  /**
   * Agents to set up (comma list or array). Default: AGENTS.md plus agents
   * detected in the repo. `false` writes no agent files at all.
   */
  agents?: string | string[] | false;
};

export type InitDeps = {
  configs: ConfigRepository;
  snapshots: SnapshotRepository;
  models: ProjectModelRepository;
  now?: () => Date;
};

export type InitResult = {
  projectRoot: string;
  config: ProjectConfig;
  index?: IndexResult;
  /** Every file written, or that would be written with dryRun. */
  writes: PlannedWrite[];
  dryRun: boolean;
  /** Agents set up (empty with skipIndex: agent files need the project model). */
  agents: AgentId[];
  warnings: string[];
  conflicts: number;
};

export async function initProject(options: InitOptions, deps: InitDeps): Promise<InitResult> {
  const projectRoot = await resolveProjectRoot(options.path);
  const exists = await deps.configs.exists(projectRoot);
  const dryRun = Boolean(options.dryRun);

  if (exists && !options.force) {
    throw new AppError({
      code: "ALREADY_INITIALIZED",
      message: "This project already has an agent-kit config.",
      suggestedAction: "Use `agent-kit index` to refresh, or pass --force to re-init config.",
    });
  }

  const now = (deps.now ?? (() => new Date()))().toISOString();
  const previous = exists ? await deps.configs.read(projectRoot).catch(() => null) : null;

  const config: ProjectConfig = {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    projectRoot,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    ignoreGlobs: previous?.ignoreGlobs ?? [],
    maxFileBytes: previous?.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
    followSymlinks: false,
  };

  const explicit =
    options.agents !== undefined && options.agents !== false ? parseAgentList(options.agents) : [];
  const writes: PlannedWrite[] = [
    { path: ".agent-kit/config.json", action: exists ? "update" : "create" },
  ];

  if (options.skipIndex) {
    if (!dryRun) await deps.configs.write(config);
    return { projectRoot, config, writes, dryRun, agents: [], warnings: [], conflicts: 0 };
  }

  const index = await buildProjectIndex(config, {
    snapshots: deps.snapshots,
    models: deps.models,
    now: deps.now,
    dryRun,
  });

  if (options.agents === false) {
    // An explicit empty list: later syncs keep writing no agent files.
    config.agents = [];
    if (!dryRun) await deps.configs.write(config);
    const all = [...writes, ...index.writes];
    return {
      projectRoot,
      config,
      index,
      writes: all,
      dryRun,
      agents: [],
      warnings: [],
      conflicts: 0,
    };
  }

  config.agents = explicit.length > 0 ? explicit : defaultAgents(index.model);
  if (!dryRun) await deps.configs.write(config);

  const install = await installAgents({
    root: projectRoot,
    model: index.model,
    agents: config.agents as AgentId[],
    explicit,
    dryRun,
    approvedSkills: config.approvedSkills,
    now: deps.now?.(),
  });

  // The model records agent config files, which the install just changed:
  // re-index so project.json describes the repository as it now is.
  if (!dryRun && changedRepoFiles(install.writes)) {
    await buildProjectIndex(config, {
      snapshots: deps.snapshots,
      models: deps.models,
      now: deps.now,
    });
  }

  return {
    projectRoot,
    config,
    index,
    writes: [...writes, ...index.writes, ...toPlannedWrites(install.writes)],
    dryRun,
    agents: install.agents,
    warnings: install.warnings,
    conflicts: install.conflicts,
  };
}

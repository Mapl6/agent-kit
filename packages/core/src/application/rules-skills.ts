import { resolveProjectRoot } from "../discovery/root-safety.js";
import { AppError } from "../errors/AppError.js";
import type { ConfigRepository } from "../ports/repositories.js";
import { defaultAgents, parseAgentList } from "../adapters/registry.js";
import type { AgentId } from "../adapters/types.js";
import { detectConflicts, type Conflict } from "../rules/conflicts.js";
import { createRule, loadRules, type Rule, type RuleProblem } from "../rules/rules.js";
import {
  createSkill,
  isSkillDistributable,
  loadSkills,
  type SkillProblem,
} from "../rules/skills.js";
import { analyzeProject } from "./analyze-project.js";

type Deps = { configs: ConfigRepository };

async function enabledAgents(root: string, deps: Deps): Promise<AgentId[]> {
  if (await deps.configs.exists(root)) {
    const config = await deps.configs.read(root);
    if (config.agents) return config.agents.length ? parseAgentList(config.agents) : [];
  }
  return defaultAgents((await analyzeProject({ path: root })).model);
}

/** Where a rule ends up for each enabled agent. */
function ruleOutputs(rule: Rule, agents: readonly AgentId[]): string[] {
  if (!agents.includes("agents-md")) return [];
  if (rule.paths.length === 0) return ["AGENTS.md (inline)"];
  const out = ["AGENTS.md (index)"];
  if (agents.includes("claude-code")) out.push(`.claude/rules/agent-kit/${rule.id}.md`);
  if (agents.includes("cursor")) out.push(`.cursor/rules/agent-kit/${rule.id}.mdc`);
  if (agents.includes("copilot"))
    out.push(`.github/instructions/agent-kit/${rule.id}.instructions.md`);
  return out;
}

export type RuleListing = {
  projectRoot: string;
  rules: Array<Rule & { outputs: string[] }>;
  problems: RuleProblem[];
};

export async function listRules(options: { path: string }, deps: Deps): Promise<RuleListing> {
  const projectRoot = await resolveProjectRoot(options.path);
  const agents = await enabledAgents(projectRoot, deps);
  const { rules, problems } = await loadRules(projectRoot);
  return {
    projectRoot,
    rules: rules.map((r) => ({ ...r, outputs: ruleOutputs(r, agents) })),
    problems,
  };
}

export async function newRule(options: {
  path: string;
  id: string;
  description?: string;
  paths?: string[];
}): Promise<string> {
  const root = await resolveProjectRoot(options.path);
  return createRule(root, options);
}

export type SkillListing = {
  projectRoot: string;
  skills: Array<{
    name: string;
    description: string;
    dir: string;
    files: number;
    scripts: string[];
    /** ready: will be installed; needs-approval: has scripts not approved at this content. */
    status: "ready" | "needs-approval";
    outputs: string[];
  }>;
  problems: SkillProblem[];
};

export async function listSkills(options: { path: string }, deps: Deps): Promise<SkillListing> {
  const projectRoot = await resolveProjectRoot(options.path);
  const agents = await enabledAgents(projectRoot, deps);
  const approved = (await deps.configs.exists(projectRoot))
    ? (await deps.configs.read(projectRoot)).approvedSkills
    : undefined;
  const { skills, problems } = await loadSkills(projectRoot);
  return {
    projectRoot,
    problems,
    skills: skills.map((s) => {
      const ready = isSkillDistributable(s, approved);
      const outputs = !ready || !agents.includes("agents-md") ? [] : [`.agents/skills/${s.name}/`];
      if (ready && agents.includes("claude-code")) outputs.push(`.claude/skills/${s.name}/`);
      return {
        name: s.name,
        description: s.description,
        dir: s.dir,
        files: s.files.length,
        scripts: s.scripts,
        status: ready ? "ready" : "needs-approval",
        outputs,
      };
    }),
  };
}

export async function newSkill(options: {
  path: string;
  name: string;
  description?: string;
}): Promise<string> {
  const root = await resolveProjectRoot(options.path);
  return createSkill(root, options);
}

/**
 * Approve a skill's executable files at their current content. Any later edit
 * changes the hash and withdraws the approval until it's approved again.
 */
export async function approveSkill(
  options: { path: string; name: string },
  deps: Deps,
): Promise<{ name: string; hash: string; scripts: string[] }> {
  const root = await resolveProjectRoot(options.path);
  if (!(await deps.configs.exists(root))) {
    throw new AppError({
      code: "CONFIG_INVALID",
      message: "Project is not initialized.",
      suggestedAction: "Run `agent-kit init` first.",
    });
  }
  const { skills, problems } = await loadSkills(root);
  const skill = skills.find((s) => s.name === options.name);
  if (!skill) {
    const problem = problems.find((p) => p.source.endsWith(`/${options.name}`));
    throw new AppError({
      code: "UNSUPPORTED_OPERATION",
      message: problem
        ? `Skill "${options.name}" is invalid: ${problem.message}`
        : `No skill named "${options.name}".`,
      suggestedAction: "Run `agent-kit skills` to see available skills.",
    });
  }
  const config = await deps.configs.read(root);
  await deps.configs.write({
    ...config,
    approvedSkills: { ...(config.approvedSkills ?? {}), [skill.name]: skill.hash },
    updatedAt: new Date().toISOString(),
  });
  return { name: skill.name, hash: skill.hash, scripts: skill.scripts };
}

export async function findConflicts(options: {
  path: string;
}): Promise<{ projectRoot: string; conflicts: Conflict[] }> {
  const projectRoot = await resolveProjectRoot(options.path);
  const { model } = await analyzeProject({ path: projectRoot });
  return { projectRoot, conflicts: await detectConflicts(projectRoot, model) };
}

import type { Evidence } from "../domain/types.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import type { ConfigRepository } from "../ports/repositories.js";
import { ADAPTERS, defaultAgents, parseAgentList } from "../adapters/registry.js";
import type { AdapterMode, AgentCapabilities, AgentId } from "../adapters/types.js";
import { analyzeProject } from "./analyze-project.js";

export type AgentStatus = {
  id: AgentId;
  label: string;
  mode: AdapterMode;
  enabled: boolean;
  /** Where the enabled flag came from. */
  enabledBy: "config" | "detected" | "default" | null;
  detected: Evidence[];
  capabilities: AgentCapabilities;
  notes: string;
  docs: string[];
  verifiedAt: string;
};

/** Read-only overview of every adapter for this repository. */
export async function listAgents(
  options: { path: string },
  deps: { configs: ConfigRepository },
): Promise<{ projectRoot: string; configured: boolean; agents: AgentStatus[] }> {
  const projectRoot = await resolveProjectRoot(options.path);
  const { model } = await analyzeProject({ path: projectRoot });
  const config = (await deps.configs.exists(projectRoot))
    ? await deps.configs.read(projectRoot)
    : null;
  const configured = Boolean(config?.agents);
  const enabled = new Set(
    config?.agents
      ? config.agents.length > 0
        ? parseAgentList(config.agents)
        : []
      : defaultAgents(model),
  );

  return {
    projectRoot,
    configured,
    agents: ADAPTERS.map((a) => {
      const detected = a.detect(model);
      const on = enabled.has(a.id);
      return {
        id: a.id,
        label: a.label,
        mode: a.mode,
        enabled: on,
        enabledBy: !on
          ? null
          : a.mode === "native"
            ? "default"
            : configured
              ? "config"
              : "detected",
        detected,
        capabilities: a.capabilities,
        notes: a.notes,
        docs: a.docs,
        verifiedAt: a.verifiedAt,
      };
    }),
  };
}

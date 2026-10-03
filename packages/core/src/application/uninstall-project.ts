import fs from "node:fs/promises";
import type { PlannedWrite } from "../domain/types.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import { applyFileChanges, planAgentUninstall } from "../adapters/installer.js";
import { agentKitDir } from "../storage/paths.js";
import { toPlannedWrites } from "./agents.js";

export type UninstallOptions = {
  path: string;
  dryRun?: boolean;
  /** Keep .agent-kit/ (config, model, backups); only remove agent blocks. */
  keepData?: boolean;
};

export type UninstallResult = {
  projectRoot: string;
  writes: PlannedWrite[];
  conflicts: number;
  dryRun: boolean;
};

/**
 * Remove every Agent Kit block (deleting files Agent Kit created), then
 * .agent-kit/ itself. If any block can't be removed safely, .agent-kit/ is kept
 * so its manifest and backups remain available.
 */
export async function uninstallProject(options: UninstallOptions): Promise<UninstallResult> {
  const projectRoot = await resolveProjectRoot(options.path);
  const dryRun = Boolean(options.dryRun);
  const changes = await planAgentUninstall(projectRoot);
  const conflicts = changes.filter((c) => c.action === "conflict").length;

  const writes = toPlannedWrites(changes);
  const dir = agentKitDir(projectRoot);
  const dirStat = await fs.lstat(dir).catch(() => null);
  const removeDir = !options.keepData && conflicts === 0 && dirStat?.isDirectory() === true;
  if (removeDir) writes.push({ path: ".agent-kit/", action: "delete" });
  else if (dirStat && !options.keepData) {
    writes.push({
      path: ".agent-kit/",
      action: "skip",
      reason: conflicts ? "conflicts remain" : "not a directory",
    });
  }

  if (!dryRun) {
    // Agent files first: their backups are written into .agent-kit/ and only
    // discarded once every block is out.
    await applyFileChanges(projectRoot, changes);
    if (removeDir) await fs.rm(dir, { recursive: true, force: true });
  }
  return { projectRoot, writes, conflicts, dryRun };
}

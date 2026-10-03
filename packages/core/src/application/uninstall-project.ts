import fs from "node:fs/promises";
import path from "node:path";
import type { PlannedWrite } from "../domain/types.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import { applyFileChanges, planAgentUninstall } from "../adapters/installer.js";
import { agentKitDir } from "../storage/paths.js";
import { toPlannedWrites } from "./agents.js";

export type UninstallOptions = {
  path: string;
  dryRun?: boolean;
  /** Keep .agent-kit/ (config, model, backups); only remove agent files. */
  keepData?: boolean;
};

export type UninstallResult = {
  projectRoot: string;
  writes: PlannedWrite[];
  conflicts: number;
  dryRun: boolean;
};

/** What Agent Kit itself generates inside .agent-kit/. Everything else there (rules/, skills/) is the developer's. */
const GENERATED = [
  "config.json",
  "snapshot.json",
  "project.json",
  "state",
  ".gitignore",
  "reports",
];

/**
 * Remove every Agent Kit block and generated file, then Agent Kit's own data in
 * .agent-kit/. Developer-authored rules and skills are never deleted. If any
 * agent file can't be cleaned safely, .agent-kit/ is kept so its manifest and
 * backups remain available.
 */
export async function uninstallProject(options: UninstallOptions): Promise<UninstallResult> {
  const projectRoot = await resolveProjectRoot(options.path);
  const dryRun = Boolean(options.dryRun);
  const changes = await planAgentUninstall(projectRoot);
  const conflicts = changes.filter((c) => c.action === "conflict").length;
  const writes = toPlannedWrites(changes);

  const dir = agentKitDir(projectRoot);
  const dirStat = await fs.lstat(dir).catch(() => null);
  const cleanData = !options.keepData && conflicts === 0 && dirStat?.isDirectory() === true;
  const present = cleanData ? await fs.readdir(dir) : [];
  const generated = present.filter((name) => GENERATED.includes(name));
  const kept = present.filter((name) => !GENERATED.includes(name));

  if (cleanData) {
    for (const name of generated) writes.push({ path: `.agent-kit/${name}`, action: "delete" });
    for (const name of kept) {
      writes.push({ path: `.agent-kit/${name}`, action: "skip", reason: "yours: kept" });
    }
  } else if (dirStat && !options.keepData) {
    writes.push({
      path: ".agent-kit/",
      action: "skip",
      reason: conflicts ? "conflicts remain" : "not a directory",
    });
  }

  if (!dryRun) {
    // Agent files first: their backups are written into .agent-kit/state/ and
    // only discarded once every block is out.
    await applyFileChanges(projectRoot, changes);
    if (cleanData) {
      for (const name of generated)
        await fs.rm(path.join(dir, name), { recursive: true, force: true });
      if ((await fs.readdir(dir)).length === 0) await fs.rmdir(dir);
    }
  }
  return { projectRoot, writes, conflicts, dryRun };
}

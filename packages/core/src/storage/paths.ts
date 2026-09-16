import path from "node:path";
import { AGENT_KIT_DIR } from "../domain/types.js";

export function agentKitDir(projectRoot: string): string {
  return path.join(projectRoot, AGENT_KIT_DIR);
}

export function configPath(projectRoot: string): string {
  return path.join(agentKitDir(projectRoot), "config.json");
}

export function snapshotPath(projectRoot: string): string {
  return path.join(agentKitDir(projectRoot), "snapshot.json");
}

export function reportsDir(projectRoot: string): string {
  return path.join(agentKitDir(projectRoot), "reports");
}

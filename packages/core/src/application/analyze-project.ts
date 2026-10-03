import { buildProjectModel } from "../intelligence/model.js";
import type { ProjectModel } from "../intelligence/types.js";
import { discoverAndScan, type ScanOptions } from "../scanner/scan.js";
import type { ScanResult } from "../scanner/types.js";

export type AnalysisResult = {
  scan: ScanResult;
  model: ProjectModel;
};

/** Scan plus project model. Read-only, like `scanProject`. */
export async function analyzeProject(options: ScanOptions): Promise<AnalysisResult> {
  const { scan, entries } = await discoverAndScan(options);
  return { scan, model: await buildProjectModel(scan, entries) };
}

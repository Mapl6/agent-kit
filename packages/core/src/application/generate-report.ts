import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectReport, ReportFormat, ProjectSnapshot } from "../domain/types.js";
import { AppError } from "../errors/AppError.js";
import { resolveProjectRoot } from "../discovery/root-safety.js";
import type { ConfigRepository, SnapshotRepository } from "../ports/repositories.js";
import { writeFileAtomic } from "../storage/atomic-write.js";
import { reportsDir } from "../storage/paths.js";
import { renderMarkdownReport } from "../reports/markdown.js";
import { renderJsonReport } from "../reports/json.js";
import { renderOnboardingPrompt } from "../reports/onboarding.js";

export type ReportOptions = {
  path: string;
  format?: ReportFormat | "both";
  write?: boolean;
};

export type ReportDeps = {
  configs: ConfigRepository;
  snapshots: SnapshotRepository;
};

export type GenerateReportResult = {
  reports: ProjectReport[];
  writtenPaths: string[];
};

export async function generateReport(
  options: ReportOptions,
  deps: ReportDeps,
): Promise<GenerateReportResult> {
  const projectRoot = await resolveProjectRoot(options.path);
  if (!(await deps.configs.exists(projectRoot))) {
    throw new AppError({
      code: "CONFIG_INVALID",
      message: "Project is not initialized.",
      suggestedAction: "Run `agent-kit init` then `agent-kit index`.",
    });
  }

  const snapshot = await deps.snapshots.read(projectRoot);
  if (!snapshot) {
    throw new AppError({
      code: "INDEX_FAILED",
      message: "No snapshot found.",
      suggestedAction: "Run `agent-kit index` before generating a report.",
    });
  }

  const format = options.format ?? "both";
  const onboardingPrompt = renderOnboardingPrompt(snapshot);
  const reports: ProjectReport[] = [];

  if (format === "markdown" || format === "both") {
    reports.push({
      format: "markdown",
      body: renderMarkdownReport(snapshot),
      onboardingPrompt,
    });
  }
  if (format === "json" || format === "both") {
    reports.push({
      format: "json",
      body: renderJsonReport(snapshot, onboardingPrompt),
      onboardingPrompt,
    });
  }

  const writtenPaths: string[] = [];
  if (options.write !== false) {
    const dir = reportsDir(projectRoot);
    await fs.mkdir(dir, { recursive: true });
    for (const report of reports) {
      const file =
        report.format === "markdown"
          ? path.join(dir, "latest.md")
          : path.join(dir, "latest.json");
      await writeFileAtomic(file, report.body.endsWith("\n") ? report.body : `${report.body}\n`);
      writtenPaths.push(file);
    }
    const promptPath = path.join(dir, "onboarding-prompt.md");
    await writeFileAtomic(promptPath, `${onboardingPrompt}\n`);
    writtenPaths.push(promptPath);
  }

  return { reports, writtenPaths };
}

export function requireSnapshot(snapshot: ProjectSnapshot | null): ProjectSnapshot {
  if (!snapshot) {
    throw new AppError({
      code: "INDEX_FAILED",
      message: "No snapshot available.",
      suggestedAction: "Run `agent-kit index`.",
    });
  }
  return snapshot;
}

import type { ProjectSnapshot } from "../domain/types.js";

export function renderJsonReport(snapshot: ProjectSnapshot, onboardingPrompt: string): string {
  return JSON.stringify(
    {
      schemaVersion: snapshot.schemaVersion,
      projectRoot: snapshot.projectRoot,
      updatedAt: snapshot.updatedAt,
      contentHash: snapshot.contentHash,
      stats: snapshot.stats,
      technologies: snapshot.technologies,
      files: snapshot.files.map((f) => ({
        path: f.path,
        kind: f.kind,
        sizeBytes: f.sizeBytes,
        contentHash: f.contentHash,
        skippedReason: f.skippedReason ?? null,
      })),
      onboardingPrompt,
    },
    null,
    2,
  );
}

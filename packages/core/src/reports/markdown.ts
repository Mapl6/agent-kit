import type { ProjectSnapshot } from "../domain/types.js";

export function renderMarkdownReport(snapshot: ProjectSnapshot): string {
  const techLines = snapshot.technologies
    .map(
      (t) =>
        `- **${t.label}** (\`${t.id}\`) — ${t.category}, confidence: ${t.confidence}`,
    )
    .join("\n");

  const topFiles = snapshot.files
    .filter((f) => f.kind === "source" || f.kind === "config")
    .slice(0, 40)
    .map((f) => `- \`${f.path}\` (${f.kind})`)
    .join("\n");

  return `# Agent Kit Project Report

Generated: ${snapshot.updatedAt}

## Summary

| Metric | Value |
|---|---|
| Project root | \`${snapshot.projectRoot}\` |
| Files seen | ${snapshot.stats.fileCount} |
| Content-hashed | ${snapshot.stats.indexedCount} |
| Skipped | ${snapshot.stats.skippedCount} |
| Total bytes | ${snapshot.stats.totalBytes} |
| Snapshot hash | \`${snapshot.contentHash.slice(0, 12)}…\` |

## Technologies

${techLines || "_None detected_"}

## Sample files

${topFiles || "_No source/config files_"}

## Notes

- Secrets and symlinks are excluded from content hashing.
- This report is local-only; nothing is sent to external APIs.
`;
}

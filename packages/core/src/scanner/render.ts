import type { Detection, DetectionCategory, Evidence } from "../domain/types.js";
import { CATEGORY_ORDER } from "./scan.js";
import type { ScanResult } from "./types.js";

const CATEGORY_TITLES: Record<DetectionCategory, string> = {
  language: "Languages",
  runtime: "Runtime",
  packageManager: "Package manager",
  workspace: "Workspaces",
  framework: "Frameworks",
  testing: "Testing",
  tooling: "Tooling",
  vcs: "Version control",
  ci: "CI/CD",
  agentConfig: "AI agent configuration",
};

function describeEvidence(e: Evidence): string {
  if (e.kind === "dependency") return `dep ${e.detail}`;
  if (e.path && e.detail && e.kind !== "package-key") return `${e.path} (${e.detail})`;
  return e.detail ?? e.path ?? e.kind;
}

function line(d: Detection, labelWidth: number): string {
  const mark = d.source.type === "inferred" ? "~" : "✓";
  const where = d.location === "." ? "" : `  [${d.location}]`;
  const evidence = d.evidence.slice(0, 3).map(describeEvidence).join("; ");
  const more = d.evidence.length > 3 ? `; +${d.evidence.length - 3} more` : "";
  return `  ${mark} ${d.label.padEnd(labelWidth)}  ${d.confidence.padEnd(6)}  ${evidence}${more}${where}`;
}

/** Human-readable scan output. Deterministic; no colour codes so it is safe to pipe. */
export function renderScanText(result: ScanResult): string {
  return [...renderScanSections(result), ...renderScanFooter(result.warnings)].join("\n");
}

/** Header plus one section per detection category. */
export function renderScanSections(result: ScanResult): string[] {
  const out: string[] = [];
  const skippedTotal = Object.values(result.stats.skipped).reduce((a, b) => a + b, 0);
  const skippedDetail = Object.entries(result.stats.skipped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([reason, n]) => `${n} ${reason}`)
    .join(", ");

  out.push(`Agent Kit scan: ${result.root}`);
  out.push(
    `${result.stats.files} files${skippedTotal ? ` (content skipped: ${skippedDetail})` : ""}`,
  );

  const labelWidth = Math.min(28, Math.max(10, ...result.detections.map((d) => d.label.length)));
  const missing: string[] = [];
  for (const category of CATEGORY_ORDER) {
    const items = result.detections.filter((d) => d.category === category);
    if (items.length === 0) {
      missing.push(CATEGORY_TITLES[category]);
      continue;
    }
    out.push("", CATEGORY_TITLES[category]);
    for (const d of items) out.push(line(d, labelWidth));
  }
  if (missing.length > 0) out.push("", `Not detected: ${missing.join(", ")}`);

  return out;
}

export function renderScanFooter(warnings: readonly string[]): string[] {
  const out: string[] = [];
  if (warnings.length > 0) {
    out.push("", "Warnings");
    for (const w of warnings) out.push(`  ⚠ ${w}`);
  }
  out.push("", "✓ detected from files   ~ inferred (no direct evidence)   Nothing was written.");
  return out;
}

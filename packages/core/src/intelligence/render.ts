import { renderScanFooter, renderScanSections } from "../scanner/render.js";
import type { ScanResult } from "../scanner/types.js";
import type { ProjectModel } from "./types.js";

const mark = (type: "detected" | "inferred") => (type === "inferred" ? "~" : "✓");

/** Scan sections followed by the project model, then warnings and the legend. */
export function renderAnalysisText(scan: ScanResult, model: ProjectModel): string {
  return [
    ...renderScanSections(scan),
    ...renderModelSections(model),
    ...renderScanFooter(scan.warnings),
  ].join("\n");
}

export function renderModelSections(model: ProjectModel): string[] {
  const out: string[] = [];

  out.push("", "Commands");
  const commands = model.packages.flatMap((p) => p.commands);
  if (commands.length === 0) out.push("  - none found");
  for (const pkg of model.packages) {
    if (pkg.commands.length === 0) continue;
    if (model.packages.length > 1) out.push(`  ${pkg.location === "." ? "(root)" : pkg.location}`);
    const indent = model.packages.length > 1 ? "    " : "  ";
    for (const c of pkg.commands) {
      out.push(`${indent}${mark(c.source.type)} ${c.task.padEnd(10)} ${c.command}`);
    }
  }

  out.push("", "Structure");
  if (model.structure.directories.length === 0) out.push("  - no recognised directories");
  const width = Math.min(
    32,
    Math.max(10, ...model.structure.directories.map((d) => d.path.length + 1)),
  );
  for (const d of model.structure.directories) {
    out.push(`  ~ ${`${d.path}/`.padEnd(width)}  ${d.role.padEnd(18)}  ${d.confidence}`);
  }
  if (model.structure.unclassified.length > 0) {
    const shown = model.structure.unclassified.slice(0, 8).join(", ");
    const more =
      model.structure.unclassified.length > 8
        ? `, +${model.structure.unclassified.length - 8} more`
        : "";
    out.push(`  unclassified: ${shown}${more}`);
  }

  out.push("", "Architecture");
  if (model.architecture.length === 0) out.push("  - no patterns inferred");
  const labelWidth = Math.max(0, ...model.architecture.map((a) => a.label.length));
  for (const a of model.architecture) {
    const where = a.location === "." ? "" : `  [${a.location}]`;
    out.push(`  ${mark(a.source.type)} ${a.label.padEnd(labelWidth)}  ${a.confidence}${where}`);
  }

  const t = model.testing;
  out.push("", "Test files");
  out.push(
    t.testFiles === 0
      ? "  - no test files found"
      : `  ${t.testFiles} test files, ${t.placement}; ${t.patterns.map((p) => `${p.pattern} (${p.count})`).join(", ")}`,
  );

  const g = model.git;
  const anyConvention =
    g.ignoreFile ||
    g.hooks.length > 0 ||
    g.commitConvention ||
    g.ci.length > 0 ||
    g.pullRequestTemplate ||
    g.codeowners;
  if (g.present || anyConvention) {
    const parts = [
      g.present ? null : "no .git",
      g.ignoreFile ? ".gitignore" : "no .gitignore",
      g.hooks.length ? `hooks: ${g.hooks.join(", ")}` : null,
      g.commitConvention ? `commits: ${g.commitConvention}` : null,
      g.ci.length ? `ci: ${g.ci.join(", ")}` : null,
      g.pullRequestTemplate ? "PR template" : null,
      g.codeowners ? "CODEOWNERS" : null,
    ].filter(Boolean);
    out.push("", "Git conventions", `  ${parts.join(" · ")}`);
  }
  return out;
}

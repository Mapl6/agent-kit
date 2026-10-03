import type { Detection } from "../domain/types.js";
import type { ScanContext } from "../scanner/types.js";
import type { GitModel } from "./types.js";

/**
 * Repository conventions visible on disk. `.git/` itself is never read: remote
 * URLs there can embed credentials, and nothing here needs them.
 */
export function analyzeGit(ctx: ScanContext, detections: readonly Detection[]): GitModel {
  const first = (paths: string[]) => paths.find((p) => ctx.exists(p)) ?? null;
  const hooks: string[] = [];
  if (ctx.hasDir(".husky")) hooks.push("husky");
  if (ctx.exists("lefthook.yml") || ctx.exists("lefthook.yaml")) hooks.push("lefthook");
  if (ctx.exists(".pre-commit-config.yaml")) hooks.push("pre-commit");
  if (ctx.exists(".lintstagedrc") || detections.some((d) => d.id === "lint-staged")) {
    hooks.push("lint-staged");
  }

  return {
    present: detections.some((d) => d.id === "git"),
    ignoreFile: ctx.exists(".gitignore"),
    hooks,
    commitConvention: detections.some((d) => d.id === "commitlint") ? "commitlint" : null,
    ci: detections.filter((d) => d.category === "ci").map((d) => d.id),
    pullRequestTemplate: first([
      ".github/pull_request_template.md",
      ".github/PULL_REQUEST_TEMPLATE.md",
      "pull_request_template.md",
    ]),
    codeowners: first([".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"]),
  };
}

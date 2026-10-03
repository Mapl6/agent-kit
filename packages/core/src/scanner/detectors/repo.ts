import path from "node:path";
import type { Evidence } from "../../domain/types.js";
import type { Detector, DetectorOutput } from "../types.js";

/** Presence of `.git` only. No git subprocess is spawned during a scan. */
export const gitDetector: Detector = {
  id: "git",
  category: "vcs",
  scope: "repo",
  async detect(ctx) {
    if (!ctx.rootEntries.has(".git")) return [];
    return [
      {
        id: "git",
        label: "Git",
        confidence: "high",
        evidence: [{ kind: "directory", path: ".git" }],
      },
    ];
  },
};

export const ciDetector: Detector = {
  id: "ci",
  category: "ci",
  scope: "repo",
  async detect(ctx) {
    const out: DetectorOutput[] = [];

    const workflows: Evidence[] = ctx.files
      .filter((f) => {
        const dir = path.posix.dirname(f.relativePath);
        return dir === ".github/workflows" && /\.ya?ml$/.test(f.relativePath);
      })
      .map((f) => ({ kind: "file", path: f.relativePath }));
    if (workflows.length > 0) {
      out.push({
        id: "github-actions",
        label: "GitHub Actions",
        confidence: "high",
        evidence: workflows,
      });
    }

    const single: Array<{ id: string; label: string; file: string }> = [
      { id: "gitlab-ci", label: "GitLab CI", file: ".gitlab-ci.yml" },
      { id: "circleci", label: "CircleCI", file: ".circleci/config.yml" },
    ];
    for (const ci of single) {
      if (ctx.exists(ci.file)) {
        out.push({
          id: ci.id,
          label: ci.label,
          confidence: "high",
          evidence: [{ kind: "file", path: ci.file }],
        });
      }
    }
    return out;
  },
};

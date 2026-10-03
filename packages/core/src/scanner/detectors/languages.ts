import path from "node:path";
import type { Detector, DetectorOutput } from "../types.js";

const LANGUAGES: Array<{ id: string; label: string; exts: string[]; manifests?: string[] }> = [
  {
    id: "typescript",
    label: "TypeScript",
    exts: [".ts", ".tsx", ".mts", ".cts"],
    manifests: ["tsconfig.json"],
  },
  { id: "javascript", label: "JavaScript", exts: [".js", ".jsx", ".mjs", ".cjs"] },
  {
    id: "python",
    label: "Python",
    exts: [".py"],
    manifests: ["pyproject.toml", "requirements.txt", "setup.py"],
  },
  { id: "go", label: "Go", exts: [".go"], manifests: ["go.mod"] },
  { id: "rust", label: "Rust", exts: [".rs"], manifests: ["Cargo.toml"] },
  { id: "java", label: "Java", exts: [".java"], manifests: ["pom.xml", "build.gradle"] },
  { id: "kotlin", label: "Kotlin", exts: [".kt", ".kts"] },
  { id: "csharp", label: "C#", exts: [".cs"] },
  { id: "php", label: "PHP", exts: [".php"], manifests: ["composer.json"] },
  { id: "ruby", label: "Ruby", exts: [".rb"], manifests: ["Gemfile"] },
  { id: "swift", label: "Swift", exts: [".swift"], manifests: ["Package.swift"] },
];

/** Tool config like `eslint.config.js` says nothing about the project's language. */
function isToolConfig(base: string): boolean {
  return base.startsWith(".") || /\.config\.[cm]?[jt]s$/.test(base) || base.endsWith(".d.ts");
}

/** Test-fixture trees hold other projects' code, not this project's. */
const FIXTURE_DIRS = new Set(["fixtures", "__fixtures__", "testdata"]);

/** Counts source files by extension. Reports languages that are actually present. */
export const languageDetector: Detector = {
  id: "languages",
  category: "language",
  scope: "repo",
  async detect(ctx) {
    const counts = new Map<string, number>();
    for (const f of ctx.files) {
      if (f.kind === "secret" || f.kind === "ignored") continue;
      if (f.relativePath.split("/").some((s) => FIXTURE_DIRS.has(s))) continue;
      const base = path.posix.basename(f.relativePath);
      if (isToolConfig(base)) continue;
      const ext = path.posix.extname(base).toLowerCase();
      const lang = LANGUAGES.find((l) => l.exts.includes(ext));
      if (lang) counts.set(lang.id, (counts.get(lang.id) ?? 0) + 1);
    }

    const out: DetectorOutput[] = [];
    for (const lang of LANGUAGES) {
      const count = counts.get(lang.id) ?? 0;
      const manifests = (lang.manifests ?? []).filter((m) => ctx.exists(m));
      if (count === 0 && manifests.length === 0) continue;
      out.push({
        id: lang.id,
        label: lang.label,
        confidence: count > 0 ? "high" : "medium",
        evidence: [
          ...manifests.map((m) => ({ kind: "file", path: m })),
          ...(count > 0
            ? [
                {
                  kind: "file-count",
                  detail: `${count} ${lang.exts.join("/")} file${count === 1 ? "" : "s"}`,
                },
              ]
            : []),
        ],
      });
    }
    return out;
  },
};

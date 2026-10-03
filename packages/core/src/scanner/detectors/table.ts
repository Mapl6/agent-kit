import type { DetectionCategory, Evidence } from "../../domain/types.js";
import { dependencyNames, readPackageJson } from "../package-json.js";
import type { Detector, DetectorOutput } from "../types.js";

export type ToolSpec = {
  id: string;
  label: string;
  /** Any of these in dependencies / devDependencies / peerDependencies. */
  deps?: string[];
  /** Exact config file names, relative to the package directory. */
  files?: string[];
  /** Directories whose presence (any file inside) is evidence. */
  dirs?: string[];
  /** Top-level `package.json` keys, e.g. "prettier" or "jest". */
  packageKeys?: string[];
};

/**
 * Package-scoped detector driven by a spec table. A dependency or package.json
 * key is direct evidence (high); a config file alone is medium, since stray
 * config files outlive the tools they configured.
 */
export function tableDetector(
  id: string,
  category: DetectionCategory,
  specs: readonly ToolSpec[],
): Detector {
  return {
    id,
    category,
    scope: "package",
    async detect(ctx) {
      const pkg = await readPackageJson(ctx);
      const deps = dependencyNames(pkg);
      const out: DetectorOutput[] = [];

      for (const spec of specs) {
        const strong: Evidence[] = [];
        const weak: Evidence[] = [];
        for (const dep of spec.deps ?? []) {
          if (deps.has(dep)) strong.push({ kind: "dependency", path: "package.json", detail: dep });
        }
        for (const key of spec.packageKeys ?? []) {
          if (pkg && key in pkg)
            strong.push({ kind: "package-key", path: "package.json", detail: key });
        }
        for (const file of spec.files ?? []) {
          if (ctx.exists(file)) weak.push({ kind: "file", path: file });
        }
        for (const dir of spec.dirs ?? []) {
          if (ctx.hasDir(dir)) weak.push({ kind: "directory", path: `${dir}/` });
        }
        if (strong.length === 0 && weak.length === 0) continue;
        out.push({
          id: spec.id,
          label: spec.label,
          confidence: strong.length > 0 ? "high" : "medium",
          evidence: [...strong, ...weak],
        });
      }
      return out;
    },
  };
}

/** `name.{ext}` for each extension. */
export function variants(base: string, exts: string[]): string[] {
  return exts.map((ext) => `${base}.${ext}`);
}

const JS_EXTS = ["js", "cjs", "mjs", "ts", "cts", "mts"];

export const frameworkDetector = tableDetector("frameworks", "framework", [
  { id: "nextjs", label: "Next.js", deps: ["next"], files: variants("next.config", JS_EXTS) },
  { id: "react", label: "React", deps: ["react"] },
  { id: "vite", label: "Vite", deps: ["vite"], files: variants("vite.config", JS_EXTS) },
  { id: "vue", label: "Vue", deps: ["vue"] },
  { id: "nuxt", label: "Nuxt", deps: ["nuxt"], files: variants("nuxt.config", JS_EXTS) },
  { id: "angular", label: "Angular", deps: ["@angular/core"], files: ["angular.json"] },
  { id: "svelte", label: "Svelte", deps: ["svelte"] },
  {
    id: "sveltekit",
    label: "SvelteKit",
    deps: ["@sveltejs/kit"],
    files: variants("svelte.config", JS_EXTS),
  },
  { id: "astro", label: "Astro", deps: ["astro"], files: variants("astro.config", JS_EXTS) },
  { id: "remix", label: "Remix", deps: ["@remix-run/react", "@remix-run/node"] },
  { id: "express", label: "Express", deps: ["express"] },
  { id: "nestjs", label: "NestJS", deps: ["@nestjs/core"], files: ["nest-cli.json"] },
]);

export const testingDetector = tableDetector("testing", "testing", [
  { id: "vitest", label: "Vitest", deps: ["vitest"], files: variants("vitest.config", JS_EXTS) },
  {
    id: "jest",
    label: "Jest",
    deps: ["jest"],
    packageKeys: ["jest"],
    files: variants("jest.config", [...JS_EXTS, "json"]),
  },
  {
    id: "playwright",
    label: "Playwright",
    deps: ["@playwright/test", "playwright"],
    files: variants("playwright.config", JS_EXTS),
  },
  {
    id: "cypress",
    label: "Cypress",
    deps: ["cypress"],
    files: variants("cypress.config", JS_EXTS),
  },
]);

export const toolingDetector = tableDetector("tooling", "tooling", [
  {
    id: "eslint",
    label: "ESLint",
    deps: ["eslint"],
    packageKeys: ["eslintConfig"],
    files: [
      ...variants("eslint.config", JS_EXTS),
      ".eslintrc",
      ...variants(".eslintrc", ["js", "cjs", "json", "yml", "yaml"]),
    ],
  },
  {
    id: "prettier",
    label: "Prettier",
    deps: ["prettier"],
    packageKeys: ["prettier"],
    files: [
      ".prettierrc",
      ...variants(".prettierrc", ["json", "json5", "yml", "yaml", "toml", "js", "cjs", "mjs"]),
      ...variants("prettier.config", ["js", "cjs", "mjs", "ts"]),
    ],
  },
  { id: "biome", label: "Biome", deps: ["@biomejs/biome"], files: ["biome.json", "biome.jsonc"] },
  { id: "storybook", label: "Storybook", deps: ["storybook"], dirs: [".storybook"] },
  { id: "husky", label: "Husky", deps: ["husky"], dirs: [".husky"] },
  {
    id: "lint-staged",
    label: "lint-staged",
    deps: ["lint-staged"],
    packageKeys: ["lint-staged"],
    files: [
      ".lintstagedrc",
      ...variants(".lintstagedrc", ["json", "yml", "yaml", "js", "cjs", "mjs"]),
    ],
  },
  {
    id: "commitlint",
    label: "commitlint",
    deps: ["@commitlint/cli"],
    packageKeys: ["commitlint"],
    files: [...variants("commitlint.config", JS_EXTS), ".commitlintrc", ".commitlintrc.json"],
  },
]);

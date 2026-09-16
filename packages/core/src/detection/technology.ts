import fs from "node:fs/promises";
import path from "node:path";
import type { TechnologySignal } from "../domain/types.js";

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

/**
 * Read and parse JSON without executing any project lifecycle scripts.
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    let raw = await fs.readFile(filePath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function exists(root: string, rel: string): Promise<boolean> {
  try {
    await fs.access(path.join(root, rel));
    return true;
  } catch {
    return false;
  }
}

export async function detectPackageManager(projectRoot: string): Promise<TechnologySignal> {
  const checks: Array<{ file: string; id: string; label: string }> = [
    { file: "bun.lockb", id: "bun", label: "Bun" },
    { file: "bun.lock", id: "bun", label: "Bun" },
    { file: "pnpm-lock.yaml", id: "pnpm", label: "pnpm" },
    { file: "yarn.lock", id: "yarn", label: "Yarn" },
    { file: "package-lock.json", id: "npm", label: "npm" },
  ];

  for (const check of checks) {
    if (await exists(projectRoot, check.file)) {
      return {
        id: check.id,
        label: check.label,
        category: "packageManager",
        confidence: "high",
        evidence: [{ kind: "lockfile", path: check.file }],
      };
    }
  }

  if (await exists(projectRoot, "package.json")) {
    return {
      id: "npm",
      label: "npm",
      category: "packageManager",
      confidence: "medium",
      evidence: [{ kind: "file", path: "package.json", detail: "default without lockfile" }],
    };
  }

  return {
    id: "unknown",
    label: "unknown",
    category: "packageManager",
    confidence: "low",
    evidence: [],
  };
}

export async function detectTechnologies(projectRoot: string): Promise<TechnologySignal[]> {
  const signals: TechnologySignal[] = [];
  signals.push(await detectPackageManager(projectRoot));

  const pkg = await readJsonFile<PackageJson>(path.join(projectRoot, "package.json"));
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };

  const has = (...names: string[]) => names.some((n) => Boolean(deps[n]));

  if (await exists(projectRoot, "tsconfig.json") || has("typescript")) {
    signals.push({
      id: "typescript",
      label: "TypeScript",
      category: "language",
      confidence: "high",
      evidence: [
        (await exists(projectRoot, "tsconfig.json"))
          ? { kind: "file", path: "tsconfig.json" }
          : { kind: "dependency", detail: "typescript" },
      ],
    });
  } else if (pkg) {
    signals.push({
      id: "javascript",
      label: "JavaScript",
      category: "language",
      confidence: "medium",
      evidence: [{ kind: "file", path: "package.json" }],
    });
  }

  if (has("next") || (await exists(projectRoot, "next.config.js")) || (await exists(projectRoot, "next.config.mjs")) || (await exists(projectRoot, "next.config.ts"))) {
    signals.push({
      id: "nextjs",
      label: "Next.js",
      category: "framework",
      confidence: "high",
      evidence: has("next")
        ? [{ kind: "dependency", detail: "next" }]
        : [{ kind: "file", path: "next.config.*" }],
    });
  } else if (
    has("vite") ||
    (await exists(projectRoot, "vite.config.ts")) ||
    (await exists(projectRoot, "vite.config.js")) ||
    (await exists(projectRoot, "vite.config.mjs"))
  ) {
    const withReact = has("react");
    signals.push({
      id: withReact ? "vite-react" : "vite",
      label: withReact ? "Vite + React" : "Vite",
      category: "framework",
      confidence: "high",
      evidence: has("vite")
        ? [{ kind: "dependency", detail: "vite" }]
        : [{ kind: "file", path: "vite.config.*" }],
    });
  } else if (has("@remix-run/react", "@remix-run/node")) {
    signals.push({
      id: "remix",
      label: "Remix",
      category: "framework",
      confidence: "high",
      evidence: [{ kind: "dependency", detail: "@remix-run/*" }],
    });
  } else if (has("astro")) {
    signals.push({
      id: "astro",
      label: "Astro",
      category: "framework",
      confidence: "high",
      evidence: [{ kind: "dependency", detail: "astro" }],
    });
  } else if (has("react")) {
    signals.push({
      id: "react",
      label: "React",
      category: "framework",
      confidence: "medium",
      evidence: [{ kind: "dependency", detail: "react" }],
    });
  } else if (has("vue")) {
    signals.push({
      id: "vue",
      label: "Vue",
      category: "framework",
      confidence: "medium",
      evidence: [{ kind: "dependency", detail: "vue" }],
    });
  } else if (has("svelte", "@sveltejs/kit")) {
    signals.push({
      id: "svelte",
      label: "Svelte",
      category: "framework",
      confidence: "high",
      evidence: [{ kind: "dependency", detail: "svelte" }],
    });
  }

  if (has("vitest")) {
    signals.push({
      id: "vitest",
      label: "Vitest",
      category: "tooling",
      confidence: "high",
      evidence: [{ kind: "dependency", detail: "vitest" }],
    });
  } else if (has("jest", "@jest/core")) {
    signals.push({
      id: "jest",
      label: "Jest",
      category: "tooling",
      confidence: "high",
      evidence: [{ kind: "dependency", detail: "jest" }],
    });
  }

  if (has("eslint") || (await exists(projectRoot, "eslint.config.js")) || (await exists(projectRoot, "eslint.config.mjs"))) {
    signals.push({
      id: "eslint",
      label: "ESLint",
      category: "tooling",
      confidence: "high",
      evidence: [{ kind: "tooling", detail: "eslint" }],
    });
  }

  signals.push({
    id: "nodejs",
    label: "Node.js",
    category: "runtime",
    confidence: pkg ? "high" : "low",
    evidence: pkg
      ? [{ kind: "file", path: "package.json" }]
      : [{ kind: "heuristic", detail: "no package.json" }],
  });

  return signals;
}

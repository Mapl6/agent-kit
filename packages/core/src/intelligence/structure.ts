import path from "node:path";
import type { Confidence, Detection, Evidence } from "../domain/types.js";
import type { DiscoveredEntry } from "../discovery/discover.js";
import type { ArchitectureSignal, DirectoryInfo, DirectoryRole } from "./types.js";

const NAME_ROLES: Record<string, DirectoryRole> = {
  src: "source-root",
  app: "application",
  pages: "application",
  routes: "routes",
  components: "ui-components",
  ui: "ui-components",
  features: "feature-modules",
  modules: "feature-modules",
  domains: "feature-modules",
  hooks: "hooks",
  composables: "hooks",
  lib: "shared-utilities",
  utils: "shared-utilities",
  helpers: "shared-utilities",
  shared: "shared-utilities",
  common: "shared-utilities",
  services: "services-api",
  api: "services-api",
  clients: "services-api",
  store: "state",
  stores: "state",
  state: "state",
  redux: "state",
  context: "state",
  contexts: "state",
  types: "types",
  typings: "types",
  interfaces: "types",
  styles: "styles",
  css: "styles",
  theme: "styles",
  middleware: "middleware",
  server: "server",
  backend: "server",
  controllers: "controllers",
  models: "models",
  entities: "models",
  db: "database",
  database: "database",
  prisma: "database",
  migrations: "database",
  drizzle: "database",
  tests: "tests",
  test: "tests",
  __tests__: "tests",
  spec: "tests",
  e2e: "e2e-tests",
  cypress: "e2e-tests",
  playwright: "e2e-tests",
  fixtures: "test-fixtures",
  public: "static-assets",
  static: "static-assets",
  assets: "static-assets",
  config: "config",
  configs: "config",
  scripts: "scripts-tooling",
  tools: "scripts-tooling",
  bin: "scripts-tooling",
  docs: "docs",
  documentation: "docs",
};

/** Frameworks whose router is file-based (app/, pages/, routes/ define URLs). */
const FILE_ROUTERS = new Set(["nextjs", "nuxt", "remix", "astro", "sveltekit"]);

const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(^test_.*\.py$)|(_test\.(py|go)$)/;
const COMPONENT_EXT = new Set([".tsx", ".jsx", ".vue", ".svelte"]);
const ROUTE_FILE = /^(page|layout|route|loading|error|_app|_document|index)\.[cm]?[jt]sx?$/;

type DirFiles = { path: string; files: DiscoveredEntry[] };

/** Direct child directories of `parent` with every file beneath them. */
function childDirs(entries: readonly DiscoveredEntry[], parent: string): DirFiles[] {
  const prefix = parent === "." ? "" : `${parent}/`;
  const byChild = new Map<string, DiscoveredEntry[]>();
  for (const e of entries) {
    if (!e.relativePath.startsWith(prefix)) continue;
    const rest = e.relativePath.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) continue;
    const child = rest.slice(0, slash);
    if (child.startsWith(".")) continue;
    const list = byChild.get(child) ?? [];
    list.push(e);
    byChild.set(child, list);
  }
  return [...byChild.entries()]
    .map(([child, files]) => ({ path: `${prefix}${child}`, files }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function share(
  files: DiscoveredEntry[],
  test: (base: string, e: DiscoveredEntry) => boolean,
): number {
  if (files.length === 0) return 0;
  return files.filter((e) => test(path.posix.basename(e.relativePath), e)).length / files.length;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

type Classification = { role: DirectoryRole; confidence: Confidence; evidence: Evidence[] };

function classify(dir: DirFiles, frameworks: ReadonlySet<string>): Classification | null {
  const name = path.posix.basename(dir.path);
  const lower = name.toLowerCase();
  let role = NAME_ROLES[lower];
  const evidence: Evidence[] = [];
  let confidence: Confidence = "medium";

  const testShare = share(dir.files, (b) => TEST_FILE.test(b));
  if (!role) {
    // Unnamed folder that is mostly tests is still a test folder.
    if (dir.files.length >= 3 && testShare >= 0.8) {
      evidence.push({ kind: "file-pattern", detail: `${pct(testShare)} test files` });
      return { role: "tests", confidence: "medium", evidence };
    }
    return null;
  }
  evidence.push({ kind: "directory-name", detail: name });

  const router = [...frameworks].find((f) => FILE_ROUTERS.has(f));
  if ((lower === "app" || lower === "pages" || lower === "routes") && router) {
    role = "routes";
    evidence.push({ kind: "detection", detail: router });
    const routeShare = share(dir.files, (b) => ROUTE_FILE.test(b));
    if (routeShare > 0) {
      confidence = "high";
      evidence.push({ kind: "file-pattern", detail: "route files (page/layout/route/index)" });
    }
  } else if (role === "hooks") {
    const s = share(dir.files, (b) => /^use[A-Z]/.test(b));
    if (s >= 0.5) {
      confidence = "high";
      evidence.push({ kind: "file-pattern", detail: `${pct(s)} files named use*` });
    }
  } else if (role === "ui-components") {
    const s = share(dir.files, (b) => COMPONENT_EXT.has(path.posix.extname(b)));
    if (s >= 0.6) {
      confidence = "high";
      evidence.push({ kind: "file-pattern", detail: `${pct(s)} component files` });
    }
  } else if (role === "tests" || role === "e2e-tests") {
    if (testShare >= 0.5) {
      confidence = "high";
      evidence.push({ kind: "file-pattern", detail: `${pct(testShare)} test files` });
    }
  } else if (role === "feature-modules") {
    const modules = new Set(
      dir.files
        .map((e) => e.relativePath.slice(dir.path.length + 1).split("/"))
        .filter((parts) => parts.length > 1)
        .map((parts) => parts[0]),
    );
    if (modules.size >= 2) {
      confidence = "high";
      evidence.push({ kind: "file-pattern", detail: `${modules.size} module folders` });
    }
  } else if (role === "database") {
    const s = share(dir.files, (b) => b.endsWith(".sql") || b.endsWith(".prisma"));
    if (s > 0) {
      confidence = "high";
      evidence.push({ kind: "file-pattern", detail: "SQL / Prisma files" });
    }
  } else if (role === "docs") {
    const s = share(dir.files, (b) => /\.mdx?$/.test(b));
    if (s >= 0.6) {
      confidence = "high";
      evidence.push({ kind: "file-pattern", detail: `${pct(s)} Markdown` });
    }
  } else if (role === "static-assets") {
    const s = share(dir.files, (_b, e) => e.kind === "asset");
    if (s >= 0.6) {
      confidence = "high";
      evidence.push({ kind: "file-pattern", detail: `${pct(s)} assets` });
    }
  }
  return { role, confidence, evidence };
}

export type StructureResult = {
  directories: DirectoryInfo[];
  unclassified: string[];
  architecture: ArchitectureSignal[];
};

/**
 * Classify the top-level directories of each package (and of its `src/`).
 * Every result is an inference from names and file patterns, never a fact.
 */
export function analyzeStructure(
  entries: readonly DiscoveredEntry[],
  detections: readonly Detection[],
  workspaces: readonly string[],
): StructureResult {
  const visible = entries.filter((e) => e.kind !== "ignored");
  const directories: DirectoryInfo[] = [];
  const unclassified: string[] = [];
  const architecture: ArchitectureSignal[] = [];
  const inferred = { type: "inferred" as const, detector: "structure" };

  for (const location of [".", ...workspaces]) {
    const frameworks = new Set(
      detections
        .filter(
          (d) => d.category === "framework" && (d.location === location || d.location === "."),
        )
        .map((d) => d.id),
    );
    const parents = [location];
    const srcDir = location === "." ? "src" : `${location}/src`;
    if (visible.some((e) => e.relativePath.startsWith(`${srcDir}/`))) parents.push(srcDir);

    for (const parent of parents) {
      for (const dir of childDirs(visible, parent)) {
        if (location === "." && workspaces.includes(dir.path)) continue;
        const holdsWorkspaces = workspaces.filter((w) => w.startsWith(`${dir.path}/`));
        if (location === "." && holdsWorkspaces.length > 0) {
          directories.push({
            path: dir.path,
            role: "workspace-packages",
            confidence: "high",
            source: inferred,
            evidence: [
              { kind: "workspace", detail: `${holdsWorkspaces.length} workspace package(s)` },
            ],
            files: dir.files.length,
          });
          continue;
        }
        const c = classify(dir, frameworks);
        if (!c) {
          unclassified.push(dir.path);
          continue;
        }
        directories.push({
          path: dir.path,
          role: c.role,
          confidence: c.confidence,
          source: inferred,
          evidence: c.evidence,
          files: dir.files.length,
        });

        if (c.role === "routes" && frameworks.has("nextjs")) {
          const base = path.posix.basename(dir.path);
          if (base === "app" || base === "pages") {
            architecture.push({
              id: base === "app" ? "nextjs-app-router" : "nextjs-pages-router",
              label: base === "app" ? "Next.js App Router" : "Next.js Pages Router",
              location,
              confidence: c.confidence,
              source: inferred,
              evidence: [{ kind: "directory", path: `${dir.path}/` }, ...c.evidence.slice(1)],
            });
          }
        }
        if (c.role === "feature-modules") {
          const modules = childDirs(visible, dir.path).map((d) => path.posix.basename(d.path));
          if (modules.length > 0) {
            architecture.push({
              id: "feature-modules",
              label: "Feature-oriented modules",
              location,
              confidence: modules.length >= 2 ? "high" : "medium",
              source: inferred,
              evidence: [
                { kind: "directory", path: `${dir.path}/` },
                {
                  kind: "modules",
                  detail: modules.slice(0, 5).join(", ") + (modules.length > 5 ? ", …" : ""),
                },
              ],
            });
          }
        }
        if (c.role === "ui-components" || c.role === "services-api" || c.role === "state") {
          const id = {
            "ui-components": "shared-ui-layer",
            "services-api": "service-layer",
            state: "state-layer",
          }[c.role];
          const label = {
            "ui-components": "Shared UI layer",
            "services-api": "Service / API layer",
            state: "Central state layer",
          }[c.role];
          if (!architecture.some((a) => a.id === id && a.location === location)) {
            architecture.push({
              id,
              label,
              location,
              confidence: c.confidence,
              source: inferred,
              evidence: [{ kind: "directory", path: `${dir.path}/` }],
            });
          }
        }
      }
    }
  }

  if (workspaces.length > 0) {
    architecture.unshift({
      id: "monorepo",
      label: `Monorepo (${workspaces.length} packages)`,
      location: ".",
      confidence: "high",
      source: { type: "detected", detector: "structure" },
      evidence: workspaces.map((w) => ({ kind: "workspace", path: w })),
    });
  }

  return { directories, unclassified, architecture };
}

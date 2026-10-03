import path from "node:path";
import type { Detection } from "../domain/types.js";
import type { DiscoveredEntry } from "../discovery/discover.js";
import type { DirectoryInfo, TestingModel } from "./types.js";

const TEST_DIR_SEGMENTS = new Set([
  "tests",
  "test",
  "__tests__",
  "spec",
  "e2e",
  "cypress",
  "playwright",
]);

function patternOf(base: string): string | null {
  let m = /\.(test|spec)\.([cm]?[jt]sx?)$/.exec(base);
  if (m) return `*.${m[1]}.${m[2]}`;
  if (/^test_.*\.py$/.test(base)) return "test_*.py";
  m = /_test\.(py|go)$/.exec(base);
  if (m) return `*_test.${m[1]}`;
  return null;
}

export function analyzeTesting(
  entries: readonly DiscoveredEntry[],
  detections: readonly Detection[],
  directories: readonly DirectoryInfo[],
): TestingModel {
  const counts = new Map<string, number>();
  let colocated = 0;
  let separate = 0;

  for (const e of entries) {
    if (e.kind === "ignored" || e.kind === "secret") continue;
    const segments = e.relativePath.split("/");
    // Fixture trees are inputs to tests, not tests.
    if (segments.includes("fixtures")) continue;
    const pattern = patternOf(path.posix.basename(e.relativePath));
    if (!pattern) continue;
    counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
    if (segments.slice(0, -1).some((s) => TEST_DIR_SEGMENTS.has(s))) separate += 1;
    else colocated += 1;
  }

  const total = colocated + separate;
  const placement: TestingModel["placement"] =
    total === 0
      ? "none"
      : separate / total >= 0.8
        ? "separate"
        : colocated / total >= 0.8
          ? "colocated"
          : "mixed";

  return {
    runners: detections
      .filter((d) => d.category === "testing")
      .map((d) => ({ id: d.id, label: d.label, location: d.location })),
    testFiles: total,
    patterns: [...counts.entries()]
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern)),
    placement,
    directories: directories
      .filter((d) => d.role === "tests" || d.role === "e2e-tests")
      .map((d) => d.path),
  };
}

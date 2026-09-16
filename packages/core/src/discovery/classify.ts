import path from "node:path";
import type { FileKind } from "../domain/types.js";
import { isSecretPath } from "./ignore.js";

const SOURCE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".vue",
  ".svelte",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
]);

const CONFIG_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "pyproject.toml",
  "cargo.toml",
  "go.mod",
  "composer.json",
  "gemfile",
  "dockerfile",
  "makefile",
]);

const CONFIG_EXT = new Set([".json", ".yml", ".yaml", ".toml", ".ini", ".config.js", ".config.mjs", ".config.ts"]);

const LOCKFILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "poetry.lock",
  "cargo.lock",
  "composer.lock",
]);

const DOC_EXT = new Set([".md", ".mdx", ".txt", ".rst"]);

export function classifyFile(relativePath: string): FileKind {
  const normalized = relativePath.replace(/\\/g, "/");
  if (isSecretPath(normalized)) return "secret";

  const base = path.posix.basename(normalized).toLowerCase();
  const ext = path.posix.extname(normalized).toLowerCase();

  if (LOCKFILES.has(base)) return "lockfile";
  if (CONFIG_NAMES.has(base)) return "config";
  if (base.endsWith(".config.js") || base.endsWith(".config.ts") || base.endsWith(".config.mjs")) {
    return "config";
  }
  if (DOC_EXT.has(ext)) return "document";
  if (SOURCE_EXT.has(ext)) return "source";
  if (CONFIG_EXT.has(ext) && (normalized.includes("config") || base.startsWith("."))) {
    return "config";
  }
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2"].includes(ext)) {
    return "asset";
  }
  return "other";
}

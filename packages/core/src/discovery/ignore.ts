import path from "node:path";

/** Default directory names always skipped during discovery. */
export const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".vercel",
  ".cache",
  ".agent-kit",
  "storybook-static",
]);

/** Basename / relative-path patterns treated as secrets (never hashed/logged as content). */
const SECRET_BASENAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  ".env.development.local",
  ".env.production.local",
  ".env.test.local",
  "credentials.json",
  "service-account.json",
  "id_rsa",
  "id_ed25519",
  ".npmrc",
]);

const SECRET_SUFFIXES = [".pem", ".p12", ".pfx", ".key"];

export function isIgnoredDirName(name: string): boolean {
  if (DEFAULT_IGNORE_DIRS.has(name)) return true;
  if (name === "node_modules") return true;
  return false;
}

export function isSecretPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  const base = path.posix.basename(normalized);

  if (SECRET_BASENAMES.has(base)) return true;
  if (base.startsWith(".env.")) return true;
  if (normalized.includes("/.ssh/") || normalized.startsWith(".ssh/")) return true;
  if (normalized.includes("/secrets/") || normalized.startsWith("secrets/")) return true;
  if (SECRET_SUFFIXES.some((s) => base.endsWith(s))) return true;
  return false;
}

export function matchesIgnoreGlobs(relativePath: string, globs: string[]): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  for (const glob of globs) {
    if (simpleGlobMatch(normalized, glob.replace(/\\/g, "/"))) return true;
  }
  return false;
}

/** Minimal glob: supports *, **, and exact segments. No full minimatch dependency. */
export function simpleGlobMatch(filePath: string, pattern: string): boolean {
  if (pattern === filePath) return true;
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return filePath === prefix || filePath.startsWith(prefix + "/");
  }
  if (pattern.includes("**/")) {
    const [head, ...rest] = pattern.split("**/");
    const tail = rest.join("**/");
    if (head && !filePath.startsWith(head)) return false;
    if (!tail) return true;
    return filePath.includes(tail.replace(/\*/g, "")) || wildcardMatch(filePath, pattern);
  }
  return wildcardMatch(filePath, pattern);
}

function wildcardMatch(input: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*");
  return new RegExp(`^${escaped}$`).test(input);
}

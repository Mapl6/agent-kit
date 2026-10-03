import type { ScanContext } from "./types.js";

export type PackageJson = {
  name?: string;
  packageManager?: string;
  workspaces?: string[] | { packages?: string[] };
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
};

/** Reads `package.json` in the context's directory and warns if it exists but can't be parsed. */
export async function readPackageJson(ctx: ScanContext): Promise<PackageJson | null> {
  const pkg = await ctx.readJson<PackageJson>("package.json");
  if (pkg === null && ctx.exists("package.json")) {
    const where = ctx.dir === "." ? "package.json" : `${ctx.dir}/package.json`;
    ctx.warn(`${where} exists but could not be parsed as JSON.`);
  }
  return pkg && typeof pkg === "object" ? pkg : null;
}

export function dependencyNames(pkg: PackageJson | null): Set<string> {
  return new Set([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
    ...Object.keys(pkg?.peerDependencies ?? {}),
  ]);
}

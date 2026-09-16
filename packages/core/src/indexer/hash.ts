import { createHash } from "node:crypto";
import fs from "node:fs/promises";

export function hashString(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function hashFileContents(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

export function hashSnapshotPayload(parts: string[]): string {
  return hashString(parts.join("\n"));
}

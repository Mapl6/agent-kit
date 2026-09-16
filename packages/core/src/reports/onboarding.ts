import type { ProjectSnapshot } from "../domain/types.js";

export function renderOnboardingPrompt(snapshot: ProjectSnapshot): string {
  const tech = snapshot.technologies.map((t) => t.label).join(", ") || "unknown stack";
  return `# Agent onboarding prompt (copy into a new chat)

You are working in a local repository indexed by agent-kit.

## Project facts
- Root: \`${snapshot.projectRoot}\`
- Detected stack: ${tech}
- Files observed: ${snapshot.stats.fileCount} (hashed: ${snapshot.stats.indexedCount})
- Last index: ${snapshot.updatedAt}

## Instructions
1. Prefer repository evidence over assumptions.
2. Do not invent folder names or scripts that are not present.
3. Keep secrets out of replies; never ask to paste .env contents.
4. When unsure, inspect the tree and package manifests first.

## First tasks
- Summarize the architecture in 5 bullets.
- List the safest commands to install, develop, test, and build.
- Note gaps in docs or tests you observe.
`;
}

import { agentConfigDetector } from "./detectors/agent-config.js";
import { languageDetector } from "./detectors/languages.js";
import { nodeRuntimeDetector, packageManagerDetector } from "./detectors/node.js";
import { ciDetector, gitDetector } from "./detectors/repo.js";
import { frameworkDetector, testingDetector, toolingDetector } from "./detectors/table.js";
import { workspaceDetector } from "./detectors/workspaces.js";
import type { Detector } from "./types.js";

export const BUILT_IN_DETECTORS: readonly Detector[] = [
  languageDetector,
  nodeRuntimeDetector,
  packageManagerDetector,
  workspaceDetector,
  frameworkDetector,
  testingDetector,
  toolingDetector,
  gitDetector,
  ciDetector,
  agentConfigDetector,
];

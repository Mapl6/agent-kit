/**
 * Stable CLI exit codes for scripting.
 *
 * | Code | Meaning              |
 * |------|----------------------|
 * | 0    | Success              |
 * | 1    | Unexpected / general |
 * | 2    | Invalid input/state  |
 * | 3    | Permission           |
 * | 4    | Storage              |
 * | 5    | Index                |
 */
export const ExitCode = {
  SUCCESS: 0,
  GENERAL: 1,
  INVALID_INPUT: 2,
  PERMISSION: 3,
  STORAGE: 4,
  INDEX: 5,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

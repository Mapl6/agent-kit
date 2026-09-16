import type { ErrorCode } from "./codes.js";
import { ExitCode, type ExitCodeValue } from "./exit-codes.js";

const EXIT_BY_CODE: Record<ErrorCode, ExitCodeValue> = {
  PROJECT_NOT_FOUND: ExitCode.INVALID_INPUT,
  INVALID_PROJECT_ROOT: ExitCode.INVALID_INPUT,
  ALREADY_INITIALIZED: ExitCode.INVALID_INPUT,
  CONFIG_INVALID: ExitCode.INVALID_INPUT,
  UNSUPPORTED_OPERATION: ExitCode.INVALID_INPUT,
  PERMISSION_DENIED: ExitCode.PERMISSION,
  STORAGE_WRITE_FAILED: ExitCode.STORAGE,
  INDEX_FAILED: ExitCode.INDEX,
};

export type AppErrorOptions = {
  code: ErrorCode;
  message: string;
  suggestedAction?: string;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly suggestedAction?: string;
  override readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.suggestedAction = options.suggestedAction;
    this.cause = options.cause;
  }

  get exitCode(): ExitCodeValue {
    return EXIT_BY_CODE[this.code] ?? ExitCode.GENERAL;
  }

  format(): string {
    const lines = [`Error: ${this.code}`, this.message];
    if (this.suggestedAction) {
      lines.push("Suggested action:", `  ${this.suggestedAction}`);
    }
    return lines.join("\n");
  }

  static isAppError(value: unknown): value is AppError {
    return value instanceof AppError;
  }
}

export function toExitCode(error: unknown): ExitCodeValue {
  if (AppError.isAppError(error)) return error.exitCode;
  return ExitCode.GENERAL;
}

export function formatCliError(error: unknown): string {
  if (AppError.isAppError(error)) return error.format();
  if (error instanceof Error) {
    return [`Error: GENERAL`, error.message].join("\n");
  }
  return [`Error: GENERAL`, String(error)].join("\n");
}

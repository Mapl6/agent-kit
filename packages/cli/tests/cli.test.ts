import { describe, expect, it } from "vitest";
import { createProgram } from "../src/program.js";

describe("cli program", () => {
  it("registers core commands", () => {
    const program = createProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toEqual(expect.arrayContaining(["scan", "init", "index", "status"]));
  });

  it("defaults to the read-only scan command", () => {
    const program = createProgram();
    expect((program as unknown as { _defaultCommandName?: string })._defaultCommandName).toBe(
      "scan",
    );
  });
});

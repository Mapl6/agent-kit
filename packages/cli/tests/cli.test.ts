import { describe, expect, it } from "vitest";
import { createProgram } from "../src/program.js";

describe("cli program", () => {
  it("registers Phase 1 commands", () => {
    const program = createProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toEqual(expect.arrayContaining(["init", "index", "status", "report"]));
  });
});

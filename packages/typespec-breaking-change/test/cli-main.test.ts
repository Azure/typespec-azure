import { afterEach, describe, expect, it, vi } from "vitest";

describe("CLI main module", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns exit code 2 when analysis fails", async () => {
    vi.doMock("../src/compile.js", () => ({
      compileService: vi.fn(async () => {
        throw new Error("boom");
      }),
    }));
    vi.doMock("../src/orchestrator.js", () => ({
      analyzeBaseAndHead: vi.fn(),
      analyzeProgram: vi.fn(),
    }));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { main } = await import("../src/cli.js");

    const code = await main(["head.tsp"]);

    expect(code).toBe(2);
    expect(errorSpy).toHaveBeenCalledWith("Analysis failed: boom");
  });

  it("formats non-Error failures in the catch path", async () => {
    vi.doMock("../src/compile.js", () => ({
      compileService: vi.fn(async () => {
        throw "boom";
      }),
    }));
    vi.doMock("../src/orchestrator.js", () => ({
      analyzeBaseAndHead: vi.fn(),
      analyzeProgram: vi.fn(),
    }));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { main } = await import("../src/cli.js");

    const code = await main(["head.tsp"]);

    expect(code).toBe(2);
    expect(errorSpy).toHaveBeenCalledWith("Analysis failed: boom");
  });

  it("runs main when the module is invoked directly", async () => {
    vi.doMock("../src/compile.js", () => ({
      compileService: vi.fn(async (path: string) => ({ path })),
    }));
    vi.doMock("../src/orchestrator.js", () => ({
      analyzeBaseAndHead: vi.fn(),
      analyzeProgram: vi.fn(() => ({
        findings: [],
        timing: {
          compileBaseMs: 0,
          compileHeadMs: 0,
          versionMutatorsMs: 0,
          canonicalizeMs: 0,
          identityMatchingMs: 0,
          diffEngineMs: 0,
          classifyMs: 0,
          suppressMs: 0,
          reportMs: 0,
          totalMs: 0,
        },
      })),
    }));

    const originalArgv = process.argv;
    process.argv = ["node", "typespec-breaking-change-cli", "head.tsp"];

    try {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as typeof process.exit);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

      await import("../src/cli.js");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(logSpy).toHaveBeenCalled();
    } finally {
      process.argv = originalArgv;
    }
  });
});

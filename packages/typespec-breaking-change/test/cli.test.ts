import { afterEach, describe, expect, it, vi } from "vitest";
import { parseArgs, formatResult, main, type CliOptions } from "../src/cli.js";
import * as compileModule from "../src/compile.js";
import * as orchestratorModule from "../src/orchestrator.js";
import type { AnalysisResult, Finding } from "../src/types.js";

describe("CLI argument parsing", () => {
  it("parses positional entry argument", () => {
    const opts = parseArgs(["main.tsp"]);
    expect(opts.entry).toBe("main.tsp");
    expect(opts.format).toBe("console");
  });

  it("parses --entry flag", () => {
    const opts = parseArgs(["--entry", "src/main.tsp"]);
    expect(opts.entry).toBe("src/main.tsp");
  });

  it("parses short flags", () => {
    const opts = parseArgs(["-e", "main.tsp", "-f", "json", "-p", "cross-version"]);
    expect(opts.entry).toBe("main.tsp");
    expect(opts.format).toBe("json");
    expect(opts.phase).toBe("cross-version");
  });

  it("parses --base for two-program comparison", () => {
    const opts = parseArgs(["--base", "base/main.tsp", "--entry", "head/main.tsp"]);
    expect(opts.base).toBe("base/main.tsp");
    expect(opts.entry).toBe("head/main.tsp");
  });

  it("parses short --base and --service aliases", () => {
    const opts = parseArgs(["-b", "base/main.tsp", "-s", "Widgets", "head/main.tsp"]);
    expect(opts.base).toBe("base/main.tsp");
    expect(opts.service).toBe("Widgets");
    expect(opts.entry).toBe("head/main.tsp");
  });

  it("parses --service filter", () => {
    const opts = parseArgs(["main.tsp", "--service", "Widgets"]);
    expect(opts.service).toBe("Widgets");
  });

  it("parses --phase flag", () => {
    const opts = parseArgs(["main.tsp", "--phase", "same-version"]);
    expect(opts.phase).toBe("same-version");
  });

  it("parses --show-suppressed flag", () => {
    const opts = parseArgs(["main.tsp", "--show-suppressed"]);
    expect(opts.showSuppressed).toBe(true);
  });

  it("parses --show-ignored flag", () => {
    const opts = parseArgs(["main.tsp", "--show-ignored"]);
    expect(opts.showIgnored).toBe(true);
  });

  it("parses --show-suppressed and --show-ignored", () => {
    const opts = parseArgs(["main.tsp", "--show-suppressed", "--show-ignored"]);
    expect(opts.showSuppressed).toBe(true);
    expect(opts.showIgnored).toBe(true);
  });

  it("prints usage and exits for --help", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit:${code ?? ""}`);
    }) as typeof process.exit);

    expect(() => parseArgs(["--help"])).toThrow("process.exit:0");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Usage: typespec-breaking-change"));

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("defaults a missing --entry value to an empty string", () => {
    const opts = parseArgs(["--entry"]);
    expect(opts.entry).toBe("");
  });

  it("defaults a missing --format value to console", () => {
    const opts = parseArgs(["main.tsp", "--format"]);
    expect(opts.format).toBe("console");
  });

  it("ignores extra positional arguments once entry is set", () => {
    const opts = parseArgs(["main.tsp", "secondary.tsp"]);
    expect(opts.entry).toBe("main.tsp");
  });

  it("ignores unknown dashed arguments as positional entries", () => {
    const opts = parseArgs(["--unknown"]);
    expect(opts.entry).toBe("");
  });
});

describe("CLI formatResult", () => {
  const mockResult: AnalysisResult = {
    findings: [
      {
        diff: {
          kind: "ResponsePropertyRemoved" as any,
          identity: { operation: { method: "GET", path: "/widgets" }, component: "response", element: "body.name" },
          message: "Response property 'name' was removed",
        },
        severity: "error",
        rule: "ResponsePropertyRemoved",
        phase: "cross-version",
        suppressed: false,
        versionPair: { baseVersion: "2024-01-01", headVersion: "2025-01-01", phase: "cross-version" },
      } as Finding,
    ],
    timing: {
      compileBaseMs: 100,
      compileHeadMs: 200,
      versionMutatorsMs: 10,
      canonicalizeMs: 50,
      identityMatchingMs: 20,
      diffEngineMs: 300,
      classifyMs: 15,
      suppressMs: 5,
      reportMs: 0,
      totalMs: 700,
    },
  };

  it("formats as JSON", () => {
    const opts: CliOptions = { entry: "main.tsp", format: "json" };
    const output = formatResult(mockResult, opts);
    const parsed = JSON.parse(output);
    expect(parsed.summary.errors).toBe(1);
    expect(parsed.findings).toHaveLength(1);
    expect(parsed.findings[0].kind).toBe("ResponsePropertyRemoved");
  });

  it("formats as GitHub markdown", () => {
    const opts: CliOptions = { entry: "main.tsp", format: "github" };
    const output = formatResult(mockResult, opts);
    expect(output).toContain("## Breaking Change Analysis");
    expect(output).toContain("1 breaking change");
  });

  it("formats as console", () => {
    const opts: CliOptions = { entry: "main.tsp", format: "console" };
    const output = formatResult(mockResult, opts);
    expect(output).toContain("ERROR");
    expect(output).toContain("ResponsePropertyRemoved");
  });
});

describe("CLI main", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns exit code 2 when no entry specified", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });

  it("returns exit code 0 for file with no breaking changes", async () => {
    // The compiler handles missing files gracefully (empty program with no versions)
    const code = await main(["nonexistent.tsp"]);
    expect(code).toBe(0);
  });

  it("runs two-program comparison when --base is provided", async () => {
    const compileSpy = vi
      .spyOn(compileModule, "compileService")
      .mockImplementation(async (path: string) => ({ path }) as any);
    const analyzeSpy = vi.spyOn(orchestratorModule, "analyzeBaseAndHead").mockReturnValue({
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
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await main(["--base", "base.tsp", "--entry", "head.tsp", "--service", "Test", "--phase", "same-version"]);

    expect(code).toBe(0);
    expect(compileSpy).toHaveBeenNthCalledWith(1, expect.stringMatching(/base\.tsp$/));
    expect(compileSpy).toHaveBeenNthCalledWith(2, expect.stringMatching(/head\.tsp$/));
    expect(analyzeSpy).toHaveBeenCalledWith(
      { path: expect.stringMatching(/base\.tsp$/) },
      { path: expect.stringMatching(/head\.tsp$/) },
      { serviceName: "Test", phase: "same-version" },
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Results: 0 errors"));
  });

  it("returns exit code 1 when single-program analysis finds an unsuppressed error", async () => {
    const compileSpy = vi
      .spyOn(compileModule, "compileService")
      .mockImplementation(async (path: string) => ({ path }) as any);
    const analyzeSpy = vi.spyOn(orchestratorModule, "analyzeProgram").mockReturnValue({
      findings: [
        {
          diff: {
            kind: "ResponsePropertyRemoved",
            identity: {
              operation: { method: "GET", path: "/widgets" },
              component: "response",
              element: "body.name",
            },
            message: "Response property 'name' was removed",
          },
          severity: "error",
          rule: "ResponsePropertyRemoved",
          phase: "cross-version",
          suppressed: false,
          versionPair: {
            baseVersion: "2024-01-01",
            headVersion: "2025-01-01",
            phase: "cross-version",
          },
        },
      ] as Finding[],
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
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await main(["head.tsp"]);

    expect(code).toBe(1);
    expect(compileSpy).toHaveBeenCalledWith(expect.stringMatching(/head\.tsp$/));
    expect(analyzeSpy).toHaveBeenCalledWith(
      { path: expect.stringMatching(/head\.tsp$/) },
      { serviceName: undefined, phase: undefined },
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("ResponsePropertyRemoved"));
  });

  it("returns exit code 2 when analysis throws", async () => {
    vi.spyOn(compileModule, "compileService").mockImplementation(async () => {
      throw new Error("boom");
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const code = await main(["head.tsp"]);

    expect(code).toBe(2);
    expect(errorSpy).toHaveBeenCalledWith("Analysis failed: boom");
  });
});

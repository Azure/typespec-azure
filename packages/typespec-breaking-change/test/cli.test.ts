import { describe, expect, it } from "vitest";
import { parseArgs, formatResult, main, type CliOptions } from "../src/cli.js";
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

  it("parses --service filter", () => {
    const opts = parseArgs(["main.tsp", "--service", "Widgets"]);
    expect(opts.service).toBe("Widgets");
  });

  it("parses --show-suppressed and --show-ignored", () => {
    const opts = parseArgs(["main.tsp", "--show-suppressed", "--show-ignored"]);
    expect(opts.showSuppressed).toBe(true);
    expect(opts.showIgnored).toBe(true);
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
  it("returns exit code 2 when no entry specified", async () => {
    const code = await main([]);
    expect(code).toBe(2);
  });

  it("returns exit code 0 for file with no breaking changes", async () => {
    // The compiler handles missing files gracefully (empty program with no versions)
    const code = await main(["nonexistent.tsp"]);
    expect(code).toBe(0);
  });
});

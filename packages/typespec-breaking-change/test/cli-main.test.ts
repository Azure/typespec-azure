import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("CLI main module", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns exit code 2 when analysis fails", { timeout: 30000 }, async () => {
    vi.doMock("../src/cli/compile.js", () => ({
      compileService: vi.fn(async () => {
        throw new Error("boom");
      }),
    }));
    vi.doMock("../src/pipeline/orchestrator.js", () => ({
      analyzeBaseAndHead: vi.fn(),
      analyzeProgram: vi.fn(),
    }));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { main } = await import("../src/cli/cli.js");

    const code = await main(["head.tsp"]);

    expect(code).toBe(2);
    expect(errorSpy).toHaveBeenCalledWith("Analysis failed: boom");
  });

  it("formats non-Error failures in the catch path", async () => {
    vi.doMock("../src/cli/compile.js", () => ({
      compileService: vi.fn(async () => {
        throw "boom";
      }),
    }));
    vi.doMock("../src/pipeline/orchestrator.js", () => ({
      analyzeBaseAndHead: vi.fn(),
      analyzeProgram: vi.fn(),
    }));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { main } = await import("../src/cli/cli.js");

    const code = await main(["head.tsp"]);

    expect(code).toBe(2);
    expect(errorSpy).toHaveBeenCalledWith("Analysis failed: boom");
  });

  it("resolves --base-ref into --base via checkoutRevision and cleans up afterward", async () => {
    const cleanup = vi.fn(async () => undefined);
    const checkoutRevision = vi.fn(async () => ({
      worktreePath: "/tmp/worktree-root",
      cleanup,
    }));
    // Use a real temp directory as the "mapped" base path so the CLI's
    // fs.stat existence check (real fs, not mocked) succeeds — this test is
    // exercising the two-program (base+head) branch, distinct from the
    // "folder didn't exist at base revision" fallback covered separately
    // below.
    const mappedBasePath = await mkdtemp(join(tmpdir(), "typespec-breaking-change-cli-test-"));
    const mapPathIntoWorktree = vi.fn(async () => mappedBasePath);

    vi.doMock("../src/cli/git-checkout.js", () => ({
      checkoutRevision,
      getRepoRoot: vi.fn(async () => "/tmp"),
      mapPathIntoWorktree,
    }));
    vi.doMock("../src/cli/compile.js", () => ({
      compileService: vi.fn(async (path: string) => ({ path })),
    }));
    vi.doMock("../src/pipeline/orchestrator.js", () => ({
      analyzeBaseAndHead: vi.fn(() => ({
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
        summary: { servicesAnalyzed: 1, comparisonsPerformed: 1, versionComparisons: [] },
      })),
      analyzeProgram: vi.fn(),
    }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { main } = await import("../src/cli/cli.js");

    const code = await main(["spec-folder", "--base-ref", "origin/main"]);

    expect(code).toBe(0);
    expect(checkoutRevision).toHaveBeenCalledWith(
      "origin/main",
      expect.stringContaining("spec-folder"),
      expect.objectContaining({ sparsePaths: expect.any(Array) }),
    );
    expect(mapPathIntoWorktree).toHaveBeenCalledWith(
      expect.stringContaining("spec-folder"),
      expect.stringContaining("spec-folder"),
      "/tmp/worktree-root",
    );
    expect(cleanup).toHaveBeenCalledOnce();

    logSpy.mockRestore();
    await rm(mappedBasePath, { recursive: true, force: true });
  });

  it("falls back to single-program analysis when the folder doesn't exist at --base-ref", async () => {
    const cleanup = vi.fn(async () => undefined);
    vi.doMock("../src/cli/git-checkout.js", () => ({
      checkoutRevision: vi.fn(async () => ({ worktreePath: "/tmp/worktree-root", cleanup })),
      getRepoRoot: vi.fn(async () => "/tmp"),
      mapPathIntoWorktree: vi.fn(async () => "/tmp/worktree-root/spec-folder"),
    }));
    const compileService = vi.fn(async (path: string) => ({ path }));
    vi.doMock("../src/cli/compile.js", () => ({ compileService }));
    const analyzeBaseAndHead = vi.fn();
    const analyzeProgram = vi.fn(() => ({
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
      summary: { servicesAnalyzed: 1, comparisonsPerformed: 1, versionComparisons: [] },
    }));
    vi.doMock("../src/pipeline/orchestrator.js", () => ({ analyzeBaseAndHead, analyzeProgram }));
    // Real fs.stat: the mocked worktree path genuinely doesn't exist on disk,
    // so this exercises the "folder didn't exist at base revision" fallback
    // without needing to mock fs/promises at all.

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { main } = await import("../src/cli/cli.js");

    const code = await main(["spec-folder", "--base-ref", "origin/main"]);

    expect(code).toBe(0);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(analyzeBaseAndHead).not.toHaveBeenCalled();
    expect(analyzeProgram).toHaveBeenCalledOnce();
    // Only the head folder should have been compiled — never the
    // (nonexistent) base path.
    expect(compileService).toHaveBeenCalledOnce();
    expect(compileService).toHaveBeenCalledWith(expect.stringContaining("spec-folder"));

    logSpy.mockRestore();
  });

  it("prefers an explicit --base path over --base-ref and skips checkout", async () => {
    const checkoutRevision = vi.fn();
    vi.doMock("../src/cli/git-checkout.js", () => ({
      checkoutRevision,
      getRepoRoot: vi.fn(async () => "/tmp"),
      mapPathIntoWorktree: vi.fn(),
    }));
    vi.doMock("../src/cli/compile.js", () => ({
      compileService: vi.fn(async (path: string) => ({ path })),
    }));
    vi.doMock("../src/pipeline/orchestrator.js", () => ({
      analyzeBaseAndHead: vi.fn(() => ({
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
        summary: { servicesAnalyzed: 1, comparisonsPerformed: 1, versionComparisons: [] },
      })),
      analyzeProgram: vi.fn(),
    }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { main } = await import("../src/cli/cli.js");

    const code = await main([
      "spec-folder",
      "--base",
      "base-folder",
      "--base-ref",
      "origin/main",
    ]);

    expect(code).toBe(0);
    expect(checkoutRevision).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it("cleans up the worktree checkout even when analysis throws", async () => {
    const cleanup = vi.fn(async () => undefined);
    vi.doMock("../src/cli/git-checkout.js", () => ({
      checkoutRevision: vi.fn(async () => ({ worktreePath: "/tmp/worktree-root", cleanup })),
      getRepoRoot: vi.fn(async () => "/tmp"),
      mapPathIntoWorktree: vi.fn(async () => "/tmp/worktree-root/spec-folder"),
    }));
    vi.doMock("../src/cli/compile.js", () => ({
      compileService: vi.fn(async () => {
        throw new Error("compile failed");
      }),
    }));
    vi.doMock("../src/pipeline/orchestrator.js", () => ({
      analyzeBaseAndHead: vi.fn(),
      analyzeProgram: vi.fn(),
    }));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { main } = await import("../src/cli/cli.js");

    const code = await main(["spec-folder", "--base-ref", "origin/main"]);

    expect(code).toBe(2);
    expect(cleanup).toHaveBeenCalledOnce();

    errorSpy.mockRestore();
  });

  it("runs main when the module is invoked directly", async () => {
    vi.doMock("../src/cli/compile.js", () => ({
      compileService: vi.fn(async (path: string) => ({ path })),
    }));
    vi.doMock("../src/pipeline/orchestrator.js", () => ({
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
        summary: {
          servicesAnalyzed: 1,
          comparisonsPerformed: 0,
          versionComparisons: [],
          noComparisonReason: "All versions are preview.",
        },
      })),
    }));

    const originalArgv = process.argv;
    process.argv = ["node", "typespec-breaking-change-cli", "head.tsp"];

    try {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as typeof process.exit);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

      await import("../src/cli/cli.js");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(logSpy).toHaveBeenCalled();
    } finally {
      process.argv = originalArgv;
    }
  });
});

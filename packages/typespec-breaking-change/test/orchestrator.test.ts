import { describe, expect, it } from "vitest";
import { analyzeBaseAndHead, analyzeProgram } from "../src/orchestrator.js";
import { Tester, TesterWithSuppressions } from "./test-host.js";

describe("orchestrator", () => {
  it("analyzes a single program with cross-version suppression applied", async () => {
    const { program } = await TesterWithSuppressions.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("legacy field removal")
        @removed(Versions.v2)
        legacy?: string;

        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeProgram(program);
    const finding = result.findings.find((candidate) => candidate.diff.kind === "RequestPropertyRemoved");

    expect(finding).toBeDefined();
    expect(finding).toEqual(
      expect.objectContaining({
        phase: "cross-version",
        suppressed: true,
        suppressionReason: "legacy field removal",
        versionPair: expect.objectContaining({
          baseVersion: "2024-01-01",
          headVersion: "2025-01-01",
        }),
      }),
    );
    expect(result.timing.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("uses Phase A to identify changed versions before Phase B", async () => {
    const { program: baseProgram } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions {
        v1: "2024-01-01",
        v2: "2025-01-01",
      }

      model Widget {
        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const { program: headProgram } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions {
        v1: "2024-01-01",
        v2: "2025-01-01",
        v3: "2026-01-01",
      }

      model Widget {
        name: string;
        @added(Versions.v2) age?: int32;
        @added(Versions.v3) height?: int32;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeBaseAndHead(baseProgram, headProgram);

    expect(
      result.findings.some(
        (finding) =>
          finding.phase === "same-version" && finding.versionPair.headVersion === "2025-01-01",
      ),
    ).toBe(true);
    expect(
      result.findings.some(
        (finding) =>
          finding.phase === "cross-version" && finding.versionPair.headVersion === "2025-01-01",
      ),
    ).toBe(true);
    expect(
      result.findings.some(
        (finding) =>
          finding.phase === "cross-version" && finding.versionPair.headVersion === "2026-01-01",
      ),
    ).toBe(true);
    expect(
      result.findings.some(
        (finding) =>
          finding.phase === "same-version" && finding.versionPair.headVersion === "2024-01-01",
      ),
    ).toBe(false);
  });
});

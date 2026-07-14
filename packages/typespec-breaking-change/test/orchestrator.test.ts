import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeBaseAndHead, analyzeProgram } from "../src/orchestrator.js";
import { Tester, TesterWithSuppressions } from "./test-host.js";

describe("orchestrator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("filters single-program analysis by service name", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @removed(Versions.v2)
        legacy?: string;

        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeProgram(program, { serviceName: "OtherService" });

    expect(result.findings).toHaveLength(0);
  });

  it("skips cross-version analysis in single-program mode when phase is same-version", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @removed(Versions.v2)
        legacy?: string;

        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeProgram(program, { phase: "same-version" });

    expect(result.findings).toHaveLength(0);
  });

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

  it("filters two-program analysis by service name", async () => {
    const { program: baseProgram } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

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

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;

        @added(Versions.v2)
        extra?: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeBaseAndHead(baseProgram, headProgram, { serviceName: "OtherService" });

    expect(result.findings).toHaveLength(0);
  });

  it("runs only cross-version analysis when phase is cross-version", async () => {
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

    const result = analyzeBaseAndHead(baseProgram, headProgram, {
      serviceName: "TestService",
      phase: "cross-version",
    });

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every((finding) => finding.phase === "cross-version")).toBe(true);
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

  it("skips Phase A pairs when the matching base service is missing", async () => {
    vi.doMock("../src/versions.js", () => ({
      enumerateVersions: vi.fn((program: object) =>
        program === baseProgram
          ? []
          : [{ service: { name: "HeadService" }, versions: ["2025-01-01"] }],
      ),
      buildPhaseAPairs: vi.fn(() => [
        {
          baseVersion: "2025-01-01",
          headVersion: "2025-01-01",
          phase: "same-version",
        },
      ]),
      buildPhaseBPairs: vi.fn(() => []),
      createVersionedView: vi.fn(),
    }));
    vi.doMock("../src/suppression.js", () => ({
      applySuppressions: vi.fn((findings: unknown[]) => findings),
    }));

    const { analyzeBaseAndHead: mockedAnalyzeBaseAndHead } = await import("../src/orchestrator.js");
    const baseProgram = {};
    const headProgram = {};

    const result = mockedAnalyzeBaseAndHead(baseProgram as any, headProgram as any, {
      phase: "same-version",
    });

    expect(result.findings).toHaveLength(0);
  });

  it("skips Phase B when no changed or new versions are present", async () => {
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
      }

      model Widget {
        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeBaseAndHead(baseProgram, headProgram, { phase: "cross-version" });

    expect(result.findings).toHaveLength(0);
  });
});

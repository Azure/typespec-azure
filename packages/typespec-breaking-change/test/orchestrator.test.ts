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

  it("suppresses with since parameter — only applies when head >= since version", async () => {
    const { program } = await TesterWithSuppressions.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01", v3: "2026-01-01" }

      model Widget {
        @approvedBreakingChange("property removed starting v3", "RequestPropertyRemoved", "2026-01-01")
        @removed(Versions.v2)
        legacy?: string;

        name: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeProgram(program);
    // The v1→v2 comparison has headVersion="2025-01-01" which is < since="2026-01-01"
    // So the suppression should NOT match for that pair
    const finding = result.findings.find(
      (f) => f.diff.kind === "RequestPropertyRemoved" && f.versionPair.headVersion === "2025-01-01",
    );
    expect(finding).toBeDefined();
    expect(finding!.suppressed).toBe(false);

    // The v2→v3 pair would have headVersion="2026-01-01" which is >= since
    const findingV3 = result.findings.find(
      (f) => f.diff.kind === "RequestPropertyRemoved" && f.versionPair.headVersion === "2026-01-01",
    );
    // If there's a v3 finding, it should be suppressed
    if (findingV3) {
      expect(findingV3.suppressed).toBe(true);
    }
  });

  it("end-to-end demo scenario: detect breaking change, suppress it, verify", async () => {
    // Step 1: Spec WITHOUT suppression — breaking change detected
    const { program: unsuppressed } = await TesterWithSuppressions.compile(`
      @versioned(Versions)
      @service
      namespace DemoService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Fleet {
        name: string;
        @removed(Versions.v2) legacyId?: string;
      }

      @route("/fleets")
      @get
      op listFleets(): Fleet[];

      @route("/fleets/{name}")
      @get
      op getFleet(@path name: string): Fleet;
    `);

    const unsuppressedResult = analyzeProgram(unsuppressed);
    const breaking = unsuppressedResult.findings.filter(
      (f) => f.severity === "error" && !f.suppressed,
    );
    expect(breaking.length).toBeGreaterThan(0);
    expect(breaking.some((f) => f.diff.kind === "ResponsePropertyRemoved")).toBe(true);

    // Step 2: Same spec WITH suppression — breaking change is approved
    const { program: suppressed } = await TesterWithSuppressions.compile(`
      @versioned(Versions)
      @service
      namespace DemoService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Fleet {
        name: string;
        @approvedBreakingChange("legacyId replaced by name field")
        @removed(Versions.v2) legacyId?: string;
      }

      @route("/fleets")
      @get
      op listFleets(): Fleet[];

      @route("/fleets/{name}")
      @get
      op getFleet(@path name: string): Fleet;
    `);

    const suppressedResult = analyzeProgram(suppressed);
    const suppressedFindings = suppressedResult.findings.filter(
      (f) => f.diff.kind === "ResponsePropertyRemoved",
    );
    expect(suppressedFindings.length).toBeGreaterThan(0);
    expect(suppressedFindings.every((f) => f.suppressed)).toBe(true);
    expect(suppressedFindings[0].suppressionReason).toBe("legacyId replaced by name field");

    // Step 3: Unsuppressed errors count should be zero for ResponsePropertyRemoved
    const remainingErrors = suppressedResult.findings.filter(
      (f) => f.diff.kind === "ResponsePropertyRemoved" && f.severity === "error" && !f.suppressed,
    );
    expect(remainingErrors).toHaveLength(0);
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

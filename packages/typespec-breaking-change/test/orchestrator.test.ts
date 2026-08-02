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
    const finding = result.findings.find((candidate) => candidate.diff.kind === "ResourcePropertyRemoved");

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
        @approvedBreakingChange("property removed starting v3", #{ kind: "RequestPropertyRemoved", since: "2026-01-01" })
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
      (f) => f.diff.kind === "ResourcePropertyRemoved" && f.versionPair.headVersion === "2025-01-01",
    );
    expect(finding).toBeDefined();
    expect(finding!.suppressed).toBe(false);

    // The v2→v3 pair would have headVersion="2026-01-01" which is >= since
    const findingV3 = result.findings.find(
      (f) => f.diff.kind === "ResourcePropertyRemoved" && f.versionPair.headVersion === "2026-01-01",
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

  it("operation-level suppression requires a path for inline response model findings", async () => {
    const { program } = await TesterWithSuppressions.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      @route("/widgets")
      @get
      @approvedBreakingChange("approved", #{ path: "responses.200.body.properties.legacy" })
      op getWidget(): { name: string; @removed(Versions.v2) legacy?: string; };
    `);

    const result = analyzeProgram(program);
    const errors = result.findings.filter((f) => f.severity === "error" && !f.suppressed);
    expect(errors).toHaveLength(0);
  });

  it("operation-level suppression requires a path for inline request body findings", async () => {
    const { program } = await TesterWithSuppressions.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      @route("/widgets")
      @post
      @approvedBreakingChange("approved", #{ path: "request.body.properties.legacy" })
      op createWidget(@body body: { name: string; @removed(Versions.v2) legacy?: string; }): void;
    `);

    const result = analyzeProgram(program);
    const errors = result.findings.filter((f) => f.severity === "error" && !f.suppressed);
    expect(errors).toHaveLength(0);
  });

  it("without operation-level suppression, inline model findings are errors", async () => {
    const { program } = await TesterWithSuppressions.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      @route("/widgets")
      @get
      op getWidget(): { name: string; @removed(Versions.v2) legacy?: string; };
    `);

    const result = analyzeProgram(program);
    const errors = result.findings.filter((f) => f.severity === "error" && !f.suppressed);
    expect(errors.length).toBeGreaterThan(0);
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

  it("collapses Phase A findings across version pairs for the same logical change", async () => {
    const { program: baseProgram } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        city?: string;
      }

      @route("/widgets")
      @put
      op createWidget(@body widget: Widget): Widget;
    `);

    const { program: headProgram } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
      }

      @route("/widgets")
      @put
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeBaseAndHead(baseProgram, headProgram, { phase: "same-version" });

    // Despite 2 versions, the same unversioned change should appear only once
    const cityRemoved = result.findings.filter(
      (f) => f.diff.kind === "ResourcePropertyRemoved" && f.diff.identity.element.includes("city"),
    );
    expect(cityRemoved).toHaveLength(1);

    // Should be Phase A
    expect(cityRemoved[0].phase).toBe("same-version");
  });

  describe("source type tracing and deduplication", () => {
    // Scenario 1: ARM-style nested envelope (TrackedResource<Props> pattern)
    // Properties are nested: body → properties → properties → actualProp
    // This is the exact pattern that failed in production with the Contoso spec.
    it("traces source through ARM-style nested envelope model", async () => {
      const { program } = await Tester.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Resource {
          name: string;
          properties: EmployeeProperties;
        }

        model EmployeeProperties {
          @removed(Versions.v2) city?: string;
          department: string;
        }

        @route("/employees/{name}")
        @get
        op getEmployee(@path name: string): Resource;

        @route("/employees/{name}")
        @put
        op createEmployee(@path name: string, @body body: Resource): Resource;

        @route("/employees/{name}")
        @patch
        op updateEmployee(@path name: string, @body body: Resource): Resource;
      `);

      const result = analyzeProgram(program);

      // "city" should produce exactly ONE finding per kind, not one per operation
      const resourceRemoved = result.findings.filter(
        (f) => f.diff.kind === "ResourcePropertyRemoved" && f.diff.identity.element.includes("city"),
      );
      expect(resourceRemoved).toHaveLength(1);

      // Source type should trace back to the EmployeeProperties.city declaration
      const sourceType = resourceRemoved[0].diff.headType ?? resourceRemoved[0].diff.baseType;
      expect(sourceType).toBeDefined();
      expect(sourceType!.kind).toBe("ModelProperty");
      expect((sourceType as any).name).toBe("city");
    });

    // Scenario 2: Shared model across full CRUD (GET, PUT, PATCH, DELETE, LIST)
    it("deduplicates across full CRUD operation set", async () => {
      const { program } = await Tester.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @removed(Versions.v2) legacy?: string;
        }

        @route("/widgets/{name}")
        @get op getWidget(@path name: string): Widget;

        @route("/widgets")
        @get op listWidgets(): Widget[];

        @route("/widgets/{name}")
        @put op createWidget(@path name: string, @body widget: Widget): Widget;

        @route("/widgets/{name}")
        @patch op updateWidget(@path name: string, @body widget: Widget): Widget;

        @route("/widgets/{name}")
        @delete op deleteWidget(@path name: string): void;
      `);

      const result = analyzeProgram(program);

      // Despite 5 operations, "legacy" should produce exactly 1 ResourcePropertyRemoved
      // (merged from Request + Response, then deduped across operations)
      const resourceRemoved = result.findings.filter(
        (f) => f.diff.kind === "ResourcePropertyRemoved" && f.diff.identity.element.includes("legacy"),
      );
      expect(resourceRemoved).toHaveLength(1);
    });

    // Scenario 3: Type changes — both headType and baseType present
    it("traces source for type changes where both head and base types exist", async () => {
      const { program } = await Tester.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Employee {
          @typeChangedFrom(Versions.v2, int32)
          age?: int64;
          name: string;
        }

        @route("/employees/{name}")
        @get op getEmployee(@path name: string): Employee;

        @route("/employees/{name}")
        @put op createEmployee(@path name: string, @body body: Employee): Employee;

        @route("/employees/{name}")
        @patch op updateEmployee(@path name: string, @body body: Employee): Employee;
      `);

      const result = analyzeProgram(program);

      // Type change on "age" should produce exactly 1 merged Resource finding
      const resourceTypeChanged = result.findings.filter(
        (f) => f.diff.kind === "ResourcePropertyTypeChanged" && f.diff.identity.element.includes("age"),
      );
      expect(resourceTypeChanged).toHaveLength(1);

      // headType should be the ModelProperty "age", not a Scalar
      for (const f of resourceTypeChanged) {
        expect(f.diff.headType).toBeDefined();
        expect(f.diff.headType!.kind).toBe("ModelProperty");
        expect((f.diff.headType as any).name).toBe("age");

        // Source location should point to user code, not intrinsics.tsp
        expect(f.diff.headSourceLocation).toBeDefined();
        expect(f.diff.headSourceLocation!.file.path).not.toContain("intrinsics");
      }
    });

    // Scenario 4: Model shared between request and response — merged into Resource finding
    it("merges request and response findings into Resource for shared model", async () => {
      const { program } = await Tester.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          @removed(Versions.v2) legacy?: string;
          name: string;
        }

        @route("/widgets")
        @put
        op createWidget(@body widget: Widget): Widget;
      `);

      const result = analyzeProgram(program);
      const legacyFindings = result.findings.filter(
        (f) => f.diff.identity.element.includes("legacy") && f.severity === "error",
      );

      // Should have one ResourcePropertyRemoved (merged from Request + Response)
      const kinds = new Set(legacyFindings.map((f) => f.diff.kind));
      expect(kinds.has("ResourcePropertyRemoved")).toBe(true);
      expect(legacyFindings.filter((f) => f.diff.kind === "ResourcePropertyRemoved")).toHaveLength(1);
    });

    // Scenario 5: Deeply nested models (Model → SubModel → SubSubModel → property)
    it("traces source through deeply nested model hierarchy", async () => {
      const { program } = await Tester.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Outer {
          name: string;
          inner: Inner;
        }

        model Inner {
          details: Details;
        }

        model Details {
          @removed(Versions.v2) obsolete?: string;
          value: string;
        }

        @route("/items")
        @get op getItem(): Outer;

        @route("/items")
        @put op createItem(@body item: Outer): Outer;
      `);

      const result = analyzeProgram(program);

      const removed = result.findings.filter(
        (f) =>
          f.diff.kind === "ResourcePropertyRemoved" &&
          f.diff.identity.element.includes("obsolete"),
      );

      // Exactly 1 Resource finding (merged from Request + Response) despite 2-level nesting
      expect(removed).toHaveLength(1);

      // Source type traces to Details.obsolete
      for (const f of removed) {
        const sourceType = f.diff.headType ?? f.diff.baseType;
        expect(sourceType).toBeDefined();
        expect(sourceType!.kind).toBe("ModelProperty");
        expect((sourceType as any).name).toBe("obsolete");
      }
    });

    // Scenario 6: Different properties on same model are NOT deduped
    it("does NOT deduplicate findings for different properties on the same model", async () => {
      const { program } = await Tester.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          @removed(Versions.v2) city?: string;
          @removed(Versions.v2) state?: string;
          name: string;
        }

        @route("/widgets")
        @put
        op createWidget(@body widget: Widget): Widget;
      `);

      const result = analyzeProgram(program);
      const resourceRemoved = result.findings.filter((f) => f.diff.kind === "ResourcePropertyRemoved");

      const elements = resourceRemoved.map((f) => f.diff.identity.element);
      expect(elements.some((e) => e.includes("city"))).toBe(true);
      expect(elements.some((e) => e.includes("state"))).toBe(true);
    });

    // Scenario 7: Source location never points to intrinsics
    it("source location points to user code for type changes, not compiler intrinsics", async () => {
      const { program } = await Tester.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Employee {
          @typeChangedFrom(Versions.v2, int32)
          age?: int64;
          name: string;
        }

        @route("/employees")
        @get
        op getEmployee(): Employee;
      `);

      const result = analyzeProgram(program);
      const typeChanged = result.findings.find(
        (f) => f.diff.kind === "ResponsePropertyTypeChanged",
      );

      expect(typeChanged).toBeDefined();
      expect(typeChanged!.diff.headSourceLocation).toBeDefined();
      expect(typeChanged!.diff.headSourceLocation!.file.path).not.toContain("intrinsics");
    });

    // Scenario 8: Suppression on shared model works across all operations
    it("suppression on a shared model property suppresses across all operations", async () => {
      const { program } = await TesterWithSuppressions.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Employee {
          name: string;
          @approvedBreakingChange("city removed", #{ kind: "RequestPropertyRemoved" })
          @approvedBreakingChange("city removed", #{ kind: "ResponsePropertyRemoved" })
          @removed(Versions.v2)
          city?: string;
        }

        @route("/employees/{name}")
        @get
        op getEmployee(@path name: string): Employee;

        @route("/employees/{name}")
        @put
        op createEmployee(@path name: string, @body employee: Employee): Employee;

        @route("/employees/{name}")
        @patch
        op updateEmployee(@path name: string, @body employee: Employee): Employee;
      `);

      const result = analyzeProgram(program);
      const cityFindings = result.findings.filter((f) =>
        f.diff.identity.element.includes("city"),
      );

      expect(cityFindings.length).toBeGreaterThan(0);
      for (const f of cityFindings) {
        expect(f.suppressed).toBe(true);
      }

      // No unsuppressed errors at all
      const unsuppressed = result.findings.filter(
        (f) => f.severity === "error" && !f.suppressed,
      );
      expect(unsuppressed).toHaveLength(0);
    });

    // Scenario 9: Suppression on nested ARM-style model works
    it("suppression on nested envelope property works", async () => {
      const { program } = await TesterWithSuppressions.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Resource {
          name: string;
          properties: EmployeeProperties;
        }

        model EmployeeProperties {
          @approvedBreakingChange("city removed", #{ kind: "RequestPropertyRemoved" })
          @approvedBreakingChange("city removed", #{ kind: "ResponsePropertyRemoved" })
          @removed(Versions.v2)
          city?: string;
          department: string;
        }

        @route("/employees/{name}")
        @get op getEmployee(@path name: string): Resource;

        @route("/employees/{name}")
        @put op createEmployee(@path name: string, @body body: Resource): Resource;
      `);

      const result = analyzeProgram(program);
      const cityFindings = result.findings.filter((f) =>
        f.diff.identity.element.includes("city"),
      );

      expect(cityFindings.length).toBeGreaterThan(0);
      for (const f of cityFindings) {
        expect(f.suppressed).toBe(true);
      }
    });

    // Scenario 10: Different models for request and response — NOT merged
    it("preserves separate Request and Response findings when models differ", async () => {
      const { program } = await Tester.compile(`
        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model WidgetInput {
          @removed(Versions.v2) legacy?: string;
          name: string;
        }

        model WidgetOutput {
          id: string;
          name: string;
          @removed(Versions.v2) oldField?: string;
        }

        @route("/widgets")
        @put
        op createWidget(@body widget: WidgetInput): WidgetOutput;
      `);

      const result = analyzeProgram(program);

      // Different properties in different models — should NOT merge
      const requestRemoved = result.findings.filter(
        (f) => f.diff.kind === "RequestPropertyRemoved" && f.diff.identity.element.includes("legacy"),
      );
      const responseRemoved = result.findings.filter(
        (f) => f.diff.kind === "ResponsePropertyRemoved" && f.diff.identity.element.includes("oldField"),
      );

      expect(requestRemoved).toHaveLength(1);
      expect(responseRemoved).toHaveLength(1);

      // No Resource merging happened (different element paths)
      const resourceFindings = result.findings.filter((f) => f.diff.kind.startsWith("Resource"));
      expect(resourceFindings).toHaveLength(0);
    });
  });
});

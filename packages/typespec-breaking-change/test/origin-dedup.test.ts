import { describe, expect, it } from "vitest";
import { computeDiffs } from "../src/diff-engine.js";
import { applySuppressions } from "../src/suppression.js";
import { classifyDiffs } from "../src/policy.js";
import type { VersionedView } from "../src/types.js";
import { createVersionedView, enumerateVersions } from "../src/versions.js";
import { Tester, TesterWithSuppressions } from "./test-host.js";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Two-spec comparison: compile base and head as separate programs,
 * then compare the same version across them. This is the real Phase A scenario.
 */
async function compileTwoSpecs(
  baseSpec: string,
  headSpec: string,
  version: string = "2024-01-01",
): Promise<{ baseView: VersionedView; headView: VersionedView }> {
  const strip = (s: string) => s.replace(/^\s*using TypeSpec\.(Http|Versioning);\s*$/gm, "");

  const { program: baseProgram } = await Tester.compile(strip(baseSpec));
  const { program: headProgram } = await Tester.compile(strip(headSpec));

  const [baseService] = enumerateVersions(baseProgram);
  const [headService] = enumerateVersions(headProgram);

  expect(baseService).toBeDefined();
  expect(headService).toBeDefined();

  return {
    baseView: createVersionedView(baseProgram, baseService.service, version),
    headView: createVersionedView(headProgram, headService.service, version),
  };
}

/** Single-spec helper: two versions within one compilation. */
async function compileVersionedViews(spec: string): Promise<{
  baseView: VersionedView;
  headView: VersionedView;
}> {
  const normalizedSpec = spec.replace(/^\s*using TypeSpec\.(Http|Versioning);\s*$/gm, "");
  const { program } = await Tester.compile(normalizedSpec);
  const [service] = enumerateVersions(program);

  expect(service).toBeDefined();
  expect(service.versions).toHaveLength(2);

  return {
    baseView: createVersionedView(program, service.service, service.versions[0]),
    headView: createVersionedView(program, service.service, service.versions[1]),
  };
}

const VERSION = "2024-01-01";
const preamble = `
  @versioned(Versions)
  @service
  namespace TestService;
  enum Versions { v1: "${VERSION}" }
`;

// ────────────────────────────────────────────────────────────────────────────
// Origin Resolution — Two-Spec Comparison
// ────────────────────────────────────────────────────────────────────────────

describe("origin resolution (two-spec comparison)", () => {
  it("resolves origin for named model property removal", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; legacyField?: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const removal = diffs.find((d) => d.kind === "ResponsePropertyRemoved");

    expect(removal).toBeDefined();
    expect(removal!.origin).toBeDefined();
    expect(removal!.origin!.declarationPath).toContain("Widget");
    expect(removal!.origin!.declarationPath).toContain("legacyField");
    expect(removal!.origin!.sourceLocation).toBeDefined();
  });

  it("resolves origin for named model property addition", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; extra?: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const addition = diffs.find((d) => d.kind === "ResponsePropertyAdded");

    expect(addition).toBeDefined();
    expect(addition!.origin).toBeDefined();
    expect(addition!.origin!.declarationPath).toContain("Widget");
    expect(addition!.origin!.declarationPath).toContain("extra");
  });

  it("resolves spread properties back to source declaration", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Base { sharedField?: string; }
        model Widget { ...Base; name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Base { }
        model Widget { ...Base; name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const removal = diffs.find((d) => d.kind === "ResponsePropertyRemoved");

    expect(removal).toBeDefined();
    expect(removal!.origin).toBeDefined();
    // Origin should trace back to Base, not Widget
    expect(removal!.origin!.declarationPath).toContain("Base");
  });

  it("resolves enum member removal origin to parent enum", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        enum Status { Active, Inactive }
        model Widget { name: string; status: Status; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        enum Status { Active }
        model Widget { name: string; status: Status; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const enumRemoval = diffs.find((d) => d.kind === "EnumerationMemberRemoved");

    expect(enumRemoval).toBeDefined();
    expect(enumRemoval!.origin).toBeDefined();
    expect(enumRemoval!.origin!.declarationPath).toContain("Status");
  });

  it("operation added has no origin", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
      `,
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const opAdded = diffs.find((d) => d.kind === "OperationAdded");

    expect(opAdded).toBeDefined();
    expect(opAdded!.origin).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Origin Resolution — Single-Spec Versioning
// ────────────────────────────────────────────────────────────────────────────

describe("origin resolution (single-spec versioning)", () => {
  it("resolves origin for versioned property removal", async () => {
    const { baseView, headView } = await compileVersionedViews(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2) legacyField?: string;
      }

      @route("/widgets/{id}") @get
      op getWidget(@path id: string): Widget;
    `);

    const { diffs } = computeDiffs(baseView, headView);
    const removal = diffs.find((d) => d.kind === "ResponsePropertyRemoved");

    expect(removal).toBeDefined();
    expect(removal!.origin).toBeDefined();
    expect(removal!.origin!.declarationPath).toContain("Widget");
  });

  it("resolves enum member origin in versioned spec", async () => {
    const { baseView, headView } = await compileVersionedViews(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      enum Status {
        Active,
        @removed(Versions.v2) Inactive,
      }

      model Widget { name: string; status: Status; }
      @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
    `);

    const { diffs } = computeDiffs(baseView, headView);
    const enumRemoval = diffs.find((d) => d.kind === "EnumerationMemberRemoved");

    expect(enumRemoval).toBeDefined();
    expect(enumRemoval!.origin).toBeDefined();
    expect(enumRemoval!.origin!.declarationPath).toContain("Status");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Deduplication — Two-Spec Comparison
// ────────────────────────────────────────────────────────────────────────────

describe("deduplication (two-spec comparison)", () => {
  it("deduplicates shared model diffs across operations", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; tags?: string[]; }
        @route("/widgets") @get op listWidgets(): Widget[];
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const responseAdded = diffs.filter(
      (d) => d.kind === "ResponsePropertyAdded" && "operation" in d.identity,
    );

    // Deduplicated to 1 finding with 2 affected operations
    expect(responseAdded).toHaveLength(1);
    expect(responseAdded[0].details?.affectedOperations).toBeDefined();
    expect((responseAdded[0].details?.affectedOperations as any[]).length).toBe(2);
  });

  it("does NOT deduplicate same model in request vs response", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @post op createWidget(@body body: Widget): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; extra?: string; }
        @route("/widgets") @post op createWidget(@body body: Widget): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const requestAdded = diffs.filter((d) => d.kind === "RequestPropertyAdded");
    const responseAdded = diffs.filter((d) => d.kind === "ResponsePropertyAdded");

    // Different DiffKinds → not deduplicated
    expect(requestAdded.length).toBeGreaterThanOrEqual(1);
    expect(responseAdded.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps separate findings for different properties on same model", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      `
        ${preamble}
        model Widget { name: string; tags?: string[]; color?: string; }
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const responseAdded = diffs.filter((d) => d.kind === "ResponsePropertyAdded");

    expect(responseAdded).toHaveLength(2);
  });

  it("does not deduplicate operation-level diffs (no origin)", async () => {
    const { baseView, headView } = await compileTwoSpecs(
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
      `,
      `
        ${preamble}
        model Widget { name: string; }
        @route("/widgets") @get op listWidgets(): Widget[];
        @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
        @route("/widgets") @post op createWidget(@body body: Widget): Widget;
      `,
      VERSION,
    );

    const { diffs } = computeDiffs(baseView, headView);
    const opAdded = diffs.filter((d) => d.kind === "OperationAdded");

    expect(opAdded).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Deduplication — Single-Spec Versioning
// ────────────────────────────────────────────────────────────────────────────

describe("deduplication (single-spec versioning)", () => {
  it("deduplicates shared model across operations", async () => {
    const { baseView, headView } = await compileVersionedViews(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @added(Versions.v2) tags?: string[];
      }

      @route("/widgets") @get op listWidgets(): Widget[];
      @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
    `);

    const { diffs } = computeDiffs(baseView, headView);
    const responseAdded = diffs.filter(
      (d) =>
        d.kind === "ResponsePropertyAdded" &&
        "operation" in d.identity &&
        d.identity.element === "body.properties.tags",
    );

    expect(responseAdded).toHaveLength(1);
    expect(responseAdded[0].details?.affectedOperations).toBeDefined();
    expect((responseAdded[0].details?.affectedOperations as any[]).length).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Suppression with Origin
// ────────────────────────────────────────────────────────────────────────────

describe("suppression with origin", () => {
  it("suppression on declaring model applies via origin lookup", async () => {
    const spec = `
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      @approvedBreakingChange("removing legacy field")
      model Widget {
        name: string;
        @removed(Versions.v2) legacyField?: string;
      }

      @route("/widgets") @get op listWidgets(): Widget[];
      @route("/widgets/{id}") @get op getWidget(@path id: string): Widget;
    `.replace(/^\s*using TypeSpec\.(Http|Versioning);\s*$/gm, "");

    const { program } = await TesterWithSuppressions.compile(spec);
    const [service] = enumerateVersions(program);
    const baseView = createVersionedView(program, service.service, service.versions[0]);
    const headView = createVersionedView(program, service.service, service.versions[1]);

    const { diffs } = computeDiffs(baseView, headView);
    const findings = classifyDiffs(diffs, "cross-version", {
      baseVersion: service.versions[0],
      headVersion: service.versions[1],
      phase: "cross-version",
    });

    const suppressed = applySuppressions(findings, program);
    const errorFindings = suppressed.filter((f) => f.severity === "error");

    const unsuppressedRemovals = errorFindings.filter(
      (f) => f.diff.kind === "ResponsePropertyRemoved" && !f.suppressed,
    );
    expect(unsuppressedRemovals).toHaveLength(0);

    const suppressedRemovals = errorFindings.filter(
      (f) => f.diff.kind === "ResponsePropertyRemoved" && f.suppressed,
    );
    expect(suppressedRemovals.length).toBeGreaterThanOrEqual(1);
  });
});
